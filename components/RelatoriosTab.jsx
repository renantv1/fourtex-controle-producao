import { useState, useEffect, useMemo } from "react";
import { formatDate } from "../utils";


function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

function exportCSV(filename, headers, rows) {
    const bom = "\uFEFF";
    const lines = [headers.join(";"), ...rows.map(r => r.join(";"))];
    const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function printHTML(title, html) {
    const w = window.open("", "_blank", "width=960,height=700");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px 28px; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #F97316; padding-bottom: 10px; margin-bottom: 18px; }
        .report-header .brand { font-size: 20px; font-weight: 900; color: #111; letter-spacing: -0.5px; }
        .report-header .brand span { color: #F97316; }
        .report-header .report-title { font-size: 13px; font-weight: 700; color: #374151; text-align: right; }
        .report-header .report-sub { font-size: 11px; color: #9CA3AF; margin-top: 2px; text-align: right; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
        .summary-card { background: #F9FAFB; border: 1px solid #ECEDF1; border-radius: 6px; padding: 9px 12px; }
        .summary-card .label { font-size: 9px; font-weight: 700; color: #9CA3AF; letter-spacing: .06em; text-transform: uppercase; }
        .summary-card .value { font-size: 17px; font-weight: 800; color: #111; margin-top: 3px; }
        .summary-card .unit { font-size: 10px; font-weight: 500; color: #9CA3AF; margin-left: 2px; }
        h3 { font-size: 12px; font-weight: 800; color: #F97316; text-transform: uppercase; letter-spacing: .06em; margin: 18px 0 6px; border-bottom: 1.5px solid #FED7AA; padding-bottom: 4px; }
        h4 { font-size: 11px; font-weight: 700; color: #374151; margin: 10px 0 3px; background: #F3F4F6; padding: 4px 8px; border-left: 3px solid #F97316; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
        th { background: #F3F4F6; text-align: left; padding: 6px 10px; border: 1px solid #ECEDF1; font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
        td { padding: 6px 10px; border: 1px solid #ECEDF1; font-size: 12px; white-space: nowrap; }
        tr:nth-child(even) td { background: #F9FAFB; }
        tr.subtotal td { background: #FFF7ED; font-weight: 700; color: #C2410C; border-top: 1.5px solid #FED7AA; }
        tr.total-row td { background: #1F2937; color: #fff; font-weight: 800; font-size: 12px; }
        .footer { margin-top: 24px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #ECEDF1; padding-top: 8px; display: flex; justify-content: space-between; }
        @media print {
            body { padding: 10px 16px; }
            @page { margin: 12mm 10mm; size: A4 portrait; }
        }
    </style></head><body>
    <div class="report-header">
        <div class="brand">Four<span>TEX</span></div>
        <div>
            <div class="report-title">${title}</div>
            <div class="report-sub">Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
        </div>
    </div>
    ${html}
    <div class="footer"><span>FourTEX — Indústria Têxtil</span><span>${title}</span></div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    w.document.close();
}

const selStyle   = { height: 32, padding: "0 8px", fontSize: 12, border: "1px solid #ECEDF1", borderRadius: 6, background: "#F9FAFB", color: "#374151", cursor: "pointer" };
const txtStyle   = { ...selStyle, padding: "0 8px", width: 140 };
const dateStyle  = { ...selStyle, width: 130 };

const parseDate = (s) => {
    if (!s || typeof s !== "string") return null;
    if (s.includes("/")) { const [d, m, y] = s.split("/"); return new Date(`${y}-${m}-${d}`); }
    return new Date(s);
};

function btnFilter(active, hasFilters) {
    return {
        padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer", border: "1px solid",
        background: active ? "#FFF7ED" : hasFilters ? "#FFF7ED" : "#F9FAFB",
        color: active ? "#EA580C" : hasFilters ? "#F97316" : "#6B7280",
        borderColor: active ? "#FDBA74" : hasFilters ? "#FED7AA" : "#ECEDF1",
    };
}

function CardHeader({ title, icon, filteredLen, totalLen, showFilters, setShowFilters, hasFilters, onCSV, onPrint, isMobile, isOpen, onToggle }) {
    return (
        <div style={{ padding: isMobile ? "12px 14px" : "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: isOpen ? "1px solid #F3F4F6" : "none", cursor: "pointer", background: isOpen ? "#fff" : "#FAFAFA" }} onClick={onToggle}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {icon && <span style={{ color: "#F97316", display: "flex" }}>{icon}</span>}
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</span>
                {isOpen && filteredLen !== totalLen ? (
                    <span style={{ fontSize: 11, fontWeight: 600, background: "#FFF7ED", color: "#EA580C", border: "1px solid #FED7AA", borderRadius: 20, padding: "1px 8px" }}>{filteredLen}/{totalLen}</span>
                ) : !isOpen && totalLen > 0 ? (
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>{totalLen} registros</span>
                ) : null}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isOpen && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowFilters(v => !v)} style={btnFilter(showFilters, hasFilters)}>
                            {showFilters ? "▲ Filtros" : "▼ Filtros"}{hasFilters ? " •" : ""}
                        </button>
                        <button onClick={onCSV} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 6, cursor: "pointer" }}>↓ CSV</button>
                        {!isMobile && onPrint && <button onClick={onPrint} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 6, cursor: "pointer" }}>🖨 Imprimir</button>}
                    </div>
                )}
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{isOpen ? "▲" : "▼"}</span>
            </div>
        </div>
    );
}

function FilterPanel({ visible, children }) {
    if (!visible) return null;
    return (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #F3F4F6", background: "#FAFAFA", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {children}
        </div>
    );
}

function SortableTable({ headers, rows, numericCols = [], pctCols = [], dateCols = [], isMobile, mobileLimit = 4, maxRows = 50 }) {
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState("asc");

    const handleSort = (idx) => {
        if (sortCol === idx) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortCol(idx); setSortDir("asc"); }
    };

    const sorted = useMemo(() => {
        if (sortCol === null) return rows;
        return [...rows].sort((a, b) => {
            let va = a[sortCol], vb = b[sortCol];
            if (pctCols.includes(sortCol))     { va = parseFloat(va); vb = parseFloat(vb); }
            else if (numericCols.includes(sortCol)) { va = Number(va); vb = Number(vb); }
            else if (dateCols.includes(sortCol)) { va = parseDate(va) || 0; vb = parseDate(vb) || 0; }
            else { va = String(va || "").toLowerCase(); vb = String(vb || "").toLowerCase(); }
            if (va < vb) return sortDir === "asc" ? -1 : 1;
            if (va > vb) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [rows, sortCol, sortDir]);

    const visH = isMobile ? headers.slice(0, mobileLimit) : headers;
    const visR = isMobile ? sorted.map(r => r.slice(0, mobileLimit)) : sorted;
    const shown = visR.slice(0, maxRows);

    if (!rows.length) return <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "24px 0" }}>Nenhum registro encontrado.</div>;

    return (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 11 : 12 }}>
                <thead>
                    <tr>
                        {visH.map((h, idx) => {
                            const active = sortCol === idx;
                            return (
                                <th key={idx} onClick={() => handleSort(idx)} style={{
                                    background: active ? "#FFF7ED" : "#F9FAFB",
                                    padding: isMobile ? "7px 8px" : "8px 12px",
                                    textAlign: "left",
                                    borderBottom: `2px solid ${active ? "#F97316" : "#ECEDF1"}`,
                                    fontSize: isMobile ? 10 : 11,
                                    fontWeight: 700,
                                    color: active ? "#F97316" : "#6B7280",
                                    letterSpacing: "0.05em",
                                    whiteSpace: "nowrap",
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}>
                                    {h} {active ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {shown.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                            {row.map((cell, j) => (
                                <td key={j} style={{ padding: isMobile ? "6px 8px" : "7px 12px", borderBottom: "1px solid #F3F4F6", color: "#374151", whiteSpace: "nowrap" }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {sorted.length > maxRows && (
                <div style={{ padding: "8px 12px", fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>
                    Mostrando {maxRows} de {sorted.length} — exporte CSV para ver tudo
                </div>
            )}
            {isMobile && headers.length > mobileLimit && (
                <div style={{ padding: "6px 12px", fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>Exporte CSV para ver todas as colunas</div>
            )}
        </div>
    );
}

// ── Pedidos ───────────────────────────────────────────────────────────────────
// ── Lançamentos ───────────────────────────────────────────────────────────────
// ── Estoque ───────────────────────────────────────────────────────────────────
// ── Relatório Mensal ──────────────────────────────────────────────────────────
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TIPO_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };
const TIPO_BG    = { Gorgurão: "#FFF7ED", Poliéster: "#EEF2FF", Elástico: "#F0FDF4" };

// Extrai data de qualquer formato de timestamp dd/mm/yyyy ou dd/mm/yyyy, HH:MM
const parseTsGorg = ts => {
    if (!ts) return null;
    const m = String(ts).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
    return new Date(ts);
};

function RelatorioMensalGorgurao({ logs, turnoFinalizacoes = [] }) {
    const isMobile = useIsMobile();
    const hoje = new Date();
    const isPrimeiro = hoje.getDate() === 1;
    const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

    const [ano, setAno]     = useState(mesRef.getFullYear());
    const [mes, setMes]     = useState(mesRef.getMonth());
    const [aberto, setAberto] = useState(isPrimeiro);

    const KG_RL = { "8mm":0.150,"12mm":0.262,"14mm":0.305,"15mm":0.327,"16mm":0.349,"20mm":0.436,"22mm":0.498,"25mm":0.557,"30mm":0.680,"35mm":0.764,"40mm":0.873,"50mm":1.091 };

    // ── Mês atual ──────────────────────────────────────────────────────────────
    const logsDoMes = useMemo(() => logs.filter(l => {
        if (!l.timestamp) return false;
        const d = parseTsGorg(l.timestamp);
        return d && !isNaN(d) && d.getFullYear() === ano && d.getMonth() === mes;
    }), [logs, ano, mes]);

    const logsGorg = logsDoMes.filter(l => l.tipo === "Gorgurão");
    const totalRL     = logsGorg.reduce((s, l) => s + (Number(l.qtd) || 0), 0);
    const totalKgGorg = logsGorg.reduce((s, l) => s + (Number(l.qtd) || 0) * (KG_RL[l.medida] || 0), 0);

    const finalizacoesDoMes = useMemo(() => turnoFinalizacoes.filter(f => {
        if (!f.inicio) return false;
        const d = new Date(f.inicio);
        return d.getFullYear() === ano && d.getMonth() === mes;
    }), [turnoFinalizacoes, ano, mes]);

    // Conta dias únicos pelas finalizações de turno (mais preciso que contar pelos lançamentos)
    const diasTrabFin = new Set(finalizacoesDoMes.map(f => {
        const d = new Date(f.inicio);
        return `${d.getDate()}-${d.getMonth()}-${d.getFullYear()}`;
    })).size;
    const diasTrab = diasTrabFin > 0 ? diasTrabFin : new Set(logsDoMes.map(l => l.timestamp?.split(",")[0])).size;

    const totalDefeitos = finalizacoesDoMes.reduce((s, f) => {
        if (!f.defeitos) return s;
        return s + Object.values(f.defeitos).reduce((a, v) => a + Number(v || 0), 0);
    }, 0);

    // Defeitos por cor (chave "Cor_Tipo")
    const defeitosPorCor = {};
    finalizacoesDoMes.forEach(f => {
        if (!f.defeitos) return;
        Object.entries(f.defeitos).forEach(([chave, val]) => {
            const cor = chave.split("_").slice(0, -1).join("_") || chave;
            defeitosPorCor[cor] = (defeitosPorCor[cor] || 0) + Number(val || 0);
        });
    });

    // kg por cor Gorgurão (para % defeito)
    const kgPorCorDef = {};
    logsGorg.forEach(l => {
        const c = l.cor || "—";
        kgPorCorDef[c] = (kgPorCorDef[c] || 0) + (Number(l.qtd) || 0) * (KG_RL[l.medida] || 0);
    });
    // "Cores" agrupa tudo que não é Preto/Branco
    kgPorCorDef["Cores"] = Object.entries(kgPorCorDef)
        .filter(([c]) => c !== "Preto" && c !== "Branco")
        .reduce((s, [, v]) => s + v, 0);

    // ── Comparação: os 3 meses anteriores + o mês selecionado (do mais antigo ao atual) ──
    const mesesComparacao = useMemo(() => [3, 2, 1, 0].map(n => {
        const r = new Date(ano, mes - n, 1);
        const a = r.getFullYear(), m = r.getMonth();
        const gorg = logs.filter(l => {
            if (l.tipo !== "Gorgurão" || !l.timestamp) return false;
            const d = parseTsGorg(l.timestamp);
            return d && !isNaN(d) && d.getFullYear() === a && d.getMonth() === m;
        });
        const rl = gorg.reduce((s, l) => s + (Number(l.qtd) || 0), 0);
        const kg = gorg.reduce((s, l) => s + (Number(l.qtd) || 0) * (KG_RL[l.medida] || 0), 0);
        const defeitos = turnoFinalizacoes
            .filter(f => { if (!f.inicio) return false; const d = new Date(f.inicio); return d.getFullYear() === a && d.getMonth() === m; })
            .reduce((s, f) => s + (f.defeitos ? Object.values(f.defeitos).reduce((x, v) => x + Number(v || 0), 0) : 0), 0);
        return { ano: a, mes: m, rl, kg, defeitos };
    }), [logs, turnoFinalizacoes, ano, mes]);
    const LINHAS_COMPARACAO = [
        { label: "Total RL",    key: "rl",       unit: "RL" },
        { label: "KG Gorgurão", key: "kg",       unit: "kg", dec: 2 },
        { label: "Defeitos",    key: "defeitos", unit: "kg", dec: 2, inverso: true },
    ];

    // ── Por Cor Gorgurão ───────────────────────────────────────────────────────
    const porCorGrupo = {};
    logsGorg.forEach(l => {
        const c = l.cor || "—";
        if (!porCorGrupo[c]) porCorGrupo[c] = { rl: 0, kg: 0 };
        porCorGrupo[c].rl += Number(l.qtd) || 0;
        porCorGrupo[c].kg += (Number(l.qtd) || 0) * (KG_RL[l.medida] || 0);
    });
    const coresOrdenadas = Object.keys(porCorGrupo).sort((a, b) => {
        const ord = c => c.toLowerCase() === "preto" ? 0 : c.toLowerCase() === "branco" ? 1 : 2;
        return ord(a) !== ord(b) ? ord(a) - ord(b) : porCorGrupo[b].rl - porCorGrupo[a].rl;
    });

    // Média kg por rolo (Gorgurão)
    const avgKgRolo = totalRL > 0 ? totalKgGorg / totalRL : 0;

    // ── Por Turno ─────────────────────────────────────────────────────────────
    const porTurno = {};
    logsGorg.forEach(l => {
        const t = `T${l.turno || "—"}`;
        if (!porTurno[t]) porTurno[t] = { rl: 0, kg: 0, count: 0 };
        porTurno[t].rl    += Number(l.qtd) || 0;
        porTurno[t].kg    += (Number(l.qtd) || 0) * (KG_RL[l.medida] || 0);
        porTurno[t].count += 1;
    });

    // ── Detalhamento Gorgurão por medida → cor ─────────────────────────────────
    const porMedidaCor = {};
    logsGorg.forEach(l => {
        const key = `${l.medida || "—"}|${l.cor || "—"}`;
        if (!porMedidaCor[key]) porMedidaCor[key] = { medida: l.medida || "—", cor: l.cor || "—", rl: 0, kg: 0 };
        porMedidaCor[key].rl += Number(l.qtd) || 0;
        porMedidaCor[key].kg += Number(l.peso) || 0;
    });
    const porMedida = {};
    Object.values(porMedidaCor).forEach(v => { if (!porMedida[v.medida]) porMedida[v.medida] = []; porMedida[v.medida].push(v); });
    const medidasOrdenadas = Object.keys(porMedida).sort((a, b) => parseFloat(a) - parseFloat(b));

    // ── Tabela de defeitos ────────────────────────────────────────────────────
    const tabelaDefeitos = Object.entries(defeitosPorCor)
        .filter(([, v]) => v > 0)
        .map(([cor, defKg]) => {
            const prodKg = kgPorCorDef[cor] || 0;
            const pct = prodKg > 0 ? ((defKg / prodKg) * 100).toFixed(2) : "—";
            return { cor, defKg, prodKg, pct };
        })
        .sort((a, b) => {
            const ord = c => c.toLowerCase() === "preto" ? 0 : c.toLowerCase() === "branco" ? 1 : c.toLowerCase() === "cores" ? 2 : 3;
            return ord(a.cor) !== ord(b.cor) ? ord(a.cor) - ord(b.cor) : b.defKg - a.defKg;
        });

    const fmtN  = v => Number(v).toLocaleString("pt-BR");
    const fmtKg = v => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const DeltaBadge = ({ atual, prev, inverso = false }) => {
        if (!prev) return <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>;
        const pct = Math.round(((atual - prev) / prev) * 100);
        if (pct === 0) return <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>;
        const pos = inverso ? pct < 0 : pct > 0;
        return <span style={{ color: pos ? "#16A34A" : "#DC2626", fontWeight: 700, fontSize: 11 }}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
    };

    const handleCSV = () => {
        const rows = logsDoMes.map(l => [l.timestamp||"—",`T${l.turno}`,l.tipo,l.medida,l.cor,l.qtd||0,l.peso?Number(l.peso).toFixed(2):0,l.operador||"—"]);
        exportCSV(`relatorio_${MESES[mes].toLowerCase()}_${ano}.csv`, ["Data/Hora","Turno","Tipo","Medida","Cor","RL","Kg","Operador"], rows);
    };

    const handlePrint = () => {
        const fn  = v => Number(v).toLocaleString("pt-BR");
        const fk  = v => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const delta = (a, p, inv = false) => {
            if (!p) return "<span style='color:#9CA3AF'>—</span>";
            const pct = Math.round(((a - p) / p) * 100);
            if (pct === 0) return "<span style='color:#9CA3AF'>—</span>";
            const pos = inv ? pct < 0 : pct > 0;
            return `<span style="color:${pos?"#16A34A":"#DC2626"};font-weight:700">${pct>0?"▲":"▼"} ${Math.abs(pct)}%</span>`;
        };

        const resumoHtml = `<div class="cards4">
            <div class="card orange"><div class="label">Total RL</div><div class="value">${fn(totalRL)}<span class="unit">RL</span></div></div>
            <div class="card orange"><div class="label">KG Gorgurão</div><div class="value">${fk(totalKgGorg)}<span class="unit">kg</span></div><div style="font-size:10px;color:#9CA3AF;margin-top:2px;">${fk(avgKgRolo)} kg/RL</div></div>
            <div class="card red"><div class="label">Defeitos</div><div class="value">${fk(totalDefeitos)}<span class="unit">kg</span></div></div>
            <div class="card gray"><div class="label">Dias Trab.</div><div class="value">${diasTrab}<span class="unit">dias</span> <span style="font-size:11px;color:#6B7280">${logsDoMes.length} lanç.</span></div></div>
        </div>`;

        const ultCmp = mesesComparacao.length - 1;
        const anteriorCmp = mesesComparacao[ultCmp - 1];
        const fmtCmp = (v, l) => v ? `${l.dec ? fk(v) : fn(v)} ${l.unit}` : "—";
        const compHtml = `<div class="section-title">Comparação com os 3 meses anteriores</div>
        <table><thead><tr><th>Métrica</th>${mesesComparacao.map(c => `<th class="r">${MESES[c.mes]} ${c.ano}</th>`).join("")}<th class="r">Var. vs ${MESES[anteriorCmp.mes]}</th></tr></thead><tbody>
            ${LINHAS_COMPARACAO.map(l => `<tr><td>${l.label}</td>${mesesComparacao.map((c, i) => i === ultCmp
                ? `<td class="r"><strong>${fmtCmp(c[l.key], l)}</strong></td>`
                : `<td class="r">${fmtCmp(c[l.key], l)}</td>`).join("")}<td class="r">${mesesComparacao[ultCmp][l.key] ? delta(mesesComparacao[ultCmp][l.key], anteriorCmp[l.key], l.inverso) : "—"}</td></tr>`).join("")}
        </tbody></table>`;

        const defRows = tabelaDefeitos.map(r =>
            `<tr><td><strong>${r.cor}</strong></td><td class="r">${r.prodKg>0?fk(r.prodKg)+" kg":"—"}</td><td class="r" style="color:#DC2626;font-weight:700">${fk(r.defKg)} kg</td><td class="r" style="font-weight:700;color:${Number(r.pct)>5?"#DC2626":Number(r.pct)>2?"#F97316":"#16A34A"}">${r.pct!=="—"?r.pct+"%":"—"}</td></tr>`
        ).join("");
        const defHtml = tabelaDefeitos.length > 0 ? `
        <div class="section-title" style="color:#92400E">⚠ Defeitos do Mês</div>
        <table><thead><tr><th>Cor</th><th class="r">Produzido (kg)</th><th class="r">Defeito (kg)</th><th class="r">% Defeito</th></tr></thead><tbody>
        ${defRows}
        <tr style="background:#FEE2E2;border-top:2px solid #DC2626">
            <td style="font-weight:800;color:#7F1D1D">Total Geral</td>
            <td class="r" style="color:#7F1D1D;font-weight:700">${fk(tabelaDefeitos.reduce((s,r)=>s+r.prodKg,0))} kg</td>
            <td class="r" style="color:#DC2626;font-weight:800">${fk(totalDefeitos)} kg</td>
            <td class="r"></td>
        </tr></tbody></table>` : "";

        const totCorRL = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].rl, 0);
        const totCorKg = coresOrdenadas.reduce((s, c) => s + porCorGrupo[c].kg, 0);
        const corHtml = `<div class="section-title">Por Cor — Gorgurão</div>
        <table><thead><tr><th>Cor</th><th class="r">Rolos (RL)</th><th class="r">Peso (kg)</th></tr></thead><tbody>
        ${coresOrdenadas.map(c => `<tr><td><strong>${c}</strong></td><td class="r">${fn(porCorGrupo[c].rl)}</td><td class="r">${fk(porCorGrupo[c].kg)} kg</td></tr>`).join("")}
        <tr style="background:#111827;color:#fff"><td style="font-weight:800;color:#fff">TOTAL</td><td style="text-align:right;color:#FB923C;font-weight:800">${fn(totCorRL)} RL</td><td style="text-align:right;font-weight:800">${fk(totCorKg)} kg</td></tr>
        </tbody></table>`;

        const detHtml = `<div class="section-title">Detalhamento por Medida</div>
        <table><thead><tr><th>Medida</th><th>Cor</th><th class="r">RL</th><th class="r">Peso (kg)</th><th class="r">kg/RL</th></tr></thead><tbody>
        ${medidasOrdenadas.map(medida => {
            const itens = porMedida[medida].sort((a,b) => b.rl - a.rl);
            const sRL = itens.reduce((s,v)=>s+v.rl,0), sKg = itens.reduce((s,v)=>s+v.kg,0);
            return `<tr class="subtotal"><td><strong>${medida}</strong></td><td>SUBTOTAL</td><td class="r">${fn(sRL)}</td><td class="r">${fk(sKg)} kg</td><td class="r">${sRL>0?(sKg/sRL).toFixed(3):"—"}</td></tr>`
                + itens.map(v=>`<tr><td></td><td>${v.cor}</td><td class="r">${fn(v.rl)}</td><td class="r">${fk(v.kg)} kg</td><td class="r">${v.rl>0?(v.kg/v.rl).toFixed(3):"—"}</td></tr>`).join("");
        }).join("")}
        </tbody></table>`;

        const w = window.open("","_blank","width=900,height=700");
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relatório Mensal — ${MESES[mes]} ${ano}</title>
        <style>
        *{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:12px;color:#111;}
        .page-header{background:#111827;color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:flex-end;}
        .page-header .titulo{font-size:18px;font-weight:800;}.page-header .sub{font-size:11px;color:#9CA3AF;margin-top:2px;}
        .page-header .emp{font-size:13px;font-weight:700;color:#FB923C;}
        .content{padding:20px 28px;}
        .cards4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
        .card{border-radius:9px;padding:11px 14px;border:1.5px solid #ECEDF1;}
        .card .label{font-size:8px;font-weight:700;letter-spacing:0.07em;color:#9CA3AF;margin-bottom:5px;text-transform:uppercase;}
        .card .value{font-size:19px;font-weight:800;line-height:1.1;}
        .card .unit{font-size:10px;font-weight:500;color:#9CA3AF;margin-left:2px;}
        .card.orange{background:#FFF7ED;border-color:#FED7AA;}.card.orange .value{color:#EA580C;}
        .card.indigo{background:#EEF2FF;border-color:#C7D2FE;}.card.indigo .value{color:#6366F1;}
        .card.red{background:#FFF5F5;border-color:#FECACA;}.card.red .value{color:#DC2626;}
        .card.gray{background:#F9FAFB;}.card.gray .value{color:#374151;}
        .section-title{font-size:11px;font-weight:800;color:#111;margin:16px 0 7px;padding-bottom:4px;border-bottom:2px solid #ECEDF1;text-transform:uppercase;letter-spacing:0.05em;}
        table{border-collapse:collapse;width:100%;margin-bottom:4px;}
        th{background:#111827;color:#fff;text-align:left;padding:6px 10px;font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;}
        th.r{text-align:right;}td{padding:5px 10px;border-bottom:1px solid #F3F4F6;font-size:11px;}td.r{text-align:right;font-weight:600;}
        tr.subtotal td{background:#FFF7ED;font-weight:700;color:#EA580C;}
        .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ECEDF1;font-size:9px;color:#9CA3AF;display:flex;justify-content:space-between;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
        </style></head><body>
        <div class="page-header">
            <div style="display:flex;align-items:center;gap:14px">
                <div style="background:#F97316;border-radius:8px;padding:6px 14px;font-size:15px;font-weight:900;color:#fff;letter-spacing:0.05em">GORGURÃO</div>
                <div><div class="titulo">Relatório Mensal — ${MESES[mes]} ${ano}</div><div class="sub">Produção Gorgurão</div></div>
            </div>
            <div class="emp">FourTEX — Indústria Têxtil</div>
        </div>
        <div class="content">
            ${resumoHtml}${compHtml}${defHtml}${corHtml}${detHtml}
            <div class="footer"><span>Gerado em ${new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</span><span>FourTEX — Sistema de Controle de Produção</span></div>
        </div>
        <script>window.onload=()=>window.print();</script></body></html>`);
        w.document.close();
    };

    return (
        <div style={{ background: "#fff", border: `1.5px solid ${isPrimeiro ? "#F97316" : "#ECEDF1"}`, borderRadius: 14, overflow: "hidden" }}>
            <div onClick={() => setAberto(v => !v)} style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: aberto ? "1px solid #F3F4F6" : "none", background: aberto ? "#fff" : "#FAFAFA" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#F97316", display: "flex" }}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Relatório Mensal — Gorgurão</span>
                    {isPrimeiro && <span style={{ fontSize: 11, fontWeight: 700, background: "#F97316", color: "#fff", borderRadius: 20, padding: "2px 8px" }}>NOVO</span>}
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{MESES[mes]} {ano}</span>
                    {!aberto && logsDoMes.length > 0 && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{logsDoMes.length} lançamentos</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <select value={mes} onChange={e => setMes(Number(e.target.value))} style={selStyle}>{MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
                    <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ ...selStyle, width: 80 }}>{[ano-1, ano, ano+1].map(y => <option key={y}>{y}</option>)}</select>
                    <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>{aberto ? "▲" : "▼"}</span>
                </div>
            </div>

            {aberto && (
                <div style={{ padding: "20px" }}>
                    {logsDoMes.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px", color: "#9CA3AF", fontSize: 13 }}>Nenhum lançamento em {MESES[mes]} {ano}.</div>
                    ) : (<>

                    {/* Cards resumo */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                        {[
                            { label: "Total RL",     value: fmtN(totalRL),       unit: "RL",   sub: null,                              color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
                            { label: "KG Gorgurão",  value: fmtKg(totalKgGorg),  unit: "kg",   sub: `${fmtKg(avgKgRolo)} kg/RL`,       color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
                            { label: "Defeitos",     value: fmtKg(totalDefeitos),unit: "kg",   sub: null,                              color: "#DC2626", bg: "#FFF5F5", border: "#FECACA" },
                            { label: "Dias Trab.",   value: diasTrab,             unit: "dias", sub: `${logsDoMes.length} lançamentos`, color: "#374151", bg: "#F9FAFB", border: "#ECEDF1" },
                        ].map(c => (
                            <div key={c.label} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 9, padding: "11px 14px" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em", marginBottom: 4, textTransform: "uppercase" }}>{c.label}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>
                                    {c.value} <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>{c.unit}</span>
                                </div>
                                {c.sub && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{c.sub}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Comparação com os 3 meses anteriores */}
                    {(() => {
                        const ult = mesesComparacao.length - 1;
                        const anterior = mesesComparacao[ult - 1];
                        const th = { padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em", whiteSpace: "nowrap", textAlign: "right" };
                        return (
                            <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
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
                                                    <tr key={l.label} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA", borderBottom: i < LINHAS_COMPARACAO.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                                        <td style={{ padding: "9px 14px", fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{l.label}</td>
                                                        {mesesComparacao.map((c, j) => {
                                                            const v = c[l.key];
                                                            return (
                                                                <td key={j} style={{ padding: "9px 14px", fontSize: 12, fontWeight: j === ult ? 700 : 400, color: j === ult ? "#111827" : "#9CA3AF", whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums", background: j === ult ? "#FFF7ED" : undefined }}>
                                                                    {v ? <>{l.dec ? fmtKg(v) : fmtN(v)} <span style={{ fontSize: 10, color: "#9CA3AF" }}>{l.unit}</span></> : "—"}
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ padding: "9px 14px", textAlign: "right", whiteSpace: "nowrap" }}>{atual ? <DeltaBadge atual={atual} prev={anterior[l.key]} inverso={l.inverso} /> : <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Defeitos por cor */}
                    {tabelaDefeitos.length > 0 && (
                        <div style={{ background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                            <div style={{ padding: "10px 14px", background: "#FEE2E2", fontSize: 11, fontWeight: 700, color: "#DC2626" }}>⚠ Defeitos do Mês</div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: "#FEE2E2" }}>
                                            {["Cor","Produzido (kg)","Defeito (kg)","% Defeito"].map(h => (
                                                <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#DC2626", borderBottom: "1px solid #FECACA" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabelaDefeitos.map((row, i) => (
                                            <tr key={row.cor} style={{ background: i%2===0?"#fff":"#FFF5F5", borderBottom: "1px solid #FEE2E2" }}>
                                                <td style={{ padding: "7px 12px", fontWeight: 600 }}>{row.cor}</td>
                                                <td style={{ padding: "7px 12px", color: "#6B7280" }}>{row.prodKg > 0 ? fmtKg(row.prodKg)+" kg" : "—"}</td>
                                                <td style={{ padding: "7px 12px", color: "#DC2626", fontWeight: 700 }}>{fmtKg(row.defKg)} kg</td>
                                                <td style={{ padding: "7px 12px", fontWeight: 700, color: Number(row.pct)>5?"#DC2626":Number(row.pct)>2?"#F97316":"#16A34A" }}>
                                                    {row.pct !== "—" ? `${row.pct}%` : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: "#FEE2E2", borderTop: "2px solid #DC2626" }}>
                                            <td style={{ padding: "8px 12px", fontWeight: 800, color: "#7F1D1D" }}>Total</td>
                                            <td style={{ padding: "8px 12px", color: "#7F1D1D", fontWeight: 600 }}>{fmtKg(tabelaDefeitos.reduce((s,r)=>s+r.prodKg,0))} kg</td>
                                            <td style={{ padding: "8px 12px", color: "#DC2626", fontWeight: 800 }}>{fmtKg(totalDefeitos)} kg</td>
                                            <td style={{ padding: "8px 12px" }}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Por Cor Gorgurão + Por Turno */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12, alignItems: "start" }}>
                    {coresOrdenadas.length > 0 && (
                        <div style={{ border: "1px solid #ECEDF1", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ overflowX: "auto" }}>
                                <div style={{ minWidth: 260 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "100px 75px 85px", gap: 0, background: "#111827" }}>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>POR COR — GORGURÃO</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #374151" }}>ROLOS</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" }}>PESO (KG)</span>
                                    </div>
                                    {coresOrdenadas.map((cor, i) => {
                                        const g = porCorGrupo[cor];
                                        return (
                                            <div key={cor} style={{ display: "grid", gridTemplateColumns: "100px 75px 85px", gap: 0, background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                                                <span style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", borderRight: "1px solid #F3F4F6" }}>{cor}</span>
                                                <span style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #F3F4F6" }}>{fmtN(g.rl)} RL</span>
                                                <span style={{ padding: "4px 8px", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", textAlign: "right" }}>{fmtKg(g.kg)} kg</span>
                                            </div>
                                        );
                                    })}
                                    <div style={{ display: "grid", gridTemplateColumns: "100px 75px 85px", gap: 0, background: "#111827" }}>
                                        <span style={{ padding: "5px 8px", fontSize: 11, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>TOTAL</span>
                                        <span style={{ padding: "5px 8px", fontSize: 12, fontWeight: 800, color: "#FB923C", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #374151" }}>{fmtN(coresOrdenadas.reduce((s,c)=>s+porCorGrupo[c].rl,0))} RL</span>
                                        <span style={{ padding: "5px 8px", fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", textAlign: "right" }}>{fmtKg(coresOrdenadas.reduce((s,c)=>s+porCorGrupo[c].kg,0))} kg</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {Object.keys(porTurno).length > 0 && (
                        <div style={{ border: "1px solid #ECEDF1", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ overflowX: "auto" }}>
                                <div style={{ minWidth: 260 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "50px 75px 95px 40px", gap: 0, background: "#111827" }}>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>TURNO</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>ROLOS</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #374151" }}>PESO GORG.</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" }}>LÇ.</span>
                                    </div>
                                    {Object.entries(porTurno).sort().map(([t, v], i, arr) => (
                                        <div key={t} style={{ display: "grid", gridTemplateColumns: "50px 75px 95px 40px", gap: 0, background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                            <span style={{ padding: "4px 8px", fontSize: 11, fontWeight: 800, color: "#111827", whiteSpace: "nowrap", borderRight: "1px solid #F3F4F6" }}>{t}</span>
                                            <span style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap", borderRight: "1px solid #F3F4F6" }}>{fmtN(v.rl)} RL</span>
                                            <span style={{ padding: "4px 8px", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #F3F4F6" }}>{fmtKg(v.kg)} kg</span>
                                            <span style={{ padding: "4px 8px", fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap", textAlign: "right" }}>{v.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Detalhamento por medida */}
                    {medidasOrdenadas.length > 0 && (
                        <div style={{ border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                            <div style={{ overflowX: "auto" }}>
                                <div style={{ minWidth: 380 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 80px", gap: 0, background: "#111827" }}>
                                        <span style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>COR</span>
                                        <span style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #374151" }}>ROLOS</span>
                                        <span style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #374151" }}>PESO (KG)</span>
                                        <span style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" }}>KG/RL</span>
                                    </div>
                                    {medidasOrdenadas.map(medida => {
                                        const itens = porMedida[medida].sort((a,b) => b.rl - a.rl);
                                        const sRL = itens.reduce((s,v)=>s+v.rl,0);
                                        const sKg = itens.reduce((s,v)=>s+v.kg,0);
                                        return (
                                            <div key={medida}>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 80px", gap: 0, background: "#FFF7ED", borderBottom: "1px solid #FED7AA" }}>
                                                    <span style={{ padding: "7px 10px", fontSize: 12, fontWeight: 800, color: "#EA580C", whiteSpace: "nowrap", borderRight: "1px solid #FED7AA" }}>{medida}</span>
                                                    <span style={{ padding: "7px 10px", fontSize: 12, fontWeight: 700, color: "#F97316", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #FED7AA" }}>{fmtN(sRL)} RL</span>
                                                    <span style={{ padding: "7px 10px", fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #FED7AA" }}>{fmtKg(sKg)} kg</span>
                                                    <span style={{ padding: "7px 10px", fontSize: 12, fontWeight: 800, color: "#EA580C", whiteSpace: "nowrap", textAlign: "right" }}>{sRL > 0 ? (sKg / sRL).toFixed(3) : "—"}</span>
                                                </div>
                                                {itens.map((v, i) => (
                                                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 80px", gap: 0, background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                                                        <span style={{ padding: "6px 10px 6px 18px", fontSize: 12, color: "#374151", whiteSpace: "nowrap", borderRight: "1px solid #F3F4F6" }}>{v.cor}</span>
                                                        <span style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#F97316", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #F3F4F6" }}>{fmtN(v.rl)} RL</span>
                                                        <span style={{ padding: "6px 10px", fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #F3F4F6" }}>{fmtKg(v.kg)} kg</span>
                                                        <span style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#6B7280", whiteSpace: "nowrap", textAlign: "right" }}>{v.rl > 0 ? (v.kg / v.rl).toFixed(3) : "—"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botões */}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={handleCSV} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 8, cursor: "pointer" }}>↓ Exportar CSV</button>
                        <button onClick={handlePrint} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, cursor: "pointer" }}>🖨 Imprimir</button>
                    </div>
                    </>)}
                </div>
            )}
        </div>
    );
}

// ── Relatório Mensal — Poliéster ──────────────────────────────────────────────
function RelatorioMensalPoliester({ logs, turnoFinalizacoes = [] }) {
    const isMobile = useIsMobile();
    const hoje = new Date();
    const isPrimeiro = hoje.getDate() === 1;
    const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

    const [ano, setAno]     = useState(mesRef.getFullYear());
    const [mes, setMes]     = useState(mesRef.getMonth());
    const [aberto, setAberto] = useState(false);

    const logsPol = useMemo(() => logs.filter(l => l.tipo === "Poliéster"), [logs]);

    const logsDoMes = useMemo(() => logsPol.filter(l => {
        if (!l.timestamp) return false;
        const d = parseTsGorg(l.timestamp);
        return d && !isNaN(d) && d.getFullYear() === ano && d.getMonth() === mes;
    }), [logsPol, ano, mes]);

    const totalKg  = logsDoMes.reduce((s, l) => s + (Number(l.peso) || 0), 0);

    // Conta dias únicos pelas finalizações de turno (mais preciso que contar pelos lançamentos)
    const finalizacoesDoMes = useMemo(() => turnoFinalizacoes.filter(f => {
        if (!f.inicio) return false;
        const d = new Date(f.inicio);
        return d.getFullYear() === ano && d.getMonth() === mes;
    }), [turnoFinalizacoes, ano, mes]);

    const diasTrabFin = new Set(finalizacoesDoMes.map(f => {
        const d = new Date(f.inicio);
        return `${d.getDate()}-${d.getMonth()}-${d.getFullYear()}`;
    })).size;
    const diasTrab = diasTrabFin > 0 ? diasTrabFin : new Set(logsDoMes.map(l => {
        const d = parseTsGorg(l.timestamp);
        return d && !isNaN(d) ? `${d.getDate()}-${d.getMonth()}-${d.getFullYear()}` : null;
    }).filter(Boolean)).size;

    // ── Mês anterior ──────────────────────────────────────────────────────────
    const prevMes = mes === 0 ? 11 : mes - 1;
    const prevAno = mes === 0 ? ano - 1 : ano;
    const logsDoMesPrev = useMemo(() => logsPol.filter(l => {
        if (!l.timestamp) return false;
        const d = parseTsGorg(l.timestamp);
        return d && !isNaN(d) && d.getFullYear() === prevAno && d.getMonth() === prevMes;
    }), [logsPol, prevAno, prevMes]);
    const prevKg = logsDoMesPrev.reduce((s, l) => s + (Number(l.peso) || 0), 0);

    // ── Por Cor ───────────────────────────────────────────────────────────────
    const porCor = {};
    logsDoMes.forEach(l => {
        const c = l.cor || "—";
        porCor[c] = (porCor[c] || 0) + (Number(l.peso) || 0);
    });
    const coresOrdenadas = Object.entries(porCor).sort((a, b) => {
        const ord = c => c.toLowerCase() === "preto" ? 0 : c.toLowerCase() === "branco" ? 1 : 2;
        return ord(a[0]) !== ord(b[0]) ? ord(a[0]) - ord(b[0]) : b[1] - a[1];
    });

    // ── Por Turno ─────────────────────────────────────────────────────────────
    const porTurno = {};
    logsDoMes.forEach(l => {
        const t = `T${l.turno || "—"}`;
        if (!porTurno[t]) porTurno[t] = { kg: 0, count: 0 };
        porTurno[t].kg    += Number(l.peso) || 0;
        porTurno[t].count += 1;
    });

    // ── Detalhamento por medida → cor ────────────────────────────────────────
    const porMedidaCor = {};
    logsDoMes.forEach(l => {
        const key = `${l.medida || "—"}|${l.cor || "—"}`;
        if (!porMedidaCor[key]) porMedidaCor[key] = { medida: l.medida || "—", cor: l.cor || "—", kg: 0 };
        porMedidaCor[key].kg += Number(l.peso) || 0;
    });
    const porMedida = {};
    Object.values(porMedidaCor).forEach(v => { if (!porMedida[v.medida]) porMedida[v.medida] = []; porMedida[v.medida].push(v); });
    const medidasOrdenadas = Object.keys(porMedida).sort((a, b) => parseFloat(a) - parseFloat(b));

    const fmtN  = v => Number(v).toLocaleString("pt-BR");
    const fmtKg = v => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const DeltaBadge = ({ atual, prev }) => {
        if (!prev) return <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>;
        const pct = Math.round(((atual - prev) / prev) * 100);
        if (pct === 0) return <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>;
        return <span style={{ color: pct > 0 ? "#16A34A" : "#DC2626", fontWeight: 700, fontSize: 11 }}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
    };

    const handleCSV = () => {
        const rows = logsDoMes.map(l => [l.timestamp||"—",`T${l.turno}`,l.medida||"—",l.cor||"—",l.peso?Number(l.peso).toFixed(2):0,l.operador||"—"]);
        exportCSV(`relatorio_poliester_${MESES[mes].toLowerCase()}_${ano}.csv`, ["Data/Hora","Turno","Medida","Cor","Peso (kg)","Operador"], rows);
    };

    const handlePrint = () => {
        const fn  = v => Number(v).toLocaleString("pt-BR");
        const fk  = v => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const delta = (a, p) => {
            if (!p) return "<span style='color:#9CA3AF'>—</span>";
            const pct = Math.round(((a - p) / p) * 100);
            if (pct === 0) return "<span style='color:#9CA3AF'>—</span>";
            return `<span style="color:${pct>0?"#16A34A":"#DC2626"};font-weight:700">${pct>0?"▲":"▼"} ${Math.abs(pct)}%</span>`;
        };

        const resumoHtml = `<div class="cards3">
            <div class="card indigo"><div class="label">Total Poliéster</div><div class="value">${fk(totalKg)}<span class="unit">kg</span></div></div>
            <div class="card gray"><div class="label">Dias Trab.</div><div class="value">${diasTrab}<span class="unit">dias</span></div></div>
            <div class="card gray"><div class="label">Lançamentos</div><div class="value">${logsDoMes.length}</div></div>
        </div>`;

        const compHtml = `<div class="section-title">Comparação com ${MESES[prevMes]} ${prevAno}</div>
        <table><thead><tr><th>Métrica</th><th class="r">${MESES[prevMes]} ${prevAno}</th><th class="r">${MESES[mes]} ${ano}</th><th class="r">Variação</th></tr></thead><tbody>
            <tr><td>Peso Total</td><td class="r">${fk(prevKg)} kg</td><td class="r"><strong>${fk(totalKg)} kg</strong></td><td class="r">${delta(totalKg,prevKg)}</td></tr>
        </tbody></table>`;

        const totCorKg = coresOrdenadas.reduce((s, [, kg]) => s + kg, 0);
        const corHtml = `<div class="section-title">Por Cor — Poliéster</div>
        <table><thead><tr><th>Cor</th><th class="r">Peso (kg)</th></tr></thead><tbody>
        ${coresOrdenadas.map(([c, kg]) => `<tr><td><strong>${c}</strong></td><td class="r">${fk(kg)} kg</td></tr>`).join("")}
        <tr style="background:#111827;color:#fff"><td style="font-weight:800;color:#fff">TOTAL</td><td style="text-align:right;font-weight:800">${fk(totCorKg)} kg</td></tr>
        </tbody></table>`;

        const detHtml = `<div class="section-title">Detalhamento por Medida</div>
        <table><thead><tr><th>Medida</th><th>Cor</th><th class="r">Peso (kg)</th></tr></thead><tbody>
        ${medidasOrdenadas.map(medida => {
            const itens = porMedida[medida].sort((a,b) => b.kg - a.kg);
            const sKg = itens.reduce((s,v)=>s+v.kg,0);
            return `<tr class="subtotal"><td><strong>${medida}</strong></td><td>SUBTOTAL</td><td class="r">${fk(sKg)} kg</td></tr>`
                + itens.map(v=>`<tr><td></td><td>${v.cor}</td><td class="r">${fk(v.kg)} kg</td></tr>`).join("");
        }).join("")}
        </tbody></table>`;

        const w = window.open("","_blank","width=900,height=700");
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relatório Mensal Poliéster — ${MESES[mes]} ${ano}</title>
        <style>
        *{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:12px;color:#111;}
        .page-header{background:#111827;color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:flex-end;}
        .page-header .titulo{font-size:18px;font-weight:800;}.page-header .sub{font-size:11px;color:#9CA3AF;margin-top:2px;}
        .page-header .emp{font-size:13px;font-weight:700;color:#A5B4FC;}
        .content{padding:20px 28px;}
        .cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
        .card{border-radius:9px;padding:11px 14px;border:1.5px solid #ECEDF1;}
        .card .label{font-size:8px;font-weight:700;letter-spacing:0.07em;color:#9CA3AF;margin-bottom:5px;text-transform:uppercase;}
        .card .value{font-size:19px;font-weight:800;line-height:1.1;}
        .card .unit{font-size:10px;font-weight:500;color:#9CA3AF;margin-left:2px;}
        .card.indigo{background:#EEF2FF;border-color:#C7D2FE;}.card.indigo .value{color:#6366F1;}
        .card.gray{background:#F9FAFB;}.card.gray .value{color:#374151;}
        .section-title{font-size:11px;font-weight:800;color:#111;margin:16px 0 7px;padding-bottom:4px;border-bottom:2px solid #ECEDF1;text-transform:uppercase;letter-spacing:0.05em;}
        table{border-collapse:collapse;width:100%;margin-bottom:4px;}
        th{background:#111827;color:#fff;text-align:left;padding:6px 10px;font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;}
        th.r{text-align:right;}td{padding:5px 10px;border-bottom:1px solid #F3F4F6;font-size:11px;}td.r{text-align:right;font-weight:600;}
        tr.subtotal td{background:#EEF2FF;font-weight:700;color:#4F46E5;}
        .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ECEDF1;font-size:9px;color:#9CA3AF;display:flex;justify-content:space-between;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
        </style></head><body>
        <div class="page-header">
            <div style="display:flex;align-items:center;gap:14px">
                <div style="background:#6366F1;border-radius:8px;padding:6px 14px;font-size:15px;font-weight:900;color:#fff;letter-spacing:0.05em">POLIÉSTER</div>
                <div><div class="titulo">Relatório Mensal — ${MESES[mes]} ${ano}</div><div class="sub">Produção Poliéster</div></div>
            </div>
            <div class="emp">FourTEX — Indústria Têxtil</div>
        </div>
        <div class="content">
            ${resumoHtml}${compHtml}${corHtml}${detHtml}
            <div class="footer"><span>Gerado em ${new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</span><span>FourTEX — Sistema de Controle de Produção</span></div>
        </div>
        <script>window.onload=()=>window.print();</script></body></html>`);
        w.document.close();
    };

    return (
        <div style={{ background: "#fff", border: `1.5px solid ${isPrimeiro ? "#6366F1" : "#ECEDF1"}`, borderRadius: 14, overflow: "hidden" }}>
            <div onClick={() => setAberto(v => !v)} style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: aberto ? "1px solid #F3F4F6" : "none", background: aberto ? "#fff" : "#FAFAFA" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#6366F1", display: "flex" }}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Relatório Mensal — Poliéster</span>
                    {isPrimeiro && <span style={{ fontSize: 11, fontWeight: 700, background: "#6366F1", color: "#fff", borderRadius: 20, padding: "2px 8px" }}>NOVO</span>}
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{MESES[mes]} {ano}</span>
                    {!aberto && logsDoMes.length > 0 && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{logsDoMes.length} lançamentos</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <select value={mes} onChange={e => setMes(Number(e.target.value))} style={selStyle}>{MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
                    <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ ...selStyle, width: 80 }}>{[ano-1, ano, ano+1].map(y => <option key={y}>{y}</option>)}</select>
                    <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>{aberto ? "▲" : "▼"}</span>
                </div>
            </div>

            {aberto && (
                <div style={{ padding: "20px" }}>
                    {logsDoMes.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px", color: "#9CA3AF", fontSize: 13 }}>Nenhum lançamento de Poliéster em {MESES[mes]} {ano}.</div>
                    ) : (<>

                    {/* Cards resumo */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                        {[
                            { label: "Total Poliéster", value: fmtKg(totalKg),      unit: "kg", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
                            { label: "Dias Trab.",      value: diasTrab,             unit: "dias", color: "#374151", bg: "#F9FAFB", border: "#ECEDF1" },
                            { label: "Lançamentos",     value: logsDoMes.length,     unit: "",   color: "#374151", bg: "#F9FAFB", border: "#ECEDF1" },
                        ].map(c => (
                            <div key={c.label} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 9, padding: "11px 14px" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em", marginBottom: 4, textTransform: "uppercase" }}>{c.label}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>
                                    {c.value} <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>{c.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comparação mês anterior */}
                    <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                        <div style={{ padding: "10px 16px", background: "#111827", display: "grid", gridTemplateColumns: "1fr 130px 130px 70px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>
                            <span>COMPARAÇÃO</span>
                            <span style={{ textAlign: "right" }}>{MESES[prevMes].toUpperCase()} {prevAno}</span>
                            <span style={{ textAlign: "right" }}>{MESES[mes].toUpperCase()} {ano}</span>
                            <span style={{ textAlign: "right" }}>VAR.</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 70px", padding: "9px 16px", alignItems: "center", background: "#fff" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Peso Total</span>
                            <span style={{ textAlign: "right", fontSize: 12, color: "#9CA3AF" }}>{fmtKg(prevKg)} kg</span>
                            <span style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#111827" }}>{fmtKg(totalKg)} kg</span>
                            <span style={{ textAlign: "right" }}><DeltaBadge atual={totalKg} prev={prevKg} /></span>
                        </div>
                    </div>

                    {/* Por Cor + Por Turno */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12, alignItems: "start" }}>
                    {coresOrdenadas.length > 0 && (
                        <div style={{ border: "1px solid #C7D2FE", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ overflowX: "auto" }}>
                                <div style={{ minWidth: 210 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "110px 95px", gap: 0, background: "#4F46E5" }}>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#C7D2FE", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #6366F1" }}>POR COR — POLIÉSTER</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#C7D2FE", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" }}>PESO (KG)</span>
                                    </div>
                                    {coresOrdenadas.map(([cor, kg], i) => (
                                        <div key={cor} style={{ display: "grid", gridTemplateColumns: "110px 95px", gap: 0, background: i % 2 === 0 ? "#EEF2FF" : "#fff", borderBottom: "1px solid #C7D2FE" }}>
                                            <span style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", borderRight: "1px solid #C7D2FE" }}>{cor}</span>
                                            <span style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "#6366F1", whiteSpace: "nowrap", textAlign: "right" }}>{fmtKg(kg)} kg</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "grid", gridTemplateColumns: "110px 95px", gap: 0, background: "#4F46E5" }}>
                                        <span style={{ padding: "5px 8px", fontSize: 11, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", borderRight: "1px solid #6366F1" }}>TOTAL</span>
                                        <span style={{ padding: "5px 8px", fontSize: 12, fontWeight: 800, color: "#C7D2FE", whiteSpace: "nowrap", textAlign: "right" }}>{fmtKg(coresOrdenadas.reduce((s,[,kg])=>s+kg,0))} kg</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {Object.keys(porTurno).length > 0 && (
                        <div style={{ border: "1px solid #ECEDF1", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ overflowX: "auto" }}>
                                <div style={{ minWidth: 230 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "50px 90px 55px", gap: 0, background: "#111827" }}>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>TURNO</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #374151" }}>PESO (KG)</span>
                                        <span style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" }}>LÇ.</span>
                                    </div>
                                    {Object.entries(porTurno).sort().map(([t, v], i, arr) => (
                                        <div key={t} style={{ display: "grid", gridTemplateColumns: "50px 90px 55px", gap: 0, background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                            <span style={{ padding: "4px 8px", fontSize: 11, fontWeight: 800, color: "#111827", whiteSpace: "nowrap", borderRight: "1px solid #F3F4F6" }}>{t}</span>
                                            <span style={{ padding: "4px 8px", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", textAlign: "right", borderRight: "1px solid #F3F4F6" }}>{fmtKg(v.kg)} kg</span>
                                            <span style={{ padding: "4px 8px", fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap", textAlign: "right" }}>{v.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Detalhamento por medida */}
                    {medidasOrdenadas.length > 0 && (
                        <div style={{ border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                            <div style={{ overflowX: "auto" }}>
                                <div style={{ minWidth: 280 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "120px 80px 100px", gap: 0, background: "#111827" }}>
                                        <span style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>MEDIDA</span>
                                        <span style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", borderRight: "1px solid #374151" }}>COR</span>
                                        <span style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" }}>PESO (KG)</span>
                                    </div>
                                    {medidasOrdenadas.map(medida => {
                                        const itens = porMedida[medida].sort((a,b) => b.kg - a.kg);
                                        const sKg = itens.reduce((s,v)=>s+v.kg,0);
                                        return (
                                            <div key={medida}>
                                                <div style={{ display: "grid", gridTemplateColumns: "120px 80px 100px", gap: 0, background: "#EEF2FF", borderBottom: "1px solid #C7D2FE" }}>
                                                    <span style={{ padding: "7px 10px", fontSize: 12, fontWeight: 800, color: "#4F46E5", whiteSpace: "nowrap", borderRight: "1px solid #C7D2FE" }}>{medida}</span>
                                                    <span style={{ padding: "7px 10px", fontSize: 12, fontWeight: 700, color: "#4F46E5", whiteSpace: "nowrap", borderRight: "1px solid #C7D2FE" }}>SUBTOTAL</span>
                                                    <span style={{ padding: "7px 10px", fontSize: 12, fontWeight: 800, color: "#4F46E5", whiteSpace: "nowrap", textAlign: "right" }}>{fmtKg(sKg)} kg</span>
                                                </div>
                                                {itens.map((v, i) => (
                                                    <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 80px 100px", gap: 0, background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                                                        <span style={{ padding: "6px 10px 6px 18px", fontSize: 12, color: "#374151", whiteSpace: "nowrap", borderRight: "1px solid #F3F4F6" }}></span>
                                                        <span style={{ padding: "6px 10px", fontSize: 12, color: "#374151", whiteSpace: "nowrap", borderRight: "1px solid #F3F4F6" }}>{v.cor}</span>
                                                        <span style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap", textAlign: "right" }}>{fmtKg(v.kg)} kg</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botões */}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={handleCSV} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 8, cursor: "pointer" }}>↓ Exportar CSV</button>
                        <button onClick={handlePrint} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, cursor: "pointer" }}>🖨 Imprimir</button>
                    </div>
                    </>)}
                </div>
            )}
        </div>
    );
}

// ── Relatório de Metas ────────────────────────────────────────────────────────
const META_RL_POR_FITA        = 3;
const META_KG_POL_POR_MAQUINA = 40;
const TURNO_LABEL = { 1: "T1", 2: "T2", 3: "T3", 4: "Bônus" };

function calcMetaRL(machines, nGorg) {
    const gorgMachines = (machines || []).filter(m => m.tipo === "Gorgurão" || m.tipo === "Misto");
    const totalMaq = gorgMachines.length || 12;
    const totalFitas = (machines || []).filter(m => m.tipo === "Gorgurão" || m.tipo === "Misto")
        .reduce((s, m) => { const f = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {}); return s + f.reduce((fs, fi) => fs + (Number(fi.qtd) || 1), 0); }, 0);
    const fitasPorMaq = totalFitas > 0 ? totalFitas / totalMaq : 14;
    const maqAtivas = nGorg > 0 ? nGorg : totalMaq;
    return Math.round(maqAtivas * fitasPorMaq * META_RL_POR_FITA);
}

function RelatorioMetas({ turnoFinalizacoes = [], logs = [], machines = [] }) {
    const hoje = new Date();
    const [ano, setAno] = useState(hoje.getFullYear());
    const [mes, setMes] = useState(hoje.getMonth());
    const [aberto, setAberto] = useState(false);

    const diasDoMes = useMemo(() => {
        const porDia = {};

        // Agrupa logs do mês por "data_turnoInicio|numero_turno"
        // Usa timestamp para garantir mesmo conjunto de logs que o Relatório Mensal
        const logsPorChave = {};
        logs.forEach(l => {
            const ts = parseTsGorg(l.timestamp);
            if (!ts || ts.getFullYear() !== ano || ts.getMonth() !== mes) return;
            const ti = l.turnoInicio ? new Date(l.turnoInicio).toLocaleDateString("pt-BR") : ts.toLocaleDateString("pt-BR");
            const key = `${ti}|${l.turno || ""}`;
            if (!logsPorChave[key]) logsPorChave[key] = [];
            logsPorChave[key].push(l);
        });

        // Deduplica finalizações por (data + numero) para evitar dupla contagem
        const finalizacoesUnicas = Object.values(
            turnoFinalizacoes
                .filter(f => { if (!f.inicio) return false; const d = new Date(f.inicio); return d.getFullYear() === ano && d.getMonth() === mes; })
                .reduce((acc, f) => { const k = `${new Date(f.inicio).toLocaleDateString("pt-BR")}|${f.numero}`; acc[k] = f; return acc; }, {})
        );

        finalizacoesUnicas.forEach(f => {
                const fDataStr = new Date(f.inicio).toLocaleDateString("pt-BR");
                const key = `${fDataStr}|${f.numero}`;
                const lans = logsPorChave[key] || [];
                const rl = lans.filter(l => l.tipo === "Gorgurão").reduce((s, l) => s + (Number(l.qtd) || 0), 0);
                const kg = lans.filter(l => l.tipo === "Poliéster").reduce((s, l) => s + (Number(l.peso) || 0), 0);
                const ng = Number(f.qtdMaquinas?.["Gorgurão"] || 0);
                const np = Number(f.qtdMaquinas?.["Poliéster"] || 0);
                // Prioridade: metaRL gravado na finalização → meta configurado no início → recalcula com máquinas atuais
                const mRL = f.metaRL || (f.meta > 0 ? f.meta : calcMetaRL(machines, ng));
                const mKg = np > 0 ? np * META_KG_POL_POR_MAQUINA : 0;
                const pctRL = mRL > 0 ? Math.round((rl / mRL) * 100) : 0;
                const pctKg = mKg > 0 ? Math.round((kg / mKg) * 100) : null;
                const data = new Date(f.inicio).toLocaleDateString("pt-BR");
                if (!porDia[data]) porDia[data] = [];
                porDia[data].push({ ...f, rl, kg, mRL, mKg, pctRL, pctKg, data, ng, np });
            });
        return Object.entries(porDia)
            .sort(([a], [b]) => { const p = s => { if (!s || typeof s !== "string") return 0; const [d,m,y] = s.split("/"); return new Date(`${y}-${m}-${d}`).getTime(); }; return p(a) - p(b); })
            .map(([data, turnos]) => ({ data, turnos: turnos.sort((a, b) => a.numero - b.numero), totalRL: turnos.reduce((s, t) => s + t.rl, 0), totalKg: turnos.reduce((s, t) => s + t.kg, 0), metaDia: turnos.reduce((s, t) => s + t.mRL, 0) }));
    }, [turnoFinalizacoes, logs, machines, ano, mes]);

    const totalRLMes   = diasDoMes.reduce((s, d) => s + d.totalRL, 0);
    const totalKgMes   = diasDoMes.reduce((s, d) => s + d.totalKg, 0);
    const diasBateram  = diasDoMes.filter(d => d.metaDia > 0 && Math.round((d.totalRL / d.metaDia) * 100) >= 100).length;
    const mediaRLDia   = diasDoMes.length > 0 ? Math.round(totalRLMes / diasDoMes.length) : 0;
    const mediaKgDia   = diasDoMes.length > 0 ? (totalKgMes / diasDoMes.length).toFixed(1) : "—";

    const handlePrint = () => {
        const summaryCards = [
            { label: "Total RL",     value: totalRLMes.toLocaleString("pt-BR") + " RL" },
            { label: "Total KG",     value: totalKgMes.toFixed(1) + " kg" },
            { label: "Média RL/dia", value: mediaRLDia.toLocaleString("pt-BR") + " RL" },
            { label: "Média KG/dia", value: mediaKgDia + " kg" },
            { label: "Dias",         value: diasDoMes.length + " dias" },
            { label: "Bateram meta", value: `${diasBateram}/${diasDoMes.length} dias` },
        ].map(c => `<div style="background:#F9FAFB;border:1px solid #ECEDF1;border-radius:8px;padding:10px 14px;min-width:100px;">
            <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:.05em;margin-bottom:4px">${c.label.toUpperCase()}</div>
            <div style="font-size:15px;font-weight:800;color:#111">${c.value}</div>
        </div>`).join("");
        const header = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">${summaryCards}</div>`;

        const rows = diasDoMes.map((d, i) => {
            const pctDia = d.metaDia > 0 ? Math.round((d.totalRL / d.metaDia) * 100) : 0;
            const bateu = pctDia >= 100;
            const pctColor = bateu ? "#16A34A" : pctDia >= 70 ? "#D97706" : "#DC2626";
            const turnoCols = [1,2,3,4].map(n => {
                const t = d.turnos.find(x => x.numero === n);
                if (!t) return `<td style="text-align:center;color:#D1D5DB">—</td>`;
                const ok = t.pctRL >= 100;
                const rlColor = ok ? "#16A34A" : "#DC2626";
                const kgLine = t.mKg > 0 ? `<div style="font-size:10px;color:#6366F1;margin-top:2px">${t.kg.toFixed(1)} kg (${t.pctKg}%)</div>` : "";
                return `<td style="text-align:center;padding:8px 10px">
                    <div style="font-weight:700;color:${rlColor}">${t.rl} RL</div>
                    <div style="font-size:10px;color:${rlColor};opacity:.8">${t.pctRL}%</div>
                    ${kgLine}
                </td>`;
            }).join("");
            const bg = i % 2 === 0 ? "#fff" : "#F9FAFB";
            return `<tr style="background:${bg}">
                <td style="font-weight:600;white-space:nowrap">${d.data}</td>
                <td style="font-weight:800;color:#F97316;white-space:nowrap">${d.totalRL.toLocaleString("pt-BR")} RL</td>
                <td style="color:#6366F1;white-space:nowrap">${d.totalKg > 0 ? d.totalKg.toFixed(1)+" kg" : "—"}</td>
                <td style="text-align:center;font-weight:700;color:${pctColor}">${pctDia}%${bateu ? " ✓" : ""}</td>
                ${turnoCols}
            </tr>`;
        }).join("");

        const tableStyle = `border-collapse:collapse;width:100%;font-size:12px`;
        const thStyle = `padding:9px 10px;background:#F3F4F6;border:1px solid #ECEDF1;font-size:11px;text-align:center`;
        const thLeft = `${thStyle};text-align:left`;
        printHTML(`Relatório de Metas — ${MESES[mes]} ${ano} — FourTEX`,
            `${header}<table style="${tableStyle}"><thead><tr>
                <th style="${thLeft}">Data</th>
                <th style="${thLeft}">Total RL</th>
                <th style="${thLeft}">Total KG</th>
                <th style="${thStyle}">% Meta</th>
                <th style="${thStyle}">T1</th>
                <th style="${thStyle}">T2</th>
                <th style="${thStyle}">T3</th>
                <th style="${thStyle}">T4 Bônus</th>
            </tr></thead><tbody>${rows}</tbody></table>`
        );
    };

    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
            <div onClick={() => setAberto(v => !v)} style={{ padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: aberto ? "1px solid #F3F4F6" : "none", background: aberto ? "#fff" : "#FAFAFA" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#F97316", display: "flex" }}><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Relatório de Metas</span>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{MESES[mes]} {ano}</span>
                    {!aberto && diasDoMes.length > 0 && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{diasDoMes.length} dias</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <select value={mes} onChange={e => setMes(Number(e.target.value))} style={selStyle}>{MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
                    <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ ...selStyle, width: 80 }}>{[ano-1, ano, ano+1].map(y => <option key={y}>{y}</option>)}</select>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                </div>
            </div>

            {aberto && (
                <div style={{ padding: "20px" }}>
                    {diasDoMes.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "32px", color: "#9CA3AF", fontSize: 13 }}>Nenhum turno finalizado em {MESES[mes]} {ano}.</div>
                    ) : (<>
                        {/* Resumo do mês */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
                            {[
                                { label: "Total RL",      value: totalRLMes.toLocaleString("pt-BR"), unit: "RL",     color: "#F97316" },
                                { label: "Total KG",      value: totalKgMes.toFixed(1),              unit: "kg",     color: "#6366F1" },
                                { label: "Média RL/dia",  value: mediaRLDia.toLocaleString("pt-BR"), unit: "RL/dia", color: "#0891B2" },
                                { label: "Média KG/dia",  value: mediaKgDia,                         unit: "kg/dia", color: "#0891B2" },
                                { label: "Bateram meta",  value: `${diasBateram}/${diasDoMes.length}`,unit: "dias",   color: diasBateram === diasDoMes.length ? "#16A34A" : "#F97316" },
                            ].map(c => (
                                <div key={c.label} style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, padding: "10px 12px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>{c.label.toUpperCase()}</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value} <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>{c.unit}</span></div>
                                </div>
                            ))}
                        </div>

                        {/* Tabela por dia */}
                        <div style={{ overflowX: "auto", marginBottom: 16 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: "#F9FAFB" }}>
                                        {["Data", "Total RL", "Total KG", "Meta dia", ...([1,2,3,4].map(n => n === 4 ? "T4 Bônus" : `T${n}`))].map(h => (
                                            <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", borderBottom: "2px solid #ECEDF1", whiteSpace: "nowrap" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {diasDoMes.map((d, i) => {
                                        const pctDia = d.metaDia > 0 ? Math.round((d.totalRL / d.metaDia) * 100) : 0;
                                        const bateu = pctDia >= 100;
                                        return (
                                            <tr key={d.data} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA", borderBottom: "1px solid #F3F4F6" }}>
                                                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#374151" }}>{d.data}</td>
                                                <td style={{ padding: "8px 12px", fontWeight: 800, color: "#F97316", whiteSpace: "nowrap" }}>{d.totalRL.toLocaleString("pt-BR")} RL</td>
                                                <td style={{ padding: "8px 12px", color: "#6366F1", fontWeight: 600, whiteSpace: "nowrap" }}>{d.totalKg > 0 ? `${d.totalKg.toFixed(1)} kg` : "—"}</td>
                                                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                                    <span style={{ fontWeight: 700, color: bateu ? "#16A34A" : pctDia >= 70 ? "#F97316" : "#EF4444" }}>{pctDia}%</span>
                                                    {bateu && <span style={{ marginLeft: 4, color: "#16A34A" }}>✓</span>}
                                                </td>
                                                {[1,2,3,4].map(n => {
                                                    const t = d.turnos.find(x => x.numero === n);
                                                    if (!t) return <td key={n} style={{ padding: "8px 12px", color: "#D1D5DB" }}>—</td>;
                                                    const ok = t.pctRL >= 100;
                                                    return (
                                                        <td key={n} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                                            <span style={{ fontWeight: 700, color: ok ? "#16A34A" : "#EF4444" }}>{t.rl} RL</span>
                                                            <span style={{ fontSize: 10, color: "#9CA3AF", marginLeft: 3 }}>({t.pctRL}%)</span>
                                                            {t.mKg > 0 && <div style={{ fontSize: 10, color: "#6366F1" }}>{t.kg.toFixed(1)} kg</div>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={handlePrint} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, cursor: "pointer" }}>🖨 Imprimir</button>
                        </div>
                    </>)}
                </div>
            )}
        </div>
    );
}


// ── Main ──────────────────────────────────────────────────────────────────────
export default function RelatoriosTab({ orders = [], logs = [], turnoFinalizacoes = [], machines = [], pesosForaMedia = [], isAdmin = false, podeEditar = false }) {
    const isMobile = useIsMobile();

    const totalRL = logs.reduce((a, l) => a + (l.qtd || 0), 0);
    const pedidosConc = orders.filter(o => o.status === "concluido").length;
    const pedidosProd = orders.filter(o => o.status === "em_producao").length;

    const statCards = [
        {
            label: "Total Produzido",
            value: totalRL.toLocaleString("pt-BR"),
            unit: "RL",
            sub: `${logs.length} lançamentos`,
            color: "#F97316",
            bg: "#FFF7ED",
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
        },
        {
            label: "Pedidos Concluídos",
            value: pedidosConc,
            unit: "",
            sub: `${pedidosProd} em produção`,
            color: "#10B981",
            bg: "#F0FDF4",
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
        },
        {
            label: "Total de Pedidos",
            value: orders.length,
            unit: "",
            sub: `${orders.filter(o => o.status === "confirmacao").length} aguardando confirmação`,
            color: "#6366F1",
            bg: "#EEF2FF",
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
        },
    ];

    return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px", maxWidth: 900, margin: "0 auto" }}>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                {(isMobile ? statCards.slice(0, 2) : statCards).map(c => (
                    <div key={c.label} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: isMobile ? "12px" : "16px", borderLeft: `3px solid ${c.color}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, flexShrink: 0 }}>
                            {c.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>{c.label.toUpperCase()}</div>
                            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                                {c.value}{c.unit && <span style={{ fontSize: 13, fontWeight: 500, color: "#9CA3AF", marginLeft: 4 }}>{c.unit}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{c.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <RelatorioMetas turnoFinalizacoes={turnoFinalizacoes} logs={logs} machines={machines} />
                <RelatorioMensalGorgurao logs={logs} turnoFinalizacoes={turnoFinalizacoes} />
                <RelatorioMensalPoliester logs={logs} turnoFinalizacoes={turnoFinalizacoes} />
            </div>
        </div>
    );
}
