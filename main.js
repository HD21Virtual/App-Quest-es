// Importando todos os módulos da aplicação
import { initAuth } from './services/auth.js';
import { initializeAppListeners, setupGlobalEventListeners, updateUserUI, navigateToView } from './modules/ui.js';
import { fetchAllQuestionsAndSetupFilters } from './modules/filters.js';
import { 
    setupAllFirestoreListeners, 
    cleanupAllFirestoreListeners 
} from './services/firestore.js';
import { resetState, setState } from './services/state.js';

/**
 * Função principal que é executada quando o usuário está logado.
 * É uma função assíncrona para garantir que as operações essenciais terminem antes de continuar.
 * @param {object} user - O objeto de usuário do Firebase.
 */
async function onUserLoggedIn(user) {
    console.log("User logged in:", user.uid);
    updateUserUI(user);
    setState({ currentUser: user });

    // 1. Espera (await) que a lista principal de questões seja totalmente carregada.
    // Isso é crucial para que o resto da aplicação tenha os dados necessários.
    await fetchAllQuestionsAndSetupFilters();
    
    // 2. Apenas DEPOIS que as questões foram carregadas, inicia os listeners
    // para os outros dados do usuário (cadernos, revisões, etc.).
    setupAllFirestoreListeners(user.uid);
    
    // 3. Navega para a tela inicial para exibir os dados.
    navigateToView('inicio-view');
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

