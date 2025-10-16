import DOM from './dom-elements.js';
import { state } from './state.js';
import { closeSaveModal, closeCadernoModal, closeNameModal, handleConfirmation, openSaveModal, openCadernoModal, openNameModal, openLoadModal, closeLoadModal, handleLoadModalEvents, updateSavedFiltersList, closeConfirmationModal, closeStatsModal, openAuthModal, closeAuthModal } from './ui/modal.js';
// CORREÇÃO: Importar saveSessionStats para salvar o progresso ao sair da página
import { createCaderno, createOrUpdateName, saveFilter, saveSessionStats } from './services/firestore.js';
// CORREÇÃO: Importar handleGoogleAuth para corrigir o login com Google
import { handleAuth, handleGoogleAuth } from './services/auth.js';
import { handleAddQuestionsToCaderno, handleCadernoItemClick, handleFolderItemClick, handleBackToFolders, cancelAddQuestions, removeQuestionFromCaderno, addFilteredQuestionsToCaderno } from './features/caderno.js';
import { handleAssuntoListClick, handleMateriaListClick, handleBackToMaterias } from './features/materias.js';
import { handleStartReview, handleSrsFeedback } from './features/srs.js';
import { navigateQuestion, handleOptionSelect, checkAnswer, handleDiscardOption } from './features/question-viewer.js';
import { applyFilters, clearAllFilters, removeFilter } from './features/filter.js';
import { navigateToView } from './ui/navigation.js';
import { updateSelectedFiltersDisplay } from './ui/ui-helpers.js';

// Handlers
const handleSaveFilter = async () => {
    const name = DOM.filterNameInput.value.trim();
    if (!name || !state.currentUser) return;

    const currentFilters = {
        name: name,
        materias: JSON.parse(DOM.materiaFilter.dataset.value || '[]'),
        assuntos: JSON.parse(DOM.assuntoFilter.dataset.value || '[]'),
        tipo: DOM.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos',
        search: DOM.searchInput.value
    };
    
    await saveFilter(currentFilters);

    DOM.filterNameInput.value = '';
    closeSaveModal();
};

const handleNameConfirm = async () => {
    const name = DOM.nameInput.value.trim();
    if (!name || !state.currentUser || !state.editingType) return;

    await createOrUpdateName(state.editingType, name, state.editingId);
    
    closeNameModal();
};

const handleCadernoConfirm = async () => {
    const name = DOM.cadernoNameInput.value.trim();
    if (!name || !state.currentUser) return;

    const folderId = DOM.folderSelect.value || null;
    let questionIds = [];
    if (state.createCadernoWithFilteredQuestions) {
        questionIds = state.filteredQuestions.map(q => q.id);
    }
    
    await createCaderno(name, questionIds, folderId);

    DOM.cadernoNameInput.value = '';
    closeCadernoModal();
};


