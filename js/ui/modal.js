import DOM from '../dom-elements.js';
import { state, setState } from '../state.js';
import { createCaderno, createOrUpdateName, saveFilter, deleteFilter, deleteItem, resetAllUserData } from '../services/firestore.js';

// --- MODAL FUNCTIONS ---

function closeModal(modalElement) {
    modalElement.classList.add('hidden');
}

export function closeAuthModal() {
    closeModal(DOM.authModal);
}

export function openAuthModal() {
    DOM.authModal.classList.remove('hidden');
}

export function openSaveModal() {
    if (!state.currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para salvar filtros."); return; }
    DOM.saveModal.classList.remove('hidden');
}

export function openLoadModal() {
    if (!state.currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para ver seus filtros."); return; }
    DOM.searchSavedFiltersInput.value = '';
    DOM.loadModal.classList.remove('hidden');
}

export function openCadernoModal(isAddingToFolder) {
    if (!state.currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para criar cadernos."); return; }
    setState('createCadernoWithFilteredQuestions', !isAddingToFolder);
    DOM.cadernoNameInput.value = '';
    if (isAddingToFolder) {
        DOM.folderSelect.value = state.currentFolderId;
        DOM.folderSelect.disabled = true;
    } else {
        DOM.folderSelect.value = '';
        DOM.folderSelect.disabled = false;
    }
    DOM.cadernoModal.classList.remove('hidden');
}

export function openNameModal(type) {
    if (!state.currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para criar/editar."); return; }
    setState('editingId', null);
    setState('editingType', type);
    DOM.nameInput.value = '';
    DOM.nameModalTitle.textContent = 'Criar Nova Pasta';
    DOM.nameModal.classList.remove('hidden');
}

export function showItemStatsModal(itemId, itemType, itemName) {
    // ... lógica para mostrar estatísticas
}

function showInfoModal(title, message) {
    // ... lógica para mostrar modal de informação
}

export function closeConfirmationModal() {
    DOM.confirmationModal.classList.add('hidden');
    setState('deletingId', null);
    setState('deletingType', null);
}

export async function handleConfirmation() {
    if (!state.currentUser || !state.deletingType) return;

    if (state.deletingType === 'all-progress') {
        DOM.confirmationModalTitle.textContent = "Resetando...";
        DOM.confirmationModalText.innerHTML = `<div class="flex justify-center items-center p-4"><i class="fas fa-spinner fa-spin text-3xl text-gray-500"></i></div>`;
        DOM.confirmationModal.querySelector('.flex.justify-center.space-x-4').classList.add('hidden');
        await resetAllUserData();
        DOM.confirmationModal.querySelector('.flex.justify-center.space-x-4').classList.remove('hidden');
    } else {
        await deleteItem(state.deletingType, state.deletingId);
    }
    
    closeConfirmationModal();
}


// --- ATTACH EVENT LISTENERS FOR MODALS ---

// Close buttons
DOM.closeAuthModalBtn.addEventListener('click', () => closeModal(DOM.authModal));
DOM.closeSaveModalBtn.addEventListener('click', () => closeModal(DOM.saveModal));
DOM.closeLoadModalBtn.addEventListener('click', () => closeModal(DOM.loadModal));
DOM.closeCadernoModalBtn.addEventListener('click', () => closeModal(DOM.cadernoModal));
DOM.closeNameModalBtn.addEventListener('click', () => closeModal(DOM.nameModal));
DOM.closeStatsModalBtn.addEventListener('click', () => closeModal(DOM.statsModal));

// Cancel buttons
DOM.cancelSaveBtn.addEventListener('click', () => closeModal(DOM.saveModal));
DOM.cancelCadernoBtn.addEventListener('click', () => closeModal(DOM.cadernoModal));
DOM.cancelNameBtn.addEventListener('click', () => closeModal(DOM.nameModal));

// Confirm buttons
DOM.confirmSaveBtn.addEventListener('click', async () => {
    const name = DOM.filterNameInput.value.trim();
    if (!name || !state.currentUser) return;
    const currentFilters = {
        materias: JSON.parse(DOM.materiaFilter.dataset.value || '[]'),
        assuntos: JSON.parse(DOM.assuntoFilter.dataset.value || '[]'),
        tipo: DOM.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos',
        search: DOM.searchInput.value
    };
    await saveFilter(name, currentFilters);
    DOM.filterNameInput.value = '';
    closeModal(DOM.saveModal);
});

DOM.confirmCadernoBtn.addEventListener('click', async () => {
    const name = DOM.cadernoNameInput.value.trim();
    if (!name || !state.currentUser) return;
    const questionIds = state.createCadernoWithFilteredQuestions ? state.filteredQuestions.map(q => q.id) : [];
    await createCaderno(name, DOM.folderSelect.value, questionIds);
    closeModal(DOM.cadernoModal);
});

DOM.confirmNameBtn.addEventListener('click', async () => {
    const name = DOM.nameInput.value.trim();
    if (!name || !state.currentUser || !state.editingType) return;
    await createOrUpdateName(state.editingType, name, state.editingId);
    closeModal(DOM.nameModal);
});

// Event listener for saved filters list (load/delete)
DOM.savedFiltersListContainer.addEventListener('click', async (event) => {
    const target = event.target;
    if (!state.currentUser) return;

    if (target.closest('.delete-filter-btn')) {
        const filterId = target.closest('.delete-filter-btn').dataset.id;
        await deleteFilter(filterId);
    }
    // A lógica de carregar filtro é mais complexa e fica no filter.js por enquanto
});

