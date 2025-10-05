import DOM from './dom-elements.js';
import { handleAuth, handleGoogleLogin } from './services/auth.js';
import { closeModal, openModal, handleConfirmation, closeConfirmationModal } from './ui/modal.js';
import { handleNavigation, handleHamburgerMenu } from './ui/navigation.js';
import { handleFilterActions, handleSelectedFilterRemoval, handleFilterSearch, handleToggleButtonGroups } from './features/filter.js';
import { handleCadernoViewClick, handleBackToFolders, handleAddQuestionsToCaderno, handleCancelAddQuestions } from './features/caderno.js';
import { handleMateriasViewClick, handleAssuntosViewClick, handleBackToMaterias } from './features/materias.js';
import { startReviewSession } from './features/srs.js';
import { handleQuestionNav, handleVadeMecumTabs } from './features/question-viewer.js';
import { state } from './state.js';

/**
 * @file js/event-listeners.js
 * @description Configura todos os event listeners da aplicação.
 * Centralizar os listeners aqui melhora a organização e facilita o rastreamento
 * de interações do usuário.
 */

export function setupAllEventListeners() {
    // Auth Modal
    DOM.authModal.addEventListener('click', (e) => {
        if (e.target === DOM.authModal || e.target.closest('#close-auth-modal')) closeModal('auth');
    });
    DOM.userAccountContainer.addEventListener('click', (e) => {
        if (e.target.closest('#show-login-modal-btn')) openModal('auth');
    });
    DOM.userAccountContainerMobile.addEventListener('click', (e) => {
        if (e.target.closest('#show-login-modal-btn')) openModal('auth');
    });
    document.getElementById('login-btn').addEventListener('click', () => handleAuth('login'));
    document.getElementById('register-btn').addEventListener('click', () => handleAuth('register'));
    document.getElementById('google-login-btn').addEventListener('click', handleGoogleLogin);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', handleNavigation));
    DOM.hamburgerBtn.addEventListener('click', handleHamburgerMenu);
    
    // Filtros
    DOM.toggleFiltersBtn.addEventListener('click', () => DOM.filterCard.classList.toggle('hidden'));
    DOM.filterBtn.addEventListener('click', handleFilterActions);
    DOM.clearFiltersBtn.addEventListener('click', handleFilterActions);
    DOM.saveFilterBtn.addEventListener('click', () => openModal('save'));
    DOM.createCadernoBtn.addEventListener('click', () => openModal('caderno', { fromFilters: true }));
    DOM.savedFiltersListBtn.addEventListener('click', () => openModal('load'));
    DOM.selectedFiltersContainer.addEventListener('click', handleSelectedFilterRemoval);
    DOM.searchInput.addEventListener('input', handleFilterSearch);
    handleToggleButtonGroups();

    // Vade Mecum (Questões)
    document.addEventListener('click', handleQuestionNav);
    DOM.tabsContainer.addEventListener('click', handleVadeMecumTabs);

    // Cadernos
    DOM.savedCadernosListContainer.addEventListener('click', handleCadernoViewClick);
    DOM.backToFoldersBtn.addEventListener('click', handleBackToFolders);
    DOM.createFolderBtn.addEventListener('click', () => openModal('name', { type: 'folder' }));
    DOM.addCadernoToFolderBtn.addEventListener('click', () => openModal('caderno', { folderId: state.currentFolderId }));
    DOM.addQuestionsToCadernoBtn.addEventListener('click', handleAddQuestionsToCaderno);
    DOM.cancelAddQuestionsBtn.addEventListener('click', handleCancelAddQuestions);
    
    // Matérias
    DOM.materiasListContainer.addEventListener('click', handleMateriasViewClick);
    DOM.assuntosListContainer.addEventListener('click', handleAssuntosViewClick);
    DOM.backToMateriasBtn.addEventListener('click', handleBackToMaterias);

    // Revisão
    DOM.startReviewBtn.addEventListener('click', startReviewSession);

    // Modals
    setupModalCloseListeners();
    document.getElementById('confirm-save-btn').addEventListener('click', () => handleConfirmation('save-filter'));
    document.getElementById('confirm-caderno-btn').addEventListener('click', () => handleConfirmation('create-caderno'));
    document.getElementById('confirm-name-btn').addEventListener('click', () => handleConfirmation('save-name'));
    document.getElementById('confirm-delete-btn').addEventListener('click', () => handleConfirmation('delete'));
    document.getElementById('cancel-confirmation-btn').addEventListener('click', closeConfirmationModal);
    
    DOM.resetAllProgressBtn.addEventListener('click', () => {
        openModal('confirmation', { 
            type: 'all-progress',
            title: 'Resetar Todo o Progresso',
            text: `Tem certeza que deseja apagar **TODO** o seu histórico de resoluções e revisões? <br><br> <span class="font-bold text-red-600">Esta ação é irreversível e apagará todas as suas estatísticas.</span>`
        });
    });
}

// Helper para configurar o fechamento dos modais
function setupModalCloseListeners() {
    document.getElementById('close-save-modal').addEventListener('click', () => closeModal('save'));
    document.getElementById('cancel-save-btn').addEventListener('click', () => closeModal('save'));
    document.getElementById('close-load-modal').addEventListener('click', () => closeModal('load'));
    document.getElementById('close-caderno-modal').addEventListener('click', () => closeModal('caderno'));
    document.getElementById('cancel-caderno-btn').addEventListener('click', () => closeModal('caderno'));
    document.getElementById('close-name-modal').addEventListener('click', () => closeModal('name'));
    document.getElementById('cancel-name-btn').addEventListener('click', () => closeModal('name'));
    document.getElementById('close-stats-modal').addEventListener('click', () => closeModal('stats'));
}
