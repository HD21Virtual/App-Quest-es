import { arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { generateStatsForQuestions, updateNavigation } from './stats.js';
import { showItemStatsModal } from '../ui/modal.js';
import { displayQuestion } from './question-viewer.js';
import { navigateToView } from "../ui/navigation.js";

function renderRootCadernosView() {
    DOM.cadernosViewTitle.textContent = 'Meus Cadernos';
    DOM.backToFoldersBtn.classList.add('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.remove('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    const unfiledCadernos = state.userCadernos.filter(c => !c.folderId);

    if (state.userFolders.length === 0 && unfiledCadernos.length === 0) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno ou pasta criada ainda.</p>';
        return;
    }

    let html = '';
    state.userFolders.forEach(folder => {
        const folderCadernosCount = state.userCadernos.filter(c => c.folderId === folder.id).length;
        html += `
            <div class="bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition folder-item mb-2" data-folder-id="${folder.id}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center cursor-pointer flex-grow" data-action="open-folder">
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
                    <div class="flex items-center cursor-pointer flex-grow" data-action="open-caderno">
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
                        <button class="delete-caderno-btn text-red-500 hover:text-red-700 p-2 rounded-full" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                    </div>
                </div>`;
        });
    }
    DOM.savedCadernosListContainer.innerHTML = html;
}

function renderFolderContentView(folder) {
    DOM.cadernosViewTitle.textContent = folder.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.remove('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    const cadernosInFolder = state.userCadernos.filter(c => c.folderId === folder.id);
    if (cadernosInFolder.length > 0) {
        DOM.savedCadernosListContainer.innerHTML = cadernosInFolder.map(caderno => `
            <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm caderno-item mb-2" data-caderno-id="${caderno.id}">
                <div class="flex items-center cursor-pointer flex-grow" data-action="open-caderno">
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
                    <button class="delete-caderno-btn text-red-500 hover:text-red-700 p-2 rounded-full" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </div>
            </div>
        `).join('');
    } else {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno nesta pasta ainda. Clique em "Adicionar Caderno" para criar um.</p>';
    }
}

async function renderCadernoContentView(caderno) {
    DOM.cadernosViewTitle.textContent = caderno.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');

    const mainContentHtml = DOM.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
    DOM.savedCadernosListContainer.innerHTML = mainContentHtml;

    setState('filteredQuestions', state.allQuestions.filter(q => caderno.questionIds.includes(q.id)));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    const lastIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    setState('currentQuestionIndex', lastIndex);
    setState('sessionStats', []);

    await displayQuestion();
}


export function renderFoldersAndCadernos() {
    DOM.savedCadernosListContainer.innerHTML = '';

    if (state.currentCadernoId) {
        const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
        if (!caderno) {
            setState('currentCadernoId', null);
            renderFoldersAndCadernos();
            return;
        }
        renderCadernoContentView(caderno);
    } else if (state.currentFolderId) {
        const folder = state.userFolders.find(f => f.id === state.currentFolderId);
        if (!folder) {
            setState('currentFolderId', null);
            renderFoldersAndCadernos();
            return;
        }
        renderFolderContentView(folder);
    } else {
        renderRootCadernosView();
    }
}


export function handleAddQuestionsToCaderno() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) return;
    
    setState('isAddingQuestionsMode', { active: true, cadernoId: state.currentCadernoId });
    DOM.addQuestionsBanner.classList.remove('hidden');
    DOM.addQuestionsBannerText.textContent = `Selecione questões para adicionar ao caderno "${caderno.name}".`;
    navigateToView('vade-mecum-view');
}

export function exitAddMode() {
    if (state.isAddingQuestionsMode.active) {
        setState('isAddingQuestionsMode', { active: false, cadernoId: null });
        DOM.addQuestionsBanner.classList.add('hidden');
        DOM.filterBtn.textContent = 'Filtrar questões';
        DOM.filterBtn.disabled = false;
        
        const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
        if(mainContentContainer) mainContentContainer.classList.remove('hidden');
    }
}

export function cancelAddQuestions() {
    exitAddMode();
    navigateToView('cadernos-view');
}


export async function handleFolderItemClick(event) {
    const folderItem = event.target.closest('[data-action="open-folder"]');
    if (folderItem) {
        setState('currentFolderId', folderItem.closest('.folder-item').dataset.folderId);
        renderFoldersAndCadernos();
    }
}

export async function handleCadernoItemClick(event) {
    const cadernoItem = event.target.closest('[data-action="open-caderno"]');
    if (cadernoItem) {
        setState('currentCadernoId', cadernoItem.closest('.caderno-item').dataset.cadernoId);
        renderFoldersAndCadernos();
    }

    const studyBtn = event.target.closest('.estudar-caderno-btn');
    if (studyBtn) {
        const cadernoId = studyBtn.dataset.id;
        const cadernoToLoad = state.userCadernos.find(c => c.id === cadernoId);
        if (cadernoToLoad && cadernoToLoad.questionIds.length > 0) {
            navigateToView('vade-mecum-view');
            setState('filteredQuestions', state.allQuestions.filter(q => cadernoToLoad.questionIds.includes(q.id)));
            setState('currentQuestionIndex', 0);
            setState('sessionStats', []);
            await displayQuestion();
            DOM.selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Estudando o caderno: <strong>${cadernoToLoad.name}</strong></span>`;
        }
    }
}

export function handleBackToFolders() {
    if (state.currentCadernoId) {
        setState('currentCadernoId', null);
        renderFoldersAndCadernos();
    } else if (state.currentFolderId) {
        setState('currentFolderId', null);
        renderFoldersAndCadernos();
    }
}

export async function removeQuestionFromCaderno(questionId) {
    if (state.currentCadernoId && questionId) {
        // Here you would call the firestore service to update the document
        // For now, let's just optimistically update the UI
        const { removeQuestionIdFromCaderno } = await import('../services/firestore.js');
        await removeQuestionIdFromCaderno(state.currentCadernoId, questionId);

        // Refresh the question list locally
        setState('filteredQuestions', state.filteredQuestions.filter(q => q.id !== questionId));
        
        // Adjust index if needed
        if (state.currentQuestionIndex >= state.filteredQuestions.length && state.filteredQuestions.length > 0) {
            setState('currentQuestionIndex', state.filteredQuestions.length - 1);
        }
        
        await displayQuestion();
        updateNavigation();
    }
}

