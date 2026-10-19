/**
 * comum.js – Funções compartilhadas por todas as páginas internas
 *
 * POR QUÊ um arquivo comum:
 *   Evita duplicar o tratamento de sessão expirada, escape XSS e
 *   formatação de CPF/data em cada página.
 */

/**
 * Chamada à API.
 * POR QUÊ tratar 401 aqui:
 *   Se a sessão expirou (ou o cookie foi apagado), qualquer chamada
 *   protegida retorna 401. Em vez de mostrar erro genérico, redirecionamos
 *   o usuário para o login com a flag ?expirou=1 (mensagem amigável).
 * POR QUÊ retornar Promise que nunca resolve:
 *   A página está sendo redirecionada; não faz sentido continuar o fluxo.
 */
async function api(url, opcoes = {}) {
    const resp = await fetch(url, {
        method: opcoes.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
    });
    if (resp.status === 401 && !url.includes('/api/login')) {
        window.location.href = '/login.html?expirou=1';
        return new Promise(() => {});   // página está sendo redirecionada; não continua
    }
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(dados.erro || 'Erro inesperado.');
    return dados;
}

/**
 * Escape de HTML.
 * POR QUÊ: evita XSS. Dados vindos do banco (nome, serviço, etc.)
 * poderiam conter <script> ou atributos maliciosos. Ao escapar antes
 * de inserir no innerHTML, o navegador trata tudo como texto.
 */
function esc(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatarCpf(cpf) {
    const d = String(cpf).replace(/\D/g, '');
    return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatarData(iso) {            // 2026-10-25 -> 25/10/2026
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}
function nomeMes(iso) {                 // 2026-10-25 -> Outubro/2026
    const [a, m] = iso.split('-');
    return `${MESES[Number(m) - 1]}/${a}`;
}

function avisar(mensagem, tipo = 'ok') {
    const el = document.getElementById('aviso');
    el.textContent = mensagem;
    el.className = 'aviso ' + tipo;
    el.style.display = 'block';
    setTimeout(() => (el.style.display = 'none'), 3500);
}

function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

/**
 * Páginas internas: mostra o usuário logado e liga o botão Sair.
 * POR QUÊ chamar /api/me: confirma que a sessão ainda é válida e
 * obtém o nome para exibir no topo.
 */
async function iniciarPagina() {
    const usuario = await api('/api/me');
    document.getElementById('nome-usuario').textContent = usuario.nome;
    document.getElementById('btn-sair').addEventListener('click', async () => {
        await api('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });
}
