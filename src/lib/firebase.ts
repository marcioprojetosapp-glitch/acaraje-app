import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Suas credenciais exclusivas do Acarajé da Benção
const firebaseConfig = {
  apiKey: "AIzaSyBC-dqhAV8C6xsbSlY_1sSJnTVF6woJD6o",
  authDomain: "://firebaseapp.com",
  projectId: "acaraje-da-bencao",
  storageBucket: "acaraje-da-bencao.firebasestorage.app",
  messagingSenderId: "39673030784",
  appId: "1:39673030784:web:dd2cd4066cb16du21fdc65",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore (Banco de Dados) e exporta para o app usar
export const db = getFirestore(app);
