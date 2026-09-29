require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());            // Permite requisições do frontend
app.use(express.json());    // Permite receber dados em JSON

// Configuração do Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const SENHA_MESTRA = process.env.ADMIN_SENHA || '1234';

app.get('/api/partidas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM partidas ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stats_jogadores');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.post('/api/rodadas', async (req, res) => {
    const { id, data, campeao, pontos_azul, pontos_vermelho, pontos_preto, jogadores, senha } = req.body;
    
    if (senha !== SENHA_MESTRA) return res.status(401).jsonn({ erro: 'Senha de administrador inválida.'});

    try {
        await pool.query('BEGIN');
        let partidaID = id;

        if (id) {
            await pool.query(
                'UPDATE partidas SET data=$1, campeao=$2, pontos_azul=$3, pontos_vermelho=$4, pontos_preto=$5 WHERE id=$6',
                [data, campeao, pontos_azul || 0, pontos_vermelho || 0, pontos_preto || 0, id]
            );
            await pool.query(
                'DELETE FROM stats_jogadores WHERE partida_id=$1', [id]);
        } else {
            const resPartida = await pool.query(
            'INSERT INTO partidas (data, campeao, pontos_azul, pontos_vermelho, pontos_preto) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [data, campeao, pontos_azul || 0, pontos_vermelho || 0, pontos_preto || 0]
            );
            partidaId = resPartida.rows[0].id;
        }

        const insertStat = `
            INSERT INTO stats_jogadores (partida_id, jogador, time, gols, assistencias)
            VALUES ($1, $2, $3, $4, $5)`;

        for (let jog of jogadores) {
            await pool.query(insertStat, [partidaId, jog.nome, jog.time, jog.gols, jog.assistencias]);
        }

        await pool.query('COMMIT');

        res.json({ mensagem: 'Rodada salva com sucesso!', partida_id: partidaId});
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ erro: err.message });
    }
});

app.delete('/api/rodadas/:id', async (req, res) => {
    const {senha } = req.body;
    if (senha !== SENHA_MESTRA) return res.status(401).json({ erro: 'Senha de administrador inválida.' });

    try {
        await pool.query('BEGIN');
        await pool.query('DELETE FROM stats_jogadores WHERE partida_id=$1', [req.params.id]);
        await pool.query('DELETE FROM partidas WHERE id=$1', [req.params.id]);
        await pool.query('COMMIT');
        res.json({ mensagem: 'Rodada excluída com sucecsso.' });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ erro: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API rodando corretamente na porta ${PORT}`);
});

