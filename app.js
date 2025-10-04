import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    addDoc,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    orderBy,
    arrayUnion,
    arrayRemove,
    Timestamp,
    increment,
    writeBatch,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do seu projeto Firebase
// ATENÇÃO: As chaves de configuração devem ser mantidas em segredo em um ambiente de produção.
// Aqui, elas são necessárias para o funcionamento no ambiente de demonstração.
const firebaseConfig = {
    // Insira sua Chave de API REAL do Firebase AQUI, DENTRO DESTAS ASPAS:
    apiKey: "AIzaSyAbDQfS3VTVlXEBdHKKwx-ToTWTGFOcYAE", 
    authDomain: "vade-mecum-de-questoes.firebaseapp.com",
    projectId: "vade-mecum-de-questoes",
    storageBucket: "vade-mecum-de-questoes.appspot.com",
    messagingSenderId: "667396734608",
    appId: "1:667396734608:web:96f67c131ccbd798792215"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Registrar plugins do Chart.js
Chart.register(ChartDataLabels);

let filterOptions = {
    materia: [],
    allAssuntos: []
};

let currentQuestionIndex = 0;
let selectedAnswer = null;
let filteredQuestions = [];
let allQuestions = [];
let sessionStats = [];
let performanceChart = null;
let homePerformanceChart = null;
let currentUser = null;

let userFolders = [];
let userCadernos = [];
let currentFolderId = null; 
let currentCadernoId = null;
let editingId = null;
let editingType = null; // 'folder' ou 'caderno'
let isAddingQuestionsMode = { active: false, cadernoId: null };
let createCadernoWithFilteredQuestions = false;
let deletingId = null;
let deletingType = null;
let isNavigatingBackFromAddMode = false;
let isReviewSession = false;
let userReviewItems = [];


let unsubCadernos; 
let unsubFolders;
let unsubFiltros; 
let unsubSessions; 
let unsubReviewItems;
let unsubAnswers;
let unsubCadernoState;
let historicalSessions = [];
let userAnswers = new Map();
let userCadernoState = new Map();
let userReviewItemsMap = new Map();

// --- NOVOS ELEMENTOS GLOBAIS APÓS SEPARAÇÃO ---
const mainContentContainer = document.getElementById('main-content-container');
const userAccountContainer = document.getElementById('user-account-container');
const userAccountContainerMobile = document.getElementById('user-account-container-mobile');

// Elementos dos Modais (ainda no index.html)
const authModal = document.getElementById('auth-modal');
const closeAuthModalBtn = document.getElementById('close-auth-modal');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authError = document.getElementById('auth-error');
const saveModal = document.getElementById('save-modal');
const loadModal = document.getElementById('load-modal');
const saveFilterBtn = document.getElementById('save-filter-btn');
const savedFiltersListBtn = document.getElementById('saved-filters-list-btn');
const closeSaveModalBtn = document.getElementById('close-save-modal');
const closeLoadModalBtn = document.getElementById('close-load-modal');
const cancelSaveBtn = document.getElementById('cancel-save-btn');
const confirmSaveBtn = document.getElementById('confirm-save-btn');
const filterNameInput = document.getElementById('filter-name-input');
const savedFiltersListContainer = document.getElementById('saved-filters-list-container');
const searchSavedFiltersInput = document.getElementById('search-saved-filters-input');
const cadernoModal = document.getElementById('caderno-modal');
const cadernoNameInput = document.getElementById('caderno-name-input');
const folderSelect = document.getElementById('folder-select');
const nameModal = document.getElementById('name-modal');
const nameInput = document.getElementById('name-input');
const nameModalTitle = document.getElementById('name-modal-title');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmationModalTitle = document.getElementById('confirmation-modal-title');
const confirmationModalText = document.getElementById('confirmation-modal-text');
const cancelConfirmationBtn = document.getElementById('cancel-confirmation-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const statsModal = document.getElementById('stats-modal');
const statsModalTitle = document.getElementById('stats-modal-title');
const statsModalContent = document.getElementById('stats-modal-content');
const closeStatsModalBtn = document.getElementById('close-stats-modal');
const mobileMenu = document.getElementById('mobile-menu');
const hamburgerBtn = document.getElementById('hamburger-btn');


// Mapeamento de IDs de Elementos (Agora injetados dinamicamente)
// Estes devem ser buscados APÓS o carregamento da view
let elements = {};

const viewMap = {
    'inicio': 'inicio.html',
    'vade-mecum': 'questoes.html',
    'cadernos': 'cadernos.html',
    'materias': 'materias.html',
    'revisao': 'revisao.html',
    'estatisticas': 'estatisticas.html'
};

// --- FUNÇÃO DE NAVEGAÇÃO PRINCIPAL ---
async function loadView(viewName, isUserClick = true) {
    const url = viewMap[viewName];
    if (!url) {
        console.error(`View não mapeada: ${viewName}`);
        mainContentContainer.innerHTML = `<div class="text-center p-10 text-red-500">Erro: View "${viewName}" não encontrada.</div>`;
        return;
    }

    if (isAddingQuestionsMode.active && (viewName !== 'vade-mecum' || isUserClick)) {
        exitAddMode();
    }

    try {
        const response = await fetch(url);
        // Verifica se o arquivo HTML foi encontrado no caminho correto
        if (!response.ok) {
            throw new Error(`Erro ao buscar ${url}: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        mainContentContainer.innerHTML = html;

        // Atualiza a lista de elementos globais após a injeção do novo conteúdo
        updateDynamicElements();

        // Lógica de inicialização específica para cada view
        handleViewInitialization(viewName, isUserClick);

        // Atualiza o estado da navegação
        document.querySelectorAll('.nav-link').forEach(navLink => {
            navLink.classList.remove('text-blue-700', 'bg-blue-100');
            navLink.classList.add('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
            if (navLink.getAttribute('data-view') === viewName) {
                navLink.classList.add('text-blue-700', 'bg-blue-100');
                navLink.classList.remove('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-900');
            }
        });
        
        mobileMenu.classList.add('hidden');
        
    } catch (error) {
        console.error("Erro ao carregar a view:", viewName, error);
        mainContentContainer.innerHTML = `<div class="text-center p-10 text-red-500">Erro ao carregar o conteúdo da página **${viewName}**. Verifique se o arquivo **${url}** existe e está no diretório correto.</div>`;
    }
}

// Mapeia elementos dinâmicos injetados no DOM
function updateDynamicElements() {
    elements = {};
    const ids = [
        // Início
        'stats-total-questions', 'stats-total-correct', 'stats-total-incorrect', 'stats-geral-accuracy',
        'weeklyPerformanceChart', 'homePerformanceChart',
        // Questões (Vade Mecum)
        'vade-mecum-content-area', 'vade-mecum-title', 'stats-content', 'tabs-container', 'filter-btn', 
        'materia-filter', 'assunto-filter', 'tipo-filter-group', 'search-input', 'clear-filters-btn', 
        'selected-filters-container', 'toggle-filters-btn', 'filter-card',
        'add-questions-banner', 'add-questions-banner-text', 'cancel-add-questions-btn', 
        'create-caderno-btn', 
        // Cadernos
        'cadernos-view-title', 'cadernos-view-actions', 'back-to-folders-btn', 'add-caderno-to-folder-btn', 
        'add-questions-to-caderno-btn', 'create-folder-btn', 'saved-cadernos-list-container',
        // Matérias
        'materias-view-title', 'materias-list-container', 'assuntos-list-container', 'back-to-materias-btn',
        // Revisão
        'review-card', 'review-count', 'start-review-btn',
        // Estatísticas
        'stats-main-content', 'reset-all-progress-btn', 'detailed-stats-container'
    ];
    
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });

    // Reatribui listeners após a injeção de novos elementos
    if (elements.filterBtn) elements.filterBtn.addEventListener('click', handleFilterClick);
    if (elements.clearFiltersBtn) elements.clearFiltersBtn.addEventListener('click', clearAllFilters);
    if (elements.toggleFiltersBtn) elements.toggleFiltersBtn.addEventListener('click', toggleFilterCard);
    if (elements.tipoFilterGroup) elements.tipoFilterGroup.addEventListener('click', handleToggleButtonGroups);
    if (elements.tabsContainer) elements.tabsContainer.addEventListener('click', handleVadeMecumTabs);
    if (elements.savedCadernosListContainer) elements.savedCadernosListContainer.addEventListener('click', handleCadernosActions);
    if (elements.backToFoldersBtn) elements.backToFoldersBtn.addEventListener('click', handleCadernosBack);
    if (elements.addQuestionsToCadernoBtn) elements.addQuestionsToCadernoBtn.addEventListener('click', startAddQuestionsMode);
    if (elements.cancelAddQuestionsBtn) elements.cancelAddQuestionsBtn.addEventListener('click', cancelAddQuestionsMode);
    if (elements.createCadernoBtn) elements.createCadernoBtn.addEventListener('click', showCadernoModalForFilter);
    if (elements.addCadernoToFolderBtn) elements.addCadernoToFolderBtn.addEventListener('click', showCadernoModalForFolder);
    if (elements.createFolderBtn) elements.createFolderBtn.addEventListener('click', showCreateFolderModal);
    if (elements.startReviewBtn) elements.startReviewBtn.addEventListener('click', startReviewSession);
    if (elements.resetAllProgressBtn) elements.resetAllProgressBtn.addEventListener('click', showResetProgressConfirmation);
    if (elements.materiasListContainer) elements.materiasListContainer.addEventListener('click', handleMateriaSelection);
    if (elements.assuntosListContainer) elements.assuntosListContainer.addEventListener('click', handleAssuntoSelection);
    if (elements.backToMateriasBtn) elements.backToMateriasBtn.addEventListener('click', handleMateriasBack);
    if (elements.materiaFilter) setupCustomSelect(elements.materiaFilter);
    if (elements.assuntoFilter) setupCustomSelect(elements.assuntoFilter);
    if (elements.selectedFiltersContainer) elements.selectedFiltersContainer.addEventListener('click', handleRemoveFilterTag);
    if (elements.searchInput) elements.searchInput.addEventListener('input', applyFilters);

    // Inicializa o Chart.js na home, se os elementos estiverem presentes
    if (elements.weeklyPerformanceChart || elements.homePerformanceChart) {
        updateStatsPageUI();
    }
}


// --- FUNÇÃO DE INICIALIZAÇÃO DE VIEW ---
function handleViewInitialization(viewName, isUserClick) {
    if (!currentUser && viewName !== 'inicio') {
        // Se não está logado, mostra a mensagem de login e para a execução
        const container = document.getElementById(`${viewName}-content-container`) || document.querySelector('main > div:not([id])');
        if (container) {
            container.innerHTML = `<div class="text-center p-10 text-gray-500">Por favor, <button id="login-from-view" class="text-blue-600 underline">faça login</button> para ver o conteúdo desta página.</div>`;
            const loginBtn = container.querySelector('#login-from-view');
            if(loginBtn) loginBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
        }
        return;
    }
    
    // Se está logado ou é a página inicial (que sempre carrega)
    if (viewName === 'cadernos') {
        if (isNavigatingBackFromAddMode) {
            isNavigatingBackFromAddMode = false;
        } else {
            currentFolderId = null;
            currentCadernoId = null;
        }
        renderFoldersAndCadernos();
    } else if (viewName === 'vade-mecum') {
        if (isAddingQuestionsMode.active) {
            applyFilters();
        } else if (isReviewSession && !isUserClick) {
            // Sessão de revisão já configurada
        } else {
            isReviewSession = false;
            if (elements.vadeMecumTitle) elements.vadeMecumTitle.textContent = "Vade Mecum de Questões";
            if (elements.toggleFiltersBtn) elements.toggleFiltersBtn.classList.remove('hidden');
            if (elements.filterCard) elements.filterCard.classList.remove('hidden');
            clearAllFilters();
        }
    } else if (viewName === 'materias') {
        selectedMateria = null; 
        renderMateriasView();
    } else if (viewName === 'revisao') {
        updateReviewCard();
    } else if (viewName === 'estatisticas') {
        // O conteúdo da estatísticas foi simplificado, garantindo que o container existe
        const detailedStatsContainer = document.getElementById('detailed-stats-container');
        if (detailedStatsContainer) {
             detailedStatsContainer.innerHTML = `<h3 class="text-xl font-bold text-gray-800 mb-4">Estatísticas Detalhadas</h3><p class="text-gray-600">Este é o painel de estatísticas. O conteúdo será adicionado aqui em futuras atualizações.</p>`;
        }
        updateStatsPageUI(); 
    }
}

// --- FUNÇÕES DE LÓGICA (MUITAS FUNÇÕES OMITIDAS AQUI PARA MANTER O FOCO NA SEPARAÇÃO) ---
// Note: As funções de lógica original foram mantidas, mas renomeadas (ex: applyFilters -> applyFilters)
// e ajustadas para buscar elementos dentro da estrutura dinâmica.

async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        allQuestions = [];
        const materiaMap = new Map();

        querySnapshot.forEach((doc) => {
            const question = { id: doc.id, ...doc.data() };
            allQuestions.push(question);

            if (question.materia && question.assunto) {
                if (!materiaMap.has(question.materia)) {
                    materiaMap.set(question.materia, new Set());
                }
                materiaMap.get(question.materia).add(question.assunto);
            }
        });

        filterOptions.materia = [];
        const allAssuntosSet = new Set();
        for (const [materia, assuntosSet] of materiaMap.entries()) {
            const assuntos = Array.from(assuntosSet).sort();
            filterOptions.materia.push({ name: materia, assuntos: assuntos });
            assuntos.forEach(assunto => allAssuntosSet.add(assunto));
        }
        filterOptions.materia.sort((a, b) => a.name.localeCompare(b.name));
        filterOptions.allAssuntos = Array.from(allAssuntosSet).sort();

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}

function renderQuestionListForAdding(questions, existingQuestionIds) {
    const questionsContainer = document.getElementById('questions-container');
    const mainContentContainer = document.getElementById('tabs-and-main-content');
    if (!questionsContainer || !mainContentContainer) return;
    
    // Oculta a estrutura de abas e do solucionador de questões
    mainContentContainer.classList.add('hidden');

    if (questions.length === 0) {
        questionsContainer.innerHTML = `<div class="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">Nenhuma questão encontrada com os filtros atuais.</div>`;
        return;
    }

    const listHtml = questions.map(q => {
        const isAlreadyIn = existingQuestionIds.includes(q.id);
        const highlightClass = isAlreadyIn ? 'already-in-caderno opacity-70' : '';
        const badgeHtml = isAlreadyIn 
            ? `<span class="text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-1 rounded-full">No Caderno</span>`
            : '';

        const tempDiv = document.createElement('div');
        tempDiv.innerText = q.text;
        const shortText = tempDiv.innerHTML.substring(0, 200) + (q.text.length > 200 ? '...' : '');

        return `
            <div class="p-4 border-b border-gray-200 ${highlightClass}">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-gray-800">${shortText}</p>
                        <p class="text-xs text-gray-500 mt-1">${q.materia} &bull; ${q.assunto}</p>
                    </div>
                    <div class="flex-shrink-0 ml-4">
                        ${badgeHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `<div class="bg-white rounded-lg shadow-sm">${listHtml}</div>`;
}

async function applyFilters() {
    // Não inicia nova sessão de estudo ao filtrar no modo de adição
    if (!isAddingQuestionsMode.active && sessionStats.length > 0 && !isReviewSession) {
        await saveSessionStats(); 
        sessionStats = [];
    }
    
    const materiaFilter = elements.materiaFilter;
    const assuntoFilter = elements.assuntoFilter;
    const tipoFilterGroup = elements.tipoFilterGroup;
    const searchInput = elements.searchInput;
    const filterBtn = elements.filterBtn;
    const selectedFiltersContainer = elements.selectedFiltersContainer;

    if (!materiaFilter || !assuntoFilter || !tipoFilterGroup || !searchInput || !filterBtn || !selectedFiltersContainer) return;

    const selectedMaterias = JSON.parse(materiaFilter.dataset.value || '[]');
    const selectedAssuntos = JSON.parse(assuntoFilter.dataset.value || '[]');
    const activeTipoBtn = tipoFilterGroup.querySelector('.active-filter');
    const selectedTipo = activeTipoBtn ? activeTipoBtn.dataset.value : 'todos';
    const searchTerm = searchInput.value.toLowerCase();

    filteredQuestions = allQuestions.filter(q => {
        const materiaMatch = selectedMaterias.length === 0 || selectedMaterias.includes(q.materia);
        const assuntoMatch = selectedAssuntos.length === 0 || selectedAssuntos.includes(q.assunto);
        const tipoMatch = selectedTipo === 'todos' || q.tipo === selectedTipo;
        const searchMatch = !searchTerm || q.text.toLowerCase().includes(searchTerm);
        return materiaMatch && assuntoMatch && tipoMatch && searchMatch;
    });
    
    currentQuestionIndex = 0;

    if (isAddingQuestionsMode.active) {
        const caderno = userCadernos.find(c => c.id === isAddingQuestionsMode.cadernoId);
        const existingIds = caderno ? caderno.questionIds : [];

        const newQuestions = filteredQuestions.filter(q => !existingIds.includes(q.id));
        const newQuestionsCount = newQuestions.length;

        if (newQuestionsCount > 0) {
            filterBtn.textContent = `Adicionar ${newQuestionsCount} questões ao Caderno`;
            filterBtn.disabled = false;
        } else {
            filterBtn.textContent = `Nenhuma questão nova para adicionar`;
            filterBtn.disabled = true;
        }
        
        renderQuestionListForAdding(filteredQuestions, existingIds);

    } else {
        const mainContentContainer = document.getElementById('tabs-and-main-content');
        if(mainContentContainer) mainContentContainer.classList.remove('hidden');
        await displayQuestion();
        updateStatsPanel();
    }

    updateSelectedFiltersDisplay();
}

function updateSelectedFiltersDisplay() {
    const selectedFiltersContainer = elements.selectedFiltersContainer;
    const materiaFilter = elements.materiaFilter;
    const assuntoFilter = elements.assuntoFilter;
    const tipoFilterGroup = elements.tipoFilterGroup;
    const searchInput = elements.searchInput;
    
    if (!selectedFiltersContainer || !materiaFilter || !assuntoFilter || !tipoFilterGroup || !searchInput) return;

    selectedFiltersContainer.innerHTML = '';
    let hasFilters = false;

    const createFilterTag = (type, value, label) => {
        hasFilters = true;
        const tag = document.createElement('div');
        tag.className = 'flex items-center bg-gray-100 border border-gray-300 rounded-md pl-2 pr-1 py-1';
        tag.innerHTML = `
            <span class="font-bold mr-2">${label}:</span>
            <span>${value}</span>
            <button data-filter-type="${type}" data-filter-value="${value}" class="remove-filter-btn ml-2 text-gray-500 hover:text-gray-800">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        selectedFiltersContainer.appendChild(tag);
    };

    const selectedMaterias = JSON.parse(materiaFilter.dataset.value || '[]');
    selectedMaterias.forEach(m => createFilterTag('materia', m, 'Disciplina'));

    const selectedAssuntos = JSON.parse(assuntoFilter.dataset.value || '[]');
    selectedAssuntos.forEach(a => createFilterTag('assunto', a, 'Assunto'));
    
    const activeTipoBtn = tipoFilterGroup.querySelector('.active-filter');
    if (activeTipoBtn && activeTipoBtn.dataset.value !== 'todos') {
        createFilterTag('tipo', activeTipoBtn.dataset.value, 'Tipo');
    }

    if (searchInput.value) {
        createFilterTag('search', searchInput.value, 'Palavra-chave');
    }

    if (!hasFilters) {
        selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Seus filtros aparecerão aqui</span>`;
    }
}


async function updateNavigation() {
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
    const navigationControls = activeContainer.querySelector('#navigation-controls');
    const questionCounterTop = activeContainer.querySelector('#question-counter-top');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');
    const prevQuestionBtn = activeContainer.querySelector('#prev-question-btn');
    const nextQuestionBtn = activeContainer.querySelector('#next-question-btn');
    const questionsContainer = activeContainer.querySelector('#questions-container');

    if (!navigationControls || !questionCounterTop || !questionInfoContainer || !prevQuestionBtn || !nextQuestionBtn || !questionsContainer || !questionToolbar) return;

    if (filteredQuestions.length > 0) {
        navigationControls.classList.remove('hidden');
        questionCounterTop.classList.remove('hidden');
        questionInfoContainer.classList.remove('hidden');
        questionToolbar.classList.remove('hidden');

        let answeredCount, correctCount, incorrectCount;
        let statsHtml = '';

        if (currentCadernoId) {
            const caderno = userCadernos.find(c => c.id === currentCadernoId);
            if (caderno && caderno.questionIds) {
                const counts = await getHistoricalCountsForQuestions(caderno.questionIds);
                answeredCount = counts.resolved;
                correctCount = counts.correct;
                incorrectCount = counts.incorrect;
                
                statsHtml = `
                    <span class="text-sm text-gray-500 ml-2">
                        (${answeredCount} de ${caderno.questionIds.length} Resolvidas, 
                        <span class="text-green-600 font-medium">${correctCount} Acertos</span> e 
                        <span class="text-red-600 font-medium">${incorrectCount} Erros}</span>)
                    </span>
                `;
            }
        } else {
            answeredCount = sessionStats.length;
            correctCount = sessionStats.filter(s => s.isCorrect).length;
            incorrectCount = answeredCount - correctCount;

            if (answeredCount > 0) {
                statsHtml = `
                    <span class="text-sm text-gray-500 ml-2">
                        (${answeredCount} Resolvidas, 
                        <span class="text-green-600 font-medium">${correctCount} Acertos</span> e 
                        <span class="text-red-600 font-medium">${incorrectCount} Erros}</span>)
                    </span>
                `;
            }
        }

        questionCounterTop.innerHTML = `
            <span class="text-xl text-gray-800">Questão ${currentQuestionIndex + 1} de ${filteredQuestions.length}</span>
            ${statsHtml}
        `;

        prevQuestionBtn.disabled = currentQuestionIndex === 0;
        nextQuestionBtn.disabled = currentQuestionIndex >= filteredQuestions.length - 1;

    } else {
        navigationControls.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
        questionInfoContainer.classList.add('hidden');
        questionToolbar.classList.add('hidden');
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Nenhuma questão encontrada</h3><p class="text-gray-600 mt-2">Este caderno está vazio ou os filtros não retornaram resultados.</p></div>`;
    }
}

async function displayQuestion() {
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');
    
    if(!questionsContainer || !questionInfoContainer || !questionToolbar) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.innerHTML = '';
    questionToolbar.innerHTML = '';
    selectedAnswer = null;
    await updateNavigation();
    
    if (!currentUser) {
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        const loginBtn = questionsContainer.querySelector('#login-from-empty');
        if(loginBtn) loginBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
        return;
    }

    if (filteredQuestions.length === 0) {
         return;
    }
    
    const question = filteredQuestions[currentQuestionIndex];
    questionInfoContainer.innerHTML = `
        <p>Matéria: <a href="#" class="text-blue-600 hover:underline">${question.materia}</a></p>
        <p>Assunto: <a href="#" class="text-blue-600 hover:underline">${question.assunto}</a></p>
    `;

    questionToolbar.innerHTML = `
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-graduation-cap mr-2"></i>Gabarito Comentado</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-comment-dots mr-2"></i>Comentários</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-edit mr-2"></i>Criar Anotações</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-book mr-2"></i>Cadernos</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-chart-bar mr-2"></i>Desempenho</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-flag mr-2"></i>Notificar Erro</button>
    `;

    const answeredInSession = sessionStats.find(s => s.questionId === question.id);
    const persistedAnswer = userAnswers.get(question.id);

    if (answeredInSession) {
        renderAnsweredQuestion(answeredInSession.isCorrect, answeredInSession.userAnswer, false); 
    } else if (persistedAnswer && !isReviewSession) { 
        renderAnsweredQuestion(persistedAnswer.isCorrect, persistedAnswer.userAnswer, false);
    }
    else {
        renderUnansweredQuestion();
    }
}

function renderUnansweredQuestion() {
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if(!questionsContainer) return;

    const question = filteredQuestions[currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];
    if(options.length === 0) {
         console.warn("Questão sem opções válidas:", question);
    }

    const optionsHtml = options.map((option, index) => {
        let letterContent = '';
        if (question.tipo === 'Multipla Escolha' || question.tipo === 'C/E') {
            const letter = question.tipo === 'C/E' ? option.charAt(0) : String.fromCharCode(65 + index);
            letterContent = `<span class="option-letter text-gray-700">${letter}</span>`;
        }
        
        const checkIcon = question.tipo === 'C/E' 
            ? `<svg class="check-icon hidden w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`
            : '';
        
        const scissorIconSVG = `
            <svg class="h-5 w-5 text-blue-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
               <path stroke-linecap="round" stroke-linejoin="round" d="M3.5 6.5a2 2 0 114 0 2 2 0 01-4 0zM3.5 17.5a2 2 0 114 0 2 2 0 01-4 0z"></path>
               <path stroke-linecap="round" stroke-linejoin="round" d="M6 8.5L18 15.5"></path>
               <path stroke-linecap="round" stroke-linejoin="round" d="M6 15.5L18 8.5"></path>
            </svg>`;

        return `
            <div data-option="${option}" class="option-item group flex items-center p-2 rounded-md cursor-pointer transition duration-200">
               <div class="action-icon-container w-8 h-8 flex-shrink-0 flex items-center justify-center mr-1">
                    <div class="discard-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-100 rounded-full p-1.5">
                        ${scissorIconSVG}
                    </div>
                </div>
               <div class="option-circle flex-shrink-0 w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center mr-4 transition-all duration-200">
                   ${letterContent}
                   ${checkIcon}
               </div>
               <span class="option-text text-gray-800">${option}</span>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">
            ${optionsHtml}
        </div>
        <div id="card-footer" class="mt-6 flex items-center">
            <button id="submit-btn" class="bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 transition-colors duration-300 disabled:bg-green-300 disabled:cursor-not-allowed" disabled>Resolver</button>
        </div>
    `;
    
    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        item.addEventListener('click', handleOptionSelect);
        const discardBtn = item.querySelector('.discard-btn');
        if(discardBtn) discardBtn.addEventListener('click', handleDiscardOption);
    });
    const submitBtn = questionsContainer.querySelector('#submit-btn');
    if(submitBtn) submitBtn.addEventListener('click', checkAnswer);
}

function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    renderUnansweredQuestion(); 
    
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if(!questionsContainer) return;

    const question = filteredQuestions[currentQuestionIndex];
    
    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        const actionIconContainer = item.querySelector('.action-icon-container');
        if(actionIconContainer) actionIconContainer.innerHTML = ''; 

        item.removeEventListener('click', handleOptionSelect);
        item.style.cursor = 'default';
        item.classList.add('is-answered');

        const optionValue = item.getAttribute('data-option');
        if (optionValue === question.correctAnswer) {
            item.classList.add('correct-answer');
            if(actionIconContainer) actionIconContainer.innerHTML = `<i class="fas fa-check text-green-500 text-xl"></i>`;
        } else if (optionValue === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
            if(actionIconContainer) actionIconContainer.innerHTML = `<i class="fas fa-times text-red-500 text-xl"></i>`;
        }
    });

    const cardFooter = questionsContainer.querySelector('#card-footer');
    if(!cardFooter) return;

    cardFooter.innerHTML = ''; 
    cardFooter.className = 'mt-6 w-full';
    
    const correctOptionIndex = question.options.findIndex(opt => opt === question.correctAnswer);
    let correctOptionLetter = '';
    if (question.tipo === 'Multipla Escolha') {
        correctOptionLetter = String.fromCharCode(65 + correctOptionIndex);
    } else { 
        correctOptionLetter = question.correctAnswer.charAt(0);
    }

    const messageColor = isCorrect ? 'text-green-600' : 'text-red-600';
    
    let feedbackHtml = `<div class="flex items-center space-x-4 flex-wrap">`;
    if (isCorrect) {
        feedbackHtml += `<span class="${messageColor} font-bold text-lg">Correta!</span>`;
    } else {
        feedbackHtml += `
            <span class="${messageColor} font-bold text-lg">Errada!</span>
            <span class="text-gray-500 text-lg">Opção correta:</span>
            <div class="option-circle flex-shrink-0 w-6 h-6 border-2 border-green-500 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold">${correctOptionLetter}</div>
        `;
    }
    feedbackHtml += `</div>`;

    if (isFreshAnswer) {
        const reviewItem = userReviewItemsMap.get(question.id);
        const currentStage = reviewItem ? reviewItem.stage : 0;
        
        const getIntervalLabel = (stage) => {
            const reviewIntervals = [1, 3, 7, 15, 30, 90];
            const index = Math.min(stage, reviewIntervals.length - 1);
            const days = reviewIntervals[index];
            if (!days) return "";
            if (days < 30) return `${days}d`;
            return `${Math.round(days/30)}m`;
        };

        const againLabel = getIntervalLabel(0);
        const hardLabel = getIntervalLabel(Math.max(0, currentStage - 1));
        const goodLabel = getIntervalLabel(currentStage + 1);
        const easyLabel = getIntervalLabel(currentStage + 2);

        feedbackHtml += `
            <div class="mt-4 grid grid-cols-4 gap-2 w-full text-center text-sm">
                <button class="srs-feedback-btn bg-red-100 text-red-700 font-semibold py-2 px-2 rounded-md hover:bg-red-200" data-feedback="again">Errei<br>(${againLabel})</button>
                <button class="srs-feedback-btn bg-yellow-100 text-yellow-700 font-semibold py-2 px-2 rounded-md hover:bg-yellow-200" data-feedback="hard">Difícil<br>(${hardLabel})</button>
                <button class="srs-feedback-btn bg-green-100 text-green-700 font-semibold py-2 px-2 rounded-md hover:bg-green-200" data-feedback="good">Bom<br>(${goodLabel})</button>
                <button class="srs-feedback-btn bg-blue-100 text-blue-700 font-semibold py-2 px-2 rounded-md hover:bg-blue-200" data-feedback="easy">Fácil<br>(${easyLabel})</button>
            </div>
        `;
         cardFooter.innerHTML = feedbackHtml;
         cardFooter.querySelectorAll('.srs-feedback-btn').forEach(btn => {
            btn.addEventListener('click', handleSrsFeedback);
        });

    } else {
         const mockPercentage = (Math.random() * (85 - 55) + 55).toFixed(1);
         feedbackHtml += `
            <span class="text-lg text-gray-600">${mockPercentage}% acertaram</span>
            <button id="show-comment-btn" class="text-blue-600 hover:underline">Ver resolução</button>
         `;
         if (currentCadernoId) {
            feedbackHtml += `<button class="remove-question-btn text-red-500 hover:underline ml-auto" data-question-id="${question.id}">Remover do Caderno</button>`;
         }
        cardFooter.innerHTML = `<div class="flex items-center space-x-4 flex-wrap">${feedbackHtml}</div>`;
        const showCommentBtn = cardFooter.querySelector('#show-comment-btn');
        if(showCommentBtn) showCommentBtn.addEventListener('click', showOrToggleComment);
    }
}

function handleDiscardOption(event) {
    event.stopPropagation();
    const targetItem = event.currentTarget.closest('.option-item');
    if (targetItem) {
        targetItem.classList.toggle('discarded');
        if (targetItem.classList.contains('selected')) {
            targetItem.classList.remove('selected');
            selectedAnswer = null;
            const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
            const submitBtn = activeContainer.querySelector('#submit-btn');
            if(submitBtn) submitBtn.disabled = true;
        }
    }
}

function handleOptionSelect(event) {
    const target = event.currentTarget;
    if (target.classList.contains('discarded')) {
        return;
    }
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
    activeContainer.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    selectedAnswer = target.getAttribute('data-option');
    const submitBtn = activeContainer.querySelector('#submit-btn');
    if(submitBtn) submitBtn.disabled = false;
}

async function updateQuestionHistory(questionId, isCorrect) {
    if (!currentUser) return;
    const historyRef = doc(db, 'users', currentUser.uid, 'questionHistory', questionId);
    const fieldToUpdate = isCorrect ? 'correct' : 'incorrect';
    
    try {
        await setDoc(historyRef, {
            [fieldToUpdate]: increment(1),
            total: increment(1)
        }, { merge: true });
    } catch (error) {
        console.error("Error updating question history:", error);
    }
}

async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    if (!currentUser) return;
    const answerRef = doc(db, 'users', currentUser.uid, 'userQuestionState', questionId);
    try {
        await setDoc(answerRef, { userAnswer, isCorrect });
    } catch (error) {
        console.error("Error saving user answer:", error);
    }
}

function setupUserAnswersListener(userId) {
    if (unsubAnswers) unsubAnswers();
    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'));
    unsubAnswers = onSnapshot(answersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            if (change.type === "added" || change.type === "modified") {
                userAnswers.set(change.doc.id, { userAnswer: docData.userAnswer, isCorrect: docData.isCorrect });
            }
            if (change.type === "removed") {
                userAnswers.delete(change.doc.id);
            }
        });
        // Tenta redesenhar a questão se a view atual é de resolução
        if (document.getElementById('vade-mecum-view') || (document.getElementById('cadernos-view') && currentCadernoId)) {
             displayQuestion();
        }
    });
}

