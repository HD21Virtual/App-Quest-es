import { state, getActiveContainer } from '../state.js';
// ===== INÍCIO DA MODIFICAÇÃO =====
import { renderPerformanceChart, renderWeeklyChart, renderHomePerformanceChart, renderStatsPagePerformanceChart, renderEvolutionChart } from '../ui/charts.js';
// ===== FIM DA MODIFICAÇÃO =====
// ===== INÍCIO DA MODIFICAÇÃO =====
import { getHistoricalCountsForQuestions, fetchPerformanceLog } from '../services/firestore.js';
// ===== FIM DA MODIFICAÇÃO =====
import DOM from '../dom-elements.js';

/**
 * Ordena strings alfanumericamente (ex: "2.10" vem depois de "2.9").
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function naturalSort(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function updateStatsPageUI() {
    let totalQuestions = 0;
    let totalCorrect = 0;
    const materiaTotals = {};

    // 1. Processa as sessões históricas do Firestore
    state.historicalSessions.forEach(session => {
        totalQuestions += session.totalQuestions || 0;
        totalCorrect += session.correctCount || 0;
        for (const materia in session.details) {
            if (!materiaTotals[materia]) materiaTotals[materia] = { correct: 0, total: 0 };
            materiaTotals[materia].correct += session.details[materia].correct || 0;
            materiaTotals[materia].total += session.details[materia].total || 0;
        }
    });

    // 2. Adiciona as estatísticas da sessão atual (não salva) por cima
    state.sessionStats.forEach(stat => {
        totalQuestions += 1;
        if (stat.isCorrect) {
            totalCorrect += 1;
        }
        if (!materiaTotals[stat.materia]) {
            materiaTotals[stat.materia] = { correct: 0, total: 0 };
        }
        materiaTotals[stat.materia].total += 1;
        if (stat.isCorrect) {
            materiaTotals[stat.materia].correct += 1;
        }
    });
    
    // 3. Atualiza os elementos da UI (cards)
    if (DOM.statsTotalQuestionsEl) DOM.statsTotalQuestionsEl.textContent = totalQuestions;
    if (DOM.statsTotalCorrectEl) DOM.statsTotalCorrectEl.textContent = totalCorrect;
    if (DOM.statsTotalIncorrectEl) DOM.statsTotalIncorrectEl.textContent = totalQuestions - totalCorrect;
    const geralAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;
    if (DOM.statsGeralAccuracyEl) DOM.statsGeralAccuracyEl.textContent = `${geralAccuracy}%`;

    // 4. Atualiza os gráficos incondicionalmente
    // As funções de renderização de gráficos têm as suas próprias verificações de existência do canvas.
    renderHomePerformanceChart(materiaTotals);
    renderWeeklyChart();
}

// ===== INÍCIO DA MODIFICAÇÃO: Nova função para popular os filtros =====
/**
 * Popula os filtros de Matéria e Assunto na aba de Estatísticas.
 */
function populateStatsFilters() {
    if (!DOM.statsMateriaFilter || !DOM.statsAssuntoFilter) return;

    // 1. Limpa filtros antigos (exceto a opção "Todos")
    DOM.statsMateriaFilter.innerHTML = '<option value="">Todas</option>';
    DOM.statsAssuntoFilter.innerHTML = '<option value="">Todos</option>';
    DOM.statsAssuntoFilter.disabled = true; // Desabilita assuntos por padrão

    // 2. Popula Matérias
    const materias = state.filterOptions.materia.map(m => m.name).sort(naturalSort);
    materias.forEach(materiaName => {
        const option = document.createElement('option');
        option.value = materiaName;
        option.textContent = materiaName;
        DOM.statsMateriaFilter.appendChild(option);
    });
}

/**
 * Atualiza o filtro de Assunto com base na Matéria selecionada.
 * @param {string} selectedMateria - O nome da matéria selecionada.
 */
