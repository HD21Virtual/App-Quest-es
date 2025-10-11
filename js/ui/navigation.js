import DOM from '../dom-elements.js';

const viewToFileMap = {
    "inicio-view": "index.html",
    "vade-mecum-view": "questoes.html",
    "cadernos-view": "cadernos.html",
    "materias-view": "materias.html",
    "revisao-view": "revisao.html",
    "estatisticas-view": "estatisticas.html"
};

/**
 * Navega para uma página diferente com base no ID da view.
 * @param {string} viewId O ID da view de destino (ex: 'vade-mecum-view').
 */
export function navigateToPage(viewId) {
    const fileName = viewToFileMap[viewId];
    if (fileName) {
        window.location.href = fileName;
    } else {
        console.error(`Página não encontrada para a view: ${viewId}`);
    }
}

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

    // A lógica de mostrar/esconder views foi removida, pois cada página agora é um arquivo HTML separado.

    // Fecha o menu mobile (se estiver aberto) após a verificação
    if (DOM.mobileMenu) {
        DOM.mobileMenu.classList.add('hidden');
    }
}

