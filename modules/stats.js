import { getState, setState } from '../services/state.js';
import { doc, getDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../config/firebase.js';

let performanceChart = null;
let homePerformanceChart = null;
let weeklyChartInstance = null;

/**
 * Atualiza o painel de estatísticas na aba "Questões".
 * @param {HTMLElement} container - O elemento onde o painel será renderizado.
 * @param {object} data - Dados pré-calculados (opcional).
 */
export function updateStatsPanel(container = null, data = null) {
    const { sessionStats, currentCadernoId } = getState();
    const activeContainer = currentCadernoId ? document.getElementById('saved-cadernos-list-container') : document.getElementById('vade-mecum-content-area');
    const statsContainer = container || activeContainer.querySelector('#stats-content');
    
    if (!statsContainer) return;

    let correctCount, incorrectCount, statsByMateria;
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

    if (answeredCount === 0) {
        statsContainer.innerHTML = `<div class="text-center text-gray-500 py-10">${data ? 'Nenhum histórico.' : 'Responda a uma questão para ver as estatísticas.'}</div>`;
        return;
    }

    statsContainer.innerHTML = getStatsPanelHTML(statsByMateria);
    renderPerformanceChart(statsContainer, correctCount, incorrectCount);
}

/**
 * Atualiza a UI da página de estatísticas geral.
 */
export async function updateStatsPageUI() {
    const { historicalSessions, sessionStats } = getState();
    const statsMainContent = document.getElementById('stats-main-content');
    
    const combinedSessions = [...historicalSessions];
    if (sessionStats.length > 0) {
        const correct = sessionStats.filter(s => s.isCorrect).length;
        const currentSessionData = {
            totalQuestions: sessionStats.length,
            correctCount: correct,
            accuracy: sessionStats.length > 0 ? (correct / sessionStats.length * 100) : 0,
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
    
    if (combinedSessions.length === 0) {
        if(statsMainContent) statsMainContent.innerHTML = '<p class="text-center text-gray-500">Ainda não há dados de sessões.</p>';
        return;
    }

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

    // Atualiza cards da página inicial
    updateHomeStatsCards(totalQuestions, totalCorrect);
    // Renderiza gráficos da página inicial
    renderHomeCharts(materiaTotals);
    // Atualiza conteúdo da página de estatísticas
    updateStatsPageContent(materiaTotals, combinedSessions);
}

/**
 * Calcula estatísticas históricas para um conjunto de IDs de questões.
 * @param {string[]} questionIds - IDs das questões.
 * @returns {object} Objeto com estatísticas.
 */
export async function generateStatsForQuestions(questionIds) {
    const { currentUser, allQuestions } = getState();
    if (!currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }

    let totalCorrect = 0, totalIncorrect = 0;
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

// --- Funções Auxiliares de Renderização ---

function getStatsPanelHTML(statsByMateria) {
    let materiaStatsHtml = Object.keys(statsByMateria).map((materia, index) => {
        const disciplinaStats = statsByMateria[materia];
        const disciplinaAccuracy = (disciplinaStats.total > 0 ? (disciplinaStats.correct / disciplinaStats.total * 100) : 0).toFixed(0);
        const targetId = `assuntos-${materia.replace(/\s+/g, '-')}-${index}`;
        let assuntosHtml = Object.keys(disciplinaStats.assuntos).map(assunto => {
             const assuntoStats = disciplinaStats.assuntos[assunto];
             const assuntoAccuracy = (assuntoStats.total > 0 ? (assuntoStats.correct / assuntoStats.total * 100) : 0).toFixed(0);
             return `
                <div class="flex justify-between items-center text-gray-600 text-sm">
                    <span>${assunto}</span>
                    <span class="font-semibold">${assuntoStats.correct} / ${assuntoStats.total} (${assuntoAccuracy}%)</span>
                </div>`;
        }).join('');

        return `
            <div>
                <div class="flex justify-between items-center text-gray-800 cursor-pointer expand-btn" data-target="${targetId}">
                     <div class="flex items-center"><i class="fas fa-plus-circle text-gray-800 mr-2"></i><span>${materia}</span></div>
                    <span class="font-semibold">${disciplinaStats.correct} / ${disciplinaStats.total} (${disciplinaAccuracy}%)</span>
                </div>
                <div id="${targetId}" class="pl-6 mt-2 space-y-2 border-l-2 border-gray-200 hidden">${assuntosHtml}</div>
            </div>`;
    }).join('');

    return `
         <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="relative w-full max-w-xs mx-auto"><canvas id="performanceChart"></canvas></div>
            <div>
                <h4 class="text-xl font-bold text-gray-800 mb-3">Desempenho por Disciplina</h4>
                <div class="space-y-4">${materiaStatsHtml}</div>
            </div>
         </div>`;
}

function renderPerformanceChart(container, correct, incorrect) {
    if (performanceChart) performanceChart.destroy();
    const canvas = container.querySelector('#performanceChart');
    if (canvas) {
        performanceChart = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Acertos', 'Erros'],
                datasets: [{ data: [correct, incorrect], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 2 }]
            },
            options: { responsive: true, cutout: '70%', plugins: { legend: { display: true } } }
        });
    }
}

function updateHomeStatsCards(totalQuestions, totalCorrect) {
    const totalIncorrect = totalQuestions - totalCorrect;
    const geralAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;
    
    document.getElementById('stats-total-questions').textContent = totalQuestions;
    document.getElementById('stats-total-correct').textContent = totalCorrect;
    document.getElementById('stats-total-incorrect').textContent = totalIncorrect;
    document.getElementById('stats-geral-accuracy').textContent = `${geralAccuracy}%`;
}

async function renderHomeCharts(materiaTotals) {
    const homeChartCanvas = document.getElementById('homePerformanceChart');
    if (homeChartCanvas) {
        if (homePerformanceChart) homePerformanceChart.destroy();
        const sortedMaterias = Object.keys(materiaTotals).sort((a, b) => materiaTotals[b].total - materiaTotals[a].total);
        homePerformanceChart = new Chart(homeChartCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedMaterias,
                datasets: [
                    { label: 'Acertos', data: sortedMaterias.map(m => materiaTotals[m].correct), backgroundColor: '#22c55e' },
                    { label: 'Erros', data: sortedMaterias.map(m => materiaTotals[m].total - materiaTotals[m].correct), backgroundColor: '#ef4444' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { 
                    title: { display: true, text: 'Desempenho Geral por Disciplina' },
                    datalabels: {
                        display: false // Desativando os datalabels neste gráfico
                    }
                },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
            }
        });
    }
    
    const weeklyChartCanvas = document.getElementById('weeklyPerformanceChart');
    if (weeklyChartCanvas) {
        if (weeklyChartInstance) weeklyChartInstance.destroy();
        const weeklyData = await getWeeklySolvedQuestionsData();
        weeklyChartInstance = new Chart(weeklyChartCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: getLast7DaysLabels(),
                datasets: [{ label: 'Questões Resolvidas', data: weeklyData, borderColor: '#3b82f6', tension: 0.3, fill: false }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    title: { display: true, text: 'Atividade na Última Semana' },
                    datalabels: {
                         display: true,
                         align: 'top',
                         color: '#3b82f6',
                         font: {
                            weight: 'bold'
                         }
                    }
                } 
            }
        });
    }
}

