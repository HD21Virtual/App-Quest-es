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
            // Lógica para renderizar lista de adição
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

// Funções auxiliares (setupCustomSelect, updateAssuntoFilter, etc.)
// ... (Omitidas por brevidade, mas seriam movidas para cá do app.js original)
function setupCustomSelect(container) { /* ... */ }
function updateAssuntoFilter(disciplinas) { /* ... */ }
function updateSelectedFiltersDisplay() { /* ... */ }

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