export function updateStatsAssuntoFilter(selectedMateria) {
    if (!DOM.statsAssuntoFilter) return;

    DOM.statsAssuntoFilter.innerHTML = '<option value="">Todos</option>';
    
    if (!selectedMateria) {
        DOM.statsAssuntoFilter.disabled = true;
        return;
    }

    const materiaObj = state.filterOptions.materia.find(m => m.name === selectedMateria);
    if (materiaObj && materiaObj.assuntos) {
        // Coleta todos os assuntos, sub-assuntos e sub-sub-assuntos para um Set
        const allAssuntos = new Set();
        materiaObj.assuntos.forEach(assunto => {
            allAssuntos.add(assunto.name);
            if (assunto.subAssuntos) {
                assunto.subAssuntos.forEach(sub => {
                    allAssuntos.add(sub.name);
                    if (sub.subSubAssuntos) {
                        sub.subSubAssuntos.forEach(subSub => allAssuntos.add(subSub));
                    }
                });
            }
        });

        // Ordena e popula o dropdown
        const sortedAssuntos = Array.from(allAssuntos).sort(naturalSort);
        sortedAssuntos.forEach(assuntoName => {
            const option = document.createElement('option');
            option.value = assuntoName;
            option.textContent = assuntoName;
            DOM.statsAssuntoFilter.appendChild(option);
        });
        
        DOM.statsAssuntoFilter.disabled = false;
    } else {
        DOM.statsAssuntoFilter.disabled = true;
    }
}
// ===== FIM DA MODIFICAÇÃO =====

// ===== INÍCIO DA MODIFICAÇÃO: Nova função de filtragem =====
/**
 * Coleta os filtros da UI de Estatísticas e reaplica na view.
 */
export async function handleStatsFilter() {
    if (!state.currentUser) return;

    // 1. Coleta os valores dos filtros
    const periodButton = DOM.statsPeriodoButton;
    const materiaSelect = DOM.statsMateriaFilter;
    const assuntoSelect = DOM.statsAssuntoFilter;

    // ===== INÍCIO DA MODIFICAÇÃO: Normaliza datas =====
    // Garante que 'Tudo' (null) não quebre a lógica de data
    let startDate = periodButton.dataset.startDate ? new Date(periodButton.dataset.startDate + 'T00:00:00') : null;
    let endDate = periodButton.dataset.endDate ? new Date(periodButton.dataset.endDate + 'T23:59:59') : new Date(); // Se 'Tudo', endDate é hoje

    // Se 'Tudo' (startDate nulo), define um padrão (ex: 6 meses atrás) para o gráfico de evolução
    // mas os cards/tabela ainda considerarão 'Tudo'
    let evolutionStartDate = startDate;
    if (!evolutionStartDate) {
        evolutionStartDate = new Date(endDate);
        evolutionStartDate.setMonth(evolutionStartDate.getMonth() - 6);
        evolutionStartDate.setHours(0, 0, 0, 0);
    }
    
    const filters = {
        startDate: startDate, 
        endDate: endDate, 
        // Datas específicas para o gráfico de evolução (para lidar com o 'Tudo')
        evolutionStartDate: evolutionStartDate, 
        evolutionEndDate: endDate,
        
        materia: materiaSelect.value || null,
        assunto: assuntoSelect.value || null,
    };
    // ===== FIM DA MODIFICAÇÃO =====

    // 2. Re-renderiza as seções com os filtros aplicados
    await renderEstatisticasView(filters);
}
// ===== FIM DA MODIFICAÇÃO =====


