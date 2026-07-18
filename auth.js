// Import các hàm cần thiết từ firebase_config.js
import { 
    auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, doc, setDoc, getDoc
} from './firebase_config.js'; 

// Nhận dữ liệu từ HTML
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const toRegisterBtn = document.getElementById("toRegisterBtn");
const toLoginBtn = document.getElementById("toLoginBtn");

// Chuyển đổi giữa form đăng nhập và đăng ký
if (toRegisterBtn && toLoginBtn) {
    toRegisterBtn.addEventListener("click", () => {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
    });

    toLoginBtn.addEventListener("click", () => {
        registerForm.style.display = "none";
        loginForm.style.display = "block";
    });
}

// Hàm xử lý đăng nhập
async function handleSignIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Lấy dữ liệu từ firestore dựa trên uid
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        let userName = "Ẩn danh"; // Tên default nếu ko tìm đc name
        if (userDoc.exists()) {
            userName = userDoc.data().name;
        }

        alert(`Bạn đã đăng nhập thành công, ${userName}!`);
        window.location.href = "/pages/dashboard.html"; // Chuyển sang dashboard
    } catch (error) {
        if (error.code === 'auth/invalid-credential') {
            alert("Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.");
        } else if (error.code === 'auth/invalid-email') {
            alert("Email không hợp lệ. Vui lòng kiểm tra lại.");
        } else if (error.code === 'auth/too-many-requests') {
            alert("Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.");
        } else if (error.code === 'auth/network-request-failed') {
            alert("Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn.");
        } else {
            console.error("Error:", error.code);
            alert("Đăng nhập thất bại: " + error.message);
        }
    }
}

// Hàm xử lý đăng ký
async function handleSignUp(name, email, password, className) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Cập nhật displayName vào Auth Profile
        await updateProfile(user, { displayName: name });

        // Tạo một bản ghi trong collection "users" với ID trùng với ID tài khoản
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            className: className,
            role: "Khách", // Mọi tài khoản mới mặc định là Thành viên
            createdAt: new Date()
        });

        alert(`Bạn đã đăng ký tài khoản thành công, ${name}!`);
        registerForm.reset();
        
        registerForm.style.display = "none";
        loginForm.style.display = "block";
    } catch (error) {
        console.error("Error:", error.code);
        alert("Đăng ký thất bại: " + error.message);
    }
}

// Lắng nghe sự kiện đăng ký
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const className = document.getElementById("registerClass").value;

        // Gọi hàm xử lý đã tách riêng
        await handleSignUp(name, email, password, className);
    });
}

// Lắng nghe sự kiện đăng nhập
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Chặn reload trang cực kỳ quan trọng
        
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        // Gọi hàm xử lý đăng nhập đã viết ở trên
        await handleSignIn(email, password);
    });
}