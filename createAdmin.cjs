const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  projectId: "gen-lang-client-0243532277",
  appId: "1:1081929629998:web:78f03004f86dfde6c87abf",
  apiKey: "AIzaSyCymdywDLwXJXZQ9UWTFHDvtPZrv0dcc30",
  authDomain: "gen-lang-client-0243532277.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

createUserWithEmailAndPassword(auth, "admin@thebagichi.com", "admin123")
  .then(() => {
    console.log("Successfully created admin user: admin@thebagichi.com / admin123");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error creating user:", error.message);
    process.exit(1);
  });
