// Mapeamento: "medida|cor_normalizada" → código do produto Bonemania (Gorgurão)
// Fonte: PDFs de listagem de produto e orçamento Bonemania 29/05/2026

// Tabela de códigos do cliente removida da versão pública — exemplos fictícios:
const CODIGOS = {
    "25mm|preto": "0000",
    "25mm|branco": "0001",
};

/**
 * Retorna o código Bonemania para um item Gorgurão.
 * @param {string} medida - ex: "25mm"
 * @param {string} cor    - ex: "Marfim"
 * @returns {string|null} código de 4 dígitos ou null se não encontrado
 */
export function getCodigoBonemania(medida, cor) {
    const key = `${(medida || "").toLowerCase()}|${(cor || "").toLowerCase().trim()}`;
    return CODIGOS[key] || null;
}
