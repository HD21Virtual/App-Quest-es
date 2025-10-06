import { collection, getDocs, query, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, orderBy, arrayUnion, arrayRemove, where, increment, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state, addUnsubscribe } from '../state.js';
import { renderFoldersAndCadernos } from '../features/caderno.js';
import { updateStatsPageUI } from '../features/stats.js';
import { updateReviewCard } from '../features/srs.js';
import { displayQuestion } from "../features/question-viewer.js";
import DOM from '../dom-elements.js';

// --- FUNÇÕES DE LEITURA (FETCH & LISTENERS) ---

export async function getWeeklySolvedQuestionsData() {
    const weeklyCounts = Array(7).fill(0);
    if (!state.currentUser) return weeklyCounts;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    try {
        const sessionsCollection = collection(db, 'users', state.currentUser.uid, 'sessions');
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
            
            const index = 6 - dayDiff;

            if (index >= 0 && index < 7) {
                weeklyCounts[index] += session.totalQuestions || 0;
            }
        });

    } catch (error) {
        console.error("Erro ao buscar dados de atividades da semana:", error);
    }
    
    return weeklyCounts;
}


export async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        state.allQuestions = [];
        const materiaMap = new Map();

        querySnapshot.forEach((doc) => {
            const question = { id: doc.id, ...doc.data() };
            state.allQuestions.push(question);

            if (question.materia && question.assunto) {
                if (!materiaMap.has(question.materia)) {
                    materiaMap.set(question.materia, new Set());
                }
                materiaMap.get(question.materia).add(question.assunto);
            }
        });

        state.filterOptions.materia = [];
        const allAssuntosSet = new Set();
        for (const [materia, assuntosSet] of materiaMap.entries()) {
            const assuntos = Array.from(assuntosSet).sort();
            state.filterOptions.materia.push({ name: materia, assuntos: assuntos });
            assuntos.forEach(assunto => allAssuntosSet.add(assunto));
        }
        state.filterOptions.materia.sort((a, b) => a.name.localeCompare(b.name));
        state.filterOptions.allAssuntos = Array.from(allAssuntosSet).sort();

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}

export function setupCadernosAndFoldersListener(userId) {
    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), orderBy('name'));
    const unsubCadernos = onSnapshot(cadernosQuery, (snapshot) => {
        state.userCadernos = [];
        snapshot.forEach(doc => state.userCadernos.push({ id: doc.id, ...doc.data() }));
        renderFoldersAndCadernos();
    });
    addUnsubscribe('unsubCadernos', unsubCadernos);

    const foldersQuery = query(collection(db, 'users', userId, 'folders'), orderBy('name'));
    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        state.userFolders = [];
        const folderOptions = ['<option value="">Salvar em (opcional)</option>'];
        snapshot.forEach(doc => {
            const folder = { id: doc.id, ...doc.data() };
            state.userFolders.push(folder);
            folderOptions.push(`<option value="${folder.id}">${folder.name}</option>`);
        });
        if(DOM.folderSelect) DOM.folderSelect.innerHTML = folderOptions.join('');
        renderFoldersAndCadernos();
    });
    addUnsubscribe('unsubFolders', unsubFolders);
}

