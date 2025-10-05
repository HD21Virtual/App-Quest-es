import { getState, setState } from '../services/state.js';
import { applyFilters, saveCurrentFilter, loadSavedFilter, deleteSavedFilter, clearAllFilters } from './filters.js';
import { displayQuestion, checkAnswer, handleOptionSelect, handleDiscardOption } from './questions.js';
import { renderFoldersAndCadernos, handleCadernosViewClick } from './cadernos.js';
import { renderMateriasView, handleMateriaClick, handleAssuntoClick, handleBackToMaterias } from './materias.js';
import { handleSrsFeedback } from './srs.js';
import { logout, registerWithEmail, signInWithEmail, signInWithGoogle } from '../services/auth.js';
import { saveCadernoState } from '../services/firestore.js';
import { db } from '../config/firebase.js';
import { doc, addDoc, updateDoc, deleteDoc, collection, writeBatch, getDocs, arrayUnion } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { generateStatsForQuestions, updateStatsPageUI, updateStatsPanel } from './stats.js';

// Mapeamento de todos os elementos da UI para fácil acesso.
export const elements = {
    // Views
    inicioView: document.getElementById('inicio-view'),
    vadeMecumView: document.getElementById('vade-mecum-view'),
    cadernosView: document.getElementById('cadernos-view'),
    materiasView: document.getElementById('materias-view'),
    revisaoView: document.getElementById('revisao-view'),
    estatisticasView: document.getElementById('estatisticas-view'),
    
    // Filtros
    filterBtn: document.getElementById('filter-btn'),
    materiaFilter: document.getElementById('materia-filter'),
    assuntoFilter: document.getElementById('assunto-filter'),
    tipoFilterGroup: document.getElementById('tipo-filter-group'),
    searchInput: document.getElementById('search-input'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    selectedFiltersContainer: document.getElementById('selected-filters-container'),
    filterCard: document.getElementById('filter-card'),
    toggleFiltersBtn: document.getElementById('toggle-filters-btn'),

    // Navegação e Conteúdo Principal
    mainNav: document.getElementById('main-nav'),
    mobileMenu: document.getElementById('mobile-menu'),
    vadeMecumContentArea: document.getElementById('vade-mecum-content-area'),
    
    // Cadernos
    savedCadernosListContainer: document.getElementById('saved-cadernos-list-container'),
    cadernosViewTitle: document.getElementById('cadernos-view-title'),
    backToFoldersBtn: document.getElementById('back-to-folders-btn'),
    createFolderBtn: document.getElementById('create-folder-btn'),
    addCadernoToFolderBtn: document.getElementById('add-caderno-to-folder-btn'),
    addQuestionsToCadernoBtn: document.getElementById('add-questions-to-caderno-btn'),
    addQuestionsBanner: document.getElementById('add-questions-banner'),
    addQuestionsBannerText: document.getElementById('add-questions-banner-text'),
    cancelAddQuestionsBtn: document.getElementById('cancel-add-questions-btn'),

    // Matérias
    materiasViewTitle: document.getElementById('materias-view-title'),
    materiasListContainer: document.getElementById('materias-list-container'),
    assuntosListContainer: document.getElementById('assuntos-list-container'),
    backToMateriasBtn: document.getElementById('back-to-materias-btn'),

    // Revisão
    reviewCard: document.getElementById('review-card'),
    
    // Modais
    authModal: document.getElementById('auth-modal'),
    emailInput: document.getElementById('email-input'),
    passwordInput: document.getElementById('password-input'),
    authError: document.getElementById('auth-error'),
    saveModal: document.getElementById('save-modal'),
    filterNameInput: document.getElementById('filter-name-input'),
    loadModal: document.getElementById('load-modal'),
    searchSavedFiltersInput: document.getElementById('search-saved-filters-input'),
    savedFiltersListContainer: document.getElementById('saved-filters-list-container'),
    cadernoModal: document.getElementById('caderno-modal'),
    cadernoNameInput: document.getElementById('caderno-name-input'),
    folderSelect: document.getElementById('folder-select'),
    nameModal: document.getElementById('name-modal'),
    nameInput: document.getElementById('name-input'),
    nameModalTitle: document.getElementById('name-modal-title'),
    confirmationModal: document.getElementById('confirmation-modal'),
    confirmationModalTitle: document.getElementById('confirmation-modal-title'),
    confirmationModalText: document.getElementById('confirmation-modal-text'),
    statsModal: document.getElementById('stats-modal'),
    statsModalTitle: document.getElementById('stats-modal-title'),
    statsModalContent: document.getElementById('stats-modal-content'),
};

let createCadernoWithFilteredQuestions = false;
let deletingId = null;
let deletingType = null;

/**
 * Configura todos os event listeners da aplicação.
 */
export function setupEventListeners() {
    // Navegação principal
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            navigateToView(link.dataset.view, event.isTrusted);
        });
    });

    // Filtros
    elements.filterBtn.addEventListener('click', handleFilterButtonClick);
    elements.clearFiltersBtn.addEventListener('click', clearAllFilters);
    elements.searchInput.addEventListener('input', () => {
        if (getState().isAddingQuestionsMode.active) applyFilters();
    });
    elements.selectedFiltersContainer.addEventListener('click', handleRemoveFilterTag);
    elements.toggleFiltersBtn.addEventListener('click', toggleFilterCard);
    
    // Salvar/Carregar Filtros
    document.getElementById('save-filter-btn').addEventListener('click', () => {
        if(getState().currentUser) elements.saveModal.classList.remove('hidden');
        else alert('Faça login para salvar filtros.');
    });
    document.getElementById('confirm-save-btn').addEventListener('click', saveCurrentFilter);
    document.getElementById('saved-filters-list-btn').addEventListener('click', () => {
        if(getState().currentUser) elements.loadModal.classList.remove('hidden');
        else alert('Faça login para carregar filtros.');
    });
    elements.savedFiltersListContainer.addEventListener('click', (e) => {
        const loadBtn = e.target.closest('.load-filter-btn');
        if (loadBtn) loadSavedFilter(loadBtn.dataset.id);
        const deleteBtn = e.target.closest('.delete-filter-btn');
        if (deleteBtn) deleteSavedFilter(deleteBtn.dataset.id);
    });
    elements.searchSavedFiltersInput.addEventListener('input', () => import('../services/firestore.js').then(m => m.setupAllFirestoreListeners(getState().currentUser.uid))); // Re-filtra a lista

    // Navegação de questões
    document.addEventListener('click', handleQuestionNavigation);

    // Delegação de eventos para elementos dinâmicos
    document.addEventListener('click', handleDynamicClicks);

    // Modais
    setupModalCloseListeners();

    // Autenticação
    document.getElementById('register-btn').addEventListener('click', () => handleAuthAction(registerWithEmail));
    document.getElementById('login-btn').addEventListener('click', () => handleAuthAction(signInWithEmail));
    document.getElementById('google-login-btn').addEventListener('click', () => handleAuthAction(signInWithGoogle));

    // Cadernos e Pastas
    elements.savedCadernosListContainer.addEventListener('click', handleCadernosViewClick);
    elements.backToFoldersBtn.addEventListener('click', handleBackToFolders);
    elements.addQuestionsToCadernoBtn.addEventListener('click', startAddQuestionsMode);
    elements.cancelAddQuestionsBtn.addEventListener('click', exitAddQuestionsModeAndGoToCadernos);
    elements.createFolderBtn.addEventListener('click', () => showNameModal('folder'));
    document.getElementById('create-caderno-btn').addEventListener('click', () => showCadernoModal(true));
    elements.addCadernoToFolderBtn.addEventListener('click', () => showCadernoModal(false));
    document.getElementById('confirm-caderno-btn').addEventListener('click', handleConfirmCaderno);
    document.getElementById('confirm-name-btn').addEventListener('click', handleConfirmName);
    document.getElementById('confirm-delete-btn').addEventListener('click', handleConfirmDelete);
    
    // Matérias
    elements.materiasListContainer.addEventListener('click', handleMateriaClick);
    elements.assuntosListContainer.addEventListener('click', handleAssuntoClick);
    elements.backToMateriasBtn.addEventListener('click', handleBackToMaterias);

    // Resetar progresso
    document.getElementById('reset-all-progress-btn').addEventListener('click', () => {
        showConfirmationModal('all-progress', null, 'Resetar Todo o Progresso', 'Tem certeza que deseja apagar TODO o seu histórico? Esta ação é irreversível.');
    });

    // Menu mobile
    document.getElementById('hamburger-btn').addEventListener('click', () => elements.mobileMenu.classList.toggle('hidden'));
}

