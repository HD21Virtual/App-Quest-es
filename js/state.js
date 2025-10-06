import DOM from "./dom-elements.js";

export let state = {
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
    currentUser: null,
    userFolders: [],
    userCadernos: [],
    currentFolderId: null,
    currentCadernoId: null,
    editingId: null,
    editingType: null,
    isAddingQuestionsMode: { active: false, cadernoId: null },
    isReviewSession: false,
    userAnswers: new Map(),
    userCadernoState: new Map(),
    userReviewItemsMap: new Map(),
    savedFilters: [], // Added this key
    unsubscribes: [],
};

export function setState(key, value) {
    if (Object.prototype.hasOwnProperty.call(state, key)) {
        state[key] = value;
    } else {
        console.warn(`Tentativa de definir uma chave de estado inexistente: ${key}`);
    }
}

export function getActiveContainer() {
    return state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
}

export function clearSessionStats() {
    state.sessionStats = [];
}

export function addUnsubscribe(unsubscribe) {
    state.unsubscribes.push(unsubscribe);
}

export function clearUnsubscribes() {
    state.unsubscribes.forEach(unsub => unsub());
    state.unsubscribes = [];
}

export function resetStateOnLogout() {
    state.allQuestions = [];
    state.filteredQuestions = [];
    state.userFolders = [];
    state.userCadernos = [];
    state.userAnswers.clear();
    state.userCadernoState.clear();
    state.userReviewItemsMap.clear();
    state.historicalSessions = [];
    state.sessionStats = [];
    if (DOM.reviewCard) DOM.reviewCard.classList.add('hidden');
    if (DOM.savedCadernosListContainer) DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus cadernos.</p>';
    if (DOM.savedFiltersListContainer) DOM.savedFiltersListContainer.innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus filtros.</p>';
}

