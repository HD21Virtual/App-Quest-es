import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { createItem, createFilter, updateItem, deleteItem, resetAllUserData } from '../services/firestore.js';
import { applyFilters } from '../features/filter.js';
import { closeConfirmationModal } from './modal.js';

/**
 * @file js/ui/modal.js
 * @description Gerencia a lógica de todos os modais da aplicação.
 */

const modals = {
    auth: DOM.authModal,
    save: DOM.saveModal,
    load: DOM.loadModal,
    caderno: DOM.cadernoModal,
    name: DOM.nameModal,
    confirmation: DOM.confirmationModal,
    stats: DOM.statsModal,
};

export function openModal(modalName, options = {}) {
    const modal = modals[modalName];
    if (!modal) return;

    // Lógica específica para cada modal antes de abrir
    switch (modalName) {
        case 'name':
            state.editingType = options.type;
            state.editingId = options.id || null;
            DOM.nameInput.value = options.name || '';
            DOM.nameModalTitle.textContent = state.editingId ? `Editar ${options.type === 'folder' ? 'Pasta' : 'Caderno'}` : `Criar Nova ${options.type === 'folder' ? 'Pasta' : 'Caderno'}`;
            break;
        case 'caderno':
            state.createCadernoWithFilteredQuestions = options.fromFilters || false;
            DOM.cadernoNameInput.value = '';
            DOM.folderSelect.value = options.folderId || '';
            DOM.folderSelect.disabled = !!options.folderId;
            break;
        case 'confirmation':
            state.deletingId = options.id || null;
            state.deletingType = options.type;
            DOM.confirmationModalTitle.textContent = options.title;
            DOM.confirmationModalText.innerHTML = options.text;
            break;
    }

    modal.classList.remove('hidden');
}

export function closeModal(modalName) {
    const modal = modals[modalName];
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function closeConfirmationModal() {
    DOM.confirmationModal.classList.add('hidden');
    state.deletingId = null;
    state.deletingType = null;
    // Restaura a UI do modal de confirmação para o padrão de exclusão
    DOM.confirmationModal.querySelector('.bg-red-100').classList.remove('hidden');
    DOM.confirmationModal.querySelector('.flex.justify-center.space-x-4').classList.remove('hidden');
}


export async function handleConfirmation(type) {
    if (!state.currentUser) return;

    switch (type) {
        case 'save-filter':
            const name = DOM.filterNameInput.value.trim();
            if (!name) return;
            const filterData = {
                name,
                materias: JSON.parse(DOM.materiaFilter.dataset.value || '[]'),
                assuntos: JSON.parse(DOM.assuntoFilter.dataset.value || '[]'),
                tipo: DOM.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos',
                search: DOM.searchInput.value,
            };
            await createFilter(filterData);
            DOM.filterNameInput.value = '';
            closeModal('save');
            break;

        case 'create-caderno':
            const cadernoName = DOM.cadernoNameInput.value.trim();
            if (!cadernoName) return;
            const cadernoData = {
                name: cadernoName,
                questionIds: state.createCadernoWithFilteredQuestions ? state.filteredQuestions.map(q => q.id) : [],
                folderId: DOM.folderSelect.value || null,
            };
            await createItem('caderno', cadernoData);
            closeModal('caderno');
            break;

        case 'save-name':
            const newName = DOM.nameInput.value.trim();
            if (!newName || !state.editingType) return;
            if (state.editingId) {
                await updateItem(state.editingType, state.editingId, { name: newName });
            } else {
                await createItem(state.editingType, { name: newName });
            }
            closeModal('name');
            break;
        
        case 'delete':
            if (state.deletingType && state.deletingId) {
                await deleteItem(state.deletingType, state.deletingId);
            }
            closeConfirmationModal();
            break;
        
        case 'all-progress':
            await resetAllUserData();
            closeConfirmationModal();
            break;
    }
}
