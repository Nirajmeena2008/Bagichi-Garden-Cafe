const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs, limit } = require('firebase/firestore');
const { readFileSync } = require('fs');

const config = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  try {
    const q = query(collection(db, 'featuredReels'), orderBy('createdAt', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    console.log(`Success! Found ${snapshot.size} reels.`);
    snapshot.forEach(d => console.log(d.id, d.data().title));
  } catch (err) {
    console.error('Error fetching reels:', err.message);
  }
  process.exit(0);
}
run();
