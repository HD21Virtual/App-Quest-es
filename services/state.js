import { navigateToView, clearUserSpecificUI } from '../modules/ui.js';

let state = {
    // Auth & User
    currentUser: null,
    
    // Data
    allQuestions: [],
    filterOptions: { materia: [], allAssuntos: [] },

    // Question Solving
    filteredQuestions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    sessionStats: [],
    isReviewSession: false,
    
    // Cadernos
    userFolders: [],
    userCadernos: [],
    currentFolderId: null,
    currentCadernoId: null,
    editingId: null,
    editingType: null, // 'folder' ou 'caderno'
    isAddingQuestionsMode: { active: false, cadernoId: null },
    isNavigatingBackFromAddMode: false,

    // Firestore data maps
    userAnswers: new Map(),
    userCadernoState: new Map(),
    userReviewItemsMap: new Map(),
    historicalSessions: [],
};

/**
 * Retorna uma cópia do estado atual para evitar mutações diretas.
 */
export function getState() {
    return { ...state };
}

/**
 * Atualiza o estado global.
 * @param {object} newState - Um objeto com as chaves do estado a serem atualizadas.
 */
export function setState(newState) {
    state = { ...state, ...newState };
}

/**
 * Reseta o estado da aplicação para os valores iniciais (usado no logout).
 */
export function resetState() {
    state = {
        currentUser: null,
        allQuestions: [],
        filterOptions: { materia: [], allAssuntos: [] },
        filteredQuestions: [],
        currentQuestionIndex: 0,
        selectedAnswer: null,
        sessionStats: [],
        isReviewSession: false,
        userFolders: [],
        userCadernos: [],
        currentFolderId: null,
        currentCadernoId: null,
        editingId: null,
        editingType: null,
        isAddingQuestionsMode: { active: false, cadernoId: null },
        isNavigatingBackFromAddMode: false,
        userAnswers: new Map(),
        userCadernoState: new Map(),
        userReviewItemsMap: new Map(),
        historicalSessions: [],
    };
    
    // Limpa a UI de dados específicos do usuário
    clearUserSpecificUI();
    // Navega para a view inicial
    navigateToView('inicio-view');
}

