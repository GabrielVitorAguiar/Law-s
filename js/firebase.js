import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKifJgAZVxJ7BPakv170gQuZrOAMVupsE",
  authDomain: "projeto-pi-law-s.firebaseapp.com",
  projectId: "projeto-pi-law-s",
  storageBucket: "projeto-pi-law-s.firebasestorage.app",
  messagingSenderId: "1030930232167",
  appId: "1:1030930232167:web:95d5748f649d84dea735c2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
