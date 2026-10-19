/**
 * seguranca.js – Criptografia do CPF
 *
 * POR QUÊ criptografar o CPF e não hashear:
 *   - Precisamos do valor original para exibir na tela e para buscar.
 *   - Hash (bcrypt) é unidirecional → não dá para recuperar o CPF.
 *   - AES-256-GCM é reversível e autenticado (detecta adulteração).
 *
 * POR QUÊ GCM: modo autenticado; se alguém alterar o ciphertext no banco,
 * a descriptografia falha (tag de autenticação).
 *
 * POR QUÊ IV aleatório a cada criptografia:
 *   - Mesmo CPF gera valores diferentes → impossível correlacionar registros
 *     só olhando o banco.
 *
 * ATENÇÃO: a chave está hardcoded. Em produção use process.env.CHAVE_CPF
 * e um KMS ou cofre de segredos.
 */

const crypto = require('crypto');

// Deriva uma chave de 32 bytes (256 bits) a partir de uma frase secreta + salt.
// scrypt é resistente a ataques de força bruta com GPU/ASIC.
const CHAVE = crypto.scryptSync('oficina-autocerta-chave-secreta', 'sal-da-oficina', 32);

/**
 * Criptografa um texto (CPF limpo) e devolve string "iv:tag:dados" em base64.
 */
function criptografar(texto) {
    const iv = crypto.randomBytes(12); // 96 bits – tamanho recomendado para GCM
    const cifra = crypto.createCipheriv('aes-256-gcm', CHAVE, iv);
    const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
    const tag = cifra.getAuthTag(); // tag de autenticação (16 bytes)
    return [iv, tag, dados].map(b => b.toString('base64')).join(':');
}

/**
 * Descriptografa o valor gravado no banco.
 * Se a tag não bater (dados adulterados), lança exceção.
 */
function descriptografar(valor) {
    const [iv, tag, dados] = valor.split(':').map(p => Buffer.from(p, 'base64'));
    const decifra = crypto.createDecipheriv('aes-256-gcm', CHAVE, iv);
    decifra.setAuthTag(tag);
    return Buffer.concat([decifra.update(dados), decifra.final()]).toString('utf8');
}

module.exports = { criptografar, descriptografar };
