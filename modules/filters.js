import { elements } from './ui.js';
import { getState, setState, updateState } from '../services/state.js';
import { fetchAllQuestions, saveSessionStats } from '../services/firestore.js';
import { displayQuestion } from './questions.js';
import { updateStatsPanel } from './stats.js';

/**
 * Busca todas as questões e inicializa os componentes de filtro.
 */
export async function fetchAllQuestionsAndSetupFilters() {
    const filterData = await fetchAllQuestions();
    setState({ filterOptions: filterData });
    document.querySelectorAll('.custom-select-container').forEach(setupCustomSelect);
    updateAssuntoFilter([]);
    applyFilters();
}

/**
 * Aplica os filtros selecionados à lista de questões.
 */
export async function applyFilters() {
    const { sessionStats, isAddingQuestionsMode, isReviewSession, allQuestions } = getState();

    if (!isAddingQuestionsMode.active && sessionStats.length > 0 && !isReviewSession) {
        await saveSessionStats();
        setState({ sessionStats: [] });
    }

    const selectedMaterias = JSON.parse(elements.materiaFilter.dataset.value || '[]');
    const selectedAssuntos = JSON.parse(elements.assuntoFilter.dataset.value || '[]');
    const selectedTipo = elements.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos';
    const searchTerm = elements.searchInput.value.toLowerCase();

    const filteredQuestions = allQuestions.filter(q => 
        (selectedMaterias.length === 0 || selectedMaterias.includes(q.materia)) &&
        (selectedAssuntos.length === 0 || selectedAssuntos.includes(q.assunto)) &&
        (selectedTipo === 'todos' || q.tipo === selectedTipo) &&
        (!searchTerm || q.text.toLowerCase().includes(searchTerm))
    );

    updateState({ filteredQuestions, currentQuestionIndex: 0 }, () => {
        if (isAddingQuestionsMode.active) {
            // Lógica para renderizar lista de adição (a ser implementada se necessário)
        } else {
            displayQuestion();
            updateStatsPanel();
        }
        updateSelectedFiltersDisplay();
    });
}

/**
 * Limpa todos os filtros aplicados.
 */
export function clearAllFilters() {
    elements.searchInput.value = '';
    elements.materiaFilter.dataset.value = '[]';
    elements.materiaFilter.querySelector('.custom-select-value').textContent = 'Disciplina';
    elements.materiaFilter.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
    updateAssuntoFilter([]);
    elements.tipoFilterGroup.querySelector('.active-filter')?.classList.remove('active-filter');
    elements.tipoFilterGroup.querySelector('[data-value="todos"]').classList.add('active-filter');
    applyFilters();
}

/**
 * Sai do modo de adição de questões.
 */
export function exitAddMode() {
    if (getState().isAddingQuestionsMode.active) {
        setState({ isAddingQuestionsMode: { active: false, cadernoId: null } });
        elements.addQuestionsBanner.classList.add('hidden');
        document.getElementById('filter-btn').textContent = 'Filtrar questões';
    }
}

/**
 * Atualiza a lista de filtros salvos no modal.
 */
export function updateSavedFiltersList() {
    const { savedFilters } = getState();
    const listContainer = document.getElementById('saved-filters-list-container');
    const searchInput = document.getElementById('search-saved-filters-input');
    if (!listContainer || !searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const filtered = savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`;
    } else {
        listContainer.innerHTML = filtered.map(f => `
            <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                <button class="load-filter-btn text-left" data-id="${f.id}">${f.name}</button>
                <button class="delete-filter-btn text-red-500 hover:text-red-700" data-id="${f.id}">
                    <i class="fas fa-trash-alt pointer-events-none"></i>
                </button>
            </div>
        `).join('');
    }
}


// --- Funções internas do módulo (não exportadas) ---

function updateAssuntoFilter(disciplinas) {
    const { filterOptions } = getState();
    const assuntoContainer = document.getElementById('assunto-filter');
    const assuntoButton = assuntoContainer.querySelector('.custom-select-button');
    const valueSpan = assuntoContainer.querySelector('.custom-select-value');
    const optionsContainer = assuntoContainer.querySelector('.custom-select-options');
    
    valueSpan.textContent = 'Assunto';
    assuntoContainer.dataset.value = '[]';

    if (disciplinas.length === 0) {
        assuntoButton.disabled = true;
        optionsContainer.innerHTML = `<div class="p-2 text-center text-gray-400 text-sm">Selecione uma disciplina</div>`;
    } else {
        assuntoButton.disabled = false;
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
                        </label>`;
                });
            }
        });
        optionsContainer.innerHTML = newHtml;
    }
}

function updateSelectedFiltersDisplay() {
    // Implementação da função para mostrar os filtros selecionados como tags
    // (Esta função pode ser movida do app.js original para cá)
}

function setupCustomSelect(container) {
    const button = container.querySelector('.custom-select-button');
    const valueSpan = container.querySelector('.custom-select-value');
    const panel = container.querySelector('.custom-select-panel');
    const searchInput = container.querySelector('.custom-select-search');
    const optionsContainer = container.querySelector('.custom-select-options');
    const originalText = valueSpan.textContent;

    const { filterOptions } = getState();
    const filterId = container.id.replace('-filter', '');
    let options = (filterId === 'materia') ? filterOptions.materia.map(m => m.name) : [];
    
    optionsContainer.innerHTML = options.map(opt => `
        <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" data-value="${opt}" class="custom-select-option rounded">
            <span>${opt}</span>
        </label>
    `).join('');

    button.addEventListener('click', () => {
        if (!button.disabled) panel.classList.toggle('hidden');
    });
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        optionsContainer.querySelectorAll('label').forEach(el => {
            el.style.display = el.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
        });
    });

    optionsContainer.addEventListener('change', () => {
        const selected = Array.from(optionsContainer.querySelectorAll('.custom-select-option:checked')).map(cb => cb.dataset.value);
        container.dataset.value = JSON.stringify(selected);

        if (selected.length === 0) valueSpan.textContent = originalText;
        else if (selected.length === 1) valueSpan.textContent = selected[0];
        else valueSpan.textContent = `${selected.length} selecionados`;
        
        if (container.id === 'materia-filter') updateAssuntoFilter(selected);
        
        updateSelectedFiltersDisplay();
        if (getState().isAddingQuestionsMode.active) applyFilters();
    });
}

