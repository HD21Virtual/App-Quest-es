import DOM from '../dom-elements.js';

/**
 * @file js/ui/ui-helpers.js
 * @description Funções auxiliares para manipulação de pequenos componentes da UI.
 */

export function updateSelectedFiltersDisplay() {
    DOM.selectedFiltersContainer.innerHTML = '';
    let hasFilters = false;

    const createFilterTag = (type, value, label) => {
        hasFilters = true;
        const tag = document.createElement('div');
        tag.className = 'flex items-center bg-gray-100 border border-gray-300 rounded-md pl-2 pr-1 py-1 text-sm';
        tag.innerHTML = `
            <span class="font-bold mr-2">${label}:</span>
            <span>${value}</span>
            <button data-filter-type="${type}" data-filter-value="${value}" class="remove-filter-btn ml-2 text-gray-500 hover:text-gray-800">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        DOM.selectedFiltersContainer.appendChild(tag);
    };

    const selectedMaterias = JSON.parse(DOM.materiaFilter.dataset.value || '[]');
    selectedMaterias.forEach(m => createFilterTag('materia', m, 'Disciplina'));

    const selectedAssuntos = JSON.parse(DOM.assuntoFilter.dataset.value || '[]');
    selectedAssuntos.forEach(a => createFilterTag('assunto', a, 'Assunto'));
    
    const activeTipoBtn = DOM.tipoFilterGroup.querySelector('.active-filter');
    if (activeTipoBtn && activeTipoBtn.dataset.value !== 'todos') {
        createFilterTag('tipo', activeTipoBtn.dataset.value, 'Tipo');
    }

    if (DOM.searchInput.value) {
        createFilterTag('search', DOM.searchInput.value, 'Palavra-chave');
    }

    if (!hasFilters) {
        DOM.selectedFiltersContainer.innerHTML = `<span class="text-gray-500 text-sm">Seus filtros aparecerão aqui</span>`;
    }
}