/**
 * Navega para uma view específica, escondendo as outras.
 * @param {string} viewId - O ID da view a ser mostrada.
 * @param {boolean} isUserClick - Se a navegação foi iniciada por um clique do usuário.
 */
export function navigateToView(viewId, isUserClick = false) {
    if (getState().isAddingQuestionsMode.active && (viewId !== 'vade-mecum-view' || isUserClick)) {
        exitAddQuestionsMode();
    }
    
    if (viewId === 'cadernos-view' && !getState().isNavigatingBackFromAddMode) {
        setState({ currentFolderId: null, currentCadernoId: null });
    }
    if (getState().isNavigatingBackFromAddMode) {
        setState({ isNavigatingBackFromAddMode: false });
    }

    Object.values(elements).forEach(el => {
        if (el && el.id && el.id.endsWith('-view')) {
            el.classList.add('hidden');
        }
    });
    document.getElementById(viewId)?.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('text-blue-700', 'bg-blue-100');
        navLink.classList.add('text-gray-500', 'hover:bg-gray-100');
        if (navLink.dataset.view === viewId) {
            navLink.classList.add('text-blue-700', 'bg-blue-100');
            navLink.classList.remove('text-gray-500', 'hover:bg-gray-100');
        }
    });

    // Lógica específica da view
    if (viewId === 'vade-mecum-view' && !getState().isAddingQuestionsMode.active) {
        setState({ isReviewSession: false });
        elements.vadeMecumView.querySelector('#vade-mecum-title').textContent = "Vade Mecum de Questões";
        elements.toggleFiltersBtn.classList.remove('hidden');
        elements.filterCard.classList.remove('hidden');
        applyFilters(); 
    } else if (viewId === 'cadernos-view') {
        renderFoldersAndCadernos();
    } else if (viewId === 'materias-view') {
        renderMateriasView();
    } else if (viewId === 'estatisticas-view'){
        updateStatsPageUI();
    }

    elements.mobileMenu.classList.add('hidden');
}


