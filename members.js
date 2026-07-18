// Import toàn bộ cấu hình và các hàm cần thiết trực tiếp từ file config của tôi
import { 
    db, auth, collection, onSnapshot, onAuthStateChanged,addDoc, updateDoc, deleteDoc, doc, getDoc, signOut
} from './firebase_config.js';

document.addEventListener("DOMContentLoaded", () => {
    // Biến lưu trữ vai trò người dùng hiện tại (Mặc định ban đầu là Khách)
    let currentUserRole = "Khách"; 

    const memberTableBody = document.getElementById("memberTableBody");
    const searchBox = document.getElementById("searchBox");
    
    // Kiểm tra và khởi tạo Modal Bootstrap an toàn
    const modalElement = document.getElementById('memberModal');
    const memberModal = modalElement ? new bootstrap.Modal(modalElement) : null;
    
    const memberModalLabel = document.getElementById("memberModalLabel");
    const btnAddMember = document.getElementById("btnAddMember");
    const btnSaveMember = document.getElementById("btnSaveMember");
    
    const memberIdInput = document.getElementById("memberId");
    const memberNameInput = document.getElementById("memberName");
    const memberClassInput = document.getElementById("memberClass");
    const memberEmailInput = document.getElementById("memberEmail");
    const memberRoleInput = document.getElementById("memberRole");

    // Phân cấp vai trò ưu tiên hiển thị trên bảng
    const rolePriority = {
        "Ban điều hành": 1,
        "Thành viên": 2,
        "Khách": 3
    };

    let allMembers = []; // Mảng lưu trữ danh sách gốc

    // Hàm cập nhật trạng thái hiển thị của nút "Thêm thành viên"
    function checkAddButtonVisibility() {
        if (!btnAddMember) return; 
        if (currentUserRole === "Khách") {
            btnAddMember.style.display = "none";
        } else {
            btnAddMember.style.display = "block";
        }
    }
    
    // Chạy kiểm tra nút Thêm lần đầu ứng với trạng thái mặc định
    checkAddButtonVisibility();

    // 1. Đọc dữ liệu realtime từ Firestore và cập nhật bảng thành viên
    function startListeningToDatabase() {
        if (memberTableBody) {
            memberTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-info"></td></tr>`;
        }

        onSnapshot(collection(db, "users"), (snapshot) => {
            allMembers = [];
            
            snapshot.forEach((doc) => {
                allMembers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sắp xếp theo thứ tự ưu tiên vai trò trước, sau đó sắp xếp theo tên
            allMembers.sort((a, b) => {
                const priorityA = rolePriority[a.role] || 3;
                const priorityB = rolePriority[b.role] || 3;
                if (priorityA !== priorityB) return priorityA - priorityB;
                return (a.name || "").localeCompare(b.name || "", 'vi');
            });

            // Vẽ bảng thành viên
            renderTable(allMembers);
        }, (error) => {
            console.error("Lỗi Firestore (Kiểm tra lại Rules):", error);
            if (memberTableBody) {
                memberTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi bảo mật Firebase Rules! Không có quyền đọc dữ liệu.</td></tr>`;
            }
        });
    }

    // Ép buộc lắng nghe cơ sở dữ liệu ngay khi vào trang
    startListeningToDatabase();


    // 2. Theo dõi trạng thái đăng nhập để xác định role
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Lấy document của user dựa trên UID từ Authentication
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if (userDocSnap.exists()) {
                        currentUserRole = userDocSnap.data().role || "Khách";
                    } else {
                        currentUserRole = "Khách";
                    }
                } catch (error) {
                    console.error("Lỗi khi lấy quyền người dùng:", error);
                    currentUserRole = "Khách";
                }
            } else {
                currentUserRole = "Khách";
            }
            
            // Re-render lại bảng để cập nhật cột Thao tác (ẩn/hiện nút sửa xóa dựa trên quyền mới)
            if (allMembers.length > 0) {
                renderTable(allMembers);
            }
        });
    }

    // Render bảng thành viên ra UI
    function renderTable(list) {
        if (!memberTableBody) return;
        checkAddButtonVisibility(); 
        memberTableBody.innerHTML = "";

        if (list.length === 0) {
            memberTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">Không có thành viên nào trong danh sách.</td></tr>`;
            return;
        }

        list.forEach((member, index) => {
            let badgeClass = "bg-secondary"; 
            if (member.role === "Ban điều hành") {
                badgeClass = "badge-admin";
            } else if (member.role === "Thành viên") {
                badgeClass = "bg-success"; 
            }

            let actionButtons = "";
            if (currentUserRole === "Ban điều hành") {
                actionButtons = `
                    <button class="btn btn-success-custom btn-sm btn-edit" data-id="${member.id}">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-danger-custom btn-sm btn-delete" data-id="${member.id}" data-name="${member.name}">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                `;
            } else {
                actionButtons = `<span class="text-secondary" style="font-size: 0.85rem;"><i class="bi bi-lock-fill"></i> Không có quyền</span>`;
            }

            const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td>${member.name || "Chưa cập nhật"}</td>
                    <td>${member.className || "Chưa rõ"}</td>
                    <td>${member.email || ""}</td>
                    <td>
                        <span class="badge ${badgeClass}">${member.role || "Khách"}</span>
                    </td>
                    <td>${actionButtons}</td>
                </tr>
            `;
            memberTableBody.insertAdjacentHTML("beforeend", row);
        });

        // Chỉ đính kèm sự kiện sửa xóa nếu người dùng là Ban điều hành
        if (currentUserRole === "Ban điều hành") {
            attachRowEvents();
        }
    }

    // --- Đính kèm sự kiện Sửa/Xóa cho các nút ---
    function attachRowEvents() {
        // Xử lý nút Sửa
        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        document.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const member = allMembers.find(m => m.id === id);
                if (member && memberModal && memberModalLabel && memberIdInput && memberNameInput && memberClassInput && memberEmailInput && memberRoleInput) {
                    memberModalLabel.textContent = "Cập nhật thành viên";
                    memberIdInput.value = member.id;
                    memberNameInput.value = member.name || "";
                    memberClassInput.value = member.className || "";
                    memberEmailInput.value = member.email || "";
                    memberRoleInput.innerHTML = `
                        <option value="Khách" ${member.role === "Khách" ? "selected" : ""}>Khách</option>
                        <option value="Thành viên" ${member.role === "Thành viên" ? "selected" : ""}>Thành viên</option>
                        <option value="Ban điều hành" ${member.role === "Ban điều hành" ? "selected" : ""}>Ban điều hành</option>
                    `;
                    memberModal.show();
                }
            });
        });

        // Xử lý nút Xóa
        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        document.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const name = btn.getAttribute("data-name");
                if (confirm(`Bạn có chắc chắn muốn xóa "${name}" không?`)) {
                    try {
                        await deleteDoc(doc(db, "users", id));
                        alert("Xóa thành công!");
                    } catch (error) {
                        alert("Lỗi khi xóa thành viên!");
                    }
                }
            });
        });
    }

    // --- Sự kiện nút Thêm thành viên ---
    if (btnAddMember) {
        btnAddMember.addEventListener("click", () => {
            if (!memberModal || !memberModalLabel || !memberIdInput || !memberNameInput || !memberClassInput || !memberEmailInput || !memberRoleInput) return;
            memberModalLabel.textContent = "Thêm thành viên";
            memberIdInput.value = ""; 
            memberNameInput.value = "";
            memberClassInput.value = "";
            memberEmailInput.value = "";
            
            memberRoleInput.innerHTML = `
                <option value="Khách">Khách</option>
                <option value="Thành viên" selected>Thành viên</option>
                <option value="Ban điều hành">Ban điều hành</option>
            `;
            memberModal.show();
        });
    }

    // --- Thực hiện lưu dữ liệu (Thêm mới / Cập nhật) ---
    if (btnSaveMember) {
        btnSaveMember.addEventListener("click", async () => {
            if (!memberIdInput || !memberNameInput || !memberClassInput || !memberEmailInput || !memberRoleInput) return;
            const id = memberIdInput.value;
            const name = memberNameInput.value.trim();
            const className = memberClassInput.value.trim();
            const email = memberEmailInput.value.trim();
            const role = memberRoleInput.value;

            if (!name || !email) {
                alert("Vui lòng điền đầy đủ Họ tên và Email!");
                return;
            }

            const memberData = { name, className, email, role };

            try {
                if (id) {
                    if (currentUserRole !== "Ban điều hành") {
                        alert("Bạn không có quyền chỉnh sửa!");
                        return;
                    }
                    await updateDoc(doc(db, "users", id), memberData);
                    alert("Cập nhật thành công!");
                } else {
                    if (currentUserRole === "Khách") {
                        alert("Khách không có quyền thêm thành viên!");
                        return;
                    }
                    await addDoc(collection(db, "users"), memberData);
                    alert("Thêm thành viên mới thành công!");
                }
                if (memberModal) memberModal.hide(); 
            } catch (error) {
                console.error("Lỗi khi ghi Firestore:", error);
                alert("Lỗi khi lưu dữ liệu!");
            }
        });
    }

    // --- Ô tìm kiếm dữ liệu ---
    if (searchBox) {
        searchBox.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase().trim();
            const filtered = allMembers.filter(member => {
                const name = (member.name || "").toLowerCase();
                const className = (member.className || "").toLowerCase();
                const email = (member.email || "").toLowerCase();
                return name.includes(keyword) || className.includes(keyword) || email.includes(keyword);
            });
            renderTable(filtered);
        });
    }
});