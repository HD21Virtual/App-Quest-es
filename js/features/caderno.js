import { state } from '../state.js';
import DOM from '../dom-elements.js';
import { displayQuestion } from './question-viewer.js';
import { generateStatsForQuestions, updateStatsPanel } from './stats.js';
import { showItemStatsModal, openNameModal, openConfirmationModal } from '../ui/modal.js';
import { arrayRemove, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { navigateToView } from '../ui/navigation.js';

/**
 * @file js/features/caderno.js
 * @description Lida com a lógica da view "Cadernos".
 */

function renderCadernoContentView(caderno) {
    DOM.cadernosViewTitle.textContent = caderno.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');

    const tempContainer = document.createElement('div');
    const mainContentHtml = DOM.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
    tempContainer.innerHTML = mainContentHtml;
    DOM.savedCadernosListContainer.innerHTML = '';
    DOM.savedCadernosListContainer.appendChild(tempContainer.firstChild);

    const cadernoState = state.userCadernoState.get(state.currentCadernoId);
    state.filteredQuestions = state.allQuestions.filter(q => caderno.questionIds.includes(q.id));
    state.currentQuestionIndex = (cadernoState && cadernoState.lastQuestionIndex < state.filteredQuestions.length) ? cadernoState.lastQuestionIndex : 0;
    state.sessionStats = [];
    
    displayQuestion();
}

function renderFolderContentView(folder) {
    DOM.cadernosViewTitle.textContent = folder.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.remove('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    const cadernosInFolder = state.userCadernos.filter(c => c.folderId === state.currentFolderId);
    if (cadernosInFolder.length > 0) {
        DOM.savedCadernosListContainer.innerHTML = cadernosInFolder.map(caderno => `
            <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm caderno-item mb-2" data-caderno-id="${caderno.id}">
               <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                    <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                    <div>
                        <h4 class="font-bold text-lg">${caderno.name}</h4>
                        <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="estudar-caderno-btn bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600" data-id="${caderno.id}">Estudar</button>
                    <button class="stats-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                    <button class="edit-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                    <button class="delete-caderno-btn text-red-500 hover:text-red-700" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </div>
            </div>
        `).join('');
    } else {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno nesta pasta ainda. Clique em "Adicionar Caderno" para criar um.</p>';
    }
}

function renderRootCadernosView() {
    DOM.cadernosViewTitle.textContent = 'Meus Cadernos';
    DOM.backToFoldersBtn.classList.add('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.remove('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    const unfiledCadernos = state.userCadernos.filter(c => !c.folderId);
    let html = '';

    if (state.userFolders.length === 0 && unfiledCadernos.length === 0) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno ou pasta criada ainda.</p>';
        return;
    }

    state.userFolders.forEach(folder => {
        const folderCadernosCount = state.userCadernos.filter(c => c.folderId === folder.id).length;
        html += `
            <div class="bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition folder-item mb-2" data-folder-id="${folder.id}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                        <i class="fas fa-folder text-yellow-500 text-2xl mr-4"></i>
                        <div>
                            <span class="font-bold text-lg">${folder.name}</span>
                            <p class="text-sm text-gray-500">${folderCadernosCount} caderno(s)</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1">
                         <button class="stats-folder-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                         <button class="edit-folder-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                         <button class="delete-folder-btn text-gray-400 hover:text-red-600 p-2 rounded-full" data-id="${folder.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                         <i class="fas fa-chevron-right text-gray-400 ml-2"></i>
                    </div>
                </div>
            </div>`;
    });

    if (unfiledCadernos.length > 0) {
        if (state.userFolders.length > 0) {
            html += '<h3 class="mt-6 mb-2 text-md font-semibold text-gray-600">Cadernos sem Pasta</h3>';
        }
        unfiledCadernos.forEach(caderno => {
            html += `
                 <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mt-2 caderno-item mb-2" data-caderno-id="${caderno.id}">
                     <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                        <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                        <div>
                            <h4 class="font-bold text-lg">${caderno.name}</h4>
                            <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="estudar-caderno-btn bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600" data-id="${caderno.id}">Estudar</button>
                        <button class="stats-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                        <button class="edit-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                        <button class="delete-caderno-btn text-red-500 hover:text-red-700" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                    </div>
                </div>`;
        });
    }
    DOM.savedCadernosListContainer.innerHTML = html;
}

export function renderFoldersAndCadernos() {
    DOM.savedCadernosListContainer.innerHTML = '';
    if (!state.currentUser) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500">Por favor, faça login para ver os seus cadernos.</p>';
        return;
    }

    if (state.currentCadernoId) {
        const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
        if (!caderno) { state.currentCadernoId = null; renderFoldersAndCadernos(); return; }
        renderCadernoContentView(caderno);

    } else if (state.currentFolderId) {
        const folder = state.userFolders.find(f => f.id === state.currentFolderId);
        if (!folder) { state.currentFolderId = null; renderFoldersAndCadernos(); return; }
        renderFolderContentView(folder);

    } else {
        renderRootCadernosView();
    }
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


export async function handleCadernoListClick(event) {
    const target = event.target;
    if (!state.currentUser) return;

    const openAction = target.closest('[data-action="open"]');
    const folderItem = target.closest('.folder-item');
    const cadernoItem = target.closest('.caderno-item');

    if (openAction && folderItem) {
        state.currentFolderId = folderItem.dataset.folderId;
        renderFoldersAndCadernos();
    } else if (openAction && cadernoItem) {
        state.currentCadernoId = cadernoItem.dataset.cadernoId;
        renderFoldersAndCadernos();
    } else if (target.closest('.edit-folder-btn')) {
        const btn = target.closest('.edit-folder-btn');
        openNameModal('folder', btn.dataset.id, btn.dataset.name);
    } else if (target.closest('.edit-caderno-btn')) {
        const btn = target.closest('.edit-caderno-btn');
        openNameModal('caderno', btn.dataset.id, btn.dataset.name);
    } else if (target.closest('.delete-folder-btn')) {
        const btn = target.closest('.delete-folder-btn');
        openConfirmationModal('folder', btn.dataset.id);
    } else if (target.closest('.delete-caderno-btn')) {
        const btn = target.closest('.delete-caderno-btn');
        openConfirmationModal('caderno', btn.dataset.id);
    } else if (target.closest('.stats-caderno-btn')) {
        const btn = target.closest('.stats-caderno-btn');
        showItemStatsModal(btn.dataset.id, 'caderno', btn.dataset.name);
    } else if (target.closest('.stats-folder-btn')) {
        const btn = target.closest('.stats-folder-btn');
        showItemStatsModal(btn.dataset.id, 'folder', btn.dataset.name);
    } else if (target.closest('.remove-question-btn')) {
        const questionIdToRemove = target.closest('.remove-question-btn').dataset.questionId;
        const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', state.currentCadernoId);
        await updateDoc(cadernoRef, { questionIds: arrayRemove(questionIdToRemove) });
    }
}

export function handleBackToFolders() {
    if (state.currentCadernoId) {
        state.currentCadernoId = null;
        renderFoldersAndCadernos();
    } else if (state.currentFolderId) {
        state.currentFolderId = null;
        renderFoldersAndCadernos();
    }
}

export function handleAddQuestionsToCaderno() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) return;

    state.isAddingQuestionsMode = { active: true, cadernoId: state.currentCadernoId };
    DOM.addQuestionsBanner.classList.remove('hidden');
    DOM.addQuestionsBannerText.textContent = `Selecione questões para adicionar ao caderno "${caderno.name}".`;
    navigateToView('vade-mecum-view');
}


export function handleCancelAddQuestions() {
    exitAddMode();
    navigateToView('cadernos-view');
}

