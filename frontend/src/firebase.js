import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


// Your Firebase configuration (replace if necessary)
const firebaseConfig = {
  apiKey: "AIzaSyDFEHlf92Fbfk5mzSiTSrWpe0WkSIHyAZU",
  authDomain: "findocscan.firebaseapp.com",
  projectId: "findocscan",
  storageBucket: "findocscan.firebasestorage.app",
  messagingSenderId: "599649205422",
  appId: "1:599649205422:web:2734a286b40af4ba74c13f",
  measurementId: "G-XHJQSXJ40W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // Initialize Firestore
const storage = getStorage(app);



// Sign in with Google
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return null;
  }
};

// Logout function
const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

// Export required modules
export { auth, provider, db, storage, signInWithGoogle, logout };
