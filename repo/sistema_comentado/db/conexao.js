/**
 * db/conexao.js – Conexão com o SQLite embutido do Node.js
 *
 * POR QUÊ node:sqlite (DatabaseSync):
 *   A partir do Node 22.13 o SQLite vem embutido. Não precisa de
 *   better-sqlite3, node-sqlite3 nem compilação nativa.
 *
 * POR QUÊ criar o banco na primeira execução:
 *   Facilita a distribuição: o aluno só precisa de npm install + npm start.
 *   O arquivo oficina_db.sql contém o schema + dados iniciais.
 *
 * POR QUÊ PRAGMA foreign_keys = ON:
 *   SQLite desliga FKs por padrão. Sem isso, inserts com cliente_id
 *   inexistente seriam aceitos silenciosamente.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const arquivo = path.join(__dirname, 'oficina_db.sqlite');
const primeiraVez = !fs.existsSync(arquivo);

const db = new DatabaseSync(arquivo);
db.exec('PRAGMA foreign_keys = ON');

// Na primeira execução, cria e popula o banco usando o script SQL.
if (primeiraVez) {
    db.exec(fs.readFileSync(path.join(__dirname, 'oficina_db.sql'), 'utf8'));
}

module.exports = db;
