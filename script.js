const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        const partidasDB = ref([
            { id: 1, data: '2026-09-01', campeao: 'Azul'},
            { id: 2, data: '2026-09-08', campeao: 'Vermelho'}
        ]);

        const statsDB = ref([
            { partida_id: 1, jogador: 'Flavio', time: 'Azul', gols: 3, assistencias: 1 },
            { partida_id: 1, jogador: 'João', time: 'Azul', gols: 1, assistencias: 2 },
            { partida_id: 1, jogador: 'Pedro', time: 'Vermelho', gols: 2, assistencias: 0 },
            { partida_id: 2, jogador: 'Flavio', time: 'Preto', gols: 2, assistencias: 1 },
            { partida_id: 2, jogador: 'João', time: 'Vermelho', gols: 0, assistencias: 3 }
        ]);
        
        const form = ref({
            data: new Date().toISOString().split('T')[0],
            campeao: 'Azul',
            dadosBrutos: ''
        });

        const jogadorSelecionado = ref('');

        const rankingCalculado = computed(() => {
            let ranking = {};
            
            statsDB.value.forEach(stat => {
                let nome = stat.jogador;
                if (!ranking[nome]) ranking[nome] = { nome: nome, titulos: 0, gols: 0, assistencias: 0, jogos: 0};
                
                ranking[nome].gols += stat.gols;
                ranking[nome].assistencias += stat.assistencias;
                ranking[nome].jogos += 1;

                let partida = partidasDB.value.find(p => p.id === stat.partida_id);
                if (partida && partida.campeao.toLowerCase() === stat.time.toLowerCase()) {
                    ranking[nome].titulos += 1;
                }
            });

            let lista = Object.values(ranking);
            lista.forEach(jog => jog.mpg = ((jog.gols + jog.assistencias) / jog.jogos).toFixed(2))

            lista.sort((a, b) => {
                if (b.titulos !== a.titulos) return b.titulos - a.titulos;
                if (b.gols !== a.gols) return b.gols - a.gols;
                if (b.assistencias !== a.assistencias) return b.assistencias - a.assistencias;
                return a.jogos - b.jogos;
            });

            return lista;

        });

        const nomesUnicos = computed(() => {
            return [...new Set(statsDB.value.map(s => s.jogador))].sort();
        });

        const dadosDoJogador = computed(() => {
            if (!jogadorSelecionado.value) return null;
            return rankingCalculado.value.find(j => j.nome === jogadorSelecionado.value);
        });

        const historicoJogador = computed(() => {
            if (!jogadorSelecionado.value) return [];

            let historico = statsDB.value.filter(s => s.jogador === jogadorSelecionado.value);

            return historico.map(stat => {
                let partida = partidasDB.value.find(p => p.id === stat.partida_id);
                let ganhou = partida && partida.campeao.toLowerCase() === stat.time.toLowerCase();

                return {
                    ...stat,
                    data_formatada: partida ? partida.data : 'Sem data',
                    ganhou: ganhou
                };
            }).sort((a,b) => b.partida_id - a.partida_id);
        });

        const salvarRodada = () => {
            let novoIdPartida = partidasDB.value.length > 0 ? partidasDB.value[partidasDB.value.length - 1].id + 1 : 1;
            const linhas = form.value.dadosBrutos.split('\n');
            let jogadoresAdicionados = 0;

            linhas.forEach(linha => {
                let textoLimpo = linha.trim();
                if (textoLimpo.includes(',')) {
                    let partes = textoLimpo.split(',').map(p => p.trim());
                    if (partes.length >= 3) {
                        let timeDigitado = partes[1].toLowerCase();
                        let timePadronizado = timeDigitado.charAt(0).toUpperCase() + timeDigitado.slice(1);

                        statsDB.value.push({
                            partida_id: novoIdPartida,
                            jogador: partes[0],
                            time: timePadronizado,
                            gols: parseInt(partes[2]) || 0,
                            assistencias: partes.length >= 4 ? (parseInt(partes[3]) || 0) : 0
                        });
                        jogadoresAdicionados++;
                    }
                }
            });

            if (jogadoresAdicionados > 0) {
                partidasDB.value.push({
                    id: novoIdPartida,
                    data: form.value.data,
                    campeao: form.value.campeao
                    });

                    form.value.dadosBrutos = '';
                    alert(`Sucesso! ${jogadoresAdicionados} jogadores adicionados.`);
                } else {
                    alert('Nenhum jogador lido. Formato incorreto.');
                }
            };


            return {
                form,
                jogadorSelecionado,
                rankingCalculado,
                nomesUnicos,
                dadosDoJogador,
                historicoJogador,
                salvarRodada
            };
        }
    }).mount('#app');