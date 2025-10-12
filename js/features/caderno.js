import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToPage } from '../ui/navigation.js';
import { displayQuestion } from './question-viewer.js';
import { generateStatsForQuestions } from './stats.js';
import { showItemStatsModal, openNameModal } from '../ui/modal.js';
import { applyFilters } from './filter.js';
import { removeQuestionIdFromCaderno as removeQuestionIdFromFirestore, addQuestionIdsToCaderno as addQuestionIdsToFirestore } from '../services/firestore.js';

// Renders the view when inside a specific notebook, showing the question solver UI.
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

    // CORREÇÃO: Esconde a lista de cadernos e mostra a área de resolução de questões.
    DOM.savedCadernosListContainer.classList.add('hidden');
    if (DOM.cadernoSolverView) DOM.cadernoSolverView.classList.remove('hidden');


    // Filters questions to show only those belonging to the current notebook.
    setState('filteredQuestions', state.allQuestions.filter(q => caderno.questionIds.includes(q.id)));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    const newIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    setState('currentQuestionIndex', newIndex);
    
    // Resets session stats and displays the first (or last saved) question.
    setState('sessionStats', []);
    await displayQuestion();
}

// Renders the view when inside a specific folder, showing the notebooks within it.
function renderFolderContentView() {
    const folder = state.userFolders.find(f => f.id === state.currentFolderId);
    if (!folder) { 
        setState('currentFolderId', null);
        renderFoldersAndCadernos(); 
        return; 
    }

    // CORREÇÃO: Garante que a view de questões do caderno esteja escondida
    if (DOM.cadernoSolverView) DOM.cadernoSolverView.classList.add('hidden');
    DOM.savedCadernosListContainer.classList.remove('hidden');

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
                        <p class="text-sm text-gray-500">${caderno.questionIds ? caderno.questionIds.length : 0} questões</p>
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
        DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno nesta pasta ainda. Clique em "Adicionar Caderno" para criar um.</p>';
    }
}

