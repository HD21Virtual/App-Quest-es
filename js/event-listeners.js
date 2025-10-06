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
 * @description Configura todos os event listeners da aplicação usando delegação de eventos.
 */

export function setupAllEventListeners() {
    // Listeners que não são de clique podem ser configurados diretamente
    DOM.searchInput.addEventListener('input', handleFilterSearch);
    handleToggleButtonGroups();

    // Listener de clique delegado principal para toda a aplicação
    document.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.id;

        // Ações de modais
        if (target.closest('#close-auth-modal') || target === DOM.authModal) closeModal('auth');
        if (target.closest('#close-save-modal') || target.closest('#cancel-save-btn')) closeModal('save');
        if (target.closest('#close-load-modal')) closeModal('load');
        if (target.closest('#close-caderno-modal') || target.closest('#cancel-caderno-btn')) closeModal('caderno');
        if (target.closest('#close-name-modal') || target.closest('#cancel-name-btn')) closeModal('name');
        if (target.closest('#close-stats-modal')) closeModal('stats');
        if (target.closest('#cancel-confirmation-btn')) closeConfirmationModal();

        // Ações de confirmação de modais
        if (id === 'confirm-save-btn') handleConfirmation('save-filter');
        if (id === 'confirm-caderno-btn') handleConfirmation('create-caderno');
        if (id === 'confirm-name-btn') handleConfirmation('save-name');
        if (id === 'confirm-delete-btn') handleConfirmation('delete');

        // Autenticação
        if (target.closest('#show-login-modal-btn')) openModal('auth');
        if (id === 'login-btn') handleAuth('login');
        if (id === 'register-btn') handleAuth('register');
        if (id === 'google-login-btn') handleGoogleLogin();

        // Navegação principal
        const navLink = target.closest('.nav-link');
        if (navLink) handleNavigation(e);
        if (target.closest('#hamburger-btn')) handleHamburgerMenu();

        // Filtros
        if (target.closest('#toggle-filters-btn')) DOM.filterCard.classList.toggle('hidden');
        if (id === 'filter-btn' || id === 'clear-filters-btn') handleFilterActions(e);
        if (target.closest('#save-filter-btn')) openModal('save');
        if (target.closest('#create-caderno-btn')) openModal('caderno', { fromFilters: true });
        if (target.closest('#saved-filters-list-btn')) openModal('load');
        if (target.closest('.remove-filter-btn')) handleSelectedFilterRemoval(e);

        // Vade Mecum (Navegação de Questões e Abas)
        if (target.closest('#prev-question-btn') || target.closest('#next-question-btn')) handleQuestionNav(e);
        const tabButton = target.closest('.tab-button');
        if(tabButton && target.closest('#tabs-container')) handleVadeMecumTabs(e);

        // Cadernos
        if (target.closest('#saved-cadernos-list-container')) handleCadernoViewClick(e);
        if (id === 'back-to-folders-btn') handleBackToFolders();
        if (target.closest('#create-folder-btn')) openModal('name', { type: 'folder' });
        if (target.closest('#add-caderno-to-folder-btn')) openModal('caderno', { folderId: state.currentFolderId });
        if (id === 'add-questions-to-caderno-btn') handleAddQuestionsToCaderno();
        if (id === 'cancel-add-questions-btn') handleCancelAddQuestions();
        
        // Matérias
        if (target.closest('#materias-list-container')) handleMateriasViewClick(e);
        if (target.closest('#assuntos-list-container')) handleAssuntosViewClick(e);
        if (id === 'back-to-materias-btn') handleBackToMaterias();

        // Revisão
        if (id === 'start-review-btn') startReviewSession();

        // Estatísticas
        if (id === 'reset-all-progress-btn') {
            openModal('confirmation', {
                type: 'all-progress',
                title: 'Resetar Todo o Progresso',
                text: `Tem certeza que deseja apagar **TODO** o seu histórico de resoluções e revisões? <br><br> <span class="font-bold text-red-600">Esta ação é irreversível e apagará todas as suas estatísticas.</span>`
            });
        }
    });
}