async function checkAnswer() {
    const question = filteredQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, selectedAnswer, true); 
}

function showOrToggleComment() {
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
    const questionCard = activeContainer.querySelector('#questions-container');
    if(!questionCard) return;

    let explanationBox = questionCard.querySelector('#explanation-box');

    if (explanationBox) {
        explanationBox.classList.toggle('hidden');
        return;
    }

    const question = filteredQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    if (question.explanation) {
        explanationBox = document.createElement('div');
        explanationBox.id = 'explanation-box';
        const boxColorClass = isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800';
        explanationBox.className = `mt-6 p-4 rounded-lg ${boxColorClass}`;
        explanationBox.innerHTML = `
            <p class="leading-relaxed">
                <strong class="font-bold">Gabarito: ${question.correctAnswer}</strong>
                <br>
                ${question.explanation}
            </p>`;
        questionCard.appendChild(explanationBox);
    }
}

function updateStatsPanel(container = null, data = null) {
    let correctCount, incorrectCount, statsByMateria;
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : document;
    const statsContainer = container || activeContainer.querySelector('#stats-content');
    
    if (!statsContainer) return;

    if (data) {
        correctCount = data.totalCorrect;
        incorrectCount = data.totalIncorrect;
        statsByMateria = data.statsByMateria;
    } else {
        correctCount = sessionStats.filter(s => s.isCorrect).length;
        incorrectCount = sessionStats.length - correctCount;
        statsByMateria = sessionStats.reduce((acc, stat) => {
            if (!acc[stat.materia]) {
                acc[stat.materia] = { correct: 0, total: 0, assuntos: {} };
            }
            if(!acc[stat.materia].assuntos[stat.assunto]) {
                acc[stat.materia].assuntos[stat.assunto] = { correct: 0, total: 0 };
            }

            acc[stat.materia].total++;
            acc[stat.materia].assuntos[stat.assunto].total++;
            if (stat.isCorrect) {
                acc[stat.materia].correct++;
                acc[stat.materia].assuntos[stat.assunto].correct++;
            }
            return acc;
        }, {});
    }

    const answeredCount = correctCount + incorrectCount;

    let materiaStatsHtml = '<div class="space-y-4">';
    let materiaIndex = 0;
    for (const materia in statsByMateria) {
        const disciplinaStats = statsByMateria[materia];
        const disciplinaAccuracy = (disciplinaStats.total > 0 ? (disciplinaStats.correct / disciplinaStats.total * 100) : 0).toFixed(0);
        const targetId = `assuntos-${materia.replace(/\s+/g, '-')}-${materiaIndex}`;
        materiaStatsHtml += `
            <div>
                <div class="flex justify-between items-center text-gray-800 cursor-pointer expand-btn" data-target="${targetId}">
                     <div class="flex items-center">
                        <i class="fas fa-plus-circle text-gray-800 mr-2"></i>
                        <span>${materia}</span>
                    </div>
                    <span class="font-semibold">${disciplinaStats.correct} / ${disciplinaStats.total} (${disciplinaAccuracy}%)</span>
                </div>
                <div id="${targetId}" class="pl-6 mt-2 space-y-2 border-l-2 border-gray-200 hidden">`;
        
        for (const assunto in disciplinaStats.assuntos) {
            const assuntoStats = disciplinaStats.assuntos[assunto];
            const assuntoAccuracy = (assuntoStats.total > 0 ? (assuntoStats.correct / assuntoStats.total * 100) : 0).toFixed(0);
            materiaStatsHtml += `
                <div class="flex justify-between items-center text-gray-600 text-sm">
                    <span>${assunto}</span>
                    <span class="font-semibold">${assuntoStats.correct} / ${assuntoStats.total} (${assuntoAccuracy}%)</span>
                </div>
            `;
        }

        materiaStatsHtml += '</div></div>';
        materiaIndex++;
    }
    materiaStatsHtml += '</div>';

    statsContainer.innerHTML = `
         <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="relative w-full max-w-xs mx-auto">
                <canvas id="performanceChart"></canvas>
                <div id="chart-center-text" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"></div>
            </div>
            <div>
                <h4 class="text-xl font-bold text-gray-800 mb-3">Desempenho por Disciplina</h4>
                ${materiaStatsHtml}
            </div>
         </div>
    `;

    if (performanceChart) {
        performanceChart.destroy();
    }

    if (answeredCount > 0) {
        const correctPercentage = (correctCount / answeredCount * 100);
        const incorrectPercentage = (incorrectCount / answeredCount * 100);
        
        const chartCenterText = statsContainer.querySelector('#chart-center-text');
        if(chartCenterText) {
            chartCenterText.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-3xl font-bold" style="color: #63dd63;">${correctPercentage.toFixed(0)}%</span>
                    <span class="text-3xl font-bold" style="color: #f03024;">${incorrectPercentage.toFixed(0)}%</span>
                </div>
            `;
        }
        
        const canvas = statsContainer.querySelector('#performanceChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            performanceChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Acertos', 'Erros'],
                    datasets: [{
                        data: [correctCount, incorrectCount],
                        backgroundColor: ['#63dd63', '#f03024'],
                        hoverBackgroundColor: ['#81e681', '#f35950'],
                        borderColor: ['#ffffff'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '55%',
                    animation: {
                        duration: 0
                    },
                    plugins: {
                        legend: {
                            display: true
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                title: function(context) {
                                    return '';
                                },
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw;
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? (value / total * 100).toFixed(0) : 0;
                                    return `${label}: ${percentage}%`;
                                }
                            }
                        }
                    }
                }
            });
        }
    } else {
         statsContainer.innerHTML = `<div class="text-center text-gray-500 py-10">${data ? 'Nenhum histórico de respostas para estas questões.' : 'Responda a pelo menos uma questão para ver suas estatísticas.'}</div>`;
    }
}

async function getHistoricalCountsForQuestions(questionIds) {
    if (!currentUser || questionIds.length === 0) {
        return { correct: 0, incorrect: 0, resolved: 0 };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let questionsWithHistory = 0;

    const historyPromises = questionIds.map(id => getDoc(doc(db, 'users', currentUser.uid, 'questionHistory', id)));
    const historySnapshots = await Promise.all(historyPromises);

    historySnapshots.forEach(snap => {
        if (snap.exists()) {
            const data = snap.data();
            const correct = data.correct || 0;
            const incorrect = data.incorrect || 0;
            if (correct > 0 || incorrect > 0) {
                questionsWithHistory++;
            }
            totalCorrect += correct;
            totalIncorrect += incorrect;
        }
    });
    
    return { correct: totalCorrect, incorrect: totalIncorrect, resolved: questionsWithHistory };
}

async function generateStatsForQuestions(questionIds) {
    if (!currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const statsByMateria = {};

    const historyPromises = questionIds.map(id => getDoc(doc(db, 'users', currentUser.uid, 'questionHistory', id)));
    const historySnapshots = await Promise.all(historyPromises);

    const questionDetails = questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);

    historySnapshots.forEach((snap, index) => {
        const question = questionDetails[index];
        if (snap.exists() && question) {
            const data = snap.data();
            const correct = data.correct || 0;
            const incorrect = data.incorrect || 0;
            totalCorrect += correct;
            totalIncorrect += incorrect;
            
            if (correct > 0 || incorrect > 0) {
                if (!statsByMateria[question.materia]) {
                    statsByMateria[question.materia] = { correct: 0, total: 0, assuntos: {} };
                }
                 if(!statsByMateria[question.materia].assuntos[question.assunto]) {
                    statsByMateria[question.materia].assuntos[question.assunto] = { correct: 0, total: 0 };
                }

                statsByMateria[question.materia].correct += correct;
                statsByMateria[question.materia].total += correct + incorrect;
                statsByMateria[question.materia].assuntos[question.assunto].correct += correct;
                statsByMateria[question.materia].assuntos[question.assunto].total += correct + incorrect;
            }
        }
    });

    return { totalCorrect, totalIncorrect, statsByMateria };
}

function handleToggleButtonGroups() {
    // Este agora é um listener genérico que apenas repassa para o elemento correto se ele existir
    const tipoFilterGroup = elements.tipoFilterGroup;
    if (tipoFilterGroup && event.target.classList.contains('filter-btn-toggle')) {
        tipoFilterGroup.querySelectorAll('.filter-btn-toggle').forEach(btn => {
            btn.classList.remove('active-filter');
        });
        event.target.classList.add('active-filter');
    }
}

function updateAssuntoFilter(disciplinas) {
    const assuntoContainer = elements.assuntoFilter;
    if (!assuntoContainer) return;

    const assuntoButton = assuntoContainer.querySelector('.custom-select-button');
    const valueSpan = assuntoContainer.querySelector('.custom-select-value');
    const optionsContainer = assuntoContainer.querySelector('.custom-select-options');
    
    // Limpa completamente o filtro de assunto quando a disciplina muda
    valueSpan.textContent = 'Assunto';
    valueSpan.classList.add('text-gray-500');
    assuntoContainer.dataset.value = '[]';

    if (disciplinas.length === 0) {
        assuntoButton.disabled = true;
        optionsContainer.innerHTML = `<div class="p-2 text-center text-gray-400 text-sm">Selecione uma disciplina</div>`;
    } else {
        assuntoButton.disabled = false;
        let newHtml = '';
        
        disciplinas.forEach(disciplina => {
            const materiaObj = filterOptions.materia.find(m => m.name === disciplina);
            if (materiaObj && materiaObj.assuntos.length > 0) {
                newHtml += `<div class="font-bold text-sm text-gray-700 mt-2 px-1">${materiaObj.name}</div>`;
                
                materiaObj.assuntos.forEach(assunto => {
                    newHtml += `
                        <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input type="checkbox" data-value="${assunto}" class="custom-select-option rounded">
                            <span>${assunto}</span>
                        </label>
                    `;
                });
            }
        });
        
        optionsContainer.innerHTML = newHtml;
    }
}

function setupCustomSelect(container) {
    if (!container) return;
    
    const button = container.querySelector('.custom-select-button');
    const valueSpan = container.querySelector('.custom-select-value');
    const panel = container.querySelector('.custom-select-panel');
    const searchInput = container.querySelector('.custom-select-search');
    const optionsContainer = container.querySelector('.custom-select-options');
    const originalText = valueSpan.textContent;

    const filterId = container.id.replace('-filter', '');
    let options = [];
    if (filterId === 'materia') {
        options = filterOptions.materia.map(m => m.name);
    } else if (filterId === 'assunto') {
        // As opções de assunto são preenchidas dinamicamente pela função updateAssuntoFilter
    }
    
    if (filterId === 'materia') {
        optionsContainer.innerHTML = options.map(opt => `
            <label class="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" data-value="${opt}" class="custom-select-option rounded">
                <span>${opt}</span>
            </label>
        `).join('');
    }

    button.addEventListener('click', () => {
        if (!button.disabled) {
            panel.classList.toggle('hidden');
        }
    });
    
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            optionsContainer.querySelectorAll('label, .font-bold').forEach(el => {
                if(el.classList.contains('font-bold')) { 
                     el.style.display = ''; 
                } else {
                    const text = el.textContent.toLowerCase();
                    el.style.display = text.includes(searchTerm) ? '' : 'none';
                }
            });
        });
    }

    optionsContainer.addEventListener('change', () => {
        const selected = [];
        const selectedText = [];
        optionsContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => {
            selected.push(cb.dataset.value);
            selectedText.push(cb.nextElementSibling.textContent);
        });

        container.dataset.value = JSON.stringify(selected);

        if (selected.length === 0) {
            valueSpan.textContent = originalText;
            valueSpan.classList.add('text-gray-500');
        } else if (selected.length === 1) {
            valueSpan.textContent = selectedText[0];
            valueSpan.classList.remove('text-gray-500');
        } else {
            valueSpan.textContent = `${selected.length} ${originalText.toLowerCase()}s selecionados`;
            valueSpan.classList.remove('text-gray-500');
        }
        
        if (container.id === 'materia-filter') {
            updateAssuntoFilter(selected);
        }
        updateSelectedFiltersDisplay();
        if (isAddingQuestionsMode.active) {
            applyFilters();
        }
    });
}

function clearAllFilters() {
    const searchInput = elements.searchInput;
    const materiaContainer = elements.materiaFilter;
    const tipoFilterGroup = elements.tipoFilterGroup;

    if (!searchInput || !materiaContainer || !tipoFilterGroup) return;

    searchInput.value = '';
    materiaContainer.dataset.value = '[]';
    materiaContainer.querySelector('.custom-select-value').textContent = 'Disciplina';
    materiaContainer.querySelector('.custom-select-value').classList.add('text-gray-500');
    materiaContainer.querySelectorAll('.custom-select-option:checked').forEach(cb => cb.checked = false);
    updateAssuntoFilter([]);
    tipoFilterGroup.querySelector('.active-filter').classList.remove('active-filter');
    tipoFilterGroup.querySelector('[data-value="todos"]').classList.add('active-filter');
    applyFilters();
}

async function getWeeklySolvedQuestionsData() {
    const weeklyCounts = Array(7).fill(0);
    if (!currentUser) return weeklyCounts;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    try {
        const sessionsCollection = collection(db, 'users', currentUser.uid, 'sessions');
        const q = query(sessionsCollection, where("createdAt", ">=", sevenDaysAgo));
        
        const querySnapshot = await getDocs(q);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        querySnapshot.forEach(doc => {
            const session = doc.data();
            if (!session.createdAt) return;

            const sessionDate = session.createdAt.toDate();
            sessionDate.setHours(0, 0, 0, 0);

            const timeDiff = today.getTime() - sessionDate.getTime();
            const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24)); 
            
            const index = 6 - dayDiff; // Converte para o índice do array (0 = 6 dias atrás, 6 = hoje)

            if (index >= 0 && index < 7) {
                weeklyCounts[index] += session.totalQuestions || 0;
            }
        });

    } catch (error) {
        console.error("Erro ao buscar dados de atividades da semana:", error);
    }
    
    return weeklyCounts;
}

function updateStatsPageUI() {
    // Lógica atualizada para refletir a nova estrutura da estatisticas.html (agora apenas home)
    const combinedSessions = [...historicalSessions];
    // Lógica para adicionar a sessão atual, se houver
    if (sessionStats.length > 0) {
        const correct = sessionStats.filter(s => s.isCorrect).length;
        const total = sessionStats.length;
        const accuracy = total > 0 ? (correct / total * 100) : 0; 
        
        const currentSessionData = {
            totalQuestions: sessionStats.length,
            correctCount: correct,
            accuracy: accuracy, 
            details: sessionStats.reduce((acc, stat) => {
                if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
                acc[stat.materia].total++;
                if (stat.isCorrect) acc[stat.materia].correct++;
                return acc;
            }, {}),
            createdAt: { toDate: () => new Date() }
        };
        combinedSessions.push(currentSessionData);
    }
    
    // Calcula totais e médias (usados para a Home View)
    let totalQuestions = 0;
    let totalCorrect = 0;
    const materiaTotals = {};

    combinedSessions.forEach(session => {
        totalQuestions += session.totalQuestions;
        totalCorrect += session.correctCount;
        for (const materia in session.details) {
            if (!materiaTotals[materia]) materiaTotals[materia] = { correct: 0, total: 0 };
            materiaTotals[materia].correct += session.details[materia].correct;
            materiaTotals[materia].total += session.details[materia].total;
        }
    });

    const totalIncorrect = totalQuestions - totalCorrect;
    const geralAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;
    
    // Atualiza os Cards da Home View
    const statsTotalQuestionsEl = document.getElementById('stats-total-questions');
    if (statsTotalQuestionsEl) statsTotalQuestionsEl.textContent = totalQuestions;
    const statsTotalCorrectEl = document.getElementById('stats-total-correct');
    if (statsTotalCorrectEl) statsTotalCorrectEl.textContent = totalCorrect;
    const statsTotalIncorrectEl = document.getElementById('stats-total-incorrect');
    if (statsTotalIncorrectEl) statsTotalIncorrectEl.textContent = totalIncorrect;
    const statsGeralAccuracyEl = document.getElementById('stats-geral-accuracy');
    if (statsGeralAccuracyEl) statsGeralAccuracyEl.textContent = `${geralAccuracy}%`;

    // Renderiza os Gráficos da Home View
    if (document.getElementById('homePerformanceChart')) {
        renderHomePerformanceChart(materiaTotals, totalQuestions);
    }
    if (document.getElementById('weeklyPerformanceChart')) {
        renderWeeklyChart();
    }
}

function renderHomePerformanceChart(materiaTotals, totalQuestions) {
    const homeChartCanvas = document.getElementById('homePerformanceChart');
    if (!homeChartCanvas) return;

    if (homePerformanceChart) {
        homePerformanceChart.destroy();
    }
    if (totalQuestions === 0) {
        homeChartCanvas.parentNode.innerHTML = '<p class="text-center text-gray-500 p-8">Resolva questões para ver este gráfico.</p>';
        return;
    }

    const sortedMaterias = Object.keys(materiaTotals).sort((a, b) => materiaTotals[b].total - materiaTotals[a].total);

    const labels = sortedMaterias;
    const correctData = sortedMaterias.map(m => materiaTotals[m].correct);
    const incorrectData = sortedMaterias.map(m => materiaTotals[m].total - materiaTotals[m].correct);
    const accuracyData = sortedMaterias.map(m => {
        const data = materiaTotals[m];
        return data.total > 0 ? ((data.correct / data.total) * 100) : 0;
    });

    const ctx = homeChartCanvas.getContext('2d');
    homePerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Acertos',
                    data: correctData,
                    backgroundColor: '#22c55e',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Erros',
                    data: incorrectData,
                    backgroundColor: '#ef4444',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Aproveitamento',
                    data: accuracyData,
                    borderColor: '#3b82f6',
                    backgroundColor: '#3b82f6',
                    yAxisID: 'y1',
                    tension: 0.4,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Desempenho por Disciplina',
                    font: { size: 18 },
                    color: '#4b5563'
                },
                legend: { display: false },
                tooltip: { enabled: true }, // Mantido como true para a home, se necessário
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value, context) => {
                         if (context.dataset.type === 'line') return Math.round(value) + '%';
                         return value > 0 ? value : '';
                    },
                    font: { weight: 'bold' },
                    color: (context) => context.dataset.type === 'line' ? '#3b82f6' : context.dataset.backgroundColor
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, position: 'left', grid: { color: '#e5e7eb' } },
                y1: { beginAtZero: false, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: function(value) { return value + '%'; } } }
            }
        }
    });
}

// Função para gerar os rótulos dos últimos 7 dias
function getLast7DaysLabels() {
    const labels = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        if (i === 0) {
            labels.push('Hoje');
        } else if (i === 1) {
            labels.push('Ontem');
        } else {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const dayOfWeek = dayNames[date.getDay()];
            labels.push(`${day}/${month}`);
        }
    }
    return labels;
}

// Função para renderizar o gráfico semanal
async function renderWeeklyChart() {
    const ctx = document.getElementById('weeklyPerformanceChart');
    if (!ctx) return;
    
    // Busca os dados reais do Firestore.
    const questionsSolvedData = await getWeeklySolvedQuestionsData(); 
    const allLabels = getLast7DaysLabels();

    const filteredLabels = allLabels;
    const filteredData = questionsSolvedData;

    if (window.weeklyChartInstance) {
        window.weeklyChartInstance.destroy();
    }

    window.weeklyChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: filteredLabels,
            datasets: [
                {
                    label: 'Questões Resolvidas',
                    data: filteredData,
                    backgroundColor: '#FFC000',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Questões Resolvidas (Últimos 7 Dias)',
                    font: { size: 18 },
                    color: '#4b5563',
                    padding: { bottom: 20 }
                },
                legend: { display: false },
                tooltip: { enabled: true },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value) => value > 0 ? value : '',
                    font: { weight: 'bold', size: 14 },
                    color: '#FFC000'
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7280' } },
                y: { beginAtZero: true, grid: { color: '#e5e7eb' }, ticks: { color: '#6b7280' } }
            }
        }
    });
}


async function saveSessionStats() {
    if (!currentUser || sessionStats.length === 0) return;
    
    const total = sessionStats.length;
    const correct = sessionStats.filter(s => s.isCorrect).length;
    const incorrect = total - correct;
    const accuracy = total > 0 ? (correct / total * 100) : 0; 
    
    const statsByMateria = sessionStats.reduce((acc, stat) => {
        if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
        acc[stat.materia].total++;
        if (stat.isCorrect) acc[stat.materia].correct++;
        return acc;
    }, {});

    const sessionData = {
        createdAt: serverTimestamp(),
        totalQuestions: total,
        correctCount: correct,
        incorrectCount: incorrect,
        accuracy: accuracy,
        details: statsByMateria
    };

    try {
        const sessionsCollection = collection(db, 'users', currentUser.uid, 'sessions');
        await addDoc(sessionsCollection, sessionData);
    } catch (error) {
        console.error("Erro ao salvar a sessão:", error);
    }
}

function setupStatsListener(userId) {
    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc'));

    unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
        historicalSessions = [];
        snapshot.forEach(doc => historicalSessions.push(doc.data()));
        updateStatsPageUI(); // Atualiza os cards e gráficos da Home View
    });
}

// --- FUNÇÕES DE NAVEGAÇÃO ENTRE ELEMENTOS DINÂMICOS ---

function handleFilterClick() {
    const filterBtn = elements.filterBtn;
    if (!filterBtn) return;
    
    if (isAddingQuestionsMode.active) {
        // Lógica de adicionar questões ao caderno
        const caderno = userCadernos.find(c => c.id === isAddingQuestionsMode.cadernoId);
        if (!currentUser || !isAddingQuestionsMode.cadernoId || !caderno) return;

        const existingIds = caderno.questionIds || [];
        const newQuestionIds = filteredQuestions
            .filter(q => !existingIds.includes(q.id))
            .map(q => q.id);

        if (newQuestionIds.length > 0) {
            const cadernoRef = doc(db, 'users', currentUser.uid, 'cadernos', isAddingQuestionsMode.cadernoId);
            updateDoc(cadernoRef, { questionIds: arrayUnion(...newQuestionIds) });
        }
        
        const targetCadernoId = isAddingQuestionsMode.cadernoId;
        exitAddMode();
        isNavigatingBackFromAddMode = true;
        currentCadernoId = targetCadernoId; 
        loadView('cadernos');

     } else {
        applyFilters();
     }
}

function toggleFilterCard() {
    const filterCard = elements.filterCard;
    if (!filterCard) return;

    filterCard.classList.toggle('hidden');
    const toggleFiltersBtn = elements.toggleFiltersBtn;
    if (toggleFiltersBtn) {
        if (filterCard.classList.contains('hidden')) {
            toggleFiltersBtn.innerHTML = `<i class="fas fa-eye mr-2"></i> Mostrar Filtros`;
        } else {
            toggleFiltersBtn.innerHTML = `<i class="fas fa-eye-slash mr-2"></i> Ocultar Filtros`;
        }
    }
}

function handleVadeMecumTabs(event) {
    const targetTab = event.target.dataset.tab;
    if (!targetTab) return;

    const questionView = document.getElementById('question-view');
    const statsView = document.getElementById('stats-view');
    const tabsContainer = elements.tabsContainer;

    if (!questionView || !statsView || !tabsContainer) return;

    tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const questionCounterTop = document.getElementById('question-counter-top');
    const questionInfoContainer = document.getElementById('question-info-container');
    const questionToolbar = document.getElementById('question-toolbar');

    if (targetTab === 'question') {
        questionView.classList.remove('hidden');
        statsView.classList.add('hidden');
        if (questionCounterTop) questionCounterTop.classList.remove('hidden');
        if (questionInfoContainer) questionInfoContainer.classList.remove('hidden');
        if (questionToolbar) questionToolbar.classList.remove('hidden');
    } else if (targetTab === 'stats') {
        questionView.classList.add('hidden');
        statsView.classList.remove('hidden');
        if (questionCounterTop) questionCounterTop.classList.add('hidden');
        if (questionInfoContainer) questionInfoContainer.classList.add('hidden');
        if (questionToolbar) questionToolbar.classList.add('hidden');

        const statsContainer = statsView.querySelector('#stats-content');
        if (statsContainer) {
             statsContainer.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i><p class="mt-2">Carregando histórico...</p></div>`;
             // Carrega as estatísticas do contexto (caderno ou filtros)
             updateStatsPanel(statsContainer); // Estatísticas da sessão atual/filtros
        }
    }
}

