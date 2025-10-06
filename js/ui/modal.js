import { state } from '../state.js';
import DOM from '../dom-elements.js';
import { generateStatsForQuestions } from '../features/stats.js';
import { renderItemPerformanceChart } from './charts.js';

/**
 * @file js/ui/modal.js
 * @description Funções para controlar a visibilidade e o conteúdo de todos os modais.
 */

// --- Funções de Abrir Modal ---

export function openAuthModal() {
    if (!state.currentUser) {
        DOM.authModal.classList.remove('hidden');
    }
}

export function openSaveModal() {
    if (!state.currentUser) {
        showInfoModal("Acesso Negado", "Por favor, faça login para salvar filtros.");
        return;
    }
    DOM.filterNameInput.value = '';
    DOM.saveModal.classList.remove('hidden');
}

export function openLoadModal() {
    if (!state.currentUser) {
        showInfoModal("Acesso Negado", "Por favor, faça login para ver os seus filtros.");
        return;
    }
    DOM.searchSavedFiltersInput.value = '';
    DOM.loadModal.classList.remove('hidden');
}

export function openCadernoModal(withFilteredQuestions) {
    if (!state.currentUser) {
        showInfoModal("Acesso Negado", "Por favor, faça login para criar cadernos.");
        return;
    }
    state.createCadernoWithFilteredQuestions = withFilteredQuestions;
    DOM.cadernoNameInput.value = '';
    DOM.folderSelect.value = state.currentFolderId || '';
    DOM.folderSelect.disabled = !withFilteredQuestions && state.currentFolderId;
    DOM.cadernoModal.classList.remove('hidden');
}

export function openNameModal(type, id = null, name = '') {
    if (!state.currentUser) {
        const item = type === 'folder' ? 'pastas' : 'cadernos';
        showInfoModal("Acesso Negado", `Por favor, faça login para criar ou editar ${item}.`);
        return;
    }
    state.editingType = type;
    state.editingId = id;
    DOM.nameInput.value = name;
    DOM.nameModalTitle.textContent = id ? `Editar ${type === 'folder' ? 'Pasta' : 'Caderno'}` : `Criar Nova ${type === 'folder' ? 'Pasta' : 'Caderno'}`;
    DOM.nameModal.classList.remove('hidden');
}


export function openConfirmationModal(type, id) {
    state.deletingType = type;
    state.deletingId = id;
    let title = '';
    let text = '';

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
    DOM.confirmDeleteBtn.classList.remove('hidden');
    DOM.cancelConfirmationBtn.textContent = 'Cancelar';
    DOM.confirmationModal.classList.remove('hidden');
}


export async function showItemStatsModal(itemId, itemType, itemName) {
    if (!state.currentUser) return;
    
    DOM.statsModalTitle.textContent = `Estatísticas de "${itemName}"`;
    DOM.statsModalContent.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i><p class="mt-2">Carregando dados...</p></div>`;
    DOM.statsModal.classList.remove('hidden');

    let questionIds = [];
    if (itemType === 'caderno') {
        const caderno = state.userCadernos.find(c => c.id === itemId);
        questionIds = caderno ? (caderno.questionIds || []) : [];
    } else if (itemType === 'folder') {
        const cadernosInFolder = state.userCadernos.filter(c => c.folderId === itemId);
        questionIds = [...new Set(cadernosInFolder.flatMap(c => c.questionIds || []))];
    }

    if (questionIds.length === 0) {
        DOM.statsModalContent.innerHTML = `<div class="text-center p-8"><p>Nenhuma questão encontrada para gerar estatísticas.</p></div>`;
        return;
    }

    const { totalCorrect, totalIncorrect, questionsWithHistory, totalAttempts } = await generateStatsForQuestions(questionIds);
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts * 100) : 0;

    DOM.statsModalContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Questões Respondidas</h4>
                <p class="mt-1 text-2xl font-semibold text-gray-900">${questionsWithHistory} / ${questionIds.length}</p>
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
    
    renderItemPerformanceChart(totalCorrect, totalIncorrect);
}

function showInfoModal(title, message) {
     DOM.confirmationModalTitle.textContent = title;
     DOM.confirmationModalText.innerHTML = message;
     DOM.confirmDeleteBtn.classList.add('hidden');
     DOM.cancelConfirmationBtn.textContent = 'Fechar';
     DOM.confirmationModal.classList.remove('hidden');
}


// --- Funções de Fechar Modal ---

export function closeAuthModal() {
    DOM.authModal.classList.add('hidden');
    const authError = DOM.authModal.querySelector('#auth-error');
    if(authError) authError.classList.add('hidden');
}

export function closeSaveModal() {
    DOM.saveModal.classList.add('hidden');
}

export function closeLoadModal() {
    DOM.loadModal.classList.add('hidden');
}

export function closeCadernoModal() {
    DOM.cadernoModal.classList.add('hidden');
    state.createCadernoWithFilteredQuestions = false;
}

export function closeNameModal() {
    DOM.nameModal.classList.add('hidden');
    state.editingId = null;
    state.editingType = null;
}

export function closeConfirmationModal() {
    DOM.confirmationModal.classList.add('hidden');
    state.deletingId = null;
    state.deletingType = null;
}

export function closeStatsModal() {
    DOM.statsModal.classList.add('hidden');
}

