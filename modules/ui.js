import { signOutUser } from '../services/auth.js';
import { getState, setState } from '../services/state.js';
import { clearAllFilters, exitAddMode } from './filters.js';
import { renderFoldersAndCadernos, renderMateriasView, setSelectedMateria } from './cadernos.js';

// Mapeamento de todos os elementos DOM usados na aplicação para fácil acesso.
export const elements = {
    // Views principais
    inicioView: document.getElementById('inicio-view'),
    vadeMecumView: document.getElementById('vade-mecum-view'),
    cadernosView: document.getElementById('cadernos-view'),
    materiasView: document.getElementById('materias-view'),
    revisaoView: document.getElementById('revisao-view'),
    estatisticasView: document.getElementById('estatisticas-view'),
    allViews: () => [elements.inicioView, elements.vadeMecumView, elements.cadernosView, elements.materiasView, elements.revisaoView, elements.estatisticasView],

    // Navegação
    mainNav: document.getElementById('main-nav'),
    mobileMenu: document.getElementById('mobile-menu'),
    hamburgerBtn: document.getElementById('hamburger-btn'),

    // Autenticação
    authModal: document.getElementById('auth-modal'),
    closeAuthModalBtn: document.getElementById('close-auth-modal'),
    userAccountContainer: document.getElementById('user-account-container'),
    userAccountContainerMobile: document.getElementById('user-account-container-mobile'),
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
    emailInput: document.getElementById('email-input'),
    passwordInput: document.getElementById('password-input'),
    authError: document.getElementById('auth-error'),

    // Filtros
    filterCard: document.getElementById('filter-card'),
    toggleFiltersBtn: document.getElementById('toggle-filters-btn'),
    materiaFilter: document.getElementById('materia-filter'),
    assuntoFilter: document.getElementById('assunto-filter'),
    tipoFilterGroup: document.getElementById('tipo-filter-group'),
    searchInput: document.getElementById('search-input'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    selectedFiltersContainer: document.getElementById('selected-filters-container'),
    savedFiltersListBtn: document.getElementById('saved-filters-list-btn'),

    // Conteúdo das questões
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
    createFolderBtn: document.getElementById('create-folder-btn'),
    
    // Modo de Adição de Questões
    addQuestionsBanner: document.getElementById('add-questions-banner'),
    addQuestionsBannerText: document.getElementById('add-questions-banner-text'),
    cancelAddQuestionsBtn: document.getElementById('cancel-add-questions-btn'),

    // Matérias
    materiasViewTitle: document.getElementById('materias-view-title'),
    materiasListContainer: document.getElementById('materias-list-container'),
    assuntosListContainer: document.getElementById('assuntos-list-container'),
    backToMateriasBtn: document.getElementById('back-to-materias-btn'),
};

/**
 * Mostra uma view específica e esconde as outras.
 * @param {string} viewId O ID da view a ser mostrada.
 */
function showView(viewId) {
    elements.allViews().forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('text-blue-700', 'bg-blue-100');
        navLink.classList.add('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
    });

    document.querySelectorAll(`.nav-link[data-view="${viewId}"]`).forEach(matchingLink => {
        matchingLink.classList.add('text-blue-700', 'bg-blue-100');
        matchingLink.classList.remove('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
    });
}

/**
 * Atualiza a UI para refletir o estado de login/logout do usuário.
 * @param {object|null} user O objeto do usuário do Firebase ou null.
 */
export function updateUserUI(user) {
    const mobileContainer = elements.userAccountContainerMobile;
    elements.userAccountContainer.innerHTML = '';
    mobileContainer.innerHTML = '';

    if (user) {
        const loggedInHTML = `<div class="flex items-center"><span class="text-gray-600 text-sm mr-4">${user.email}</span><button id="logout-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        const loggedInHTMLMobile = `<div class="flex items-center justify-between"><span class="text-gray-600 text-sm">${user.email}</span><button id="logout-btn-mobile" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        elements.userAccountContainer.innerHTML = loggedInHTML;
        mobileContainer.innerHTML = loggedInHTMLMobile;

        document.getElementById('logout-btn').addEventListener('click', signOutUser);
        document.getElementById('logout-btn-mobile').addEventListener('click', signOutUser);
    } else {
        const loggedOutHTML = `<button id="show-login-modal-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Minha Conta</button>`;
        elements.userAccountContainer.innerHTML = loggedOutHTML;
        mobileContainer.innerHTML = loggedOutHTML;

        document.getElementById('show-login-modal-btn').addEventListener('click', () => elements.authModal.classList.remove('hidden'));
        mobileContainer.querySelector('#show-login-modal-btn').addEventListener('click', () => elements.authModal.classList.remove('hidden'));
    }
}

export function showInitialView() {
    showView('inicio-view');
}

export function clearUserSpecificUI() {
    elements.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus cadernos.</p>';
    document.getElementById('saved-filters-list-container').innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus filtros.</p>';
    document.getElementById('stats-main-content').innerHTML = '<p class="text-center text-gray-500">Inicie sessão para ver as suas estatísticas.</p>';
    document.getElementById('review-card').classList.add('hidden');
}


/**
 * Configura os listeners de eventos para a navegação principal e menu mobile.
 */
export function initializeAppListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const viewId = link.dataset.view;
            const { isAddingQuestionsMode } = getState();

            if (isAddingQuestionsMode.active) exitAddMode();
            
            if (viewId === 'cadernos-view') {
                 setState({ currentFolderId: null, currentCadernoId: null });
            }

            showView(viewId);

            if (viewId === 'vade-mecum-view') {
                setState({ isReviewSession: false });
                elements.vadeMecumTitle.textContent = "Vade Mecum de Questões";
                elements.toggleFiltersBtn.classList.remove('hidden');
                elements.filterCard.classList.remove('hidden');
                clearAllFilters();
            } else if (viewId === 'cadernos-view') {
                renderFoldersAndCadernos();
            } else if (viewId === 'materias-view') {
                setSelectedMateria(null);
                renderMateriasView();
            }

            elements.mobileMenu.classList.add('hidden');
        });
    });

    elements.hamburgerBtn.addEventListener('click', () => {
        elements.mobileMenu.classList.toggle('hidden');
    });

    elements.toggleFiltersBtn.addEventListener('click', () => {
        elements.filterCard.classList.toggle('hidden');
        elements.toggleFiltersBtn.innerHTML = elements.filterCard.classList.contains('hidden')
            ? `<i class="fas fa-eye mr-2"></i> Mostrar Filtros`
            : `<i class="fas fa-eye-slash mr-2"></i> Ocultar Filtros`;
    });
}

/**
 * Configura listeners de eventos globais, como cliques fora de modais.
 */
export function setupGlobalEventListeners() {
    window.addEventListener('click', function(e) {
        // Fecha custom selects
        document.querySelectorAll('.custom-select-container').forEach(container => {
            if (!container.contains(e.target)) {
                container.querySelector('.custom-select-panel').classList.add('hidden');
            }
        });
        
        // Fecha modais
        const authModal = document.getElementById('auth-modal');
        if (authModal && !authModal.classList.contains('hidden') && authModal.contains(e.target) && !authModal.querySelector('div').contains(e.target)) {
            authModal.classList.add('hidden');
        }
    });

     elements.closeAuthModalBtn.addEventListener('click', () => elements.authModal.classList.add('hidden'));
}
