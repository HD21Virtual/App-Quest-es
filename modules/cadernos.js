import { getState, setState } from '../services/state.js';
import { db } from '../config/firebase.js';
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp, arrayUnion, arrayRemove, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { elements, navigateToView, showConfirmationModal, showItemStats, showNameModal } from './ui.js';
import { displayQuestion } from './questions.js';
import { updateStatsPanel, generateStatsForQuestions } from './stats.js';

/**
 * Renderiza a visualização de pastas e cadernos com base no estado atual.
 */
export async function renderFoldersAndCadernos() {
    const { userCadernos, userFolders, currentCadernoId, currentFolderId, allQuestions, userCadernoState } = getState();
    elements.savedCadernosListContainer.innerHTML = '';

    if (currentCadernoId) {
        // --- Visualização de um caderno específico ---
        const caderno = userCadernos.find(c => c.id === currentCadernoId);
        if (!caderno) {
            setState({ currentCadernoId: null });
            await renderFoldersAndCadernos();
            return;
        }

        elements.cadernosViewTitle.textContent = caderno.name;
        elements.backToFoldersBtn.classList.remove('hidden');
        elements.addCadernoToFolderBtn.classList.add('hidden');
        elements.createFolderBtn.classList.add('hidden');
        elements.addQuestionsToCadernoBtn.classList.remove('hidden');

        const mainContentHtml = elements.vadeMecumView.querySelector('#tabs-and-main-content').outerHTML;
        elements.savedCadernosListContainer.innerHTML = mainContentHtml;

        const filtered = allQuestions.filter(q => caderno.questionIds.includes(q.id));
        const savedState = userCadernoState.get(currentCadernoId);
        const newIndex = (savedState && savedState.lastQuestionIndex < filtered.length) ? savedState.lastQuestionIndex : 0;
        
        setState({
            filteredQuestions: filtered,
            currentQuestionIndex: newIndex,
            sessionStats: []
        });
        await displayQuestion();

    } else if (currentFolderId) {
        // --- Visualização de uma pasta específica ---
        const folder = userFolders.find(f => f.id === currentFolderId);
        if (!folder) {
            setState({ currentFolderId: null });
            await renderFoldersAndCadernos();
            return;
        }

        elements.cadernosViewTitle.textContent = folder.name;
        elements.backToFoldersBtn.classList.remove('hidden');
        elements.addCadernoToFolderBtn.classList.remove('hidden');
        elements.createFolderBtn.classList.add('hidden');
        elements.addQuestionsToCadernoBtn.classList.add('hidden');

        const cadernosInFolder = userCadernos.filter(c => c.folderId === currentFolderId);
        if (cadernosInFolder.length > 0) {
            elements.savedCadernosListContainer.innerHTML = cadernosInFolder.map(caderno => getCadernoItemHTML(caderno)).join('');
        } else {
            elements.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno nesta pasta ainda.</p>';
        }

    } else {
        // --- Visualização principal (raíz) ---
        elements.cadernosViewTitle.textContent = 'Meus Cadernos';
        elements.backToFoldersBtn.classList.add('hidden');
        elements.addCadernoToFolderBtn.classList.add('hidden');
        elements.createFolderBtn.classList.remove('hidden');
        elements.addQuestionsToCadernoBtn.classList.add('hidden');

        const unfiledCadernos = userCadernos.filter(c => !c.folderId);

        if (userFolders.length === 0 && unfiledCadernos.length === 0) {
            elements.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno ou pasta criada ainda.</p>';
            return;
        }
        
        let html = userFolders.map(folder => {
            const count = userCadernos.filter(c => c.folderId === folder.id).length;
            return getFolderItemHTML(folder, count);
        }).join('');

        if (unfiledCadernos.length > 0) {
            if (userFolders.length > 0) {
                html += '<h3 class="mt-6 mb-2 text-md font-semibold text-gray-600">Cadernos sem Pasta</h3>';
            }
            html += unfiledCadernos.map(caderno => getCadernoItemHTML(caderno)).join('');
        }
        elements.savedCadernosListContainer.innerHTML = html;
    }
}

/**
 * Trata os cliques na área de cadernos e pastas.
 * @param {Event} event O evento de clique.
 */
