import DOM from '../dom-elements.js';
import { state, setState } from '../state.js';
import { saveFilter, deleteFilter, createCaderno, createOrUpdateName, deleteItem, resetAllUserData } from '../services/firestore.js';
import { generateStatsForQuestions } from '../features/stats.js';
import { renderItemPerformanceChart } from './charts.js';

// --- Auth Modal ---
export function showAuthModal() {
    DOM.authModal.classList.remove('hidden');
}
export function closeAuthModal() {
    DOM.authModal.classList.add('hidden');
    DOM.authError.classList.add('hidden');
}

// --- Save Filter Modal ---
export function showSaveFilterModal() {
    if (!state.currentUser) return showInfoModal("Acesso Negado", "Por favor, faça login para salvar filtros.");
    DOM.saveModal.classList.remove('hidden');
}

// --- Load Filter Modal ---
export function showLoadFilterModal() {
    if (!state.currentUser) return showInfoModal("Acesso Negado", "Por favor, faça login para ver seus filtros.");
    DOM.searchSavedFiltersInput.value = '';
    updateSavedFiltersList();
    DOM.loadModal.classList.remove('hidden');
}

// --- Caderno Modal ---
export function showCadernoModal(context) {
    if (!state.currentUser) return showInfoModal("Acesso Negado", "Por favor, faça login para criar cadernos.");
    setState('createCadernoWithFilteredQuestions', context === 'create-from-filter');
    DOM.cadernoNameInput.value = '';
    DOM.folderSelect.value = '';
    DOM.folderSelect.disabled = context === 'add-to-folder';
    if (context === 'add-to-folder') {
        DOM.folderSelect.value = state.currentFolderId;
    }
    DOM.cadernoModal.classList.remove('hidden');
}

// --- Name Modal (Create/Edit Folder/Caderno) ---
export function showNameModal(type, data = {}) {
    setState('editingType', type.includes('folder') ? 'folder' : 'caderno');
    setState('editingId', data.id || null);
    DOM.nameInput.value = data.name || '';
    DOM.nameModalTitle.textContent = `${data.id ? 'Editar' : 'Criar'} ${state.editingType === 'folder' ? 'Pasta' : 'Caderno'}`;
    DOM.nameModal.classList.remove('hidden');
}

// --- Confirmation Modal ---
export function showConfirmationModal(type, id) {
    setState('deletingType', type);
    setState('deletingId', id);

    let title = 'Excluir Item';
    let text = 'Tem certeza que deseja continuar? Esta ação não pode ser desfeita.';

    if (type === 'folder') {
        const folderName = state.userFolders.find(f => f.id === id)?.name || '';
        title = `Excluir Pasta`;
        text = `Deseja excluir a pasta <strong>"${folderName}"</strong>? <br><br> <span class="font-bold text-red-600">Todos os cadernos dentro dela também serão excluídos.</span>`;
    } else if (type === 'caderno') {
        const cadernoName = state.userCadernos.find(c => c.id === id)?.name || '';
        title = `Excluir Caderno`;
        text = `Deseja excluir o caderno <strong>"${cadernoName}"</strong>?`;
    } else if (type === 'all-progress') {
        title = `Resetar Todo o Progresso`;
        text = `Tem certeza que deseja apagar **TODO** o seu histórico de resoluções e revisões? <br><br> <span class="font-bold text-red-600">Esta ação é irreversível e apagará todas as suas estatísticas.</span>`;
    }

    DOM.confirmationModalTitle.textContent = title;
    DOM.confirmationModalText.innerHTML = text;
    DOM.confirmationModal.classList.remove('hidden');
}

export async function handleConfirmation(isConfirmed) {
    if (isConfirmed) {
        const { deletingType, deletingId } = state;
        if (deletingType === 'all-progress') {
            await resetAllUserData();
        } else {
            await deleteItem(deletingType, deletingId);
        }
    }
    closeConfirmationModal();
}

export function closeConfirmationModal() {
    DOM.confirmationModal.classList.add('hidden');
    setState('deletingId', null);
    setState('deletingType', null);
}


// --- Stats Modal ---
export async function showItemStatsModal(itemId, itemType, itemName) {
    if (!state.currentUser) return;
    
    DOM.statsModalTitle.textContent = `Estatísticas de "${itemName}"`;
    DOM.statsModalContent.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i></div>`;
    DOM.statsModal.classList.remove('hidden');

    let questionIds = [];
    if (itemType === 'caderno') {
        const caderno = state.userCadernos.find(c => c.id === itemId);
        if (caderno) questionIds = caderno.questionIds || [];
    } else if (itemType === 'folder') {
        state.userCadernos.forEach(c => {
            if (c.folderId === itemId && c.questionIds) {
                questionIds.push(...c.questionIds);
            }
        });
        questionIds = [...new Set(questionIds)];
    }

    if (questionIds.length === 0) {
        DOM.statsModalContent.innerHTML = `<div class="text-center p-8"><p>Nenhuma questão encontrada.</p></div>`;
        return;
    }

    const stats = await generateStatsForQuestions(questionIds);
    
    DOM.statsModalContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Aproveitamento</h4>
                <p class="mt-1 text-2xl font-semibold ${stats.accuracy >= 60 ? 'text-green-600' : 'text-red-600'}">${stats.accuracy.toFixed(0)}%</p>
            </div>
             <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Total de Respostas</h4>
                <p class="mt-1 text-2xl font-semibold text-gray-900">${stats.totalAttempts}</p>
            </div>
        </div>
        <div class="relative mx-auto mt-6" style="max-width: 300px;">
            <canvas id="itemPerformanceChart"></canvas>
        </div>
    `;
    
    if (stats.totalAttempts > 0) {
        renderItemPerformanceChart('itemPerformanceChart', stats.totalCorrect, stats.totalIncorrect);
    }
}


function showInfoModal(title, message) {
    // A simple implementation using the confirmation modal structure
    DOM.confirmationModalTitle.textContent = title;
    DOM.confirmationModalText.innerHTML = message;
    DOM.confirmDeleteBtn.classList.add('hidden');
    DOM.cancelConfirmationBtn.textContent = 'Fechar';
    DOM.confirmationModal.classList.remove('hidden');
}

function updateSavedFiltersList() {
    const searchTerm = DOM.searchSavedFiltersInput.value.toLowerCase();
    const filtered = state.savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        DOM.savedFiltersListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`;
    } else {
        DOM.savedFiltersListContainer.innerHTML = filtered.map(f => `
            <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                <button class="load-filter-btn text-left" data-id="${f.id}">${f.name}</button>
                <button class="delete-filter-btn text-red-500 hover:text-red-700" data-id="${f.id}">
                    <i class="fas fa-trash-alt pointer-events-none"></i>
                </button>
            </div>
        `).join('');
    }
}