function handleRemoveFilterTag(event) {
    const removeBtn = event.target.closest('.remove-filter-btn');
    if (!removeBtn) return;

    const type = removeBtn.dataset.filterType;
    const value = removeBtn.dataset.filterValue;
    
    switch (type) {
        case 'materia':
        case 'assunto':
            const filterContainer = elements[`${type}Filter`];
            if (!filterContainer) return;
            const checkbox = filterContainer.querySelector(`.custom-select-option[data-value="${value}"]`);
            if (checkbox) {
                checkbox.checked = false;
                filterContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (isAddingQuestionsMode.active) { applyFilters(); }
            break;
        case 'tipo':
            const tipoFilterGroup = elements.tipoFilterGroup;
            if (!tipoFilterGroup) return;
            tipoFilterGroup.querySelector('.active-filter').classList.remove('active-filter');
            tipoFilterGroup.querySelector(`[data-value="todos"]`).classList.add('active-filter');
            if (isAddingQuestionsMode.active) { applyFilters(); }
            break;
        case 'search':
            const searchInput = elements.searchInput;
            if (!searchInput) return;
            searchInput.value = '';
            if (isAddingQuestionsMode.active) { applyFilters(); }
            break;
    }
}

async function renderFoldersAndCadernos() {
    const savedCadernosListContainer = elements.savedCadernosListContainer;
    const cadernosViewTitle = elements.cadernosViewTitle;
    const backToFoldersBtn = elements.backToFoldersBtn;
    const addCadernoToFolderBtn = elements.addCadernoToFolderBtn;
    const createFolderBtn = elements.createFolderBtn;
    const addQuestionsToCadernoBtn = elements.addQuestionsToCadernoBtn;
    
     if (!savedCadernosListContainer || !cadernosViewTitle || !backToFoldersBtn || !addCadernoToFolderBtn || !createFolderBtn || !addQuestionsToCadernoBtn) return;

     savedCadernosListContainer.innerHTML = '';
     
     if (currentCadernoId) {
        const caderno = userCadernos.find(c => c.id === currentCadernoId);
        if (!caderno) { currentCadernoId = null; await renderFoldersAndCadernos(); return; }

        cadernosViewTitle.textContent = caderno.name;
        backToFoldersBtn.classList.remove('hidden');
        addCadernoToFolderBtn.classList.add('hidden');
        createFolderBtn.classList.add('hidden');
        addQuestionsToCadernoBtn.classList.remove('hidden');
        
        // Injeta a UI de resolução (conteúdo do Questoes.html - parte interna)
        const vadeMecumContent = viewMap['vade-mecum'];
        // Carrega apenas o container de navegação/resolução.
        fetch(vadeMecumContent).then(res => res.text()).then(html => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const contentArea = tempDiv.querySelector('#vade-mecum-content-area');
            if (contentArea) {
                const tabsAndMainContent = contentArea.querySelector('#tabs-and-main-content');
                if (tabsAndMainContent) {
                     savedCadernosListContainer.appendChild(tabsAndMainContent);
                
                     // Re-bind tabs listener for injected content
                     const tabsContainerCaderno = savedCadernosListContainer.querySelector('#tabs-container');
                     if (tabsContainerCaderno) tabsContainerCaderno.addEventListener('click', handleCadernoTabs);

                    // Prepara a sessão de estudo
                    filteredQuestions = allQuestions.filter(q => caderno.questionIds.includes(q.id));
                    const savedState = userCadernoState.get(currentCadernoId);
                    currentQuestionIndex = (savedState && savedState.lastQuestionIndex < filteredQuestions.length) ? savedState.lastQuestionIndex : 0;
                    
                    sessionStats = [];
                    displayQuestion();
                }
            }
        });
     }
     else if (currentFolderId) {
        const folder = userFolders.find(f => f.id === currentFolderId);
        if (!folder) { currentFolderId = null; await renderFoldersAndCadernos(); return; }

        cadernosViewTitle.textContent = folder.name;
        backToFoldersBtn.classList.remove('hidden');
        addCadernoToFolderBtn.classList.remove('hidden');
        createFolderBtn.classList.add('hidden');
        addQuestionsToCadernoBtn.classList.add('hidden');

        const cadernosInFolder = userCadernos.filter(c => c.folderId === currentFolderId);
        if (cadernosInFolder.length > 0) {
             savedCadernosListContainer.innerHTML = cadernosInFolder.map(caderno => `
                <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm caderno-item mb-2" data-caderno-id="${caderno.id}">
                   <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                        <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                        <div>
                            <h4 class="font-bold text-lg">${caderno.name}</h4>
                            <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="estudar-caderno-btn bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600" data-id="${caderno.id}">Estudar</button>
                        <button class="stats-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                        <button class="edit-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                        <button class="delete-caderno-btn text-red-500 hover:text-red-700" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                    </div>
                </div>
            `).join('');
        } else {
            savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno nesta pasta ainda. Clique em "Adicionar Caderno" para criar um.</p>';
        }
     } 
     else {
        cadernosViewTitle.textContent = 'Meus Cadernos';
        backToFoldersBtn.classList.add('hidden');
        addCadernoToFolderBtn.classList.add('hidden');
        createFolderBtn.classList.remove('hidden');
        addQuestionsToCadernoBtn.classList.add('hidden');

        const unfiledCadernos = userCadernos.filter(c => !c.folderId);

        if (userFolders.length === 0 && unfiledCadernos.length === 0) {
             savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-lg shadow-sm">Nenhum caderno ou pasta criada ainda.</p>';
             return;
        }

        userFolders.forEach(folder => {
            const folderCadernosCount = userCadernos.filter(c => c.folderId === folder.id).length;
            const folderEl = document.createElement('div');
            folderEl.className = 'bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition folder-item mb-2';
            folderEl.dataset.folderId = folder.id;
            folderEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                        <i class="fas fa-folder text-yellow-500 text-2xl mr-4"></i>
                        <div>
                            <span class="font-bold text-lg">${folder.name}</span>
                            <p class="text-sm text-gray-500">${folderCadernosCount} caderno(s)</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1">
                         <button class="stats-folder-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                         <button class="edit-folder-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${folder.id}" data-name="${folder.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                         <button class="delete-folder-btn text-gray-400 hover:text-red-600 p-2 rounded-full" data-id="${folder.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                         <i class="fas fa-chevron-right text-gray-400 ml-2"></i>
                    </div>
                </div>`;
            savedCadernosListContainer.appendChild(folderEl);
        });

        if (unfiledCadernos.length > 0) {
            const unfiledContainer = document.createElement('div');
            if (userFolders.length > 0) { unfiledContainer.innerHTML = '<h3 class="mt-6 mb-2 text-md font-semibold text-gray-600">Cadernos sem Pasta</h3>'; }
            unfiledCadernos.forEach(caderno => {
                const cadernoEl = document.createElement('div');
                cadernoEl.className = 'flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mt-2 caderno-item mb-2" data-caderno-id="${caderno.id}';
                cadernoEl.innerHTML = `
                     <div class="flex items-center cursor-pointer flex-grow" data-action="open">
                        <i class="fas fa-book text-blue-500 text-2xl mr-4"></i>
                        <div>
                            <h4 class="font-bold text-lg">${caderno.name}</h4>
                            <p class="text-sm text-gray-500">${caderno.questionIds.length} questões</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="estudar-caderno-btn bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600" data-id="${caderno.id}">Estudar</button>
                        <button class="stats-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-chart-bar pointer-events-none"></i></button>
                        <button class="edit-caderno-btn text-gray-400 hover:text-blue-600 p-2 rounded-full" data-id="${caderno.id}" data-name="${caderno.name}"><i class="fas fa-pencil-alt pointer-events-none"></i></button>
                        <button class="delete-caderno-btn text-red-500 hover:text-red-700" data-id="${caderno.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                    </div>`;
                unfiledContainer.appendChild(cadernoEl);
            });
            savedCadernosListContainer.appendChild(unfiledContainer);
        }
    }
}

