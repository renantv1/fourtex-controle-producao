// Peso de fio (kg) por rolo de 25m — Gorgurão/Poliéster são 100% fio (sem borracha).
// Usado tanto na previsão de fio necessário (Dashboard) quanto no desconto automático
// do estoque de fio quando a produção lança um apontamento.
export const KG_FIO_ROLO_GORG_POL = { "8mm": 0.150, "12mm": 0.262, "14mm": 0.305, "15mm": 0.327, "16mm": 0.349, "20mm": 0.436, "22mm": 0.480, "25mm": 0.550, "30mm": 0.680, "35mm": 0.764, "40mm": 0.873, "50mm": 1.091 };
// Peso por rolo de 25m (kg) — Elástico: só 67% do peso é fio de poliéster (resto é borracha)
export const KG_ROLO_ELASTICO = { "12mm": 0.100, "15mm": 0.142, "20mm": 0.182, "25mm": 0.230, "30mm": 0.245, "35mm": 0.265, "40mm": 0.296 };
export const FIO_PCT_ELASTICO = 0.67;

// Usado no Dashboard pra prever fio necessário a partir do que falta produzir num pedido.
export function calcKgFio(tipo, medida, restante, unidade) {
    if (tipo === "Elástico") {
        const peso = KG_ROLO_ELASTICO[medida] || 0;
        const totalKg = unidade === "m" ? (restante * peso / 25) : (restante * peso);
        return totalKg * FIO_PCT_ELASTICO;
    }
    if (unidade === "KG") return restante; // Poliéster já em kg — ribbon 100% fio
    return restante * (KG_FIO_ROLO_GORG_POL[medida] || 0); // Gorgurão em RL
}

// Usado no app.jsx pra descontar o estoque de fio a partir de um lançamento real (logs de produção).
export function kgFioDoLog(log) {
    const tipo = (log.tipo || "").toLowerCase();
    if (tipo === "poliéster") return Number(log.peso) || 0;
    if (tipo === "elástico") {
        const pesoRolo = KG_ROLO_ELASTICO[log.medida] || 0;
        const totalKg = log.unidade === "Metros" ? (Number(log.metros || 0) / 25 * pesoRolo) : (Number(log.qtd || 0) * pesoRolo);
        return totalKg * FIO_PCT_ELASTICO;
    }
    return Number(log.qtd || 0) * (KG_FIO_ROLO_GORG_POL[log.medida] || 0);
}

// Movimentos de fio para acompanhar a edição/exclusão de um apontamento (depois = null na exclusão):
// devolve o fio do apontamento original e baixa o do corrigido. Manuais não mexem no fio.
export function movimentosFioCorrecao(antes, depois, operador, obs) {
    if (!antes || antes.manual) return [];
    const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const kgAntes = kgFioDoLog(antes), kgDepois = depois ? kgFioDoLog(depois) : 0;
    if (depois && depois.cor === antes.cor && Math.abs(kgAntes - kgDepois) < 0.0005) return [];
    const movs = [];
    if (kgAntes > 0) movs.push({ direcao: "entrada", cor: antes.cor, qtd: kgAntes, operador, origem: antes.tipo, obs, timestamp: ts });
    if (kgDepois > 0) movs.push({ direcao: "saida", cor: depois.cor, qtd: kgDepois, operador, origem: depois.tipo, obs, timestamp: ts });
    return movs;
}

// Usado no app.jsx pra descontar o estoque de fio a partir de um apontamento de Cordões.
// Tipos sem peso definido em PESO_KG_POR_RL (ex: Overlock) não descontam fio.
export function kgFioDoCordoes(tipoCordao, qtd, pesoKgPorRl) {
    const peso = pesoKgPorRl?.[tipoCordao] || 0;
    return Number(qtd || 0) * peso;
}
