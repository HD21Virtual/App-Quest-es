import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { displayQuestion, handleVadeMecumTabs } from './question-viewer.js';
import { generateStatsForQuestions, updateStatsPanel } from './stats.js';
import { openModal } from '../ui/modal.js';
import { navigateToView } from '../ui/navigation.js';

/**
 * @file js/features/caderno.js
 * @description Lida com a lógica da visualização de Cadernos, incluindo a renderização
 * de pastas, cadernos, e a navegação entre eles.
 */

export function renderFoldersAndCadernos() {
    DOM.savedCadernosListContainer.innerHTML = '';

    if (state.currentCadernoId) {
        renderSingleCadernoView();
    } else if (state.currentFolderId) {
        renderFolderContentView();
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

    const unfiledCadernos = state.userCadernos.filter(c => !c.folderId);
    if (state.userFolders.length === 0 && unfiledCadernos.length === 0) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 p-4">Nenhum caderno ou pasta criada.</p>';
        return;
    }

    state.userFolders.forEach(folder => {
        const count = state.userCadernos.filter(c => c.folderId === folder.id).length;
        DOM.savedCadernosListContainer.innerHTML += createFolderHtml(folder, count);
    });

    if (unfiledCadernos.length > 0) {
        if(state.userFolders.length > 0) DOM.savedCadernosListContainer.innerHTML += '<h3 class="mt-4 font-semibold text-gray-600">Cadernos sem Pasta</h3>';
        unfiledCadernos.forEach(caderno => {
            DOM.savedCadernosListContainer.innerHTML += createCadernoHtml(caderno);
        });
    }
}

function renderFolderContentView() {
    const folder = state.userFolders.find(f => f.id === state.currentFolderId);
    if (!folder) { state.currentFolderId = null; renderFoldersAndCadernos(); return; }

    DOM.cadernosViewTitle.textContent = folder.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.remove('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');

    const cadernosInFolder = state.userCadernos.filter(c => c.folderId === state.currentFolderId);
    if (cadernosInFolder.length > 0) {
        DOM.savedCadernosListContainer.innerHTML = cadernosInFolder.map(createCadernoHtml).join('');
    } else {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 p-4">Nenhum caderno nesta pasta.</p>';
    }
}

async function renderSingleCadernoView() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) { state.currentCadernoId = null; renderFoldersAndCadernos(); return; }
    
    DOM.cadernosViewTitle.textContent = caderno.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');

    const vadeMecumContentHtml = DOM.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
    DOM.savedCadernosListContainer.innerHTML = vadeMecumContentHtml;
    
    // Attach listener for the newly created tabs
    const tabsContainerCaderno = DOM.savedCadernosListContainer.querySelector('#tabs-container');
    tabsContainerCaderno.addEventListener('click', handleVadeMecumTabs);

    const statsView = DOM.savedCadernosListContainer.querySelector('#stats-view');
    const statsContainer = statsView.querySelector('#stats-content');
    statsContainer.innerHTML = `<p class="text-center p-4">Carregando estatísticas...</p>`;
    const historicalStats = await generateStatsForQuestions(caderno.questionIds);
    updateStatsPanel(statsContainer, historicalStats);
    
    state.filteredQuestions = state.allQuestions.filter(q => caderno.questionIds.includes(q.id));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    state.currentQuestionIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    
    state.sessionStats = [];
    displayQuestion();
}


// --- HTML Generators ---

function createFolderHtml(folder, count) {
    return `
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
                    <button class="edit-btn text-gray-400 hover:text-blue-600 p-2" data-type="folder" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                    <button class="delete-btn text-gray-400 hover:text-red-600 p-2" data-type="folder" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </div>
            </div>
        </div>`;
}

function createCadernoHtml(caderno) {
    return `
        <div class="bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition caderno-item mb-2" data-caderno-id="${caderno.id}">
            <div class="flex justify-between items-center">
                <div class="flex items-center cursor-pointer flex-grow" data-action="open-caderno">
                    <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                    <div>
                        <h4 class="font-bold text-lg">${caderno.name}</h4>
                        <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="stats-btn bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-300" data-type="caderno" data-id="${caderno.id}" data-name="${caderno.name}">Ver Stats</button>
                    <button class="edit-btn text-gray-400 hover:text-blue-600 p-2" data-type="caderno" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                    <button class="delete-btn text-gray-400 hover:text-red-600 p-2" data-type="caderno" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </div>
            </div>
        </div>`;
}


// --- Event Handlers ---

export function handleCadernoViewClick(event) {
    const openFolder = event.target.closest('[data-action="open-folder"]');
    const openCaderno = event.target.closest('[data-action="open-caderno"]');
    const editBtn = event.target.closest('.edit-btn');
    const deleteBtn = event.target.closest('.delete-btn');
    const statsBtn = event.target.closest('.stats-btn');

    if (openFolder) {
        state.currentFolderId = openFolder.closest('.folder-item').dataset.folderId;
        renderFoldersAndCadernos();
    } else if (openCaderno) {
        state.currentCadernoId = openCaderno.closest('.caderno-item').dataset.cadernoId;
        renderFoldersAndCadernos();
    } else if (editBtn) {
        openModal('name', { type: editBtn.dataset.type, id: editBtn.dataset.id, name: editBtn.dataset.name });
    } else if (deleteBtn) {
        openModal('confirmation', { type: deleteBtn.dataset.type, id: deleteBtn.dataset.id, name: deleteBtn.dataset.name });
    } else if (statsBtn) {
        openModal('stats', { type: statsBtn.dataset.type, id: statsBtn.dataset.id, name: statsBtn.dataset.name });
    }
}

export function handleBackToFolders() {
    if (state.currentCadernoId) {
        state.currentCadernoId = null;
    } else if (state.currentFolderId) {
        state.currentFolderId = null;
    }
    renderFoldersAndCadernos();
}

export function handleAddQuestionsToCaderno() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) return;
    
    state.isAddingQuestionsMode = { active: true, cadernoId: state.currentCadernoId };
    DOM.addQuestionsBanner.classList.remove('hidden');
    DOM.addQuestionsBannerText.textContent = `Selecione questões para adicionar ao caderno "${caderno.name}".`;
    navigateToView('vade-mecum-view', { isProgrammatic: true });
}

export function handleCancelAddQuestions() {
    state.isAddingQuestionsMode = { active: false, cadernoId: null };
    DOM.addQuestionsBanner.classList.add('hidden');
    navigateToView('cadernos-view');
}