/**
 * Atualiza a interface do usuário com base no estado de login.
 * @param {object|null} user - O objeto de usuário do Firebase ou nulo.
 */
export function updateUserUI(user) {
    const container = document.getElementById('user-account-container');
    const mobileContainer = document.getElementById('user-account-container-mobile');
    if (!container || !mobileContainer) return;

    if (user) {
        const html = `<div class="flex items-center"><span class="text-gray-600 text-sm mr-4">${user.email}</span><button id="logout-btn" class="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm">Sair</button></div>`;
        container.innerHTML = html;
        mobileContainer.innerHTML = html.replace('logout-btn', 'logout-btn-mobile');
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('logout-btn-mobile').addEventListener('click', logout);
    } else {
        const html = `<button id="show-login-modal-btn" class="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm">Minha Conta</button>`;
        container.innerHTML = html;
        mobileContainer.innerHTML = html;
        container.querySelector('#show-login-modal-btn').addEventListener('click', () => elements.authModal.classList.remove('hidden'));
        mobileContainer.querySelector('#show-login-modal-btn').addEventListener('click', () => elements.authModal.classList.remove('hidden'));
    }
}

/**
 * Limpa elementos da UI que são específicos de um usuário logado.
 */
export function clearUserSpecificUI() {
    elements.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus cadernos.</p>';
    elements.savedFiltersListContainer.innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus filtros.</p>';
    document.getElementById('stats-main-content').innerHTML = '<p class="text-center text-gray-500">Faça login para ver suas estatísticas.</p>';
    elements.reviewCard.classList.add('hidden');
}

/**
 * Atualiza os controles de navegação de questões.
 */