export function setupAllEventListeners() {
    // Listener para o botão hamburger do menu mobile
    if (DOM.hamburgerBtn) {
        DOM.hamburgerBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o clique se propague para o listener do document
            const isExpanded = DOM.hamburgerBtn.getAttribute('aria-expanded') === 'true';
            DOM.hamburgerBtn.setAttribute('aria-expanded', !isExpanded);
            DOM.mobileMenu.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', async (event) => {
        const target = event.target;
        const targetId = target.id;
        
        // Esconde o menu mobile se o clique for fora dele
        if (!target.closest('#mobile-menu') && !target.closest('#hamburger-btn')) {
            if (DOM.mobileMenu && !DOM.mobileMenu.classList.contains('hidden')) {
                DOM.mobileMenu.classList.add('hidden');
                DOM.hamburgerBtn.setAttribute('aria-expanded', 'false');
            }
        }
        
        // Fecha os seletores customizados se o clique for fora deles
        if (!target.closest('.custom-select-container')) {
            document.querySelectorAll('.custom-select-panel').forEach(panel => {
                panel.classList.add('hidden');
            });
        }

        // --- Auth ---
        if (target.closest('#show-login-modal-btn') || target.closest('#login-from-empty')) {
            openAuthModal();
        } else if (targetId === 'login-btn') {
            await handleAuth('login');
        } else if (targetId === 'register-btn') {
            await handleAuth('register');
        } else if (targetId === 'google-login-btn') {
            await handleGoogleAuth();
        } else if (target.closest('#logout-btn') || target.closest('#logout-btn-mobile')) {
            await handleAuth('logout');
        }

        // --- Modals ---
        else if (target.closest('#close-auth-modal')) closeAuthModal();
        else if (target.closest('#save-filter-btn')) openSaveModal();
        else if (target.closest('#close-save-modal') || target.closest('#cancel-save-btn')) closeSaveModal();
        else if (target.closest('#confirm-save-btn')) await handleSaveFilter();
        
        else if (target.closest('#saved-filters-list-btn')) openLoadModal();
        else if (target.closest('#close-load-modal')) closeLoadModal();
        else if (target.closest('#saved-filters-list-container')) handleLoadModalEvents(event);

        else if (target.closest('#create-caderno-btn')) openCadernoModal(true);
        else if (target.closest('#add-caderno-to-folder-btn')) openCadernoModal(false, state.currentFolderId);
        else if (target.closest('#close-caderno-modal') || target.closest('#cancel-caderno-btn')) closeCadernoModal();
        else if (target.closest('#confirm-caderno-btn')) await handleCadernoConfirm();
        
        else if (target.closest('#create-folder-btn')) openNameModal('folder');
        else if (target.closest('#close-name-modal') || target.closest('#cancel-name-btn')) closeNameModal();
        else if (target.closest('#confirm-name-btn')) await handleNameConfirm();
        
        else if (target.closest('#cancel-confirmation-btn')) closeConfirmationModal();
        else if (target.closest('#confirm-delete-btn')) await handleConfirmation();
        
        else if (target.closest('#close-stats-modal')) closeStatsModal();

        // --- Questions ---
        else if (target.closest('#prev-question-btn')) await navigateQuestion('prev');
        else if (target.closest('#next-question-btn')) await navigateQuestion('next');
        else if (target.closest('.option-item') && !target.closest('.discard-btn')) handleOptionSelect(event);
        else if (target.closest('#submit-btn')) await checkAnswer();
        else if (target.closest('.discard-btn')) handleDiscardOption(event);
        else if (target.closest('.srs-feedback-btn')) await handleSrsFeedback(target.closest('.srs-feedback-btn').dataset.feedback);
        else if (target.closest('.remove-question-btn')) removeQuestionFromCaderno(target.closest('.remove-question-btn').dataset.questionId);

        // --- Cadernos / Folders ---
        else if (target.closest('#saved-cadernos-list-container')) {
            handleCadernoItemClick(event);
            handleFolderItemClick(event);
        }
        else if (target.closest('#back-to-folders-btn')) handleBackToFolders();
        else if (target.closest('#add-questions-to-caderno-btn')) handleAddQuestionsToCaderno();
        else if (target.closest('#cancel-add-questions-btn')) cancelAddQuestions();


        // --- Materias / Assuntos ---
        else if (target.closest('#materias-list-container')) handleMateriaListClick(event);
        else if (target.closest('#assuntos-list-container')) handleAssuntoListClick(event);
        else if (target.closest('#back-to-materias-btn')) handleBackToMaterias();
        
        // --- Revisão ---
        else if (target.closest('#start-selected-review-btn')) await handleStartReview();

        // --- Filters ---
        else if (target.closest('#filter-btn')) {
            if (state.isAddingQuestionsMode.active) {
                await addFilteredQuestionsToCaderno();
            } else {
                await applyFilters();
            }
        }
        else if (target.closest('#clear-filters-btn')) clearAllFilters();
        else if (target.closest('.remove-filter-btn')) {
            const btn = target.closest('.remove-filter-btn');
            removeFilter(btn.dataset.filterType, btn.dataset.filterValue);
        }
        else if (target.closest('.filter-btn-toggle')) {
            const group = target.closest('.filter-btn-group');
            if (group) {
                const currentActive = group.querySelector('.active-filter');
                if (currentActive) currentActive.classList.remove('active-filter');
                target.classList.add('active-filter');
                updateSelectedFiltersDisplay();
            }
        }
         else if (target.closest('#toggle-filters-btn')) {
            DOM.filterCard.classList.toggle('hidden');
            const isHidden = DOM.filterCard.classList.contains('hidden');
            const btn = target.closest('#toggle-filters-btn');
            btn.innerHTML = isHidden
                ? `<i class="fas fa-eye mr-2"></i> Mostrar Filtros`
                : `<i class="fas fa-eye-slash mr-2"></i> Ocultar Filtros`;
        }
        
        // --- Navigation ---
        else if (target.closest('.nav-link')) {
            event.preventDefault();
            navigateToView(target.closest('.nav-link').dataset.view);
        }
    });

    // Input/Change listeners
    if (DOM.searchSavedFiltersInput) {
        DOM.searchSavedFiltersInput.addEventListener('input', updateSavedFiltersList);
    }
    
    if (DOM.reviewTableContainer) {
        DOM.reviewTableContainer.addEventListener('change', (event) => {
            const target = event.target;
            
            const updateButtonState = () => {
                const anyChecked = DOM.reviewTableContainer.querySelector('.materia-review-checkbox:checked');
                DOM.startSelectedReviewBtn.disabled = !anyChecked;
            };

            if (target.matches('.materia-review-checkbox')) {
                if (!target.checked) {
                    const selectAllCheckbox = DOM.reviewTableContainer.querySelector('#select-all-review-materias');
                    if (selectAllCheckbox) selectAllCheckbox.checked = false;
                }
                updateButtonState();
            } else if (target.matches('#select-all-review-materias')) {
                const isChecked = target.checked;
                DOM.reviewTableContainer.querySelectorAll('.materia-review-checkbox:not(:disabled)').forEach(cb => {
                    cb.checked = isChecked;
                });
                updateButtonState();
            }
        });
    }

    // CORREÇÃO: Salva a sessão se o usuário fechar ou mudar de aba
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (state.currentUser && state.sessionStats.length > 0) {
                saveSessionStats();
            }
        }
    });
}
