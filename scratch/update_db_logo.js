import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

// Manual .env parser
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  });
  console.log("Loaded environment variables from .env manually.");
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateLogo() {
  const brandDocRef = doc(db, 'cms_content', 'brand');
  const snap = await getDoc(brandDocRef);
  
  if (!snap.exists()) {
    console.error("Brand document does not exist in Firestore!");
    return;
  }
  
  const data = snap.data();
  console.log("Current Firestore Brand Content:", JSON.stringify(data, null, 2));
  
  const currentContent = data.content || {};
  const updatedContent = {
    ...currentContent,
    logo: '/logo.png'
  };
  
  await updateDoc(brandDocRef, {
    content: updatedContent
  });
  
  console.log("Firestore brand logo successfully updated to '/logo.png'!");
}

updateLogo().catch(console.error);
