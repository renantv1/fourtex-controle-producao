// Senhas nunca são salvas em texto puro: guardamos só o hash SHA-256 (Web Crypto API),
// usando o login como "sal" para que senhas iguais gerem hashes diferentes.

function toHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashSenha(login, senha) {
    const texto = `fourtex:${(login || "").trim().toLowerCase()}:${senha || ""}`;
    const bytes = new TextEncoder().encode(texto);
    return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

// Aceita usuários antigos com senha em texto puro (campo `senha`) para permitir a migração.
export async function verificarSenha(usuario, senha) {
    if (!usuario) return false;
    if (usuario.senhaHash) return usuario.senhaHash === await hashSenha(usuario.login, senha);
    return usuario.senha === senha;
}

// Remove dados de senha antes de guardar o usuário na sessão (localStorage).
export function semSenha(usuario) {
    if (!usuario) return usuario;
    const { senha, senhaHash, ...resto } = usuario;
    return resto;
}
