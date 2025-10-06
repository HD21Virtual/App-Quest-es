import { state, clearSessionStats } from '../state.js';
import DOM from '../dom-elements.js';
import { displayQuestion, renderQuestionListForAdding } from './question-viewer.js';
import { updateStatsPanel } from './stats.js';
import { updateSelectedFiltersDisplay, updateAssuntoFilter } from '../ui/ui-helpers.js';
import { saveSessionStats } from '../services/firestore.js';

/**
 * @file js/features/filter.js
 * @description Lida com a lógica de filtragem de questões.
 */

export async function applyFilters() {
    if (!state.isAddingQuestionsMode.active && state.sessionStats.length > 0 && !state.isReviewSession) {
        await saveSessionStats();
        clearSessionStats();
    }

    const selectedMaterias = JSON.parse(DOM.materiaFilter.dataset.value || '[]');
    const selectedAssuntos = JSON.parse(DOM.assuntoFilter.dataset.value || '[]');
    const activeTipoBtn = DOM.tipoFilterGroup.querySelector('.active-filter');
    const selectedTipo = activeTipoBtn ? activeTipoBtn.dataset.value : 'todos';
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
        const newQuestionsCount = newQuestions.length;

        if (newQuestionsCount > 0) {
            DOM.filterBtn.textContent = `Adicionar ${newQuestionsCount} questões ao Caderno`;
            DOM.filterBtn.disabled = false;
        } else {
            DOM.filterBtn.textContent = `Nenhuma questão nova para adicionar`;
            DOM.filterBtn.disabled = true;
        }

        renderQuestionListForAdding(state.filteredQuestions, existingIds);

    } else {
        const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
        if(mainContentContainer) mainContentContainer.classList.remove('hidden');
        await displayQuestion();
        updateStatsPanel();
    }

    updateSelectedFiltersDisplay();
}

export function clearAllFilters() {
    DOM.searchInput.value = '';
    
    const materiaContainer = DOM.materiaFilter;
    if(materiaContainer) {
        materiaContainer.dataset.value = '[]';
        const valueSpan = materiaContainer.querySelector('.custom-select-value');
        if(valueSpan) {
             valueSpan.textContent = 'Disciplina';
             valueSpan.classList.add('text-gray-500');
        }
        materiaContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => cb.checked = false);
    }
    
    updateAssuntoFilter([]);

    if(DOM.tipoFilterGroup) {
        const activeFilter = DOM.tipoFilterGroup.querySelector('.active-filter');
        if(activeFilter) activeFilter.classList.remove('active-filter');
        const todosFilter = DOM.tipoFilterGroup.querySelector('[data-value="todos"]');
        if(todosFilter) todosFilter.classList.add('active-filter');
    }

    applyFilters();
}

export function setupCustomSelect(container) {
    const button = container.querySelector('.custom-select-button');
    const valueSpan = container.querySelector('.custom-select-value');
    const panel = container.querySelector('.custom-select-panel');
    const searchInput = container.querySelector('.custom-select-search');
    const optionsContainer = container.querySelector('.custom-select-options');
    if(!button || !panel) return;

    const originalText = valueSpan ? valueSpan.textContent : '';

    const filterId = container.id.replace('-filter', '');
    let options = [];
    if (filterId === 'materia') {
        options = state.filterOptions.materia.map(m => m.name);
    }
    
    if(optionsContainer) {
        optionsContainer.innerHTML = options.map(opt => `
            <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" data-value="${opt}" class="custom-select-option rounded">
                <span>${opt}</span>
            </label>
        `).join('');
    }

    button.addEventListener('click', () => {
        if (!button.disabled) {
            panel.classList.toggle('hidden');
        }
    });
    
    if(searchInput && optionsContainer) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            optionsContainer.querySelectorAll('label, .font-bold').forEach(el => {
                if(el.classList.contains('font-bold')) { 
                     el.style.display = ''; 
                } else {
                    const text = el.textContent.toLowerCase();
                    el.style.display = text.includes(searchTerm) ? '' : 'none';
                }
            });
        });
    }

    if(optionsContainer) {
        optionsContainer.addEventListener('change', () => {
            const selected = [];
            const selectedText = [];
            optionsContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => {
                selected.push(cb.dataset.value);
                selectedText.push(cb.nextElementSibling.textContent);
            });
    
            container.dataset.value = JSON.stringify(selected);
    
            if (valueSpan) {
                if (selected.length === 0) {
                    valueSpan.textContent = originalText;
                    valueSpan.classList.add('text-gray-500');
                } else if (selected.length === 1) {
                    valueSpan.textContent = selectedText[0];
                    valueSpan.classList.remove('text-gray-500');
                } else {
                    valueSpan.textContent = `${selected.length} ${originalText.toLowerCase()}s selecionados`;
                    valueSpan.classList.remove('text-gray-500');
                }
            }
            
            if (container.id === 'materia-filter') {
                updateAssuntoFilter(selected);
            }
            updateSelectedFiltersDisplay();
            if (state.isAddingQuestionsMode.active) {
                applyFilters();
            }
        });
    }
}

