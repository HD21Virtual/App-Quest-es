/**
 * @file js/state.js
 * @description Gerencia o estado global da aplicação de forma centralizada.
 * Isso evita o uso de variáveis globais soltas e facilita o rastreamento de dados.
 */

export const state = {
    currentUser: null,
    allQuestions: [],
    filteredQuestions: [],
    filterOptions: {
        materia: [],
        allAssuntos: []
    },
    currentQuestionIndex: 0,
    selectedAnswer: null,
    sessionStats: [],
    historicalSessions: [],
    
    userFolders: [],
    userCadernos: [],
    userAnswers: new Map(),
    userCadernoState: new Map(),
    userReviewItemsMap: new Map(),

    // State for specific UI contexts
    currentFolderId: null,
    currentCadernoId: null,
    editingId: null,
    editingType: null, // 'folder' ou 'caderno'
    deletingId: null,
    deletingType: null,
    isAddingQuestionsMode: { active: false, cadernoId: null },
    isReviewSession: false,
    createCadernoWithFilteredQuestions: false,
    isNavigatingBackFromAddMode: false,
    selectedMateriaForView: null,
};

// Reseta o estado para os valores iniciais (usado no logout)
export function resetState() {
    state.currentUser = null;
    state.allQuestions = [];
    state.filteredQuestions = [];
    state.userFolders = [];
    state.userCadernos = [];
    state.sessionStats = [];
    state.historicalSessions = [];
    state.userAnswers.clear();
    state.userCadernoState.clear();
    state.userReviewItemsMap.clear();
    state.currentFolderId = null;
    state.currentCadernoId = null;
    state.isReviewSession = false;
}
