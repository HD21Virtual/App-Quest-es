import DOM from '../dom-elements.js';
import { exitAddMode, renderFoldersAndCadernos } from '../features/caderno.js';
import { renderMateriasView } from '../features/materias.js';
import { clearAllFilters } from '../features/filter.js';
import { setState, state } from '../state.js';
import { updateStatsPageUI, renderEstatisticasView } from '../features/stats.js';
import { renderReviewView } from '../features/srs.js';

// ===== INÍCIO DA MODIFICAÇÃO: Função agora é async =====
export async function navigateToView(viewId, isUserClick = true) {
// ===== FIM DA MODIFICAÇÃO =====
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

    // NEW LOGIC for navigation links
    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('active-nav');
    });

    document.querySelectorAll(`.nav-link[data-view="${viewId}"]`).forEach(matchingLink => {
        matchingLink.classList.add('active-nav');
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
    } else if (viewId === 'revisao-view') {
        renderReviewView();
    } else if (viewId === 'estatisticas-view') {
        // ===== INÍCIO DA MODIFICAÇÃO: Adicionado await =====
        await renderEstatisticasView();
        // ===== FIM DA MODIFICAÇÃO =====

        // ===== INÍCIO DA MODIFICAÇÃO (SOLICITAÇÃO DO USUÁRIO): Resetar para a sub-aba padrão =====
        // Se o usuário clicou diretamente no link de navegação principal
        if (isUserClick) {
            // 1. Reseta os botões das sub-abas
            const tabButtons = DOM.statsTabsContainer.querySelectorAll('.tab-button');
            const defaultTabButton = DOM.statsTabsContainer.querySelector('button[data-tab="desempenho-geral"]');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            if (defaultTabButton) {
                defaultTabButton.classList.add('active');
            }

            // 2. Reseta os painéis de conteúdo das sub-abas
            const tabContents = document.querySelectorAll('#stats-tabs-content-container .stats-tab-content');
            const defaultTabContent = document.getElementById('desempenho-geral-tab');
            
            tabContents.forEach(content => content.classList.add('hidden'));
            if (defaultTabContent) {
                defaultTabContent.classList.remove('hidden');
            }
        }
        // ===== FIM DA MODIFICAÇÃO =====
    }


    if (DOM.mobileMenu) {
        DOM.mobileMenu.classList.add('hidden');
    }
}