function handleCadernoTabs(event) {
    const targetTab = event.target.dataset.tab;
    const activeContainer = document.getElementById('saved-cadernos-list-container');
    if (!targetTab || !activeContainer) return;

    const questionView = activeContainer.querySelector('#question-view');
    const statsView = activeContainer.querySelector('#stats-view');
    const tabsContainer = activeContainer.querySelector('#tabs-container');
    
    if (!questionView || !statsView || !tabsContainer) return;

    tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const questionCounterTop = activeContainer.querySelector('#question-counter-top');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');

    if (targetTab === 'question') {
        questionView.classList.remove('hidden');
        statsView.classList.add('hidden');
        if (questionCounterTop) questionCounterTop.classList.remove('hidden');
        if (questionInfoContainer) questionInfoContainer.classList.remove('hidden');
        if (questionToolbar) questionToolbar.classList.remove('hidden');
    } else if (targetTab === 'stats') {
        questionView.classList.add('hidden');
        statsView.classList.remove('hidden');
        if (questionCounterTop) questionCounterTop.classList.add('hidden');
        if (questionInfoContainer) questionInfoContainer.classList.add('hidden');
        if (questionToolbar) questionToolbar.classList.add('hidden');

        const statsContainer = statsView.querySelector('#stats-content');
        if (statsContainer) {
             statsContainer.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i><p class="mt-2">Carregando histórico...</p></div>`;
             
             const caderno = userCadernos.find(c => c.id === currentCadernoId);
             if (caderno && caderno.questionIds) {
                 generateStatsForQuestions(caderno.questionIds).then(historicalStats => {
                     updateStatsPanel(statsContainer, historicalStats);
                 });
             }
        }
    }
}


function handleCadernosActions(event) {
    const target = event.target;
    const actionTarget = target.closest('[data-action="open"]');

    if (!currentUser) return;
    
    if (actionTarget) {
        const folderItem = target.closest('.folder-item');
        if (folderItem) { 
            currentFolderId = folderItem.dataset.folderId;
            renderFoldersAndCadernos();
            return;
        }
        
        const cadernoItem = target.closest('.caderno-item');
        if(cadernoItem) {
            currentCadernoId = cadernoItem.dataset.cadernoId;
            renderFoldersAndCadernos();
            return;
        }
    }

    // Ações de botões (Editar, Excluir, Estudar, Stats)
    if (target.closest('.estudar-caderno-btn')) {
        const cadernoId = target.closest('.estudar-caderno-btn').dataset.id;
        const cadernoToLoad = userCadernos.find(c => c.id === cadernoId);
        if (cadernoToLoad && cadernoToLoad.questionIds.length > 0) {
            loadView('vade-mecum', false).then(() => {
                // Configurar a sessão de estudo após o carregamento da view
                setTimeout(() => {
                    filteredQuestions = allQuestions.filter(q => cadernoToLoad.questionIds.includes(q.id));
                    currentQuestionIndex = 0;
                    sessionStats = [];
                    displayQuestion();
                    updateStatsPanel();
                    if (elements.selectedFiltersContainer) {
                        elements.selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Estudando o caderno: <strong>${cadernoToLoad.name}</strong></span>`;
                    }
                }, 100);
            });
            
        } else {
            // Em ambientes sem alert(), você usaria um modal customizado
            // Para simplificar, vou manter a lógica de notificação.
            alert("Este caderno não tem questões. Adicione algumas antes de estudar.");
        }
    } 

    if (target.closest('.edit-folder-btn')) {
         editingType = 'folder';
         editingId = target.closest('.edit-folder-btn').dataset.id;
         nameInput.value = target.closest('.edit-folder-btn').dataset.name;
         nameModalTitle.textContent = "Editar Pasta";
         nameModal.classList.remove('hidden');
         return;
    }
    
    if (target.closest('.edit-caderno-btn')) {
         editingType = 'caderno';
         editingId = target.closest('.edit-caderno-btn').dataset.id;
         nameInput.value = target.closest('.edit-caderno-btn').dataset.name;
         nameModalTitle.textContent = "Editar Caderno";
         nameModal.classList.remove('hidden');
         return;
    }
    
    // Lógica para Delete, Stats (mantida)
    if (target.closest('.delete-folder-btn')) {
        deletingId = target.closest('.delete-folder-btn').dataset.id;
        deletingType = 'folder';
        const folderName = userFolders.find(f => f.id === deletingId)?.name || '';
        confirmationModalTitle.textContent = `Excluir Pasta`;
        confirmationModalText.innerHTML = `Deseja excluir a pasta <strong>"${folderName}"</strong>? <br><br> <span class="font-bold text-red-600">Todos os cadernos dentro dela também serão excluídos.</span>`;
        confirmationModal.classList.remove('hidden');
        return;
    }

    if (target.closest('.delete-caderno-btn')) {
        deletingId = target.closest('.delete-caderno-btn').dataset.id;
        deletingType = 'caderno';
        const cadernoName = userCadernos.find(c => c.id === deletingId)?.name || '';
        confirmationModalTitle.textContent = `Excluir Caderno`;
        confirmationModalText.innerHTML = `Deseja excluir o caderno <strong>"${cadernoName}"</strong>?`;
        confirmationModal.classList.remove('hidden');
        return;
    }

    if (target.closest('.stats-caderno-btn')) {
        const statsBtn = target.closest('.stats-caderno-btn');
        showItemStats(statsBtn.dataset.id, 'caderno', statsBtn.dataset.name);
        return;
    }

    if (target.closest('.stats-folder-btn')) {
        const statsBtn = target.closest('.stats-folder-btn');
        showItemStats(statsBtn.dataset.id, 'folder', statsBtn.dataset.name);
        return;
    }

    if (target.closest('.remove-question-btn')) {
        if (!currentCadernoId) return;
        const questionIdToRemove = target.closest('.remove-question-btn').dataset.questionId;
        const cadernoRef = doc(db, 'users', currentUser.uid, 'cadernos', currentCadernoId);
        updateDoc(cadernoRef, { questionIds: arrayRemove(questionIdToRemove) });
    }
}

