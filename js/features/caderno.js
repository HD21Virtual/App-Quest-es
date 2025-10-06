import { collection, doc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { getQuestionHistory } from '../services/firestore.js';
import { showItemStatsModal, openNameModal } from '../ui/modal.js';
import { displayQuestion } from './question-viewer.js';
import { navigateToView } from '../ui/navigation.js';
import { updateStatsPanel } from './stats.js';

function renderSingleCadernoView(caderno) {
    DOM.cadernosViewTitle.textContent = caderno.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');

    const tempContainer = document.createElement('div');
    const mainContentHtml = DOM.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
    tempContainer.innerHTML = mainContentHtml;
    DOM.savedCadernosListContainer.appendChild(tempContainer.firstChild);

    const tabsContainerCaderno = DOM.savedCadernosListContainer.querySelector('#tabs-container');
    const questionView = DOM.savedCadernosListContainer.querySelector('#question-view');
    const statsView = DOM.savedCadernosListContainer.querySelector('#stats-view');
    const questionCounterTop = DOM.savedCadernosListContainer.querySelector('#question-counter-top');
    const questionInfoContainer = DOM.savedCadernosListContainer.querySelector('#question-info-container');
    const questionToolbar = DOM.savedCadernosListContainer.querySelector('#question-toolbar');

    tabsContainerCaderno.addEventListener('click', async (event) => {
        const targetTab = event.target.dataset.tab;
        if (targetTab) {
            tabsContainerCaderno.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            if (targetTab === 'question') {
                questionView.classList.remove('hidden');
                statsView.classList.add('hidden');
                if (questionCounterTop) questionCounterTop.classList.remove('hidden');
                if (questionInfoContainer) questionInfoContainer.classList.remove('hidden');
                if (questionToolbar) questionToolbar.classList.remove('hidden');
            } else if (targetTab === 'stats') {
                questionView.classList.add('hidden');
                statsView.classList.remove('hidden');
                if (questionCounterTop) questionCounterTop.classList.add('hidden');
                if (questionInfoContainer) questionInfoContainer.classList.add('hidden');
                if (questionToolbar) questionToolbar.classList.add('hidden');
                const statsContainer = statsView.querySelector('#stats-content');
                statsContainer.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i><p class="mt-2">Carregando histórico...</p></div>`;
                if (caderno && caderno.questionIds) {
                    const historicalStats = await getQuestionHistory(caderno.questionIds);
                    updateStatsPanel(statsContainer, historicalStats);
                }
            }
        }
    });

    setState('filteredQuestions', state.allQuestions.filter(q => caderno.questionIds.includes(q.id)));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    const lastIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    setState('currentQuestionIndex', lastIndex);
    setState('sessionStats', []);
    displayQuestion();
}

function renderSingleFolderView(folder) {
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

    if (state.userFolders.length === 0 && unfiledCadernos.length === 0) {
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno ou pasta criada ainda.</p>';
        return;
    }

    state.userFolders.forEach(folder => {
        const folderCadernosCount = state.userCadernos.filter(c => c.folderId === folder.id).length;
        const folderEl = document.createElement('div');
        folderEl.className = 'bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition folder-item mb-2';
        folderEl.dataset.folderId = folder.id;
        folderEl.dataset.action = "open";
        folderEl.innerHTML = `
           <div class="flex justify-between items-center">
               <div class="flex items-center cursor-pointer flex-grow">
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
           </div>`;
        DOM.savedCadernosListContainer.appendChild(folderEl);
    });

    if (unfiledCadernos.length > 0) {
        const unfiledContainer = document.createElement('div');
        if (state.userFolders.length > 0) { unfiledContainer.innerHTML = '<h3 class="mt-6 mb-2 text-md font-semibold text-gray-600">Cadernos sem Pasta</h3>'; }
        unfiledCadernos.forEach(caderno => {
            const cadernoEl = document.createElement('div');
            cadernoEl.className = 'flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mt-2 caderno-item mb-2';
            cadernoEl.dataset.cadernoId = caderno.id;
            cadernoEl.innerHTML = `
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
               </div>`;
            unfiledContainer.appendChild(cadernoEl);
        });
        DOM.savedCadernosListContainer.appendChild(unfiledContainer);
    }
}

export function renderFoldersAndCadernos() {
    DOM.savedCadernosListContainer.innerHTML = '';
    if (state.currentCadernoId) {
        const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
        if (!caderno) { setState('currentCadernoId', null); renderFoldersAndCadernos(); return; }
        renderSingleCadernoView(caderno);
    } else if (state.currentFolderId) {
        const folder = state.userFolders.find(f => f.id === state.currentFolderId);
        if (!folder) { setState('currentFolderId', null); renderFoldersAndCadernos(); return; }
        renderSingleFolderView(folder);
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

export function handleAddQuestionsToCaderno() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) return;
    
    setState('isAddingQuestionsMode', { active: true, cadernoId: state.currentCadernoId });
    DOM.addQuestionsBanner.classList.remove('hidden');
    DOM.addQuestionsBannerText.textContent = `Selecione questões para adicionar ao caderno "${caderno.name}".`;
    navigateToView('vade-mecum-view');
}

