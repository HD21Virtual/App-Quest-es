import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { exitAddMode, renderFoldersAndCadernos } from '../features/caderno.js';
import { renderMateriasView } from '../features/materias.js';
import { clearAllFilters } from '../features/filter.js';

/**
 * @file js/ui/navigation.js
 * @description Controla a navegação entre as diferentes visualizações (telas) da aplicação.
 */

export function handleNavigation(event) {
    event.preventDefault();
    const viewId = event.target.closest('.nav-link').dataset.view;
    const isUserClick = event.isTrusted;

    if (state.isAddingQuestionsMode.active && (viewId !== 'vade-mecum-view' || isUserClick)) {
        exitAddMode();
    }
    
    navigateToView(viewId);
}

export function navigateToView(viewId, options = {}) {
    // Esconde todas as views
    Object.values(DOM).forEach(element => {
        if (element && element.id && element.id.endsWith('-view')) {
            element.classList.add('hidden');
        }
    });
    // Mostra a view alvo
    DOM[viewId].classList.remove('hidden');

    // Atualiza o estado visual dos links de navegação
    updateNavLinks(viewId);
    
    // Lógica específica para cada view
    if (viewId === 'vade-mecum-view') {
        if (!options.isProgrammatic) { // Se não for uma navegação interna (ex: de matérias)
            state.isReviewSession = false;
            DOM.vadeMecumTitle.textContent = "Vade Mecum de Questões";
            DOM.toggleFiltersBtn.classList.remove('hidden');
            DOM.filterCard.classList.remove('hidden');
            clearAllFilters();
        }
    } else if (viewId === 'cadernos-view') {
        if (!options.isProgrammatic) {
            state.currentFolderId = null;
            state.currentCadernoId = null;
        }
        renderFoldersAndCadernos();
    } else if (viewId === 'materias-view') {
        state.selectedMateria = null;
        renderMateriasView();
    }

    DOM.mobileMenu.classList.add('hidden');
}

function updateNavLinks(activeViewId) {
    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('text-blue-700', 'bg-blue-100');
        navLink.classList.add('text-gray-500');
    });
    document.querySelectorAll(`.nav-link[data-view="${activeViewId}"]`).forEach(matchingLink => {
        matchingLink.classList.add('text-blue-700', 'bg-blue-100');
        matchingLink.classList.remove('text-gray-500');
    });
}

export function handleHamburgerMenu() {
    DOM.mobileMenu.classList.toggle('hidden');
}

