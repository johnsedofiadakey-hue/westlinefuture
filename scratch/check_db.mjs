import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'westlinefuture',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const d = await getDoc(doc(db, 'cms_content', 'services'));
  console.log(JSON.stringify(d.data(), null, 2));
  process.exit(0);
}
check();
