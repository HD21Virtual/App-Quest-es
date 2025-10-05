import { initializeApp } from './config/firebase.js';
import { initAuth, onUserLoggedIn, onUserLoggedOut } from './services/auth.js';
import { fetchAllQuestions } from './services/firestore.js';
import { setState } from './services/state.js';
import { setupEventListeners, updateUserUI } from './modules/ui.js';
import { populateMateriaFilterOptions } from './modules/filters.js';
import { setupSrsEventListeners } from './modules/srs.js';

/**
 * Função principal que inicializa a aplicação.
 */
async function main() {
    initializeApp();
    setupEventListeners();
    setupSrsEventListeners(); // Adiciona o event listener para o botão de revisão

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
