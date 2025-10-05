import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { displayQuestion } from './question-viewer.js';
import { switchView } from '../ui/navigation.js';
import { openModal } from '../ui/modal.js';
import { updateItem } from '../services/firestore.js';

/**
 * @file js/features/caderno.js
 * @description Gerencia a lógica da view "Meus Cadernos", incluindo a renderização
 * de pastas, cadernos e a navegação entre eles.
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

function renderSingleCadernoView() {
    const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
    if (!caderno) { state.currentCadernoId = null; renderFoldersAndCadernos(); return; }

    DOM.cadernosViewTitle.textContent = caderno.name;
    DOM.backToFoldersBtn.classList.remove('hidden');
    DOM.addQuestionsToCadernoBtn.classList.remove('hidden');
    DOM.createFolderBtn.classList.add('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    
    // Reutiliza a estrutura do vade mecum para resolver questões
    const vadeMecumContent = DOM.vadeMecumView.querySelector('#vade-mecum-content-area').innerHTML;
    DOM.savedCadernosListContainer.innerHTML = `<div id="vade-mecum-content-area">${vadeMecumContent}</div>`;
    
    state.filteredQuestions = state.allQuestions.filter(q => caderno.questionIds.includes(q.id));
    const savedState = state.userCadernoState.get(state.currentCadernoId);
    state.currentQuestionIndex = (savedState && savedState.lastQuestionIndex < state.filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
    
    state.sessionStats = [];
    displayQuestion();
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
    DOM.savedCadernosListContainer.innerHTML = cadernosInFolder.length > 0
        ? cadernosInFolder.map(caderno => createCadernoHTML(caderno)).join('')
        : '<p class="text-center text-gray-500">Nenhum caderno nesta pasta.</p>';
}

function renderRootCadernosView() {
    DOM.cadernosViewTitle.textContent = 'Meus Cadernos';
    DOM.backToFoldersBtn.classList.add('hidden');
    DOM.addCadernoToFolderBtn.classList.add('hidden');
    DOM.createFolderBtn.classList.remove('hidden');
    DOM.addQuestionsToCadernoBtn.classList.add('hidden');
    
    const unfiledCadernos = state.userCadernos.filter(c => !c.folderId);
    let html = state.userFolders.map(folder => createFolderHTML(folder)).join('');
    if (unfiledCadernos.length > 0) {
        html += '<h3 class="mt-6 mb-2 text-md font-semibold text-gray-600">Cadernos sem Pasta</h3>';
        html += unfiledCadernos.map(caderno => createCadernoHTML(caderno)).join('');
    }
    DOM.savedCadernosListContainer.innerHTML = html || '<p class="text-center text-gray-500">Nenhum caderno ou pasta criada.</p>';
}

export function handleCadernoViewClick(event) {
    const target = event.target;
    const folderItem = target.closest('.folder-item[data-action="open"]');
    const cadernoItem = target.closest('.caderno-item[data-action="open"]');
    const editBtn = target.closest('[data-action="edit"]');
    const deleteBtn = target.closest('[data-action="delete"]');
    
    if (folderItem) {
        state.currentFolderId = folderItem.parentElement.dataset.folderId;
        renderFoldersAndCadernos();
    } else if (cadernoItem) {
        state.currentCadernoId = cadernoItem.parentElement.dataset.cadernoId;
        renderFoldersAndCadernos();
    } else if (editBtn) {
        const { id, name, type } = editBtn.dataset;
        openModal('name', { id, name, type });
    } else if (deleteBtn) {
        const { id, name, type } = deleteBtn.dataset;
        const text = type === 'folder' 
            ? `Deseja excluir a pasta <strong>"${name}"</strong> e todos os seus cadernos?`
            : `Deseja excluir o caderno <strong>"${name}"</strong>?`;
        openModal('confirmation', { id, name, type, title: `Excluir ${type}`, text });
    } else if (target.closest('.remove-question-btn')) {
        const questionIdToRemove = target.dataset.questionId;
        updateItem('caderno', state.currentCadernoId, { questionIds: arrayRemove(questionIdToRemove) });
    }
}

export function handleBackToFolders() {
    if (state.currentCadernoId) {
        state.currentCadernoId = null;
        // Se estava dentro de uma pasta, currentFolderId ainda estará setado
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
    switchView('vade-mecum-view');
}

export function handleCancelAddQuestions() {
    const targetCadernoId = state.isAddingQuestionsMode.cadernoId;
    exitAddMode();
    state.isNavigatingBackFromAddMode = true;
    state.currentCadernoId = targetCadernoId;
    switchView('cadernos-view');
}

export function exitAddMode() {
    state.isAddingQuestionsMode = { active: false, cadernoId: null };
    DOM.addQuestionsBanner.classList.add('hidden');
    DOM.filterBtn.textContent = 'Filtrar questões';
    DOM.filterBtn.disabled = false;
    DOM.vadeMecumView.querySelector('#tabs-and-main-content').classList.remove('hidden');
}


// --- HTML Templates ---
const createFolderHTML = (folder) => `
    <div class="bg-white rounded-lg shadow-sm p-4 mb-2" data-folder-id="${folder.id}">
        <div class="flex justify-between items-center">
            <div class="flex items-center cursor-pointer flex-grow folder-item" data-action="open">
                <i class="fas fa-folder text-yellow-500 text-2xl mr-4"></i>
                <span class="font-bold text-lg">${folder.name}</span>
            </div>
            <div class="flex items-center space-x-1">
                <button data-action="edit" data-id="${folder.id}" data-name="${folder.name}" data-type="folder"><i class="fas fa-pencil-alt"></i></button>
                <button data-action="delete" data-id="${folder.id}" data-name="${folder.name}" data-type="folder"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    </div>`;

const createCadernoHTML = (caderno) => `
    <div class="bg-white rounded-lg shadow-sm p-4 mb-2" data-caderno-id="${caderno.id}">
        <div class="flex justify-between items-center">
            <div class="flex items-center cursor-pointer flex-grow caderno-item" data-action="open">
                <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                <div>
                    <h4 class="font-bold text-lg">${caderno.name}</h4>
                    <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                </div>
            </div>
             <div class="flex items-center space-x-1">
                <button data-action="edit" data-id="${caderno.id}" data-name="${caderno.name}" data-type="caderno"><i class="fas fa-pencil-alt"></i></button>
                <button data-action="delete" data-id="${caderno.id}" data-name="${caderno.name}" data-type="caderno"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    </div>`;
