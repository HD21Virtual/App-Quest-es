import { state, setState, clearSessionStats } from '../state.js';
import DOM from '../dom-elements.js';
import { renderQuestionListForAdding, displayQuestion } from './question-viewer.js';
import { updateStatsPanel } from './stats.js';
import { updateAssuntoFilter, updateSelectedFiltersDisplay } from '../ui/ui-helpers.js';
import { saveSessionStats } from '../services/firestore.js';


export function setupFilterEventListeners() {
    DOM.filterBtn.addEventListener('click', handleFilterButtonClick);
    DOM.clearFiltersBtn.addEventListener('click', clearAllFilters);
    DOM.searchInput.addEventListener('input', () => {
        if (state.isAddingQuestionsMode.active) {
            applyFilters();
        }
    });

    DOM.tipoFilterGroup.addEventListener('click', (event) => {
        if (event.target.classList.contains('filter-btn-toggle')) {
            DOM.tipoFilterGroup.querySelectorAll('.filter-btn-toggle').forEach(btn => {
                btn.classList.remove('active-filter');
            });
            event.target.classList.add('active-filter');
        }
    });

    setupCustomSelect(DOM.materiaFilter);
    setupCustomSelect(DOM.assuntoFilter);
}

async function handleFilterButtonClick() {
    if (state.isAddingQuestionsMode.active) {
        if (!state.currentUser || !state.isAddingQuestionsMode.cadernoId) return;

        const caderno = state.userCadernos.find(c => c.id === state.isAddingQuestionsMode.cadernoId);
        const existingIds = caderno ? caderno.questionIds : [];

        const newQuestionIds = state.filteredQuestions
            .filter(q => !existingIds.includes(q.id))
            .map(q => q.id);

        if (newQuestionIds.length > 0) {
            const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', state.isAddingQuestionsMode.cadernoId);
            await updateDoc(cadernoRef, {
                questionIds: arrayUnion(...newQuestionIds)
            });
        }
        
        // This part would ideally be handled by a navigation/state manager
        // to avoid direct UI manipulation from the filter module.
        // For now, it mirrors the original logic.
        setState('isAddingQuestionsMode', { active: false, cadernoId: null });
        DOM.addQuestionsBanner.classList.add('hidden');
        navigateToView('cadernos-view', { cadernoId: caderno.id });
        
    } else {
       await applyFilters();
    }
}


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

        const newQuestions = filtered.filter(q => !existingIds.includes(q.id));
        const newQuestionsCount = newQuestions.length;

        if (newQuestionsCount > 0) {
            DOM.filterBtn.textContent = `Adicionar ${newQuestionsCount} questões ao Caderno`;
            DOM.filterBtn.disabled = false;
        } else {
            DOM.filterBtn.textContent = `Nenhuma questão nova para adicionar`;
            DOM.filterBtn.disabled = true;
        }
        
        renderQuestionListForAdding(filtered, existingIds);

    } else {
        const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
        if(mainContentContainer) mainContentContainer.classList.remove('hidden');
        await displayQuestion();
        updateStatsPanel();
    }

    updateSelectedFiltersDisplay();
}

function clearAllFilters() {
    DOM.searchInput.value = '';
    
    const materiaContainer = DOM.materiaFilter;
    materiaContainer.dataset.value = '[]';
    materiaContainer.querySelector('.custom-select-value').textContent = 'Disciplina';
    materiaContainer.querySelector('.custom-select-value').classList.add('text-gray-500');
    materiaContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => cb.checked = false);
    
    updateAssuntoFilter([]);
    
    DOM.tipoFilterGroup.querySelector('.active-filter').classList.remove('active-filter');
    DOM.tipoFilterGroup.querySelector('[data-value="todos"]').classList.add('active-filter');
    
    applyFilters();
}

function setupCustomSelect(container) {
    const button = container.querySelector('.custom-select-button');
    const valueSpan = container.querySelector('.custom-select-value');
    const panel = container.querySelector('.custom-select-panel');
    const searchInput = container.querySelector('.custom-select-search');
    const optionsContainer = container.querySelector('.custom-select-options');
    const originalText = valueSpan.textContent;

    const filterId = container.id.replace('-filter', '');
    let options = [];
    if (filterId === 'materia') {
        options = state.filterOptions.materia.map(m => m.name);
    } 
    
    optionsContainer.innerHTML = options.map(opt => `
        <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
            <input type="checkbox" data-value="${opt}" class="custom-select-option rounded">
            <span>${opt}</span>
        </label>
    `).join('');

    button.addEventListener('click', () => {
        if (!button.disabled) {
            panel.classList.toggle('hidden');
        }
    });
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        optionsContainer.querySelectorAll('label').forEach(el => {
            const text = el.textContent.toLowerCase();
            el.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    optionsContainer.addEventListener('change', () => {
        const selected = Array.from(optionsContainer.querySelectorAll('.custom-select-option:checked')).map(cb => cb.dataset.value);
        container.dataset.value = JSON.stringify(selected);

        if (selected.length === 0) {
            valueSpan.textContent = originalText;
            valueSpan.classList.add('text-gray-500');
        } else if (selected.length === 1) {
            valueSpan.textContent = selected[0];
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

