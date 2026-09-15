// =======================================================
// 1. DADOS SIMULADOS (teste sem banco de dados)
// =======================================================
let partidasDB = [
    { id: 1, data: '2026-09-01', campeao: 'Azul' },
    { id: 2, data: '2026-09-08', campeao: 'Vermelho' }
];

let statsDB = [
    { partida_id: 1, jogador: 'Flavio', time: 'Azul', gols: 3, assistencias: 1 },
    { partida_id: 1, jogador: 'João', time: 'Azul', gols: 1, assistencias: 2 },
    { partida_id: 1, jogador: 'Pedro', time: 'Vermelho', gols: 2, assistencias: 0 },
    { partida_id: 2, jogador: 'Flavio', time: 'Preto', gols: 2, assistencias: 1 },
    { partida_id: 2, jogador: 'João', time: 'Vermelho', gols: 0, assistencias: 3 }
];

// Lógica do programa

function calcularRankingGeral(stats, partidas) {
    let ranking = {};

    stats.forEach(stat => {
        let nome = stat.jogador;
        if (!ranking[nome]) {
            ranking[nome] = { jogador: nome, gols: 0, assistencias: 0, jogos: 0, titulos: 0 };
        }

        ranking[nome].gols += stat.gols;
        ranking[nome].assistencias += stat.assistencias;
        ranking[nome].jogos += 1;

        let partida = partidas.find(p => p.id === stat.partida_id);
        if (partida && partida.campeao.toLowerCase() === stat.time.toLowerCase()) {
            ranking[nome].titulos += 1;
        }
    });

    let listaRanking = Object.values(ranking);

    // M.P.G Média de participação em gols (Gols+Assistencias) / jogos
    listaRanking.forEach(jogador => {
        jogador.mpg = ((jogador.gols + jogador.assistencias) / jogador.jogos).toFixed(2);
    });

    // Desempate: Títulos > Gols > Assistências > Menos Jogos
    listaRanking.sort((a, b) => {
        if (b.titulos !== a.titulos) return b.titulos - a.titulos;
        if (b.gols !== a.gols) return b.gols - a.gols;
        if (b.assistencias !== a.assistencias) return b.assistencias - a.assistencias;
        return a.jogos - b.jogos;
    });

    return listaRanking;
}

// Atualizando a tabela (Document Object Model DOM)

function renderizarTabela() {
    // Calcula os dados organizados
    const dadosRanking = calcularRankingGeral(statsDB, partidasDB);
    
    // Busca o corpo da tabela lá no HTML pelo ID
    const corpoTabela = document.getElementById('corpo-tabela');
    
    // Limpa qualquer coisa que estiver lá dentro
    corpoTabela.innerHTML = '';

    // Nova linha para cada jogador (<tr>)
    dadosRanking.forEach(jogador => {
    // Preenchemos a linha com as colunas (<td>) e os dados do jogador
        const linha = `
            <tr>
                <td><strong>${jogador.jogador}</strong></td>
                <td>${jogador.titulos}</td>
                <td>${jogador.gols}</td>
                <td>${jogador.assistencias}</td>
                <td>${jogador.jogos}</td>
                <td>${jogador.mpg}</td>
            </tr>
        `;

        // Injetamos a linha pronta dentro do corpo da tabela
        corpoTabela.innerHTML += linha;
    });
}

// Processamento do formulário de adicionar rodada

const formRodada = document.getElementById ('form-rodada');

formRodada.addEventListener('submit', function(evento){
    evento.preventDefault();

    console.log("--- INICIANDO SALVAMENTO ---");

    const dataJogo = document.getElementById('data-jogo').value;
    const campeao = document.getElementById('campeao').value;
    const dadosBrutos = document.getElementById('dados-brutos').value;

    let novoIdPartida = 1
    if (partidasDB.lenght > 0) {
        novoIdPartida = partidasDB[partidasDB.length - 1].id + 1;
    }

    const linhas = dadosBrutos.split('\n');
    let jogadoresAdicionados = 0;
    let linhasComErro = 0;

    linhas.forEach(linha => {
            let partes = linha.trim();
            if (partes == '') return;

            if (partes.includes(',')) {
                let partes = linha.split(',').map(p => p.trim());

            if (partes.length >= 3) {
                let timeDigitado = partes[1].toLowerCase();
                let timePadronizado = timeDigitado.charAt(0).toUpperCase() + timeDigitado.slice(1);
                statsDB.push({
                    partida_id: novoIdPartida,
                    jogador: partes[0],
                    time: timePadronizado,
                    gols: parseInt(partes[2]) || 0,
                    assistencias: partes.length >= 4 ? (parseInt(partes[3]) || 0) : 0
                });
                jogadoresAdicionados++;
            } else {
                linhasComErro++;
            }
         } else {
            linhasComErro++;
        }
    });

    if (jogadoresAdicionados > 0) {
        partidasDB.push({
            id: novoIdPartida,
            data: dataJogo,
            campeao: campeao
        });

    formRodada.reset();
    renderizarTabela();

    if (linhasComErro > 0) {
        alert(`Rodada salva! Mas atenção: ${linhasComErro} linha(s) estava(m) sem vírgula e foram ignoradas.`);
    } else {
        alert(`Sucesso! Tabela atualizada com ${jogadoresAdicionados} jogadores.`);
    } 
        } else {
    alert('Erro: Nenhum jogador inserido! Verifique se separou Nome, Time, Gols e Assistências com vírgulas.');
}
});

renderizarTabela();