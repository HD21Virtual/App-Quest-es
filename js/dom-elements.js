/**
 * @file js/dom-elements.js
 * @description Centraliza todas as referências a elementos do DOM.
 * Isso torna o código mais limpo e fácil de manter, pois todas as seleções de elementos
 * estão em um único lugar.
 */

const DOM = {
    // Views
    inicioView: document.getElementById('inicio-view'),
    vadeMecumView: document.getElementById('vade-mecum-view'),
    cadernosView: document.getElementById('cadernos-view'),
    materiasView: document.getElementById('materias-view'),
    revisaoView: document.getElementById('revisao-view'),
    estatisticasView: document.getElementById('estatisticas-view'),

    // Navigation
    mainNav: document.getElementById('main-nav'),
    mobileMenu: document.getElementById('mobile-menu'),
    hamburgerBtn: document.getElementById('hamburger-btn'),

    // Filtros
    filterCard: document.getElementById('filter-card'),
    toggleFiltersBtn: document.getElementById('toggle-filters-btn'),
    filterBtn: document.getElementById('filter-btn'),
    materiaFilter: document.getElementById('materia-filter'),
    assuntoFilter: document.getElementById('assunto-filter'),
    tipoFilterGroup: document.getElementById('tipo-filter-group'),
    searchInput: document.getElementById('search-input'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    selectedFiltersContainer: document.getElementById('selected-filters-container'),

    // Vade Mecum
    vadeMecumContentArea: document.getElementById('vade-mecum-content-area'),
    vadeMecumTitle: document.getElementById('vade-mecum-title'),
    tabsContainer: document.getElementById('tabs-container'),

    // Cadernos
    savedCadernosListContainer: document.getElementById('saved-cadernos-list-container'),
    cadernosViewTitle: document.getElementById('cadernos-view-title'),
    cadernosViewActions: document.getElementById('cadernos-view-actions'),
    backToFoldersBtn: document.getElementById('back-to-folders-btn'),
    addCadernoToFolderBtn: document.getElementById('add-caderno-to-folder-btn'),
    addQuestionsToCadernoBtn: document.getElementById('add-questions-to-caderno-btn'),
    addQuestionsBanner: document.getElementById('add-questions-banner'),
    addQuestionsBannerText: document.getElementById('add-questions-banner-text'),
    cancelAddQuestionsBtn: document.getElementById('cancel-add-questions-btn'),
    
    // Matérias
    materiasViewTitle: document.getElementById('materias-view-title'),
    materiasListContainer: document.getElementById('materias-list-container'),
    assuntosListContainer: document.getElementById('assuntos-list-container'),
    backToMateriasBtn: document.getElementById('back-to-materias-btn'),

    // Revisão
    reviewCard: document.getElementById('review-card'),
    reviewCountEl: document.getElementById('review-count'),
    startReviewBtn: document.getElementById('start-review-btn'),
    
    // Estatísticas
    statsMainContent: document.getElementById('stats-main-content'),
    resetAllProgressBtn: document.getElementById('reset-all-progress-btn'),

    // Modals
    authModal: document.getElementById('auth-modal'),
    saveModal: document.getElementById('save-modal'),
    loadModal: document.getElementById('load-modal'),
    cadernoModal: document.getElementById('caderno-modal'),
    nameModal: document.getElementById('name-modal'),
    confirmationModal: document.getElementById('confirmation-modal'),
    statsModal: document.getElementById('stats-modal'),

    // Elementos de Modals
    userAccountContainer: document.getElementById('user-account-container'),
    userAccountContainerMobile: document.getElementById('user-account-container-mobile'),
    authError: document.getElementById('auth-error'),
    filterNameInput: document.getElementById('filter-name-input'),
    savedFiltersListContainer: document.getElementById('saved-filters-list-container'),
    searchSavedFiltersInput: document.getElementById('search-saved-filters-input'),
    cadernoNameInput: document.getElementById('caderno-name-input'),
    folderSelect: document.getElementById('folder-select'),
    nameInput: document.getElementById('name-input'),
    nameModalTitle: document.getElementById('name-modal-title'),
    confirmationModalTitle: document.getElementById('confirmation-modal-title'),
    confirmationModalText: document.getElementById('confirmation-modal-text'),
    statsModalTitle: document.getElementById('stats-modal-title'),
    statsModalContent: document.getElementById('stats-modal-content'),
};

export default DOM;
