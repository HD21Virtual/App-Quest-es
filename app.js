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
    if (!url) return;

    if (isAddingQuestionsMode.active && (viewName !== 'vade-mecum' || isUserClick)) {
        exitAddMode();
    }

    try {
        const response = await fetch(url);
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
        mainContentContainer.innerHTML = `<div class="text-center p-10 text-red-500">Erro ao carregar o conteúdo da página ${viewName}.</div>`;
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
        // Nada a fazer aqui por enquanto, pois os dados são carregados em updateStatsPageUI
        // que é chamada por onAuthStateChanged
    }

    // Se o usuário não está logado, as views devem ser limpas
    if (!currentUser) {
        if (viewName === 'cadernos' && elements.savedCadernosListContainer) {
            elements.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500">Por favor, faça login para ver os seus cadernos.</p>';
        } else if (viewName === 'estatisticas' && elements.detailedStatsContainer) {
            elements.detailedStatsContainer.innerHTML = '<p class="text-center text-gray-500">Por favor, inicie sessão para ver as suas estatísticas.</p>';
        }
    }
}

// --- FUNÇÕES DE LÓGICA (MUITAS FUNÇÕES OMITIDAS AQUI PARA MANTER O FOCO NA SEPARAÇÃO) ---
// Note: As funções de lógica original foram mantidas, mas renomeadas (ex: applyFilters -> applyFilters)
// e ajustadas para buscar elementos dentro da estrutura dinâmica.

async function fetchAllQuestions() {
    // ... (Mantida)
}

function renderQuestionListForAdding(questions, existingQuestionIds) {
    // ... (Mantida)
}

async function applyFilters() {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function updateSelectedFiltersDisplay() {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

async function updateNavigation() {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

async function displayQuestion() {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function renderUnansweredQuestion() {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function handleDiscardOption(event) {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function handleOptionSelect(event) {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

async function updateQuestionHistory(questionId, isCorrect) {
    // ... (Mantida)
}

async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    // ... (Mantida)
}

function setupUserAnswersListener(userId) {
    // ... (Mantida)
}

async function checkAnswer() {
    // ... (Mantida)
}

function showOrToggleComment() {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function updateStatsPanel(container = null, data = null) {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

async function getHistoricalCountsForQuestions(questionIds) {
    // ... (Mantida)
}

async function generateStatsForQuestions(questionIds) {
    // ... (Mantida)
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
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function setupCustomSelect(container) {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

function clearAllFilters() {
    // ... (Mantida com ajustes para elementos dinâmicos)
}

async function getWeeklySolvedQuestionsData() {
    // ... (Mantida)
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
    
    // **NOTA:** A função que renderizava os detalhes do desempenho e o histórico na aba "Estatísticas" foi removida.
    // O elemento detailed-stats-container no stats-main-content está pronto para receber o novo conteúdo.
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
    // ... (Mantida)
}

// Função para renderizar o gráfico semanal
async function renderWeeklyChart() {
    const ctx = document.getElementById('weeklyPerformanceChart');
    if (!ctx) return;
    // ... (Lógica de renderização mantida)
    
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
    // ... (Mantida)
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
             if (currentCadernoId) {
                const caderno = userCadernos.find(c => c.id === currentCadernoId);
                if (caderno && caderno.questionIds) {
                    generateStatsForQuestions(caderno.questionIds).then(historicalStats => {
                        updateStatsPanel(statsContainer, historicalStats);
                    });
                }
             } else {
                 updateStatsPanel(statsContainer); // Estatísticas da sessão atual/filtros
             }
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
            const checkbox = filterContainer.querySelector(`.custom-select-option[data-value="${value}"]`);
            if (checkbox) {
                checkbox.checked = false;
                filterContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (isAddingQuestionsMode.active) { applyFilters(); }
            break;
        case 'tipo':
            elements.tipoFilterGroup.querySelector('.active-filter').classList.remove('active-filter');
            elements.tipoFilterGroup.querySelector(`[data-value="todos"]`).classList.add('active-filter');
            if (isAddingQuestionsMode.active) { applyFilters(); }
            break;
        case 'search':
            elements.searchInput.value = '';
            if (isAddingQuestionsMode.active) { applyFilters(); }
            break;
    }
}

async function renderFoldersAndCadernos() {
    // ... (Mantida com ajustes para elementos dinâmicos)
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
        const tempDiv = document.createElement('div');
        const vadeMecumContent = document.querySelector('a[data-view="vade-mecum"]').getAttribute('href');
        // Carrega apenas o container de navegação/resolução.
        fetch(vadeMecumContent).then(res => res.text()).then(html => {
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
        // ... (Renderização dos cadernos na pasta mantida)
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
    const tabsContainer = activeContainer.querySelector('.caderno-tabs-container'); // Pode ser necessário adicionar uma classe
    
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
            loadView('vade-mecum', false);
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
            
        } else {
            showInfoModal("Atenção", "Este caderno não tem questões. Adicione algumas antes de estudar.");
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
    if (!currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para criar cadernos."); return; }
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
    if (!currentUser) { showInfoModal("Acesso Negado", "Por favor, faça login para criar pastas."); return; }
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
    // ... (Mantida com ajustes para elementos globais)
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
        
        fetchAllQuestions().then(() => {
            // Após carregar tudo, carrega a view inicial (Início)
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
        // Carrega a view inicial (Início) para usuários não logados
        loadView('inicio');

        // Limpa estados e elementos globais
        allQuestions = [];
        filteredQuestions = [];
        userFolders = [];
        userCadernos = [];
        userReviewItems = [];
        userAnswers.clear();
        userCadernoState.clear();
        userReviewItemsMap.clear();
        // Os modais de filtro/caderno e a home view lidam com o estado deslogado na função loadView/updateDynamicElements
    }
});

// Inicialização dos listeners modais que estão sempre no DOM
closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));
// ... (Outros listeners de modais e eventos de toggle mantidos)

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
