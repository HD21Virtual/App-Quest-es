import { state } from './state.js';
import DOM from './dom-elements.js';
import { closeAuthModal, closeSaveModal, closeLoadModal, closeCadernoModal, closeNameModal, closeConfirmationModal, closeStatsModal, openAuthModal, openSaveModal, openLoadModal, openCadernoModal, openNameModal } from './ui/modal.js';
import { applyFilters, clearAllFilters, setupCustomSelect } from './features/filter.js';
import { handleAuth, handleGoogleLogin } from './services/auth.js';
import { saveFilter, deleteFilter, loadFilter, createCaderno, createOrUpdateName, deleteItem, resetAllUserData } from './services/firestore.js';
import { handleCadernoListClick, handleBackToFolders, handleAddQuestionsToCaderno, handleCancelAddQuestions, handleEstudarCadernoClick } from './features/caderno.js';
import { handleMateriaListClick, handleAssuntoListClick, handleBackToMaterias } from './features/materias.js';
import { startReviewSession, handleSrsFeedback } from './features/srs.js';

/**
 * @file js/event-listeners.js
 * @description Configura todos os event listeners da aplicação.
 */

function handleGlobalClicks(event) {
    // Fecha custom selects ao clicar fora
    document.querySelectorAll('.custom-select-container').forEach(container => {
        if (!container.contains(event.target)) {
            const panel = container.querySelector('.custom-select-panel');
            if(panel) panel.classList.add('hidden');
        }
    });

    // Fecha modais ao clicar no overlay
    if (DOM.loadModal && !DOM.loadModal.classList.contains('hidden') && !DOM.loadModal.querySelector('div').contains(event.target) && !DOM.savedFiltersListBtn.contains(event.target)) {
        closeLoadModal();
    }
    if (DOM.saveModal && !DOM.saveModal.classList.contains('hidden') && !DOM.saveModal.querySelector('div').contains(event.target) && !DOM.saveFilterBtn.contains(event.target)) {
        closeSaveModal();
    }
    if (DOM.authModal && !DOM.authModal.classList.contains('hidden') && DOM.authModal.contains(event.target) && !DOM.authModal.querySelector('div').contains(event.target)) {
        closeAuthModal();
    }
}

function handleNavigation(event) {
     const navLink = event.target.closest('.nav-link');
     if(navLink) {
        event.preventDefault();
        const viewId = navLink.dataset.view;
        navigateToView(viewId, event.isTrusted);
     }
}

function handleQuestionNavigation(event) {
    const prevBtn = event.target.closest('#prev-question-btn');
    const nextBtn = event.target.closest('#next-question-btn');
    if (prevBtn) navigateQuestion('prev');
    if (nextBtn) navigateQuestion('next');
}

