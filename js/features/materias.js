import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { switchView } from '../ui/navigation.js';
import { applyFilters, clearAllFilters } from './filter.js';

/**
 * @file js/features/materias.js
 * @description Gerencia a lógica da view "Matérias", que permite navegar
 * por matérias e assuntos e iniciar uma sessão de estudo a partir deles.
 */

export function renderMateriasView() {
    if (state.selectedMateriaForView) {
        // Mostra a lista de assuntos da matéria selecionada
        DOM.materiasViewTitle.textContent = state.selectedMateriaForView.name;
        DOM.materiasListContainer.classList.add('hidden');
        DOM.assuntosListContainer.classList.remove('hidden');
        DOM.backToMateriasBtn.classList.remove('hidden');
        DOM.assuntosListContainer.innerHTML = state.selectedMateriaForView.assuntos.map(assunto => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer assunto-item" data-assunto-name="${assunto}">
                ${assunto}
            </div>
        `).join('');
    } else {
        // Mostra a lista de todas as matérias
        DOM.materiasViewTitle.textContent = 'Matérias';
        DOM.materiasListContainer.classList.remove('hidden');
        DOM.assuntosListContainer.classList.add('hidden');
        DOM.backToMateriasBtn.classList.add('hidden');
        DOM.materiasListContainer.innerHTML = state.filterOptions.materia.map(m => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer materia-item" data-materia-name="${m.name}">
                <h3 class="font-bold">${m.name}</h3>
                <p class="text-sm text-gray-500">${m.assuntos.length} assunto(s)</p>
            </div>
        `).join('');
    }
}

export function handleMateriasViewClick(event) {
    const materiaItem = event.target.closest('.materia-item');
    if (materiaItem) {
        const materiaName = materiaItem.dataset.materiaName;
        state.selectedMateriaForView = state.filterOptions.materia.find(m => m.name === materiaName);
        renderMateriasView();
    }
}

export function handleAssuntosViewClick(event) {
    const assuntoItem = event.target.closest('.assunto-item');
    if (assuntoItem) {
        const assuntoName = assuntoItem.dataset.assuntoName;
        const materiaName = state.selectedMateriaForView.name;

        switchView('vade-mecum-view');
        
        setTimeout(() => {
            clearAllFilters();
            // Simula a seleção nos dropdowns e aplica o filtro
            const materiaContainer = DOM.materiaFilter;
            const materiaCheckbox = materiaContainer.querySelector(`[data-value="${materiaName}"]`);
            if (materiaCheckbox) {
                materiaCheckbox.checked = true;
                materiaContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change'));
            }
            setTimeout(() => {
                const assuntoContainer = DOM.assuntoFilter;
                const assuntoCheckbox = assuntoContainer.querySelector(`[data-value="${assuntoName}"]`);
                if (assuntoCheckbox) {
                    assuntoCheckbox.checked = true;
                    assuntoContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change'));
                }
                applyFilters();
            }, 50);
        }, 50);
    }
}

export function handleBackToMaterias() {
    state.selectedMateriaForView = null;
    renderMateriasView();
}
