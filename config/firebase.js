import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do seu projeto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAbDQfS3VTVlXEBdHKKwx-ToTWTGFOcYAE",
    authDomain: "vade-mecum-de-questoes.firebaseapp.com",
    projectId: "vade-mecum-de-questoes",
    storageBucket: "vade-mecum-de-questoes.appspot.com",
    messagingSenderId: "667396734608",
    appId: "1:667396734608:web:96f67c131ccbd798792215"
};

let app;
export let auth;
export let db;

export function initializeApp() {
    if (!app) {
        app = initializeFirebaseApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    }
}

