import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToView } from '../ui/navigation.js';
import { displayQuestion } from './question-viewer.js';
import { generateStatsForQuestions } from './stats.js';
import { showItemStatsModal, openNameModal, openConfirmationModal } from '../ui/modal.js';
import { applyFilters } from './filter.js';
import { removeQuestionIdFromCaderno } from '../services/firestore.js';

async function renderCadernoContentView() {
    // ... existing code ...
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');

    const tempContainer = document.createElement('div');
    const mainContentHtml = DOM.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
    tempContainer.innerHTML = mainContentHtml;
// ... existing code ...
    setState('sessionStats', []);
    await displayQuestion();
}

function renderFolderContentView() {
    const folder = state.userFolders.find(f => f.id === state.currentFolderId);
    if (!folder) {
        setState('currentFolderId', null);
        renderFoldersAndCadernos();
        return;
    }

    DOM.cadernosViewTitle.textContent = folder.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addCadernoToFolderBtn.classList.remove('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    const cadernosInFolder = state.userCadernos.filter(c => c.folderId === state.currentFolderId);

    if (cadernosInFolder.length === 0) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno nesta pasta.</p>';
        return;
    }

    let html = '<div class="space-y-4">';
    cadernosInFolder.forEach(caderno => {
        html += `
            <div class="caderno-item bg-white p-4 rounded-lg shadow-sm" data-caderno-id="${caderno.id}">
                 <div class="flex justify-between items-center">
                    <div class="flex items-center cursor-pointer" data-action="open">
                        <i class="fas fa-book text-blue-500 mr-4 text-2xl"></i>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${caderno.name}</h3>
                            <p class="text-sm text-gray-500">${caderno.questionIds ? caderno.questionIds.length : 0} questão(ões)</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="text-gray-400 hover:text-blue-600 p-2" data-action="stats" title="Estatísticas">
                            <i class="fas fa-chart-pie pointer-events-none"></i>
                        </button>
                        <button class="text-gray-400 hover:text-green-600 p-2" data-action="edit" title="Renomear">
                            <i class="fas fa-pen pointer-events-none"></i>
                        </button>
                        <button class="text-gray-400 hover:text-red-600 p-2" data-action="delete" title="Excluir">
                            <i class="fas fa-trash-alt pointer-events-none"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    DOM.savedCadernosListContainer.innerHTML = html;
}

function renderRootCadernosView() {
    DOM.cadernosViewTitle.textContent = 'Meus Cadernos';
    DOM.backToFoldersBtn.classList.add('hidden');
// ... existing code ...
    if (state.userFolders.length === 0 && unfiledCadernos.length === 0) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno ou pasta criada ainda.</p>';
        return;
    }

    let html = '<div class="space-y-4">';

    state.userFolders.forEach(folder => {
        const cadernosInFolder = state.userCadernos.filter(c => c.folderId === folder.id).length;
        html += `
            <div class="folder-item bg-white p-4 rounded-lg shadow-sm" data-folder-id="${folder.id}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center cursor-pointer" data-action="open">
                        <i class="fas fa-folder text-yellow-500 mr-4 text-2xl"></i>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${folder.name}</h3>
                            <p class="text-sm text-gray-500">${cadernosInFolder} caderno(s)</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="text-gray-400 hover:text-blue-600 p-2" data-action="stats" title="Estatísticas">
                            <i class="fas fa-chart-pie pointer-events-none"></i>
                        </button>
                        <button class="text-gray-400 hover:text-green-600 p-2" data-action="edit" title="Renomear">
                            <i class="fas fa-pen pointer-events-none"></i>
                        </button>
                        <button class="text-gray-400 hover:text-red-600 p-2" data-action="delete" title="Excluir">
                            <i class="fas fa-trash-alt pointer-events-none"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    unfiledCadernos.forEach(caderno => {
         html += `
            <div class="caderno-item bg-white p-4 rounded-lg shadow-sm" data-caderno-id="${caderno.id}">
                 <div class="flex justify-between items-center">
                    <div class="flex items-center cursor-pointer" data-action="open">
                        <i class="fas fa-book text-blue-500 mr-4 text-2xl"></i>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${caderno.name}</h3>
                            <p class="text-sm text-gray-500">${caderno.questionIds ? caderno.questionIds.length : 0} questão(ões)</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                         <button class="text-gray-400 hover:text-blue-600 p-2" data-action="stats" title="Estatísticas">
                            <i class="fas fa-chart-pie pointer-events-none"></i>
                        </button>
                        <button class="text-gray-400 hover:text-green-600 p-2" data-action="edit" title="Renomear">
                            <i class="fas fa-pen pointer-events-none"></i>
                        </button>
                        <button class="text-gray-400 hover:text-red-600 p-2" data-action="delete" title="Excluir">
                            <i class="fas fa-trash-alt pointer-events-none"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    DOM.savedCadernosListContainer.innerHTML = html;
}


export async function renderFoldersAndCadernos() {
// ... existing code ...
    if (state.currentCadernoId) {
        await renderCadernoContentView();
    } else if (state.currentFolderId) {
        renderFolderContentView();
    } else {
        renderRootCadernosView();
    }
}

export function handleFolderItemClick(event) {
    const folderItem = event.target.closest('.folder-item');
    if (!folderItem) return;

    const action = event.target.closest('[data-action]')?.dataset.action;
    const folderId = folderItem.dataset.folderId;
    const folder = state.userFolders.find(f => f.id === folderId);

    if (!folder) return;

    if (action === 'open') {
        setState('currentFolderId', folderId);
        renderFoldersAndCadernos();
    } else if (action === 'edit') {
        openNameModal('folder', folderId, folder.name);
    } else if (action === 'delete') {
        openConfirmationModal('folder', folderId, `Excluir a pasta "${folder.name}" e todos os cadernos contidos nela?`);
    } else if (action === 'stats') {
        showItemStatsModal(folderId, 'folder', folder.name);
    }
}

export function handleCadernoItemClick(event) {
    const cadernoItem = event.target.closest('.caderno-item');
    if (!cadernoItem) return;
    
    const action = event.target.closest('[data-action]')?.dataset.action;
    const cadernoId = cadernoItem.dataset.cadernoId;
    const caderno = state.userCadernos.find(c => c.id === cadernoId);

    if (!caderno) return;

    if (action === 'open') {
        setState('currentCadernoId', cadernoId);
        renderFoldersAndCadernos();
    } else if (action === 'edit') {
        openNameModal('caderno', cadernoId, caderno.name);
    } else if (action === 'delete') {
        openConfirmationModal('caderno', cadernoId, `Excluir o caderno "${caderno.name}"?`);
    } else if (action === 'stats') {
        showItemStatsModal(cadernoId, 'caderno', caderno.name);
    }
}

export function handleBackToFolders() {
    if (state.currentCadernoId) {
// ... existing code ...
