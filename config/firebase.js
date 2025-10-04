import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do seu projeto Firebase
// ATENÇÃO: As chaves de configuração devem ser mantidas em segredo em um ambiente de produção.
// Aqui, elas são necessárias para o funcionamento no ambiente de demonstração.
const firebaseConfig = {
    apiKey: "AIzaSyAbDQfS3VTVlXEBdHKKwx-ToTWTGFOcYAE",
    authDomain: "vade-mecum-de-questoes.firebaseapp.com",
    projectId: "vade-mecum-de-questoes",
    storageBucket: "vade-mecum-de-questoes.appspot.com",
    messagingSenderId: "667396734608",
    appId: "1:667396734608:web:96f67c131ccbd798792215"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias do Auth e Firestore para serem usadas em outros módulos
export const auth = getAuth(app);
export const db = getFirestore(app);
