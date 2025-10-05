import { initializeApp } from './config/firebase.js';
import { initAuth, onUserLoggedIn, onUserLoggedOut } from './services/auth.js';
import { fetchAllQuestions } from './services/firestore.js';
import { setState } from './services/state.js';
import { setupEventListeners, updateUserUI } from './modules/ui.js';
import { populateMateriaFilterOptions } from './modules/filters.js';

/**
 * Função principal que inicializa a aplicação.
 */
async function main() {
    initializeApp();
    setupEventListeners();

    initAuth((user) => {
        if (user) {
            updateUserUI(user);
            setState({ currentUser: user });
            
            fetchAllQuestions().then(() => {
                // Popula os filtros DEPOIS que as questões foram carregadas
                populateMateriaFilterOptions();
                onUserLoggedIn(user);
            });
        } else {
            updateUserUI(null);
            onUserLoggedOut();
        }
    });
}

document.addEventListener('DOMContentLoaded', main);