export async function updateNavigation() {
    const { filteredQuestions, currentQuestionIndex, currentCadernoId, sessionStats } = getState();
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : elements.vadeMecumContentArea;
    
    const navigationControls = activeContainer.querySelector('#navigation-controls');
    const questionCounterTop = activeContainer.querySelector('#question-counter-top');
    const prevBtn = activeContainer.querySelector('#prev-question-btn');
    const nextBtn = activeContainer.querySelector('#next-question-btn');

    if (!navigationControls || !questionCounterTop || !prevBtn || !nextBtn) return;

    if (filteredQuestions.length > 0) {
        navigationControls.classList.remove('hidden');
        questionCounterTop.classList.remove('hidden');
        
        let statsHtml = '';
        if (!currentCadernoId) {
             const answeredCount = sessionStats.length;
             if (answeredCount > 0) {
                const correctCount = sessionStats.filter(s => s.isCorrect).length;
                statsHtml = `<span class="text-sm text-gray-500 ml-2">(${answeredCount} Resolvidas, ${correctCount} Acertos)</span>`;
             }
        }
        questionCounterTop.innerHTML = `Questão ${currentQuestionIndex + 1} de ${filteredQuestions.length} ${statsHtml}`;
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex >= filteredQuestions.length - 1;
    } else {
        navigationControls.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
        const questionsContainer = activeContainer.querySelector('#questions-container');
        if (questionsContainer) {
            questionsContainer.innerHTML = `<div class="text-center p-6"><h3 class="text-xl">Nenhuma questão encontrada</h3><p class="text-gray-600 mt-2">Altere os filtros ou adicione questões ao caderno.</p></div>`;
        }
    }
}


// --- Funções de Manipulação de Eventos ---

async function handleFilterButtonClick() {
    const { isAddingQuestionsMode, currentUser, filteredQuestions } = getState();
    if (isAddingQuestionsMode.active) {
        if (!currentUser || !isAddingQuestionsMode.cadernoId) return;
        const { userCadernos } = getState();
        const caderno = userCadernos.find(c => c.id === isAddingQuestionsMode.cadernoId);
        const existingIds = caderno ? caderno.questionIds : [];
        const newQuestionIds = filteredQuestions.filter(q => !existingIds.includes(q.id)).map(q => q.id);

        if (newQuestionIds.length > 0) {
            const cadernoRef = doc(db, 'users', currentUser.uid, 'cadernos', isAddingQuestionsMode.cadernoId);
            await updateDoc(cadernoRef, { questionIds: arrayUnion(...newQuestionIds) });
        }
        exitAddQuestionsModeAndGoToCadernos(isAddingQuestionsMode.cadernoId);
    } else {
        applyFilters();
    }
}

function handleRemoveFilterTag(event) {
    const removeBtn = event.target.closest('.remove-filter-btn');
    if (!removeBtn) return;
    const { filterType, filterValue } = removeBtn.dataset;
    if (filterType === 'materia' || filterType === 'assunto') {
        const container = document.getElementById(`${filterType}-filter`);
        const checkbox = container.querySelector(`.custom-select-option[data-value="${filterValue}"]`);
        if (checkbox) {
            checkbox.checked = false;
            container.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
        }
    } else if (filterType === 'tipo') {
        elements.tipoFilterGroup.querySelector('.active-filter')?.classList.remove('active-filter');
        elements.tipoFilterGroup.querySelector(`[data-value="todos"]`)?.classList.add('active-filter');
    } else if (filterType === 'search') {
        elements.searchInput.value = '';
    }
    if (getState().isAddingQuestionsMode.active) applyFilters();
}

async function handleQuestionNavigation(event) {
    const { currentQuestionIndex, filteredQuestions, currentCadernoId } = getState();
    if (event.target.closest('#prev-question-btn')) {
        if (currentQuestionIndex > 0) {
            const newIndex = currentQuestionIndex - 1;
            setState({ currentQuestionIndex: newIndex });
            if (currentCadernoId) saveCadernoState(currentCadernoId, newIndex);
            await displayQuestion();
        }
    }
    if (event.target.closest('#next-question-btn')) {
        if (currentQuestionIndex < filteredQuestions.length - 1) {
            const newIndex = currentQuestionIndex + 1;
            setState({ currentQuestionIndex: newIndex });
            if (currentCadernoId) saveCadernoState(currentCadernoId, newIndex);
            await displayQuestion();
        }
    }
}