// ===== INÍCIO DA MODIFICAÇÃO: Atualiza renderEstatisticasView para aceitar filtros e ser async =====
export async function renderEstatisticasView(filters = null) {
// ===== FIM DA MODIFICAÇÃO =====
    if (!state.currentUser) {
        DOM.statsMainContent.innerHTML = '<p class="text-center text-gray-500 p-8">Por favor, faça login para ver suas estatísticas.</p>';
        return;
    }

    // ===== INÍCIO DA MODIFICAÇÃO: Lógica de Filtro Padrão =====
    let appliedFilters = filters;
    if (!appliedFilters) {
        // Popula os filtros da UI se for a carga inicial
        populateStatsFilters(); 
        
        // Define filtros padrão para a carga inicial (Tudo / 6 meses para evolução)
        const endDate = new Date(); // Hoje
        endDate.setHours(23, 59, 59, 999); // Garante que pegue o dia todo de hoje
        
        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);

        appliedFilters = {
            startDate: null, // null = 'Tudo' para cards e tabela
            endDate: new Date(), // Hoje (para os cards e tabela)
            evolutionStartDate: startDate, // 6 meses atrás (para gráfico de evolução)
            evolutionEndDate: new Date(), // Hoje (para gráfico de evolução)
            materia: null,
            assunto: null
        };
    }
    // ===== FIM DA MODIFICAÇÃO =====

    let totalQuestions = 0;
    let totalCorrect = 0;
    const materiasSet = new Set();
    
    // --- Lógica de filtragem de sessão ---
    const questionIdToDetails = new Map();
    state.allQuestions.forEach(q => {
        questionIdToDetails.set(q.id, { 
            materia: q.materia, 
            assunto: q.assunto,
            subAssunto: q.subAssunto,
            subSubAssunto: q.subSubAssunto
        });
    });

    // Helper para checar matéria/assunto de uma sessão
    const sessionMatchesFilter = (session) => {
        if (!appliedFilters || (!appliedFilters.materia && !appliedFilters.assunto)) return true; // Passa se não houver filtro de
        
        for (const materia in session.details) {
            if (appliedFilters.materia && materia !== appliedFilters.materia) {
                continue; // Matéria não bate, pula
            }
            
            // Matéria bateu (ou não há filtro de matéria). Checa assunto.
            if (!appliedFilters.assunto) {
                return true; // Matéria bateu e não há filtro de assunto
            }

            // Precisa checar o assunto. Isso é difícil, pois a sessão só tem 'materia'.
            // A granularidade do filtro de assunto só pode ser aplicada na tabela.
            // Para os cards e gráfico, SÓ PODEMOS FILTRAR POR MATÉRIA.
            // O filtro de assunto só se aplicará à tabela.
            if(appliedFilters.materia) return true;
        }
        return false;
    };

    // Helper para checar matéria/assunto de um stat da sessão ATUAL
     const statMatchesFilter = (stat) => {
        if (!appliedFilters) return true;
        
        const materiaMatch = !appliedFilters.materia || stat.materia === appliedFilters.materia;
        if (!materiaMatch) return false;

        // Se filtrou por matéria e não por assunto, ok
        if (appliedFilters.materia && !appliedFilters.assunto) return true;
        
        // Se não filtrou por matéria nem assunto, ok
        if (!appliedFilters.materia && !appliedFilters.assunto) return true;

        // Se filtrou por assunto, precisamos checar
        if (appliedFilters.assunto) {
             const details = questionIdToDetails.get(stat.questionId);
             if (details) {
                // Checa se o assunto bate em qualquer nível da hierarquia da questão
                return details.assunto === appliedFilters.assunto || 
                       details.subAssunto === appliedFilters.assunto || 
                       details.subSubAssunto === appliedFilters.assunto;
             }
        }
        
        return false; // Assunto não bateu
    };

    // 1. Processa as sessões históricas do Firestore
    state.historicalSessions.forEach(session => {
        const sessionDate = session.createdAt ? session.createdAt.toDate() : null;
        
        // --- FILTRAGEM POR DATA (usando startDate, não evolutionStartDate) ---
        if (appliedFilters && appliedFilters.startDate && sessionDate && sessionDate < appliedFilters.startDate) {
            return;
        }
        if (appliedFilters && appliedFilters.endDate && sessionDate && sessionDate > appliedFilters.endDate) {
            return;
        }
        // --- FILTRAGEM POR MATÉRIA ---
        // (O filtro de assunto não pode ser aplicado aqui de forma granular)
        if (appliedFilters && appliedFilters.materia && !sessionMatchesFilter(session)) {
             return;
        }
        
        // Se passou pelos filtros, processa
        let sessionTotal = 0;
        let sessionCorrect = 0;

        if (appliedFilters && appliedFilters.materia) {
            // Se há filtro de matéria, soma apenas dessa matéria
            const detail = session.details[appliedFilters.materia];
            if(detail) {
                sessionTotal = detail.total || 0;
                sessionCorrect = detail.correct || 0;
            }
        } else {
            // Sem filtro, soma tudo
            sessionTotal = session.totalQuestions || 0;
            sessionCorrect = session.correctCount || 0;
        }

        totalQuestions += sessionTotal;
        totalCorrect += sessionCorrect;
        
        for (const materia in session.details) {
            if (!appliedFilters || !appliedFilters.materia || materia === appliedFilters.materia) {
                materiasSet.add(materia);
            }
        }
    });

    // 2. Adiciona as estatísticas da sessão atual (não salva)
    state.sessionStats.forEach(stat => {
        // A sessão atual não tem filtro de data, mas tem de matéria/assunto
        if (appliedFilters && !statMatchesFilter(stat)) {
            return;
        }

        totalQuestions += 1;
        if (stat.isCorrect) {
            totalCorrect += 1;
        }
        materiasSet.add(stat.materia);
    });
    // --- Fim da lógica de filtragem ---
    
    const totalIncorrect = totalQuestions - totalCorrect;
    const totalMaterias = materiasSet.size;

    // 3. Atualiza os elementos da UI (cards)
    if (DOM.statsGeralResolvidas) DOM.statsGeralResolvidas.textContent = totalQuestions;
    if (DOM.statsGeralAcertos) DOM.statsGeralAcertos.textContent = totalCorrect;
    if (DOM.statsGeralErros) DOM.statsGeralErros.textContent = totalIncorrect;
    if (DOM.statsGeralMaterias) DOM.statsGeralMaterias.textContent = totalMaterias;
    
    // 4. Renderiza o gráfico de desempenho
    renderStatsPagePerformanceChart(totalCorrect, totalIncorrect);

    // 5. Renderiza a nova tabela de desempenho por matéria
    // ===== INÍCIO DA MODIFICAÇÃO =====
    await renderDesempenhoMateriaTable(appliedFilters);
    // ===== FIM DA MODIFICAÇÃO =====

    // ===== INÍCIO DA MODIFICAÇÃO =====
    // 6. Busca dados para o gráfico de evolução
    // O fetchPerformanceLog usa as datas de EVOLUÇÃO
    // Garante que as datas de evolução sejam válidas
    const evoStartDate = appliedFilters.evolutionStartDate || new Date(new Date().setMonth(new Date().getMonth() - 6));
    const evoEndDate = appliedFilters.evolutionEndDate || new Date();
    
    const performanceLog = await fetchPerformanceLog(evoStartDate, evoEndDate);

    // 7. Filtra o log por matéria/assunto (o fetch só filtra por data)
    const filteredLog = performanceLog.filter(entry => {
        if (appliedFilters.materia && entry.materia !== appliedFilters.materia) {
            return false;
        }
        if (appliedFilters.assunto) {
            const assuntoMatch = entry.assunto === appliedFilters.assunto ||
                                 entry.subAssunto === appliedFilters.assunto ||
                                 entry.subSubAssunto === appliedFilters.assunto;
            if (!assuntoMatch) {
                return false;
            }
        }
        return true;
    });
    
    // 8. Renderiza o gráfico de evolução com os dados filtrados
    renderEvolutionChart(filteredLog, appliedFilters.evolutionStartDate, appliedFilters.evolutionEndDate);
    // ===== FIM DA MODIFICAÇÃO =====
}