function updateStatsPageContent(materiaTotals, combinedSessions) {
    const byMateriaContainer = document.getElementById('stats-by-materia-container');
    if (byMateriaContainer) {
        byMateriaContainer.innerHTML = Object.keys(materiaTotals).sort().map(materia => {
            const data = materiaTotals[materia];
            const acc = data.total > 0 ? ((data.correct / data.total) * 100).toFixed(0) : 0;
            return `
                <div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="font-medium text-gray-800">${materia}</span>
                        <span class="font-semibold ${acc >= 60 ? 'text-green-600' : 'text-red-600'}">${acc}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div class="bg-${acc >= 60 ? 'green' : 'red'}-500 h-2 rounded-full" style="width: ${acc}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 text-right mt-1">${data.correct} / ${data.total} acertos</p>
                </div>`;
        }).join('');
    }

    const historyContainer = document.getElementById('stats-session-history-container');
    if (historyContainer) {
        historyContainer.innerHTML = combinedSessions.sort((a,b) => b.createdAt.toDate() - a.createdAt.toDate())
        .map(session => {
            const date = session.createdAt.toDate().toLocaleString('pt-BR');
            const isCurrent = !session.id; // Simple check if it's the live session data
            return `
                <div class="p-3 border-b border-gray-200 ${isCurrent ? 'bg-blue-50' : ''}">
                    <div class="flex justify-between items-center">
                        <p class="font-medium text-gray-800">${isCurrent ? 'Sessão Atual' : date}</p>
                        <span class="text-sm font-semibold ${session.accuracy >= 60 ? 'text-green-600' : 'text-red-600'}">${session.accuracy.toFixed(0)}% de acerto</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">${session.correctCount} acertos de ${session.totalQuestions} questões</p>
                </div>`;
        }).join('');
    }
}

async function getWeeklySolvedQuestionsData() {
    const { currentUser } = getState();
    const weeklyCounts = Array(7).fill(0);
    if (!currentUser) return weeklyCounts;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const q = query(collection(db, 'users', currentUser.uid, 'sessions'), where("createdAt", ">=", sevenDaysAgo));
    const querySnapshot = await getDocs(q);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    querySnapshot.forEach(doc => {
        const sessionDate = doc.data().createdAt.toDate();
        sessionDate.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((today.getTime() - sessionDate.getTime()) / 86400000);
        const index = 6 - dayDiff;
        if (index >= 0 && index < 7) {
            weeklyCounts[index] += doc.data().totalQuestions || 0;
        }
    });
    return weeklyCounts;
}

function getLast7DaysLabels() {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return labels;
}
