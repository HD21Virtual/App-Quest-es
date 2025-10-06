import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToView } from '../ui/navigation.js';
import { clearAllFilters, applyFilters } from './filter.js';

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

        const assuntosHtml = state.selectedMateria.assuntos.map(assunto => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer assunto-item" data-assunto-name="${assunto}">
                <div class="flex items-center">
                    <i class="fas fa-file-alt text-gray-400 mr-3"></i>
                    <span class="text-gray-800">${assunto}</span>
                </div>
            </div>
        `).join('');
        DOM.assuntosListContainer.innerHTML = `<div class="space-y-2">${assuntosHtml}</div>`;

    } else {
        DOM.materiasViewTitle.textContent = 'Matérias';
        DOM.materiasListContainer.classList.remove('hidden');
        DOM.assuntosListContainer.classList.add('hidden');
        DOM.backToMateriasBtn.classList.add('hidden');

        if (state.filterOptions.materia.length === 0) {
             DOM.materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Nenhuma matéria encontrada.</p>';
             return;
        }

        const materiasHtml = state.filterOptions.materia.map(materia => `
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
        DOM.materiasListContainer.innerHTML = materiasHtml;
    }
}

export function handleMateriaClick(materiaName) {
    const selected = state.filterOptions.materia.find(m => m.name === materiaName);
    setState('selectedMateria', selected);
    renderMateriasView();
}

export function handleAssuntoListClick(assuntoName) {
    const materiaName = state.selectedMateria.name;

    navigateToView('vade-mecum-view');
    
    setTimeout(() => {
        clearAllFilters();
        
        const materiaContainer = DOM.materiaFilter;
        materiaContainer.dataset.value = JSON.stringify([materiaName]);
        materiaContainer.querySelector('.custom-select-value').textContent = materiaName;
        
        setTimeout(() => {
            const assuntoContainer = DOM.assuntoFilter;
            assuntoContainer.dataset.value = JSON.stringify([assuntoName]);
            assuntoContainer.querySelector('.custom-select-value').textContent = assuntoName;
            
            applyFilters();
        }, 50);
    }, 50);
}

export function handleBackToMaterias() {
    setState('selectedMateria', null);
    renderMateriasView();
}