function handleCadernosBack() {
     if (currentCadernoId) {
        currentCadernoId = null;
        renderFoldersAndCadernos();
     } else if(currentFolderId) {
        currentFolderId = null;
        renderFoldersAndCadernos();
     }
}

function startAddQuestionsMode() {
    const caderno = userCadernos.find(c => c.id === currentCadernoId);
    if (!caderno) return;
    
    isAddingQuestionsMode = { active: true, cadernoId: currentCadernoId };
    
    // Navega para a view de questões, que será renderizada no modo de adição
    loadView('vade-mecum', false).then(() => {
        if(elements.addQuestionsBanner) elements.addQuestionsBanner.classList.remove('hidden');
        if(elements.addQuestionsBannerText) elements.addQuestionsBannerText.textContent = `Selecione questões para adicionar ao caderno "${caderno.name}".`;
        // Certifica-se de que os botões de filtro estão visíveis para que o usuário possa filtrar
        if(elements.toggleFiltersBtn) elements.toggleFiltersBtn.classList.remove('hidden');
        if(elements.filterCard) elements.filterCard.classList.remove('hidden');
        applyFilters();
    });
}

function cancelAddQuestionsMode() {
    exitAddMode();
    loadView('cadernos');
}

function showCadernoModalForFilter() {
    if (!currentUser) { alert("Por favor, faça login para criar cadernos."); return; }
    createCadernoWithFilteredQuestions = true;
    cadernoNameInput.value = '';
    folderSelect.value = '';
    folderSelect.disabled = false;
    cadernoModal.classList.remove('hidden');
}

