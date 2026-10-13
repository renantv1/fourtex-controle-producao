import { FERIADOS_2026 } from "./constants";

const _now = new Date();
export const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}-${String(_now.getDate()).padStart(2,"0")}`;

export function isWeekday(date) {
    const d = new Date(date + "T12:00:00");
    const day = d.getDay();
    if (day === 0 || day === 6) return false;
    return !FERIADOS_2026.includes(date);
}

export function addWorkdays(startDate, days) {
    let d = new Date(startDate + "T12:00:00");
    let added = 0;
    while (added < days) {
        d.setDate(d.getDate() + 1);
        const str = d.toISOString().split("T")[0];
        if (isWeekday(str)) added++;
    }
    return d.toISOString().split("T")[0];
}

export function workdaysBetween(start, end) {
    let d = new Date(start + "T12:00:00");
    const endD = new Date(end + "T12:00:00");
    if (endD <= d) {
        let count = 0;
        let r = new Date(end + "T12:00:00");
        while (r < d) {
            r.setDate(r.getDate() + 1);
            const str = r.toISOString().split("T")[0];
            if (isWeekday(str)) count++;
        }
        return -count;
    }
    let count = 0;
    while (d < endD) {
        d.setDate(d.getDate() + 1);
        const str = d.toISOString().split("T")[0];
        if (isWeekday(str)) count++;
    }
    return count;
}

export function formatDate(str) {
    if (!str || typeof str !== "string") return "-";
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
}

// Converte timestamp "DD/MM/AAAA, HH:MM:SS" (toLocaleString pt-BR) em valor ordenável.
// Necessário porque comparar essas strings com localeCompare/< ordena pelo dia primeiro,
// misturando datas de meses diferentes (ex: "28/08" fica "maior" que "01/09").
export function parseTimestampBR(ts) {
    if (!ts || typeof ts !== "string") return 0;
    const [datePart, timePart] = ts.split(", ");
    const [d, m, y] = (datePart || "").split("/");
    if (!d || !m || !y) return 0;
    return new Date(`${y}-${m}-${d}T${timePart || "00:00:00"}`).getTime() || 0;
}

// Formata inteiro com ponto a cada 3 dígitos (ex: 1200 → "1.200")
export function fmtInt(val) {
    const num = String(val).replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Formata decimal com ponto nos milhares e vírgula decimal (ex: 7000.5 → "7.000,5")
export function fmtDec(val) {
    const s = String(val).replace(/[^0-9,.]/g, "").replace(/\./g, ",");
    const [intPart, decPart] = s.split(",");
    const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decPart !== undefined ? `${intFmt},${decPart}` : intFmt;
}

// Converte string formatada para número (remove pontos, troca vírgula por ponto)
export function parseNum(val) {
    return Number(String(val).replace(/\./g, "").replace(",", ".")) || 0;
}

// Conversão entre RL e outras unidades (Kg, Metro) — usada em Pedidos/Separação
export const KG_POR_ROLO = {
    "8mm": 0.150,
    "12mm": 0.262, "14mm": 0.305, "15mm": 0.327, "16mm": 0.349,
    "20mm": 0.436, "22mm": 0.480, "25mm": 0.550, "30mm": 0.680,
    "35mm": 0.764, "40mm": 0.873, "50mm": 1.091,
};
export const METROS_POR_ROLO = 25;

// Poliéster não tem rolo de peso fixo (produção é por peso até atingir o pedido do cliente),
// então Kg não é convertido para RL nesse tipo — fica como valor puro.
export function converterParaRL(qtd, unidade, medida, tipo) {
    if (!qtd || isNaN(qtd)) return 0;
    const n = Number(qtd);
    if (unidade === "Kg") {
        if ((tipo || "").toLowerCase() === "poliéster") return Math.round(n * 10) / 10;
        return KG_POR_ROLO[medida] ? Math.round(n / KG_POR_ROLO[medida]) : Math.round(n);
    }
    return Math.round(n);
}

export function converterDeRL(qtdRL, unidade, medida, tipo) {
    if (!qtdRL) return 0;
    const n = Number(qtdRL);
    if (unidade === "Kg") {
        if ((tipo || "").toLowerCase() === "poliéster") return n;
        return KG_POR_ROLO[medida] ? Math.round(n * KG_POR_ROLO[medida] * 10) / 10 : n;
    }
    return n;
}
