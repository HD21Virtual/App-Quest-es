import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { displayQuestion, renderQuestionListForAdding } from './question-viewer.js';
import { updateStatsPanel } from './stats.js';
import { updateSelectedFiltersDisplay } from '../ui/ui-helpers.js';
import { saveSessionStats, updateItem } from '../services/firestore.js';

/**
 * @file js/features/filter.js
 * @description Contém toda a lógica relacionada à filtragem de questões, incluindo
 * a manipulação dos dropdowns customizados e a aplicação dos filtros.
 */

export async function applyFilters() {
    if (!state.isAddingQuestionsMode.active && state.sessionStats.length > 0 && !state.isReviewSession) {
        await saveSessionStats();
    }

    const selectedMaterias = JSON.parse(DOM.materiaFilter.dataset.value || '[]');
    const selectedAssuntos = JSON.parse(DOM.assuntoFilter.dataset.value || '[]');
    const selectedTipo = DOM.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos';
    const searchTerm = DOM.searchInput.value.toLowerCase();

    state.filteredQuestions = state.allQuestions.filter(q => {
        const materiaMatch = selectedMaterias.length === 0 || selectedMaterias.includes(q.materia);
        const assuntoMatch = selectedAssuntos.length === 0 || selectedAssuntos.includes(q.assunto);
        const tipoMatch = selectedTipo === 'todos' || q.tipo === selectedTipo;
        const searchMatch = !searchTerm || q.text.toLowerCase().includes(searchTerm);
        return materiaMatch && assuntoMatch && tipoMatch && searchMatch;
    });

    state.currentQuestionIndex = 0;

    if (state.isAddingQuestionsMode.active) {
        const caderno = state.userCadernos.find(c => c.id === state.isAddingQuestionsMode.cadernoId);
        const existingIds = caderno ? caderno.questionIds : [];
        const newQuestions = state.filteredQuestions.filter(q => !existingIds.includes(q.id));
        
        DOM.filterBtn.textContent = `Adicionar ${newQuestions.length} questões`;
        DOM.filterBtn.disabled = newQuestions.length === 0;
        
        renderQuestionListForAdding(state.filteredQuestions, existingIds);
    } else {
        DOM.vadeMecumView.querySelector('#tabs-and-main-content').classList.remove('hidden');
        displayQuestion();
        updateStatsPanel();
    }

    updateSelectedFiltersDisplay();
}

export function setupCustomSelects() {
    setupCustomSelect(DOM.materiaFilter);
    setupCustomSelect(DOM.assuntoFilter);
}