function showCadernoModalForFolder() {
    if (!currentUser || !currentFolderId) return;
    createCadernoWithFilteredQuestions = false;
    cadernoNameInput.value = '';
    folderSelect.value = currentFolderId;
    folderSelect.disabled = true;
    cadernoModal.classList.remove('hidden');
}

function showCreateFolderModal() {
    if (!currentUser) { alert("Por favor, faça login para criar pastas."); return; }
    editingId = null;
    editingType = 'folder';
    nameInput.value = '';
    nameModalTitle.textContent = 'Criar Nova Pasta';
    nameModal.classList.remove('hidden');
}

function handleMateriaSelection(event) {
    const materiaItem = event.target.closest('.materia-item');
    if (materiaItem) {
        const materiaName = materiaItem.dataset.materiaName;
        selectedMateria = filterOptions.materia.find(m => m.name === materiaName);
        renderMateriasView();
    }
}

function handleAssuntoSelection(event) {
    const assuntoItem = event.target.closest('.assunto-item');
    if (assuntoItem && selectedMateria) {
        const assuntoName = assuntoItem.dataset.assuntoName;
        const materiaName = selectedMateria.name;

        loadView('vade-mecum').then(() => {
            // Usar setTimeout para garantir que a view e seus elementos (filtros) foram carregados
            setTimeout(() => {
                clearAllFilters();

                const materiaContainer = elements.materiaFilter;
                const materiaCheckbox = materiaContainer.querySelector(`.custom-select-option[data-value="${materiaName}"]`);
                if (materiaCheckbox) {
                    materiaCheckbox.checked = true;
                    materiaContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
                }

                setTimeout(() => {
                    const assuntoContainer = elements.assuntoFilter;
                    const assuntoCheckbox = assuntoContainer.querySelector(`.custom-select-option[data-value="${assuntoName}"]`);
                    if (assuntoCheckbox) {
                        assuntoCheckbox.checked = true;
                        assuntoContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    applyFilters();
                }, 50); 
            }, 50);
        });
    }
}

function handleMateriasBack() {
    selectedMateria = null;
    renderMateriasView();
}

function showResetProgressConfirmation() {
    if (!currentUser) return;
    deletingId = null; 
    deletingType = 'all-progress';
    confirmationModalTitle.textContent = `Resetar Todo o Progresso`;
    confirmationModalText.innerHTML = `Tem certeza que deseja apagar **TODO** o seu histórico de resoluções e revisões? <br><br> <span class="font-bold text-red-600">Esta ação é irreversível e apagará todas as suas estatísticas.</span>`;
    document.querySelector('#confirmation-modal .flex.justify-center.space-x-4').classList.remove('hidden');
    confirmationModal.classList.remove('hidden');
}

// --- Funções de Autenticação e Listeners ---
function updateUserUI(user) {
    const mobileContainer = userAccountContainerMobile;
    if (!userAccountContainer || !mobileContainer) return;

    userAccountContainer.innerHTML = '';
    mobileContainer.innerHTML = '';

    if (user) {
        const loggedInHTML = `<div class="flex items-center"><span class="text-gray-600 text-sm mr-4">${user.email}</span><button id="logout-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        const loggedInHTMLMobile = `<div class="flex items-center justify-between"><span class="text-gray-600 text-sm">${user.email}</span><button id="logout-btn-mobile" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        userAccountContainer.innerHTML = loggedInHTML;
        mobileContainer.innerHTML = loggedInHTMLMobile;

        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
        document.getElementById('logout-btn-mobile').addEventListener('click', () => signOut(auth));
    } else {
        const loggedOutHTML = `<button id="show-login-modal-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Minha Conta</button>`;
        userAccountContainer.innerHTML = loggedOutHTML;
        mobileContainer.innerHTML = loggedOutHTML;

        document.getElementById('show-login-modal-btn').addEventListener('click', () => authModal.classList.remove('hidden'));
        mobileContainer.querySelector('#show-login-modal-btn').addEventListener('click', () => authModal.classList.remove('hidden'));
    }
}

function exitAddMode() {
    if (isAddingQuestionsMode.active) {
        isAddingQuestionsMode = { active: false, cadernoId: null };
        const addQuestionsBanner = document.getElementById('add-questions-banner');
        const filterBtn = document.getElementById('filter-btn');
        if(addQuestionsBanner) addQuestionsBanner.classList.add('hidden');
        if(filterBtn) {
            filterBtn.textContent = 'Filtrar questões';
            filterBtn.disabled = false;
        }
        
        // Restaura a visibilidade da UI de resolução de questões
        const mainContentContainer = document.getElementById('tabs-and-main-content');
        if(mainContentContainer) mainContentContainer.classList.remove('hidden');
    }
}

function renderMateriasView() {
    const materiasListContainer = elements.materiasListContainer;
    const assuntosListContainer = elements.assuntosListContainer;
    const materiasViewTitle = elements.materiasViewTitle;
    const backToMateriasBtn = elements.backToMateriasBtn;

    if (!materiasListContainer || !assuntosListContainer || !materiasViewTitle || !backToMateriasBtn) return;


    if (!currentUser) {
        materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Por favor, faça login para ver as matérias.</p>';
        assuntosListContainer.classList.add('hidden');
        return;
    }

    if (selectedMateria) {
        // Display assuntos for the selected materia
        materiasViewTitle.textContent = selectedMateria.name;
        materiasListContainer.classList.add('hidden');
        assuntosListContainer.classList.remove('hidden');
        backToMateriasBtn.classList.remove('hidden');

        const assuntosHtml = selectedMateria.assuntos.map(assunto => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer assunto-item" data-assunto-name="${assunto}">
                <div class="flex items-center">
                    <i class="fas fa-file-alt text-gray-400 mr-3"></i>
                    <span class="text-gray-800">${assunto}</span>
                </div>
            </div>
        `).join('');
        assuntosListContainer.innerHTML = `<div class="space-y-2">${assuntosHtml}</div>`;

    } else {
        // Display all materias
        materiasViewTitle.textContent = 'Matérias';
        materiasListContainer.classList.remove('hidden');
        assuntosListContainer.classList.add('hidden');
        backToMateriasBtn.classList.add('hidden');

        if (filterOptions.materia.length === 0) {
             materiasListContainer.innerHTML = '<p class="text-center text-gray-500">Nenhuma matéria encontrada. Adicione questões para vê-las aqui.</p>';
             return;
        }

        const materiasHtml = filterOptions.materia.map(materia => `
            <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer materia-item" data-materia-name="${materia.name}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <i class="fas fa-book-open text-blue-500 mr-4 text-xl"></i>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">${materia.name}</h3>
                            <p class="text-sm text-gray-500">${materia.assuntos.length} assunto(s)</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
            </div>
        `).join('');
        materiasListContainer.innerHTML = materiasHtml;
    }
}

const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Days

function getNextReviewDate(stage) {
    const index = Math.min(stage, reviewIntervals.length - 1);
    const daysToAdd = reviewIntervals[index];
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return Timestamp.fromDate(date);
}

async function handleSrsFeedback(event) {
    const feedback = event.target.closest('.srs-feedback-btn').dataset.feedback;
    const question = filteredQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    if (!sessionStats.some(s => s.questionId === question.id)) {
         sessionStats.push({
            questionId: question.id, isCorrect: isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer: selectedAnswer
        });
    }

    if (currentUser) {
        const reviewRef = doc(db, 'users', currentUser.uid, 'reviewItems', question.id);
        const reviewItem = userReviewItemsMap.get(question.id);
        let currentStage = reviewItem ? reviewItem.stage : 0;
        let newStage;

        switch (feedback) {
            case 'again': newStage = 0; break;
            case 'hard': newStage = Math.max(0, currentStage - 1); break;
            case 'good': newStage = currentStage + 1; break;
            case 'easy': newStage = currentStage + 2; break;
            default: newStage = currentStage;
        }

        const nextReview = getNextReviewDate(newStage);
        const reviewData = { stage: newStage, nextReview: nextReview, questionId: question.id };
        await setDoc(reviewRef, reviewData, { merge: true });
        userReviewItemsMap.set(question.id, reviewData); // Update local map immediately

        await saveUserAnswer(question.id, selectedAnswer, isCorrect);
        const historyIsCorrect = (feedback !== 'again') && isCorrect;
        await updateQuestionHistory(question.id, historyIsCorrect);
    }

    renderAnsweredQuestion(isCorrect, selectedAnswer, false);
    updateStatsPanel();
    updateNavigation();
    updateStatsPageUI();
    updateReviewCard();
}

function updateReviewCard() {
    const reviewCard = elements.reviewCard;
    const reviewCountEl = elements.reviewCount;
    const startReviewBtn = elements.startReviewBtn;

    if (!reviewCard || !reviewCountEl || !startReviewBtn) return;

    if (!currentUser) {
        reviewCard.classList.add('hidden');
        return;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    
    const questionsToReview = Array.from(userReviewItemsMap.values()).filter(item => {
        if (!item.nextReview) return false;
        const reviewDate = item.nextReview.toDate();
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate <= now;
    });

    const count = questionsToReview.length;
    reviewCountEl.textContent = count;
    startReviewBtn.disabled = count === 0;
    reviewCard.classList.remove('hidden');
}

function setupReviewListener(userId) {
    if (unsubReviewItems) unsubReviewItems();
    const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'));
    unsubReviewItems = onSnapshot(reviewQuery, (snapshot) => {
         snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                userReviewItemsMap.delete(change.doc.id);
            }
        });
        updateReviewCard();
    });
}

function startReviewSession() {
    const startReviewBtn = elements.startReviewBtn;
    if(!startReviewBtn || !currentUser) return;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const questionsToReview = Array.from(userReviewItemsMap.values())
        .filter(item => {
            if (!item.nextReview) return false;
            const reviewDate = item.nextReview.toDate();
            reviewDate.setHours(0, 0, 0, 0); // Normaliza a data para o início do dia
            return reviewDate <= now;
        });

    const questionsToReviewIds = questionsToReview.map(item => item.questionId);

    if (questionsToReviewIds.length > 0) {
        isReviewSession = true;
        filteredQuestions = allQuestions.filter(q => questionsToReviewIds.includes(q.id));
        sessionStats = [];
        currentQuestionIndex = 0;
        
        loadView('vade-mecum', false).then(() => {
            if(elements.vadeMecumTitle) elements.vadeMecumTitle.textContent = "Sessão de Revisão";
            if(elements.toggleFiltersBtn) elements.toggleFiltersBtn.classList.add('hidden');
            if(elements.filterCard) elements.filterCard.classList.add('hidden');
            if(elements.selectedFiltersContainer) elements.selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Revisando ${filteredQuestions.length} questões.</span>`;

            displayQuestion();
            updateStatsPanel();
        });
    }
}

