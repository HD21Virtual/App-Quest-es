/**
 * @file js/state.js
 * @description Centraliza o estado da aplicação para ser compartilhado entre os módulos.
 */

// Central state object
export const state = {
    currentUser: null,
    allQuestions: [],
    filteredQuestions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    sessionStats: [],
    historicalSessions: [],
    userFolders: [],
    userCadernos: [],
    userAnswers: new Map(),
    userCadernoState: new Map(),
    userReviewItemsMap: new Map(),
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
    filterOptions: {
        materia: [],
        allAssuntos: []
    },
    unsubscribes: [] // Armazena as funções de unsubscribe do Firestore
};

// --- Funções para modificar o estado (Setters) ---

export function setCurrentUser(user) {
    state.currentUser = user;
}

export function setFilteredQuestions(questions) {
    state.filteredQuestions = questions;
    state.currentQuestionIndex = 0;
}

export function setCurrentQuestionIndex(index) {
    state.currentQuestionIndex = index;
}

export function setSelectedAnswer(answer) {
    state.selectedAnswer = answer;
}

export function addSessionStat(stat) {
    state.sessionStats.push(stat);
}

export function clearSessionStats() {
    state.sessionStats = [];
}

export function addUnsubscribe(unsub) {
    state.unsubscribes.push(unsub);
}

export function clearUnsubscribes() {
    state.unsubscribes.forEach(unsub => unsub());
    state.unsubscribes = [];
}


export function resetStateOnLogout() {
    state.currentUser = null;
    state.allQuestions = [];
    state.filteredQuestions = [];
    state.currentQuestionIndex = 0;
    state.sessionStats = [];
    state.historicalSessions = [];
    state.userFolders = [];
    state.userCadernos = [];
    state.userAnswers.clear();
    state.userCadernoState.clear();
    state.userReviewItemsMap.clear();
    state.currentFolderId = null;
    state.currentCadernoId = null;
    // Não limpa filterOptions, pois pode ser útil manter
}

