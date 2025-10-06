import {
    collection,
    query,
    orderBy,
    doc,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { generateStatsForQuestions } from './stats.js';
import { showItemStatsModal } from '../ui/modal.js';
import { displayQuestion } from './question-viewer.js';
import { removeQuestionIdFromCaderno } from '../services/firestore.js';

function getCadernoContentHTML() {
    const mainContentHtml = DOM.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
    return mainContentHtml;
}

function setupCadernoViewTabs(container) {
    container.addEventListener('click', async (event) => {
        const targetTab = event.target.dataset.tab;
        if (targetTab) {
            container.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            const questionView = container.querySelector('#question-view');
            const statsView = container.querySelector('#stats-view');

            if (targetTab === 'question') {
                questionView.classList.remove('hidden');
                statsView.classList.add('hidden');
            } else if (targetTab === 'stats') {
                questionView.classList.add('hidden');
                statsView.classList.remove('hidden');
                const statsContainer = statsView.querySelector('#stats-content');
                statsContainer.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i></div>`;
                const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
                if (caderno && caderno.questionIds) {
                    const historicalStats = await generateStatsForQuestions(caderno.questionIds);
                    updateStatsPanel(statsContainer, historicalStats);
                }
            }
        }
    });
}

function renderSingleCadernoView(caderno) {
    DOM.cadernosViewTitle.textContent = caderno.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');

    DOM.savedCadernosListContainer.innerHTML = getCadernoContentHTML();
    setupCadernoViewTabs(DOM.savedCadernosListContainer.querySelector('#tabs-container'));

    setState('filteredQuestions', state.allQuestions.filter(q => caderno.questionIds.includes(q.id)));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    const lastIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    setState('currentQuestionIndex', lastIndex);
    setState('sessionStats', []);
    displayQuestion();
}

function renderCadernosInFolderView(folder) {
    DOM.cadernosViewTitle.textContent = folder.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.remove('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    const cadernosInFolder = state.userCadernos.filter(c => c.folderId === state.currentFolderId);
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
                    <button class="stats-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                    <button class="edit-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                    <button class="delete-caderno-btn text-red-500 hover:text-red-700 p-2 rounded-full" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </div>
            </div>
        `).join('');
    } else {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500">Nenhum caderno nesta pasta.</p>';
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

    state.userFolders.forEach(folder => {
        const count = state.userCadernos.filter(c => c.folderId === folder.id).length;
        html += `
            <div class="bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition folder-item mb-2" data-folder-id="${folder.id}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center cursor-pointer flex-grow" data-action="open-folder">
                        <i class="fas fa-folder text-yellow-500 text-2xl mr-4"></i>
                        <div>
                            <span class="font-bold text-lg">${folder.name}</span>
                            <p class="text-sm text-gray-500">${count} caderno(s)</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1">
                         <button class="stats-folder-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                         <button class="edit-folder-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                         <button class="delete-folder-btn text-gray-400 hover:text-red-600 p-2 rounded-full" data-id="${folder.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                    </div>
                </div>
            </div>`;
    });

    if (unfiledCadernos.length > 0) {
        if (state.userFolders.length > 0) html += '<h3 class="mt-6 mb-2 text-md font-semibold text-gray-600">Cadernos sem Pasta</h3>';
        unfiledCadernos.forEach(caderno => {
            html += `
            <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm caderno-item mb-2" data-caderno-id="${caderno.id}">
               <div class="flex items-center cursor-pointer flex-grow" data-action="open-caderno">
                    <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                    <div>
                        <h4 class="font-bold text-lg">${caderno.name}</h4>
                        <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="stats-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                    <button class="edit-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                    <button class="delete-caderno-btn text-red-500 hover:text-red-700 p-2 rounded-full" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </div>
            </div>`;
        });
    }
    
    DOM.savedCadernosListContainer.innerHTML = html || '<p class="text-center text-gray-500">Nenhum caderno ou pasta criada.</p>';
}


export function renderFoldersAndCadernos() {
    DOM.savedCadernosListContainer.innerHTML = '';
    const { currentCadernoId, currentFolderId, userCadernos, userFolders } = state;

    if (currentCadernoId) {
        const caderno = userCadernos.find(c => c.id === currentCadernoId);
        if (caderno) renderSingleCadernoView(caderno);
        else setState('currentCadernoId', null);
    } else if (currentFolderId) {
        const folder = userFolders.find(f => f.id === currentFolderId);
        if (folder) renderCadernosInFolderView(folder);
        else setState('currentFolderId', null);
    } else {
        renderRootCadernosView();
    }
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

export function handleAddQuestionsToCaderno() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) return;

    setState('isAddingQuestionsMode', { active: true, cadernoId: state.currentCadernoId });
    DOM.addQuestionsBanner.classList.remove('hidden');
    DOM.addQuestionsBannerText.textContent = `Selecione questões para adicionar ao caderno "${caderno.name}".`;
    navigateToView('vade-mecum-view');
}

export function handleFolderItemClick(folderId) {
    setState('currentFolderId', folderId);
    renderFoldersAndCadernos();
}

export function handleCadernoItemClick(cadernoId) {
    setState('currentCadernoId', cadernoId);
    renderFoldersAndCadernos();
}

export function handleBackToFolders() {
    if (state.currentCadernoId) {
        setState('currentCadernoId', null);
    } else if (state.currentFolderId) {
        setState('currentFolderId', null);
    }
    renderFoldersAndCadernos();
}

export async function removeQuestionFromCaderno(questionId) {
    if (!state.currentUser || !state.currentCadernoId) return;
    await removeQuestionIdFromCaderno(state.currentCadernoId, questionId);
}

