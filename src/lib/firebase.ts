import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBC-dqhAV8C6xsbSlY_1sSJnTVF6woJD6o",
  authDomain: "acaraje-da-bencao.firebaseapp.com",
  projectId: "acaraje-da-bencao",
  storageBucket: "acaraje-da-bencao.firebasestorage.app",
  messagingSenderId: "39673030784",
  appId: "1:39673030784:web:dd2cd4066cb16d121fdc65",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
