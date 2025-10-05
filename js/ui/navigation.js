import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { exitAddMode, renderFoldersAndCadernos } from '../features/caderno.js';
import { applyFilters, clearAllFilters } from '../features/filter.js';
import { renderMateriasView } from '../features/materias.js';

/**
 * @file js/ui/navigation.js
 * @description Controla a navegação entre as diferentes "views" da aplicação.
 */

const views = {
    'inicio-view': DOM.inicioView,
    'vade-mecum-view': DOM.vadeMecumView,
    'cadernos-view': DOM.cadernosView,
    'materias-view': DOM.materiasView,
    'revisao-view': DOM.revisaoView,
    'estatisticas-view': DOM.estatisticasView,
};

export function handleNavigation(event) {
    event.preventDefault();
    const viewId = event.currentTarget.dataset.view;
    switchView(viewId, true); // isUserClick = true
    DOM.mobileMenu.classList.add('hidden');
}

export function handleHamburgerMenu() {
    DOM.mobileMenu.classList.toggle('hidden');
}

export function switchView(viewId, isUserClick = false) {
    // Lógica para sair de modos especiais ao navegar
    if (state.isAddingQuestionsMode.active && (viewId !== 'vade-mecum-view' || isUserClick)) {
        exitAddMode();
    }

    if (viewId === 'cadernos-view' && !state.isNavigatingBackFromAddMode) {
        state.currentFolderId = null;
        state.currentCadernoId = null;
    }
    state.isNavigatingBackFromAddMode = false;

    // Esconde todas as views e mostra a selecionada
    Object.values(views).forEach(v => v.classList.add('hidden'));
    if (views[viewId]) {
        views[viewId].classList.remove('hidden');
    }

    updateNavigationLinks(viewId);

    // Lógica de inicialização de cada view
    switch (viewId) {
        case 'vade-mecum-view':
            if (state.isAddingQuestionsMode.active) {
                applyFilters();
            } else if (!state.isReviewSession) {
                DOM.vadeMecumTitle.textContent = "Vade Mecum de Questões";
                DOM.toggleFiltersBtn.classList.remove('hidden');
                DOM.filterCard.classList.remove('hidden');
                clearAllFilters();
            }
            break;
        case 'cadernos-view':
            renderFoldersAndCadernos();
            break;
        case 'materias-view':
            state.selectedMateriaForView = null;
            renderMateriasView();
            break;
    }
}

function updateNavigationLinks(activeViewId) {
    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('text-blue-700', 'bg-blue-100');
        navLink.classList.add('text-gray-500');
    });

    document.querySelectorAll(`.nav-link[data-view="${activeViewId}"]`).forEach(matchingLink => {
        matchingLink.classList.add('text-blue-700', 'bg-blue-100');
        matchingLink.classList.remove('text-gray-500');
    });
}