function handleDynamicClicks(event) {
    const target = event.target;
    // Questões
    const optionItem = target.closest('.option-item');
    if (optionItem) handleOptionSelect(event);
    const discardBtn = target.closest('.discard-btn');
    if (discardBtn) handleDiscardOption(event);
    if (target.closest('#submit-btn')) checkAnswer();
    const srsBtn = target.closest('.srs-feedback-btn');
    if (srsBtn) handleSrsFeedback(event);
    if (target.id === 'login-from-empty') elements.authModal.classList.remove('hidden');

    // Abas de conteúdo
    const tabButton = target.closest('.tab-button');
    if (tabButton) {
        // CORREÇÃO: Encontra o container pai correto que engloba as abas e o conteúdo.
        const container = tabButton.closest('#tabs-and-main-content');
        if (container) {
            container.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            tabButton.classList.add('active');
            
            const isQuestionTab = tabButton.dataset.tab === 'question';
            const questionView = container.querySelector('#question-view');
            const statsView = container.querySelector('#stats-view');
            
            if (questionView) questionView.classList.toggle('hidden', !isQuestionTab);
            if (statsView) statsView.classList.toggle('hidden', isQuestionTab);

            if (isQuestionTab) {
                displayQuestion();
            } else {
                const statsContainer = container.querySelector('#stats-content');
                if (statsContainer) {
                    statsContainer.innerHTML = `<div class="text-center p-8">Carregando...</div>`;
                    const { currentCadernoId, userCadernos } = getState();
                    if (currentCadernoId) {
                        const caderno = userCadernos.find(c => c.id === currentCadernoId);
                        if (caderno) {
                            generateStatsForQuestions(caderno.questionIds).then(stats => {
                                updateStatsPanel(statsContainer, stats);
                            });
                        }
                    } else {
                        // Mostra estatísticas da sessão atual para o Vade Mecum
                        updateStatsPanel(statsContainer);
                    }
                }
            }
        }
    }

    // Expandir/colapsar
    const expandBtn = target.closest('.expand-btn');
    if (expandBtn) {
        document.getElementById(expandBtn.dataset.target)?.classList.toggle('hidden');
        expandBtn.querySelector('i')?.classList.toggle('fa-plus-circle');
        expandBtn.querySelector('i')?.classList.toggle('fa-minus-circle');
    }
}

async function handleAuthAction(authFn) {
    elements.authError.classList.add('hidden');
    try {
        await authFn();
        elements.authModal.classList.add('hidden');
    } catch (error) {
        elements.authError.textContent = error.message;
        elements.authError.classList.remove('hidden');
    }
}

async function handleConfirmCaderno() {
    const { currentUser, filteredQuestions } = getState();
    const name = elements.cadernoNameInput.value.trim();
    if (!name || !currentUser) return;
    const caderno = {
        name: name,
        questionIds: createCadernoWithFilteredQuestions ? filteredQuestions.map(q => q.id) : [],
        folderId: elements.folderSelect.value || null,
        createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'users', currentUser.uid, 'cadernos'), caderno);
    elements.cadernoModal.classList.add('hidden');
}

async function handleConfirmName() {
    const { currentUser, editingId, editingType } = getState();
    const name = elements.nameInput.value.trim();
    if (!name || !currentUser || !editingType) return;
    const collectionPath = editingType === 'folder' ? 'folders' : 'cadernos';
    if (editingId) {
        await updateDoc(doc(db, 'users', currentUser.uid, collectionPath, editingId), { name });
    } else if (editingType === 'folder') {
        await addDoc(collection(db, 'users', currentUser.uid, 'folders'), { name, createdAt: serverTimestamp() });
    }
    elements.nameModal.classList.add('hidden');
}

async function handleConfirmDelete() {
    const { currentUser, userCadernos } = getState();
    if (!currentUser || !deletingType) return;
    
    if (deletingType === 'folder') {
        const batch = writeBatch(db);
        const cadernosToDelete = userCadernos.filter(c => c.folderId === deletingId);
        cadernosToDelete.forEach(c => batch.delete(doc(db, 'users', currentUser.uid, 'cadernos', c.id)));
        batch.delete(doc(db, 'users', currentUser.uid, 'folders', deletingId));
        await batch.commit();
    } else if (deletingType === 'caderno') {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'cadernos', deletingId));
    } else if (deletingType === 'all-progress') {
        // ... lógica de reset
    }
    elements.confirmationModal.classList.add('hidden');
}


// --- Funções Auxiliares da UI ---

function setupModalCloseListeners() {
    const modals = [
        { modal: elements.authModal, closeBtn: 'close-auth-modal' },
        { modal: elements.saveModal, closeBtn: 'close-save-modal', cancelBtn: 'cancel-save-btn' },
        { modal: elements.loadModal, closeBtn: 'close-load-modal' },
        { modal: elements.cadernoModal, closeBtn: 'close-caderno-modal', cancelBtn: 'cancel-caderno-btn' },
        { modal: elements.nameModal, closeBtn: 'close-name-modal', cancelBtn: 'cancel-name-btn' },
        { modal: elements.confirmationModal, closeBtn: 'cancel-confirmation-btn' },
        { modal: elements.statsModal, closeBtn: 'close-stats-modal' }
    ];
    modals.forEach(({ modal, closeBtn, cancelBtn }) => {
        if (modal) {
            if (closeBtn) document.getElementById(closeBtn)?.addEventListener('click', () => modal.classList.add('hidden'));
            if (cancelBtn) document.getElementById(cancelBtn)?.addEventListener('click', () => modal.classList.add('hidden'));
        }
    });
}