export async function updateStatsPanel(container = null) {
    let correctCount, incorrectCount, statsByMateria;
    const activeContainer = getActiveContainer(); // Corrected call
    const statsContainer = container || (activeContainer ? activeContainer.querySelector('#stats-content') : null);
    
    if (!statsContainer) return;

    // ... logic to calculate stats
    
    let materiaStatsHtml = '<div class="space-y-4">';
    // ... logic to build HTML
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

    renderPerformanceChart(correctCount, incorrectCount);
}

export async function generateStatsForQuestions(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const statsByMateria = {};

    const questionDetails = questionIds.map(id => state.allQuestions.find(q => q.id === id)).filter(Boolean);

    // This is a simplified version. In a real app, you'd fetch history.
    // For this example, let's assume we have the history.
    const counts = await getHistoricalCountsForQuestions(questionIds);
    totalCorrect = counts.correct;
    totalIncorrect = counts.incorrect;
    
    // Logic to distribute counts across materias for the statsByMateria object
    questionDetails.forEach(question => {
        // This part needs real history data to be accurate, so it's a simplification.
        if (!statsByMateria[question.materia]) {
            statsByMateria[question.materia] = { correct: 0, total: 0, assuntos: {} };
        }
        // Simplified distribution
        // A more complex logic would be needed here based on actual per-question history
    });


    return { totalCorrect, totalIncorrect, statsByMateria };
}

