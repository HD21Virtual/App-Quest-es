import DOM from './dom-elements.js';

/**
 * @file js/state.js
 * @description Gerencia o estado global da aplicação.
 */

const initialState = {
    filterOptions: {
        materia: [],
        allAssuntos: []
    },
    currentQuestionIndex: 0,
    filteredQuestions: [],
    allQuestions: [],
    sessionStats: [],
    currentUser: null,
    userFolders: [],
    userCadernos: [],
    currentFolderId: null,
    currentCadernoId: null,
    editingId: null,
    editingType: null,
    isAddingQuestionsMode: { active: false, cadernoId: null },
    createCadernoWithFilteredQuestions: false,
    deletingId: null,
    deletingType: null,
    isNavigatingBackFromAddMode: false,
    isReviewSession: false,
    historicalSessions: [],
    userAnswers: new Map(),
    userCadernoState: new Map(),
    userReviewItemsMap: new Map(),
    unsubCadernos: null,
    unsubFolders: null,
    unsubFiltros: null,
    unsubSessions: null,
    unsubReviewItems: null,
    unsubAnswers: null,
    unsubCadernoState: null,
};

export let state = { ...initialState };

export function resetStateOnLogout() {
    state = { 
        ...initialState,
        // Mantemos dados que não dependem do usuário
        allQuestions: state.allQuestions,
        filterOptions: state.filterOptions
    };
    state.userAnswers = new Map();
    state.userCadernoState = new Map();
    state.userReviewItemsMap = new Map();
}


/**
 * Adiciona uma função de 'unsubscribe' do Firestore ao estado para limpeza posterior.
 * @param {string} key - A chave para armazenar a função (ex: 'unsubCadernos').
 * @param {Function} unsub - A função de unsubscribe retornada pelo onSnapshot.
 */
export function addUnsubscribe(key, unsub) {
    state[key] = unsub;
}

export function clearSessionStats() {
    state.sessionStats = [];
}

export function clearUnsubscribes() {
    if (state.unsubCadernos) state.unsubCadernos();
    if (state.unsubFolders) state.unsubFolders();
    if (state.unsubFiltros) state.unsubFiltros();
    if (state.unsubSessions) state.unsubSessions();
    if (state.unsubReviewItems) state.unsubReviewItems();
    if (state.unsubAnswers) state.unsubAnswers();
    if (state.unsubCadernoState) state.unsubCadernoState();
}

/**
 * Determina qual contêiner de conteúdo está ativo com base no estado atual.
 * @returns {HTMLElement} O elemento contêiner ativo.
 */
export function getActiveContainer() {
    return state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
}

