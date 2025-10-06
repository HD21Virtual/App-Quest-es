import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { renderFoldersAndCadernos, exitAddMode } from '../features/caderno.js';
import { renderMateriasView } from '../features/materias.js';
import { applyFilters, clearAllFilters } from '../features/filter.js';

const allViews = [
    'inicio-view',
    'vade-mecum-view',
    'cadernos-view',
    'materias-view',
    'revisao-view',
    'estatisticas-view'
];

export function navigateToView(viewId, isUserClick = true) {
    if (state.isAddingQuestionsMode.active && (viewId !== 'vade-mecum-view' || isUserClick)) {
        exitAddMode();
    }
    
    // Hide all views first
    allViews.forEach(id => {
        const viewElement = document.getElementById(id);
        if (viewElement) { // Defensive check
            viewElement.classList.add('hidden');
        }
    });
    
    // Show the target view
    const targetView = document.getElementById(viewId);
    if (targetView) { // Defensive check
        targetView.classList.remove('hidden');
    }

    // Update nav link styles
    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('text-blue-700', 'bg-blue-100');
        navLink.classList.add('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
    });

    document.querySelectorAll(`.nav-link[data-view="${viewId}"]`).forEach(matchingLink => {
        matchingLink.classList.add('text-blue-700', 'bg-blue-100');
        matchingLink.classList.remove('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
    });

    // View-specific logic
    if (viewId === 'vade-mecum-view') {
        if (state.isAddingQuestionsMode.active) {
            applyFilters();
        } else if (!state.isReviewSession) {
            DOM.vadeMecumTitle.textContent = "Vade Mecum de Questões";
            DOM.toggleFiltersBtn.classList.remove('hidden');
            DOM.filterCard.classList.remove('hidden');
            clearAllFilters();
        }
    } else if (viewId === 'cadernos-view') {
        renderFoldersAndCadernos();
    } else if (viewId === 'materias-view') {
        renderMateriasView();
    }

    // Close mobile menu on navigation
    if (DOM.mobileMenu) {
        DOM.mobileMenu.classList.add('hidden');
    }
}