async function saveCadernoState(cadernoId, questionIndex) {
    if (!currentUser || !cadernoId) return;
    const stateRef = doc(db, 'users', currentUser.uid, 'cadernoState', cadernoId);
    try {
        await setDoc(stateRef, { lastQuestionIndex: questionIndex });
    } catch (error) {
        console.error("Error saving caderno state:", error);
    }
}

function setupCadernoStateListener(userId) {
    if (unsubCadernoState) unsubCadernoState();
    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'));
    unsubCadernoState = onSnapshot(stateQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                userCadernoState.set(change.doc.id, change.doc.data());
            }
            if (change.type === "removed") {
                userCadernoState.delete(change.doc.id);
            }
        });
    });
}

function setupCadernosAndFoldersListener(userId) {
    if (unsubCadernos) unsubCadernos();
    if (unsubFolders) unsubFolders();

    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), orderBy('name'));
    unsubCadernos = onSnapshot(cadernosQuery, (snapshot) => {
        userCadernos = [];
        snapshot.forEach(doc => userCadernos.push({ id: doc.id, ...doc.data() }));
        renderFoldersAndCadernos();
    });

    const foldersQuery = query(collection(db, 'users', userId, 'folders'), orderBy('name'));
    unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        userFolders = [];
        const folderOptions = ['<option value="">Salvar em (opcional)</option>'];
        snapshot.forEach(doc => {
            const folder = { id: doc.id, ...doc.data() };
            userFolders.push(folder);
            folderOptions.push(`<option value="${folder.id}">${folder.name}</option>`);
        });
        if(folderSelect) folderSelect.innerHTML = folderOptions.join('');
        renderFoldersAndCadernos();
    });
}

