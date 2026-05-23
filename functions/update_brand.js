const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // wait, I don't have serviceAccountKey.json

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function run() {
  await db.collection('system_config').doc('brand').set({
    name: 'Westline Future Ltd.',
    color: '#4A3B32',
    accentSecondary: '#4A3B32',
    accentPrimary: '#C5A880',
    bgPrimary: '#FDFBF7',
    bgSecondary: '#F4EFE6',
    textPrimary: '#1A1410',
    textSecondary: '#716259',
    borderColor: 'rgba(74, 59, 50, 0.1)',
    footerBg: '#2C231E',
    address: 'International',
    phone: '',
    email: 'info@westlinefuture.com',
    website: 'www.westlinefuture.com'
  }, { merge: true });
  console.log('Done!');
}
run().catch(console.error);
