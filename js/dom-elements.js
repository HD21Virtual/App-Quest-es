const DOM = {
    // Views
    inicioView: document.getElementById('inicio-view'),
    vadeMecumView: document.getElementById('vade-mecum-view'),
    cadernosView: document.getElementById('cadernos-view'),
    materiasView: document.getElementById('materias-view'),
    revisaoView: document.getElementById('revisao-view'),
    estatisticasView: document.getElementById('estatisticas-view'),

    // Header & Nav
    mainNav: document.getElementById('main-nav'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    mobileMenu: document.getElementById('mobile-menu'),
    userAccountContainer: document.getElementById('user-account-container'),
    userAccountContainerMobile: document.getElementById('user-account-container-mobile'),
    
    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    
    // Vade Mecum / Questões View
    vadeMecumContentArea: document.getElementById('vade-mecum-content-area'),
    vadeMecumTitle: document.getElementById('vade-mecum-title'),
    addQuestionsBanner: document.getElementById('add-questions-banner'),
    addQuestionsBannerText: document.getElementById('add-questions-banner-text'),
    cancelAddQuestionsBtn: document.getElementById('cancel-add-questions-btn'),
    toggleFiltersBtn: document.getElementById('toggle-filters-btn'),
    filterCard: document.getElementById('filter-card'),
    savedFiltersListBtn: document.getElementById('saved-filters-list-btn'),
    searchInput: document.getElementById('search-input'),
    materiaFilter: document.getElementById('materia-filter'),
    assuntoFilter: document.getElementById('assunto-filter'),
    tipoFilterGroup: document.getElementById('tipo-filter-group'),
    selectedFiltersContainer: document.getElementById('selected-filters-container'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    saveFilterBtn: document.getElementById('save-filter-btn'),
    createCadernoBtn: document.getElementById('create-caderno-btn'),
    filterBtn: document.getElementById('filter-btn'),
    tabsContainer: document.getElementById('tabs-container'),

    // Cadernos View
    cadernosViewTitle: document.getElementById('cadernos-view-title'),
    backToFoldersBtn: document.getElementById('back-to-folders-btn'),
    addQuestionsToCadernoBtn: document.getElementById('add-questions-to-caderno-btn'),
    createFolderBtn: document.getElementById('create-folder-btn'),
    addCadernoToFolderBtn: document.getElementById('add-caderno-to-folder-btn'),
    savedCadernosListContainer: document.getElementById('saved-cadernos-list-container'),
    
    // Matérias View
    materiasViewTitle: document.getElementById('materias-view-title'),
    materiasListContainer: document.getElementById('materias-list-container'),
    assuntosListContainer: document.getElementById('assuntos-list-container'),
    backToMateriasBtn: document.getElementById('back-to-materias-btn'),
    
    // Revisão View
    startReviewBtn: document.getElementById('start-review-btn'),
    
    // Estatísticas View
    resetAllProgressBtn: document.getElementById('reset-all-progress-btn'),

    // Modals
    saveModal: document.getElementById('save-modal'),
    loadModal: document.getElementById('load-modal'),
    cadernoModal: document.getElementById('caderno-modal'),
    nameModal: document.getElementById('name-modal'),
    confirmationModal: document.getElementById('confirmation-modal'),
    statsModal: document.getElementById('stats-modal'),
};

export default DOM;

