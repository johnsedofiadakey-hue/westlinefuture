import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { SERVICES_DATA } from '../src/data.jsx';

const firebaseConfig = {
  projectId: 'westlinefuture',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  await setDoc(doc(db, 'cms_content', 'services'), { content: SERVICES_DATA });
  console.log("Services restored!");
  process.exit(0);
}
fix();
