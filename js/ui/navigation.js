import DOM from '../dom-elements.js';
import { exitAddMode, renderFoldersAndCadernos } from '../features/caderno.js';
import { renderMateriasView } from '../features/materias.js';
import { clearAllFilters } from '../features/filter.js';
import { setState, state } from '../state.js';

const allViews = [
    DOM.inicioView,
    DOM.vadeMecumView,
    DOM.cadernosView,
    DOM.materiasView,
    DOM.revisaoView,
    DOM.estatisticasView
];

export function navigateToView(viewId, isUserClick = true) {
    if (state.isAddingQuestionsMode.active && (viewId !== 'vade-mecum-view' || isUserClick)) {
        exitAddMode();
    }

    if (viewId === 'cadernos-view' && !state.isNavigatingBackFromAddMode) {
        setState('currentFolderId', null);
        setState('currentCadernoId', null);
    }
    setState('isNavigatingBackFromAddMode', false);

    allViews.forEach(v => {
        if (v) v.classList.add('hidden');
    });

    const targetView = allViews.find(v => v && v.id === viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('text-blue-700', 'bg-blue-100');
        navLink.classList.add('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
    });

    document.querySelectorAll(`.nav-link[data-view="${viewId}"]`).forEach(matchingLink => {
        matchingLink.classList.add('text-blue-700', 'bg-blue-100');
        matchingLink.classList.remove('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
    });

    if (viewId === 'vade-mecum-view') {
        if (!state.isReviewSession && isUserClick) {
            DOM.vadeMecumTitle.textContent = "Vade Mecum de Questões";
            DOM.toggleFiltersBtn.classList.remove('hidden');
            DOM.filterCard.classList.remove('hidden');
            clearAllFilters();
        }
    } else if (viewId === 'cadernos-view') {
        renderFoldersAndCadernos();
    } else if (viewId === 'materias-view') {
        setState('selectedMateria', null);
        renderMateriasView();
    }

    if (DOM.mobileMenu) {
        DOM.mobileMenu.classList.add('hidden');
    }
}

