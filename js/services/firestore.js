import { 
    collection, getDocs, query, addDoc, doc, getDoc, setDoc,
    updateDoc, deleteDoc, onSnapshot, serverTimestamp, orderBy,
    arrayUnion, arrayRemove, Timestamp, increment, writeBatch, where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state } from '../state.js';
import { renderFoldersAndCadernos } from '../features/caderno.js';
import { updateStatsPageUI } from "../features/stats.js";
import { updateReviewCard } from "../features/srs.js";
import { displayQuestion } from "../features/question-viewer.js";
import { renderMateriasView } from "../features/materias.js";

/**
 * @file js/services/firestore.js
 * @description Módulo para todas as interações com o Firestore (leitura, escrita, listeners).
 */

let unsubs = []; // Array para armazenar as funções de unsubscribe dos listeners

// --- FUNÇÕES DE LEITURA (FETCH) ---

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
        
        renderMateriasView();

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}

// --- FUNÇÕES DE SETUP DE LISTENERS ---

function setupCadernosAndFoldersListener(userId) {
    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), orderBy('name'));
    const unsubCadernos = onSnapshot(cadernosQuery, (snapshot) => {
        state.userCadernos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFoldersAndCadernos();
    });

    const foldersQuery = query(collection(db, 'users', userId, 'folders'), orderBy('name'));
    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        const folderOptions = ['<option value="">Salvar em (opcional)</option>'];
        state.userFolders = snapshot.docs.map(doc => {
            const folder = { id: doc.id, ...doc.data() };
            folderOptions.push(`<option value="${folder.id}">${folder.name}</option>`);
            return folder;
        });
        document.getElementById('folder-select').innerHTML = folderOptions.join('');
        renderFoldersAndCadernos();
    });

    unsubs.push(unsubCadernos, unsubFolders);
}

function setupStatsListener(userId) {
    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc'));
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
        state.historicalSessions = snapshot.docs.map(doc => doc.data());
        updateStatsPageUI();
    });
    unsubs.push(unsubSessions);
}

function setupReviewListener(userId) {
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
    unsubs.push(unsubReviewItems);
}

function setupUserAnswersListener(userId) {
    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'));
    const unsubAnswers = onSnapshot(answersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (["added", "modified"].includes(change.type)) {
                state.userAnswers.set(change.doc.id, change.doc.data());
            } else if (change.type === "removed") {
                state.userAnswers.delete(change.doc.id);
            }
        });
        const currentView = document.querySelector('div[id$="-view"]:not(.hidden)');
        if (currentView && (currentView.id === 'vade-mecum-view' || (currentView.id === 'cadernos-view' && state.currentCadernoId))) {
             displayQuestion();
        }
    });
    unsubs.push(unsubAnswers);
}

function setupCadernoStateListener(userId) {
    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'));
    const unsubCadernoState = onSnapshot(stateQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (["added", "modified"].includes(change.type)) {
                state.userCadernoState.set(change.doc.id, change.doc.data());
            } else if (change.type === "removed") {
                state.userCadernoState.delete(change.doc.id);
            }
        });
    });
    unsubs.push(unsubCadernoState);
}

export function setupFiltrosListener(userId) {
    const filtrosQuery = query(collection(db, 'users', userId, 'filtros'));
    const unsubFiltros = onSnapshot(filtrosQuery, (snapshot) => {
        const savedFilters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Lógica de renderização movida para o modal para simplificar
    });
    unsubs.push(unsubFiltros);
}


/** Inicia todos os listeners de dados do usuário */
export function setupAllListeners(userId) {
    setupCadernosAndFoldersListener(userId);
    setupStatsListener(userId);
    setupReviewListener(userId);
    setupUserAnswersListener(userId);
    setupCadernoStateListener(userId);
    setupFiltrosListener(userId);
}

/** Para todos os listeners ativos */
export function clearAllListeners() {
    unsubs.forEach(unsub => unsub());
    unsubs = [];
}


// --- FUNÇÕES DE ESCRITA (WRITE) ---

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
        await addDoc(collection(db, 'users', state.currentUser.uid, 'sessions'), sessionData);
        state.sessionStats = []; // Limpa após salvar
    } catch (error) {
        console.error("Erro ao salvar a sessão:", error);
    }
}

export async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    if (!state.currentUser) return;
    const answerRef = doc(db, 'users', state.currentUser.uid, 'userQuestionState', questionId);
    await setDoc(answerRef, { userAnswer, isCorrect });
}

export async function updateQuestionHistory(questionId, isCorrect) {
    if (!state.currentUser) return;
    const historyRef = doc(db, 'users', state.currentUser.uid, 'questionHistory', questionId);
    const fieldToUpdate = isCorrect ? 'correct' : 'incorrect';
    await setDoc(historyRef, { [fieldToUpdate]: increment(1), total: increment(1) }, { merge: true });
}

export async function updateSrsItem(questionId, reviewData) {
    if (!state.currentUser) return;
    const reviewRef = doc(db, 'users', state.currentUser.uid, 'reviewItems', questionId);
    await setDoc(reviewRef, reviewData, { merge: true });
}

export async function saveCadernoState(cadernoId, questionIndex) {
    if (!state.currentUser || !cadernoId) return;
    const stateRef = doc(db, 'users', state.currentUser.uid, 'cadernoState', cadernoId);
    await setDoc(stateRef, { lastQuestionIndex: questionIndex });
}

// --- FUNÇÕES CRUD (Create, Read, Update, Delete) ---

// Create
export async function createItem(type, data) {
    if (!state.currentUser) return;
    const collectionName = type === 'folder' ? 'folders' : 'cadernos';
    await addDoc(collection(db, 'users', state.currentUser.uid, collectionName), data);
}
export async function createFilter(filterData) {
    if (!state.currentUser) return;
    await addDoc(collection(db, 'users', state.currentUser.uid, 'filtros'), filterData);
}

// Update
export async function updateItem(type, id, data) {
    if (!state.currentUser) return;
    const collectionName = type === 'folder' ? 'folders' : 'cadernos';
    await updateDoc(doc(db, 'users', state.currentUser.uid, collectionName, id), data);
}

// Delete
export async function deleteItem(type, id) {
    if (!state.currentUser) return;

    if (type === 'folder') {
        // Deletar cadernos dentro da pasta primeiro
        const cadernosToDelete = state.userCadernos.filter(c => c.folderId === id);
        const deletePromises = cadernosToDelete.map(c => deleteDoc(doc(db, 'users', state.currentUser.uid, 'cadernos', c.id)));
        await Promise.all(deletePromises);
    }

    const collectionName = type === 'folder' ? 'folders' : (type === 'caderno' ? 'cadernos' : 'filtros');
    await deleteDoc(doc(db, 'users', state.currentUser.uid, collectionName, id));
}

export async function resetAllUserData() {
    if (!state.currentUser) return;

    const collectionsToDelete = ['questionHistory', 'reviewItems', 'userQuestionState', 'cadernoState', 'sessions'];

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, 'users', state.currentUser.uid, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (snapshot.empty) continue;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
}
