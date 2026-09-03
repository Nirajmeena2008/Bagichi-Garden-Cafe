import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "gen-lang-client-0243532277",
  appId: "1:1081929629998:web:78f03004f86dfde6c87abf",
  apiKey: "AIzaSyCymdywDLwXJXZQ9UWTFHDvtPZrv0dcc30",
  authDomain: "gen-lang-client-0243532277.firebaseapp.com",
  storageBucket: "gen-lang-client-0243532277.firebasestorage.app",
  messagingSenderId: "1081929629998",
  measurementId: ""
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-thebagichigarden-3d84c712-a393-492c-8071-a4eac7f49a2e");
export const auth = getAuth(app);
export const storage = getStorage(app);