// Renders the root view of the "Cadernos" tab, showing all folders and unfiled notebooks.
function renderRootCadernosView() {
    // CORREÇÃO: Garante que a view de questões do caderno esteja escondida
    if (DOM.cadernoSolverView) DOM.cadernoSolverView.classList.add('hidden');
    DOM.savedCadernosListContainer.classList.remove('hidden');

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

    // Render folders
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

    // Render unfiled cadernos
    if (unfiledCadernos.length > 0) {
        if (state.userFolders.length > 0) { 
            html += '<h3 class="mt-6 mb-2 text-md font-semibold text-gray-600">Cadernos sem Pasta</h3>'; 
        }
        unfiledCadernos.forEach(caderno => {
            html += `
                <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm caderno-item mb-2" data-caderno-id="${caderno.id}">
                     <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                        <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                        <div>
                            <h4 class="font-bold text-lg">${caderno.name}</h4>
                            <p class="text-sm text-gray-500">${caderno.questionIds ? caderno.questionIds.length : 0} questões</p>
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
    DOM.savedCadernosListContainer.innerHTML = html;
}


// Main function to control the rendering of the "Cadernos" tab view.
export async function renderFoldersAndCadernos() {
    // CORREÇÃO: Adicionado guard clause para evitar erro em páginas sem o container de cadernos.
    if (!DOM.savedCadernosListContainer) {
        return;
    }
    DOM.savedCadernosListContainer.innerHTML = '';

    if (state.currentCadernoId) {
        await renderCadernoContentView();
    } else if (state.currentFolderId) {
        renderFolderContentView();
    } else {
        renderRootCadernosView();
    }
}

// Handles clicks on folder items to open them, edit, delete, or view stats.
export function handleFolderItemClick(event) {
    const folderItem = event.target.closest('.folder-item');
    if (!folderItem) return;

    const folderId = folderItem.dataset.folderId;
    const folder = state.userFolders.find(f => f.id === folderId);
    if (!folder) return;

    // Handle opening the folder
    if (event.target.closest('[data-action="open"]')) {
        setState('currentFolderId', folderId);
        renderFoldersAndCadernos();
        return;
    }

    // Handle viewing stats
    if (event.target.closest('.stats-folder-btn')) {
        showItemStatsModal(folderId, 'folder', folder.name);
        return;
    }

    // Handle editing
    if (event.target.closest('.edit-folder-btn')) {
        openNameModal('folder', folderId, folder.name);
        return;
    }
    
    // Handle deleting
    if (event.target.closest('.delete-folder-btn')) {
        setState('deletingId', folderId);
        setState('deletingType', 'folder');
        DOM.confirmationModalTitle.textContent = `Excluir Pasta`;
        DOM.confirmationModalText.innerHTML = `Deseja excluir a pasta <strong>"${folder.name}"</strong>? <br><br> <span class="font-bold text-red-600">Todos os cadernos dentro dela também serão excluídos.</span>`;
        DOM.confirmationModal.classList.remove('hidden');
        return;
    }
}

// Handles clicks on notebook items to open them, edit, delete, or view stats.
export function handleCadernoItemClick(event) {
    const cadernoItem = event.target.closest('.caderno-item');
    if (!cadernoItem) return;

    const cadernoId = cadernoItem.dataset.cadernoId;
    const caderno = state.userCadernos.find(c => c.id === cadernoId);
    if(!caderno) return;
    
    // Handle opening the notebook
    if (event.target.closest('[data-action="open"]')) {
        setState('currentCadernoId', cadernoId);
        renderFoldersAndCadernos();
        return;
    }
    
    // Handle viewing stats
    if (event.target.closest('.stats-caderno-btn')) {
        showItemStatsModal(cadernoId, 'caderno', caderno.name);
        return;
    }
    
    // Handle editing
    if (event.target.closest('.edit-caderno-btn')) {
        openNameModal('caderno', cadernoId, caderno.name);
        return;
    }
    
    // Handle deleting
    if (event.target.closest('.delete-caderno-btn')) {
        setState('deletingId', cadernoId);
        setState('deletingType', 'caderno');
        DOM.confirmationModalTitle.textContent = `Excluir Caderno`;
        DOM.confirmationModalText.innerHTML = `Deseja excluir o caderno <strong>"${caderno.name}"</strong>?`;
        DOM.confirmationModal.classList.remove('hidden');
        return;
    }
}

// Handles the "Back" button to navigate up the folder/notebook hierarchy.
export function handleBackToFolders() {
    if (state.currentCadernoId) {
        // When going back from a caderno, go to its folder if it has one
        const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
        setState('currentCadernoId', null);
        if(caderno && caderno.folderId) {
            setState('currentFolderId', caderno.folderId);
        } else {
            setState('currentFolderId', null);
        }
    } else if (state.currentFolderId) {
        setState('currentFolderId', null);
    }
    renderFoldersAndCadernos();
}

// Initiates the mode to add questions to the currently opened notebook.
export function handleAddQuestionsToCaderno() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) return;

    setState('isAddingQuestionsMode', { active: true, cadernoId: state.currentCadernoId });
    // Navigate to the questions page to start adding
    navigateToPage('vade-mecum-view');
}


// Exits the "add questions" mode.
export function exitAddMode() {
    if (state.isAddingQuestionsMode.active) {
        setState('isAddingQuestionsMode', { active: false, cadernoId: null });
        if (DOM.addQuestionsBanner) DOM.addQuestionsBanner.classList.add('hidden');
        if (DOM.filterBtn) {
            DOM.filterBtn.textContent = 'Filtrar questões';
            DOM.filterBtn.disabled = false;
        }
        
        if(DOM.vadeMecumContentArea) {
            const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
            if (mainContentContainer) mainContentContainer.classList.remove('hidden');
        }
    }
}

// Cancels the "add questions" process and returns to the notebooks view.
export function cancelAddQuestions() {
    exitAddMode();
    navigateToPage('cadernos-view');
}

// Adds filtered questions to the current notebook.
export async function addFilteredQuestionsToCaderno() {
    if (!state.isAddingQuestionsMode.active || !state.currentUser) return;

    const { cadernoId } = state.isAddingQuestionsMode;
    const caderno = state.userCadernos.find(c => c.id === cadernoId);
    if (!caderno) return;

    // Only get IDs of questions not already in the notebook
    const existingIds = new Set(caderno.questionIds || []);
    const newQuestionIds = state.filteredQuestions
        .map(q => q.id)
        .filter(id => !existingIds.has(id));

    if (newQuestionIds.length > 0) {
        await addQuestionIdsToFirestore(cadernoId, newQuestionIds);
    }
    
    exitAddMode();
    setState('isNavigatingBackFromAddMode', true); // Flag to prevent view reset
    setState('currentCadernoId', cadernoId);
    navigateToPage('cadernos-view');
}

// Removes a specific question from the currently opened notebook.
export async function removeQuestionFromCaderno(questionId) {
    if (!state.currentCadernoId || !state.currentUser) return;
    await removeQuestionIdFromFirestore(state.currentCadernoId, questionId);
}
