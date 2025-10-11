import DOM from '../dom-elements.js';

/**
 * Adiciona classes de estilo para destacar o link de navegação da página atual.
 */
export function highlightCurrentPageLink() {
    // Tenta obter o nome do arquivo da URL. Ex: "questoes.html"
    const currentPageFile = window.location.pathname.split("/").pop();

    // Mapeia o nome do arquivo para o data-view correspondente nos links
    const fileToViewMap = {
        "index.html": "inicio-view",
        "": "inicio-view", // Para o caso de a URL ser apenas o domínio
        "questoes.html": "vade-mecum-view",
        "cadernos.html": "cadernos-view",
        "materias.html": "materias-view",
        "revisao.html": "revisao-view",
        "estatisticas.html": "estatisticas-view"
    };

    const activeView = fileToViewMap[currentPageFile];
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        // Remove as classes de ativo/inativo de todos os links primeiro
        link.classList.remove('text-blue-700', 'bg-blue-100', 'text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');

        // Adiciona as classes corretas com base se o link é o da página ativa
        if (link.dataset.view === activeView) {
            link.classList.add('text-blue-700', 'bg-blue-100');
        } else {
            link.classList.add('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
        }
    });

    // Lógica para renderizar a view correta na página carregada
    const allViews = [
        DOM.inicioView,
        DOM.vadeMecumView,
        DOM.cadernosView,
        DOM.materiasView,
        DOM.revisaoView,
        DOM.estatisticasView
    ];

    allViews.forEach(view => {
        if (view) {
            // Esconde todas as views por padrão
            view.classList.add('hidden');
            // Mostra apenas a view que corresponde à página atual
            if (view.id === activeView) {
                view.classList.remove('hidden');
            }
        }
    });


    // Fecha o menu mobile (se estiver aberto) após a verificação
    if (DOM.mobileMenu) {
        DOM.mobileMenu.classList.add('hidden');
    }
}
