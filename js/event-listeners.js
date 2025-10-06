import DOM from './dom-elements.js';
import { navigateToView } from './ui/navigation.js';
import { openAuthModal, openSaveModal, openLoadModal, openCadernoModal, openNameModal, closeConfirmationModal, handleConfirmation } from './ui/modal.js';
import { state } from './state.js';
import { handleEmailLogin, handleEmailRegister, handleGoogleLogin, handleSignOut } from './services/auth.js';
import { saveFilter, deleteFilter, createCaderno, createOrUpdateName, resetAllUserData } from './services/firestore.js';
import { applyFilters, clearAllFilters } from './features/filter.js';
import { handleCadernoItemClick, handleFolderItemClick, handleBackToFolders, handleAddQuestionsToCaderno } from './features/caderno.js';
import { handleMateriaListClick, handleAssuntoListClick, handleBackToMaterias } from './features/materias.js';
import { handleStartReview } from './features/srs.js';
import { navigateQuestion } from './features/question-viewer.js';

function setupCustomSelect(container) {
    const button = container.querySelector('.custom-select-button');
    const panel = container.querySelector('.custom-select-panel');
    button.addEventListener('click', () => {
        if (!button.disabled) {
            panel.classList.toggle('hidden');
        }
    });
}

export function setupAllEventListeners() {
    // Event delegation for dynamically created elements and general clicks
    document.addEventListener('click', (event) => {
        const target = event.target;

        // Auth buttons
        if (target.closest('#show-login-modal-btn') || target.closest('#show-login-modal-btn-mobile') || target.closest('#login-from-empty')) openAuthModal();
        if (target.closest('#login-btn')) handleEmailLogin();
        if (target.closest('#register-btn')) handleEmailRegister();
        if (target.closest('#google-login-btn')) handleGoogleLogin();
        if (target.closest('#logout-btn') || target.closest('#logout-btn-mobile')) handleSignOut();

        // Navigation
        const navLink = target.closest('.nav-link');
        if (navLink) navigateToView(navLink.dataset.view);

        // Modals
        if (target.closest('#save-filter-btn')) openSaveModal();
        if (target.closest('#saved-filters-list-btn')) openLoadModal();
        if (target.closest('#create-caderno-btn') || target.closest('#add-caderno-to-folder-btn')) openCadernoModal(target.closest('#add-caderno-to-folder-btn'));
        if (target.closest('#create-folder-btn')) openNameModal('folder');
        if (target.closest('#cancel-confirmation-btn')) closeConfirmationModal();
        if (target.closest('#confirm-delete-btn')) handleConfirmation();

        // Filters
        if (target.closest('#filter-btn')) applyFilters(true);
        if (target.closest('#clear-filters-btn')) clearAllFilters();

        // Cadernos/Folders
        const folderItem = target.closest('.folder-item[data-action="open"]');
        if (folderItem) handleFolderItemClick(folderItem.dataset.folderId);

        const cadernoItem = target.closest('.caderno-item[data-action="open"]');
        if (cadernoItem) handleCadernoItemClick(cadernoItem.dataset.cadernoId);
        
        if (target.closest('#back-to-folders-btn')) handleBackToFolders();
        if (target.closest('#add-questions-to-caderno-btn')) handleAddQuestionsToCaderno();

        // Matérias/Assuntos
        if (target.closest('.materia-item')) handleMateriaListClick(target.closest('.materia-item').dataset.materiaName);
        if (target.closest('.assunto-item')) handleAssuntoListClick(target.closest('.assunto-item').dataset.assuntoName);
        if (target.closest('#back-to-materias-btn')) handleBackToMaterias();

        // SRS
        if (target.closest('#start-review-btn')) handleStartReview();

        // Question Navigation
        if (target.closest('#prev-question-btn')) navigateQuestion('prev');
        if (target.closest('#next-question-btn')) navigateQuestion('next');
        
        // Reset Progress
        if (target.closest('#reset-all-progress-btn')) {
            state.deletingType = 'all-progress';
            DOM.confirmationModalTitle.textContent = `Resetar Todo o Progresso`;
            DOM.confirmationModalText.innerHTML = `Tem certeza que deseja apagar **TODO** o seu histórico de resoluções e revisões? <br><br> <span class="font-bold text-red-600">Esta ação é irreversível e apagará todas as suas estatísticas.</span>`;
            DOM.confirmationModal.classList.remove('hidden');
        }
    });

    // Specific event listeners that don't fit delegation well
    DOM.hamburgerBtn.addEventListener('click', () => DOM.mobileMenu.classList.toggle('hidden'));
    
    DOM.toggleFiltersBtn.addEventListener('click', () => {
        DOM.filterCard.classList.toggle('hidden');
        DOM.toggleFiltersBtn.innerHTML = DOM.filterCard.classList.contains('hidden') 
            ? `<i class="fas fa-eye mr-2"></i> Mostrar Filtros` 
            : `<i class="fas fa-eye-slash mr-2"></i> Ocultar Filtros`;
    });

    DOM.tipoFilterGroup.addEventListener('click', (event) => {
        if (event.target.classList.contains('filter-btn-toggle')) {
            DOM.tipoFilterGroup.querySelectorAll('.filter-btn-toggle').forEach(btn => btn.classList.remove('active-filter'));
            event.target.classList.add('active-filter');
        }
    });

    DOM.customSelects.forEach(setupCustomSelect);
}