function handleFilterActions(event) {
    const removeBtn = event.target.closest('.remove-filter-btn');
    if (!removeBtn) return;

    const type = removeBtn.dataset.filterType;
    const value = removeBtn.dataset.filterValue;

    switch (type) {
        case 'materia':
        case 'assunto':
            const filterContainer = document.getElementById(`${type}-filter`);
            const checkbox = filterContainer.querySelector(`.custom-select-option[data-value="${value}"]`);
            if (checkbox) {
                checkbox.checked = false;
                const optionsContainer = filterContainer.querySelector('.custom-select-options');
                if(optionsContainer) optionsContainer.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (state.isAddingQuestionsMode.active) { applyFilters(); }
            break;
        case 'tipo':
            const activeFilter = DOM.tipoFilterGroup.querySelector('.active-filter');
            if(activeFilter) activeFilter.classList.remove('active-filter');
            const todosFilter = DOM.tipoFilterGroup.querySelector(`[data-value="todos"]`);
            if(todosFilter) todosFilter.classList.add('active-filter');
            if (state.isAddingQuestionsMode.active) { applyFilters(); }
            break;
        case 'search':
            DOM.searchInput.value = '';
            if (state.isAddingQuestionsMode.active) { applyFilters(); }
            break;
    }
}


export function setupAllEventListeners() {
    // Listeners Globais
    document.addEventListener('click', handleGlobalClicks);
    document.addEventListener('click', handleNavigation);
    document.addEventListener('click', handleQuestionNavigation);

    // Filtros
    DOM.filterBtn.addEventListener('click', applyFilters);
    DOM.clearFiltersBtn.addEventListener('click', clearAllFilters);
    DOM.selectedFiltersContainer.addEventListener('click', handleFilterActions);
    DOM.searchInput.addEventListener('input', () => {
        if (state.isAddingQuestionsMode.active) {
            applyFilters();
        }
    });
    DOM.tipoFilterGroup.addEventListener('click', (event) => {
        if (event.target.classList.contains('filter-btn-toggle')) {
            DOM.tipoFilterGroup.querySelectorAll('.filter-btn-toggle').forEach(btn => btn.classList.remove('active-filter'));
            event.target.classList.add('active-filter');
        }
    });

    // Modais
    DOM.closeAuthModalBtn.addEventListener('click', closeAuthModal);
    DOM.closeSaveModalBtn.addEventListener('click', closeSaveModal);
    DOM.cancelSaveBtn.addEventListener('click', closeSaveModal);
    DOM.closeLoadModalBtn.addEventListener('click', closeLoadModal);
    DOM.closeCadernoModalBtn.addEventListener('click', closeCadernoModal);
    DOM.cancelCadernoBtn.addEventListener('click', closeCadernoModal);
    DOM.closeNameModalBtn.addEventListener('click', closeNameModal);
    DOM.cancelNameBtn.addEventListener('click', closeNameModal);
    DOM.cancelConfirmationBtn.addEventListener('click', closeConfirmationModal);
    DOM.closeStatsModalBtn.addEventListener('click', closeStatsModal);

    // Ações de Modais
    DOM.saveFilterBtn.addEventListener('click', openSaveModal);
    DOM.savedFiltersListBtn.addEventListener('click', openLoadModal);
    DOM.createCadernoBtn.addEventListener('click', () => openCadernoModal(true));
    DOM.createFolderBtn.addEventListener('click', () => openNameModal('folder'));
    DOM.addCadernoToFolderBtn.addEventListener('click', () => openCadernoModal(false));
    
    // Auth
    DOM.loginBtn.addEventListener('click', () => handleAuth('login'));
    DOM.registerBtn.addEventListener('click', () => handleAuth('register'));
    DOM.googleLoginBtn.addEventListener('click', handleGoogleLogin);
    
    // Salvar/Carregar/Deletar (Firestore)
    DOM.confirmSaveBtn.addEventListener('click', saveFilter);
    DOM.savedFiltersListContainer.addEventListener('click', (e) => {
        if (e.target.closest('.load-filter-btn')) loadFilter(e.target.closest('.load-filter-btn').dataset.id);
        if (e.target.closest('.delete-filter-btn')) deleteFilter(e.target.closest('.delete-filter-btn').dataset.id);
    });
    DOM.confirmCadernoBtn.addEventListener('click', createCaderno);
    DOM.confirmNameBtn.addEventListener('click', createOrUpdateName);
    DOM.confirmDeleteBtn.addEventListener('click', deleteItem);
    DOM.resetAllProgressBtn.addEventListener('click', resetAllUserData);
    
    // Navegação e Ações de Views
    DOM.hamburgerBtn.addEventListener('click', () => DOM.mobileMenu.classList.toggle('hidden'));
    DOM.toggleFiltersBtn.addEventListener('click', () => {
        DOM.filterCard.classList.toggle('hidden');
        DOM.toggleFiltersBtn.innerHTML = DOM.filterCard.classList.contains('hidden') 
            ? `<i class="fas fa-eye mr-2"></i> Mostrar Filtros` 
            : `<i class="fas fa-eye-slash mr-2"></i> Ocultar Filtros`;
    });
    DOM.savedCadernosListContainer.addEventListener('click', handleCadernoListClick);
    DOM.backToFoldersBtn.addEventListener('click', handleBackToFolders);
    DOM.addQuestionsToCadernoBtn.addEventListener('click', handleAddQuestionsToCaderno);
    DOM.cancelAddQuestionsBtn.addEventListener('click', handleCancelAddQuestions);
    DOM.materiasListContainer.addEventListener('click', handleMateriaListClick);
    DOM.assuntosListContainer.addEventListener('click', handleAssuntoListClick);
    DOM.backToMateriasBtn.addEventListener('click', handleBackToMaterias);
    DOM.startReviewBtn.addEventListener('click', startReviewSession);

    // Abas e Conteúdo Dinâmico
    DOM.tabsContainer.addEventListener('click', (e) => switchTab(e.target, DOM.vadeMecumContentArea));
    document.addEventListener('click', (e) => { // Delegação para abas de caderno
        const tabsContainerCaderno = e.target.closest('#tabs-container');
        if (tabsContainerCaderno && DOM.savedCadernosListContainer.contains(tabsContainerCaderno)) {
            switchTab(e.target, DOM.savedCadernosListContainer);
        }
    });
    document.addEventListener('click', (e) => { // Delegação para SRS
        const srsBtn = e.target.closest('.srs-feedback-btn');
        if(srsBtn) handleSrsFeedback(srsBtn.dataset.feedback);
    });
}

