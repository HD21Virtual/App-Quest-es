import DOM from '../dom-elements.js';
import { state, setState } from '../state.js';
import { createCaderno, createOrUpdateName, deleteItem, deleteFilter } from '../services/firestore.js';
import { applyFilters } from '../features/filter.js';
import { generateStatsForQuestions } from '../features/stats.js';
import { renderItemPerformanceChart } from './charts.js';

// --- Auth Modal ---
export function openAuthModal() { if (DOM.authModal) DOM.authModal.classList.remove('hidden'); }
export function closeAuthModal() { if (DOM.authModal) DOM.authModal.classList.add('hidden'); }
export function setAuthError(message) {
    if (DOM.authError) {
        DOM.authError.textContent = message;
        DOM.authError.classList.remove('hidden');
    }
}
export function clearAuthError() { if (DOM.authError) DOM.authError.classList.add('hidden'); }


// --- Save Filter Modal ---
export function openSaveModal() { if (DOM.saveModal) DOM.saveModal.classList.remove('hidden'); }
export function closeSaveModal() { if (DOM.saveModal) DOM.saveModal.classList.add('hidden'); }


// --- Load Filter Modal ---
export function openLoadModal() {
    if (DOM.loadModal) {
        DOM.searchSavedFiltersInput.value = '';
        updateSavedFiltersList();
        DOM.loadModal.classList.remove('hidden');
    }
}
export function closeLoadModal() { if (DOM.loadModal) DOM.loadModal.classList.add('hidden'); }

