import {
    showSaveFilterModal, showLoadFilterModal,
    showCadernoModal, showNameModal, handleConfirmation, 
    showConfirmationModal, showAuthModal, closeAuthModal
} from './ui/modal.js';
import { handleAuth, handleGoogleAuth } from './services/auth.js';
import { saveFilter, deleteFilter, createCaderno, createOrUpdateName, deleteItem } from './services/firestore.js';
import { handleCadernoItemClick, handleFolderItemClick, handleBackToFolders, handleAddQuestionsToCaderno } from './features/caderno.js';
import { handleMateriaClick, handleAssuntoListClick, handleBackToMaterias } from './features/materias.js';
import { handleStartReview } from './features/srs.js';
import { navigateQuestion, handleOptionSelect, checkAnswer } from './features/question-viewer.js';

export function setupAllEventListeners() {
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        const action = target.dataset.action;

        // --- Auth ---
        if (action === 'login') handleAuth('login');
        if (action === 'register') handleAuth('register');
        if (action === 'google-login') handleGoogleAuth();
        if (action === 'logout') handleAuth('logout');
        if (action === 'show-auth-modal') showAuthModal();
        if (action === 'close-auth-modal') closeAuthModal();
        
        // --- Modals ---
        if (action === 'show-save-filter') showSaveFilterModal();
        if (action === 'show-load-filter') showLoadFilterModal();
        if (action === 'show-create-caderno') showCadernoModal('create-from-filter');
        if (action === 'show-add-caderno-to-folder') showCadernoModal('add-to-folder');
        if (action === 'show-create-folder') showNameModal('create-folder');
        if (action === 'confirm-delete') handleConfirmation(true);
        if (action === 'cancel-delete') handleConfirmation(false);

        // --- Cadernos ---
        if (target.closest('.folder-item') && target.closest('[data-action="open-folder"]')) handleFolderItemClick(target.closest('.folder-item').dataset.folderId);
        if (target.closest('.caderno-item') && target.closest('[data-action="open-caderno"]')) handleCadernoItemClick(target.closest('.caderno-item').dataset.cadernoId);
        if (action === 'back-to-folders') handleBackToFolders();
        if (action === 'add-questions-to-caderno') handleAddQuestionsToCaderno();
        if (target.closest('.edit-folder-btn')) showNameModal('edit-folder', target.closest('.edit-folder-btn').dataset);
        if (target.closest('.edit-caderno-btn')) showNameModal('edit-caderno', target.closest('.edit-caderno-btn').dataset);
        if (target.closest('.delete-folder-btn')) showConfirmationModal('folder', target.closest('.delete-folder-btn').dataset.id);
        if (target.closest('.delete-caderno-btn')) showConfirmationModal('caderno', target.closest('.delete-caderno-btn').dataset.id);

        // --- Matérias ---
        if (target.closest('.materia-item')) handleMateriaClick(target.closest('.materia-item').dataset.materiaName);
        if (target.closest('.assunto-item')) handleAssuntoListClick(target.closest('.assunto-item').dataset.assuntoName);
        if (action === 'back-to-materias') handleBackToMaterias();
        
        // --- Questions ---
        if (action === 'prev-question') navigateQuestion(-1);
        if (action === 'next-question') navigateQuestion(1);
        if (target.closest('.option-item')) handleOptionSelect(target.closest('.option-item').dataset.option);
        if (action === 'submit-answer') checkAnswer();
        if (target.closest('.remove-question-btn')) removeQuestionFromCaderno(target.closest('.remove-question-btn').dataset.questionId);

        // --- Review ---
        if (action === 'start-review') handleStartReview();
    });

    // Non-delegated listeners
    const resetBtn = document.getElementById('reset-all-progress-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => showConfirmationModal('all-progress'));
    }
}

