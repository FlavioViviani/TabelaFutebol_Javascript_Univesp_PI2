const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const partidasDB = ref([]);
        const statsDB = ref([]);
        const jogadorSelecionado = ref('');

        const urlAPI = 'https://bjh0zf3x-3000.brs.devtunnels.ms/api';

        const form=ref({
            id: null,
            data: new Date().toISOString().split('T')[0],
            campeao: 'Azul',
            pontos_azul: 0,
            pontos_vermelho: 0,
            pontos_preto: 0,
            dadosBrutos: '',
            senha: ''
        });

        const tableStates = ref({
            ranking: { sortKey: 'posicao', sortOrder: 'asc', page: 1, limit: 10 },
            histInd: { sortKey: 'partida_id', sortOrder: 'desc', page: 1, limit: 5 },
            entrosamentos: { sortKey: 'titulos_juntos', sortOrder: 'desc', page: 1, limit: 5},
            histGeral: { sortKey: 'id', sortOrder: 'desc', page: 1, limit: 5}
        });

        const carregarDadosDaAPI = async () => {
            try {
                const resPartidas = await fetch(`${urlAPI}/partidas`);
                partidasDB.value = await resPartidas.json();

                const resStats = await fetch(`${urlAPI}/stats`);
                statsDB.value = await resStats.json();
            } catch (erro) {
                console.error('Erro ao conectar na API:', erro);
                alert('Não foi possível conectar ao servidor.');
            }
        };

        onMounted(() => {
            carregarDadosDaAPI();
        });

        const sortData = (data, key, order) => {
            if (!data || !Array.isArray(data)) return[];
            return [...data].sort((a, b) => {
                let valA = a?.[key] ?? '';
                let valB = b?.[key] ?? '';
                if (typeof valA === 'string' || typeof valB === 'string') {
                    return order === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
                }
                if (valA < valB) return order === 'asc' ? -1 : 1;
                if (valA > valB) return order === 'asc' ? 1 : -1;
                return 0;
            });
        };

        const paginate = (data, state) => {
            if (!data || !Array.isArray(data)) return [];
            let start = (state.page -1) * state.limit;
            return data.slice(start, start + state.limit);
        };

        const ordenar = (tabela, chave) => {
            let state = tableStates.value[tabela];
            if (state.sortKey === chave) {
                state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortKey = chave;
                state.sortOrder = 'desc';
            }
            state.page = 1;
        };

        const mudarPagina = (tabela, delta) => { tableStates.value[tabela].page += delta; };

        const rankingDados = computed(() => {
            let ranking = {};
            
            statsDB.value.forEach(stat => {
                if (!stat) return;
                let nome = stat?.jogador || 'Desconhecido';
                if (!ranking[nome]) ranking[nome] = { nome: nome, titulos: 0, gols: 0, assistencias: 0, jogos: 0};
                ranking[nome].gols += Number(stat?.gols) || 0;
                ranking[nome].assistencias += Number(stat?.assistencias) || 0;
                ranking[nome].jogos += 1;
                let partida = partidasDB.value.find(p => p?.id === stat?.partida_id) || {};
                let timeStat = String(stat?.time || '').toLocaleLowerCase();
                let timeCamp = String(partida?.campeao || '').toLocaleLowerCase();

                if (timeCamp && timeCamp === timeStat) ranking[nome].titulos += 1;
            });

            let lista = Object.values(ranking);
            lista.forEach(jog => jog.mpg = parseFloat(((jog.gols + jog.assistencias) / jog.jogos).toFixed(2)));
            
            lista.sort((a, b) => {
                if (b.titulos !== a.titulos) return b.titulos - a.titulos;
                if (a.jogos !== b.jogos) return a.jogos - b.jogos;
                if (b.gols !== a.gols) return b.gols - a.gols;
                return b.assistencias - a.assistencias;
            });

            lista.forEach((item, index) => item.posicao = index + 1);
            return lista;
        });

        const dadosDoJogador = computed(() => {
            if (!jogadorSelecionado.value) return {};
            return rankingDados.value.find(j => j?.nome === jogadorSelecionado.value) || {};
        })

        const histIndDados = computed(() => {
            if (!jogadorSelecionado.value) return [];
            return statsDB.value.filter(s => s?.jogador === jogadorSelecionado.value).map(stat => {
                let partida = partidasDB.value.find(p => p?.id === stat?.partida_id) || {};
                let time = String(stat?.time || '').toLowerCase();
                let campeao = String(partida?.campeao || '').toLowerCase();

                return { ...stat, data_formatada: partida?.data ? String(partida.data).substring(0, 10) : 'Sem data', ganhou: (time && campeao) ? campeao === time: false};
            });
        });

        const entrosamentosDados = computed(() => {
            if (!jogadorSelecionado.value) return [];
            let parceiros = {};
            const jogosDoAtleta = statsDB.value.filter(s => s?.jogador === jogadorSelecionado.value);

            jogosDoAtleta.forEach(jogoAtleta => {
                let partida = partidasDB.value.find(p => p?.id === jogoAtleta?.partida_id) || {};
                let timeAtleta = String(jogoAtleta?.time || '').toLowerCase();
                let campeao = String(partida?.campeao || '').toLowerCase();
                let ganhou = (timeAtleta && campeao) ? campeao === timeAtleta: false;
                let companheiros = statsDB.value.filter(s =>
                    s?.partida_id === jogoAtleta?.partida_id &&
                    String(s?.time || '').toLowerCase() === timeAtleta &&
                    s?.jogador !== jogadorSelecionado.value
                );

                companheiros.forEach(comp => {
                    let nomeParceiro = comp?.jogador || 'Desconhecido';
                    if (!parceiros[nomeParceiro]) {
                        parceiros[nomeParceiro] = {nome: nomeParceiro, jogos_juntos: 0, titulos_juntos: 0 };
                    }
                        parceiros[nomeParceiro].jogos_juntos += 1;
                    if (ganhou) parceiros[nomeParceiro].titulos_juntos += 1;
                });
            });
            let lista = Object.values(parceiros);
            lista.sort((a, b) => {
                if (b.titulos_juntos !== a.titulos_juntos) return b.titulos_juntos - a.titulos_juntos;
                return b.jogos_juntos - a.jogos_juntos;
            });
            
            return lista;
        });

        const histGeralDados = computed(() => partidasDB.value.map(p => ({ ...p, data: p?.data ? String(p.data).substring(0,10) : 'Sem data'})));

        const rankingPaginado = computed(() => paginate(sortData(rankingDados.value, tableStates.value.ranking.sortKey, tableStates.value.ranking.sortOrder), tableStates.value.ranking));
        const histIndPaginado = computed(() => paginate(sortData(histIndDados.value,tableStates.value.histInd.sortKey, tableStates.value.histInd.sortOrder), tableStates.value.histInd));
        const entrosamentosPaginado = computed(() => paginate(sortData(entrosamentosDados.value, tableStates.value.entrosamentos.sortKey, tableStates.value.entrosamentos.sortOrder), tableStates.value.entrosamentos));
        const histGeralPaginado = computed(() => paginate(sortData(histGeralDados.value, tableStates.value.histGeral.sortKey, tableStates.value.histGeral.sortOrder), tableStates.value.histGeral));

        const totalPages = (tabela) => {
            const map = { ranking: rankingDados.value, histInd: histIndDados.value, entrosamentos: entrosamentosDados.value, histGeral: histGeralDados.value };
            return Math.ceil(map[tabela].length / tableStates.value[tabela].limit) || 1;
        };

        const nomesUnicos = computed(() =>
            [...new Set(statsDB.value.filter(s => s?.jogador).map(s => s.jogador))].sort());

        const salvarRodada = async () => {
            let arrayJogadores = [];
            form.value.dadosBrutos.split('\n').forEach(linha => {
                let partes = linha.trim().split(',').map(p => p.trim());
                if (partes.length >= 3) {
                    arrayJogadores.push({
                        nome: partes[0], time: partes[1].charAt(0).toUpperCase() + partes[1].toLowerCase().slice(1),
                        gols: parseInt(partes[2]) || 0, assistencias: partes.length >= 4 ? (parseInt(partes[3]) || 0) : 0
                    });
                }
            });

            if (arrayJogadores.length === 0) return alert('Nenhum jogador lido.');

            const pacote = {
                id: form.value.id, data: form.value.data, campeao: form.value.campeao,
                pontos_azul: form.value.pontos_azul, pontos_vermelho: form.value.pontos_vermelho, pontos_preto: form.value.pontos_preto,
                jogadores: arrayJogadores, senha: form.value.senha
            };

            try {
                const resposta = await fetch(`${urlAPI}/rodadas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pacote) });
                if (resposta.ok) {
                    alert('Rodada salva.');
                    cancelarEdicao();
                    await carregarDadosDaAPI();
                } else {
                    const erro = await resposta.json(); alert('Erro: ' + erro.erro);
                }
            } catch (erro) { alert('Erro de conexão.') }
        };

        const editarRodada = (partida) => {
            form.value.id = partida?.id;
            form.value.data = partida?.data ? String(partida.data).substring(0, 10) : '';
            form.value.campeao = partida?.campeao;
            form.value.pontos_azul = partida?.pontos_azul || 0;
            form.value.pontos_vermelho = partida?.pontos_vermelho || 0;
            form.value.pontos_preto = partida?.pontos_preto || 0;

            const stats = statsDB.value.filter(s => s?.partida_id === partida?.id);
            form.value.dadosBrutos = stats.map(s => `${s?.jogador}, ${s?.time}, ${s?.gols}, ${s?.assistencias}`).join('\n');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const cancelarEdicao = () => {
            form.value.id = null; form.value.dadosBrutos = ''; form.value.pontos_azul = 0; form.value.pontos_vermelho = 0; form.value.pontos_preto = 0;            
        };

        const deletarRodada = async (id) => {
            if (!id) return;
            const senha = prompt('Digite a senha do administrador para Excluir:');
            if (!senha) return;
            if (confirm(`Tem certeza que deseja apagar a rodada #${id} inteira?`)) {
                try {
                    const resposta = await fetch(`${urlAPI}/rodadas/${id}`, {
                        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha })
                    });
                    if (resposta.ok) { alert('Excluído.'); await carregarDadosDaAPI(); }
                    else { const erro = await resposta.json(); alert('Erro: '+ erro.erro); }
                } catch (e) { alert('Erro de conexão.'); }
            }
        };

        return {
            form,
            jogadorSelecionado,
            tableStates,
            nomesUnicos,
            dadosDoJogador,
            rankingPaginado,
            histIndPaginado,
            entrosamentosPaginado,
            histGeralPaginado,
            historicoGeralPaginado: histGeralPaginado,
            ordenar,
            mudarPagina,
            totalPages,
            salvarRodada,
            editarRodada,
            cancelarEdicao,
            deletarRodada
        };
    }

}).mount('#app');