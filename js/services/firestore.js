import { db } from '../firebase-config.js';
import { 
    collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, 
    serverTimestamp, orderBy, arrayUnion, arrayRemove, increment, writeBatch, 
    query, where, addDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, addUnsubscribe, resetStateOnLogout } from '../state.js';
import DOM from '../dom-elements.js';
import { closeCadernoModal, closeNameModal, closeSaveModal, closeConfirmationModal } from '../ui/modal.js';
import { applyFilters, clearAllFilters } from '../features/filter.js';
import { updateStatsPageUI } from '../features/stats.js';
import { updateReviewCard } from '../features/srs.js';
import { renderFoldersAndCadernos } from '../features/caderno.js';

/**
 * @file js/services/firestore.js
 * @description Lida com todas as interações com o Firestore.
 */


// --- Funções de Leitura (Read) ---

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


// --- Funções de Escrita (Write) ---

export async function createCaderno() {
    const name = DOM.cadernoNameInput.value.trim();
    if (!name || !state.currentUser) return;

    const questionIds = state.createCadernoWithFilteredQuestions ? state.filteredQuestions.map(q => q.id) : [];
    
    const cadernoData = {
        name: name,
        questionIds: questionIds,
        folderId: DOM.folderSelect.value || null,
        createdAt: serverTimestamp()
    };

    try {
        const cadernosCollection = collection(db, 'users', state.currentUser.uid, 'cadernos');
        await addDoc(cadernosCollection, cadernoData);
        closeCadernoModal();
    } catch (error) {
        console.error("Erro ao criar caderno:", error);
    }
}

export async function createOrUpdateName() {
    const name = DOM.nameInput.value.trim();
    if (!name || !state.currentUser || !state.editingType) return;
    
    try {
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
        closeNameModal();
    } catch (error) {
        console.error(`Erro ao salvar ${state.editingType}:`, error);
    }
}

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
    
    try {
        const filtrosCollection = collection(db, 'users', state.currentUser.uid, 'filtros');
        await addDoc(filtrosCollection, currentFilters);
        closeSaveModal();
    } catch(error) {
        console.error("Erro ao salvar filtro:", error);
    }
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

export async function saveSessionStats() {
    if (!state.currentUser || state.sessionStats.length === 0) return;
    
    const total = state.sessionStats.length;
    const correct = state.sessionStats.filter(s => s.isCorrect).length;
    
    const sessionData = {
        createdAt: serverTimestamp(),
        totalQuestions: total,
        correctCount: correct,
        incorrectCount: total - correct,
        accuracy: total > 0 ? (correct / total * 100) : 0,
        details: state.sessionStats.reduce((acc, stat) => {
            if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
            acc[stat.materia].total++;
            if (stat.isCorrect) acc[stat.materia].correct++;
            return acc;
        }, {})
    };

    try {
        const sessionsCollection = collection(db, 'users', state.currentUser.uid, 'sessions');
        await addDoc(sessionsCollection, sessionData);
    } catch (error) {
        console.error("Erro ao salvar a sessão:", error);
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
    try {
        await setDoc(reviewRef, reviewData, { merge: true });
    } catch (error) {
        console.error("Erro ao atualizar item de revisão:", error);
    }
}

// --- Funções de Atualização (Update) ---

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

export async function loadFilter(filterId) {
    if (!state.currentUser) return;
    try {
        const filterRef = doc(db, 'users', state.currentUser.uid, 'filtros', filterId);
        const filterSnap = await getDoc(filterRef);

        if (filterSnap.exists()) {
            const filterToLoad = filterSnap.data();
            clearAllFilters();

            DOM.searchInput.value = filterToLoad.search;
            const activeTipo = DOM.tipoFilterGroup.querySelector('.active-filter');
            if(activeTipo) activeTipo.classList.remove('active-filter');
            const newTipo = DOM.tipoFilterGroup.querySelector(`[data-value="${filterToLoad.tipo}"]`);
            if(newTipo) newTipo.classList.add('active-filter');
            
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
               applyFilters();
            }, 50);
        }
    } catch (error) {
        console.error("Erro ao carregar filtro:", error);
    }
}


// --- Funções de Exclusão (Delete) ---