export async function handleCadernosViewClick(event) {
    const { currentUser, userFolders, userCadernos } = getState();
    if (!currentUser) return;

    const target = event.target;
    const actionTarget = target.closest('[data-action="open"]');
    
    if (actionTarget) {
        const folderItem = target.closest('.folder-item');
        if (folderItem) { 
            setState({ currentFolderId: folderItem.dataset.folderId, currentCadernoId: null });
            await renderFoldersAndCadernos();
            return;
        }
        
        const cadernoItem = target.closest('.caderno-item');
        if(cadernoItem) {
            setState({ currentCadernoId: cadernoItem.dataset.cadernoId, currentFolderId: null });
            await renderFoldersAndCadernos();
            return;
        }
    }
    
    // Ações dos botões
    const editFolderBtn = target.closest('.edit-folder-btn');
    if (editFolderBtn) {
        showNameModal('folder', editFolderBtn.dataset.id, editFolderBtn.dataset.name);
        return;
    }
    
    const editCadernoBtn = target.closest('.edit-caderno-btn');
    if (editCadernoBtn) {
        showNameModal('caderno', editCadernoBtn.dataset.id, editCadernoBtn.dataset.name);
        return;
    }

    const deleteFolderBtn = target.closest('.delete-folder-btn');
    if (deleteFolderBtn) {
        const folderName = userFolders.find(f => f.id === deleteFolderBtn.dataset.id)?.name || '';
        showConfirmationModal('folder', deleteFolderBtn.dataset.id, `Excluir Pasta`, `Deseja excluir a pasta <strong>"${folderName}"</strong>? <br><br> <span class="font-bold text-red-600">Todos os cadernos dentro dela também serão excluídos.</span>`);
        return;
    }

    const deleteCadernoBtn = target.closest('.delete-caderno-btn');
    if (deleteCadernoBtn) {
        const cadernoName = userCadernos.find(c => c.id === deleteCadernoBtn.dataset.id)?.name || '';
        showConfirmationModal('caderno', deleteCadernoBtn.dataset.id, `Excluir Caderno`, `Deseja excluir o caderno <strong>"${cadernoName}"</strong>?`);
        return;
    }

    const statsCadernoBtn = target.closest('.stats-caderno-btn');
    if (statsCadernoBtn) {
        const caderno = userCadernos.find(c => c.id === statsCadernoBtn.dataset.id);
        if (caderno) showItemStats('caderno', caderno.questionIds, caderno.name);
        return;
    }

    const statsFolderBtn = target.closest('.stats-folder-btn');
    if (statsFolderBtn) {
        const questionIds = userCadernos
            .filter(c => c.folderId === statsFolderBtn.dataset.id)
            .flatMap(c => c.questionIds || []);
        const uniqueIds = [...new Set(questionIds)];
        showItemStats('folder', uniqueIds, statsFolderBtn.dataset.name);
        return;
    }

    const removeBtn = target.closest('.remove-question-btn');
    const { currentCadernoId } = getState();
    if (removeBtn && currentCadernoId) {
        const questionIdToRemove = removeBtn.dataset.questionId;
        const cadernoRef = doc(db, 'users', currentUser.uid, 'cadernos', currentCadernoId);
        await updateDoc(cadernoRef, {
            questionIds: arrayRemove(questionIdToRemove)
        });
    }
}

/**
 * Gera o HTML para um item de pasta.
 */
function getFolderItemHTML(folder, count) {
    return `
        <div class="bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition folder-item mb-2" data-folder-id="${folder.id}">
            <div class="flex justify-between items-center">
                <div class="flex items-center cursor-pointer flex-grow" data-action="open">
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
                     <i class="fas fa-chevron-right text-gray-400 ml-2"></i>
                </div>
            </div>
        </div>`;
}

/**
 * Gera o HTML para um item de caderno.
 */
function getCadernoItemHTML(caderno) {
    return `
        <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm caderno-item mb-2" data-caderno-id="${caderno.id}">
           <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                <div>
                    <h4 class="font-bold text-lg">${caderno.name}</h4>
                    <p class="text-sm text-gray-500">${(caderno.questionIds || []).length} questões</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button class="stats-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                <button class="edit-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                <button class="delete-caderno-btn text-gray-400 hover:text-red-600 p-2 rounded-full" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
            </div>
        </div>
    `;
}

/**
 * Atualiza o dropdown de seleção de pastas no modal.
 * @param {Array} folders As pastas do usuário.
 */
export function updateFolderSelect(folders) {
    const folderOptions = ['<option value="">Salvar em (opcional)</option>'];
    folders.forEach(folder => {
        folderOptions.push(`<option value="${folder.id}">${folder.name}</option>`);
    });
    elements.folderSelect.innerHTML = folderOptions.join('');
}