export function updateSavedFiltersList() {
    if (!DOM.savedFiltersListContainer) return;

    const searchTerm = DOM.searchSavedFiltersInput.value.toLowerCase();
    const filtered = state.savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        DOM.savedFiltersListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`;
    } else {
        DOM.savedFiltersListContainer.innerHTML = filtered.map(f => `
            <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                <button class="load-filter-btn text-left flex-grow" data-id="${f.id}">${f.name}</button>
                <button class="delete-filter-btn text-gray-400 hover:text-red-600 p-2 rounded-full" data-id="${f.id}">
                    <i class="fas fa-trash-alt pointer-events-none"></i>
                </button>
            </div>
        `).join('');
    }
}

export async function handleLoadModalEvents(event) {
    const loadBtn = event.target.closest('.load-filter-btn');
    if (loadBtn) {
        const filterId = loadBtn.dataset.id;
        const filterToLoad = state.savedFilters.find(f => f.id === filterId);

        if (filterToLoad) {
            DOM.searchInput.value = filterToLoad.search;
            DOM.tipoFilterGroup.querySelector('.active-filter').classList.remove('active-filter');
            DOM.tipoFilterGroup.querySelector(`[data-value="${filterToLoad.tipo}"]`).classList.add('active-filter');

            const materiaContainer = DOM.materiaFilter;
            materiaContainer.querySelectorAll('.custom-select-option').forEach(cb => {
                cb.checked = filterToLoad.materias.includes(cb.dataset.value);
            });
            materiaContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));

            setTimeout(() => {
                const assuntoContainer = DOM.assuntoFilter;
                assuntoContainer.querySelectorAll('.custom-select-option').forEach(cb => {
                    cb.checked = filterToLoad.assuntos.includes(cb.dataset.value);
                });
                assuntoContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
                applyFilters();
            }, 50);

            closeLoadModal();
        }
    }

    const deleteBtn = event.target.closest('.delete-filter-btn');
    if (deleteBtn) {
        const filterId = deleteBtn.dataset.id;
        await deleteFilter(filterId);
        updateSavedFiltersList(); // Refresh list after deletion
    }
}


// --- Caderno Modal ---
export function openCadernoModal(isCreatingWithFilters, folderId = null) {
    setState('createCadernoWithFilteredQuestions', isCreatingWithFilters);
    DOM.cadernoNameInput.value = '';
    DOM.folderSelect.value = folderId || '';
    DOM.folderSelect.disabled = !!folderId;
    DOM.cadernoModal.classList.remove('hidden');
}
export function closeCadernoModal() {
    DOM.cadernoModal.classList.add('hidden');
    DOM.folderSelect.disabled = false;
    setState('createCadernoWithFilteredQuestions', false);
}


// --- Name Modal (Create/Edit Folder/Caderno) ---
export function openNameModal(type, id = null, name = '') {
    setState('editingType', type);
    setState('editingId', id);
    DOM.nameInput.value = name;
    DOM.nameModalTitle.textContent = id ? `Editar ${type === 'folder' ? 'Pasta' : 'Caderno'}` : `Criar Nova ${type === 'folder' ? 'Pasta' : 'Caderno'}`;
    DOM.nameModal.classList.remove('hidden');
}
export function closeNameModal() {
    DOM.nameModal.classList.add('hidden');
    setState('editingId', null);
    setState('editingType', null);
}

// --- Confirmation Modal ---
export function openConfirmationModal(type, id) {
    setState('deletingType', type);
    setState('deletingId', id);

    let title = '';
    let text = '';

    if (type === 'folder') {
        const folderName = state.userFolders.find(f => f.id === id)?.name || '';
        title = 'Excluir Pasta';
        text = `Deseja excluir a pasta <strong>"${folderName}"</strong>? <br><br> <span class="font-bold text-red-600">Todos os cadernos dentro dela também serão excluídos.</span>`;
    } else if (type === 'caderno') {
        const cadernoName = state.userCadernos.find(c => c.id === id)?.name || '';
        title = 'Excluir Caderno';
        text = `Deseja excluir o caderno <strong>"${cadernoName}"</strong>?`;
    } else if (type === 'all-progress') {
        title = `Resetar Todo o Progresso`;
        text = `Tem certeza que deseja apagar **TODO** o seu histórico de resoluções e revisões? <br><br> <span class="font-bold text-red-600">Esta ação é irreversível e apagará todas as suas estatísticas.</span>`;
    }

    DOM.confirmationModalTitle.textContent = title;
    DOM.confirmationModalText.innerHTML = text;
    DOM.confirmationModal.classList.remove('hidden');
}
export function closeConfirmationModal() {
    DOM.confirmationModal.classList.add('hidden');
    setState('deletingId', null);
    setState('deletingType', null);
}
export async function handleConfirmation() {
    if (!state.currentUser || !state.deletingType) return;
    await deleteItem(state.deletingType, state.deletingId);
    closeConfirmationModal();
}


// --- Stats Modal ---
export function closeStatsModal() {
    DOM.statsModal.classList.add('hidden');
}
export async function showItemStatsModal(itemId, itemType, itemName) {
    if (!state.currentUser) return;
    
    DOM.statsModalTitle.textContent = `Estatísticas de "${itemName}"`;
    DOM.statsModalContent.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i><p class="mt-2">Carregando dados...</p></div>`;
    DOM.statsModal.classList.remove('hidden');

    let questionIds = [];
    if (itemType === 'caderno') {
        const caderno = state.userCadernos.find(c => c.id === itemId);
        questionIds = caderno ? caderno.questionIds || [] : [];
    } else if (itemType === 'folder') {
        const ids = new Set();
        state.userCadernos.forEach(c => {
            if (c.folderId === itemId && c.questionIds) {
                c.questionIds.forEach(id => ids.add(id));
            }
        });
        questionIds = Array.from(ids);
    }

    if (questionIds.length === 0) {
        DOM.statsModalContent.innerHTML = `<div class="text-center p-8"><p>Nenhuma questão encontrada para gerar estatísticas.</p></div>`;
        return;
    }

    const { totalCorrect, totalIncorrect, statsByMateria } = await generateStatsForQuestions(questionIds);
    const totalAttempts = totalCorrect + totalIncorrect;
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts * 100) : 0;
    const resolvedCount = Object.values(statsByMateria).reduce((sum, m) => sum + m.total, 0);


    DOM.statsModalContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Questões Respondidas</h4>
                <p class="mt-1 text-2xl font-semibold text-gray-900">${resolvedCount} / ${questionIds.length}</p>
            </div>
            <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Aproveitamento</h4>
                <p class="mt-1 text-2xl font-semibold ${accuracy >= 60 ? 'text-green-600' : 'text-red-600'}">${accuracy.toFixed(0)}%</p>
            </div>
             <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Total de Respostas</h4>
                <p class="mt-1 text-2xl font-semibold text-gray-900">${totalAttempts}</p>
            </div>
        </div>
        <div class="relative mx-auto mt-6" style="max-width: 300px;">
            <canvas id="itemPerformanceChart"></canvas>
        </div>
    `;
    
    if (totalAttempts > 0) {
        renderItemPerformanceChart(totalCorrect, totalIncorrect);
    } else {
        const chartContainer = DOM.statsModalContent.querySelector('div[style*="max-width: 300px"]');
        if(chartContainer) chartContainer.innerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum histórico de respostas para exibir o gráfico.</p>';
    }
}