// --- NOVAS FUNÇÕES PARA A TABELA DE DESEMPENHO ---

// Função Helper para renderizar uma linha da tabela
function renderTreeTableRow(level, name, counts, id, parentId = '', hasChildren = false) {
    const { total, correct, incorrect } = counts;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const errorAccuracy = total > 0 ? (incorrect / total) * 100 : 0;
    
    let rowClass = 'tree-table-row';
    let indentClass = `indent-${level}`;
    let iconHtml = '';
    
    if (level > 1) rowClass += ' hidden-row';
    if (level === 1) rowClass += ' materia-row';
    if (level === 2) rowClass += ' assunto-row';
    if (level === 3) rowClass += ' sub-assunto-row';
    // --- MODIFICAÇÃO: Adicionada classe para nível 4 ---
    if (level === 4) rowClass += ' sub-sub-assunto-row';

    if (hasChildren) {
        iconHtml = `<i class="fas fa-chevron-right toggle-icon"></i>`;
    } else {
        // Adiciona um ícone "vazio" para manter o alinhamento
        iconHtml = `<i class="fas fa-chevron-right toggle-icon no-children"></i>`;
    }

    return `
        <tr class="${rowClass}" data-id="${id}" data-parent-id="${parentId}" data-level="${level}"
            data-total="${total}" data-correct="${correct}" data-incorrect="${incorrect}">
            <!-- Célula Checkbox -->
            <td class="tree-table-cell checkbox-cell">
                <input type="checkbox" class="row-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-id="${id}">
            </td>
            <!-- Célula Nome (Matéria/Assunto/Sub-assunto) -->
            <td class="tree-table-cell text-gray-800 ${indentClass}">
                <div class="flex items-center">
                    ${iconHtml}
                    <span class="font-medium">${name}</span>
                </div>
            </td>
            <!-- Célula Questões Resolvidas -->
            <td class="tree-table-cell text-gray-500 text-center">${total}</td>
            <!-- Célula Desempenho -->
            <td class="tree-table-cell">
                <div class="flex items-center space-x-2">
                    <div class="performance-bar-bg">
                        <div class="performance-bar" style="width: ${accuracy.toFixed(0)}%;"></div>
                    </div>
                    <span class="text-sm font-semibold ${accuracy >= 60 ? 'text-green-600' : 'text-red-600'}">${accuracy.toFixed(0)}%</span>
                    <span class="text-sm text-gray-500">(${correct})</span>
                    <span class="text-sm font-semibold text-red-500 ml-2">${errorAccuracy.toFixed(0)}%</span>
                    <span class="text-sm text-gray-500">(${incorrect})</span>
                </div>
            </td>
        </tr>
    `;
}

