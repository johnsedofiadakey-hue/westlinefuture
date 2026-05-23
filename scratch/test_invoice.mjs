import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'westlinefuture',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const docRef = await addDoc(collection(db, 'invoices'), {
      clientId: '',
      client: 'Walk-in John',
      amount: 'GH₵1500.00',
      total: 1500,
      status: 'Pending',
      type: 'Invoice',
      createdAt: new Date().toISOString()
    });
    console.log("Success! ID:", docRef.id);
  } catch (e) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
test();