function setupFiltrosListener(userId) {
    const filtrosCollection = collection(db, 'users', userId, 'filtros');
    if (unsubFiltros) unsubFiltros();
    unsubFiltros = onSnapshot(filtrosCollection, (snapshot) => {
        const savedFilters = [];
        snapshot.forEach(doc => {
            savedFilters.push({ id: doc.id, ...doc.data() });
        });
        
        const searchSavedFiltersInput = elements.searchSavedFiltersInput;
        const savedFiltersListContainer = elements.savedFiltersListContainer;
        if (!searchSavedFiltersInput || !savedFiltersListContainer) return;


        const searchTerm = searchSavedFiltersInput.value.toLowerCase();
        const filtered = savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));

        if (filtered.length === 0) {
            savedFiltersListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`;
        } else {
            savedFiltersListContainer.innerHTML = filtered.map(f => `
                <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                    <button class="load-filter-btn text-left" data-id="${f.id}">${f.name}</button>
                    <button class="delete-filter-btn text-red-500 hover:text-red-700" data-id="${f.id}">
                        <i class="fas fa-trash-alt pointer-events-none"></i>
                    </button>
                </div>
            `).join('');
        }
    });
}

// Event Listeners globais no document
document.addEventListener('click', async (event) => {
    // Tratamento de navegação entre views
    const navLink = event.target.closest('.nav-link');
    if (navLink) {
        event.preventDefault();
        loadView(navLink.dataset.view);
        return;
    }

    // Tratamento de navegação de questão (Próxima/Anterior)
    if(event.target.closest('#prev-question-btn') || event.target.closest('#next-question-btn')) {
        // Usa a lógica de navegação genérica
        const isNext = event.target.closest('#next-question-btn');
        if (isNext && currentQuestionIndex < filteredQuestions.length - 1) {
            currentQuestionIndex++;
        } else if (!isNext && currentQuestionIndex > 0) {
            currentQuestionIndex--;
        } else {
            return;
        }

        if (currentCadernoId) {
            saveCadernoState(currentCadernoId, currentQuestionIndex);
        }
        await displayQuestion();
    }
});


onAuthStateChanged(auth, (user) => {
    // Lógica de limpeza de listeners
    if (unsubCadernos) unsubCadernos();
    if (unsubFolders) unsubFolders();
    if (unsubFiltros) unsubFiltros();
    if (unsubSessions) unsubSessions();
    if (unsubReviewItems) unsubReviewItems();
    if (unsubAnswers) unsubAnswers();
    if (unsubCadernoState) unsubCadernoState();

    currentUser = user;
    currentFolderId = null; 
    currentCadernoId = null;

    if (user) {
        updateUserUI(user);
        
        // CORREÇÃO: Força o carregamento das questões antes de qualquer view
        fetchAllQuestions().then(() => {
            // Após carregar TUDO, carrega a view inicial (Início)
            loadView('inicio');
        });
        
        setupCadernosAndFoldersListener(user.uid);
        setupFiltrosListener(user.uid);
        setupStatsListener(user.uid);
        setupReviewListener(user.uid);
        setupUserAnswersListener(user.uid);
        setupCadernoStateListener(user.uid);

    } else {
        updateUserUI(null);
        // Garante que o estado das questões é limpo e a view inicial é carregada.
        allQuestions = [];
        filteredQuestions = [];
        userFolders = [];
        userCadernos = [];
        userReviewItems = [];
        userAnswers.clear();
        userCadernoState.clear();
        userReviewItemsMap.clear();
        loadView('inicio'); 
    }
});

// Inicialização dos listeners modais que estão sempre no DOM
closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));

const handleAuth = async (authFunction) => {
    authError.classList.add('hidden');
    try {
        await authFunction(auth, emailInput.value, passwordInput.value);
        authModal.classList.add('hidden');
    } catch (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    }
};

loginBtn.addEventListener('click', () => handleAuth(signInWithEmailAndPassword));
registerBtn.addEventListener('click', () => handleAuth(createUserWithEmailAndPassword));
googleLoginBtn.addEventListener('click', async () => {
    authError.classList.add('hidden');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        authModal.classList.add('hidden');
    } catch (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    }
});

// Outros listeners de modais e eventos de toggle
document.getElementById('save-filter-btn').addEventListener('click', () => {
    if (!currentUser) { alert("Por favor, faça login para salvar filtros."); return; }
    saveModal.classList.remove('hidden');
});
document.getElementById('close-save-modal').addEventListener('click', () => saveModal.classList.add('hidden'));
document.getElementById('cancel-save-btn').addEventListener('click', () => saveModal.classList.add('hidden'));

document.getElementById('confirm-save-btn').addEventListener('click', async () => {
    const name = filterNameInput.value.trim();
    if (!name || !currentUser) return;
    
    const currentFilters = {
        name: name,
        materias: JSON.parse(elements.materiaFilter.dataset.value || '[]'),
        assuntos: JSON.parse(elements.assuntoFilter.dataset.value || '[]'),
        tipo: elements.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos',
        search: elements.searchInput.value
    };
    
    const filtrosCollection = collection(db, 'users', currentUser.uid, 'filtros');
    await addDoc(filtrosCollection, currentFilters);

    filterNameInput.value = '';
    saveModal.classList.add('hidden');
});

document.getElementById('saved-filters-list-btn').addEventListener('click', () => {
    if (!currentUser) { alert("Por favor, faça login para ver os seus filtros."); return; }
    searchSavedFiltersInput.value = ''; 
    loadModal.classList.remove('hidden');
});
document.getElementById('close-load-modal').addEventListener('click', () => loadModal.classList.add('hidden'));

document.getElementById('saved-filters-list-container').addEventListener('click', async (event) => {
    const target = event.target;
    if (!currentUser) return;

    if (target.closest('.load-filter-btn')) {
        const filterId = target.closest('.load-filter-btn').dataset.id;
        const filtrosCollection = collection(db, 'users', currentUser.uid, 'filtros');
        const snapshot = await getDocs(filtrosCollection);
        const filterDoc = snapshot.docs.find(doc => doc.id === filterId);

        if (filterDoc) {
            const filterToLoad = filterDoc.data();
            elements.searchInput.value = filterToLoad.search;
            elements.tipoFilterGroup.querySelector('.active-filter').classList.remove('active-filter');
            elements.tipoFilterGroup.querySelector(`[data-value="${filterToLoad.tipo}"]`).classList.add('active-filter');
            
            const materiaContainer = elements.materiaFilter;
            materiaContainer.querySelectorAll('.custom-select-option').forEach(cb => {
                cb.checked = filterToLoad.materias.includes(cb.dataset.value);
            });
            materiaContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            
            setTimeout(() => {
               const assuntoContainer = elements.assuntoFilter;
               assuntoContainer.querySelectorAll('.custom-select-option').forEach(cb => {
                    cb.checked = filterToLoad.assuntos.includes(cb.dataset.value);
               });
               assuntoContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
               applyFilters();
            }, 0);

            loadModal.classList.add('hidden');
        }
    } else if (target.closest('.delete-filter-btn')) {
        const filterId = target.closest('.delete-filter-btn').dataset.id;
        await deleteDoc(doc(db, 'users', currentUser.uid, 'filtros', filterId));
    }
});

document.getElementById('close-caderno-modal').addEventListener('click', () => cadernoModal.classList.add('hidden'));
document.getElementById('cancel-caderno-btn').addEventListener('click', () => cadernoModal.classList.add('hidden'));

document.getElementById('confirm-caderno-btn').addEventListener('click', async () => {
    const name = cadernoNameInput.value.trim();
    if (!name || !currentUser) return;

    const questionIds = createCadernoWithFilteredQuestions ? filteredQuestions.map(q => q.id) : [];
    
    const caderno = {
        name: name,
        questionIds: questionIds,
        folderId: folderSelect.value || null,
        createdAt: serverTimestamp()
    };

    const cadernosCollection = collection(db, 'users', currentUser.uid, 'cadernos');
    await addDoc(cadernosCollection, caderno);
    cadernoModal.classList.add('hidden');
});

document.getElementById('close-name-modal').addEventListener('click', () => nameModal.classList.add('hidden'));
document.getElementById('cancel-name-btn').addEventListener('click', () => nameModal.classList.add('hidden'));

document.getElementById('confirm-name-btn').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name || !currentUser || !editingType) return;
    
    if (editingId) { // Editando
        const collectionPath = editingType === 'folder' ? 'folders' : 'cadernos';
        const itemRef = doc(db, 'users', currentUser.uid, collectionPath, editingId);
        await updateDoc(itemRef, { name: name });
    } else { // Criando (apenas pastas por enquanto)
        if (editingType === 'folder') {
            const folderData = { name: name, createdAt: serverTimestamp() };
            const foldersCollection = collection(db, 'users', currentUser.uid, 'folders');
            await addDoc(foldersCollection, folderData);
        }
    }
    
    nameModal.classList.add('hidden');
    editingId = null;
    editingType = null;
});

document.getElementById('close-confirmation-btn').addEventListener('click', () => confirmationModal.classList.add('hidden'));

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!currentUser || !deletingType) return;

    if (deletingType === 'folder') {
        const cadernosToDelete = userCadernos.filter(c => c.folderId === deletingId);
        const deleteCadernoPromises = cadernosToDelete.map(caderno => {
            const cadernoRef = doc(db, 'users', currentUser.uid, 'cadernos', caderno.id);
            return deleteDoc(cadernoRef);
        });
        await Promise.all(deleteCadernoPromises);
        const folderRef = doc(db, 'users', currentUser.uid, 'folders', deletingId);
        await deleteDoc(folderRef);
    } else if (deletingType === 'caderno') {
        const cadernoRef = doc(db, 'users', currentUser.uid, 'cadernos', deletingId);
        await deleteDoc(cadernoRef);
    } else if (deletingType === 'all-progress') {
        await resetAllUserData();
    }
    
    confirmationModal.classList.add('hidden');
});

document.getElementById('close-stats-modal').addEventListener('click', () => statsModal.classList.add('hidden'));

async function showItemStats(itemId, itemType, itemName) {
    if (!currentUser) return;
    
    statsModalTitle.textContent = `Estatísticas de "${itemName}"`;
    statsModalContent.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i><p class="mt-2">Carregando dados...</p></div>`;
    statsModal.classList.remove('hidden');

    let questionIds = [];
    if (itemType === 'caderno') {
        const caderno = userCadernos.find(c => c.id === itemId);
        if (caderno) {
            questionIds = caderno.questionIds || [];
        }
    } else if (itemType === 'folder') {
        userCadernos.forEach(c => {
            if (c.folderId === itemId && c.questionIds) {
                questionIds.push(...c.questionIds);
            }
        });
        questionIds = [...new Set(questionIds)]; // Remove duplicates
    }

    if (questionIds.length === 0) {
        statsModalContent.innerHTML = `<div class="text-center p-8"><p>Nenhuma questão encontrada para gerar estatísticas.</p></div>`;
        return;
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let questionsWithHistory = 0;

    const historyPromises = questionIds.map(id => getDoc(doc(db, 'users', currentUser.uid, 'questionHistory', id)));
    const historySnapshots = await Promise.all(historyPromises);

    historySnapshots.forEach(snap => {
        if (snap.exists()) {
            const data = snap.data();
            const correct = data.correct || 0;
            const incorrect = data.incorrect || 0;
            if (correct > 0 || incorrect > 0) {
                questionsWithHistory++;
            }
            totalCorrect += correct;
            totalIncorrect += incorrect;
        }
    });
    
    const totalAttempts = totalCorrect + totalIncorrect;
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts * 100) : 0;

    statsModalContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Questões Respondidas</h4>
                <p class="mt-1 text-2xl font-semibold text-gray-900">${questionsWithHistory} / ${questionIds.length}</p>
            </div>
            <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Aproveitamento</h4>
                <p class="mt-1 text-2xl font-semibold ${accuracy >= 60 ? 'text-green-600' : 'text-red-600'}">${accuracy.toFixed(0)}%</p>
            </div>
             <div class="bg-gray-100 p-4 rounded-lg">
                <h4 class="text-sm font-medium text-gray-500">Total de Respostas</h4>
                <p class="mt-1 text-2xl font-semibold text-gray-900">${totalAttempts}</p>
            </div>
        </div>
        <div class="relative mx-auto mt-6" style="max-width: 300px;">
            <canvas id="itemPerformanceChart"></canvas>
        </div>
    `;
    
    if (totalAttempts > 0) {
        const canvas = document.getElementById('itemPerformanceChart');
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Acertos', 'Erros'],
                datasets: [{
                    data: [totalCorrect, totalIncorrect],
                    backgroundColor: ['#22c55e', '#ef4444'],
                    hoverBackgroundColor: ['#16a34a', '#dc2626'],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    } else {
         document.getElementById('itemPerformanceChart').outerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum histórico de respostas para exibir o gráfico.</p>';
    }
}

async function resetAllUserData() {
    if (!currentUser) return;

    // Show loading state in modal
    confirmationModalTitle.textContent = "Resetando...";
    confirmationModalText.innerHTML = `<div class="flex justify-center items-center p-4"><i class="fas fa-spinner fa-spin text-3xl text-gray-500"></i></div>`;
    document.querySelector('#confirmation-modal .flex.justify-center.space-x-4').classList.add('hidden');

    const collectionsToDelete = ['questionHistory', 'reviewItems', 'userQuestionState', 'cadernoState', 'sessions'];

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, 'users', currentUser.uid, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (snapshot.empty) continue;

        // Firestore limits batches to 500 operations.
        const batchArray = [];
        batchArray.push(writeBatch(db));
        let operationCounter = 0;
        let batchIndex = 0;

        snapshot.docs.forEach(doc => {
            batchArray[batchIndex].delete(doc.ref);
            operationCounter++;

            if (operationCounter === 500) {
                batchArray.push(writeBatch(db));
                batchIndex++;
                operationCounter = 0;
            }
        });

        await Promise.all(batchArray.map(batch => batch.commit()));
    }

    // Reset local state
    userAnswers.clear();
    userReviewItemsMap.clear();
    userCadernoState.clear();
    historicalSessions = [];
    sessionStats = [];

    // Restore modal UI before closing
    document.querySelector('#confirmation-modal .flex.justify-center.space-x-4').classList.remove('hidden');
    // confirmationModal.classList.add('hidden');

    // Refresh UI
    updateStatsPageUI();
    updateReviewCard();
    
    // If inside a caderno, refresh that view too
    if(currentCadernoId) {
        displayQuestion();
    }
}

window.addEventListener('click', function(e){   
  document.querySelectorAll('.custom-select-container').forEach(container => {
      if (!container.contains(e.target)){
        const panel = container.querySelector('.custom-select-panel');
        if (panel) panel.classList.add('hidden');
      }
  });
  if (loadModal && loadModal.querySelector('div') && !loadModal.querySelector('div').contains(e.target) && document.getElementById('saved-filters-list-btn') && !document.getElementById('saved-filters-list-btn').contains(e.target) && !loadModal.classList.contains('hidden')) {
      loadModal.classList.add('hidden');
  }
   if (saveModal && saveModal.querySelector('div') && !saveModal.querySelector('div').contains(e.target) && document.getElementById('save-filter-btn') && !document.getElementById('save-filter-btn').contains(e.target) && !saveModal.classList.contains('hidden')) {
      saveModal.classList.add('hidden');
  }
  if (authModal && authModal.contains(e.target) && authModal.querySelector('div') && !authModal.querySelector('div').contains(e.target)) {
      authModal.classList.add('hidden');
  }
});
