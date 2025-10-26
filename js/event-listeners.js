import DOM from './dom-elements.js';
import { state } from './state.js';
import { closeSaveModal, closeCadernoModal, closeNameModal, handleConfirmation, openSaveModal, openCadernoModal, openNameModal, openLoadModal, closeLoadModal, handleLoadModalEvents, updateSavedFiltersList, closeConfirmationModal, closeStatsModal, openAuthModal, closeAuthModal } from './ui/modal.js';
// CORREÇÃO: Importar saveSessionStats para salvar o progresso ao sair da página
// --- MODIFICAÇÃO: Importar resetAllUserData ---
import { createCaderno, createOrUpdateName, saveFilter, saveSessionStats, resetAllUserData } from './services/firestore.js';
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

// --- NOVA FUNÇÃO ---
// Lida com a seleção de checkboxes na tabela de estatísticas
function handleStatsTableSelection(event) {
    const target = event.target;
    if (!target.matches('input[type="checkbox"]')) return;

    const tableContainer = DOM.statsDesempenhoMateriaContainer;
    if (!tableContainer) return;

    const allCheckboxes = tableContainer.querySelectorAll('.row-checkbox');
    const selectAllCheckbox = tableContainer.querySelector('#select-all-stats-checkbox');

    // Lógica de Selecionar/Desselecionar Todos
    if (target.id === 'select-all-stats-checkbox') {
        const isChecked = target.checked;
        allCheckboxes.forEach(cb => {
            cb.checked = isChecked;
            cb.closest('tr').classList.toggle('selected-row', isChecked);
            cb.indeterminate = false;
        });
    } else if (target.classList.contains('row-checkbox')) {
        const row = target.closest('tr');
        const rowId = row.dataset.id;
        const isChecked = target.checked;
        row.classList.toggle('selected-row', isChecked);

        // Lógica de hierarquia (selecionar/desselecionar filhos)
        const childRows = tableContainer.querySelectorAll(`tr[data-parent-id="${rowId}"]`);
        childRows.forEach(child => {
            const childCheckbox = child.querySelector('.row-checkbox');
            childCheckbox.checked = isChecked;
            child.classList.toggle('selected-row', isChecked);
            childCheckbox.indeterminate = false; // Garante que filhos não fiquem indeterminados

            // Lógica para netos (nível 3)
            const grandChildRows = tableContainer.querySelectorAll(`tr[data-parent-id="${child.dataset.id}"]`);
            grandChildRows.forEach(gc => {
                const gcCheckbox = gc.querySelector('.row-checkbox');
                gcCheckbox.checked = isChecked;
                gc.classList.toggle('selected-row', isChecked);
            });
        });

        // Lógica de estado dos pais (indeterminate)
        let parentId = row.dataset.parentId;
        while (parentId) {
            const parentRow = tableContainer.querySelector(`tr[data-id="${parentId}"]`);
            if (!parentRow) break;
            const parentCheckbox = parentRow.querySelector('.row-checkbox');
            const siblingRows = tableContainer.querySelectorAll(`tr[data-parent-id="${parentId}"]`);
            const siblingCheckboxes = Array.from(siblingRows).map(r => r.querySelector('.row-checkbox'));
            
            const checkedSiblings = siblingCheckboxes.filter(cb => cb.checked).length;
            const indeterminateSiblings = siblingCheckboxes.filter(cb => cb.indeterminate).length;

            if (checkedSiblings === 0 && indeterminateSiblings === 0) {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = false;
            } else if (checkedSiblings === siblingCheckboxes.length) {
                parentCheckbox.checked = true;
                parentCheckbox.indeterminate = false;
            } else {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = true;
            }
            // Adiciona/remove a classe de seleção no pai com base no estado
            parentRow.classList.toggle('selected-row', parentCheckbox.checked || parentCheckbox.indeterminate);
            
            parentId = parentRow.dataset.parentId; // Sobe na hierarquia
        }

        // Atualiza o "Selecionar Todos"
        const allChecked = tableContainer.querySelectorAll('.row-checkbox:checked').length;
        const allIndeterminate = tableContainer.querySelectorAll('.row-checkbox:indeterminate').length;
        if (allChecked === 0 && allIndeterminate === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (allChecked === allCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    // Calcular Totais
    let totalResolvidas = 0;
    let totalAcertos = 0;
    let totalErros = 0;

    const selectedRows = tableContainer.querySelectorAll('tr.selected-row');
    selectedRows.forEach(row => {
        // Só soma se a linha não for pai de outras linhas selecionadas
        // (para evitar contagem dupla)
        const rowId = row.dataset.id;
        const isParentOfSelected = tableContainer.querySelector(`tr.selected-row[data-parent-id="${rowId}"]`);
        
        if (!isParentOfSelected) {
            totalResolvidas += parseInt(row.dataset.total || 0, 10);
            totalAcertos += parseInt(row.dataset.correct || 0, 10);
            totalErros += parseInt(row.dataset.incorrect || 0, 10);
        }
    });

    // Atualizar rodapé
    if (DOM.statsFooterResolvidas) DOM.statsFooterResolvidas.textContent = totalResolvidas;
    if (DOM.statsFooterAcertos) DOM.statsFooterAcertos.textContent = totalAcertos;
    if (DOM.statsFooterErros) DOM.statsFooterErros.textContent = totalErros;
}

// --- MODIFICAÇÃO: Nova função para seleção da tabela de revisão ---
/**
 * Lida com a seleção de checkboxes (hierárquica) na tabela de revisão.
 * @param {HTMLInputElement} checkbox - O checkbox que foi clicado.
 */
function handleReviewTableSelection(checkbox) {
    const row = checkbox.closest('tr');
    const rowId = row.dataset.id;
    const isChecked = checkbox.checked;

    // 1. Atualiza todos os filhos (recursivamente)
    const updateChildren = (parentId, checked) => {
        const children = document.querySelectorAll(`tr[data-parent-id="${parentId}"]`);
        children.forEach(child => {
            const cb = child.querySelector('.review-checkbox:not(:disabled)');
            if (cb) {
                cb.checked = checked;
                cb.indeterminate = false;
            }
            updateChildren(child.dataset.id, checked); // Chama recursivamente
        });
    };
    updateChildren(rowId, isChecked);


    // 2. Atualiza todos os pais (iterativamente)
    let parentId = row.dataset.parentId;
    while (parentId) {
        const parentRow = document.querySelector(`tr[data-id="${parentId}"]`);
        if (!parentRow) break;
        
        const parentCheckbox = parentRow.querySelector('.review-checkbox');
        if (!parentCheckbox) break;

        const siblingCheckboxes = Array.from(document.querySelectorAll(`tr[data-parent-id="${parentId}"] .review-checkbox:not(:disabled)`));
        
        if (siblingCheckboxes.length > 0) {
            const checkedSiblings = siblingCheckboxes.filter(cb => cb.checked).length;
            const indeterminateSiblings = siblingCheckboxes.filter(cb => cb.indeterminate).length;

            if (checkedSiblings === 0 && indeterminateSiblings === 0) {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = false;
            } else if (checkedSiblings === siblingCheckboxes.length) {
                parentCheckbox.checked = true;
                parentCheckbox.indeterminate = false;
            } else {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = true;
            }
        }
        parentId = parentRow.dataset.parentId;
    }

    // 3. Atualiza o "Selecionar Todos" (#select-all-review-materias)
    const selectAllCheckbox = DOM.reviewTableContainer.querySelector('#select-all-review-materias');
    const allTopLevelCheckboxes = Array.from(document.querySelectorAll(`tr[data-level="1"] .review-checkbox:not(:disabled)`));
    
    if (allTopLevelCheckboxes.length > 0) {
        const checkedTopLevel = allTopLevelCheckboxes.filter(cb => cb.checked).length;
        const indeterminateTopLevel = allTopLevelCheckboxes.filter(cb => cb.indeterminate).length;

        if (checkedTopLevel === 0 && indeterminateTopLevel === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedTopLevel === allTopLevelCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}
// --- FIM DA MODIFICAÇÃO ---


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
        // --- MODIFICAÇÃO: Listener para expandir/recolher na tabela de revisão ---
        else if (target.closest('.toggle-review-row')) {
            const row = target.closest('tr');
            const rowId = row.dataset.id;
            const isExpanded = target.classList.toggle('rotate-90');
            
            document.querySelectorAll(`tr[data-parent-id="${rowId}"]`).forEach(childRow => {
                childRow.classList.toggle('hidden', !isExpanded);
                
                // Se estamos recolhendo (isExpanded = false), recolhe todos os descendentes também
                if (!isExpanded) {
                    const childIcon = childRow.querySelector('.toggle-review-row');
                    if (childIcon && childIcon.classList.contains('rotate-90')) {
                        childIcon.classList.remove('rotate-90');
                        const grandChildRows = document.querySelectorAll(`tr[data-parent-id="${childRow.dataset.id}"]`);
                        grandChildRows.forEach(gc => {
                            gc.classList.add('hidden');
                            // Continua recolhendo recursivamente
                             const gcIcon = gc.querySelector('.toggle-review-row');
                             if (gcIcon && gcIcon.classList.contains('rotate-90')) {
                                gcIcon.classList.remove('rotate-90');
                                const ggcRows = document.querySelectorAll(`tr[data-parent-id="${gc.dataset.id}"]`);
                                ggcRows.forEach(ggc => ggc.classList.add('hidden'));
                             }
                        });
                    }
                }
            });
        }
        // --- FIM DA MODIFICAÇÃO ---

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
        // --- Stats Tabs ---
        else if (target.closest('#stats-tabs-container .tab-button')) {
            const tabButton = target.closest('#stats-tabs-container .tab-button');
            const tabName = tabButton.dataset.tab;

            if (!tabButton.classList.contains('active')) {
                // Remove a classe ativa de todos os botões e conteúdos
                DOM.statsTabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('#stats-tabs-content-container .stats-tab-content').forEach(content => content.classList.add('hidden'));

                // Adiciona a classe ativa ao botão clicado e ao conteúdo correspondente
                tabButton.classList.add('active');
                const activeContent = document.getElementById(`${tabName}-tab`);
                if (activeContent) {
                    activeContent.classList.remove('hidden');
                }
            }
        }
        // --- Stats Tree Table Toggle ---
        else if (target.closest('.tree-table .toggle-icon:not(.no-children)')) {
            const row = target.closest('.tree-table-row');
            if (row) {
                const rowId = row.dataset.id;
                const level = parseInt(row.dataset.level);
                const icon = row.querySelector('.toggle-icon');
                
                icon.classList.toggle('rotate-90');
                const isExpanded = icon.classList.contains('rotate-90');

                // Encontra todos os filhos diretos
                const childRows = document.querySelectorAll(`.tree-table-row[data-parent-id="${rowId}"]`);
                
                childRows.forEach(child => {
                    child.classList.toggle('hidden-row', !isExpanded);
                    
                    // Se estivermos fechando (isExpanded = false), precisamos fechar todos os descendentes também
                    if (!isExpanded) {
                        const childIcon = child.querySelector('.toggle-icon');
                        if(childIcon && childIcon.classList.contains('rotate-90')) {
                             childIcon.classList.remove('rotate-90');
                             const grandChildRows = document.querySelectorAll(`.tree-table-row[data-parent-id="${child.dataset.id}"]`);
                             grandChildRows.forEach(gc => {
                                gc.classList.add('hidden-row');
                                // Continua recursivamente
                                const gcIcon = gc.querySelector('.toggle-icon');
                                if(gcIcon && gcIcon.classList.contains('rotate-90')) {
                                    gcIcon.classList.remove('rotate-90');
                                    const ggcRows = document.querySelectorAll(`.tree-table-row[data-parent-id="${gc.dataset.id}"]`);
                                    ggcRows.forEach(ggc => ggc.classList.add('hidden-row'));
                                }
                             });
                        }
                    }
                });
            }
        }
        // --- NOVO LISTENER PARA RESETAR PROGRESSO ---
        else if (target.closest('#reset-all-progress-btn')) {
            if (!state.currentUser) return; // Proteção
            setState('deletingId', null);
            setState('deletingType', 'all-progress');
            if (DOM.confirmationModalTitle) DOM.confirmationModalTitle.textContent = 'Resetar Todo o Progresso';
            if (DOM.confirmationModalText) DOM.confirmationModalText.innerHTML = `Tem certeza que deseja apagar <strong>TODO</strong> o seu progresso? Isso inclui todas as estatísticas, filtros, pastas, cadernos e agendamentos de revisão. <br><br><span class="font-bold text-red-600">Esta ação não pode ser desfeita.</span>`;
            if (DOM.confirmationModal) DOM.confirmationModal.classList.remove('hidden');
        }
    });

    // Input/Change listeners
    if (DOM.searchSavedFiltersInput) {
        DOM.searchSavedFiltersInput.addEventListener('input', updateSavedFiltersList);
    }
    
    // --- MODIFICAÇÃO: Removido listener antigo da tabela de revisão ---
    // A nova lógica será adicionada abaixo

    // CORREÇÃO: Salva a sessão se o usuário fechar ou mudar de aba
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (state.currentUser && state.sessionStats.length > 0) {
                saveSessionStats();
            }
        }
    });

    // --- NOVO LISTENER ---
    // Adiciona o listener de 'change' para a tabela de estatísticas
    // Usamos 'document' para garantir que funcione mesmo se a tabela for re-renderizada
    document.addEventListener('change', (event) => {
        const target = event.target;
        if (target.closest('#stats-desempenho-materia-container')) {
            handleStatsTableSelection(event);
        }
        
        // --- MODIFICAÇÃO: Nova lógica para seleção na tabela de revisão ---
        else if (target.closest('#review-table-container')) {
            if (target.matches('.review-checkbox')) {
                handleReviewTableSelection(target);
            } else if (target.matches('#select-all-review-materias')) {
                const isChecked = target.checked;
                DOM.reviewTableContainer.querySelectorAll('.review-checkbox:not(:disabled)').forEach(cb => {
                    cb.checked = isChecked;
                    cb.indeterminate = false;
                });
                // Garante que o estado 'indeterminate' seja limpo
                if (isChecked) {
                    selectAllCheckbox.indeterminate = false;
                }
            }
            
            // Atualiza o botão de iniciar revisão
            const anyChecked = DOM.reviewTableContainer.querySelector('.review-checkbox:checked');
            DOM.startSelectedReviewBtn.disabled = !anyChecked;
        }
        // --- FIM DA MODIFICAÇÃO ---
    });
}

