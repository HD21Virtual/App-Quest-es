import DOM from '../dom-elements.js';
import { state, setState } from '../state.js';
import { navigateToView } from '../ui/navigation.js';
import { clearAllFilters, applyFilters } from './filter.js';

function countQuestions(materia, assunto = null, subAssunto = null) {
    return state.allQuestions.filter(q => {
        const materiaMatch = q.materia === materia;
        const assuntoMatch = !assunto || q.assunto === assunto;
        const subAssuntoMatch = !subAssunto || q.subAssunto === subAssunto;
        return materiaMatch && assuntoMatch && subAssuntoMatch;
    }).length;
}

function buildHierarchy(questions, materiaName) {
    const hierarchy = new Map();
    questions.forEach(q => {
        if (q.materia !== materiaName) return;

        if (!hierarchy.has(q.assunto)) {
            hierarchy.set(q.assunto, new Set());
        }
        if (q.subAssunto) {
            hierarchy.get(q.assunto).add(q.subAssunto);
        }
    });
    return hierarchy;
}


export function renderMateriasView() {
    if (!state.currentUser) {
        DOM.materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Por favor, faça login para ver as matérias.</p>';
        DOM.assuntosListContainer.classList.add('hidden');
        return;
    }

    if (state.selectedMateria) {
        DOM.materiasViewTitle.textContent = state.selectedMateria.name;
        DOM.materiasListContainer.classList.add('hidden');
        DOM.assuntosListContainer.classList.remove('hidden');
        DOM.backToMateriasBtn.classList.remove('hidden');

        const hierarchy = buildHierarchy(state.allQuestions, state.selectedMateria.name);
        let listItemsHtml = '';

        hierarchy.forEach((subAssuntosSet, assunto) => {
            const subAssuntos = Array.from(subAssuntosSet).sort();
            const totalQuestoesAssunto = countQuestions(state.selectedMateria.name, assunto);

            listItemsHtml += `
                <li class="assunto-group">
                    <div class="flex justify-between items-center p-2 hover:bg-gray-100">
                        <div class="flex items-center flex-grow cursor-pointer" data-action="toggle">
                            ${subAssuntos.length > 0 ? '<i class="fas fa-chevron-right text-gray-400 w-4 text-center mr-2 transition-transform duration-200 rotate-90"></i>' : '<span class="w-6 mr-2"></span>'}
                            <span class="font-semibold text-gray-800">${assunto}</span>
                        </div>
                        <div class="w-20 flex justify-center">
                            <span class="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-md w-full text-center">${totalQuestoesAssunto}</span>
                        </div>
                    </div>
            `;

            if (subAssuntos.length > 0) {
                listItemsHtml += '<ul class="pl-8 mt-1 space-y-1">';
                subAssuntos.forEach(sub => {
                    const totalQuestoesSubAssunto = countQuestions(state.selectedMateria.name, assunto, sub);
                    listItemsHtml += `
                        <li class="sub-assunto-item cursor-pointer flex justify-between items-center p-2 hover:bg-blue-50" data-materia-name="${state.selectedMateria.name}" data-assunto-name="${assunto}" data-subassunto-name="${sub}">
                            <span>${sub}</span>
                            <div class="w-20 flex justify-center">
                               <span class="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-md w-full text-center">${totalQuestoesSubAssunto}</span>
                            </div>
                        </li>
                    `;
                });
                listItemsHtml += '</ul>';
            }
            listItemsHtml += '</li>';
        });

        const assuntosHtml = `
            <div class="bg-white p-4 shadow-sm">
                <div class="flex justify-between items-center p-2 mb-2 border-b">
                    <h3 class="font-bold text-gray-600">Assuntos desta matéria</h3>
                    <div class="w-20 text-center">
                        <h3 class="font-bold text-gray-600">Questões</h3>
                    </div>
                </div>
                <ul class="space-y-1">
                    ${listItemsHtml}
                </ul>
            </div>
        `;
        DOM.assuntosListContainer.innerHTML = assuntosHtml;

    } else {
        DOM.materiasViewTitle.textContent = 'Matérias';
        DOM.materiasListContainer.classList.remove('hidden');
        DOM.assuntosListContainer.classList.add('hidden');
        DOM.backToMateriasBtn.classList.add('hidden');

        if (state.filterOptions.materia.length === 0) {
            DOM.materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Nenhuma matéria encontrada. Adicione questões para vê-las aqui.</p>';
            return;
        }

        const materiasHtml = state.filterOptions.materia.map(materia => {
            const totalQuestoes = countQuestions(materia.name);
             return `
            <div class="bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer materia-item" data-materia-name="${materia.name}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <i class="fas fa-book-open text-blue-500 mr-4 text-xl"></i>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${materia.name}</h3>
                            <p class="text-sm text-gray-500">${totalQuestoes} questões</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
            </div>
        `}).join('');
        DOM.materiasListContainer.innerHTML = materiasHtml;
    }
}


export function handleMateriaListClick(event) {
    const materiaItem = event.target.closest('.materia-item');
    if (materiaItem) {
        const materiaName = materiaItem.dataset.materiaName;
        const materiaData = state.filterOptions.materia.find(m => m.name === materiaName) || { name: materiaName, assuntos: [] };
        setState('selectedMateria', materiaData);
        renderMateriasView();
    }
}

export function handleAssuntoListClick(event) {
    const subAssuntoItem = event.target.closest('.sub-assunto-item');
    const toggleItem = event.target.closest('[data-action="toggle"]');

    if (toggleItem) {
        const parentLi = toggleItem.closest('.assunto-group');
        const sublist = parentLi.querySelector('ul');
        const icon = toggleItem.querySelector('i');
        if (sublist) {
            sublist.classList.toggle('hidden');
            icon.classList.toggle('rotate-90');
        }
        return;
    }


    if (subAssuntoItem) {
        const { materiaName, assuntoName, subassuntoName } = subAssuntoItem.dataset;

        navigateToView('vade-mecum-view', false);

        setTimeout(() => {
            clearAllFilters();
            
            const materiaCheckbox = DOM.materiaFilter.querySelector(`.custom-select-option[data-value="${materiaName}"]`);
            if (materiaCheckbox) {
                materiaCheckbox.checked = true;
                DOM.materiaFilter.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            setTimeout(() => {
                const assuntoCheckbox = DOM.assuntoFilter.querySelector(`.custom-select-option[data-value="${assuntoName}"]`);
                if (assuntoCheckbox) {
                    assuntoCheckbox.checked = true;
                }
                
                const subAssuntoCheckbox = DOM.assuntoFilter.querySelector(`.custom-select-option[data-value="${subassuntoName}"]`);
                if (subAssuntoCheckbox) {
                    subAssuntoCheckbox.checked = true;
                }

                DOM.assuntoFilter.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));

                applyFilters(); 
            }, 100);
        }, 50);
    }
}

export function handleBackToMaterias() {
    setState('selectedMateria', null);
    renderMateriasView();
}

