import { state, setState, clearSessionStats } from '../state.js';
import DOM from '../dom-elements.js';
import { renderQuestionListForAdding, displayQuestion } from './question-viewer.js';
import { updateStatsPanel } from './stats.js';
import { updateAssuntoFilter, updateSelectedFiltersDisplay } from '../ui/ui-helpers.js';
import { saveSessionStats } from '../services/firestore.js';

export async function applyFilters() {
    if (!state.isAddingQuestionsMode.active && state.sessionStats.length > 0 && !state.isReviewSession) {
        await saveSessionStats();
        clearSessionStats();
    }

    // Fecha os painéis de seleção ao aplicar o filtro
    DOM.materiaFilter.querySelector('.custom-select-panel').classList.add('hidden');
    DOM.assuntoFilter.querySelector('.custom-select-panel').classList.add('hidden');

    const selectedMaterias = JSON.parse(DOM.materiaFilter.dataset.value || '[]');
    const selectedAssuntos = JSON.parse(DOM.assuntoFilter.dataset.value || '[]');
    const activeTipoBtn = DOM.tipoFilterGroup.querySelector('.active-filter');
    const selectedTipo = activeTipoBtn ? activeTipoBtn.dataset.value : 'todos';
    const searchTerm = DOM.searchInput.value.toLowerCase();

    const filtered = state.allQuestions.filter(q => {
        const materiaMatch = selectedMaterias.length === 0 || selectedMaterias.includes(q.materia);
        const assuntoMatch = selectedAssuntos.length === 0 || selectedAssuntos.includes(q.assunto);
        const tipoMatch = selectedTipo === 'todos' || q.tipo === selectedTipo;
        const searchMatch = !searchTerm || q.text.toLowerCase().includes(searchTerm);
        return materiaMatch && assuntoMatch && tipoMatch && searchMatch;
    });
    setState('filteredQuestions', filtered);
    setState('currentQuestionIndex', 0);

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
        const mainContentContainer = DOM.vadeMecumView.querySelector('#tabs-and-main-content');
        if(mainContentContainer) mainContentContainer.classList.remove('hidden');
        await displayQuestion();
        updateStatsPanel();
    }

    updateSelectedFiltersDisplay();
}

function setupCustomSelect(container) {
    const button = container.querySelector('.custom-select-button');
    const panel = container.querySelector('.custom-select-panel');
    const searchInput = container.querySelector('.custom-select-search');
    const optionsContainer = container.querySelector('.custom-select-options');
    const valueSpan = container.querySelector('.custom-select-value');
    const originalText = valueSpan.textContent;

    button.addEventListener('click', () => {
        if (button.disabled) return;

        // Fecha outros painéis de filtro que possam estar abertos
        document.querySelectorAll('.custom-select-container').forEach(otherContainer => {
            if (otherContainer !== container) {
                otherContainer.querySelector('.custom-select-panel').classList.add('hidden');
            }
        });
        
        // Alterna a visibilidade do painel atual
        panel.classList.toggle('hidden');
    });
    
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

    optionsContainer.addEventListener('change', () => {
        const selected = [];
        const selectedText = [];
        optionsContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => {
            selected.push(cb.dataset.value);
            selectedText.push(cb.nextElementSibling.textContent);
        });

        container.dataset.value = JSON.stringify(selected);

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
        
        if (container.id === 'materia-filter') {
            updateAssuntoFilter(selected);
        }
        updateSelectedFiltersDisplay();
        if (state.isAddingQuestionsMode.active) {
            applyFilters();
        }
    });
}

export function setupCustomSelects() {
    // Popula a lista de matérias inicialmente
    const materiaOptions = state.filterOptions.materia.map(m => m.name);
    const materiaContainer = DOM.materiaFilter.querySelector('.custom-select-options');
    if (materiaContainer) {
        materiaContainer.innerHTML = materiaOptions.map(opt => `
            <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" data-value="${opt}" class="custom-select-option rounded">
                <span>${opt}</span>
            </label>
        `).join('');
    }
    
    document.querySelectorAll('.custom-select-container').forEach(setupCustomSelect);
}

export function clearAllFilters() {
    DOM.searchInput.value = '';
    
    const materiaContainer = DOM.materiaFilter;
    materiaContainer.dataset.value = '[]';
    materiaContainer.querySelector('.custom-select-value').textContent = 'Disciplina';
    materiaContainer.querySelector('.custom-select-value').classList.add('text-gray-500');
    materiaContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => cb.checked = false);
    
    updateAssuntoFilter([]);
    
    const activeTipo = DOM.tipoFilterGroup.querySelector('.active-filter');
    if (activeTipo) activeTipo.classList.remove('active-filter');
    DOM.tipoFilterGroup.querySelector('[data-value="todos"]').classList.add('active-filter');
    
    applyFilters();
}

export function removeFilter(type, value) {
    switch (type) {
        case 'materia': {
            const container = DOM.materiaFilter;
            const checkbox = container.querySelector(`.custom-select-option[data-value="${value}"]`);
            if (checkbox) checkbox.checked = false;
            // Dispara o evento de mudança para atualizar o estado e a UI
            container.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            break;
        }
        case 'assunto': {
            const container = DOM.assuntoFilter;
            const checkbox = container.querySelector(`.custom-select-option[data-value="${value}"]`);
            if (checkbox) checkbox.checked = false;
            container.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            break;
        }
        case 'tipo': {
            const currentActive = DOM.tipoFilterGroup.querySelector('.active-filter');
            if (currentActive) currentActive.classList.remove('active-filter');
            DOM.tipoFilterGroup.querySelector('[data-value="todos"]').classList.add('active-filter');
            break;
        }
        case 'search': {
            DOM.searchInput.value = '';
            break;
        }
    }
    applyFilters();
}

