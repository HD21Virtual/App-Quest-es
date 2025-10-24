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
        
        const assuntoMatch = selectedAssuntosAndSub.length === 0 || 
                             selectedAssuntosAndSub.includes(q.assunto) || 
                             (q.subAssunto && selectedAssuntosAndSub.includes(q.subAssunto)) ||
                             (q.subSubAssunto && selectedAssuntosAndSub.includes(q.subSubAssunto)); // ADICIONADO

        const tipoMatch = selectedTipo === 'todos' || q.tipo === selectedTipo;
        const searchMatch = !searchTerm || 
                            q.text.toLowerCase().includes(searchTerm) || 
                            (q.assunto && q.assunto.toLowerCase().includes(searchTerm)) || 
                            (q.subAssunto && q.subAssunto.toLowerCase().includes(searchTerm)) ||
                            (q.subSubAssunto && q.subSubAssunto.toLowerCase().includes(searchTerm)); // ADICIONADO
        
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

        document.querySelectorAll('.custom-select-container').forEach(otherContainer => {
            if (otherContainer !== container) {
                otherContainer.querySelector('.custom-select-panel').classList.add('hidden');
            }
        });
        
        panel.classList.toggle('hidden');
    });
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        optionsContainer.querySelectorAll('label, .assunto-group > div').forEach(el => {
            const text = el.textContent.toLowerCase();
            el.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    optionsContainer.addEventListener('change', (e) => {
        const changedCheckbox = e.target;
        
        if (container.id === 'assunto-filter' && changedCheckbox.matches('.custom-select-option')) {
            const isChecked = changedCheckbox.checked;
            const type = changedCheckbox.dataset.type;
            const parentGroup = changedCheckbox.closest('.assunto-group, .sub-assunto-group');

            const setChildren = (parentList, checked) => {
                if (parentList) {
                    parentList.querySelectorAll('.custom-select-option').forEach(childCb => {
                        childCb.checked = checked;
                        childCb.indeterminate = false; // Garante que filhos não fiquem indeterminados
                    });
                }
            };

            const updateParent = (parentListSelector, childCheckboxSelector) => {
                const parentGroup = changedCheckbox.closest(parentListSelector);
                if (!parentGroup) return;

                const parentCheckbox = parentGroup.querySelector(childCheckboxSelector);
                if (!parentCheckbox) return;

                const allSiblings = Array.from(parentGroup.querySelectorAll(`.custom-select-option[data-type="${type}"]`));
                const checkedSiblings = allSiblings.filter(cb => cb.checked);
                const indeterminateSiblings = allSiblings.filter(cb => cb.indeterminate);

                if (checkedSiblings.length === 0 && indeterminateSiblings.length === 0) {
                    parentCheckbox.checked = false;
                    parentCheckbox.indeterminate = false;
                } else if (checkedSiblings.length === allSiblings.length) {
                    parentCheckbox.checked = true;
                    parentCheckbox.indeterminate = false;
                } else {
                    parentCheckbox.checked = false;
                    parentCheckbox.indeterminate = true;
                }
                return parentCheckbox; // Retorna o pai para atualizações em cadeia
            };

            if (type === 'assunto') {
                const subList = parentGroup.querySelector('.sub-assunto-list');
                setChildren(subList, isChecked);
            } else if (type === 'subassunto') {
                const subSubList = parentGroup.querySelector('.sub-sub-assunto-list');
                setChildren(subSubList, isChecked);
                // Atualiza o pai (assunto)
                updateParent('.assunto-group', '.custom-select-option[data-type="assunto"]');
            } else if (type === 'subsubassunto') {
                // Atualiza o pai (subassunto)
                const subAssuntoCheckbox = updateParent('.sub-assunto-group', '.custom-select-option[data-type="subassunto"]');
                // Se o subassunto foi atualizado, propaga a mudança para o avô (assunto)
                if (subAssuntoCheckbox) {
                    const assuntoGroup = subAssuntoCheckbox.closest('.assunto-group');
                    if (assuntoGroup) {
                        const assuntoCheckbox = assuntoGroup.querySelector('.custom-select-option[data-type="assunto"]');
                        const allSubAssuntos = Array.from(assuntoGroup.querySelectorAll('.custom-select-option[data-type="subassunto"]'));
                        const checkedSubAssuntos = allSubAssuntos.filter(cb => cb.checked);
                        const indeterminateSubAssuntos = allSubAssuntos.filter(cb => cb.indeterminate);

                        if (checkedSubAssuntos.length === 0 && indeterminateSubAssuntos.length === 0) {
                            assuntoCheckbox.checked = false;
                            assuntoCheckbox.indeterminate = false;
                        } else if (checkedSubAssuntos.length === allSubAssuntos.length) {
                            assuntoCheckbox.checked = true;
                            assuntoCheckbox.indeterminate = false;
                        } else {
                            assuntoCheckbox.checked = false;
                            assuntoCheckbox.indeterminate = true;
                        }
                    }
                }
            }
        }

        const selected = [];
        const selectedText = [];
        optionsContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => {
            selected.push(cb.dataset.value);
            const label = cb.closest('label');
            selectedText.push(label && label.querySelector('span') ? label.querySelector('span').textContent : cb.dataset.value);
        });

        container.dataset.value = JSON.stringify(selected);

        if (selected.length === 0) {
            valueSpan.textContent = originalText;
            valueSpan.classList.add('text-gray-500');
        } else if (selected.length === 1) {
            valueSpan.textContent = selectedText[0];
            valueSpan.classList.remove('text-gray-500');
        } else {
            valueSpan.textContent = `${selected.length} itens selecionados`;
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
            container.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    if (shouldApplyFilter) {
        applyFilters();
    }
}

