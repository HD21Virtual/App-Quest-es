// Importando todos os módulos da aplicação
import { initAuth } from './services/auth.js';
import { initializeAppListeners, setupGlobalEventListeners, updateUserUI } from './modules/ui.js';
import { fetchAllQuestionsAndSetupFilters } from './modules/filters.js';
import { 
    setupAllFirestoreListeners, 
    cleanupAllFirestoreListeners 
} from './services/firestore.js';
import { resetState, setState } from './services/state.js';

/**
 * Função principal que é executada quando o usuário está logado.
 * @param {object} user - O objeto de usuário do Firebase.
 */
function onUserLoggedIn(user) {
    console.log("User logged in:", user.uid);
    // CHAVE DA CORREÇÃO: Atualiza a UI para mostrar o estado de "logado"
    updateUserUI(user); 
    
    setState({ currentUser: user });

    // Busca todas as questões e configura os filtros
    fetchAllQuestionsAndSetupFilters();
    
    // Inicia todos os listeners do Firestore para dados do usuário
    setupAllFirestoreListeners(user.uid);
}

/**
 * Função principal que é executada quando o usuário faz logout.
 */
function onUserLoggedOut() {
    console.log("User logged out");
    // Limpa todos os listeners para evitar vazamento de memória e erros
    cleanupAllFirestoreListeners();
    // Reseta o estado da aplicação para o estado inicial (isso também atualiza a UI)
    resetState();
}

/**
 * Inicializa a aplicação.
 */
function main() {
    // Registra o plugin de datalabels para o Chart.js
    Chart.register(ChartDataLabels);
    
    // Configura os event listeners globais e de navegação
    setupGlobalEventListeners();
    initializeAppListeners();

    // Inicia o serviço de autenticação, passando as funções de callback
    // para quando o estado de autenticação do usuário mudar.
    initAuth(onUserLoggedIn, onUserLoggedOut);
}

// Inicia a aplicação quando o script é carregado
main();

