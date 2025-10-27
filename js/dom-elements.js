const DOM = {};

export function initDOM() {
    // Views
    DOM.inicioView = document.getElementById('inicio-view');
    DOM.vadeMecumView = document.getElementById('vade-mecum-view');
    DOM.cadernosView = document.getElementById('cadernos-view');
    DOM.materiasView = document.getElementById('materias-view');
    DOM.revisaoView = document.getElementById('revisao-view');
    DOM.estatisticasView = document.getElementById('estatisticas-view');

    // Navigation
    DOM.mainNav = document.getElementById('main-nav');
    DOM.mobileMenu = document.getElementById('mobile-menu');
    DOM.hamburgerBtn = document.getElementById('hamburger-btn');

    // Stats Cards (Home)
    DOM.statsTotalQuestionsEl = document.getElementById('stats-total-questions');
    DOM.statsTotalCorrectEl = document.getElementById('stats-total-correct');
    DOM.statsTotalIncorrectEl = document.getElementById('stats-total-incorrect');
    DOM.statsGeralAccuracyEl = document.getElementById('stats-geral-accuracy');
    DOM.homeChartCanvas = document.getElementById('homePerformanceChart');
    DOM.weeklyChartCanvas = document.getElementById('weeklyPerformanceChart');

    // Filters (Vade Mecum)
    DOM.vadeMecumTitle = document.getElementById('vade-mecum-title');
    DOM.filterBtn = document.getElementById('filter-btn');
    DOM.materiaFilter = document.getElementById('materia-filter');
    DOM.assuntoFilter = document.getElementById('assunto-filter');
    DOM.tipoFilterGroup = document.getElementById('tipo-filter-group');
    DOM.searchInput = document.getElementById('search-input');
    DOM.clearFiltersBtn = document.getElementById('clear-filters-btn');
    DOM.selectedFiltersContainer = document.getElementById('selected-filters-container');
    DOM.filterCard = document.getElementById('filter-card');
    DOM.toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    DOM.vadeMecumContentArea = document.getElementById('vade-mecum-content-area');

    // Cadernos View
    DOM.savedCadernosListContainer = document.getElementById('saved-cadernos-list-container');
    DOM.cadernosViewTitle = document.getElementById('cadernos-view-title');
    DOM.backToFoldersBtn = document.getElementById('back-to-folders-btn');
    DOM.addCadernoToFolderBtn = document.getElementById('add-caderno-to-folder-btn');
    DOM.addQuestionsToCadernoBtn = document.getElementById('add-questions-to-caderno-btn');
    DOM.createFolderBtn = document.getElementById('create-folder-btn');
    DOM.addQuestionsBanner = document.getElementById('add-questions-banner');
    DOM.addQuestionsBannerText = document.getElementById('add-questions-banner-text');

    // Materias View
    DOM.materiasViewTitle = document.getElementById('materias-view-title');
    DOM.materiasListContainer = document.getElementById('materias-list-container');
    DOM.assuntosListContainer = document.getElementById('assuntos-list-container');
    DOM.backToMateriasBtn = document.getElementById('back-to-materias-btn');

    // Review View
    DOM.reviewTableContainer = document.getElementById('review-table-container');
    DOM.startSelectedReviewBtn = document.getElementById('start-selected-review-btn');


    // Auth Modal
    DOM.authModal = document.getElementById('auth-modal');
    DOM.userAccountContainer = document.getElementById('user-account-container');
    DOM.userAccountContainerMobile = document.getElementById('user-account-container-mobile');
    DOM.emailInput = document.getElementById('email-input');
    DOM.passwordInput = document.getElementById('password-input');
    DOM.authError = document.getElementById('auth-error');

    // Save Filter Modal
    DOM.saveModal = document.getElementById('save-modal');
    DOM.filterNameInput = document.getElementById('filter-name-input');

    // Load Filter Modal
    DOM.loadModal = document.getElementById('load-modal');
    DOM.savedFiltersListContainer = document.getElementById('saved-filters-list-container');
    DOM.searchSavedFiltersInput = document.getElementById('search-saved-filters-input');

    // Caderno Modal
    DOM.cadernoModal = document.getElementById('caderno-modal');
    DOM.cadernoNameInput = document.getElementById('caderno-name-input');
    DOM.folderSelect = document.getElementById('folder-select');

    // Name Modal
    DOM.nameModal = document.getElementById('name-modal');
    DOM.nameInput = document.getElementById('name-input');
    DOM.nameModalTitle = document.getElementById('name-modal-title');

    // Confirmation Modal
    DOM.confirmationModal = document.getElementById('confirmation-modal');
    DOM.confirmationModalTitle = document.getElementById('confirmation-modal-title');
    DOM.confirmationModalText = document.getElementById('confirmation-modal-text');
    DOM.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    DOM.cancelConfirmationBtn = document.getElementById('cancel-confirmation-btn');

    // Stats Modal
    DOM.statsModal = document.getElementById('stats-modal');
    DOM.statsModalTitle = document.getElementById('stats-modal-title');
    DOM.statsModalContent = document.getElementById('stats-modal-content');
    
    // Estatisticas View
    DOM.statsMainContent = document.getElementById('stats-main-content');
    DOM.statsTabsContainer = document.getElementById('stats-tabs-container');

    // Stats - Desempenho Geral
    DOM.statsGeralResolvidas = document.getElementById('stats-geral-resolvidas');
    DOM.statsGeralAcertos = document.getElementById('stats-geral-acertos');
    DOM.statsGeralErros = document.getElementById('stats-geral-erros');
    DOM.statsGeralMaterias = document.getElementById('stats-geral-materias');
    DOM.statsPagePerformanceChartCanvas = document.getElementById('statsPagePerformanceChart');
    DOM.statsDesempenhoMateriaContainer = document.getElementById('stats-desempenho-materia-container');
    // ===== INÍCIO DA MODIFICAÇÃO =====
    DOM.evolutionChartCanvas = document.getElementById('evolutionChartCanvas');
    // ===== FIM DA MODIFICAÇÃO =====
    
    // --- NOVO: Filtro de Período de Estatísticas ---
    DOM.statsPeriodoButton = document.getElementById('stats-periodo-button');
    DOM.statsPeriodoValue = document.getElementById('stats-periodo-value');
    DOM.statsPeriodoPanel = document.getElementById('stats-periodo-panel');
    DOM.statsPeriodoOptions = document.getElementById('stats-periodo-options');
    DOM.statsPeriodoCustomRange = document.getElementById('stats-periodo-custom-range');
    DOM.statsPeriodoStart = document.getElementById('stats-periodo-start');
    DOM.statsPeriodoEnd = document.getElementById('stats-periodo-end');
    DOM.statsPeriodoCustomApply = document.getElementById('stats-periodo-custom-apply');
    // --- FIM NOVO ---

    // ===== INÍCIO DA MODIFICAÇÃO: Filtros da aba Estatísticas =====
    // Remove referências aos <select> antigos
    // DOM.statsMateriaFilter = document.getElementById('stats-materia-filter'); // REMOVIDO
    // DOM.statsAssuntoFilter = document.getElementById('stats-pasta-filter'); // REMOVIDO
    
    // Adiciona referências aos novos containers .custom-select-container
    DOM.statsMateriaFilterCustom = document.getElementById('stats-materia-filter-custom');
    DOM.statsAssuntoFilterCustom = document.getElementById('stats-assunto-filter-custom');
    
    DOM.statsFilterBtn = document.getElementById('stats-filter-btn');
    // ===== FIM DA MODIFICAÇÃO =====

    // Rodapé de Seleção da Tabela de Stats
    DOM.statsSelectionFooter = document.getElementById('stats-selection-footer');
    DOM.statsFooterResolvidas = document.getElementById('stats-footer-resolvidas');
    DOM.statsFooterAcertos = document.getElementById('stats-footer-acertos');
    DOM.statsFooterErros = document.getElementById('stats-footer-erros');
}

export default DOM;
