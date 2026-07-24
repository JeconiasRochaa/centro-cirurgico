// ============ js/firebase.js ============
// ÚNICA inicialização do Firebase para todo o sistema

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBiuJsJ-Wt2L6NB0WFlalLLFGcgLWJ49w8",
    authDomain: "centro-cirurgico-eaf76.firebaseapp.com",
    databaseURL: "https://centro-cirurgico-eaf76-default-rtdb.firebaseio.com",
    projectId: "centro-cirurgico-eaf76",
    storageBucket: "centro-cirurgico-eaf76.firebasestorage.app",
    messagingSenderId: "620414910337",
    appId: "1:620414910337:web:4592fa24f0d8f41d673280"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log('✅ Firebase inicializado');

// Exportar TUDO que os outros módulos precisam
export { db, ref, onValue, set, push, update, remove, get };