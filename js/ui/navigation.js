import DOM from '../dom-elements.js';
import { exitAddMode, renderFoldersAndCadernos } from '../features/caderno.js';
import { renderMateriasView } from '../features/materias.js';
import { clearAllFilters } from './filter.js';
import { setState, state } from '../state.js';
import { updateStatsPageUI } from '../features/stats.js';

export function navigateToView(viewId, isUserClick = true) {
    // Correction: Initialize the views array inside the function
    // This ensures that the DOM elements are available when the function is called.
    const allViews = [
        DOM.inicioView,
        DOM.vadeMecumView,
        DOM.cadernosView,
        DOM.materiasView,
        DOM.revisaoView,
        DOM.estatisticasView
    ];
    
    // Sair do modo de adição apenas se estiver navegando para uma tela DIFERENTE da de questões.
    if (state.isAddingQuestionsMode.active && viewId !== 'vade-mecum-view') {
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
        // Se a navegação for um clique direto do usuário na aba "Questões",
        // devemos sempre redefinir a visualização para seu estado padrão,
        // encerrando qualquer sessão de revisão ativa.
        if (isUserClick) {
            if (state.isReviewSession) {
                setState('isReviewSession', false);
            }
            
            // Esta parte é executada independentemente de haver uma sessão de revisão,
            // desde que seja um clique do usuário e não esteja no modo "adicionar questões".
            if (!state.isAddingQuestionsMode.active) {
                DOM.vadeMecumTitle.textContent = "Vade Mecum de Questões";
                DOM.toggleFiltersBtn.classList.remove('hidden');
                DOM.filterCard.classList.remove('hidden');
                clearAllFilters(); // Esta função também aciona applyFilters() que buscará e exibirá as questões.
            }
        }
    } else if (viewId === 'cadernos-view') {
        renderFoldersAndCadernos();
    } else if (viewId === 'materias-view') {
        setState('selectedMateria', null);
        renderMateriasView();
    } else if (viewId === 'inicio-view') {
        // Chamar a atualização das estatísticas sempre que a tela inicial for exibida
        updateStatsPageUI();
    }

    if (DOM.mobileMenu) {
        DOM.mobileMenu.classList.add('hidden');
    }
}
