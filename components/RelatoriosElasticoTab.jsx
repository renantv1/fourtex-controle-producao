import { useState, useMemo, useEffect } from "react";
import { COR_HEX } from "../utils/corCatalog";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

const COLOR  = "#10B981";
const MESES  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// Peso por rolo de 25m (kg). RL (100m) = × 4. Metro = ÷ 25.
const PESO_ROLO_25M = { "12mm": 0.100, "15mm": 0.142, "20mm": 0.182, "25mm": 0.230, "30mm": 0.245, "35mm": 0.265, "40mm": 0.296 };
const pesoKg = (medida, rl, metros) => {
    const p = PESO_ROLO_25M[medida] || 0;
    return (rl * p) + (metros * p / 25);
};
const selStyle  = { height: 32, padding: "0 8px", fontSize: 12, border: "1px solid #ECEDF1", borderRadius: 6, background: "#F9FAFB", color: "#374151", cursor: "pointer" };

function exportCSV(filename, headers, rows) {
    const bom = "\uFEFF";
    const blob = new Blob([bom + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function printHTML(title, html) {
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
        *{box-sizing:border-box;}
        body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:0;}
        .page-header{background:#111827;color:#fff;padding:20px 28px;display:flex;justify-content:space-between;align-items:flex-end;}
        .page-header .titulo{font-size:20px;font-weight:800;letter-spacing:-0.3px;}
        .page-header .subtitulo{font-size:12px;color:#9CA3AF;margin-top:2px;}
        .page-header .empresa{font-size:13px;font-weight:700;color:#34D399;}
        .content{padding:24px 28px;}
        .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
        .card{border-radius:10px;padding:14px 16px;border:1.5px solid #ECEDF1;}
        .card .label{font-size:9px;font-weight:700;letter-spacing:0.06em;color:#9CA3AF;margin-bottom:6px;text-transform:uppercase;}
        .card .value{font-size:24px;font-weight:800;line-height:1;}
        .card .unit{font-size:11px;font-weight:500;color:#9CA3AF;margin-left:2px;}
        .card.green{background:#F0FDF4;border-color:#BBF7D0;}.card.green .value{color:#059669;}
        .card.blue{background:#EFF6FF;border-color:#BFDBFE;}.card.blue .value{color:#1D4ED8;}
        .card.purple{background:#F5F3FF;border-color:#DDD6FE;}.card.purple .value{color:#7C3AED;}
        .card.gray{background:#F9FAFB;border-color:#ECEDF1;}.card.gray .value{color:#374151;}
        .section-title{font-size:13px;font-weight:800;color:#111;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #ECEDF1;text-transform:uppercase;letter-spacing:0.04em;}
        table{border-collapse:collapse;width:100%;margin-bottom:16px;}
        th{background:#111827;color:#fff;text-align:left;padding:7px 10px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;}
        th.r{text-align:right;}
        td{padding:6px 10px;border-bottom:1px solid #F3F4F6;font-size:12px;}
        td.r{text-align:right;font-weight:600;}
        tr.subtotal td{background:#F0FDF4;font-weight:700;color:#059669;}
        tr.subtotal td.blue{color:#1D4ED8;}
        tr:last-child td{border-bottom:none;}
        .footer{margin-top:24px;padding-top:12px;border-top:1px solid #ECEDF1;font-size:10px;color:#9CA3AF;display:flex;justify-content:space-between;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    </style>
    </head><body>
    <div class="page-header">
        <div style="display:flex;align-items:center;gap:14px">
            <div style="background:#10B981;border-radius:8px;padding:6px 14px;font-size:15px;font-weight:900;color:#fff;letter-spacing:0.05em">ELÁSTICO</div>
            <div><div class="titulo">${title}</div><div class="subtitulo">Relatório de Produção de Elástico</div></div>
        </div>
        <div class="empresa">FourTEX — Indústria Têxtil</div>
    </div>
    <div class="content">${html}
    <div class="footer"><span>Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span><span>FourTEX — Sistema de Controle de Produção</span></div>
    </div>
    <script>window.onload=()=>window.print();</script></body></html>`);
    w.document.close();
}

const parseDate = (s) => {
    if (!s) return null;
    if (s.includes("/")) { const [d, m, y] = s.split("/"); return new Date(`${y}-${m}-${d}`); }
    return new Date(s);
};

export default function RelatoriosElasticoTab({ logs, turnoFinalizacoes = [] }) {
    const isMobile  = useIsMobile();
    const hoje      = new Date();
    const isPrimeiro = hoje.getDate() === 1;
    const mesAnt    = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

    const [ano, setAno]       = useState(mesAnt.getFullYear());
    const [mes, setMes]       = useState(mesAnt.getMonth());
    const [aberto, setAberto] = useState(isPrimeiro);

    // Só Elástico
    const logsElastico = useMemo(() => logs.filter(l => l.tipo === "Elástico"), [logs]);

    const logsDoMes = useMemo(() => logsElastico.filter(l => {
        if (!l.timestamp) return false;
        const d = new Date(l.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}),/, "$3-$2-$1"));
        return d.getFullYear() === ano && d.getMonth() === mes;
    }), [logsElastico, ano, mes]);

    const totalRL     = logsDoMes.filter(l => l.unidade !== "Metros" && l.unidade !== "Metro").reduce((s, l) => s + (Number(l.qtd) || 0), 0);
    const totalMetros = logsDoMes.filter(l => l.unidade === "Metros" || l.unidade === "Metro").reduce((s, l) => s + (Number(l.metros) || 0), 0);
    const diasTrab    = new Set(logsDoMes.map(l => l.timestamp?.split(",")[0])).size;
    const totalKg     = logsDoMes.reduce((s, l) => {
        const isM = l.unidade === "Metros" || l.unidade === "Metro";
        return s + pesoKg(l.medida, isM ? 0 : (Number(l.qtd) || 0), isM ? (Number(l.metros) || 0) : 0);
    }, 0);
    const kgBorracha  = totalKg * 0.33;
    const kgPoliester = totalKg * 0.67;

    // Comparação: os 3 meses anteriores + o mês selecionado (do mais antigo ao atual)
    const mesesComparacao = useMemo(() => [3, 2, 1, 0].map(n => {
        const ref = new Date(ano, mes - n, 1);
        const a = ref.getFullYear(), m = ref.getMonth();
        const ls = logsElastico.filter(l => {
            if (!l.timestamp) return false;
            const d = new Date(l.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}),/, "$3-$2-$1"));
            return d.getFullYear() === a && d.getMonth() === m;
        });
        const isM = l => l.unidade === "Metros" || l.unidade === "Metro";
        const rl     = ls.filter(l => !isM(l)).reduce((s, l) => s + (Number(l.qtd) || 0), 0);
        const metros = ls.filter(isM).reduce((s, l) => s + (Number(l.metros) || 0), 0);
        const kg     = ls.reduce((s, l) => s + pesoKg(l.medida, isM(l) ? 0 : (Number(l.qtd) || 0), isM(l) ? (Number(l.metros) || 0) : 0), 0);
        const fins = turnoFinalizacoes.filter(f => {
            if (!f.finalizadoEm) return false;
            const d = new Date(f.finalizadoEm);
            return d.getFullYear() === a && d.getMonth() === m;
        });
        const defeitos = fins.reduce((s, f) => s + (Number(f.defeitosKg) || 0), 0);
        const comMaq = fins.filter(f => Number(f.qtdMaquinas) > 0);
        const maq = comMaq.length ? Math.round(comMaq.reduce((s, f) => s + Number(f.qtdMaquinas), 0) / comMaq.length) : 0;
        const totM = (rl * 25) + metros;
        return { ano: a, mes: m, rl, metros, totM, kg, defeitos, maq, mPorMaq: maq > 0 && totM > 0 ? Math.round(totM / maq) : 0 };
    }), [logsElastico, turnoFinalizacoes, ano, mes]);
    const LINHAS_COMPARACAO = [
        { label: "Total RL",     key: "rl",       unit: "RL" },
        { label: "Metros Lanç.", key: "metros",   unit: "m" },
        { label: "Total Metros", key: "totM",     unit: "m" },
        { label: "Peso Total",   key: "kg",       unit: "kg", dec: 2 },
        { label: "Defeitos",     key: "defeitos", unit: "kg", dec: 2, inverso: true },
        { label: "Máquinas",     key: "maq",      unit: "máq." },
        { label: "m / Máquina",  key: "mPorMaq",  unit: "m" },
    ];

    // Máquinas — usa turnoFinalizacoes (já tem qtdMaquinas histórico) + logs novos
    const finalizacoesMes  = turnoFinalizacoes.filter(f => {
        if (!f.finalizadoEm) return false;
        const d = new Date(f.finalizadoEm);
        return d.getFullYear() === ano && d.getMonth() === mes;
    });
    const finComMaq        = finalizacoesMes.filter(f => Number(f.qtdMaquinas) > 0);
    const avgMaquinas      = finComMaq.length ? Math.round(finComMaq.reduce((s, f) => s + Number(f.qtdMaquinas), 0) / finComMaq.length) : 0;
    const maxMaquinas      = finComMaq.reduce((m, f) => Math.max(m, Number(f.qtdMaquinas)), 0);
    const distMaquinas     = {};
    finComMaq.forEach(f => { const n = Number(f.qtdMaquinas); distMaquinas[n] = (distMaquinas[n] || 0) + 1; });
    const totalMetrosMes   = (totalRL * 25) + totalMetros;
    const rlPorMaquina     = (avgMaquinas > 0 && totalMetrosMes > 0) ? Math.round(totalMetrosMes / avgMaquinas) : 0;
    const operadoresAtivos = [...new Set(logsDoMes.map(l => l.operador).filter(Boolean))];


    // logsComMaq mantido para compatibilidade com seção de uso de máquinas
    const logsComMaq = finComMaq;

    // Defeitos do mês — vem das finalizações de turno
    const totalDefeitosKg = turnoFinalizacoes.filter(f => {
        if (!f.finalizadoEm) return false;
        const d = new Date(f.finalizadoEm);
        return d.getFullYear() === ano && d.getMonth() === mes;
    }).reduce((s, f) => s + (Number(f.defeitosKg) || 0), 0);
    const defeitosBorracha   = totalDefeitosKg * 0.33;
    const defeitosPoliester  = totalDefeitosKg * 0.67;

    // Por cor: Preto e Branco primeiro, depois coloridos individualmente
    const porCorGrupo = {};
    logsDoMes.forEach(l => {
        const cor = (l.cor || "—").trim();
        if (!porCorGrupo[cor]) porCorGrupo[cor] = { rl: 0, metros: 0, kg: 0 };
        const isMetroCor = l.unidade === "Metros" || l.unidade === "Metro";
        const rlCor = isMetroCor ? 0 : (Number(l.qtd) || 0);
        const mCor  = isMetroCor ? (Number(l.metros) || 0) : 0;
        porCorGrupo[cor].rl     += rlCor;
        porCorGrupo[cor].metros += mCor;
        porCorGrupo[cor].kg     += pesoKg(l.medida, rlCor, mCor);
    });
    const coresOrdenadas = Object.keys(porCorGrupo).sort((a, b) => {
        const ordem = (c) => c.toLowerCase() === "preto" ? 0 : c.toLowerCase() === "branco" ? 1 : 2;
        if (ordem(a) !== ordem(b)) return ordem(a) - ordem(b);
        return a.localeCompare(b);
    });

    // Por turno
    const porTurno = {};
    logsDoMes.forEach(l => {
        const t = `T${l.turno || "—"}`;
        if (!porTurno[t]) porTurno[t] = { rl: 0, count: 0 };
        porTurno[t].rl    += Number(l.qtd) || 0;
        porTurno[t].count += 1;
    });

    // Por operador
    const porOperador = {};
    logsDoMes.forEach(l => {
        const op = l.operador || "—";
        if (!porOperador[op]) porOperador[op] = { rl: 0, count: 0 };
        porOperador[op].rl    += Number(l.qtd) || 0;
        porOperador[op].count += 1;
    });

    // Detalhe por medida → cor
    const porMedidaCor = {};
    logsDoMes.forEach(l => {
        const key = `${l.medida || "—"}|${l.cor || "—"}`;
        if (!porMedidaCor[key]) porMedidaCor[key] = { medida: l.medida || "—", cor: l.cor || "—", rl: 0, metros: 0 };
        const isMetro = l.unidade === "Metros" || l.unidade === "Metro";
        porMedidaCor[key].rl     += isMetro ? 0 : (Number(l.qtd) || 0);
        porMedidaCor[key].metros += isMetro ? (Number(l.metros) || 0) : 0;
    });
    // Agrupar por medida
    const porMedida = {};
    Object.values(porMedidaCor).forEach(v => {
        if (!porMedida[v.medida]) porMedida[v.medida] = [];
        porMedida[v.medida].push(v);
    });
    const medidasOrdenadas = Object.keys(porMedida).sort((a, b) => parseFloat(a) - parseFloat(b));

    const handleCSV = () => {
        const rows = logsDoMes.map(l => [l.timestamp || "—", `T${l.turno}`, l.medida, l.cor, l.qtd || 0, l.metros || 0, ((Number(l.qtd)||0) * 25) + (Number(l.metros)||0), l.operador || "—"]);
        exportCSV(`relatorio_elastico_${MESES[mes].toLowerCase()}_${ano}.csv`, ["Data/Hora","Turno","Medida","Cor","RL","Metros Lanç.","Total Metros","Operador"], rows);
    };

    const handlePrint = () => {
        const fmtN  = v => Number(v).toLocaleString("pt-BR");
        const fmtKg = v => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const totM  = (totalRL * 25) + totalMetros;

        // Cards resumo
        const resumoHtml = `
        <div class="cards5">
            <div class="card green"><div class="label">Total RL</div><div class="value">${fmtN(totalRL)}<span class="unit">RL</span></div></div>
            <div class="card purple"><div class="label">Metros Lanç.</div><div class="value">${fmtN(totalMetros)}<span class="unit">m</span></div></div>
            <div class="card blue"><div class="label">Total Metros</div><div class="value">${fmtN(totM)}<span class="unit">m</span></div></div>
            <div class="card gray"><div class="label">Peso Total</div><div class="value">${fmtKg(totalKg)}<span class="unit">kg</span></div></div>
            <div class="card gray"><div class="label">Dias Trab.</div><div class="value">${diasTrab}<span class="unit">dias</span> <span style="font-size:13px;color:#6B7280">${logsDoMes.length} lanç.</span></div></div>
        </div>
        <div class="cards2" style="margin-top:10px">
            <div class="card" style="background:#FFF7ED;border-color:#FED7AA"><div class="label">Borracha (33%)</div><div class="value" style="color:#C2410C">${fmtKg(kgBorracha)}<span class="unit">kg</span></div></div>
            <div class="card" style="background:#EFF6FF;border-color:#BFDBFE"><div class="label">Fio Poliéster (67%)</div><div class="value" style="color:#1D4ED8">${fmtKg(kgPoliester)}<span class="unit">kg</span></div></div>
        </div>`;

        // Comparação
        const deltaHtml = (atual, prev) => {
            if (!prev) return "<span style='color:#9CA3AF'>—</span>";
            const pct = Math.round(((atual - prev) / prev) * 100);
            if (pct === 0) return "<span style='color:#9CA3AF'>—</span>";
            const cor = pct > 0 ? "#16A34A" : "#DC2626";
            return `<span style="color:${cor};font-weight:700">${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%</span>`;
        };
        const fmtCmp = (v, l) => v ? `${l.dec ? fmtKg(v) : fmtN(v)} ${l.unit}` : "—";
        const anteriorCmp = mesesComparacao[mesesComparacao.length - 2];
        const compHtml = `
        <div class="section-title">Comparação com os 3 meses anteriores</div>
        <table><thead><tr><th>Métrica</th>${mesesComparacao.map(c => `<th class="r">${MESES[c.mes]} ${c.ano}</th>`).join("")}<th class="r">Var. vs ${MESES[anteriorCmp.mes]}</th></tr></thead><tbody>
            ${LINHAS_COMPARACAO.map(l => {
                const atual = mesesComparacao[mesesComparacao.length - 1][l.key];
                return `<tr><td>${l.label}</td>${mesesComparacao.map((c, i) => i === mesesComparacao.length - 1
                    ? `<td class="r"><strong>${fmtCmp(c[l.key], l)}</strong></td>`
                    : `<td class="r">${fmtCmp(c[l.key], l)}</td>`).join("")}<td class="r">${atual ? deltaHtml(atual, anteriorCmp[l.key]) : "—"}</td></tr>`;
            }).join("")}
        </tbody></table>`;

        // Defeitos
        const defeitosHtml = totalDefeitosKg > 0 ? `
        <div class="section-title" style="color:#92400E">⚠ Defeitos do Mês</div>
        <div class="cards3" style="margin-bottom:16px">
            <div class="card" style="background:#FEF9C3;border-color:#FDE047"><div class="label">Total Descartado</div><div class="value" style="color:#92400E">${fmtKg(totalDefeitosKg)}<span class="unit">kg</span></div></div>
            <div class="card" style="background:#FFF7ED;border-color:#FED7AA"><div class="label">Borracha Perdida (33%)</div><div class="value" style="color:#C2410C">${fmtKg(defeitosBorracha)}<span class="unit">kg</span></div></div>
            <div class="card" style="background:#EFF6FF;border-color:#BFDBFE"><div class="label">Poliéster Perdido (67%)</div><div class="value" style="color:#1D4ED8">${fmtKg(defeitosPoliester)}<span class="unit">kg</span></div></div>
        </div>` : "";

        // Por Cor
        const totCorRL  = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].rl, 0);
        const totCorM   = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].metros, 0);
        const totCorKg  = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].kg, 0);
        const totCorMt  = (totCorRL * 25) + totCorM;
        const fmtKg3 = v => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        const porCorHtml = `
        <div class="section-title">Por Cor</div>
        <table><thead><tr><th>Cor</th><th class="r">Rolos</th><th class="r">Metros</th><th class="r">Total (m)</th><th class="r">Peso (kg)</th><th class="r" style="color:#FED7AA">Borracha (kg)</th><th class="r" style="color:#BFDBFE">Fio (kg)</th></tr></thead><tbody>
        ${coresOrdenadas.map(cor => {
            const g = porCorGrupo[cor];
            const tm = (g.rl * 25) + g.metros;
            return `<tr><td><strong>${cor}</strong></td><td class="r">${fmtN(g.rl)}</td><td class="r">${g.metros > 0 ? fmtN(g.metros) : "—"}</td><td class="r">${fmtN(tm)} m</td><td class="r">${fmtKg3(g.kg)}</td><td class="r" style="color:#C2410C;font-weight:700">${fmtKg3(g.kg * 0.33)}</td><td class="r" style="color:#1D4ED8;font-weight:700">${fmtKg3(g.kg * 0.67)}</td></tr>`;
        }).join("")}
        <tr style="background:#111827;color:#fff"><td style="color:#fff;font-weight:800">TOTAL</td><td style="text-align:right;color:#34D399;font-weight:800">${fmtN(totCorRL)}</td><td style="text-align:right;color:#A78BFA;font-weight:800">${totCorM > 0 ? fmtN(totCorM) : "—"}</td><td style="text-align:right;color:#38BDF8;font-weight:800">${fmtN(totCorMt)} m</td><td style="text-align:right;color:#fff;font-weight:800">${fmtKg3(totCorKg)}</td><td style="text-align:right;color:#FED7AA;font-weight:800">${fmtKg3(totCorKg * 0.33)}</td><td style="text-align:right;color:#BFDBFE;font-weight:800">${fmtKg3(totCorKg * 0.67)}</td></tr>
        </tbody></table>`;

        // Detalhamento
        const detHtml = `
        <div class="section-title">Elástico — Detalhamento</div>
        <table><thead><tr><th>Medida</th><th>Cor</th><th class="r">Rolos</th><th class="r">Metros</th><th class="r">Total (m)</th></tr></thead><tbody>
        ${medidasOrdenadas.map(medida => {
            const itens = porMedida[medida].sort((a, b) => b.rl - a.rl);
            const subRL = itens.reduce((s, v) => s + v.rl, 0);
            const subM  = itens.reduce((s, v) => s + v.metros, 0);
            const subT  = (subRL * 25) + subM;
            return `<tr class="subtotal"><td><strong>${medida}</strong></td><td>SUBTOTAL</td><td class="r">${fmtN(subRL)}</td><td class="r">${subM > 0 ? fmtN(subM) : "—"}</td><td class="r blue">${fmtN(subT)} m</td></tr>`
                + itens.map(v => `<tr><td></td><td>${v.cor}</td><td class="r">${fmtN(v.rl)}</td><td class="r">${v.metros > 0 ? fmtN(v.metros) : "—"}</td><td class="r">${fmtN((v.rl*25)+v.metros)} m</td></tr>`).join("");
        }).join("")}
        </tbody></table>`;

        const w = window.open("", "_blank", "width=900,height=700");
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relatório Elástico — ${MESES[mes]} ${ano}</title>
        <style>
            *{box-sizing:border-box;margin:0;padding:0;}
            body{font-family:Arial,sans-serif;font-size:12px;color:#111;}
            .page-header{background:#111827;color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:flex-end;}
            .page-header .titulo{font-size:18px;font-weight:800;}.page-header .sub{font-size:11px;color:#9CA3AF;margin-top:2px;}
            .page-header .emp{font-size:13px;font-weight:700;color:#34D399;}
            .content{padding:20px 28px;}
            .cards5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:10px;}
            .cards2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
            .cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
            .card{border-radius:9px;padding:11px 14px;border:1.5px solid #ECEDF1;}
            .card .label{font-size:8px;font-weight:700;letter-spacing:0.07em;color:#9CA3AF;margin-bottom:5px;text-transform:uppercase;}
            .card .value{font-size:20px;font-weight:800;line-height:1.1;}
            .card .unit{font-size:10px;font-weight:500;color:#9CA3AF;margin-left:2px;}
            .card.green{background:#F0FDF4;border-color:#BBF7D0;}.card.green .value{color:#059669;}
            .card.blue{background:#EFF6FF;border-color:#BFDBFE;}.card.blue .value{color:#1D4ED8;}
            .card.purple{background:#F5F3FF;border-color:#DDD6FE;}.card.purple .value{color:#7C3AED;}
            .card.gray{background:#F9FAFB;}.card.gray .value{color:#374151;}
            .section-title{font-size:11px;font-weight:800;color:#111;margin:16px 0 7px;padding-bottom:4px;border-bottom:2px solid #ECEDF1;text-transform:uppercase;letter-spacing:0.05em;}
            table{border-collapse:collapse;width:100%;margin-bottom:4px;}
            th{background:#111827;color:#fff;text-align:left;padding:6px 10px;font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;}
            th.r{text-align:right;}
            td{padding:5px 10px;border-bottom:1px solid #F3F4F6;font-size:11px;}
            td.r{text-align:right;font-weight:600;}
            td.blue{color:#1D4ED8;}
            tr.subtotal td{background:#F0FDF4;font-weight:700;color:#059669;}
            .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ECEDF1;font-size:9px;color:#9CA3AF;display:flex;justify-content:space-between;}
            @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
        </style>
        </head><body>
        <div class="page-header">
            <div style="display:flex;align-items:center;gap:14px">
                <div style="background:#10B981;border-radius:8px;padding:6px 14px;font-size:15px;font-weight:900;color:#fff;letter-spacing:0.05em">ELÁSTICO</div>
                <div><div class="titulo">Relatório Elástico — ${MESES[mes]} ${ano}</div><div class="sub">Relatório de Produção</div></div>
            </div>
            <div class="emp">FourTEX — Indústria Têxtil</div>
        </div>
        <div class="content">
            ${resumoHtml}${compHtml}${defeitosHtml}${porCorHtml}${detHtml}
            <div class="footer"><span>Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span><span>FourTEX — Sistema de Controle de Produção</span></div>
        </div>
        <script>window.onload=()=>window.print();</script></body></html>`);
        w.document.close();
    };

    return (
        <div style={{ padding: 24 }}>

            <div style={{ background: "#fff", border: `1.5px solid ${isPrimeiro ? COLOR : "#ECEDF1"}`, borderRadius: 14, overflow: "hidden" }}>
                {/* Cabeçalho */}
                <div onClick={() => setAberto(v => !v)} style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: aberto ? "1px solid #F3F4F6" : "none", background: aberto ? "#fff" : "#FAFAFA" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: COLOR, display: "flex" }}>
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Relatório Mensal</span>
                        {isPrimeiro && <span style={{ fontSize: 11, fontWeight: 700, background: COLOR, color: "#fff", borderRadius: 20, padding: "2px 8px" }}>NOVO</span>}
                        <span style={{ fontSize: 13, color: "#6B7280" }}>{MESES[mes]} {ano}</span>
                        {!aberto && logsDoMes.length > 0 && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{logsDoMes.length} lançamentos</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                        <select value={mes} onChange={e => setMes(Number(e.target.value))} style={selStyle}>
                            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ ...selStyle, width: 80 }}>
                            {[ano - 1, ano, ano + 1].map(y => <option key={y}>{y}</option>)}
                        </select>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>{aberto ? "▲" : "▼"}</span>
                    </div>
                </div>

                {aberto && (
                    <div style={{ padding: 20 }}>
                        {logsDoMes.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "32px", color: "#9CA3AF", fontSize: 13 }}>Nenhum lançamento de Elástico em {MESES[mes]} {ano}.</div>
                        ) : (<>
                            {/* Cards resumo */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 10 }}>
                                {[
                                    { label: "Total RL",     value: totalRL.toLocaleString("pt-BR"),                                   unit: "RL",   color: COLOR },
                                    { label: "Metros lanç.", value: totalMetros.toLocaleString("pt-BR"),                                unit: "m",    color: "#7C3AED" },
                                    { label: "Total Metros", value: ((totalRL * 25) + totalMetros).toLocaleString("pt-BR"),             unit: "m",    color: "#0891B2" },
                                    { label: "Peso Total",   value: totalKg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: "kg", color: "#374151" },
                                ].map(c => (
                                    <div key={c.label} style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, padding: "12px 14px" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>{c.label.toUpperCase()}</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>{c.unit}</span></div>
                                    </div>
                                ))}
                                {/* Dias Trab. + Lançamentos */}
                                <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 16, alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>DIAS TRAB.</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: "#CA8A04", marginTop: 2 }}>{diasTrab} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>dias</span></div>
                                    </div>
                                    <div style={{ borderLeft: "1px solid #ECEDF1", paddingLeft: 16 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>LANÇ.</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: "#6B7280", marginTop: 2 }}>{logsDoMes.length}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Cards kg borracha/poliéster */}
                            {totalKg > 0 && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                    <div style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 10, padding: "12px 14px" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>BORRACHA (33%)</div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: "#C2410C", marginTop: 4 }}>{kgBorracha.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>kg</span></div>
                                    </div>
                                    <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 14px" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>FIO POLIÉSTER (67%)</div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: "#1D4ED8", marginTop: 4 }}>{kgPoliester.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>kg</span></div>
                                    </div>
                                </div>
                            )}
                            {/* Comparação com mês anterior */}
                            {(() => {
                                const delta = (atual, prev) => {
                                    if (!prev) return null;
                                    const pct = Math.round(((atual - prev) / prev) * 100);
                                    return pct;
                                };
                                const fmt = (v, dec = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
                                const DeltaBadge = ({ atual, prev, inverso = false }) => {
                                    const pct = delta(atual, prev);
                                    if (pct === null || pct === 0) return <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>;
                                    const positivo = inverso ? pct < 0 : pct > 0;
                                    return (
                                        <span style={{ fontSize: 11, fontWeight: 700, color: positivo ? "#16A34A" : "#DC2626", background: positivo ? "#F0FDF4" : "#FEF2F2", borderRadius: 6, padding: "1px 6px" }}>
                                            {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%
                                        </span>
                                    );
                                };
                                const ult = mesesComparacao.length - 1;
                                const anterior = mesesComparacao[ult - 1];
                                const th = { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" };
                                return (
                                    <div style={{ border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
                                        <div style={{ overflowX: "auto" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr style={{ background: "#111827" }}>
                                                        <th style={{ ...th, textAlign: "left" }}>COMPARAÇÃO</th>
                                                        {mesesComparacao.map((c, i) => (
                                                            <th key={`${c.ano}-${c.mes}`} style={{ ...th, color: i === ult ? "#fff" : "#9CA3AF" }}>{MESES[c.mes].slice(0, 3).toUpperCase()} {c.ano}</th>
                                                        ))}
                                                        <th style={th}>VAR. vs {MESES[anterior.mes].slice(0, 3).toUpperCase()}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {LINHAS_COMPARACAO.map((l, i) => {
                                                        const atual = mesesComparacao[ult][l.key];
                                                        return (
                                                            <tr key={l.label} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: i < LINHAS_COMPARACAO.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                                                <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{l.label}</td>
                                                                {mesesComparacao.map((c, j) => {
                                                                    const v = c[l.key];
                                                                    return (
                                                                        <td key={j} style={{ padding: "8px 10px", fontSize: 12, fontWeight: j === ult ? 700 : 400, color: j === ult ? "#111827" : "#9CA3AF", whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums", background: j === ult ? `${COLOR}0D` : undefined }}>
                                                                            {v ? <>{fmt(v, l.dec || 0)} <span style={{ fontSize: 10, color: "#9CA3AF" }}>{l.unit}</span></> : "—"}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>{atual ? <DeltaBadge atual={atual} prev={anterior[l.key]} inverso={l.inverso} /> : <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {totalDefeitosKg > 0 && (
                                <div style={{ background: "#FEF9C3", border: "1.5px solid #FDE047", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", letterSpacing: "0.05em", marginBottom: 8 }}>⚠ DEFEITOS DO MÊS</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF" }}>TOTAL DESCARTADO</div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#92400E", marginTop: 2 }}>{totalDefeitosKg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>kg</span></div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF" }}>BORRACHA PERDIDA (33%)</div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#C2410C", marginTop: 2 }}>{defeitosBorracha.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>kg</span></div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF" }}>POLIÉSTER PERDIDO (67%)</div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#1D4ED8", marginTop: 2 }}>{defeitosPoliester.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>kg</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Por cor + Detalhe por medida */}
                            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12, alignItems: "start" }}>
                            <div style={{ gridColumn: "1 / -1", background: "#fff", border: "1.5px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                                <div style={{ padding: "10px 14px", background: "#111827", fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "0.06em" }}>POR COR</div>
                                <div style={{ overflowX: "auto" }}>
                                    {(() => {
                                        const fmtKg2 = v => v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
                                        const th = (cor, left) => ({ padding: "9px 14px", fontSize: 10.5, fontWeight: 700, color: cor, letterSpacing: "0.05em", whiteSpace: "nowrap", textAlign: left ? "left" : "right", background: "#1F2937" });
                                        const td = (cor, peso, left) => ({ padding: "11px 14px", fontSize: 14, fontWeight: peso, color: cor, whiteSpace: "nowrap", textAlign: left ? "left" : "right", fontVariantNumeric: "tabular-nums" });
                                        const totRL = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].rl, 0);
                                        const totM  = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].metros, 0);
                                        const totKg = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].kg, 0);
                                        const totMtotal = (totRL * 25) + totM;
                                        return (
                                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr>
                                                        <th style={th("#9CA3AF", true)}>COR</th>
                                                        <th style={th("#9CA3AF")}>ROLOS</th>
                                                        <th style={th("#9CA3AF")}>METROS</th>
                                                        <th style={th("#9CA3AF")}>TOTAL (m)</th>
                                                        <th style={{ ...th("#9CA3AF", true), minWidth: 120 }}>% DA PRODUÇÃO</th>
                                                        <th style={th("#9CA3AF")}>PESO (kg)</th>
                                                        <th style={th("#FED7AA")}>BORRACHA (kg)</th>
                                                        <th style={th("#BFDBFE")}>FIO (kg)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {coresOrdenadas.map((cor, i) => {
                                                        const g = porCorGrupo[cor];
                                                        const totalCor = (g.rl * 25) + g.metros;
                                                        const pct = totMtotal > 0 ? (totalCor / totMtotal) * 100 : 0;
                                                        return (
                                                            <tr key={cor} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                                                                <td style={td("#111827", 700, true)}>
                                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                                                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: COR_HEX[cor] || "#D1D5DB", border: "1px solid #D1D5DB", flexShrink: 0 }} />
                                                                        {cor}
                                                                    </span>
                                                                </td>
                                                                <td style={td(COLOR, 700)}>{g.rl.toLocaleString("pt-BR")}</td>
                                                                <td style={td(g.metros > 0 ? "#7C3AED" : "#D1D5DB", 600)}>{g.metros > 0 ? g.metros.toLocaleString("pt-BR") : "—"}</td>
                                                                <td style={td("#0891B2", 800)}>{totalCor.toLocaleString("pt-BR")}</td>
                                                                <td style={td("#374151", 600, true)}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                        <div style={{ flex: 1, minWidth: 60, height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                                                                            <div style={{ width: `${pct}%`, height: "100%", background: "#0891B2", borderRadius: 4 }} />
                                                                        </div>
                                                                        <span style={{ fontSize: 12, color: "#6B7280", minWidth: 38, textAlign: "right" }}>{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
                                                                    </div>
                                                                </td>
                                                                <td style={td("#374151", 600)}>{fmtKg2(g.kg)}</td>
                                                                <td style={td("#C2410C", 700)}>{fmtKg2(g.kg * 0.33)}</td>
                                                                <td style={td("#1D4ED8", 700)}>{fmtKg2(g.kg * 0.67)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    <tr style={{ background: "#111827" }}>
                                                        <td style={td("#fff", 800, true)}>TOTAL</td>
                                                        <td style={td(COLOR, 800)}>{totRL.toLocaleString("pt-BR")}</td>
                                                        <td style={td(totM > 0 ? "#C4B5FD" : "#9CA3AF", 800)}>{totM > 0 ? totM.toLocaleString("pt-BR") : "—"}</td>
                                                        <td style={td("#67E8F9", 800)}>{totMtotal.toLocaleString("pt-BR")}</td>
                                                        <td style={td("#9CA3AF", 700, true)}>100%</td>
                                                        <td style={td("#fff", 800)}>{fmtKg2(totKg)}</td>
                                                        <td style={td("#FED7AA", 800)}>{fmtKg2(totKg * 0.33)}</td>
                                                        <td style={td("#BFDBFE", 800)}>{fmtKg2(totKg * 0.67)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div style={{ background: "#F0FDF4", border: `1.5px solid ${COLOR}25`, borderRadius: 10, overflow: "hidden" }}>
                                <div style={{ padding: "6px 10px", borderBottom: `1px solid ${COLOR}20`, fontSize: 10, fontWeight: 700, color: COLOR, letterSpacing: "0.06em" }}>ELÁSTICO — DETALHAMENTO</div>
                                <div style={{ overflowX: "auto" }}>
                                    <div style={{ minWidth: 285 }}>
                                        {/* Cabeçalho colunas */}
                                        <div style={{ display: "grid", gridTemplateColumns: "90px 55px 65px 75px", gap: 0, background: "#047857" }}>
                                            <span style={{ padding: "5px 7px", fontSize: 9, fontWeight: 700, color: "#A7F3D0", letterSpacing: "0.05em", whiteSpace: "nowrap", borderRight: `1px solid ${COLOR}50` }}>COR</span>
                                            <span style={{ padding: "5px 7px", fontSize: 9, fontWeight: 700, color: "#A7F3D0", letterSpacing: "0.05em", whiteSpace: "nowrap", textAlign: "right", borderRight: `1px solid ${COLOR}50` }}>ROLOS</span>
                                            <span style={{ padding: "5px 7px", fontSize: 9, fontWeight: 700, color: "#A7F3D0", letterSpacing: "0.05em", whiteSpace: "nowrap", textAlign: "right", borderRight: `1px solid ${COLOR}50` }}>METROS</span>
                                            <span style={{ padding: "5px 7px", fontSize: 9, fontWeight: 700, color: "#A7F3D0", letterSpacing: "0.05em", whiteSpace: "nowrap", textAlign: "right" }}>TOTAL (m)</span>
                                        </div>
                                        {medidasOrdenadas.map(medida => {
                                            const itensMedida = porMedida[medida].sort((a, b) => b.rl - a.rl);
                                            const subRL = itensMedida.reduce((s, v) => s + v.rl, 0);
                                            const subM = itensMedida.reduce((s, v) => s + v.metros, 0);
                                            const subTotal = (subRL * 25) + subM;
                                            return (
                                                <div key={medida}>
                                                    <div style={{ display: "grid", gridTemplateColumns: "90px 55px 65px 75px", gap: 0, background: "#ECFDF5", borderBottom: "1px solid #D1FAE5" }}>
                                                        <span style={{ padding: "4px 7px", fontSize: 11, fontWeight: 800, color: COLOR, whiteSpace: "nowrap", borderRight: "1px solid #D1FAE5" }}>{medida}</span>
                                                        <span style={{ padding: "4px 7px", fontSize: 11, fontWeight: 700, color: COLOR, whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #D1FAE5" }}>{subRL.toLocaleString("pt-BR")}</span>
                                                        <span style={{ padding: "4px 7px", fontSize: 11, fontWeight: 700, color: "#7C3AED", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #D1FAE5" }}>{subM > 0 ? subM.toLocaleString("pt-BR") : "—"}</span>
                                                        <span style={{ padding: "4px 7px", fontSize: 11, fontWeight: 800, color: "#0891B2", whiteSpace: "nowrap", textAlign: "right" }}>{subTotal.toLocaleString("pt-BR")}</span>
                                                    </div>
                                                    {itensMedida.map((v, i) => (
                                                        <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 55px 65px 75px", gap: 0, background: i % 2 === 0 ? "#fff" : "#F0FDF4", borderBottom: "1px solid #F0FDF4" }}>
                                                            <span style={{ padding: "3px 7px 3px 14px", fontSize: 11, color: "#374151", whiteSpace: "nowrap", borderRight: "1px solid #D1FAE5" }}>{v.cor}</span>
                                                            <span style={{ padding: "3px 7px", fontSize: 11, fontWeight: 600, color: COLOR, whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #D1FAE5" }}>{v.rl.toLocaleString("pt-BR")}</span>
                                                            <span style={{ padding: "3px 7px", fontSize: 11, fontWeight: 600, color: v.metros > 0 ? "#7C3AED" : "#D1D5DB", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #D1FAE5" }}>{v.metros > 0 ? v.metros.toLocaleString("pt-BR") : "—"}</span>
                                                            <span style={{ padding: "3px 7px", fontSize: 11, fontWeight: 700, color: "#0891B2", whiteSpace: "nowrap", textAlign: "right" }}>{((v.rl * 25) + v.metros).toLocaleString("pt-BR")}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            </div>

                            {/* Botões */}
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <button onClick={handleCSV} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 8, cursor: "pointer" }}>↓ Exportar CSV</button>
                                <button onClick={handlePrint} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, cursor: "pointer" }}>🖨 Imprimir</button>
                            </div>
                        </>)}
                    </div>
                )}
            </div>
        </div>
    );
}
