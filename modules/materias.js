import { elements, navigateToView } from './ui.js';
import { getState } from '../state.js';
import { clearAllFilters, setMateriaFilter, setAssuntoFilter } from './filters.js';

let selectedMateria = null;

/**
 * Define a matéria atualmente selecionada.
 * @param {object|null} materia - O objeto da matéria ou null.
 */
export function setSelectedMateria(materia) {
    selectedMateria = materia;
}

/**
 * Renderiza a view de Matérias, mostrando a lista de matérias ou os assuntos de uma matéria selecionada.
 */
export function renderMateriasView() {
    const { filterOptions } = getState();
    const { materiasListContainer, assuntosListContainer, backToMateriasBtn } = elements.materiasViewElements;
    const { materiasViewTitle } = elements.materiasViewElements;


    if (selectedMateria) {
        // Exibe os assuntos da matéria selecionada
        materiasViewTitle.textContent = selectedMateria.name;
        materiasListContainer.classList.add('hidden');
        assuntosListContainer.classList.remove('hidden');
        backToMateriasBtn.classList.remove('hidden');

        const assuntosHtml = selectedMateria.assuntos.map(assunto => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer assunto-item" data-assunto-name="${assunto}">
                <div class="flex items-center">
                    <i class="fas fa-file-alt text-gray-400 mr-3"></i>
                    <span class="text-gray-800">${assunto}</span>
                </div>
            </div>
        `).join('');
        assuntosListContainer.innerHTML = `<div class="space-y-2">${assuntosHtml}</div>`;

    } else {
        // Exibe todas as matérias
        materiasViewTitle.textContent = 'Matérias';
        materiasListContainer.classList.remove('hidden');
        assuntosListContainer.classList.add('hidden');
        backToMateriasBtn.classList.add('hidden');

        if (!filterOptions || filterOptions.materia.length === 0) {
             materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Nenhuma matéria encontrada.</p>';
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
        materiasListContainer.innerHTML = materiasHtml;
    }
}

/**
 * Configura os listeners de eventos para a view de Matérias.
 */
export function setupMateriasListeners() {
    const { materiasListContainer, assuntosListContainer, backToMateriasBtn } = elements.materiasViewElements;

    materiasListContainer.addEventListener('click', (event) => {
        const materiaItem = event.target.closest('.materia-item');
        if (materiaItem) {
            const materiaName = materiaItem.dataset.materiaName;
            const { filterOptions } = getState();
            selectedMateria = filterOptions.materia.find(m => m.name === materiaName);
            renderMateriasView();
        }
    });

    assuntosListContainer.addEventListener('click', (event) => {
        const assuntoItem = event.target.closest('.assunto-item');
        if (assuntoItem) {
            const assuntoName = assuntoItem.dataset.assuntoName;
            const materiaName = selectedMateria.name;

            // 1. Navega para a view de Questões
            navigateToView('vade-mecum-view');
            
            // 2. Aplica os filtros
            setTimeout(() => {
                clearAllFilters();
                setMateriaFilter([materiaName]);
                // Outro timeout para garantir que a lista de assuntos foi atualizada
                setTimeout(() => {
                    setAssuntoFilter([assuntoName]);
                }, 50);
            }, 50);
        }
    });

    backToMateriasBtn.addEventListener('click', () => {
        selectedMateria = null;
        renderMateriasView();
    });
}
