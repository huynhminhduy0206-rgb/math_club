import { auth, signOut } from './firebase_config.js';

document.addEventListener("DOMContentLoaded", () => {
    const btnLogout = document.getElementById("btnLogout");
    
    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault(); 
            
            if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
                try {
                    // Xóa phiên trên Firebase
                    await signOut(auth);
                    
                    // Xóa sạch bộ nhớ tạm của trình duyệt
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    alert("Đăng xuất thành công!");
                    window.location.href = "./auth.html"; 
                } catch (error) {
                    console.error("Lỗi khi đăng xuất:", error);
                    alert("Đã xảy ra lỗi khi đăng xuất!");
                }
            }
        });
    }
});