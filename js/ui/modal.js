import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { renderItemPerformanceChart } from './charts.js';

/**
 * @file js/ui/modal.js
 * @description Funções para controlar a exibição de modais.
 */

// --- MODAL DE AUTENTICAÇÃO ---
export function openAuthModal() {
    DOM.authModal.classList.remove('hidden');
}

export function closeAuthModal() {
    DOM.authModal.classList.add('hidden');
}

// --- MODAL DE SALVAR FILTRO ---
export function openSaveFilterModal() {
    if (!state.currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para salvar filtros."); return; }
    DOM.saveModal.classList.remove('hidden');
}

// --- MODAL DE CADERNO ---
export function openCadernoModal(isCreatingWithFilters, folderId = null) {
    if (!state.currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para criar cadernos."); return; }
    state.createCadernoWithFilteredQuestions = isCreatingWithFilters;
    DOM.cadernoNameInput.value = '';
    
    DOM.folderSelect.innerHTML = '<option value="">Salvar em (opcional)</option>' +
        state.userFolders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    
    DOM.folderSelect.value = folderId || '';
    DOM.folderSelect.disabled = !!folderId;
    DOM.cadernoModal.classList.remove('hidden');
}

// --- MODAL DE NOME (CRIAR/EDITAR) ---
export function openNameModal(type, id = null, name = '') {
    state.editingType = type;
    state.editingId = id;
    DOM.nameInput.value = name;
    DOM.nameModalTitle.textContent = id ? `Editar ${type === 'folder' ? 'Pasta' : 'Caderno'}` : `Criar Nova ${type === 'folder' ? 'Pasta' : 'Caderno'}`;
    DOM.nameModal.classList.remove('hidden');
}

// --- MODAL DE CONFIRMAÇÃO ---
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
    }
    DOM.confirmationModalTitle.textContent = title;
    DOM.confirmationModalText.innerHTML = text;
    DOM.confirmationModal.classList.remove('hidden');
}

export function closeConfirmationModal() {
    DOM.confirmationModal.classList.add('hidden');
    state.deletingId = null;
    state.deletingType = null;
}

// --- MODAL DE ESTATÍSTICAS ---
export function showItemStatsModal(itemName, statsData) {
    if (!DOM.statsModal || !DOM.statsModalTitle || !DOM.statsModalContent) return;

    DOM.statsModalTitle.textContent = `Estatísticas de "${itemName}"`;
    DOM.statsModal.classList.remove('hidden');

    const { totalCorrect, totalIncorrect, questionIds } = statsData;
    const totalAttempts = totalCorrect + totalIncorrect;
    
    if (questionIds.length === 0) {
        DOM.statsModalContent.innerHTML = `<div class="text-center p-8"><p>Nenhuma questão encontrada para gerar estatísticas.</p></div>`;
        return;
    }
    
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts * 100) : 0;

    DOM.statsModalContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Questões no Item</h4>
                <p class="mt-1 text-2xl font-semibold text-gray-900">${questionIds.length}</p>
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
        renderItemPerformanceChart('itemPerformanceChart', totalCorrect, totalIncorrect);
    } else {
        const chartContainer = DOM.statsModalContent.querySelector('#itemPerformanceChart');
        if(chartContainer) chartContainer.outerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum histórico de respostas para exibir o gráfico.</p>';
    }
}


function showInfoModal(title, message) {
     // Implementar uma versão mais genérica deste modal se necessário.
     console.log(`INFO: ${title} - ${message}`);
}

