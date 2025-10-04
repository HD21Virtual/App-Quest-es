import { updateUserUI, showInitialView, clearUserSpecificUI } from '../modules/ui.js';
import { displayQuestion } from '../modules/questions.js';

// O estado inicial da aplicação
const initialState = {
    // Opções de filtro carregadas do DB
    filterOptions: {
        materia: [],
        allAssuntos: []
    },
    // Estado do usuário
    currentUser: null,
    // Dados das questões
    allQuestions: [],
    filteredQuestions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    // Dados do usuário do DB
    userFolders: [],
    userCadernos: [],
    userAnswers: new Map(),
    userReviewItemsMap: new Map(),
    userCadernoState: new Map(),
    savedFilters: [],
    historicalSessions: [],
    // Estado da sessão atual
    sessionStats: [],
    // Estado da UI
    currentFolderId: null,
    currentCadernoId: null,
    isAddingQuestionsMode: { active: false, cadernoId: null },
    isReviewSession: false,
};

// A variável 'state' que guardará o estado atual da aplicação
let state = { ...initialState };

/**
 * Retorna uma cópia do estado atual.
 * @returns {object} O estado atual da aplicação.
 */
export function getState() {
    return { ...state };
}

/**
 * Define um novo valor para uma ou mais propriedades do estado.
 * @param {object} newState - Um objeto com as propriedades a serem atualizadas.
 */
export function setState(newState) {
    state = { ...state, ...newState };
}

/**
 * Atualiza o estado e opcionalmente chama uma função de callback.
 * Útil para garantir que a UI seja atualizada após a mudança de estado.
 * @param {object} newState - O novo estado a ser mesclado.
 * @param {Function} [callback] - Uma função a ser chamada após a atualização.
 */
export function updateState(newState, callback) {
    setState(newState);
    if (callback) {
        callback();
    }
}

/**
 * Reseta o estado da aplicação para o valor inicial.
 * Chamado principalmente no logout do usuário.
 */
export function resetState() {
    state = { ...initialState };
    // Atualiza a UI para refletir o estado de logout
    updateUserUI(null);
    showInitialView();
    clearUserSpecificUI();
    displayQuestion(); // Mostra a tela de "faça login"
}