function toggleFilterCard() {
    elements.filterCard.classList.toggle('hidden');
    elements.toggleFiltersBtn.innerHTML = elements.filterCard.classList.contains('hidden')
        ? `<i class="fas fa-eye mr-2"></i> Mostrar Filtros`
        : `<i class="fas fa-eye-slash mr-2"></i> Ocultar Filtros`;
}

function handleBackToFolders() {
    const { currentCadernoId, currentFolderId } = getState();
    if (currentCadernoId) {
        setState({ currentCadernoId: null });
    } else if (currentFolderId) {
        setState({ currentFolderId: null });
    }
    renderFoldersAndCadernos();
}

function startAddQuestionsMode() {
    const { userCadernos, currentCadernoId } = getState();
    const caderno = userCadernos.find(c => c.id === currentCadernoId);
    if (!caderno) return;
    
    setState({ isAddingQuestionsMode: { active: true, cadernoId: currentCadernoId } });
    elements.addQuestionsBanner.classList.remove('hidden');
    elements.addQuestionsBannerText.textContent = `Selecione questões para adicionar a "${caderno.name}".`;
    navigateToView('vade-mecum-view');
}

function exitAddQuestionsMode() {
    setState({ isAddingQuestionsMode: { active: false, cadernoId: null } });
    elements.addQuestionsBanner.classList.add('hidden');
    elements.filterBtn.textContent = 'Filtrar questões';
    elements.filterBtn.disabled = false;
    elements.vadeMecumContentArea.querySelector('#tabs-and-main-content').classList.remove('hidden');
}

function exitAddQuestionsModeAndGoToCadernos(cadernoId) {
    exitAddQuestionsMode();
    setState({ isNavigatingBackFromAddMode: true, currentCadernoId: cadernoId, currentFolderId: null });
    navigateToView('cadernos-view');
}

export function showNameModal(type, id = null, name = '') {
    setState({ editingType: type, editingId: id });
    elements.nameInput.value = name;
    elements.nameModalTitle.textContent = id ? `Editar ${type === 'folder' ? 'Pasta' : 'Caderno'}` : `Criar Nova ${type === 'folder' ? 'Pasta' : 'Caderno'}`;
    elements.nameModal.classList.remove('hidden');
}

function showCadernoModal(fromFilters) {
    createCadernoWithFilteredQuestions = fromFilters;
    elements.cadernoNameInput.value = '';
    elements.folderSelect.value = fromFilters ? '' : getState().currentFolderId;
    elements.folderSelect.disabled = !fromFilters;
    elements.cadernoModal.classList.remove('hidden');
}

export function showConfirmationModal(type, id, title, text) {
    deletingType = type;
    deletingId = id;
    elements.confirmationModalTitle.textContent = title;
    elements.confirmationModalText.innerHTML = text;
    elements.confirmationModal.classList.remove('hidden');
}

export async function showItemStats(itemType, questionIds, itemName) {
    elements.statsModalTitle.textContent = `Estatísticas de "${itemName}"`;
    elements.statsModalContent.innerHTML = `<div class="text-center p-8">Carregando...</div>`;
    elements.statsModal.classList.remove('hidden');

    if (questionIds.length === 0) {
        elements.statsModalContent.innerHTML = `<div class="text-center p-8">Nenhuma questão para gerar estatísticas.</div>`;
        return;
    }

    const { totalCorrect, totalIncorrect } = await generateStatsForQuestions(questionIds);
    const totalAttempts = totalCorrect + totalIncorrect;
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts * 100) : 0;
    
    elements.statsModalContent.innerHTML = `
        <p>Aproveitamento: <strong>${accuracy.toFixed(0)}%</strong></p>
        <p>Total de Respostas: ${totalAttempts} (${totalCorrect} acertos, ${totalIncorrect} erros)</p>
    `;
}

