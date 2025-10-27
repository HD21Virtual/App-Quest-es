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
    const selectedAssuntosAndSub = JSON.parse(DOM.assuntoFilter.dataset.value || '[]');
    const activeTipoBtn = DOM.tipoFilterGroup.querySelector('.active-filter');
    const selectedTipo = activeTipoBtn ? activeTipoBtn.dataset.value : 'todos';
    const searchTerm = DOM.searchInput.value.toLowerCase();

    const filtered = state.allQuestions.filter(q => {
        const materiaMatch = selectedMaterias.length === 0 || selectedMaterias.includes(q.materia);
        
        // --- MODIFICAÇÃO: Lógica de match para 4 níveis ---
        // Agora, q.subAssunto e q.subSubAssunto podem ser null
        const assuntoMatch = selectedAssuntosAndSub.length === 0 || 
                             selectedAssuntosAndSub.includes(q.assunto) || 
                             (q.subAssunto && selectedAssuntosAndSub.includes(q.subAssunto)) ||
                             (q.subSubAssunto && selectedAssuntosAndSub.includes(q.subSubAssunto));
        // --- FIM DA MODIFICAÇÃO ---

        const tipoMatch = selectedTipo === 'todos' || q.tipo === selectedTipo;
        // --- MODIFICAÇÃO: Busca inclui subSubAssunto ---
        const searchMatch = !searchTerm || q.text.toLowerCase().includes(searchTerm) || 
                            (q.assunto && q.assunto.toLowerCase().includes(searchTerm)) || 
                            (q.subAssunto && q.subAssunto.toLowerCase().includes(searchTerm)) ||
                            (q.subSubAssunto && q.subSubAssunto.toLowerCase().includes(searchTerm));
        // --- FIM DA MODIFICAÇÃO ---
        
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
        // updateStatsPanel(); // Painel de estatísticas da aba foi removido.
    }

    updateSelectedFiltersDisplay();
}

// ===== INÍCIO DA MODIFICAÇÃO: Função agora aceita um callback =====
export function setupCustomSelect(container, onValueChangeCallback = null) {
// ===== FIM DA MODIFICAÇÃO =====
    const button = container.querySelector('.custom-select-button');
    const panel = container.querySelector('.custom-select-panel');
    const searchInput = container.querySelector('.custom-select-search');
    const optionsContainer = container.querySelector('.custom-select-options');
    const valueSpan = container.querySelector('.custom-select-value');
    const originalText = valueSpan.textContent;

    button.addEventListener('click', () => {
        if (button.disabled) return;

        document.querySelectorAll('.custom-select-container').forEach(otherContainer => {
            if (otherContainer !== container) {
                otherContainer.querySelector('.custom-select-panel').classList.add('hidden');
            }
        });
        
        panel.classList.toggle('hidden');
    });
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        // --- MODIFICAÇÃO: Atualizado seletor para buscar em todos os níveis ---
        optionsContainer.querySelectorAll('label, .assunto-group > div, .sub-assunto-group > div').forEach(el => {
            const text = el.textContent.toLowerCase();
            const parent = el.closest('li, .assunto-group, .sub-assunto-group');
            if (parent) {
                parent.style.display = text.includes(searchTerm) ? '' : 'none';
            } else {
                 el.style.display = text.includes(searchTerm) ? '' : 'none';
            }
        });
    });

    optionsContainer.addEventListener('change', (e) => {
        const changedCheckbox = e.target;
        
        // --- MODIFICAÇÃO: Lógica de checkbox para 4 níveis ---
        // ===== INÍCIO DA MODIFICAÇÃO: Verificação de ID removida para ser genérica =====
        if (changedCheckbox.matches('.custom-select-option')) {
        // ===== FIM DA MODIFICAÇÃO =====
            const isChecked = changedCheckbox.checked;
            const type = changedCheckbox.dataset.type;

            if (type === 'assunto') {
                // Seleciona/deseleciona todos os subassuntos e subsubassuntos filhos
                const parentGroup = changedCheckbox.closest('.assunto-group');
                parentGroup.querySelectorAll('.custom-select-option[data-type="subassunto"], .custom-select-option[data-type="subsubassunto"]').forEach(childCb => {
                    childCb.checked = isChecked;
                    childCb.indeterminate = false;
                });
            } else if (type === 'subassunto') {
                // Seleciona/deseleciona todos os subsubassuntos filhos
                const parentGroup = changedCheckbox.closest('.sub-assunto-group');
                parentGroup.querySelectorAll('.custom-select-option[data-type="subsubassunto"]').forEach(childCb => {
                    childCb.checked = isChecked;
                    childCb.indeterminate = false;
                });
                // Atualiza o pai (assunto)
                updateParentCheckbox(changedCheckbox.closest('.assunto-group'), '.custom-select-option[data-type="assunto"]', '.custom-select-option[data-type="subassunto"]');
            } else if (type === 'subsubassunto') {
                // Atualiza o pai (subassunto)
                const subAssuntoGroup = changedCheckbox.closest('.sub-assunto-group');
                updateParentCheckbox(subAssuntoGroup, '.custom-select-option[data-type="subassunto"]', '.custom-select-option[data-type="subsubassunto"]');
                // Atualiza o avô (assunto)
                const assuntoGroup = changedCheckbox.closest('.assunto-group');
                updateParentCheckbox(assuntoGroup, '.custom-select-option[data-type="assunto"]', '.custom-select-option[data-type="subassunto"]');
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        const selected = [];
        const selectedText = [];
        optionsContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => {
            // Só adiciona se não for um pai com estado indeterminado
            if (!cb.indeterminate) {
                selected.push(cb.dataset.value);
                const label = cb.closest('label');
                selectedText.push(label && label.querySelector('span') ? label.querySelector('span').textContent : cb.dataset.value);
            }
        });

        container.dataset.value = JSON.stringify(selected);

        if (selected.length === 0 && optionsContainer.querySelectorAll('.custom-select-option:indeterminate').length === 0) {
            valueSpan.textContent = originalText;
            valueSpan.classList.add('text-gray-500');
        } else if (selected.length === 1 && optionsContainer.querySelectorAll('.custom-select-option:indeterminate').length === 0) {
            valueSpan.textContent = selectedText[0];
            valueSpan.classList.remove('text-gray-500');
        } else {
            const totalSelected = selected.length + optionsContainer.querySelectorAll('.custom-select-option:indeterminate').length;
            valueSpan.textContent = `${totalSelected} itens selecionados`;
            valueSpan.classList.remove('text-gray-500');
        }
        
        // ===== INÍCIO DA MODIFICAÇÃO: Chama o callback se ele existir =====
        if (onValueChangeCallback) {
            onValueChangeCallback(selected);
        }
        // ===== FIM DA MODIFICAÇÃO =====
        
        // Esta lógica é específica da aba "Questões", então verificamos o ID
        if (container.id === 'materia-filter') {
            updateSelectedFiltersDisplay();
        }
        
        if (state.isAddingQuestionsMode.active) {
            applyFilters();
        }
    });
}

