/**
 * @file js/state.js
 * @description Centraliza e gerencia o estado global da aplicação.
 */

// Objeto principal que contém todo o estado da aplicação.
export const state = {
    // Opções de filtro carregadas do banco de dados
    filterOptions: {
        materia: [],
        allAssuntos: []
    },
    // Questões
    allQuestions: [],
    filteredQuestions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    // Estatísticas e Sessão
    sessionStats: [],
    historicalSessions: [],
    isReviewSession: false,
    // Usuário
    currentUser: null,
    userFolders: [],
    userCadernos: [],
    userAnswers: new Map(),
    userCadernoState: new Map(),
    userReviewItemsMap: new Map(),
    // Estado da UI
    currentFolderId: null, 
    currentCadernoId: null,
    selectedMateria: null,
    editingId: null,
    editingType: null, // 'folder' ou 'caderno'
    deletingId: null,
    deletingType: null,
    isAddingQuestionsMode: { active: false, cadernoId: null },
    createCadernoWithFilteredQuestions: false,
    isNavigatingBackFromAddMode: false,
};

// Array para armazenar as funções de 'unsubscribe' dos listeners do Firestore.
let unsubscribes = [];

/**
 * Adiciona uma função de unsubscribe ao array.
 * @param {Function} unsub - A função de unsubscribe retornada pelo onSnapshot.
 */
export function addUnsubscribe(unsub) {
    unsubscribes.push(unsub);
}

/**
 * Executa todas as funções de unsubscribe e limpa o array.
 * Essencial para evitar memory leaks ao fazer logout.
 */
export function clearAllUnsubscribes() {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
}

/**
 * Limpa as estatísticas da sessão de estudo atual.
 */
export function clearSessionStats() {
    state.sessionStats = [];
}

/**
 * Reseta o estado da aplicação para os valores iniciais,
 * geralmente chamado durante o logout do usuário.
 */
export function resetStateOnLogout() {
    state.filterOptions = { materia: [], allAssuntos: [] };
    state.allQuestions = [];
    state.filteredQuestions = [];
    state.currentQuestionIndex = 0;
    state.selectedAnswer = null;
    state.sessionStats = [];
    state.historicalSessions = [];
    state.isReviewSession = false;
    state.userFolders = [];
    state.userCadernos = [];
    state.userAnswers.clear();
    state.userCadernoState.clear();
    state.userReviewItemsMap.clear();
    state.currentFolderId = null;
    state.currentCadernoId = null;
    state.selectedMateria = null;
    state.editingId = null;
    state.editingType = null;
    state.deletingId = null;
    state.deletingType = null;
    state.isAddingQuestionsMode = { active: false, cadernoId: null };
    state.createCadernoWithFilteredQuestions = false;
    state.isNavigatingBackFromAddMode = false;

    clearAllUnsubscribes();
}

