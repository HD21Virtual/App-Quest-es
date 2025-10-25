import DOM from '../dom-elements.js';
import { state, setState } from '../state.js';
import { navigateToView } from '../ui/navigation.js';
import { clearAllFilters, applyFilters } from './filter.js';

// --- MODIFICAÇÃO: Contagem para 4 níveis ---
function countQuestions(materia, assunto = null, subAssunto = null, subSubAssunto = null) {
    return state.allQuestions.filter(q => {
        const materiaMatch = q.materia === materia;
        const assuntoMatch = !assunto || q.assunto === assunto;
        const subAssuntoMatch = !subAssunto || q.subAssunto === subAssunto;
        // Adiciona a verificação do subSubAssunto
        const subSubAssuntoMatch = !subSubAssunto || q.subSubAssunto === subSubAssunto;
        return materiaMatch && assuntoMatch && subAssuntoMatch && subSubAssuntoMatch;
    }).length;
}
// --- FIM DA MODIFICAÇÃO ---

// --- MODIFICAÇÃO: Construção de hierarquia de 4 níveis ---
function buildHierarchy(questions, materiaName) {
    // Estrutura: Map<Assunto, Map<SubAssunto, Set<SubSubAssunto>>>
    const hierarchy = new Map();
    questions.forEach(q => {
        if (q.materia !== materiaName || !q.assunto) return;

        // Nível 1: Assunto
        if (!hierarchy.has(q.assunto)) {
            hierarchy.set(q.assunto, new Map());
        }
        const subAssuntosMap = hierarchy.get(q.assunto);

        // Nível 2: SubAssunto
        const subAssuntoKey = q.subAssunto || 'Questões Gerais';
        if (!subAssuntosMap.has(subAssuntoKey)) {
            subAssuntosMap.set(subAssuntoKey, new Set());
        }
        const subSubAssuntosSet = subAssuntosMap.get(subAssuntoKey);

        // Nível 3: SubSubAssunto
        if (q.subSubAssunto) {
            subSubAssuntosSet.add(q.subSubAssunto);
        }
    });
    return hierarchy;
}
// --- FIM DA MODIFICAÇÃO ---


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

        // --- MODIFICAÇÃO: Renderização da lista de 4 níveis ---
        const sortedAssuntos = Array.from(hierarchy.keys()).sort();
        
        sortedAssuntos.forEach(assunto => {
            const subAssuntosMap = hierarchy.get(assunto);
            const sortedSubAssuntos = Array.from(subAssuntosMap.keys()).sort();
            const totalQuestoesAssunto = countQuestions(state.selectedMateria.name, assunto);
            const hasSubAssuntos = sortedSubAssuntos.length > 0 && !(sortedSubAssuntos.length === 1 && sortedSubAssuntos[0] === 'Questões Gerais');

            listItemsHtml += `
                <li class="assunto-group">
                    <div class="flex justify-between items-center p-2 hover:bg-gray-100 rounded-lg">
                        <div class="flex items-center flex-grow cursor-pointer" data-action="toggle-assunto">
                            ${hasSubAssuntos ? '<i class="fas fa-chevron-right text-gray-400 w-4 text-center mr-2 transition-transform duration-200 rotate-90"></i>' : '<span class="w-6 mr-2"></span>'}
                            <span class="font-semibold text-gray-800">${assunto}</span>
                        </div>
                        <div class="w-20 flex justify-center">
                            <span class="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-lg w-full text-center">${totalQuestoesAssunto}</span>
                        </div>
                    </div>
            `;

            if (hasSubAssuntos) {
                listItemsHtml += '<ul class="pl-8 mt-1 space-y-1">';
                sortedSubAssuntos.forEach(subAssunto => {
                    if (subAssunto === 'Questões Gerais') return; // Não mostra 'Questões Gerais' como um item clicável
                    
                    const subSubAssuntosSet = subAssuntosMap.get(subAssunto);
                    const sortedSubSubAssuntos = Array.from(subSubAssuntosSet).sort();
                    const totalQuestoesSubAssunto = countQuestions(state.selectedMateria.name, assunto, subAssunto);
                    const hasSubSubAssuntos = sortedSubSubAssuntos.length > 0;

                    listItemsHtml += `
                        <li class="sub-assunto-group">
                            <div class="flex justify-between items-center p-2 hover:bg-blue-50 rounded-lg" data-action="toggle-subassunto">
                                <div class="flex items-center flex-grow cursor-pointer">
                                    ${hasSubSubAssuntos ? '<i class="fas fa-chevron-right text-gray-400 w-4 text-center mr-2 transition-transform duration-200 rotate-90"></i>' : '<span class="w-6 mr-2"></span>'}
                                    <span class="sub-assunto-item" data-materia-name="${state.selectedMateria.name}" data-assunto-name="${assunto}" data-subassunto-name="${subAssunto}">${subAssunto}</span>
                                </div>
                                <div class="w-20 flex justify-center">
                                    <span class="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-lg w-full text-center">${totalQuestoesSubAssunto}</span>
                                </div>
                            </div>
                    `;

                    if (hasSubSubAssuntos) {
                        listItemsHtml += '<ul class="pl-8 mt-1 space-y-1">';
                        sortedSubSubAssuntos.forEach(subSubAssunto => {
                            const totalQuestoesSubSubAssunto = countQuestions(state.selectedMateria.name, assunto, subAssunto, subSubAssunto);
                            listItemsHtml += `
                                <li class="sub-sub-assunto-item cursor-pointer flex justify-between items-center p-2 hover:bg-green-50 rounded-lg" data-materia-name="${state.selectedMateria.name}" data-assunto-name="${assunto}" data-subassunto-name="${subAssunto}" data-subsubassunto-name="${subSubAssunto}">
                                    <span>${subSubAssunto}</span>
                                    <div class="w-20 flex justify-center">
                                    <span class="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-lg w-full text-center">${totalQuestoesSubSubAssunto}</span>
                                    </div>
                                </li>
                            `;
                        });
                        listItemsHtml += '</ul>';
                    }
                    listItemsHtml += '</li>';
                });
                listItemsHtml += '</ul>';
            }
            listItemsHtml += '</li>';
        });
        // --- FIM DA MODIFICAÇÃO ---

        const searchBarHtml = `
            <div class="mb-4 flex items-center gap-2">
                <div class="relative flex-grow">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                        <i class="fas fa-search text-gray-400"></i>
                    </span>
                    <input type="text" id="assunto-search-input" placeholder="Digite o nome ou trecho do assunto." class="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <button id="assunto-search-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Buscar</button>
            </div>
        `;

        const cardHtml = `
            <div id="assuntos-card" class="bg-gray-50 p-6 rounded-xl shadow-md">
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

        DOM.assuntosListContainer.innerHTML = searchBarHtml + cardHtml;

        const searchInput = document.getElementById('assunto-search-input');
        const searchBtn = document.getElementById('assunto-search-btn');

        // --- MODIFICAÇÃO: Lógica de busca para 4 níveis ---
        const performSearch = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const card = document.getElementById('assuntos-card');
            const assuntoGroups = card.querySelectorAll('.assunto-group');

            assuntoGroups.forEach(group => {
                const assuntoText = group.querySelector('[data-action="toggle-assunto"] > .font-semibold').textContent.toLowerCase();
                const subAssuntoGroups = group.querySelectorAll('.sub-assunto-group');
                let hasVisibleSubAssunto = false;

                subAssuntoGroups.forEach(subGroup => {
                    const subAssuntoText = subGroup.querySelector('.sub-assunto-item').textContent.toLowerCase();
                    const subSubAssuntoItems = subGroup.querySelectorAll('.sub-sub-assunto-item');
                    let hasVisibleSubSubAssunto = false;

                    subSubAssuntoItems.forEach(item => {
                        const subSubAssuntoText = item.querySelector('span').textContent.toLowerCase();
                        if (subSubAssuntoText.includes(searchTerm)) {
                            item.style.display = 'flex';
                            hasVisibleSubSubAssunto = true;
                        } else {
                            item.style.display = 'none';
                        }
                    });

                    if (subAssuntoText.includes(searchTerm) || hasVisibleSubSubAssunto) {
                        subGroup.style.display = 'block';
                        hasVisibleSubAssunto = true;
                        if (searchTerm && hasVisibleSubSubAssunto) {
                            subGroup.querySelector('ul')?.classList.remove('hidden');
                            subGroup.querySelector('i')?.classList.add('rotate-90');
                        }
                    } else {
                        subGroup.style.display = 'none';
                    }
                });

                if (assuntoText.includes(searchTerm) || hasVisibleSubAssunto) {
                    group.style.display = 'block';
                    if (searchTerm && hasVisibleSubAssunto) {
                        group.querySelector('ul')?.classList.remove('hidden');
                        group.querySelector('i')?.classList.add('rotate-90');
                    }
                } else {
                    group.style.display = 'none';
                }
            });
        };
        // --- FIM DA MODIFICAÇÃO ---

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });

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
            <div class="bg-gray-50 p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer materia-item rounded-lg" data-materia-name="${materia.name}">
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
    // --- MODIFICAÇÃO: Lógica de clique e toggle para 4 níveis ---
    const subSubAssuntoItem = event.target.closest('.sub-sub-assunto-item');
    const subAssuntoItem = event.target.closest('.sub-assunto-item');
    const toggleAssunto = event.target.closest('[data-action="toggle-assunto"]');
    const toggleSubAssunto = event.target.closest('[data-action="toggle-subassunto"]');

    if (toggleAssunto) {
        const parentLi = toggleAssunto.closest('.assunto-group');
        const sublist = parentLi.querySelector('ul');
        const icon = toggleAssunto.querySelector('i');
        if (sublist) {
            sublist.classList.toggle('hidden');
            icon.classList.toggle('rotate-90');
        }
        return;
    }

    if (toggleSubAssunto) {
        const parentLi = toggleSubAssunto.closest('.sub-assunto-group');
        const sublist = parentLi.querySelector('ul');
        const icon = toggleSubAssunto.querySelector('i');
        if (sublist) {
            sublist.classList.toggle('hidden');
            icon.classList.toggle('rotate-90');
        }
        return;
    }

    let filterItem = null;
    if (subSubAssuntoItem) {
        filterItem = subSubAssuntoItem;
    } else if (subAssuntoItem && !event.target.closest('[data-action="toggle-subassunto"]')) {
        // Clica no sub-assunto, mas não no ícone de toggle
        filterItem = subAssuntoItem;
    }
    
    if (filterItem) {
        const { materiaName, assuntoName, subassuntoName, subsubassuntoName } = filterItem.dataset;

        navigateToView('vade-mecum-view', false);

        setTimeout(() => {
            clearAllFilters();
            
            // 1. Seleciona Matéria
            const materiaCheckbox = DOM.materiaFilter.querySelector(`.custom-select-option[data-value="${materiaName}"]`);
            if (materiaCheckbox) {
                materiaCheckbox.checked = true;
                DOM.materiaFilter.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // 2. Aguarda o filtro de assunto ser populado
            setTimeout(() => {
                // 3. Seleciona Assunto, SubAssunto e (se houver) SubSubAssunto
                const assuntoCheckbox = DOM.assuntoFilter.querySelector(`.custom-select-option[data-value="${assuntoName}"]`);
                if (assuntoCheckbox) {
                    assuntoCheckbox.checked = true;
                }
                
                const subAssuntoCheckbox = DOM.assuntoFilter.querySelector(`.custom-select-option[data-value="${subassuntoName}"]`);
                if (subAssuntoCheckbox) {
                    subAssuntoCheckbox.checked = true;
                }

                if (subsubassuntoName) {
                    const subSubAssuntoCheckbox = DOM.assuntoFilter.querySelector(`.custom-select-option[data-value="${subsubassuntoName}"]`);
                    if (subSubAssuntoCheckbox) {
                        subSubAssuntoCheckbox.checked = true;
                    }
                }

                // 4. Dispara o evento de change no container de assuntos para aplicar a seleção
                DOM.assuntoFilter.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));

                // 5. Aplica os filtros
                applyFilters(); 
            }, 100); // Pequeno delay para garantir que o DOM do filtro de assunto foi atualizado
        }, 50); // Pequeno delay para garantir a navegação da view
    }
    // --- FIM DA MODIFICAÇÃO ---
}

export function handleBackToMaterias() {
    setState('selectedMateria', null);
    renderMateriasView();
}
