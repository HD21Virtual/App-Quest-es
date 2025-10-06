import { state } from '../state.js';
import DOM from '../dom-elements.js';
import { displayQuestion } from './question-viewer.js';
import { generateStatsForQuestions, updateStatsPanel } from './stats.js';
import { showItemStatsModal } from '../ui/modal.js';

/**
 * @file js/features/caderno.js
 * @description Lida com a lógica da visualização e gerenciamento de cadernos e pastas.
 */

export async function renderFoldersAndCadernos() {
    DOM.savedCadernosListContainer.innerHTML = '';

    if (state.currentCadernoId) {
        renderSingleCadernoView();
    } else if (state.currentFolderId) {
        renderSingleFolderView();
    } else {
        renderRootCadernosView();
    }
}

function renderRootCadernosView() {
    DOM.cadernosViewTitle.textContent = 'Meus Cadernos';
    DOM.backToFoldersBtn.classList.add('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.remove('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    if (state.userFolders.length === 0 && state.userCadernos.filter(c => !c.folderId).length === 0) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 p-4">Nenhum caderno ou pasta criada.</p>';
        return;
    }

    state.userFolders.forEach(folder => {
        const count = state.userCadernos.filter(c => c.folderId === folder.id).length;
        DOM.savedCadernosListContainer.innerHTML += `
            <div class="folder-item flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mb-2" data-folder-id="${folder.id}">
                <div class="flex items-center cursor-pointer flex-grow" data-action="open-folder">
                    <i class="fas fa-folder text-yellow-500 text-2xl mr-4"></i>
                    <div>
                        <h4 class="font-bold">${folder.name}</h4>
                        <p class="text-sm text-gray-500">${count} caderno(s)</p>
                    </div>
                </div>
                <div class="flex items-center space-x-1">
                    <button class="stats-folder-btn" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-chart-bar"></i></button>
                    <button class="edit-folder-btn" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-folder-btn" data-id="${folder.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    });

    const unfiledCadernos = state.userCadernos.filter(c => !c.folderId);
    unfiledCadernos.forEach(caderno => {
         DOM.savedCadernosListContainer.innerHTML += `
             <div class="caderno-item flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mb-2" data-caderno-id="${caderno.id}">
                <div class="flex items-center cursor-pointer flex-grow" data-action="open-caderno">
                    <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                    <div>
                        <h4 class="font-bold">${caderno.name}</h4>
                        <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="edit-caderno-btn" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-caderno-btn" data-id="${caderno.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    });
}

function renderSingleFolderView() {
    const folder = state.userFolders.find(f => f.id === state.currentFolderId);
    if (!folder) { state.currentFolderId = null; renderFoldersAndCadernos(); return; }

    DOM.cadernosViewTitle.textContent = folder.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.remove('hidden');
    DOM.createFolderBtn.classList.add('hidden');

    const cadernosInFolder = state.userCadernos.filter(c => c.folderId === state.currentFolderId);
    if (cadernosInFolder.length > 0) {
        cadernosInFolder.forEach(caderno => {
             DOM.savedCadernosListContainer.innerHTML += `
             <div class="caderno-item flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mb-2" data-caderno-id="${caderno.id}">
                <div class="flex items-center cursor-pointer flex-grow" data-action="open-caderno">
                    <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                    <div>
                        <h4 class="font-bold">${caderno.name}</h4>
                        <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="edit-caderno-btn" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-caderno-btn" data-id="${caderno.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
        });
    } else {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 p-4">Nenhum caderno nesta pasta.</p>';
    }
}

async function renderSingleCadernoView() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) { state.currentCadernoId = null; await renderFoldersAndCadernos(); return; }

    DOM.cadernosViewTitle.textContent = caderno.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');

    const mainContentHtml = DOM.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
    DOM.savedCadernosListContainer.innerHTML = mainContentHtml;

    state.filteredQuestions = state.allQuestions.filter(q => caderno.questionIds.includes(q.id));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    state.currentQuestionIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    
    state.sessionStats = [];
    await displayQuestion();
}

export function handleCadernosViewClick(event) {
    const target = event.target;
    const folderItem = target.closest('[data-action="open-folder"]');
    const cadernoItem = target.closest('[data-action="open-caderno"]');
    // Adicionar outros botões (edit, delete, stats) aqui
    
    if (folderItem) {
        state.currentFolderId = folderItem.closest('.folder-item').dataset.folderId;
        renderFoldersAndCadernos();
    } else if (cadernoItem) {
        state.currentCadernoId = cadernoItem.closest('.caderno-item').dataset.cadernoId;
        renderFoldersAndCadernos();
    } else if (target.closest('.stats-caderno-btn')) {
        const btn = target.closest('.stats-caderno-btn');
        showItemStats(btn.dataset.id, 'caderno', btn.dataset.name);
    } else if (target.closest('.stats-folder-btn')) {
        const btn = target.closest('.stats-folder-btn');
        showItemStats(btn.dataset.id, 'folder', btn.dataset.name);
    }
}

async function showItemStats(itemId, itemType, itemName) {
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
        // Lidar com o caso de não haver questões
        return;
    }

    const historicalStats = await generateStatsForQuestions(questionIds);
    showItemStatsModal(itemName, historicalStats);
}

export function exitAddMode() {
    if (state.isAddingQuestionsMode.active) {
        state.isAddingQuestionsMode = { active: false, cadernoId: null };
        DOM.addQuestionsBanner.classList.add('hidden');
        DOM.filterBtn.textContent = 'Filtrar questões';
        DOM.filterBtn.disabled = false;
        
        const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
        if (mainContentContainer) mainContentContainer.classList.remove('hidden');
    }
}

