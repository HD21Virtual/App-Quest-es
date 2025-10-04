import { 
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
    increment,
    writeBatch,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../config/firebase.js';
import { getState, setState } from './state.js';
import { renderFoldersAndCadernos, updateFolderSelect } from '../modules/cadernos.js';
import { updateReviewCard } from '../modules/srs.js';
import { updateStatsPageUI } from '../modules/stats.js';
import { displayQuestion } from '../modules/questions.js';
import { updateSavedFiltersList } from '../modules/filters.js';

// Variáveis para guardar as funções de cancelamento dos listeners
let unsubscribers = [];

/**
 * Busca todas as questões do banco de dados e popula as opções de filtro.
 */
export async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        const allQuestions = [];
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

        const materiaOptions = [];
        const allAssuntosSet = new Set();
        for (const [materia, assuntosSet] of materiaMap.entries()) {
            const assuntos = Array.from(assuntosSet).sort();
            materiaOptions.push({ name: materia, assuntos: assuntos });
            assuntos.forEach(assunto => allAssuntosSet.add(assunto));
        }
        materiaOptions.sort((a, b) => a.name.localeCompare(b.name));
        
        setState({
            allQuestions,
            filterOptions: {
                materia: materiaOptions,
                allAssuntos: Array.from(allAssuntosSet).sort()
            }
        });
    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}

/**
 * Configura um listener genérico do Firestore.
 * @param {string} collectionPath - O caminho para a coleção.
 * @param {function} callback - A função a ser executada quando os dados mudam.
 * @param {object} order - Opcional. Campo e direção para ordenação.
 */
function setupListener(collectionPath, callback, order = null) {
    let q = query(collection(db, collectionPath));
    if (order) {
        q = query(collection(db, collectionPath), orderBy(order.field, order.direction || 'asc'));
    }
    const unsubscribe = onSnapshot(q, callback);
    unsubscribers.push(unsubscribe);
}

/**
 * Configura todos os listeners do Firestore para um usuário logado.
 * @param {string} userId - O ID do usuário.
 */
export function setupAllFirestoreListeners(userId) {
    // Listener para Pastas
    setupListener(`users/${userId}/folders`, (snapshot) => {
        const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setState({ userFolders: folders });
        updateFolderSelect(folders);
        renderFoldersAndCadernos();
    }, { field: 'name' });

    // Listener para Cadernos
    setupListener(`users/${userId}/cadernos`, (snapshot) => {
        const cadernos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setState({ userCadernos: cadernos });
        renderFoldersAndCadernos();
    }, { field: 'name' });

    // Listener para Filtros Salvos
    setupListener(`users/${userId}/filtros`, (snapshot) => {
        const savedFilters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateSavedFiltersList(savedFilters);
    });
    
    // Listener para Sessões de Estudo
    setupListener(`users/${userId}/sessions`, (snapshot) => {
        const sessions = snapshot.docs.map(doc => doc.data());
        setState({ historicalSessions: sessions });
        updateStatsPageUI();
    }, { field: 'createdAt', direction: 'desc' });
    
    // Listener para Itens de Revisão (SRS)
    setupListener(`users/${userId}/reviewItems`, (snapshot) => {
        const { userReviewItemsMap } = getState();
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                userReviewItemsMap.delete(change.doc.id);
            }
        });
        setState({ userReviewItemsMap });
        updateReviewCard();
    });

    // Listener para Respostas de Questões
    setupListener(`users/${userId}/userQuestionState`, (snapshot) => {
        const { userAnswers } = getState();
        snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            if (change.type === "added" || change.type === "modified") {
                userAnswers.set(change.doc.id, { userAnswer: docData.userAnswer, isCorrect: docData.isCorrect });
            }
            if (change.type === "removed") {
                userAnswers.delete(change.doc.id);
            }
        });
        setState({ userAnswers });
        displayQuestion(); // Re-renderiza a questão para refletir o estado salvo
    });

    // Listener para Estado do Caderno (última questão vista)
    setupListener(`users/${userId}/cadernoState`, (snapshot) => {
        const { userCadernoState } = getState();
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                userCadernoState.set(change.doc.id, change.doc.data());
            }
            if (change.type === "removed") {
                userCadernoState.delete(change.doc.id);
            }
        });
        setState({ userCadernoState });
    });
}

/**
 * Remove todos os listeners ativos do Firestore.
 */
export function cleanupAllFirestoreListeners() {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
}

// --- Funções de Escrita ---

export async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    const { currentUser } = getState();
    if (!currentUser) return;
    const answerRef = doc(db, 'users', currentUser.uid, 'userQuestionState', questionId);
    await setDoc(answerRef, { userAnswer, isCorrect });
}

export async function updateQuestionHistory(questionId, isCorrect) {
    const { currentUser } = getState();
    if (!currentUser) return;
    const historyRef = doc(db, 'users', currentUser.uid, 'questionHistory', questionId);
    const fieldToUpdate = isCorrect ? 'correct' : 'incorrect';
    await setDoc(historyRef, {
        [fieldToUpdate]: increment(1),
        total: increment(1)
    }, { merge: true });
}

export async function saveSessionStats() {
    const { currentUser, sessionStats } = getState();
    if (!currentUser || sessionStats.length === 0) return;
    
    const total = sessionStats.length;
    const correct = sessionStats.filter(s => s.isCorrect).length;
    
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
        incorrectCount: total - correct,
        accuracy: total > 0 ? (correct / total * 100) : 0,
        details: statsByMateria
    };

    await addDoc(collection(db, 'users', currentUser.uid, 'sessions'), sessionData);
}

export async function saveCadernoState(cadernoId, questionIndex) {
    const { currentUser } = getState();
    if (!currentUser || !cadernoId) return;
    const stateRef = doc(db, 'users', currentUser.uid, 'cadernoState', cadernoId);
    await setDoc(stateRef, { lastQuestionIndex: questionIndex });
}

