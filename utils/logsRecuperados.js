import { KG_FIO_ROLO_GORG_POL } from "./fioConsumo";

// Data+hora em ms; aceita "dd/mm/aaaa, HH:MM:SS" e "dd/mm/aaaa HH:MM:SS" (entradas de estoque antigas)
function parseTsMs(ts) {
    const m = String(ts || "").match(/^(\d{2})\/(\d{2})\/(\d{4}),? ?(\d{2}:\d{2}(?::\d{2})?)?/);
    return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] || "00:00:00"}`).getTime() || 0 : 0;
}

// Apontamentos de Gorgurão anteriores ao mais antigo que ainda existe foram apagados pela
// antiga limpeza de 7 dias. Cada apontamento gerava uma entrada de estoque (cor, medida, RL),
// então eles são reconstruídos a partir dessas entradas:
// - só entradas feitas por quem aponta Gorgurão (as manuais/inventário ficam de fora)
// - peso estimado pela média real de kg/RL (medida+cor → medida → tabela padrão)
// - turno pelo fechamento de turno que cobre o horário
export function recuperarLogsGorgurao(logs = [], movimentos = [], turnoFinalizacoes = []) {
    const gorg = logs.filter(l => l.tipo === "Gorgurão");
    const corte = gorg.reduce((min, l) => Math.min(min, parseTsMs(l.timestamp) || Infinity), Infinity);
    const apontadores = new Set(gorg.map(l => l.operador).filter(Boolean));
    if (apontadores.size === 0) return [];

    const media = {};
    gorg.forEach(l => {
        const kg = Number(l.peso) || 0, rl = Number(l.qtd) || 0;
        if (kg <= 0 || rl <= 0) return;
        // Peso digitado errado (ex.: 536 em vez de 0,536) não entra na média
        const padrao = KG_FIO_ROLO_GORG_POL[l.medida];
        if (padrao && kg / rl > padrao * 3) return;
        [`${l.medida}|${l.cor}`, `${l.medida}`].forEach(k => {
            if (!media[k]) media[k] = { rl: 0, kg: 0 };
            media[k].rl += rl; media[k].kg += kg;
        });
    });
    const kgPorRl = (medida, cor) => {
        const m = media[`${medida}|${cor}`] || media[medida];
        return m ? m.kg / m.rl : (KG_FIO_ROLO_GORG_POL[medida] || 0);
    };

    const turnos = turnoFinalizacoes
        .filter(f => f.inicio)
        .map(f => ({ numero: f.numero, inicioIso: f.inicio, ini: new Date(f.inicio).getTime(), fim: f.fim ? new Date(f.fim).getTime() : 0 }))
        .sort((a, b) => a.ini - b.ini);
    const turnoDe = (t) => {
        const dentro = turnos.find(f => f.ini <= t && (!f.fim || t <= f.fim));
        if (dentro) return dentro;
        // Sem fechamento cobrindo o horário: último turno iniciado no mesmo dia antes do lançamento
        const dia = new Date(t).toDateString();
        return [...turnos].reverse().find(f => f.ini <= t && new Date(f.ini).toDateString() === dia) || null;
    };

    return movimentos
        .filter(m => m.tipo === "Gorgurão" && m.movimento === "entrada" && !m.obs && apontadores.has(m.operador))
        .map(m => ({ m, t: parseTsMs(m.timestamp) }))
        .filter(({ t }) => t > 0 && t < corte)
        .map(({ m, t }) => {
            const qtd = Number(m.qtd) || 0;
            const turno = turnoDe(t);
            const [data, hora] = [m.timestamp.slice(0, 10), m.timestamp.slice(10).replace(/^,?\s*/, "")];
            return {
                key: `rec_${m.key}`,
                tipo: "Gorgurão", medida: m.medida, cor: m.cor, qtd,
                peso: Math.round(qtd * kgPorRl(m.medida, m.cor) * 1000) / 1000,
                operador: m.operador,
                timestamp: `${data}, ${hora}`,
                turno: turno?.numero,
                turnoInicio: turno?.inicioIso,
                estimado: true,
            };
        });
}

// Mesma reconstrução para o Elástico: cada apontamento gerava uma entrada de estoque em Rolo ou Metro,
// então RL/metros são exatos. Turno, máquinas e metros por rolo vêm do fechamento de turno do Elástico.
export function recuperarLogsElastico(logs = [], movimentos = [], turnoElasticoFinalizacoes = []) {
    const elas = logs.filter(l => l.tipo === "Elástico");
    const corte = elas.reduce((min, l) => Math.min(min, parseTsMs(l.timestamp) || Infinity), Infinity);
    const apontadores = new Set(elas.map(l => l.operador).filter(Boolean));
    if (apontadores.size === 0) return [];

    const turnos = turnoElasticoFinalizacoes
        .filter(f => f.inicio)
        .map(f => ({ ...f, ini: new Date(f.inicio).getTime(), fimMs: f.finalizadoEm ? new Date(f.finalizadoEm).getTime() : 0 }))
        .sort((a, b) => a.ini - b.ini);
    const turnoDe = (t) => turnos.find(f => f.ini <= t && (!f.fimMs || t <= f.fimMs))
        || [...turnos].reverse().find(f => f.ini <= t && new Date(f.ini).toDateString() === new Date(t).toDateString())
        || null;

    return movimentos
        .filter(m => m.tipo === "Elástico" && m.movimento === "entrada" && !m.obs && apontadores.has(m.operador))
        .map(m => ({ m, t: parseTsMs(m.timestamp) }))
        .filter(({ t }) => t > 0 && t < corte)
        .map(({ m, t }) => {
            const turno = turnoDe(t);
            const isMetro = m.unidade === "Metro";
            const metros = isMetro ? Number(m.qtd) || 0 : 0;
            const qtd = isMetro ? Math.max(1, Math.round(metros / (Number(turno?.metrosPorRolo) || 25))) : Number(m.qtd) || 0;
            const [data, hora] = [m.timestamp.slice(0, 10), m.timestamp.slice(10).replace(/^,?\s*/, "")];
            return {
                key: `rec_${m.key}`,
                tipo: "Elástico", medida: m.medida, cor: m.cor, qtd, metros,
                unidade: isMetro ? "Metros" : "RL",
                qtdMaquinas: Number(turno?.qtdMaquinas) || 0,
                operador: m.operador,
                timestamp: `${data}, ${hora}`,
                turno: turno?.numero,
                turnoInicio: turno?.inicio,
                recuperado: true,
            };
        });
}