// --- NOVA FUNÇÃO AUXILIAR ---
/**
 * Atualiza o estado (checked/indeterminate) de um checkbox pai com base em seus filhos.
 * @param {HTMLElement} parentGroup - O elemento que contém o pai e os filhos (ex: .assunto-group).
 * @param {string} parentSelector - Seletor para encontrar o checkbox pai.
 * @param {string} childSelector - Seletor para encontrar os checkboxes filhos diretos.
 */
function updateParentCheckbox(parentGroup, parentSelector, childSelector) {
    if (!parentGroup) return;
    const parentCheckbox = parentGroup.querySelector(parentSelector);
    if (!parentCheckbox) return;

    // Seleciona apenas os filhos diretos do grupo (sem contar netos)
    const childList = parentGroup.querySelector('.sub-assunto-list, .sub-sub-assunto-list');
    if (!childList) return;

    const childCheckboxes = Array.from(childList.querySelectorAll(`:scope > * > div > label > ${childSelector}, :scope > * > label > ${childSelector}`));
    
    if (childCheckboxes.length === 0) return;

    const checkedChildren = childCheckboxes.filter(cb => cb.checked).length;
    const indeterminateChildren = childCheckboxes.filter(cb => cb.indeterminate).length;

    if (checkedChildren === 0 && indeterminateChildren === 0) {
        parentCheckbox.checked = false;
        parentCheckbox.indeterminate = false;
    } else if (checkedChildren === childCheckboxes.length && indeterminateChildren === 0) {
        parentCheckbox.checked = true;
        parentCheckbox.indeterminate = false;
    } else {
        parentCheckbox.checked = false;
        parentCheckbox.indeterminate = true;
    }
}
// --- FIM DA NOVA FUNÇÃO ---

export function setupCustomSelects() {
    // Popula o filtro de Matéria da aba "Questões"
    const materiaContainer = DOM.materiaFilter.querySelector('.custom-select-options');
    if (materiaContainer) {
        const materiaOptions = state.filterOptions.materia.map(m => m.name);
        materiaContainer.innerHTML = materiaOptions.map(opt => `
            <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" data-value="${opt}" class="custom-select-option rounded">
                <span>${opt}</span>
            </label>
        `).join('');
    }
    
    // ===== INÍCIO DA MODIFICAÇÃO: Chama setupCustomSelect especificamente =====
    // Configura os filtros da aba "Questões"
    if (DOM.materiaFilter) {
        setupCustomSelect(DOM.materiaFilter, updateAssuntoFilter); // Passa o callback
    }
    if (DOM.assuntoFilter) {
        setupCustomSelect(DOM.assuntoFilter); // Sem callback
    }
    // ===== FIM DA MODIFICAÇÃO =====
}

export function clearAllFilters() {
    DOM.searchInput.value = '';
    
    const materiaContainer = DOM.materiaFilter;
    materiaContainer.dataset.value = '[]';
    materiaContainer.querySelector('.custom-select-value').textContent = 'Disciplina';
    materiaContainer.querySelector('.custom-select-value').classList.add('text-gray-500');
    materiaContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => cb.checked = false);
    
    updateAssuntoFilter([]);
    const assuntoContainer = DOM.assuntoFilter;
    assuntoContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.indeterminate = false;
    });

    const activeTipo = DOM.tipoFilterGroup.querySelector('.active-filter');
    if (activeTipo) activeTipo.classList.remove('active-filter');
    DOM.tipoFilterGroup.querySelector('[data-value="todos"]').classList.add('active-filter');
    
    applyFilters();
}

export function removeFilter(type, value) {
    let container;
    let shouldApplyFilter = true;
    switch (type) {
        case 'materia': {
            container = DOM.materiaFilter;
            break;
        }
        case 'assunto': {
            // Este caso agora lida com assunto, sub-assunto e sub-sub-assunto
            container = DOM.assuntoFilter;
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
        default:
             shouldApplyFilter = false;
    }

    if (container) {
        const checkbox = container.querySelector(`.custom-select-option[data-value="${value}"]`);
        if (checkbox) {
            checkbox.checked = false;
            // Dispara o evento 'change' no container de opções para recalcular a hierarquia
            container.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    if (shouldApplyFilter) {
        applyFilters();
    }
}