function setupCustomSelect(container) {
    const button = container.querySelector('.custom-select-button');
    const panel = container.querySelector('.custom-select-panel');
    const searchInput = container.querySelector('.custom-select-search');
    const optionsContainer = container.querySelector('.custom-select-options');
    
    // Popula as opções iniciais (apenas para matéria)
    if (container.id === 'materia-filter') {
        optionsContainer.innerHTML = state.filterOptions.materia.map(m => `
            <label class="flex items-center p-1"><input type="checkbox" data-value="${m.name}" class="custom-select-option mr-2">${m.name}</label>
        `).join('');
    }

    button.addEventListener('click', () => !button.disabled && panel.classList.toggle('hidden'));
    
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        optionsContainer.querySelectorAll('label').forEach(el => {
            el.style.display = el.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    optionsContainer.addEventListener('change', () => {
        const selected = Array.from(optionsContainer.querySelectorAll('.custom-select-option:checked')).map(cb => cb.dataset.value);
        container.dataset.value = JSON.stringify(selected);
        updateSelectValueText(container, selected);
        
        if (container.id === 'materia-filter') updateAssuntoFilter(selected);
        if (state.isAddingQuestionsMode.active) applyFilters();
        updateSelectedFiltersDisplay();
    });
}

function updateAssuntoFilter(selectedMaterias) {
    const assuntoContainer = DOM.assuntoFilter;
    const assuntoButton = assuntoContainer.querySelector('.custom-select-button');
    const optionsContainer = assuntoContainer.querySelector('.custom-select-options');
    
    assuntoContainer.dataset.value = '[]';
    updateSelectValueText(assuntoContainer, []);

    if (selectedMaterias.length === 0) {
        assuntoButton.disabled = true;
        optionsContainer.innerHTML = `<div class="p-2 text-sm text-gray-400">Selecione uma disciplina</div>`;
    } else {
        assuntoButton.disabled = false;
        let html = '';
        selectedMaterias.forEach(materiaName => {
            const materia = state.filterOptions.materia.find(m => m.name === materiaName);
            if(materia && materia.assuntos.length > 0) {
                html += `<div class="font-bold text-sm p-1 mt-1">${materia.name}</div>`;
                html += materia.assuntos.map(assunto => `
                    <label class="flex items-center p-1"><input type="checkbox" data-value="${assunto}" class="custom-select-option mr-2">${assunto}</label>
                `).join('');
            }
        });
        optionsContainer.innerHTML = html;
    }
}

function updateSelectValueText(container, selected) {
    const valueSpan = container.querySelector('.custom-select-value');
    const originalText = container.id === 'materia-filter' ? 'Disciplina' : 'Assunto';
    if (selected.length === 0) valueSpan.textContent = originalText;
    else if (selected.length === 1) valueSpan.textContent = selected[0];
    else valueSpan.textContent = `${selected.length} selecionados`;
}

export function clearAllFilters() {
    DOM.searchInput.value = '';
    // Clear custom selects
    [DOM.materiaFilter, DOM.assuntoFilter].forEach(container => {
        container.dataset.value = '[]';
        container.querySelectorAll('.custom-select-option:checked').forEach(cb => cb.checked = false);
        updateSelectValueText(container, []);
    });
    updateAssuntoFilter([]);
    // Reset toggle buttons
    DOM.tipoFilterGroup.querySelector('.active-filter')?.classList.remove('active-filter');
    DOM.tipoFilterGroup.querySelector('[data-value="todos"]').classList.add('active-filter');
    applyFilters();
}

// --- Handlers de Eventos ---

export async function handleFilterActions(event) {
    const id = event.target.id;
    if (id === 'clear-filters-btn') {
        clearAllFilters();
    } else if (id === 'filter-btn' && state.isAddingQuestionsMode.active) {
        const caderno = state.userCadernos.find(c => c.id === state.isAddingQuestionsMode.cadernoId);
        const newIds = state.filteredQuestions.map(q => q.id).filter(id => !caderno.questionIds.includes(id));
        if (newIds.length > 0) {
            await updateItem('caderno', caderno.id, { questionIds: arrayUnion(...newIds) });
        }
        // Navega de volta para a view de cadernos
    } else {
        applyFilters();
    }
}

export function handleSelectedFilterRemoval(event) {
    const removeBtn = event.target.closest('.remove-filter-btn');
    if (!removeBtn) return;
    const { filterType, filterValue } = removeBtn.dataset;

    if (filterType === 'materia' || filterType === 'assunto') {
        const container = filterType === 'materia' ? DOM.materiaFilter : DOM.assuntoFilter;
        const checkbox = container.querySelector(`.custom-select-option[data-value="${filterValue}"]`);
        if (checkbox) {
            checkbox.checked = false;
            container.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
        }
    } else if (filterType === 'tipo') {
        DOM.tipoFilterGroup.querySelector('.active-filter')?.classList.remove('active-filter');
        DOM.tipoFilterGroup.querySelector(`[data-value="todos"]`).classList.add('active-filter');
    } else if (filterType === 'search') {
        DOM.searchInput.value = '';
    }
    if (state.isAddingQuestionsMode.active) applyFilters();
}

export function handleFilterSearch() {
    if (state.isAddingQuestionsMode.active) {
        applyFilters();
    }
}

export function handleToggleButtonGroups() {
    DOM.tipoFilterGroup.addEventListener('click', (event) => {
        if (event.target.classList.contains('filter-btn-toggle')) {
            DOM.tipoFilterGroup.querySelectorAll('.filter-btn-toggle').forEach(btn => btn.classList.remove('active-filter'));
            event.target.classList.add('active-filter');
        }
    });
}
