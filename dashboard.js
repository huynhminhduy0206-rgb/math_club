import { db, collection, onSnapshot } from './firebase_config.js';

document.addEventListener("DOMContentLoaded", () => {
    const totalMembersEl = document.getElementById("totalMembers");
    const dashboardMemberTable = document.getElementById("dashboardMemberTable");

    // Thứ tự ưu tiên cho role
    const role_priority = {
        "Ban điều hành": 1,
        "Thành viên": 2,
        "Khách": 3
    };

    // Lắng nghe dữ liệu realtime từ collection users
    onSnapshot(collection(db, "users"), (snapshot) => {
        
        // 1. Cập nhật tổng số thành viên lên ô thống kê
        if (totalMembersEl) {
            totalMembersEl.textContent = snapshot.size;
        }

        // 2. Cập nhật danh sách vào bảng dữ liệu
        if (dashboardMemberTable) {
            dashboardMemberTable.innerHTML = ""; // Xóa dữ liệu cũ trc

            // Kiểm tra nếu db trống thì dừng sớm
            if (snapshot.empty) {
                dashboardMemberTable.innerHTML = `<tr><td colspan="4" class="text-center text-secondary">Chưa có thành viên nào.</td></tr>`;
                return;
            }

            // A. Gom dữ liệu từ Firestore vào một array
            const membersList = [];
            snapshot.forEach((doc) => {
                membersList.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // B. Sắp xếp mảng dựa trên độ ưu tiên của role
            membersList.sort((a, b) => {
                const priorityA = role_priority[a.role] || 3; 
                const priorityB = role_priority[b.role] || 3;
                return priorityA - priorityB; 
            });

            // C. Duyệt qua mảng đã sắp xếp
            membersList.forEach((data) => {
                // Xác định màu sắc tùy theo vai trò
                let badgeClass = "badge-member"; 
                if (data.role === "Ban điều hành") {
                    badgeClass = "badge-admin";
                } else if (data.role === "Khách") {
                    badgeClass = "bg-secondary";
                } else if (data.role === "Thành viên") {
                    badgeClass = "bg-success";
                }

                // Tạo dòng HTML mới
                const row = `
                    <tr>
                        <td>${data.className || "Chưa rõ"}</td>
                        <td>${data.name || "Chưa cập nhật"}</td>
                        <td>${data.email || ""}</td>
                        <td>
                            <span class="badge ${badgeClass}">${data.role || "Khách"}</span>
                        </td>
                    </tr>
                `;
                
                dashboardMemberTable.insertAdjacentHTML("beforeend", row);
            });
        }
    });
});