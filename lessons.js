import { 
    db, auth, collection, onSnapshot, onAuthStateChanged, addDoc, updateDoc, deleteDoc, doc, getDoc 
} from './firebase_config.js';

document.addEventListener("DOMContentLoaded", () => {
    let currentUserRole = "Khách"; 

    // Lấy các phần tử DOM trên trang giáo án
    const lessonTableBody = document.getElementById("lessonTableBody");
    const searchBox = document.getElementById("searchBox");
    
    const modalElement = document.getElementById('lessonModal');
    const lessonModal = modalElement ? new bootstrap.Modal(modalElement) : null;
    
    const lessonModalLabel = document.querySelector("#lessonModal .modal-title");
    const btnAddLesson = document.getElementById("btnAddLesson");
    
    const lessonIdInput = document.getElementById("lessonId");
    const lessonNameInput = document.getElementById("lessonName");
    const lessonTopicSelect = document.getElementById("lessonTopic");
    const lessonTeacherInput = document.getElementById("lessonTeacher");
    const lessonDateInput = document.getElementById("lessonDate");
    const lessonContentInput = document.getElementById("lessonContent");

    let allLessons = []; 

    // Kiểm tra ẩn/hiện nút Thêm giáo án dựa trên vai trò người dùng
    function checkAddButtonVisibility() {
        if (!btnAddLesson) return;
        if (currentUserRole === "Khách") {
            btnAddLesson.style.display = "none";
        } else {
            btnAddLesson.style.display = "block";
        }
    }
    
    checkAddButtonVisibility();

    // --- 1. Lắng nghe dữ liệu giáo án realtime ---
    function startListeningLessons() {
        if (lessonTableBody) {
            lessonTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-info">Đang tải dữ liệu...</td></tr>`;
        }

        onSnapshot(collection(db, "lessons"), (snapshot) => {
            allLessons = [];
            snapshot.forEach((doc) => {
                allLessons.push({ id: doc.id, ...doc.data() });
            });

            // Sắp xếp giáo án theo ngày học mới nhất lên đầu
            allLessons.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            renderTable(allLessons);
        }, (error) => {
            console.error("Lỗi tải cơ sở dữ liệu giáo án:", error);
            if (lessonTableBody) {
                lessonTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi bảo mật! Không có quyền xem nội dung này.</td></tr>`;
            }
        });
    }

    startListeningLessons();

    // --- 2. Theo dõi auth state ---
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocSnap = await getDoc(doc(db, "users", user.uid));
                    if (userDocSnap.exists()) {
                        currentUserRole = userDocSnap.data().role || "Khách";
                    }
                } catch (e) {
                    console.error("Lỗi lấy quyền người dùng:", e);
                }
            } else {
                currentUserRole = "Khách";
            }
            
            // Cập nhật lại trạng thái hiển thị của nút Thêm ngay khi quyền thay đổi
            checkAddButtonVisibility();
            renderTable(allLessons);
        });
    }

    // --- 3. Render bảng giáo án dựa trên quyền ---
    function renderTable(list) {
        if (!lessonTableBody) return;
        checkAddButtonVisibility();
        lessonTableBody.innerHTML = "";

        if (list.length === 0) {
            lessonTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary">Không tìm thấy giáo án nào.</td></tr>`;
            return;
        }

        list.forEach((lesson, index) => {
            // Định dạng ngày hiển thị (dd/mm/yyyy)
            let displayDate = "Chưa xếp ngày";
            if (lesson.date) {
                const [year, month, day] = lesson.date.split("-");
                if (day && month && year) displayDate = `${day}/${month}/${year}`;
            }

            // Tự động tính toán Trạng thái dựa trên ngày hiện tại (Thời gian thực năm 2026)
            let badgeHTML = `<span class="badge bg-secondary">Không rõ</span>`;
            const todayStr = new Date().toISOString().split('T')[0];
            if (lesson.date) {
                if (lesson.date < todayStr) {
                    badgeHTML = `<span class="badge bg-success">Hoàn thành</span>`;
                } else if (lesson.date === todayStr) {
                    badgeHTML = `<span class="badge bg-primary">Đang diễn ra</span>`;
                } else {
                    badgeHTML = `<span class="badge bg-warning text-dark">Sắp diễn ra</span>`;
                }
            }

            // Phân quyền nút Thao tác: Ban điều hành & Thành viên được sửa/xóa, Khách chỉ được xem
            let actionButtons = "";
            if (currentUserRole !== "Khách") {
                actionButtons = `
                    <div class="action-buttons">
                        <button class="btn btn-success-custom btn-sm btn-edit-lesson" data-id="${lesson.id}">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-danger-custom btn-sm btn-delete-lesson" data-id="${lesson.id}" data-name="${lesson.name}">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>
                `;
            } else {
                actionButtons = `<span class="text-secondary" style="font-size: 0.85rem;"><i class="bi bi-lock-fill"></i> Chỉ xem</span>`;
            }

            const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${lesson.name || "Chưa đặt tên"}</strong></td>
                    <td>${lesson.topic || ""}</td>
                    <td>${lesson.teacher || "Chưa phân công"}</td>
                    <td>${displayDate}</td>
                    <td>${badgeHTML}</td>
                    <td>${actionButtons}</td>
                </tr>
            `;
            lessonTableBody.insertAdjacentHTML("beforeend", row);
        });

        if (currentUserRole !== "Khách") {
            attachRowEvents();
        }
    }

    // --- 4. Gán sự kiện Sửa/Xóa động và làm sạch Listener cũ ---
    function attachRowEvents() {
        // Nút Sửa
        document.querySelectorAll(".btn-edit-lesson").forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        document.querySelectorAll(".btn-edit-lesson").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const lesson = allLessons.find(l => l.id === id);
                if (lesson && lessonModal) {
                    if (lessonModalLabel) lessonModalLabel.textContent = "Cập nhật giáo án";
                    if (lessonIdInput) lessonIdInput.value = lesson.id;
                    if (lessonNameInput) lessonNameInput.value = lesson.name || "";
                    if (lessonTopicSelect) lessonTopicSelect.value = lesson.topic || "Đại số";
                    if (lessonTeacherInput) lessonTeacherInput.value = lesson.teacher || "";
                    if (lessonDateInput) lessonDateInput.value = lesson.date || "";
                    if (lessonContentInput) lessonContentInput.value = lesson.content || "";
                    lessonModal.show();
                }
            });
        });

        // Nút Xóa
        document.querySelectorAll(".btn-delete-lesson").forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        document.querySelectorAll(".btn-delete-lesson").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const name = btn.getAttribute("data-name");
                if (confirm(`Bạn có chắc muốn xóa bài học "${name}" không?`)) {
                    try {
                        await deleteDoc(doc(db, "lessons", id));
                        alert("Đã xóa giáo án thành công!");
                    } catch (e) {
                        alert("Không thể xóa bài học này!");
                    }
                }
            });
        });
    }

    // --- 5. Sự kiện bấm nút Thêm mới làm trống Form ---
    if (btnAddLesson) {
        btnAddLesson.addEventListener("click", () => {
            if (lessonModalLabel) lessonModalLabel.textContent = "Thêm giáo án";
            if (lessonIdInput) lessonIdInput.value = "";
            if (lessonNameInput) lessonNameInput.value = "";
            if (lessonTopicSelect) lessonTopicSelect.value = "Đại số";
            if (lessonTeacherInput) lessonTeacherInput.value = "";
            if (lessonDateInput) lessonDateInput.value = "";
            if (lessonContentInput) lessonContentInput.value = "";
            if (lessonModal) lessonModal.show();
        });
    }

    // --- 6. Xử lý sự kiện click nút Lưu bằng Event Delegation ---
    document.addEventListener("click", async (e) => {
        if (e.target && e.target.closest("#btnSaveLesson")) {
            e.preventDefault(); // Ngăn trình duyệt reload trang
            
            console.log("=== ĐÃ BẮT ĐƯỢC CÚ CLICK NÚT LƯU ===");
            console.log("Mẹo mày bé =)");

            const id = lessonIdInput ? lessonIdInput.value : "";
            const name = lessonNameInput ? lessonNameInput.value.trim() : "";
            const topic = lessonTopicSelect ? lessonTopicSelect.value : "Đại số";
            const teacher = lessonTeacherInput ? lessonTeacherInput.value.trim() : "";
            const date = lessonDateInput ? lessonDateInput.value : "";
            const content = lessonContentInput ? lessonContentInput.value.trim() : "";

            if (!name || !date) {
                alert("Vui lòng nhập đầy đủ Tên bài học và Ngày học!");
                return;
            }

            const lessonData = { name, topic, teacher, date, content };

            try {
                if (id) {
                    await updateDoc(doc(db, "lessons", id), lessonData);
                    alert("Cập nhật giáo án thành công!");
                } else {
                    await addDoc(collection(db, "lessons"), lessonData);
                    alert("Thêm giáo án thành công!");
                }
                if (lessonModal) lessonModal.hide();
            } catch (error) {
                console.error("Lỗi khi ghi dữ liệu lên Firestore:", error);
                alert("Không thể lưu thông tin giáo án.");
            }
        }
    });

    // --- 7. Xử lý ô tìm kiếm thời gian thực ---
    if (searchBox) {
        searchBox.addEventListener("input", (e) => {
            const kw = e.target.value.toLowerCase().trim();
            const filtered = allLessons.filter(l => 
                (l.name || "").toLowerCase().includes(kw) ||
                (l.topic || "").toLowerCase().includes(kw) ||
                (l.teacher || "").toLowerCase().includes(kw)
            );
            renderTable(filtered);
        });
    }
});