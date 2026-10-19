/**
 * server.js – Backend da Oficina AutoCerta
 *
 * POR QUÊ este arquivo existe:
 * Centraliza todas as rotas HTTP, autenticação por sessão e regras de
 * validação de negócio. O front-end só conversa com estas rotas.
 *
 * Tecnologias:
 * - Express 5: framework web
 * - express-session: mantém o usuário logado via cookie
 * - bcryptjs: hash de senhas (não reversível)
 * - node:sqlite (DatabaseSync): banco embutido no Node 22+
 * - seguranca.js: criptografia reversível do CPF (AES-256-GCM)
 */

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db/conexao');
const { criptografar, descriptografar } = require('./seguranca');

const app = express();

// Tempo de vida da sessão em minutos.
// POR QUÊ 30: equilíbrio entre usabilidade e segurança (sessão não fica aberta por horas).
const MINUTOS_SESSAO = 30;

// Parse automático de JSON no body das requisições POST/PUT.
app.use(express.json());

// Configuração da sessão.
// POR QUÊ httpOnly: impede que JavaScript do navegador leia o cookie (mitiga XSS).
// POR QUÊ resave/saveUninitialized false: evita gravações desnecessárias.
app.use(session({
    secret: 'oficina-autocerta-sessao', // em produção: process.env.SESSION_SECRET
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: MINUTOS_SESSAO * 60 * 1000, httpOnly: true }
}));

// Serve os arquivos estáticos (HTML, CSS, JS) da pasta public.
app.use(express.static(path.join(__dirname, 'public')));

// Redireciona a raiz para a tela de login.
app.get('/', (req, res) => res.redirect('/login.html'));

/**
 * Middleware de autenticação.
 * POR QUÊ: centraliza a verificação de sessão em um único lugar.
 * Qualquer rota protegida chama exigirLogin antes de executar a lógica.
 * Se a sessão expirou ou nunca existiu, devolve 401 e o front redireciona.
 */
function exigirLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
    }
    next();
}

// ===================== LOGIN =====================

/**
 * POST /api/login
 * Recebe {login, senha}, valida e cria a sessão.
 * POR QUÊ bcrypt.compareSync: a senha nunca é comparada em texto claro;
 * o hash armazenado já contém o salt, então a comparação é segura.
 */
app.post('/api/login', (req, res) => {
    const { login, senha } = req.body;
    if (!login || !senha) {
        return res.status(400).json({ erro: 'Informe usuário e senha.' });
    }
    const usuario = db.prepare('SELECT * FROM usuarios WHERE login = ?').get(login.trim());
    // Se usuário não existe OU senha não bate → mesma mensagem (não revela qual dos dois falhou).
    if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
        return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }
    // Guarda apenas id e nome na sessão (não a senha!).
    req.session.usuario = { id: usuario.id, nome: usuario.nome };
    res.json({ ok: true });
});

/** Encerra a sessão do usuário. */
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

/** Retorna os dados do usuário logado (usado pelo front para exibir o nome). */
app.get('/api/me', exigirLogin, (req, res) => res.json(req.session.usuario));

// ===================== CLIENTES =====================

/**
 * Converte o registro do banco (CPF criptografado) para o JSON que o front espera.
 * POR QUÊ: o front nunca vê o valor criptografado; só a aplicação tem a chave.
 */
const clienteJson = c => ({ ...c, cpf: descriptografar(c.cpf) });

/**
 * Valida os dados de um cliente (criação ou edição).
 * idAtual = null na criação; = id do registro na edição (para permitir manter o próprio CPF).
 * POR QUÊ a unicidade do CPF é verificada em memória:
 *   o CPF está criptografado no banco, então um UNIQUE no SQL não ajudaria
 *   (cada criptografia gera IV diferente → valores diferentes).
 */
function validarCliente(corpo, idAtual) {
    const nome = (corpo.nome || '').trim();
    const cpf = String(corpo.cpf || '').replace(/\D/g, ''); // remove máscara
    if (!nome) return 'Informe o nome do cliente.';
    if (cpf.length !== 11) return 'O CPF deve ter 11 dígitos.';
    if (corpo.email && !/^\S+@\S+\.\S+$/.test(corpo.email)) return 'E-mail inválido.';
    const repetido = db.prepare('SELECT * FROM clientes').all()
        .some(c => c.id !== idAtual && descriptografar(c.cpf) === cpf);
    if (repetido) return 'Já existe um cliente com este CPF.';
    return null;
}

/**
 * GET /api/clientes?busca=
 * POR QUÊ a busca é feita depois de descriptografar:
 *   não é possível usar LIKE no SQL sobre o CPF criptografado.
 */
app.get('/api/clientes', exigirLogin, (req, res) => {
    const termo = (req.query.busca || '').trim().toLowerCase();
    const digitos = termo.replace(/\D/g, '');
    const lista = db.prepare('SELECT * FROM clientes ORDER BY nome').all().map(clienteJson);
    res.json(lista.filter(c => !termo
        || c.nome.toLowerCase().includes(termo)
        || (c.email || '').toLowerCase().includes(termo)
        || (c.telefone || '').includes(termo)
        || (digitos && c.cpf.includes(digitos))));
});

app.post('/api/clientes', exigirLogin, (req, res) => {
    const erro = validarCliente(req.body, null);
    if (erro) return res.status(400).json({ erro });
    const { nome, cpf, telefone, email } = req.body;
    // CPF é criptografado ANTES de gravar.
    db.prepare('INSERT INTO clientes (nome, cpf, telefone, email) VALUES (?,?,?,?)')
        .run(nome.trim(), criptografar(String(cpf).replace(/\D/g, '')), telefone || '', email || '');
    res.status(201).json({ ok: true });
});

