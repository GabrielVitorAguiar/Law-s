import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJ7QMq03eFJDUHdhgUYhz6O3uB8u5v8vw",
  authDomain: "projeto-pi-law-s.firebaseapp.com",
  projectId: "projeto-pi-law-s",
  storageBucket: "projeto-pi-law-s.firebasestorage.app",
  messagingSenderId: "1030930232167",
  appId: "1:1030930232167:web:95d5748f649d84dea735c2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