export function setupFiltrosListener(userId) {
    const filtrosCollection = collection(db, 'users', userId, 'filtros');
    const unsubFiltros = onSnapshot(filtrosCollection, (snapshot) => {
        const savedFilters = [];
        snapshot.forEach(doc => savedFilters.push({ id: doc.id, ...doc.data() }));
        
        const searchTerm = DOM.searchSavedFiltersInput.value.toLowerCase();
        const filtered = savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));

        if (filtered.length === 0) {
            DOM.savedFiltersListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`;
        } else {
            DOM.savedFiltersListContainer.innerHTML = filtered.map(f => `
                <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                    <button class="load-filter-btn text-left" data-id="${f.id}">${f.name}</button>
                    <button class="delete-filter-btn text-red-500 hover:text-red-700" data-id="${f.id}">
                        <i class="fas fa-trash-alt pointer-events-none"></i>
                    </button>
                </div>
            `).join('');
        }
    });
    addUnsubscribe('unsubFiltros', unsubFiltros);
}

export function setupStatsListener(userId) {
    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc'));
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
        state.historicalSessions = [];
        snapshot.forEach(doc => state.historicalSessions.push(doc.data()));
        updateStatsPageUI();
    });
    addUnsubscribe('unsubSessions', unsubSessions);
}

export function setupReviewListener(userId) {
    const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'));
    const unsubReviewItems = onSnapshot(reviewQuery, (snapshot) => {
         snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                state.userReviewItemsMap.delete(change.doc.id);
            }
        });
        updateReviewCard();
    });
    addUnsubscribe('unsubReviewItems', unsubReviewItems);
}

export function setupUserAnswersListener(userId) {
    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'));
    const unsubAnswers = onSnapshot(answersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            if (change.type === "added" || change.type === "modified") {
                state.userAnswers.set(change.doc.id, { userAnswer: docData.userAnswer, isCorrect: docData.isCorrect });
            }
            if (change.type === "removed") {
                state.userAnswers.delete(change.doc.id);
            }
        });
        if (DOM.vadeMecumView.classList.contains('hidden') === false || (DOM.cadernosView.classList.contains('hidden') === false && state.currentCadernoId)) {
             displayQuestion();
        }
    });
    addUnsubscribe('unsubAnswers', unsubAnswers);
}

export function setupCadernoStateListener(userId) {
    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'));
    const unsubCadernoState = onSnapshot(stateQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userCadernoState.set(change.doc.id, change.doc.data());
            }
            if (change.type === "removed") {
                state.userCadernoState.delete(change.doc.id);
            }
        });
    });
    addUnsubscribe('unsubCadernoState', unsubCadernoState);
}

// --- FUNÇÕES DE ESCRITA (CREATE, UPDATE, DELETE) ---

export async function saveFilter() {
    const name = DOM.filterNameInput.value.trim();
    if (!name || !state.currentUser) return;
    
    const currentFilters = {
        name: name,
        materias: JSON.parse(DOM.materiaFilter.dataset.value || '[]'),
        assuntos: JSON.parse(DOM.assuntoFilter.dataset.value || '[]'),
        tipo: DOM.tipoFilterGroup.querySelector('.active-filter')?.dataset.value || 'todos',
        search: DOM.searchInput.value
    };
    
    const filtrosCollection = collection(db, 'users', state.currentUser.uid, 'filtros');
    await addDoc(filtrosCollection, currentFilters);
    DOM.filterNameInput.value = '';
}

export async function deleteFilter(filterId) {
    if (!state.currentUser || !filterId) return;
    await deleteDoc(doc(db, 'users', state.currentUser.uid, 'filtros', filterId));
}

export async function loadFilter(filterId) {
    if (!state.currentUser || !filterId) return;
    const filterDoc = await getDoc(doc(db, 'users', state.currentUser.uid, 'filtros', filterId));

    if (filterDoc.exists()) {
        const filterToLoad = filterDoc.data();
        DOM.searchInput.value = filterToLoad.search;
        DOM.tipoFilterGroup.querySelector('.active-filter').classList.remove('active-filter');
        DOM.tipoFilterGroup.querySelector(`[data-value="${filterToLoad.tipo}"]`).classList.add('active-filter');
        
        const materiaContainer = DOM.materiaFilter;
        materiaContainer.querySelectorAll('.custom-select-option').forEach(cb => {
            cb.checked = filterToLoad.materias.includes(cb.dataset.value);
        });
        materiaContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
        
        setTimeout(() => {
           const assuntoContainer = DOM.assuntoFilter;
           assuntoContainer.querySelectorAll('.custom-select-option').forEach(cb => {
                cb.checked = filterToLoad.assuntos.includes(cb.dataset.value);
           });
           assuntoContainer.querySelector('.custom-select-options').dispatchEvent(new Event('change', { bubbles: true }));
           // applyFilters(); // This should be handled in the event listener after the modal closes
        }, 50);
    }
}

export async function createCaderno() {
    const name = DOM.cadernoNameInput.value.trim();
    if (!name || !state.currentUser) return;

    const questionIds = state.createCadernoWithFilteredQuestions ? state.filteredQuestions.map(q => q.id) : [];
    
    const caderno = {
        name: name,
        questionIds: questionIds,
        folderId: DOM.folderSelect.value || null,
        createdAt: serverTimestamp()
    };

    const cadernosCollection = collection(db, 'users', state.currentUser.uid, 'cadernos');
    await addDoc(cadernosCollection, caderno);
}

export async function createOrUpdateName() {
    const name = DOM.nameInput.value.trim();
    if (!name || !state.currentUser || !state.editingType) return;
    
    if (state.editingId) { // Editando
        const collectionPath = state.editingType === 'folder' ? 'folders' : 'cadernos';
        const itemRef = doc(db, 'users', state.currentUser.uid, collectionPath, state.editingId);
        await updateDoc(itemRef, { name: name });
    } else { // Criando (apenas pastas)
        if (state.editingType === 'folder') {
            const folderData = { name: name, createdAt: serverTimestamp() };
            const foldersCollection = collection(db, 'users', state.currentUser.uid, 'folders');
            await addDoc(foldersCollection, folderData);
        }
    }
}

export async function deleteItem() {
    if (!state.currentUser || !state.deletingType) return;

    if (state.deletingType === 'folder') {
        const cadernosToDelete = state.userCadernos.filter(c => c.folderId === state.deletingId);
        const deletePromises = cadernosToDelete.map(c => deleteDoc(doc(db, 'users', state.currentUser.uid, 'cadernos', c.id)));
        await Promise.all(deletePromises);
        const folderRef = doc(db, 'users', state.currentUser.uid, 'folders', state.deletingId);
        await deleteDoc(folderRef);
    } else if (state.deletingType === 'caderno') {
        const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', state.deletingId);
        await deleteDoc(cadernoRef);
    }
}

export async function resetAllUserData() {
    if (!state.currentUser) return;
    const collectionsToDelete = ['questionHistory', 'reviewItems', 'userQuestionState', 'cadernoState', 'sessions'];

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, 'users', state.currentUser.uid, collectionName);
        const snapshot = await getDocs(collectionRef);
        if (snapshot.empty) continue;

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }

    // Reset local state
    state.userAnswers.clear();
    state.userReviewItemsMap.clear();
    state.userCadernoState.clear();
    state.historicalSessions = [];
    state.sessionStats = [];
}

export async function saveSessionStats() {
    if (!state.currentUser || state.sessionStats.length === 0) return;
    
    const total = state.sessionStats.length;
    const correct = state.sessionStats.filter(s => s.isCorrect).length;
    const accuracy = total > 0 ? (correct / total * 100) : 0; 
    
    const statsByMateria = state.sessionStats.reduce((acc, stat) => {
        if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
        acc[stat.materia].total++;
        if (stat.isCorrect) acc[stat.materia].correct++;
        return acc;
    }, {});

    const sessionData = {
        createdAt: serverTimestamp(),
        totalQuestions: total,
        correctCount: correct,
        accuracy: accuracy,
        details: statsByMateria
    };

    const sessionsCollection = collection(db, 'users', state.currentUser.uid, 'sessions');
    await addDoc(sessionsCollection, sessionData);
}

export async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    if (!state.currentUser) return;
    const answerRef = doc(db, 'users', state.currentUser.uid, 'userQuestionState', questionId);
    try {
        await setDoc(answerRef, { userAnswer, isCorrect });
    } catch (error) {
        console.error("Error saving user answer:", error);
    }
}

export async function updateQuestionHistory(questionId, isCorrect) {
    if (!state.currentUser) return;
    const historyRef = doc(db, 'users', state.currentUser.uid, 'questionHistory', questionId);
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

export async function saveCadernoState(cadernoId, questionIndex) {
    if (!state.currentUser || !cadernoId) return;
    const stateRef = doc(db, 'users', state.currentUser.uid, 'cadernoState', cadernoId);
    try {
        await setDoc(stateRef, { lastQuestionIndex: questionIndex });
    } catch (error) {
        console.error("Error saving caderno state:", error);
    }
}

export async function setSrsReviewItem(questionId, reviewData) {
    if (!state.currentUser) return;
    const reviewRef = doc(db, 'users', state.currentUser.uid, 'reviewItems', questionId);
    await setDoc(reviewRef, reviewData, { merge: true });
}


