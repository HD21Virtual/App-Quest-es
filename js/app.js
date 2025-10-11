import { initAuth } from './services/auth.js';
import { fetchAllQuestions } from './services/firestore.js';
import { setupAllEventListeners } from './event-listeners.js';
import { applyFilters, setupCustomSelects } from './features/filter.js';
import { initDOM } from './dom-elements.js';
import { highlightCurrentPageLink } from './ui/navigation.js';

async function main() {
    // 1. Inicializa todas as referências de elementos DOM agora que a página foi carregada
    initDOM();

    // 2. Destaca o link da página atual na navegação
    highlightCurrentPageLink();

    // 3. Inicializa a autenticação, que define o estado do usuário e a visualização inicial
    initAuth();

    // 4. Configura todos os event listeners para a aplicação
    setupAllEventListeners();

    // 5. Busca os dados iniciais necessários para o funcionamento do aplicativo
    await fetchAllQuestions();

    // 6. Assim que os dados são buscados, configura os componentes da UI que dependem deles
    setupCustomSelects();

    // 7. Aplica filtros padrão para mostrar algumas questões inicialmente (apenas na página de questões)
    if (document.getElementById('vade-mecum-view')) {
       applyFilters();
    }
}

// Aguarda o DOM ser totalmente carregado antes de executar o script principal
document.addEventListener('DOMContentLoaded', main);
