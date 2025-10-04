import { signOutUser } from '../services/auth.js';
import { getState, setState } from '../services/state.js';
import { applyFilters, clearAllFilters } from './filters.js';
import { renderFoldersAndCadernos, exitAddMode as exitAddModeCadernos } from './cadernos.js';
import { renderMateriasView, setSelectedMateria } from './materias.js';

// Mapeamento centralizado de todos os elementos do DOM para fácil acesso
export const elements = {
    // Views principais
    inicioView: document.getElementById('inicio-view'),
    vadeMecumView: document.getElementById('vade-mecum-view'),
    cadernosView: document.getElementById('cadernos-view'),
    materiasView: document.getElementById('materias-view'),
    revisaoView: document.getElementById('revisao-view'),
    estatisticasView: document.getElementById('estatisticas-view'),
    
    // Navegação
    navLinks: document.querySelectorAll('.nav-link'),
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
    vadeMecumTitle: document.getElementById('vade-mecum-title'),
    selectedFiltersContainer: document.getElementById('selected-filters-container'),

    // Cadernos
    savedCadernosListContainer: document.getElementById('saved-cadernos-list-container'),
};

/**
 * Atualiza a interface do usuário (canto superior direito) para refletir o estado de login.
 * @param {object|null} user - O objeto de usuário do Firebase ou null se deslogado.
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

        const showLoginModal = () => elements.authModal.classList.remove('hidden');
        document.getElementById('show-login-modal-btn').addEventListener('click', showLoginModal);
        mobileContainer.querySelector('#show-login-modal-btn').addEventListener('click', showLoginModal);
    }
}


/**
 * Controla a navegação entre as diferentes "páginas" da aplicação.
 * @param {string} viewId - O ID do elemento da view a ser exibida.
 */
export function navigateToView(viewId) {
    const { isAddingQuestionsMode, isReviewSession } = getState();

    // Se o usuário clicar para sair da view de questões enquanto estiver no modo de adição, cancela o modo.
    if (isAddingQuestionsMode.active && viewId !== 'vade-mecum-view') {
        exitAddModeCadernos();
    }
    
    // Esconde todas as views
    Object.values(elements).forEach(element => {
        if (element && element.id && element.id.endsWith('-view')) {
            element.classList.add('hidden');
        }
    });

    // Mostra a view solicitada
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    // Atualiza o estado visual dos links de navegação
    elements.navLinks.forEach(navLink => {
        navLink.classList.toggle('text-blue-700', navLink.dataset.view === viewId);
        navLink.classList.toggle('bg-blue-100', navLink.dataset.view === viewId);
        navLink.classList.toggle('text-gray-500', navLink.dataset.view !== viewId);
    });

    // Lógica específica para cada view ao ser carregada
    switch (viewId) {
        case 'vade-mecum-view':
            if (isAddingQuestionsMode.active) {
                applyFilters();
            } else if (!isReviewSession) {
                // Se não for uma sessão de revisão, reseta tudo para o padrão
                setState({ isReviewSession: false });
                elements.vadeMecumTitle.textContent = "Vade Mecum de Questões";
                elements.toggleFiltersBtn.classList.remove('hidden');
                elements.filterCard.classList.remove('hidden');
                clearAllFilters();
            }
            break;
        case 'cadernos-view':
             if (!getState().isNavigatingBackFromAddMode) {
                setState({ currentFolderId: null, currentCadernoId: null });
            }
            setState({ isNavigatingBackFromAddMode: false });
            renderFoldersAndCadernos();
            break;
        case 'materias-view':
            setSelectedMateria(null);
            renderMateriasView();
            break;
    }

    // Esconde o menu mobile após a navegação
    elements.mobileMenu.classList.add('hidden');
}


/**
 * Configura os listeners de eventos que controlam a navegação principal da aplicação.
 */
export function initializeAppListeners() {
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            navigateToView(link.dataset.view);
        });
    });
}

/**
 * Configura listeners de eventos globais (fechar modais, etc.).
 */
export function setupGlobalEventListeners() {
    elements.hamburgerBtn.addEventListener('click', () => {
        elements.mobileMenu.classList.toggle('hidden');
    });

    elements.closeAuthModalBtn.addEventListener('click', () => {
        elements.authModal.classList.add('hidden');
    });

    // Adicione outros listeners globais aqui conforme necessário
}

