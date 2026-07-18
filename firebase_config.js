import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
// Authentication
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firestore
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Cấu hình firebase
const firebaseConfig = {
  apiKey: "AIzaSyAQMvCGvH_2OA7y7rUVMaENXErHjr-wyYI",
  authDomain: "math-club-duy-h.firebaseapp.com",
  projectId: "math-club-duy-h",
  storageBucket: "math-club-duy-h.firebasestorage.app",
  messagingSenderId: "860898088117",
  appId: "1:860898088117:web:7ecd88e03369a6d79c5afc",
  measurementId: "G-4FZFHVKL28"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export {
    firebaseApp,
    // Auth
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    // Firestore
    db,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp
};