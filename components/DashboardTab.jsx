import { useState, useEffect } from "react";
import { CorInline } from "../utils/CorDot";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}
import { workdaysBetween, formatDate, today } from "../utils";
import { calcKgFio } from "../utils/fioConsumo";

const KG_POR_ROLO = { "8mm": 0.15, "14mm": 0.35, "16mm": 0.35, "20mm": 0.5, "22mm": 0.55, "25mm": 0.55, "30mm": 0.65, "35mm": 0.75, "38mm": 0.85, "50mm": 1.1 };
function rlParaKg(rl, medida) { return KG_POR_ROLO[medida] ? Math.round(rl * KG_POR_ROLO[medida] * 10) / 10 : rl; }
function unidadePDF(tipo, unidadeOriginal) {
    if ((tipo || "").toLowerCase() === "gorgurão" || (tipo || "").toLowerCase() === "gorgurao") return "RL";
    // "m" (minúsculo) → qtdTotal ficou em metros (converterParaRL não converteu)
    if (unidadeOriginal === "m") return "m";
    // "Metro" (capital) → qtdTotal foi convertido para RL → exibe em RL
    return "RL";
}


const ICON = {
    orders:   <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
    check:    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    machine:  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
    log:      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    alert:    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    pending:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

function StatCard({ label, value, sub, icon, bg, iconColor }) {
    return (
        <div style={{
            background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14,
            padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7280", letterSpacing: "0.3px" }}>{label.toUpperCase()}</span>
                <div style={{
                    width: 26, height: 26, borderRadius: 7, background: bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: iconColor, flexShrink: 0,
                }}>{icon}</div>
            </div>
            <span style={{ fontSize: 25, fontWeight: 800, color: "#111827" }}>{value}</span>
            {sub && <span style={{ fontSize: 11, color: "#9CA3AF", marginTop: -6 }}>{sub}</span>}
        </div>
    );
}

const TIPO_TABS = ["Todos", "Gorgurão", "Poliéster", "Elástico"];
const TIPO_TAB_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };

function gerarPDFItens(orders, movimentos) {
    const METROS_POR_ROLO = 25;
    const pendentes = {};
    orders.filter(o => {
        if (o.status === "concluido") return false;
        const itens = o.itens ? (Array.isArray(o.itens) ? o.itens : Object.values(o.itens)) : [];
        if (!itens.length) return true;
        const eMap = {};
        Object.values(o.entregasParciais || {}).forEach(e => {
            (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                const k = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                eMap[k] = (eMap[k] || 0) + Number(ei.qtd || 0);
                eMap[k + "|orig"] = (eMap[k + "|orig"] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
            });
        });
        return !itens.every(i => {
            const k = `${(i.cor||"").trim().toLowerCase()}|${i.medida}|${(i.tipo||"").toLowerCase()}`;
            const isOrig = i.unidadeOriginal && i.unidadeOriginal !== "RL";
            const isMetro = i.unidadeOriginal === "m" || i.unidadeOriginal === "Metro";
            const total = isOrig ? (i.qtdOriginal || (isMetro ? (i.qtdTotal||0)*25 : i.qtdTotal||0)) : (i.qtdTotal || 0);
            return (isOrig ? (eMap[k + "|orig"] || 0) : (eMap[k] || 0)) >= total;
        });
    }).forEach(order => {
        const itens = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});
        const eMap = {};
        Object.values(order.entregasParciais || {}).forEach(e => {
            (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                const k = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                eMap[k] = (eMap[k] || 0) + Number(ei.qtd || 0);
                eMap[k + "|orig"] = (eMap[k + "|orig"] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
            });
        });
        itens.forEach(it => {
            const isMetro = it.unidadeOriginal === "Metro" || it.unidadeOriginal === "m";
            const isKg    = it.unidadeOriginal === "Kg" || it.unidadeOriginal === "KG";
            const isOrig = isMetro || isKg;
            const ek = `${(it.cor||"").trim().toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`;
            const entregue = isOrig ? (eMap[ek + "|orig"] || 0) : (eMap[ek] || 0);

            let qtdDisp, unidDisp, pendenteRL;

            if (isMetro) {
                const totalM = it.qtdOriginal || (it.unidadeOriginal === "Metro" ? (it.qtdTotal || 0) * METROS_POR_ROLO : (it.qtdTotal || 0));
                qtdDisp = Math.max(0, totalM - entregue);
                unidDisp = "m";
                pendenteRL = qtdDisp;
            } else if (isKg) {
                const isGorgurao = (it.tipo || "").toLowerCase().includes("gorgu");
                if (isGorgurao) {
                    qtdDisp  = Math.max(0, (it.qtdTotal || 0) - (eMap[ek] || 0));
                    unidDisp = "RL";
                    pendenteRL = qtdDisp;
                } else {
                    const totalKg = it.qtdOriginal || 0;
                    qtdDisp  = Math.max(0, totalKg - entregue);
                    unidDisp = "KG";
                    pendenteRL = Math.max(0, (it.qtdTotal || 0) - (eMap[ek] || 0));
                }
            } else {
                qtdDisp  = Math.max(0, (it.qtdTotal || 0) - entregue);
                unidDisp = unidadePDF(it.tipo, it.unidadeOriginal);
                pendenteRL = qtdDisp;
            }

            if (qtdDisp <= 0) return;

            const k = `${it.tipo}|${it.medida}|${(it.cor||"").trim()}|${unidDisp}`;
            if (!pendentes[k]) pendentes[k] = { tipo: it.tipo || "—", medida: it.medida || "—", cor: (it.cor||"—").trim(), qtd: 0, unidade: unidDisp, pendenteRLTotal: 0 };
            pendentes[k].qtd += qtdDisp;
            pendentes[k].pendenteRLTotal += pendenteRL;
        });
    });

    // Calcula estoque — mesma lógica exata do painel (com chave por unidade)
    const normUnPDF = (tipo, u) => tipo !== "Elástico" ? "RL" : (!u || u === "RL" || u === "Rolo") ? "Rolo" : "Metro";
    const parseTSPDF = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
    const estoqueMapPDF = {};
    [...(movimentos || [])].sort((a,b) => parseTSPDF(a.timestamp) - parseTSPDF(b.timestamp)).forEach(m => {
        if (!m.tipo || !m.medida) return;
        const un = normUnPDF(m.tipo, m.unidade);
        const k  = `${m.tipo}|${m.medida}|${(m.cor||"").trim().toLowerCase()}|${un}`;
        const k0 = `${m.tipo}|${m.medida}||${un}`;
        const delta = m.movimento === "entrada" ? Number(m.qtd) : -Number(m.qtd);
        estoqueMapPDF[k]  = Math.max(0, (estoqueMapPDF[k]  || 0) + delta);
        if (!m.cor || !m.cor.trim()) estoqueMapPDF[k0] = Math.max(0, (estoqueMapPDF[k0] || 0) + delta);
    });
    const getEstoquePDF = (tipo, medida, cor, unidade) => {
        const c = (cor||"").trim().toLowerCase();
        const unChave = unidade === "m" ? "Metro" : (tipo === "Elástico" ? "Rolo" : "RL");
        return estoqueMapPDF[`${tipo}|${medida}|${c}|${unChave}`]
               || estoqueMapPDF[`${tipo}|${medida}||${unChave}`] || 0;
    };

    // Agrupa tipo → medida → itens
    const grupos = {};
    Object.values(pendentes).forEach(it => {
        const estoqueDisp = Math.max(0, getEstoquePDF(it.tipo, it.medida, (it.cor||"").toLowerCase(), it.unidade));
        const estoqueDispRL = (it.unidade === "m" && it.tipo !== "Elástico") ? estoqueDisp / METROS_POR_ROLO : estoqueDisp;
        const pendenteRL = it.pendenteRLTotal || ((it.unidade === "m" && it.tipo !== "Elástico") ? it.qtd / METROS_POR_ROLO : it.qtd);

        if (!grupos[it.tipo]) grupos[it.tipo] = {};
        if (!grupos[it.tipo][it.medida]) grupos[it.tipo][it.medida] = [];
        grupos[it.tipo][it.medida].push({ ...it, estoqueDisp, pendenteRL, estoqueDispRL });
    });
    Object.keys(grupos).forEach(t => Object.keys(grupos[t]).forEach(m => grupos[t][m].sort((a,b) => a.cor.localeCompare(b.cor))));

    const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const tipoStyle = { Gorgurão: ["#EA580C","#FFF7ED"], Poliéster: ["#4338CA","#EEF2FF"], Elástico: ["#16A34A","#F0FDF4"] };
    const tiposOrdenados = ["Elástico","Gorgurão","Poliéster"].filter(t => grupos[t]).concat(Object.keys(grupos).filter(t => !["Gorgurão","Poliéster","Elástico"].includes(t)));

    let rows = "";
    tiposOrdenados.forEach(tipo => {
        const [tc, tbg] = tipoStyle[tipo] || ["#6B7280","#F9FAFB"];
        rows += `<tr><td colspan="4" style="padding:10px 12px 4px;background:${tbg};border-top:2px solid ${tc};font-size:13px;font-weight:800;color:${tc}">${tipo}</td></tr>`;
        const medidasOrdenadas = Object.keys(grupos[tipo]).sort((a,b) => parseInt(a)-parseInt(b));
        medidasOrdenadas.forEach(medida => {
            // Para Elástico, separa por subgrupo de unidade (m vs RL)
            const itensGrupo = grupos[tipo][medida];
            const subgrupos = tipo === "Elástico"
                ? [{ label: "Metro", itens: itensGrupo.filter(i => i.unidade === "m") }, { label: "Rolo (RL)", itens: itensGrupo.filter(i => i.unidade !== "m") }].filter(s => s.itens.length > 0)
                : [{ label: null, itens: itensGrupo }];

            rows += `<tr><td colspan="4" style="padding:8px 12px;font-size:13px;font-weight:900;color:#fff;letter-spacing:.08em;background:#374151;border-top:3px solid #111827">${medida.toUpperCase()}</td></tr>`;

            subgrupos.forEach(sub => {
                if (sub.label) {
                    rows += `<tr><td colspan="4" style="padding:3px 12px 3px 36px;font-size:9px;font-weight:700;color:#10B981;letter-spacing:.08em;background:#F0FDF4">${sub.label.toUpperCase()}</td></tr>`;
                }
                sub.itens.forEach((it, idx) => {
                    const ok = it.estoqueDispRL >= it.pendenteRL;
                    const estoqueStr = it.estoqueDisp > 0 ? `${it.estoqueDisp.toLocaleString("pt-BR")} ${it.unidade}` : "—";
                    const estCor = it.estoqueDisp === 0 ? "#9CA3AF" : ok ? "#16A34A" : "#DC2626";
                    rows += `<tr style="background:${idx%2===0?"#fff":"#FAFAFA"}">
                        <td style="padding:6px 12px 6px ${sub.label ? "44px" : "32px"};color:#111827">${it.cor}</td>
                        <td style="padding:6px 12px;font-weight:700;color:#111827;text-align:right">${it.qtd.toLocaleString("pt-BR")} ${it.unidade}</td>
                        <td style="padding:6px 12px;color:${estCor};font-weight:600;text-align:right">${estoqueStr}</td>
                        <td style="padding:6px 12px;text-align:center">${it.estoqueDisp === 0 ? '<span style="color:#DC2626;font-weight:700">!</span>' : ok ? '<span style="color:#16A34A;font-weight:700">✓</span>' : '<span style="color:#DC2626;font-weight:700">!</span>'}</td>
                    </tr>`;
                });
            });
        });
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relação de Itens Pendentes</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#111}
    h1{font-size:18px;font-weight:800;margin-bottom:2px}
    .sub{font-size:11px;color:#6B7280;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th{background:#F3F4F6;padding:7px 12px;text-align:left;font-size:10px;font-weight:700;color:#6B7280;border-bottom:2px solid #ECEDF1;letter-spacing:.06em}
    td{border-bottom:1px solid #F3F4F6}
    @media print{@page{margin:10mm}}</style></head>
    <body>
    <h1>Relação de Itens Pendentes</h1>
    <div class="sub">FourTEX Indústria Têxtil &nbsp;·&nbsp; ${hoje}</div>
    <table>
    <thead><tr>
        <th>Cor</th>
        <th style="text-align:right">Pendente</th>
        <th style="text-align:right">Estoque</th>
        <th style="text-align:center">OK?</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    </table>
    <script>window.onload=()=>window.print();</script></body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
}

export default function DashboardTab({ machines, orders, logs, alertOrders, overdueOrders = [], onNavigate, movimentos = [] }) {
    const isMobile = useIsMobile();
    const [itensTipoTab, setItensTipoTab] = useState("Todos");
    const [clienteFiltro, setClienteFiltro] = useState("");
    const [itensView, setItensView] = useState("itens"); // "itens" | "fio"
    const [itemPopup, setItemPopup] = useState(null); // { item, clientes: [{nome, restante, total}] }

    const pedidoCompleto = (o) => {
        if (o.status === "concluido") return true;
        const it = o.itens ? (Array.isArray(o.itens) ? o.itens : Object.values(o.itens)) : [];
        if (!it.length) return false;
        const eMap = {};
        Object.values(o.entregasParciais || {}).forEach(e => {
            (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                const k = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                eMap[k] = (eMap[k] || 0) + Number(ei.qtd || 0);
                eMap[k + "|orig"] = (eMap[k + "|orig"] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
            });
        });
        return it.every(i => {
            const k = `${(i.cor||"").trim().toLowerCase()}|${i.medida}|${(i.tipo||"").toLowerCase()}`;
            const isOrig = i.unidadeOriginal && i.unidadeOriginal !== "RL";
            const isMetro = i.unidadeOriginal === "m" || i.unidadeOriginal === "Metro";
            const total = isOrig ? (i.qtdOriginal || (isMetro ? (i.qtdTotal||0)*25 : i.qtdTotal||0)) : (i.qtdTotal || 0);
            const ent = isOrig ? (eMap[k + "|orig"] || 0) : (eMap[k] || 0);
            return ent >= total;
        });
    };
    const calcProgresso = (o) => {
        const it = o.itens ? (Array.isArray(o.itens) ? o.itens : Object.values(o.itens)) : [];
        if (!it.length) return { total: 0, prod: 0, pct: 0 };
        const eMap = {};
        Object.values(o.entregasParciais || {}).forEach(e => {
            (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                const k = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                eMap[k] = (eMap[k] || 0) + Number(ei.qtd || 0);
                eMap[k + "|orig"] = (eMap[k + "|orig"] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
            });
        });
        let total = 0, prod = 0;
        it.forEach(i => {
            const k = `${(i.cor||"").trim().toLowerCase()}|${i.medida}|${(i.tipo||"").toLowerCase()}`;
            const isOrig = i.unidadeOriginal && i.unidadeOriginal !== "RL";
            const t = isOrig ? (i.qtdOriginal || i.qtdTotal || 0) : (i.qtdTotal || 0);
            const e = isOrig ? (eMap[k + "|orig"] || 0) : (eMap[k] || 0);
            total += t;
            prod += Math.min(e, t);
        });
        return { total, prod, pct: total > 0 ? Math.round((prod / total) * 100) : 0 };
    };
    const emProd       = orders.filter(o => o.status === "em_producao");
    const confirmacao  = orders.filter(o => o.status === "confirmacao");
    const concluidos   = orders.filter(o => pedidoCompleto(o));
    const paradas      = machines.filter(m => m.parada);
    const hojeStr      = new Date().toLocaleDateString("pt-BR");
    const logsHoje     = logs.filter(l => l.timestamp?.startsWith(hojeStr));
    const rlHoje       = logsHoje.filter(l => (l.tipo || "").toLowerCase() !== "poliéster").reduce((s, l) => s + (Number(l.qtd) || 0), 0);


    const dataExtenso  = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

    return (
        <div style={{ padding: "24px 24px 40px", maxWidth: 1200, margin: "0 auto" }}>

            {/* Popup detalhe item */}
            {itemPopup && (
                <div onClick={() => setItemPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", minWidth: 260, maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #ECEDF1" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}><CorInline cor={itemPopup.cor} />{itemPopup.medida} {itemPopup.cor}</span>
                                <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>{itemPopup.tipo}</span>
                            </div>
                            <button onClick={() => setItemPopup(null)} style={{ background: "none", border: "none", fontSize: 18, color: "#9CA3AF", cursor: "pointer", lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {Object.values(itemPopup.clientes.reduce((acc, c) => {
                                const k = c.nome;
                                if (!acc[k]) acc[k] = { nome: c.nome, total: 0, prod: 0, numeros: [] };
                                acc[k].total += c.total;
                                acc[k].prod  += c.prod;
                                if (c.numero) acc[k].numeros.push(c.numero);
                                return acc;
                            }, {})).map((c, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#F9FAFB", borderRadius: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                                        {c.numeros.map(n => (
                                            <span key={n} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F3F4F6", borderRadius: 4, padding: "1px 5px", marginRight: 4 }}>#{n}</span>
                                        ))}
                                        {c.nome}
                                    </span>
                                    {(() => {
                                        const un = itemPopup.unidade || "RL";
                                        const falta = Math.max(0, c.total - c.prod);
                                        const entregue = falta === 0;
                                        return (
                                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {entregue && <span style={{ fontSize: 12, color: "#9CA3AF" }}>{c.total.toLocaleString("pt-BR")} {un}</span>}
                                                <span style={{ fontSize: 13, fontWeight: 700, color: entregue ? "#16A34A" : "#F97316" }}>
                                                    {entregue ? "✓" : `${falta.toLocaleString("pt-BR")} ${un}`}
                                                </span>
                                            </span>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 10, padding: "6px 10px", background: "#F3F4F6", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>Total restante</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{itemPopup.restante.toLocaleString("pt-BR")} {itemPopup.unidade || "RL"}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Painel de Produção</div>
                    <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3, textTransform: "capitalize" }}>{dataExtenso}</div>
                </div>
                {confirmacao.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: 10, padding: "8px 14px" }}>
                        <span style={{ color: "#F97316" }}>{ICON.pending}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#C2410C" }}>
                            {confirmacao.length} pedido{confirmacao.length !== 1 ? "s" : ""} aguardando confirmação
                        </span>
                    </div>
                )}
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 28 }}>
                <StatCard label="Em produção"     value={emProd.length}      sub={`${orders.length} pedidos total`}        icon={ICON.orders}  bg="#FFF7ED" iconColor="#F97316" />
                <StatCard label="Concluídos"       value={concluidos.length}  sub="pedidos entregues"                        icon={ICON.check}   bg="#F0FDF4" iconColor="#16A34A" />
                <StatCard label="Máquinas ativas"  value={machines.length - paradas.length} sub={paradas.length > 0 ? `${paradas.length} parada${paradas.length !== 1 ? "s" : ""}` : "todas operando"} icon={ICON.machine} bg={paradas.length > 0 ? "#FEF2F2" : "#EFF6FF"} iconColor={paradas.length > 0 ? "#DC2626" : "#6366F1"} />
                <StatCard label="RL lançados hoje" value={rlHoje.toLocaleString("pt-BR")} sub={`${logsHoje.length} lançamento${logsHoje.length !== 1 ? "s" : ""}`} icon={ICON.log} bg="#FEFCE8" iconColor="#CA8A04" />
            </div>

            {/* Urgentes */}
            {alertOrders.length > 0 && (
                <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ color: "#F97316" }}>{ICON.alert}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#C2410C", letterSpacing: "0.04em" }}>ENTREGAS EM ATÉ 7 DIAS ÚTEIS</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {alertOrders.map(o => {
                            const { pct } = calcProgresso(o);
                            const dias   = workdaysBetween(today, o.dataEntrega);
                            return (
                                <div key={o.id} onClick={() => onNavigate?.("pedidos")} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: onNavigate ? "pointer" : "default", borderRadius: 8, padding: "4px 6px", margin: "-4px -6px", transition: "background 0.15s" }}
                                    onMouseEnter={e => { if (onNavigate) e.currentTarget.style.background = "#FED7AA40"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#9A3412" }}>{o.cliente || "—"}</span>
                                        <span style={{ fontSize: 12, color: "#C2410C", marginLeft: 8 }}>· Entrega {formatDate(o.dataEntrega)} · {dias}d úteis</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 160 }}>
                                        <div style={{ flex: 1, height: 5, background: "#FED7AA", borderRadius: 3, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 70 ? "#16A34A" : "#F97316", borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#C2410C", minWidth: 30 }}>{pct}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Atrasados */}
            {overdueOrders.length > 0 && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ color: "#DC2626" }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C", letterSpacing: "0.04em" }}>
                            PEDIDOS ATRASADOS — {overdueOrders.length}
                        </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {overdueOrders.map(o => {
                            const { pct } = calcProgresso(o);
                            const diasAtraso = Math.abs(workdaysBetween(today, o.dataEntrega));
                            return (
                                <div key={o.id} onClick={() => onNavigate?.("pedidos")} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: onNavigate ? "pointer" : "default", borderRadius: 8, padding: "4px 6px", margin: "-4px -6px", transition: "background 0.15s" }}
                                    onMouseEnter={e => { if (onNavigate) e.currentTarget.style.background = "#FECACA40"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#7F1D1D" }}>{o.cliente || "—"}</span>
                                        <span style={{ fontSize: 12, color: "#B91C1C", marginLeft: 8 }}>· Entregue em {formatDate(o.dataEntrega)} · <strong>{diasAtraso}d úteis atrasado</strong></span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 160 }}>
                                        <div style={{ flex: 1, height: 5, background: "#FECACA", borderRadius: 3, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 70 ? "#16A34A" : "#DC2626", borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C", minWidth: 30 }}>{pct}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* Corpo: tabela */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, alignItems: "start" }}>

                {/* Total por item (medida + cor) */}
                {(() => {
                    const ativos = orders.filter(o => !pedidoCompleto(o));
                    const clientesUnicos = [...new Set(ativos.map(o => o.cliente).filter(Boolean))].sort();
                    const ativosFiltrados = clienteFiltro ? ativos.filter(o => o.cliente === clienteFiltro) : ativos;
                    const porItem = {};
                    const safeQty = v => { const n = Number(v); return isFinite(n) && n >= 0 ? Math.round(n) : 0; };
                    ativosFiltrados.forEach(o => {
                        const itens = Array.isArray(o.itens) ? o.itens : Object.values(o.itens || {});
                        const entregas = Array.isArray(o.entregasParciais) ? o.entregasParciais : Object.values(o.entregasParciais || {});
                        const entregueMap = {};
                        const entregueOrigMap = {};
                        entregas.forEach(e => {
                            const itensE = Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {});
                            itensE.forEach(ei => {
                                const k = `${(ei.cor||"").toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                                entregueMap[k] = (entregueMap[k] || 0) + safeQty(ei.qtd);
                                entregueOrigMap[k] = (entregueOrigMap[k] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                            });
                        });
                        itens.forEach(i => {
                            const _un = (i.unidade || "").toLowerCase();
                            const unidadeOrig = (i.unidadeOriginal || "").toLowerCase();
                            const isKg    = unidadeOrig === "kg" || (i.tipo || "").toLowerCase() === "poliéster";
                            const isMetro = unidadeOrig === "metro" || unidadeOrig === "metros" || _un === "metro" || _un === "metros";
                            const unidade = isKg ? "KG" : isMetro ? "m" : "RL";
                            const key = `${i.tipo || ""}|${i.medida || ""}|${(i.cor || "—").trim()}|${unidade}`;
                            const ekKey = `${(i.cor||"").toLowerCase()}|${i.medida}|${(i.tipo||"").toLowerCase()}`;
                            const entregue = (isKg || isMetro) ? (entregueOrigMap[ekKey] || 0) : (entregueMap[ekKey] || 0);
                            const total = (isKg || isMetro) && i.qtdOriginal != null
                                ? safeQty(i.qtdOriginal)
                                : safeQty(i.qtdTotal);
                            if (!porItem[key]) porItem[key] = { tipo: i.tipo || "", medida: i.medida || "", cor: (i.cor || "—").trim(), total: 0, prod: 0, clientes: [], unidade };
                            porItem[key].total += total;
                            porItem[key].prod  += entregue;
                            porItem[key].clientes.push({ nome: o.cliente || "—", numero: o.numero, total, prod: entregue });
                        });
                    });
                    // Calcula estoque — mesma lógica do EstoqueTab (inclui unidade na chave)
                    const METROS_POR_ROLO_D = 25;
                    const parseTSDash = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
                    const normUnD = (tipo, u) => tipo !== "Elástico" ? "RL" : (!u || u === "RL" || u === "Rolo") ? "Rolo" : "Metro";
                    const estoqueDispMap = {};
                    [...movimentos].sort((a,b) => parseTSDash(a.timestamp) - parseTSDash(b.timestamp)).forEach(m => {
                        if (!m.tipo || !m.medida) return;
                        const un = normUnD(m.tipo, m.unidade);
                        const k = `${m.tipo}|${m.medida}|${(m.cor||"").trim()}|${un}`;
                        const delta = m.movimento === "entrada" ? Number(m.qtd) : -Number(m.qtd);
                        estoqueDispMap[k] = Math.max(0, (estoqueDispMap[k] || 0) + delta);
                    });
                    // Busca estoque na unidade do item (com conversão entre Metro e Rolo)
                    const getEstoque = (tipo, medida, cor, unidade) => {
                        const corT = (cor||"").trim();
                        const unChave = unidade === "m" ? "Metro" : (tipo === "Elástico" ? "Rolo" : "RL");
                        return estoqueDispMap[`${tipo}|${medida}|${corT}|${unChave}`] || 0;
                    };

                    const listaCompleta = Object.values(porItem)
                        .map(v => ({ ...v, restante: Math.max(0, v.total - v.prod), estoqueDisp: getEstoque(v.tipo, v.medida, v.cor, v.unidade) }))
                        .filter(v => v.total > 0 && (v.restante > 0 || v.estoqueDisp > 0))
                        .sort((a, b) => {
                            const tipoOrder = { "Elástico": 0, "Gorgurão": 1, "Poliéster": 2 };
                            const ta = tipoOrder[a.tipo] ?? 9, tb = tipoOrder[b.tipo] ?? 9;
                            if (ta !== tb) return ta - tb;
                            const ma = parseInt(a.medida) || 0, mb = parseInt(b.medida) || 0;
                            if (ma !== mb) return ma - mb;
                            return b.restante - a.restante;
                        });
                    const lista = itensTipoTab === "Todos" ? listaCompleta : listaCompleta.filter(v => v.tipo === itensTipoTab);

                    const TIPO_COLOR = TIPO_TAB_COLOR;

                    return (
                        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>Itens a Produzir</div>
                                    <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>{lista.length} itens</span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                    <button onClick={() => gerarPDFItens(orders, movimentos)} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>📄 PDF</button>
                                    <select value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, border: "1px solid #ECEDF1", background: clienteFiltro ? "#FFF7ED" : "#F9FAFB", color: clienteFiltro ? "#F97316" : "#6B7280", fontWeight: clienteFiltro ? 700 : 400, outline: "none", cursor: "pointer", maxWidth: 150 }}>
                                        <option value="">Todos clientes</option>
                                        {clientesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div style={{ display: "flex", gap: 3, padding: 3, background: "#F3F4F6", borderRadius: 9, flexShrink: 0 }}>
                                        {[{ id: "itens", label: "📦 Itens" }, { id: "fio", label: "🧵 Fio necessário" }].map(v => (
                                            <button key={v.id} onClick={() => setItensView(v.id)} style={{
                                                padding: "6px 16px", borderRadius: 7, border: "none",
                                                fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                                                background: itensView === v.id ? "#fff" : "transparent",
                                                color: itensView === v.id ? "#111827" : "#9CA3AF",
                                                boxShadow: itensView === v.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                            }}>{v.label}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid #F3F4F6" }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", marginRight: 2 }}>TIPO</span>
                                    {TIPO_TABS.map(t => {
                                        const active = itensTipoTab === t;
                                        const tc = TIPO_TAB_COLOR[t] || "#6B7280";
                                        return (
                                            <button key={t} onClick={() => setItensTipoTab(t)} style={{
                                                padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
                                                fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                                                borderColor: active ? tc : "#ECEDF1",
                                                background: active ? tc + "18" : "#fff",
                                                color: active ? tc : "#9CA3AF",
                                            }}>{t}</button>
                                        );
                                    })}
                                </div>
                            </div>
                            {lista.length === 0 ? (
                                <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Nenhum item em produção.</div>
                            ) : itensView === "fio" ? (() => {
                                const comFio = lista
                                    .map(v => ({ ...v, kgFio: calcKgFio(v.tipo, v.medida, v.restante, v.unidade) }))
                                    .filter(v => v.kgFio > 0);
                                if (comFio.length === 0) return <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Nenhum item pendente com peso de fio calculável.</div>;
                                const porCor = {};
                                comFio.forEach(v => {
                                    if (!porCor[v.cor]) porCor[v.cor] = { cor: v.cor, kgFio: 0, tipos: new Set(), itens: 0 };
                                    porCor[v.cor].kgFio += v.kgFio;
                                    porCor[v.cor].tipos.add(v.tipo);
                                    porCor[v.cor].itens += 1;
                                });
                                const porCorLista = Object.values(porCor).sort((a, b) => b.kgFio - a.kgFio);
                                const totalFio = comFio.reduce((s, v) => s + v.kgFio, 0);
                                return (
                                    <div style={{ overflowX: "auto" }}>
                                        <div style={{ padding: "10px 20px", background: "#EEF2FF", borderBottom: "1px solid #ECEDF1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#6366F1" }}>TOTAL DE FIO NECESSÁRIO</span>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: "#4338CA" }}>{totalFio.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg</span>
                                        </div>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: "#F9FAFB" }}>
                                                    {["Cor", "Tipos", "Itens", "Fio necessário"].map(h => (
                                                        <th key={h} style={{ padding: "7px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", borderBottom: "1px solid #ECEDF1", whiteSpace: "nowrap" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {porCorLista.map((v, i) => (
                                                    <tr key={v.cor} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA", borderBottom: "1px solid #F3F4F6" }}>
                                                        <td style={{ padding: "8px 14px", fontWeight: 700, color: "#111827" }}><CorInline cor={v.cor} />{v.cor}</td>
                                                        <td style={{ padding: "8px 14px", color: "#6B7280", fontSize: 11 }}>{[...v.tipos].join(" + ")}</td>
                                                        <td style={{ padding: "8px 14px", color: "#9CA3AF", fontSize: 11 }}>{v.itens}</td>
                                                        <td style={{ padding: "8px 14px", fontWeight: 800, color: "#4338CA", whiteSpace: "nowrap" }}>{v.kgFio.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })() : (() => {
                                const UNIDADE_CONFIG = {
                                    "RL":  { label: "Rolo (RL)",   cor: "#F97316", bg: "#FFF7ED" },
                                    "KG":  { label: "Quilo (KG)",  cor: "#6366F1", bg: "#EEF2FF" },
                                    "m":   { label: "Metro (m)",   cor: "#0891B2", bg: "#ECFEFF" },
                                };
                                const grupos = ["RL", "KG", "m"].map(un => ({ un, itens: lista.filter(v => v.unidade === un) })).filter(g => g.itens.length > 0);
                                return (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: "#F9FAFB" }}>
                                                    {["Tipo", "Medida", "Cor", "Restante", "Estoque", "%"].map(h => (
                                                        <th key={h} style={{ padding: "7px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", borderBottom: "1px solid #ECEDF1", whiteSpace: "nowrap" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {grupos.map(({ un, itens: gItens }) => {
                                                    const cfg = UNIDADE_CONFIG[un] || { label: un, cor: "#9CA3AF", bg: "#F9FAFB" };
                                                    const totalRestante = gItens.reduce((s, v) => s + v.restante, 0);
                                                    return [
                                                        <tr key={`header-${un}`}>
                                                            <td colSpan={6} style={{ padding: "6px 14px", background: cfg.bg, borderTop: "1px solid #ECEDF1", borderBottom: `1px solid ${cfg.cor}30` }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.cor, display: "inline-block", flexShrink: 0 }} />
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.cor }}>{cfg.label}</span>
                                                                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>{totalRestante.toLocaleString("pt-BR")} {un} restantes · {gItens.length} {gItens.length === 1 ? "item" : "itens"}</span>
                                                                </div>
                                                            </td>
                                                        </tr>,
                                                        ...gItens.map((v, i) => {
                                                            // % = quanto do restante é coberto pelo estoque
                                                            const pct = v.restante > 0 ? Math.min(100, Math.round((v.estoqueDisp / v.restante) * 100)) : 100;
                                                            const done = v.restante === 0;
                                                            const tc = TIPO_COLOR[v.tipo] || "#9CA3AF";
                                                            return (
                                                                <tr key={`${un}-${i}`} onClick={() => setItemPopup(v)} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA", borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = "#FFF7ED"}
                                                                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFAFA"}
                                                                >
                                                                    <td style={{ padding: "8px 14px" }}>
                                                                        <span style={{ fontSize: 10, fontWeight: 700, color: tc, background: tc + "15", padding: "1px 7px", borderRadius: 5 }}>{v.tipo}</span>
                                                                    </td>
                                                                    <td style={{ padding: "8px 14px", fontWeight: 600, color: "#374151" }}>{v.medida}</td>
                                                                    <td style={{ padding: "8px 14px", fontWeight: 600, color: "#111827" }}><CorInline cor={v.cor} />{v.cor}</td>
                                                                    <td style={{ padding: "8px 14px", fontWeight: 800, whiteSpace: "nowrap" }}>
                                                                        {v.restante === 0
                                                                            ? <span style={{ color: "#16A34A" }}>✓ Coberto</span>
                                                                            : <span style={{ color: "#F97316" }}>{v.restante.toLocaleString("pt-BR")} <span style={{ fontSize: 10, fontWeight: 600 }}>{v.unidade}</span></span>
                                                                        }
                                                                    </td>
                                                                    <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>
                                                                        {v.estoqueDisp > 0
                                                                            ? <span style={{ fontWeight: 700, color: v.estoqueDisp >= v.restante ? "#16A34A" : "#F97316" }}>{v.estoqueDisp.toLocaleString("pt-BR")} <span style={{ fontSize: 10, fontWeight: 400, color: "#9CA3AF" }}>{v.unidade}</span></span>
                                                                            : <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>sem estoque</span>
                                                                        }
                                                                    </td>
                                                                    <td style={{ padding: "8px 14px" }}>
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                            <div style={{ width: 50, height: 4, background: "#F3F4F6", borderRadius: 2, overflow: "hidden" }}>
                                                                                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: done ? "#16A34A" : pct >= 50 ? "#F97316" : "#6366F1", borderRadius: 2 }} />
                                                                            </div>
                                                                            <span style={{ fontSize: 10, color: "#9CA3AF", minWidth: 24 }}>{pct}%</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ];
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