// Função Principal para renderizar a tabela completa
// ===== INÍCIO DA MODIFICAÇÃO: Atualiza renderDesempenhoMateriaTable para aceitar filtros e ser async =====
async function renderDesempenhoMateriaTable(filters = null) {
// ===== FIM DA MODIFICAÇÃO =====
    if (!DOM.statsDesempenhoMateriaContainer) return;

    // --- MODIFICAÇÃO: Mapear 'Questões Gerais' para null ---
    // (Este map é usado em ambos os casos, com ou sem filtro de data)
    const questionIdToDetails = new Map();
    state.allQuestions.forEach(q => {
        if(q.materia && q.assunto) {
             questionIdToDetails.set(q.id, { 
                materia: q.materia, 
                assunto: q.assunto, 
                subAssunto: q.subAssunto || null, // Usar null em vez de 'Questões Gerais'
                subSubAssunto: q.subSubAssunto || null // Usar null em vez de 'Questões Gerais'
            });
        }
    });

    // --- MODIFICAÇÃO: Construção da hierarquia de 4 níveis sem 'Questões Gerais' ---
    const hierarchy = new Map();
    const createCounts = () => ({ total: 0, correct: 0, incorrect: 0 });

    // Função auxiliar para incrementar
    const incrementCounts = (node, isCorrect, total = 1) => {
        node.counts.total += total;
        if (isCorrect) {
            node.counts.correct += total;
        } else {
            node.counts.incorrect += total;
        }
    };
    
    // ===== INÍCIO DA MODIFICAÇÃO: Lógica de Fonte de Dados (Data vs. Vitalício) =====

    // CASO 1: Filtro de data está ATIVO. Usar o novo 'performanceLog'.
    if (filters && filters.startDate) {
        const performanceLog = await fetchPerformanceLog(filters.startDate, filters.endDate);

        performanceLog.forEach(entry => {
            // Aplica filtros de matéria/assunto AO MESMO TEMPO
            if (filters.materia && entry.materia !== filters.materia) {
                return; // Pula item, matéria não bate
            }
            if (filters.assunto) {
                const assuntoMatch = entry.assunto === filters.assunto ||
                                     entry.subAssunto === filters.assunto ||
                                     entry.subSubAssunto === filters.assunto;
                if (!assuntoMatch) {
                    return; // Pula item, assunto não bate
                }
            }

            // Destalhes denormalizados do log
            const { materia, assunto, subAssunto, subSubAssunto, isCorrect } = entry;
            
            // Pula se a questão não tiver matéria ou assunto (dados inválidos)
            if (!materia || !assunto) return;
            
            // Nível 1: Matéria
            if (!hierarchy.has(materia)) {
                hierarchy.set(materia, { counts: createCounts(), assuntos: new Map() });
            }
            const materiaNode = hierarchy.get(materia);
            incrementCounts(materiaNode, isCorrect);

            // Nível 2: Assunto
            if (!materiaNode.assuntos.has(assunto)) {
                materiaNode.assuntos.set(assunto, { counts: createCounts(), subAssuntos: new Map() });
            }
            const assuntoNode = materiaNode.assuntos.get(assunto);
            incrementCounts(assuntoNode, isCorrect);

            // Nível 3: SubAssunto (Só processa se subAssunto não for null)
            if (subAssunto) {
                if (!assuntoNode.subAssuntos.has(subAssunto)) {
                    assuntoNode.subAssuntos.set(subAssunto, { counts: createCounts(), subSubAssuntos: new Map() });
                }
                const subAssuntoNode = assuntoNode.subAssuntos.get(subAssunto);
                incrementCounts(subAssuntoNode, isCorrect);

                // Nível 4: SubSubAssunto (Só processa se subSubAssunto não for null)
                if (subSubAssunto) {
                    if (!subAssuntoNode.subSubAssuntos.has(subSubAssunto)) {
                        subAssuntoNode.subSubAssuntos.set(subSubAssunto, { counts: createCounts() });
                    }
                    const subSubAssuntoNode = subAssuntoNode.subSubAssuntos.get(subSubAssunto);
                    incrementCounts(subSubAssuntoNode, isCorrect);
                }
            }
        });

    } else {
        // CASO 2: Filtro de data INATIVO ("Tudo"). Usar 'userQuestionHistoryMap' (vitalício).
        // (Lógica original, mas adaptada para a função incrementCounts)

        state.userQuestionHistoryMap.forEach(item => {
            const details = questionIdToDetails.get(item.id);
            if (!details) return;

            // Aplica filtros de matéria/assunto
            if (filters) {
                if (filters.materia && details.materia !== filters.materia) {
                    return; // Pula item, matéria não bate
                }
                if (filters.assunto) {
                    const assuntoMatch = details.assunto === filters.assunto ||
                                         details.subAssunto === filters.assunto ||
                                         details.subSubAssunto === filters.assunto;
                    if (!assuntoMatch) {
                        return; // Pula item, assunto não bate
                    }
                }
            }

            const { materia, assunto, subAssunto, subSubAssunto } = details;
            const itemCorrect = item.correct || 0;
            const itemIncorrect = item.incorrect || 0;
            const itemTotal = item.total || 0;

            if (itemTotal === 0) return;
            
            // Nível 1: Matéria
            if (!hierarchy.has(materia)) {
                hierarchy.set(materia, { counts: createCounts(), assuntos: new Map() });
            }
            const materiaNode = hierarchy.get(materia);
            // Aqui passamos o total de acertos/erros de uma vez
            materiaNode.counts.total += itemTotal;
            materiaNode.counts.correct += itemCorrect;
            materiaNode.counts.incorrect += itemIncorrect;

            // Nível 2: Assunto
            if (!materiaNode.assuntos.has(assunto)) {
                materiaNode.assuntos.set(assunto, { counts: createCounts(), subAssuntos: new Map() });
            }
            const assuntoNode = materiaNode.assuntos.get(assunto);
            assuntoNode.counts.total += itemTotal;
            assuntoNode.counts.correct += itemCorrect;
            assuntoNode.counts.incorrect += itemIncorrect;

            // Nível 3: SubAssunto (Só processa se subAssunto não for null)
            if (subAssunto) {
                if (!assuntoNode.subAssuntos.has(subAssunto)) {
                    assuntoNode.subAssuntos.set(subAssunto, { counts: createCounts(), subSubAssuntos: new Map() });
                }
                const subAssuntoNode = assuntoNode.subAssuntos.get(subAssunto);
                subAssuntoNode.counts.total += itemTotal;
                subAssuntoNode.counts.correct += itemCorrect;
                subAssuntoNode.counts.incorrect += itemIncorrect;

                // Nível 4: SubSubAssunto (Só processa se subSubAssunto não for null)
                if (subSubAssunto) {
                    if (!subAssuntoNode.subSubAssuntos.has(subSubAssunto)) {
                        subAssuntoNode.subSubAssuntos.set(subSubAssunto, { counts: createCounts() });
                    }
                    const subSubAssuntoNode = subAssuntoNode.subSubAssuntos.get(subSubAssunto);
                    subSubAssuntoNode.counts.total += itemTotal;
                    subSubAssuntoNode.counts.correct += itemCorrect;
                    subSubAssuntoNode.counts.incorrect += itemIncorrect;
                }
            }
        });
    }
    // ===== FIM DA MODIFICAÇÃO DA FONTE DE DADOS =====
    // --- FIM DA MODIFICAÇÃO ---

    if (hierarchy.size === 0) {
        // ===== INÍCIO DA MODIFICAÇÃO: Mensagem de "Nenhum dado" melhorada =====
        let emptyMessage = "Nenhum dado de desempenho encontrado.";
        if (filters && (filters.materia || filters.assunto || filters.startDate)) {
             emptyMessage = "Nenhum dado de desempenho encontrado para os filtros aplicados.";
        } else {
             emptyMessage += " Comece a resolver questões no modo Revisão para ver suas estatísticas detalhadas.";
        }
        
        DOM.statsDesempenhoMateriaContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                ${emptyMessage}
            </div>
        `;
        // ===== FIM DA MODIFICAÇÃO =====
        return;
    }

    // 3. Renderizar o HTML da tabela
    let tableHtml = `
        <style>
            /* --- MODIFICAÇÃO: Adicionada indentação para nível 4 --- */
            .tree-table .indent-1 { padding-left: 1rem; }
            .tree-table .indent-2 { padding-left: 3rem; }
            .tree-table .indent-3 { padding-left: 5rem; }
            .tree-table .indent-4 { padding-left: 7rem; }
        </style>
        <div class="tree-table bg-white rounded-t-lg shadow-md overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-100">
                    <tr class="header-row">
                        <th class="tree-table-cell checkbox-cell">
                            <input type="checkbox" id="select-all-stats-checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        </th>
                        <th class="tree-table-cell text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matéria / Assunto</th>
                        <th class="tree-table-cell text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Questões Resolvidas</th>
                        <th class="tree-table-cell text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desempenho</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
    `;

    // --- MODIFICAÇÃO: Loop de renderização de 4 níveis ---
    const sortedMaterias = Array.from(hierarchy.keys()).sort(naturalSort); // <- MUDANÇA: Ordenação natural
    
    for (const materiaName of sortedMaterias) {
        const materiaNode = hierarchy.get(materiaName);
        const materiaId = `materia-${materiaName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const hasAssuntos = materiaNode.assuntos.size > 0;

        tableHtml += renderTreeTableRow(1, materiaName, materiaNode.counts, materiaId, '', hasAssuntos);

        if (hasAssuntos) {
            const sortedAssuntos = Array.from(materiaNode.assuntos.keys()).sort(naturalSort); // <- MUDANÇA: Ordenação natural
            for (const assuntoName of sortedAssuntos) {
                const assuntoNode = materiaNode.assuntos.get(assuntoName);
                const assuntoId = `assunto-${materiaId}-${assuntoName.replace(/[^a-zA-Z0-9]/g, '-')}`;
                const hasSubAssuntos = assuntoNode.subAssuntos.size > 0;

                tableHtml += renderTreeTableRow(2, assuntoName, assuntoNode.counts, assuntoId, materiaId, hasSubAssuntos);

                if (hasSubAssuntos) {
                    const sortedSubAssuntos = Array.from(assuntoNode.subAssuntos.keys()).sort(naturalSort); // <- MUDANÇA: Ordenação natural
                    for (const subAssuntoName of sortedSubAssuntos) {
                        const subAssuntoNode = assuntoNode.subAssuntos.get(subAssuntoName);
                        const subAssuntoId = `subassunto-${assuntoId}-${subAssuntoName.replace(/[^a-zA-Z0-9]/g, '-')}`;
                        const hasSubSubAssuntos = subAssuntoNode.subSubAssuntos.size > 0;
                        
                        tableHtml += renderTreeTableRow(3, subAssuntoName, subAssuntoNode.counts, subAssuntoId, assuntoId, hasSubSubAssuntos);

                        if (hasSubSubAssuntos) {
                            const sortedSubSubAssuntos = Array.from(subAssuntoNode.subSubAssuntos.keys()).sort(naturalSort); // <- MUDANÇA: Ordenação natural
                            for (const subSubAssuntoName of sortedSubSubAssuntos) {
                                const subSubAssuntoNode = subAssuntoNode.subSubAssuntos.get(subSubAssuntoName);
                                const subSubAssuntoId = `subsubassunto-${subAssuntoId}-${subSubAssuntoName.replace(/[^a-zA-Z0-9]/g, '-')}`;

                                tableHtml += renderTreeTableRow(4, subSubAssuntoName, subSubAssuntoNode.counts, subSubAssuntoId, subAssuntoId, false);
                            }
                        }
                    }
                }
            }
        }
    }
    // --- FIM DA MODIFICAÇÃO ---

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;
    
    // 4. Adicionar o rodapé de seleção
    const footerHtml = `
        <div id="stats-selection-footer" class="flex items-center space-x-6 text-sm font-medium text-gray-700">
            <span>Seleção:</span>
            <span>Resolvidas: <strong id="stats-footer-resolvidas" class="text-gray-900">0</strong></span>
            <span>Acertos: <strong id="stats-footer-acertos" class="text-green-600">0</strong></span>
            <span>Erros: <strong id="stats-footer-erros" class="text-red-600">0</strong></span>
        </div>
    `;

    DOM.statsDesempenhoMateriaContainer.innerHTML = tableHtml + footerHtml;

    // 5. Re-inicializar os elementos DOM do rodapé
    DOM.statsSelectionFooter = document.getElementById('stats-selection-footer');
    DOM.statsFooterResolvidas = document.getElementById('stats-footer-resolvidas');
    DOM.statsFooterAcertos = document.getElementById('stats-footer-acertos');
    DOM.statsFooterErros = document.getElementById('stats-footer-erros');
}
