import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
};

// PREVIENE DUPLICADO DE APPS:
const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export { firebaseApp, db, storage };
