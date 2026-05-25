import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const env = import.meta.env;
const isDevPhoneAuthTestMode = env.DEV && env.VITE_FIREBASE_PHONE_AUTH_TEST_MODE === 'true';
const hasKeys = !!(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_API_KEY !== 'undefined' &&
  env.VITE_FIREBASE_AUTH_DOMAIN &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_APP_ID
);

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "mock-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || "westline-mock",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

let app, auth, db, storage, functions, isFirebaseEnabled = false;

try {
  if (hasKeys) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.useDeviceLanguage();
    if (isDevPhoneAuthTestMode) {
      auth.settings.appVerificationDisabledForTesting = true;
      console.warn("Firebase Phone Auth test mode is enabled. Use only Firebase console test phone numbers locally.");
    }
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    isFirebaseEnabled = true;
  } else {
    // Return null so consumers can guard explicitly
    app = null; auth = null; db = null; storage = null; functions = null;
  }
} catch (e) {
  console.warn("Firebase initialization failed:", e);
  app = null; auth = null; db = null; storage = null; functions = null;
}

export { auth, db, storage, functions, isFirebaseEnabled };

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads a file to Firebase Storage or falls back to Base64 if Firebase is disabled or fails.
 * 
 * @param {string} bucket - The bucket or top-level folder name.
 * @param {string} path - The path within the bucket.
 * @param {File} file - The File object to upload.
 * @returns {Promise<string>} Returns the download URL or Base64 string.
 * @throws {Error} Throws if file is too large for fallback and upload fails.
 */
export const uploadFile = async (bucket, path, file) => {
  const fileToBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  if (!storage || !isFirebaseEnabled) {
    return await fileToBase64(file);
  }
  
  try {
    const storageRef = ref(storage, `${bucket}/${path}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Firebase Storage Upload Error:", error);
    // Only fallback if absolutely necessary for demo, but alert the user
    if (file.size > 500000) { // 500KB limit for Base64 to prevent DB bloat
       throw new Error("Cloud storage failed and file is too large for local fallback. Please check Firebase permissions.");
    }
    return await fileToBase64(file);
  }
};
