import { getState, setState } from '../services/state.js';
import { elements, navigateToView } from './ui.js';
import { clearAllFilters, applyFilters } from './filters.js';

let selectedMateria = null;

/**
 * Renderiza a visualização de matérias ou de assuntos, dependendo do estado.
 */
export function renderMateriasView() {
    const { currentUser, filterOptions } = getState();

    if (!currentUser) {
        elements.materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Por favor, faça login para ver as matérias.</p>';
        elements.assuntosListContainer.classList.add('hidden');
        return;
    }

    if (selectedMateria) {
        // Exibe os assuntos da matéria selecionada
        elements.materiasViewTitle.textContent = selectedMateria.name;
        elements.materiasListContainer.classList.add('hidden');
        elements.assuntosListContainer.classList.remove('hidden');
        elements.backToMateriasBtn.classList.remove('hidden');

        const assuntosHtml = selectedMateria.assuntos.map(assunto => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer assunto-item" data-assunto-name="${assunto}">
                <div class="flex items-center">
                    <i class="fas fa-file-alt text-gray-400 mr-3"></i>
                    <span class="text-gray-800">${assunto}</span>
                </div>
            </div>
        `).join('');
        elements.assuntosListContainer.innerHTML = `<div class="space-y-2">${assuntosHtml}</div>`;

    } else {
        // Exibe todas as matérias
        elements.materiasViewTitle.textContent = 'Matérias';
        elements.materiasListContainer.classList.remove('hidden');
        elements.assuntosListContainer.classList.add('hidden');
        elements.backToMateriasBtn.classList.add('hidden');

        if (filterOptions.materia.length === 0) {
             elements.materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Nenhuma matéria encontrada.</p>';
             return;
        }

        const materiasHtml = filterOptions.materia.map(materia => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer materia-item" data-materia-name="${materia.name}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <i class="fas fa-book-open text-blue-500 mr-4 text-xl"></i>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${materia.name}</h3>
                            <p class="text-sm text-gray-500">${materia.assuntos.length} assunto(s)</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
            </div>
        `).join('');
        elements.materiasListContainer.innerHTML = materiasHtml;
    }
}

/**
 * Trata o clique em uma matéria, exibindo seus assuntos.
 * @param {Event} event - O evento de clique.
 */
export function handleMateriaClick(event) {
    const materiaItem = event.target.closest('.materia-item');
    if (materiaItem) {
        const materiaName = materiaItem.dataset.materiaName;
        const { filterOptions } = getState();
        selectedMateria = filterOptions.materia.find(m => m.name === materiaName);
        renderMateriasView();
    }
}

/**
 * Trata o clique em um assunto, navegando para a tela de questões e aplicando os filtros.
 * @param {Event} event - O evento de clique.
 */
export function handleAssuntoClick(event) {
    const assuntoItem = event.target.closest('.assunto-item');
    if (assuntoItem && selectedMateria) {
        const assuntoName = assuntoItem.dataset.assuntoName;
        const materiaName = selectedMateria.name;

        navigateToView('vade-mecum-view');
        
        setTimeout(() => {
            clearAllFilters();

            const materiaContainer = document.getElementById('materia-filter');
            const materiaCheckbox = materiaContainer.querySelector(`.custom-select-option[data-value="${materiaName}"]`);
            if (materiaCheckbox) {
                materiaCheckbox.checked = true;
                materiaContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            }

            setTimeout(() => {
                const assuntoContainer = document.getElementById('assunto-filter');
                const assuntoCheckbox = assuntoContainer.querySelector(`.custom-select-option[data-value="${assuntoName}"]`);
                if (assuntoCheckbox) {
                    assuntoCheckbox.checked = true;
                    assuntoContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
                }
                applyFilters();
            }, 50); 
        }, 50);
    }
}

/**
 * Volta para a lista de matérias.
 */
export function handleBackToMaterias() {
    selectedMateria = null;
    renderMateriasView();
}

