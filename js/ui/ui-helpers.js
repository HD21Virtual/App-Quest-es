import DOM from '../dom-elements.js';
import { state } from '../state.js';

/**
 * @file js/ui/ui-helpers.js
 * @description Funções auxiliares para manipulação da UI.
 */

export function updateAssuntoFilter(disciplinas) {
    const assuntoContainer = DOM.assuntoFilter;
    const assuntoButton = assuntoContainer.querySelector('.custom-select-button');
    const valueSpan = assuntoContainer.querySelector('.custom-select-value');
    const optionsContainer = assuntoContainer.querySelector('.custom-select-options');
    
    valueSpan.textContent = 'Assunto';
    valueSpan.classList.add('text-gray-500');
    assuntoContainer.dataset.value = '[]';
    optionsContainer.innerHTML = '';

    if (disciplinas.length === 0) {
        assuntoButton.disabled = true;
        optionsContainer.innerHTML = `<div class="p-2 text-center text-gray-400 text-sm">Selecione uma disciplina</div>`;
    } else {
        assuntoButton.disabled = false;
        let newHtml = '';
        
        disciplinas.forEach(disciplinaName => {
            const materiaObj = state.filterOptions.materia.find(m => m.name === disciplinaName);
            if (materiaObj && materiaObj.assuntos.length > 0) {
                newHtml += `<div class="font-bold text-sm text-gray-700 mt-2 px-1">${materiaObj.name}</div>`;
                
                materiaObj.assuntos.forEach(assunto => {
                    const hasSubAssuntos = assunto.subAssuntos && assunto.subAssuntos.length > 0;
                    newHtml += `
                        <div class="assunto-group">
                            <div class="flex items-center p-1 rounded-md hover:bg-gray-100">
                                ${hasSubAssuntos ? 
                                    `<i class="fas fa-chevron-right text-gray-400 w-4 text-center mr-2 cursor-pointer transition-transform duration-200 assunto-toggle"></i>` : 
                                    `<span class="w-6 mr-2"></span>`
                                }
                                <label class="flex-grow flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" data-value="${assunto.name}" data-type="assunto" class="custom-select-option rounded">
                                    <span>${assunto.name}</span>
                                </label>
                            </div>
                    `;
                    
                    if (hasSubAssuntos) {
                        newHtml += `<div class="sub-assunto-list hidden pl-6 mt-1 space-y-1">`;
                        assunto.subAssuntos.forEach(subAssunto => {
                            newHtml += `
                                <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                                    <input type="checkbox" data-value="${subAssunto}" data-parent-assunto="${assunto.name}" data-type="subassunto" class="custom-select-option rounded">
                                    <span>${subAssunto}</span>
                                </label>
                            `;
                        });
                        newHtml += `</div>`;
                    }
                    newHtml += `</div>`;
                });
            }
        });
        
        optionsContainer.innerHTML = newHtml;

        optionsContainer.querySelectorAll('.assunto-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const parent = e.target.closest('.assunto-group');
                parent.querySelector('.sub-assunto-list').classList.toggle('hidden');
                e.target.classList.toggle('rotate-90');
            });
        });
    }
}

export function updateSelectedFiltersDisplay() {
    DOM.selectedFiltersContainer.innerHTML = '';
    let hasFilters = false;

    const createFilterTag = (type, value, label) => {
        hasFilters = true;
        const tag = document.createElement('div');
        tag.className = 'flex items-center bg-gray-100 border border-gray-300 rounded-md pl-2 pr-1 py-1 text-sm';
        tag.innerHTML = `
            <span class="font-semibold mr-1">${label}:</span>
            <span class="mr-1">${value}</span>
            <button data-filter-type="${type}" data-filter-value="${value}" class="remove-filter-btn ml-1 text-gray-500 hover:text-gray-800">
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
        createFilterTag('tipo', activeTipoBtn.textContent, 'Tipo');
    }

    if (DOM.searchInput.value) {
        createFilterTag('search', DOM.searchInput.value, 'Busca');
    }

    if (!hasFilters) {
        DOM.selectedFiltersContainer.innerHTML = `<span class="text-gray-500 text-sm">Nenhum filtro aplicado.</span>`;
    }
}

export function updateUserUI(user) {
    const mobileContainer = DOM.userAccountContainerMobile;
    const desktopContainer = DOM.userAccountContainer;

    if (!mobileContainer || !desktopContainer) return;

    desktopContainer.innerHTML = '';
    mobileContainer.innerHTML = '';

    if (user) {
        const loggedInHTML = `<div class="flex items-center"><span class="text-gray-600 text-sm mr-4">${user.email}</span><button id="logout-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        const loggedInHTMLMobile = `<div class="flex items-center justify-between"><span class="text-gray-600 text-sm">${user.email}</span><button id="logout-btn-mobile" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        desktopContainer.innerHTML = loggedInHTML;
        mobileContainer.innerHTML = loggedInHTMLMobile;
    } else {
        const loggedOutHTML = `<button id="show-login-modal-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Minha Conta</button>`;
        const loggedOutHTMLMobile = `<button id="show-login-modal-btn-mobile" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 block w-full text-left px-3 py-2 rounded-md text-base font-medium">Minha Conta</button>`;
        desktopContainer.innerHTML = loggedOutHTML;
        mobileContainer.innerHTML = loggedOutHTMLMobile;
    }
}
