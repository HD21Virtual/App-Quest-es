/**
 * @file js/state.js
 * @description Centraliza o estado da aplicação.
 */

export let state = {
    currentUser: null,
    filterOptions: {
        materia: [],
        allAssuntos: []
    },
    currentQuestionIndex: 0,
    selectedAnswer: null,
    filteredQuestions: [],
    allQuestions: [],
    sessionStats: [],
    historicalSessions: [],
    userFolders: [],
    userCadernos: [],
    currentFolderId: null,
    currentCadernoId: null,
    editingId: null,
    editingType: null, // 'folder' ou 'caderno'
    isAddingQuestionsMode: { active: false, cadernoId: null },
    createCadernoWithFilteredQuestions: false,
    deletingId: null,
    deletingType: null,
    isNavigatingBackFromAddMode: false,
    isReviewSession: false,
    userReviewItemsMap: new Map(),
    userAnswers: new Map(),
    userCadernoState: new Map(),
    selectedMateria: null,
    unsubscribes: {} // Armazena as funções de unsubscribe do Firestore
};

/**
 * Atualiza uma propriedade do estado central.
 * @param {string} key - A chave do estado a ser atualizada.
 * @param {*} value - O novo valor para a chave.
 */
export function setState(key, value) {
    if (key in state) {
        state[key] = value;
    } else {
        console.warn(`Tentativa de definir uma chave de estado inexistente: ${key}`);
    }
}

/**
 * Adiciona uma função de unsubscribe do Firestore para ser chamada no logout.
 * @param {string} key - Um identificador para o listener.
 * @param {Function} func - A função de unsubscribe retornada pelo onSnapshot.
 */
export function addUnsubscribe(key, func) {
    state.unsubscribes[key] = func;
}

/**
 * Chama todas as funções de unsubscribe armazenadas e limpa o objeto.
 */
export function clearUnsubscribes() {
    for (const key in state.unsubscribes) {
        if (typeof state.unsubscribes[key] === 'function') {
            state.unsubscribes[key](); // Executa a função de unsubscribe
        }
    }
    state.unsubscribes = {};
}

/**
 * Reseta o estado da aplicação para os valores iniciais (usado no logout).
 */
export function resetStateOnLogout() {
    state.currentUser = null;
    state.currentQuestionIndex = 0;
    state.selectedAnswer = null;
    state.filteredQuestions = [];
    state.sessionStats = [];
    state.historicalSessions = [];
    state.userFolders = [];
    state.userCadernos = [];
    state.currentFolderId = null;
    state.currentCadernoId = null;
    state.userReviewItemsMap.clear();
    state.userAnswers.clear();
    state.userCadernoState.clear();
}

/**
 * Limpa as estatísticas da sessão atual.
 */
export function clearSessionStats() {
    state.sessionStats = [];
}


/**
 * Obtém o contêiner de conteúdo ativo (seja a view principal ou a de cadernos).
 * @returns {HTMLElement} O elemento do contêiner ativo.
 */
export function getActiveContainer() {
    return state.currentCadernoId ? document.getElementById('saved-cadernos-list-container') : document.getElementById('vade-mecum-content-area');
}