app.put('/api/clientes/:id', exigirLogin, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT id FROM clientes WHERE id = ?').get(id)) {
        return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }
    const erro = validarCliente(req.body, id);
    if (erro) return res.status(400).json({ erro });
    const { nome, cpf, telefone, email } = req.body;
    db.prepare('UPDATE clientes SET nome=?, cpf=?, telefone=?, email=? WHERE id=?')
        .run(nome.trim(), criptografar(String(cpf).replace(/\D/g, '')), telefone || '', email || '', id);
    res.json({ ok: true });
});

// ===================== VEÍCULOS =====================

/**
 * Aceita placa antiga (ABC1234) e Mercosul (ABC1D23).
 * POR QUÊ a regex: garante formato brasileiro sem precisar de biblioteca externa.
 */
const PLACA_VALIDA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

app.get('/api/veiculos', exigirLogin, (req, res) => {
    // JOIN para trazer o nome do cliente junto (evita N+1 no front).
    res.json(db.prepare(`
        SELECT v.*, c.nome AS cliente_nome
        FROM veiculos v JOIN clientes c ON c.id = v.cliente_id
        ORDER BY v.modelo`).all());
});

app.post('/api/veiculos', exigirLogin, (req, res) => {
    const { modelo, tipo, marca, cliente_id } = req.body;
    // Normaliza placa: remove espaços/hífens e deixa maiúscula.
    const placa = String(req.body.placa || '').replace(/[\s-]/g, '').toUpperCase();
    if (!PLACA_VALIDA.test(placa)) return res.status(400).json({ erro: 'Informe uma placa válida.' });
    if (!modelo || !modelo.trim()) return res.status(400).json({ erro: 'Informe o modelo do veículo.' });
    if (!tipo || !tipo.trim()) return res.status(400).json({ erro: 'Informe o tipo do veículo.' });
    if (!cliente_id) return res.status(400).json({ erro: 'Selecione o cliente do veículo.' });
    // Camada de proteção: além do select do front, o back verifica se o cliente existe.
    if (!db.prepare('SELECT id FROM clientes WHERE id = ?').get(cliente_id)) {
        return res.status(400).json({ erro: 'Cliente não encontrado.' });
    }
    if (db.prepare('SELECT id FROM veiculos WHERE placa = ?').get(placa)) {
        return res.status(400).json({ erro: 'Já existe um veículo com esta placa.' });
    }
    db.prepare('INSERT INTO veiculos (placa, modelo, tipo, marca, cliente_id) VALUES (?,?,?,?,?)')
        .run(placa, modelo.trim(), tipo.trim(), (marca || '').trim(), cliente_id);
    res.status(201).json({ ok: true });
});

// ===================== AGENDAMENTOS =====================

/**
 * Valida data no formato AAAA-MM-DD e se o dia realmente existe no calendário.
 * POR QUÊ: evita datas como 2026-02-30 ou 2026-13-01.
 */
function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || '')) return false;
    const d = new Date(texto + 'T00:00:00');
    return !isNaN(d) && d.toISOString().slice(0, 10) === texto;
}

app.get('/api/agendamentos', exigirLogin, (req, res) => {
    // ORDER BY mês/ano primeiro (para o front agrupar visualmente), depois pela data.
    // POR QUÊ strftime: SQLite não tem tipo DATE nativo; a coluna é TEXT.
    const lista = db.prepare(`
        SELECT a.id, a.data_agendamento, a.servico,
               v.placa, v.modelo AS veiculo_modelo, v.tipo, v.marca,
               c.nome AS cliente_nome, c.cpf AS cliente_cpf, c.telefone, c.email
        FROM agendamentos a
        JOIN veiculos v ON v.id = a.veiculo_id
        JOIN clientes c ON c.id = v.cliente_id
        ORDER BY strftime('%Y-%m', a.data_agendamento), a.data_agendamento`).all();
    // Descriptografa o CPF do cliente antes de enviar.
    res.json(lista.map(a => ({ ...a, cliente_cpf: descriptografar(a.cliente_cpf) })));
});

app.post('/api/agendamentos', exigirLogin, (req, res) => {
    const { veiculo_id, data_agendamento, servico } = req.body;
    if (!veiculo_id || !db.prepare('SELECT id FROM veiculos WHERE id = ?').get(veiculo_id)) {
        return res.status(400).json({ erro: 'Selecione um veículo.' });
    }
    if (!dataValida(data_agendamento)) return res.status(400).json({ erro: 'Informe uma data válida.' });
    if (!servico || !servico.trim()) return res.status(400).json({ erro: 'Informe o serviço.' });
    db.prepare('INSERT INTO agendamentos (veiculo_id, data_agendamento, servico) VALUES (?,?,?)')
        .run(veiculo_id, data_agendamento, servico.trim());
    res.status(201).json({ ok: true });
});

/**
 * PUT só altera a data (regra de negócio do sistema original).
 * POR QUÊ não editar serviço/veículo: simplificação do escopo do fornecedor.
 */
app.put('/api/agendamentos/:id', exigirLogin, (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT id FROM agendamentos WHERE id = ?').get(id)) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    }
    if (!dataValida(req.body.data_agendamento)) {
        return res.status(400).json({ erro: 'Informe uma data válida.' });
    }
    db.prepare('UPDATE agendamentos SET data_agendamento = ? WHERE id = ?')
        .run(req.body.data_agendamento, id);
    res.json({ ok: true });
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));
