import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Configurações do projeto Firebase compartilhado agenda-cft-01 (CFT Itinerante / ComSoc / SisPesCFT)
export const firebaseConfig = {
  apiKey: "AIzaSyC_Yy4Z6_GxPhEoSAY2yAHHCt7Th0xnoT1Q",
  authDomain:
    typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
      ? window.location.hostname
      : "agenda-cft-01.firebaseapp.com",
  projectId: "agenda-cft-01",
  storageBucket: "agenda-cft-01.firebasestorage.app",
  messagingSenderId: "172645083425",
  appId: "1:172645083425:web:5c3bcabadf32c41cb27660",
  measurementId: "G-GMN9YMET7T",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    if (!getApps().length) {
      return initializeApp(firebaseConfig);
    }
    return getApp();
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  try {
    if (!auth) {
      const fbApp = getFirebaseApp();
      auth = getAuth(fbApp);
    }
    return auth;
  } catch (err) {
    console.warn("[SisPesCFT] Firebase Auth não inicializado:", err);
    return null;
  }
}

export function getFirebaseDb(): Firestore | null {
  if (typeof window === "undefined") return null;
  try {
    if (!db) {
      const fbApp = getFirebaseApp();
      db = getFirestore(fbApp);
    }
    return db;
  } catch (err) {
    console.warn("[SisPesCFT] Firestore não inicializado:", err);
    return null;
  }
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  }
  return googleProvider;
}
