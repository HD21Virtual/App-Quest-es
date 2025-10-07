import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToView } from '../ui/navigation.js';
import { displayQuestion } from './question-viewer.js';
import { generateStatsForQuestions } from './stats.js';
import { showItemStatsModal } from '../ui/modal.js';
import { applyFilters } from './filter.js';
import { removeQuestionIdFromCaderno } from '../services/firestore.js';

async function renderCadernoContentView() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) { 
        setState('currentCadernoId', null);
        await renderFoldersAndCadernos(); 
        return; 
    }

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

    setState('filteredQuestions', state.allQuestions.filter(q => caderno.questionIds.includes(q.id)));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    const newIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    setState('currentQuestionIndex', newIndex);
    
    setState('sessionStats', []);
    await displayQuestion();
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
        // ... rendering logic for folders
    });

    if (unfiledCadernos.length > 0) {
        // ... rendering logic for unfiled cadernos
    }
}


export async function renderFoldersAndCadernos() {
    DOM.savedCadernosListContainer.innerHTML = '';

    if (state.currentCadernoId) {
        await renderCadernoContentView();
    } else if (state.currentFolderId) {
        // renderFolderContentView();
    } else {
        renderRootCadernosView();
    }
}

export function handleFolderItemClick(event) {
    const actionTarget = event.target.closest('[data-action="open"]');
    if (actionTarget) {
        const folderItem = event.target.closest('.folder-item');
        if (folderItem) {
            setState('currentFolderId', folderItem.dataset.folderId);
            renderFoldersAndCadernos();
        }
    }
    // Handle other actions like edit, delete, stats
}

export function handleCadernoItemClick(event) {
    const actionTarget = event.target.closest('[data-action="open"]');
    if (actionTarget) {
        const cadernoItem = event.target.closest('.caderno-item');
        if (cadernoItem) {
            setState('currentCadernoId', cadernoItem.dataset.cadernoId);
            renderFoldersAndCadernos();
        }
    }
    // Handle other actions
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

export function exitAddMode() {
    if (state.isAddingQuestionsMode.active) {
        setState('isAddingQuestionsMode', { active: false, cadernoId: null });
        DOM.addQuestionsBanner.classList.add('hidden');
        DOM.filterBtn.textContent = 'Filtrar questões';
        DOM.filterBtn.disabled = false;
        
        const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
        if (mainContentContainer) mainContentContainer.classList.remove('hidden');
    }
}

export function cancelAddQuestions() {
    exitAddMode();
    navigateToView('cadernos-view');
}

export async function removeQuestionFromCaderno(questionId) {
    if (!state.currentCadernoId || !state.currentUser) return;
    await removeQuestionIdFromCaderno(state.currentCadernoId, questionId);
}

