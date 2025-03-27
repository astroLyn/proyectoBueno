import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD5L-ZlC9dNLUJgReNUWsPz3ChaGyjvtLo",
  authDomain: "proyecto4d-29047.firebaseapp.com",
  projectId: "proyecto4d-29047",
  storageBucket: "proyecto4d-29047.firebasestorage.app",
  messagingSenderId: "830529089599",
  appId: "1:830529089599:web:ad61b3a13c9ddee751888a",
  measurementId: "G-67TS3HF7JV",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios de Firebase
export const auth = getAuth(app);
export const db = getFirestore(app); // 
export default app;
