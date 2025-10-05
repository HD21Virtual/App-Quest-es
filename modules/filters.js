import { getState, setState } from '../services/state.js';
import { elements } from './ui.js';
import { displayQuestion, renderQuestionListForAdding } from './questions.js';
import { updateStatsPanel } from './stats.js';
import { saveSessionStats } from '../services/firestore.js';
import { db } from '../config/firebase.js';
import { collection, addDoc, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Popula as opções de checkbox no filtro de Disciplina com base no estado.
 */
export function populateMateriaFilterOptions() {
    const { filterOptions } = getState();
    const optionsContainer = elements.materiaFilter.querySelector('.custom-select-options');
    if (optionsContainer) {
        optionsContainer.innerHTML = filterOptions.materia.map(opt => `
            <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" data-value="${opt.name}" class="custom-select-option rounded">
                <span>${opt.name}</span>
            </label>
        `).join('');
    }
}

/**
 * Aplica os filtros selecionados e atualiza a lista de questões.
 */
export async function applyFilters() {
    const { isAddingQuestionsMode, sessionStats, isReviewSession, allQuestions, userCadernos } = getState();
    
    if (!isAddingQuestionsMode.active && sessionStats.length > 0 && !isReviewSession) {
        await saveSessionStats(); 
        setState({ sessionStats: [] });
    }
    
    const selectedMaterias = JSON.parse(elements.materiaFilter.dataset.value || '[]');
    const selectedAssuntos = JSON.parse(elements.assuntoFilter.dataset.value || '[]');
    const activeTipoBtn = elements.tipoFilterGroup.querySelector('.active-filter');
    const selectedTipo = activeTipoBtn ? activeTipoBtn.dataset.value : 'todos';
    const searchTerm = elements.searchInput.value.toLowerCase();

    const filtered = allQuestions.filter(q => {
        const materiaMatch = selectedMaterias.length === 0 || selectedMaterias.includes(q.materia);
        const assuntoMatch = selectedAssuntos.length === 0 || selectedAssuntos.includes(q.assunto);
        const tipoMatch = selectedTipo === 'todos' || q.tipo === selectedTipo;
        const searchMatch = !searchTerm || q.text.toLowerCase().includes(searchTerm);
        return materiaMatch && assuntoMatch && tipoMatch && searchMatch;
    });
    
    setState({ filteredQuestions: filtered, currentQuestionIndex: 0 });

    if (isAddingQuestionsMode.active) {
        const caderno = userCadernos.find(c => c.id === isAddingQuestionsMode.cadernoId);
        const existingIds = caderno ? (caderno.questionIds || []) : [];
        const newQuestions = filtered.filter(q => !existingIds.includes(q.id));

        elements.filterBtn.textContent = newQuestions.length > 0 ? `Adicionar ${newQuestions.length} questões` : `Nenhuma questão nova`;
        elements.filterBtn.disabled = newQuestions.length === 0;
        
        renderQuestionListForAdding(filtered, existingIds);
    } else {
        const mainContent = elements.vadeMecumContentArea.querySelector('#tabs-and-main-content');
        if(mainContent) mainContent.classList.remove('hidden');
        await displayQuestion();
        updateStatsPanel();
    }

    updateSelectedFiltersDisplay();
}

/**
 * Atualiza a exibição das "tags" de filtros selecionados.
 */
export function updateSelectedFiltersDisplay() {
    elements.selectedFiltersContainer.innerHTML = '';
    let hasFilters = false;

    const createFilterTag = (type, value, label) => {
        hasFilters = true;
        const tag = document.createElement('div');
        tag.className = 'flex items-center bg-gray-100 border border-gray-300 rounded-md pl-2 pr-1 py-1 text-sm';
        tag.innerHTML = `
            <span class="font-bold mr-1">${label}:</span>
            <span>${value}</span>
            <button data-filter-type="${type}" data-filter-value="${value}" class="remove-filter-btn ml-2 text-gray-500 hover:text-gray-800">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        elements.selectedFiltersContainer.appendChild(tag);
    };

    JSON.parse(elements.materiaFilter.dataset.value || '[]').forEach(m => createFilterTag('materia', m, 'Disciplina'));
    JSON.parse(elements.assuntoFilter.dataset.value || '[]').forEach(a => createFilterTag('assunto', a, 'Assunto'));
    
    const activeTipoBtn = elements.tipoFilterGroup.querySelector('.active-filter');
    if (activeTipoBtn && activeTipoBtn.dataset.value !== 'todos') {
        createFilterTag('tipo', activeTipoBtn.dataset.value, 'Tipo');
    }
    if (elements.searchInput.value) {
        createFilterTag('search', elements.searchInput.value, 'Busca');
    }

    if (!hasFilters) {
        elements.selectedFiltersContainer.innerHTML = `<span class="text-gray-500 text-sm">Nenhum filtro aplicado</span>`;
    }
}


/**
 * Limpa todos os filtros aplicados.
 */
export function clearAllFilters() {
    elements.searchInput.value = '';
    ['materia-filter', 'assunto-filter'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.dataset.value = '[]';
            const valueSpan = container.querySelector('.custom-select-value');
            if (valueSpan) {
                valueSpan.textContent = id === 'materia-filter' ? 'Disciplina' : 'Assunto';
                valueSpan.classList.add('text-gray-500');
            }
            container.querySelectorAll('.custom-select-option:checked').forEach(cb => cb.checked = false);
        }
    });
    updateAssuntoFilter([]);
    elements.tipoFilterGroup.querySelector('.active-filter')?.classList.remove('active-filter');
    elements.tipoFilterGroup.querySelector('[data-value="todos"]')?.classList.add('active-filter');
    applyFilters();
}

/**
 * Atualiza as opções do filtro de assunto com base na(s) disciplina(s) selecionada(s).
 * @param {string[]} disciplinas - Nomes das disciplinas selecionadas.
 */
export function updateAssuntoFilter(disciplinas) {
    const { filterOptions } = getState();
    const container = document.getElementById('assunto-filter');
    if (!container) return;

    const button = container.querySelector('.custom-select-button');
    const valueSpan = container.querySelector('.custom-select-value');
    const optionsContainer = container.querySelector('.custom-select-options');
    
    if (!button || !valueSpan || !optionsContainer) return;

    valueSpan.textContent = 'Assunto';
    valueSpan.classList.add('text-gray-500');
    container.dataset.value = '[]';

    if (disciplinas.length === 0) {
        button.disabled = true;
        optionsContainer.innerHTML = `<div class="p-2 text-center text-gray-400 text-sm">Selecione uma disciplina</div>`;
    } else {
        button.disabled = false;
        let newHtml = '';
        disciplinas.forEach(disciplina => {
            const materiaObj = filterOptions.materia.find(m => m.name === disciplina);
            if (materiaObj && materiaObj.assuntos.length > 0) {
                newHtml += `<div class="font-bold text-sm text-gray-700 mt-2 px-1">${materiaObj.name}</div>`;
                materiaObj.assuntos.forEach(assunto => {
                    newHtml += `
                        <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input type="checkbox" data-value="${assunto}" class="custom-select-option rounded">
                            <span>${assunto}</span>
                        </label>
                    `;
                });
            }
        });
        optionsContainer.innerHTML = newHtml || `<div class="p-2 text-center text-gray-400 text-sm">Nenhum assunto encontrado</div>`;
    }
}

/**
 * Salva o conjunto de filtros atual no Firestore.
 */
export async function saveCurrentFilter() {
    const { currentUser } = getState();
    const name = elements.filterNameInput.value.trim();
    if (!name || !currentUser) return;
    
    const currentFilters = {
        name: name,
        materias: JSON.parse(elements.materiaFilter.dataset.value || '[]'),
        assuntos: JSON.parse(elements.assuntoFilter.dataset.value || '[]'),
        tipo: elements.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos',
        search: elements.searchInput.value
    };
    
    await addDoc(collection(db, 'users', currentUser.uid, 'filtros'), currentFilters);
    elements.filterNameInput.value = '';
    elements.saveModal.classList.add('hidden');
}

/**
 * Carrega e aplica um filtro salvo do Firestore.
 * @param {string} filterId O ID do filtro a ser carregado.
 */
export async function loadSavedFilter(filterId) {
    const { currentUser } = getState();
    if (!currentUser) return;

    const filterDoc = await getDoc(doc(db, 'users', currentUser.uid, 'filtros', filterId));
    if (filterDoc.exists()) {
        const filterToLoad = filterDoc.data();
        elements.searchInput.value = filterToLoad.search || '';
        elements.tipoFilterGroup.querySelector('.active-filter')?.classList.remove('active-filter');
        elements.tipoFilterGroup.querySelector(`[data-value="${filterToLoad.tipo}"]`)?.classList.add('active-filter');
        
        const materiaContainer = document.getElementById('materia-filter');
        materiaContainer.querySelectorAll('.custom-select-option').forEach(cb => {
            cb.checked = (filterToLoad.materias || []).includes(cb.dataset.value);
        });
        materiaContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
        
        setTimeout(() => {
           const assuntoContainer = document.getElementById('assunto-filter');
           assuntoContainer.querySelectorAll('.custom-select-option').forEach(cb => {
                cb.checked = (filterToLoad.assuntos || []).includes(cb.dataset.value);
           });
           assuntoContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
           applyFilters();
        }, 50);

        elements.loadModal.classList.add('hidden');
    }
}

/**
 * Deleta um filtro salvo do Firestore.
 * @param {string} filterId O ID do filtro a ser deletado.
 */
export async function deleteSavedFilter(filterId) {
    const { currentUser } = getState();
    if (!currentUser) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'filtros', filterId));
}

/**
 * Atualiza a lista de filtros salvos exibida no modal.
 * @param {Array} savedFilters A lista de filtros vinda do Firestore.
 */
export function updateSavedFiltersList(savedFilters) {
    const searchTerm = elements.searchSavedFiltersInput.value.toLowerCase();
    const filtered = savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        elements.savedFiltersListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`;
    } else {
        elements.savedFiltersListContainer.innerHTML = filtered.map(f => `
            <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                <button class="load-filter-btn text-left flex-grow" data-id="${f.id}">${f.name}</button>
                <button class="delete-filter-btn text-gray-400 hover:text-red-600 p-1" data-id="${f.id}">
                    <i class="fas fa-trash-alt pointer-events-none"></i>
                </button>
            </div>
        `).join('');
    }
}

