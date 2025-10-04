import { initializeApp } from './config/firebase.js';
import { initAuth, onUserLoggedIn, onUserLoggedOut } from './services/auth.js';
import { fetchAllQuestions, setupAllFirestoreListeners, cleanupAllFirestoreListeners } from './services/firestore.js';
import { setState, resetState } from './services/state.js';
import { setupEventListeners, updateUserUI } from './modules/ui.js';

/**
 * Função principal que inicializa a aplicação.
 */
async function main() {
    initializeApp();
    setupEventListeners();

    // Ouve as mudanças no estado de autenticação
    initAuth((user) => {
        if (user) {
            // Usuário está logado
            updateUserUI(user);
            setState({ currentUser: user });
            
            // Garante que as questões sejam carregadas antes do resto dos dados
            fetchAllQuestions().then(() => {
                onUserLoggedIn(user);
            });
        } else {
            // Usuário está deslogado
            updateUserUI(null);
            onUserLoggedOut();
        }
    });
}

// Inicia a aplicação quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', main);

