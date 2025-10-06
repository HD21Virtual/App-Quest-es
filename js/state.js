import DOM from './dom-elements.js';

/**
 * @file js/state.js
 * @description Gerencia o estado global da aplicação.
 */

export const state = {
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

    // Unsubscribe functions for Firestore listeners
    unsubCadernos: null,
    unsubFolders: null,
    unsubFiltros: null,
    unsubSessions: null,
    unsubReviewItems: null,
    unsubAnswers: null,
    unsubCadernoState: null,
};

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