export async function deleteFilter(filterId) {
    if (!state.currentUser) return;
    try {
        await deleteDoc(doc(db, 'users', state.currentUser.uid, 'filtros', filterId));
    } catch (error) {
        console.error("Erro ao deletar filtro:", error);
    }
}

export async function deleteItem() {
    if (!state.currentUser || !state.deletingType) return;

    try {
        if (state.deletingType === 'folder') {
            const cadernosToDelete = state.userCadernos.filter(c => c.folderId === state.deletingId);
            const batch = writeBatch(db);
            cadernosToDelete.forEach(caderno => {
                const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', caderno.id);
                batch.delete(cadernoRef);
            });
            const folderRef = doc(db, 'users', state.currentUser.uid, 'folders', state.deletingId);
            batch.delete(folderRef);
            await batch.commit();

        } else if (state.deletingType === 'caderno') {
            const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', state.deletingId);
            await deleteDoc(cadernoRef);
        }
        closeConfirmationModal();
    } catch (error) {
        console.error(`Erro ao excluir ${state.deletingType}:`, error);
    }
}

export async function resetAllUserData() {
    if (!state.currentUser) return;
    try {
        const collectionsToDelete = ['questionHistory', 'reviewItems', 'userQuestionState', 'cadernoState', 'sessions'];
        for (const collectionName of collectionsToDelete) {
            const collectionRef = collection(db, 'users', state.currentUser.uid, collectionName);
            const snapshot = await getDocs(collectionRef);
            if (snapshot.empty) continue;

            const batch = writeBatch(db);
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
        resetStateOnLogout();
        closeConfirmationModal();
        updateStatsPageUI();
        updateReviewCard();
        if(state.currentCadernoId) renderFoldersAndCadernos();

    } catch (error) {
        console.error("Erro ao resetar dados do usuário:", error);
    }
}

// --- Listeners (Real-time Updates) ---

export function setupFirestoreListeners(userId) {
    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), orderBy('name'));
    addUnsubscribe(onSnapshot(cadernosQuery, (snapshot) => {
        state.userCadernos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFoldersAndCadernos();
    }));

    const foldersQuery = query(collection(db, 'users', userId, 'folders'), orderBy('name'));
    addUnsubscribe(onSnapshot(foldersQuery, (snapshot) => {
        state.userFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const folderOptions = ['<option value="">Salvar em (opcional)</option>', ...state.userFolders.map(f => `<option value="${f.id}">${f.name}</option>`)];
        DOM.folderSelect.innerHTML = folderOptions.join('');
        renderFoldersAndCadernos();
    }));
    
    const filtrosQuery = query(collection(db, 'users', userId, 'filtros'));
    addUnsubscribe(onSnapshot(filtrosQuery, (snapshot) => {
        const savedFilters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const searchTerm = DOM.searchSavedFiltersInput.value.toLowerCase();
        const filtered = savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));
        DOM.savedFiltersListContainer.innerHTML = filtered.length === 0
            ? `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`
            : filtered.map(f => `
                <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                    <button class="load-filter-btn text-left" data-id="${f.id}">${f.name}</button>
                    <button class="delete-filter-btn text-red-500 hover:text-red-700" data-id="${f.id}"><i class="fas fa-trash-alt pointer-events-none"></i></button>
                </div>`).join('');
    }));

    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc'));
    addUnsubscribe(onSnapshot(sessionsQuery, (snapshot) => {
        state.historicalSessions = snapshot.docs.map(doc => doc.data());
        updateStatsPageUI();
    }));

    const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'));
    addUnsubscribe(onSnapshot(reviewQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                state.userReviewItemsMap.delete(change.doc.id);
            }
        });
        updateReviewCard();
    }));
    
    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'));
    addUnsubscribe(onSnapshot(answersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            if (change.type === "added" || change.type === "modified") {
                state.userAnswers.set(change.doc.id, { userAnswer: docData.userAnswer, isCorrect: docData.isCorrect });
            }
            if (change.type === "removed") {
                state.userAnswers.delete(change.doc.id);
            }
        });
    }));

    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'));
    addUnsubscribe(onSnapshot(stateQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userCadernoState.set(change.doc.id, change.doc.data());
            }
            if (change.type === "removed") {
                state.userCadernoState.delete(change.doc.id);
            }
        });
    }));
}

