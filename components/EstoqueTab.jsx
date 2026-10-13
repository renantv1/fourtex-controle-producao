import { useState, useMemo } from "react";
import { ref, push, remove } from "firebase/database";
import { db } from "../firebase";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorInline } from "../utils/CorDot";
import { CorSelect } from "../utils/CorSelect";
import { fmtInt, fmtDec, parseNum } from "../utils";

const TIPOS = ["Gorgurão", "Poliéster", "Elástico"];
const MEDIDAS = ["8mm", "12mm", "15mm", "20mm", "22mm", "25mm", "30mm", "35mm", "40mm", "50mm"];
const TIPO_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };
const TIPO_BG    = { Gorgurão: "#FFF7ED", Poliéster: "#EEF2FF", Elástico: "#F0FDF4" };

function printRelatorioEstoqueAtual(itens, tiposAtivos) {
    const fn = v => Number(v).toLocaleString("pt-BR");
    const CARD_COLOR = {
        Gorgurão:  { c: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
        Poliéster: { c: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
        Elástico:  { c: "#10B981", bg: "#F0FDF4", border: "#BBF7D0" },
    };
    const badge = CARD_COLOR[tiposAtivos[0]] || { c: "#374151" };

    const cardsHtml = `<div class="cards" style="grid-template-columns:repeat(${tiposAtivos.length},1fr)">${tiposAtivos.map(tipo => {
        const itensTipo = itens.filter(i => i.tipo === tipo);
        const totalRL = itensTipo.filter(i => i.unidade !== "Metro").reduce((s, i) => s + i.total, 0);
        const totalMetro = itensTipo.filter(i => i.unidade === "Metro").reduce((s, i) => s + i.total, 0);
        const cc = CARD_COLOR[tipo] || { c: "#374151", bg: "#F9FAFB", border: "#ECEDF1" };
        const valor = totalMetro > 0 ? `${fn(totalRL)} RL <span class="unit">+ ${fn(totalMetro)} m</span>` : `${fn(totalRL)}<span class="unit">RL</span>`;
        return `<div class="card" style="background:${cc.bg};border-color:${cc.border}">
            <div class="label">${tipo}</div>
            <div class="value" style="color:${cc.c}">${valor}</div>
            <div class="sub">${itensTipo.length} ${itensTipo.length === 1 ? "item" : "itens"} em estoque</div>
        </div>`;
    }).join("")}</div>`;

    const tabelasHtml = tiposAtivos.map(tipo => {
        const itensTipo = itens.filter(i => i.tipo === tipo);
        if (itensTipo.length === 0) return "";
        const medidas = [...new Set(itensTipo.map(i => i.medida))].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
        const rows = medidas.map(medida => {
            const linhas = itensTipo.filter(i => i.medida === medida).sort((a, b) => a.cor.localeCompare(b.cor, "pt-BR"));
            const subRL = linhas.filter(i => i.unidade !== "Metro").reduce((s, i) => s + i.total, 0);
            const subMetro = linhas.filter(i => i.unidade === "Metro").reduce((s, i) => s + i.total, 0);
            const subLabel = subMetro > 0 ? `${fn(subRL)} RL + ${fn(subMetro)} m` : `${fn(subRL)} RL`;
            return `<tr class="subtotal"><td><strong>${medida}</strong></td><td>SUBTOTAL</td><td class="r">${subLabel}</td></tr>`
                + linhas.map(i => `<tr><td></td><td>${i.cor}</td><td class="r">${fn(i.total)} ${i.unidade === "Metro" ? "m" : "RL"}</td></tr>`).join("");
        }).join("");
        const cc = CARD_COLOR[tipo] || { c: "#111" };
        return `<div class="section-title" style="color:${cc.c}">${tipo}</div>
        <table><thead><tr><th>Medida</th><th>Cor</th><th class="r">Qtd</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join("");

    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relatório de Estoque — FourTEX</title>
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:12px;color:#111;}
    .page-header{background:#111827;color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:flex-end;}
    .page-header .titulo{font-size:18px;font-weight:800;}.page-header .sub{font-size:11px;color:#9CA3AF;margin-top:2px;}
    .page-header .emp{font-size:13px;font-weight:700;color:${badge.c};}
    .content{padding:20px 28px;}
    .cards{display:grid;gap:10px;margin-bottom:18px;}
    .card{border-radius:9px;padding:11px 14px;border:1.5px solid #ECEDF1;}
    .card .label{font-size:9px;font-weight:700;letter-spacing:0.07em;color:#9CA3AF;margin-bottom:5px;text-transform:uppercase;}
    .card .value{font-size:19px;font-weight:800;line-height:1.1;}
    .card .unit{font-size:10px;font-weight:500;color:#9CA3AF;margin-left:2px;}
    .card .sub{font-size:10px;color:#9CA3AF;margin-top:3px;}
    .section-title{font-size:11px;font-weight:800;margin:16px 0 7px;padding-bottom:4px;border-bottom:2px solid #ECEDF1;text-transform:uppercase;letter-spacing:0.05em;}
    table{border-collapse:collapse;width:100%;margin-bottom:4px;}
    th{background:#111827;color:#fff;text-align:left;padding:6px 10px;font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;}
    th.r{text-align:right;}td{padding:5px 10px;border-bottom:1px solid #F3F4F6;font-size:11px;}td.r{text-align:right;font-weight:600;}
    tr.subtotal td{background:#F9FAFB;font-weight:700;color:${badge.c};}
    .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ECEDF1;font-size:9px;color:#9CA3AF;display:flex;justify-content:space-between;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    </style></head><body>
    <div class="page-header">
        <div style="display:flex;align-items:center;gap:14px">
            <div style="background:${badge.c};border-radius:8px;padding:6px 14px;font-size:15px;font-weight:900;color:#fff;letter-spacing:0.05em">ESTOQUE</div>
            <div><div class="titulo">Relatório de Estoque</div><div class="sub">${tiposAtivos.join(" / ")}</div></div>
        </div>
        <div class="emp">FourTEX — Indústria Têxtil</div>
    </div>
    <div class="content">
        ${cardsHtml}${tabelasHtml}
        <div class="footer"><span>Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span><span>FourTEX — Sistema de Controle de Produção</span></div>
    </div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    w.document.close();
}

export default function EstoqueTab({ orders = [], logs = [], movimentos = [], onEntradaDireta, onSaidaEstoque, userRole, tipos, podeEditar = true }) {
    const isAdmin = userRole === "admin";
    const TIPOS_ATIVOS = tipos && tipos.length ? tipos : TIPOS;
    const [modo, setModo] = useState("entrada");
    const [form, setForm] = useState({ cor: "", medida: "25mm", tipo: TIPOS_ATIVOS[0], qtd: "", unidade: "Rolo" });
    const [tipoAtivo, setTipoAtivo] = useState(TIPOS_ATIVOS[0]);
    const [diasAbertos, setDiasAbertos] = useState({});
    const [histAberto, setHistAberto] = useState({});
    const [inventarioAberto, setInventarioAberto] = useState(false);
    const [inventarioQtds, setInventarioQtds] = useState({});
    const [inventarioSalvando, setInventarioSalvando] = useState(false);
    const [filtroMov, setFiltroMov] = useState({});
    const [filtroCor, setFiltroCor] = useState({});
    const [confirmZerar, setConfirmZerar] = useState(null);
    const [confirmZerarTudo, setConfirmZerarTudo] = useState(false); // false | "step1" | "step2"
    const [zerarConfirmInput, setZerarConfirmInput] = useState("");
    const toggleDia = d => setDiasAbertos(p => ({ ...p, [d]: !p[d] }));


    const handleSubmit = (saldoAtual) => {
        if (!form.cor.trim() || !form.medida.trim()) return;
        const unidade = form.tipo === "Elástico" ? form.unidade : "RL";
        if (modo === "zerar") {
            if (!saldoAtual || saldoAtual <= 0) return;
            setConfirmZerar({ cor: form.cor.trim(), medida: form.medida, tipo: form.tipo, total: saldoAtual, unidade });
            return;
        }
        if (!form.qtd) return;
        const qtdNum = parseNum(form.qtd);
        // Aviso se saldo insuficiente, mas permite registrar a saída mesmo assim
        if (modo === "saida" && saldoAtual !== undefined && saldoAtual > 0 && qtdNum > saldoAtual) {
            const unLabel = unidade === "Metro" ? "m" : unidade === "Rolo" ? "RL" : unidade;
            if (!window.confirm(`Saldo disponível: ${saldoAtual.toLocaleString("pt-BR")} ${unLabel}. Registrar mesmo assim?`)) return;
        }
        const data = { cor: form.cor.trim(), medida: form.medida.trim(), tipo: form.tipo, qtd: qtdNum, unidade };
        if (modo === "entrada") onEntradaDireta(data);
        else onSaidaEstoque(data);
        setForm(p => ({ cor: "", medida: "25mm", tipo: p.tipo, qtd: "", unidade: p.unidade }));
    };

    const isEntrada = modo === "entrada";
    const isZerar   = modo === "zerar";
    const corBtn = isEntrada ? "#F97316" : isZerar ? "#7C3AED" : "#DC2626";

    // Estoque físico = apenas movimentos manuais (entradas e saídas do formulário)
    const estoqueCalculado = useMemo(() => {
        const mapa = {};
        const normUn = (tipo, u) => tipo !== "Elástico" ? "RL" : (!u || u === "RL" || u === "Rolo") ? "Rolo" : "Metro";
        const add = (tipo, medida, cor, delta, u) => {
            if (!tipo || !medida) return;
            const un = normUn(tipo, u);
            const k = `${tipo}|${medida}|${(cor || "").trim()}|${un}`;
            if (!mapa[k]) mapa[k] = { tipo, medida, cor: (cor || "").trim(), unidade: un, total: 0 };
            mapa[k].total = Math.max(0, Math.round((mapa[k].total + delta) * 10) / 10);
        };
        const parseTS = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
        const movOrd = [...movimentos].sort((a, b) => parseTS(a.timestamp) - parseTS(b.timestamp));
        movOrd.forEach(m => add(m.tipo, m.medida, m.cor, m.movimento === "entrada" ? Number(m.qtd) : -Number(m.qtd), m.unidade));
        return Object.values(mapa).filter(v => v.total > 0);
    }, [movimentos]);

    const salvarInventario = async () => {
        setInventarioSalvando(true);
        const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const ops = [];
        const itensInventario = {};
        Object.entries(inventarioQtds).filter(([k]) => !k.startsWith("__")).forEach(([k, novaQtd]) => {
            const [tipo, medida, cor] = k.split("|");
            const qtdNova = Math.max(0, Number(novaQtd)||0);
            const itemAtual = estoqueCalculado.find(e =>
                e.tipo === tipo && e.medida === medida && e.cor.trim() === cor.trim()
            );
            const qtdAtual = itemAtual ? itemAtual.total : 0;
            const diff = qtdNova - qtdAtual;
            const chaveSegura = k.replace(/[.#$/[\]]/g, "_");
            itensInventario[chaveSegura] = { tipo, medida, cor, anterior: qtdAtual, contagem: qtdNova, diferenca: diff };
            if (diff === 0) return;
            ops.push(push(ref(db, "estoqueMovimentos"), {
                movimento: diff > 0 ? "entrada" : "saida",
                cor, medida, tipo, qtd: Math.abs(diff),
                unidade: tipo === "Elástico" ? "Rolo" : "RL", timestamp: ts, operador: "Inventário",
            }));
        });
        if (ops.length === 0) { setInventarioSalvando(false); setInventarioAberto(false); return; }
        await Promise.all(ops);
        await push(ref(db, "inventarioHistorico"), {
            timestamp: ts,
            operador: userRole || "admin",
            itens: itensInventario,
            totalAlterados: ops.length,
        });
        setInventarioQtds({});
        setInventarioAberto(false);
        setInventarioSalvando(false);
    };

    const estoqueCalculadoAtivo = estoqueCalculado.filter(v => TIPOS_ATIVOS.includes(v.tipo));

    const handleZerarTudo = async () => {
        const snapshot = estoqueCalculadoAtivo.slice();
        const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        await Promise.all(snapshot.map(item =>
            push(ref(db, "estoqueMovimentos"), {
                movimento: "saida",
                cor: item.cor,
                medida: item.medida,
                tipo: item.tipo,
                qtd: item.total,
                unidade: item.unidade === "Metro" ? "Metro" : "Rolo",
                timestamp: ts,
                operador: "Zerar tudo",
            })
        ));
        setConfirmZerarTudo(false);
    };

    const handleLimparHistorico = async () => {
        if (!window.confirm("Apagar TODO o histórico de movimentações de estoque? Isso é irreversível.")) return;
        await remove(ref(db, "estoqueMovimentos"));
    };

    return (
        <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
            {confirmZerar && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🗑</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Zerar estoque?</div>
                    <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
                        <strong>{confirmZerar.cor}</strong> · {confirmZerar.medida} · {confirmZerar.tipo}
                    </div>
                    <div style={{ fontSize: 13, color: "#DC2626", fontWeight: 700, marginBottom: 20 }}>
                        Vai zerar o saldo de {confirmZerar.cor} {confirmZerar.medida}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setConfirmZerar(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#374151", cursor: "pointer" }}>Cancelar</button>
                        <button onClick={() => {
                            onSaidaEstoque({ cor: confirmZerar.cor, medida: confirmZerar.medida, tipo: confirmZerar.tipo, qtd: confirmZerar.total, unidade: confirmZerar.unidade === "Metro" ? "Metro" : "Rolo" });
                            setConfirmZerar(null);
                        }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Confirmar</button>
                    </div>
                </div>
            </div>
        )}
            {/* Modal zerar tudo — 2 etapas */}
            {confirmZerarTudo && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 380, textAlign: "center" }}>
                        {confirmZerarTudo === "step1" ? (<>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Zerar todo o estoque?</div>
                            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Isso vai registrar saída de <strong>{estoqueCalculadoAtivo.length} itens</strong> ({TIPOS_ATIVOS.join(", ")}).</div>
                            <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 20 }}>Essa ação não pode ser desfeita.</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => setConfirmZerarTudo(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#374151", cursor: "pointer" }}>Cancelar</button>
                                <button onClick={() => { setConfirmZerarTudo("step2"); setZerarConfirmInput(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Sim, continuar →</button>
                            </div>
                        </>) : (<>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Confirmação final</div>
                            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Digite <strong>ZERAR</strong> para confirmar</div>
                            <input
                                autoFocus
                                value={zerarConfirmInput}
                                onChange={e => setZerarConfirmInput(e.target.value)}
                                placeholder="ZERAR"
                                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `2px solid ${zerarConfirmInput === "ZERAR" ? "#DC2626" : "#ECEDF1"}`, borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: "center", marginBottom: 16, outline: "none" }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => setConfirmZerarTudo(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#374151", cursor: "pointer" }}>Cancelar</button>
                                <button onClick={handleZerarTudo} disabled={zerarConfirmInput !== "ZERAR"} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: zerarConfirmInput === "ZERAR" ? "#DC2626" : "#ECEDF1", color: zerarConfirmInput === "ZERAR" ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 13, cursor: zerarConfirmInput === "ZERAR" ? "pointer" : "not-allowed" }}>Zerar tudo</button>
                            </div>
                        </>)}
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF7ED", border: "1px solid #FED7AA", display: "flex", alignItems: "center", justifyContent: "center", color: "#F97316", flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Estoque</div>
                    <div style={{ fontSize: 13, color: "#6B7280" }}>Posição atual · {TIPOS_ATIVOS.join(", ")}</div>
                </div>
                {podeEditar && (
                    <button onClick={() => { setInventarioAberto(v => !v); setInventarioQtds({}); }} style={{
                        padding: "8px 16px", fontSize: 13, fontWeight: 700,
                        background: inventarioAberto ? "#111827" : "#F9FAFB",
                        border: "1px solid #ECEDF1", borderRadius: 8,
                        color: inventarioAberto ? "#fff" : "#374151", cursor: "pointer",
                    }}>📋 {inventarioAberto ? "Fechar inventário" : "Inventário"}</button>
                )}
                {estoqueCalculadoAtivo.length > 0 && (
                    <button onClick={() => printRelatorioEstoqueAtual(estoqueCalculadoAtivo, TIPOS_ATIVOS)} style={{
                        padding: "8px 16px", fontSize: 13, fontWeight: 700,
                        background: "#F0F9FF", border: "1px solid #BAE6FD",
                        borderRadius: 8, color: "#0369A1", cursor: "pointer",
                    }}>🖨 Relatório de Estoque</button>
                )}
                {isAdmin && (
                    <button onClick={() => {
                        const medidas = ["20mm","22mm","25mm","30mm","35mm","40mm","50mm"];
                        const cores = COR_CATALOG_SORTED.map(c => c.nome);
                        const tipos = [{ nome: "Gorgurão", cor: "#F97316" }, { nome: "Elástico", cor: "#10B981" }].filter(t => TIPOS_ATIVOS.includes(t.nome));
                        const buildTable = (tipo) => {
                            let h = `<table><thead><tr><th class="cor">Cor</th>`;
                            medidas.forEach(m => { h += `<th colspan="2">${m}</th>`; });
                            h += `</tr><tr><th></th>`;
                            medidas.forEach(() => { h += `<th class="sub">Sis</th><th class="sub">Cont</th>`; });
                            h += `</tr></thead><tbody>`;
                            cores.forEach(cor => {
                                h += `<tr><td class="cor">${cor}</td>`;
                                medidas.forEach(med => {
                                    const saldo = Math.max(0, Math.round(estoqueCalculado.find(e => e.tipo === tipo.nome && e.medida === med && e.cor === cor)?.total || 0));
                                    h += `<td class="sis">${saldo || ""}</td><td class="cont"></td>`;
                                });
                                h += `</tr>`;
                            });
                            h += `</tbody></table>`;
                            return h;
                        };
                        const w = window.open("", "_blank");
                        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Inventário</title>
<style>
@page{size:landscape;margin:8mm}
body{font-family:Arial,sans-serif;margin:0;padding:8px}
h1{font-size:13px;margin:0 0 2px}
.sub-title{font-size:9px;color:#888;margin-bottom:6px}
h2{font-size:12px;margin:0 0 4px;page-break-before:always}
h2:first-of-type{page-break-before:auto}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid #ccc;padding:1px 3px;font-size:7.5px;text-align:center}
th{background:#f5f5f5;font-weight:700}
th.cor,td.cor{text-align:left;width:90px;white-space:nowrap;overflow:hidden}
th.sub{font-size:6px;color:#999;font-weight:400}
td.sis{color:#aaa;font-size:7px}
td.cont{background:#FFFDE7}
tr:nth-child(even){background:#FAFAFA}
</style></head><body>
<h1>Inventário de Estoque — FourTEX</h1>
<div class="sub-title">Data: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
${tipos.map(t => `<h2 style="color:${t.cor}">${t.nome}</h2>${buildTable(t)}`).join("")}
<script>window.onload=()=>window.print();</script></body></html>`);
                        w.document.close();
                    }} style={{
                        padding: "8px 16px", fontSize: 13, fontWeight: 700,
                        background: "#F9FAFB", border: "1px solid #ECEDF1",
                        borderRadius: 8, color: "#374151", cursor: "pointer",
                    }}>🖨 Imprimir inventário</button>
                )}
            </div>

            {/* ── INVENTÁRIO ── */}
            {inventarioAberto && podeEditar && (() => {
                const parseTSI2 = (t) => { if (!t || typeof t !== "string") return 0; const [d,m,y]=(t.split(", ")[0]||"").split("/"); const h=t.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${h}`).getTime()||0; };
                const estoqueAtual = {};
                [...movimentos].sort((a,b)=>parseTSI2(a.timestamp)-parseTSI2(b.timestamp)).forEach(m => {
                    if (!m.tipo||!m.medida) return;
                    const k = `${m.tipo}|${m.medida}|${(m.cor||"").trim()}`;
                    estoqueAtual[k] = (estoqueAtual[k]||0) + (m.movimento==="entrada" ? Number(m.qtd) : -Number(m.qtd));
                });
                const todasMedidas = ["20mm","22mm","25mm","30mm","35mm","40mm","50mm"];
                const medidasSel = inventarioQtds.__medidas__ || [];
                const toggleMedida = (m) => setInventarioQtds(p => {
                    const prev = p.__medidas__ || [];
                    return { ...p, __medidas__: prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m] };
                });
                const medidasGorg = todasMedidas.filter(m => medidasSel.includes(m));
                const setQtd = (k, v) => setInventarioQtds(p => ({ ...p, [k]: v }));
                const getQtd = (k) => inventarioQtds[k] !== undefined ? inventarioQtds[k] : (Math.max(0, estoqueAtual[k]||0) || "");
                return (
                    <div style={{ background: "#fff", border: "2px solid #111827", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
                        {TIPOS_ATIVOS.includes("Gorgurão") && <>
                        <div style={{ padding: "14px 20px", background: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>📋 Inventário de Estoque — Gorgurão (RL)</div>
                            <div style={{ fontSize: 12, color: "#9CA3AF" }}>Preencha as quantidades atuais e salve</div>
                        </div>
                        {/* Seleção de medidas */}
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEDF1", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>MEDIDAS:</span>
                            {["20mm","22mm","25mm","30mm","35mm","40mm","50mm"].map(m => {
                                const ativo = medidasSel.includes(m);
                                return (
                                    <button key={m} onClick={() => toggleMedida(m)} style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${ativo ? "#F97316" : "#ECEDF1"}`, background: ativo ? "#FFF7ED" : "#fff", color: ativo ? "#F97316" : "#9CA3AF", fontSize: 12, fontWeight: ativo ? 700 : 400, cursor: "pointer" }}>
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ overflowX: "auto" }}>
                            {medidasGorg.length === 0 && (
                                <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Selecione as medidas acima para começar.</div>
                            )}
                            {medidasGorg.map(medida => (
                                <div key={medida} style={{ borderBottom: "1px solid #F3F4F6" }}>
                                    <div style={{ padding: "5px 12px", fontSize: 10, fontWeight: 700, color: "#F97316", letterSpacing: "0.06em", background: "#FFF7ED" }}>{medida.toUpperCase()}</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 4, padding: "6px 12px" }}>
                                        {COR_CATALOG_SORTED.map(c => {
                                            const k = `Gorgurão|${medida}|${c.nome}`;
                                            const atual = Math.max(0, estoqueAtual[k]||0);
                                            const val = getQtd(k);
                                            const changed = inventarioQtds[k] !== undefined && Number(inventarioQtds[k]) !== atual;
                                            return (
                                                <div key={c.nome} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <CorInline cor={c.nome} />
                                                    <span style={{ fontSize: 11, color: "#374151", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
                                                    <input
                                                        type="number" min="0" value={val}
                                                        onChange={e => setQtd(k, e.target.value)}
                                                        placeholder={atual || "0"}
                                                        style={{ width: 52, padding: "3px 5px", borderRadius: 5, border: `1.5px solid ${changed ? "#F97316" : "#ECEDF1"}`, fontSize: 11, textAlign: "right", outline: "none", background: changed ? "#FFF7ED" : "#fff" }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>}
                        {/* ── Elástico ── */}
                        {TIPOS_ATIVOS.includes("Elástico") && <>
                        <div style={{ padding: "14px 20px", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>📋 Elástico (RL)</div>
                        </div>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEDF1", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>MEDIDAS:</span>
                            {["20mm","22mm","25mm","30mm","35mm","40mm","50mm"].map(m => {
                                const ativoE = (inventarioQtds.__medidasElastico__ || []).includes(m);
                                return (
                                    <button key={`e${m}`} onClick={() => setInventarioQtds(p => {
                                        const prev = p.__medidasElastico__ || [];
                                        return { ...p, __medidasElastico__: prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m] };
                                    })} style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${ativoE ? "#10B981" : "#ECEDF1"}`, background: ativoE ? "#F0FDF4" : "#fff", color: ativoE ? "#10B981" : "#9CA3AF", fontSize: 12, fontWeight: ativoE ? 700 : 400, cursor: "pointer" }}>
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ overflowX: "auto" }}>
                            {(inventarioQtds.__medidasElastico__ || []).length === 0 && (
                                <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Selecione as medidas acima para começar.</div>
                            )}
                            {(inventarioQtds.__medidasElastico__ || []).filter(m => ["20mm","22mm","25mm","30mm","35mm","40mm","50mm"].includes(m)).map(medida => (
                                <div key={`e${medida}`} style={{ borderBottom: "1px solid #F3F4F6" }}>
                                    <div style={{ padding: "5px 12px", fontSize: 10, fontWeight: 700, color: "#10B981", letterSpacing: "0.06em", background: "#F0FDF4" }}>{medida.toUpperCase()}</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 4, padding: "6px 12px" }}>
                                        {COR_CATALOG_SORTED.map(c => {
                                            const k = `Elástico|${medida}|${c.nome}`;
                                            const atual = Math.max(0, estoqueAtual[k]||0);
                                            const val = getQtd(k);
                                            const changed = inventarioQtds[k] !== undefined && Number(inventarioQtds[k]) !== atual;
                                            return (
                                                <div key={c.nome} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <CorInline cor={c.nome} />
                                                    <span style={{ fontSize: 11, color: "#374151", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
                                                    <input
                                                        type="number" min="0" value={val}
                                                        onChange={e => setQtd(k, e.target.value)}
                                                        placeholder={atual || "0"}
                                                        style={{ width: 52, padding: "3px 5px", borderRadius: 5, border: `1.5px solid ${changed ? "#10B981" : "#ECEDF1"}`, fontSize: 11, textAlign: "right", outline: "none", background: changed ? "#F0FDF4" : "#fff" }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>}

                        <div style={{ padding: "14px 20px", borderTop: "1px solid #ECEDF1", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <span style={{ fontSize: 12, color: "#9CA3AF", alignSelf: "center" }}>
                                {Object.keys(inventarioQtds).filter(k => !k.startsWith("__")).length} item{Object.keys(inventarioQtds).filter(k => !k.startsWith("__")).length !== 1 ? "s" : ""} alterado{Object.keys(inventarioQtds).filter(k => !k.startsWith("__")).length !== 1 ? "s" : ""}
                            </span>
                            <button onClick={() => { setInventarioAberto(false); setInventarioQtds({}); }} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
                            <button onClick={salvarInventario} disabled={inventarioSalvando || Object.keys(inventarioQtds).length === 0} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: Object.keys(inventarioQtds).length > 0 ? "#111827" : "#ECEDF1", color: Object.keys(inventarioQtds).length > 0 ? "#fff" : "#9CA3AF", fontSize: 13, fontWeight: 700, cursor: Object.keys(inventarioQtds).length > 0 ? "pointer" : "not-allowed" }}>
                                {inventarioSalvando ? "Salvando..." : "✓ Salvar inventário"}
                            </button>
                        </div>
                    </div>
                );
            })()}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "start" }}>

                {/* Formulário — admin ou usuário com permissão de edição */}
                {podeEditar && <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden", width: "100%", maxWidth: 300, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    {/* Toggle */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                        {[{ val: "entrada", label: "↑ Entrada", color: "#F97316", bg: "#FFF7ED" },
                          { val: "saida",   label: "↓ Saída",   color: "#DC2626", bg: "#FEF2F2" },
                          { val: "zerar",   label: "⊘ Zerar",   color: "#7C3AED", bg: "#F5F3FF" }].map(opt => (
                            <button key={opt.val} onClick={() => setModo(opt.val)} style={{
                                padding: "12px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                                background: modo === opt.val ? opt.bg : "#F9FAFB",
                                color: modo === opt.val ? opt.color : "#9CA3AF",
                                borderBottom: `2px solid ${modo === opt.val ? opt.color : "#ECEDF1"}`,
                            }}>{opt.label}</button>
                        ))}
                    </div>

                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {TIPOS_ATIVOS.length > 1 && <div>
                            <label style={labelStyle}>TIPO</label>
                            <div style={{ display: "flex", gap: 5 }}>
                                {TIPOS_ATIVOS.map(t => {
                                    const tc = TIPO_COLOR[t];
                                    const ativo = form.tipo === t;
                                    return (
                                        <button key={t} onClick={() => setForm(p => ({ ...p, tipo: t }))} style={{
                                            flex: 1, padding: "6px 2px", fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: "pointer",
                                            border: `1.5px solid ${ativo ? tc : "#ECEDF1"}`,
                                            background: ativo ? TIPO_BG[t] : "#F9FAFB",
                                            color: ativo ? tc : "#9CA3AF",
                                        }}>{t}</button>
                                    );
                                })}
                            </div>
                        </div>}

                        <div>
                            <label style={labelStyle}>COR</label>
                            <CorSelect value={form.cor} onChange={e => setForm(p => ({ ...p, cor: e.target.value }))} options={COR_CATALOG_SORTED} style={inputStyle} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: isZerar ? "1fr" : "1fr 1fr", gap: 8 }}>
                            <div>
                                <label style={labelStyle}>MEDIDA</label>
                                <select value={form.medida} onChange={e => setForm(p => ({ ...p, medida: e.target.value }))} style={inputStyle}>
                                    {MEDIDAS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            {!isZerar && (
                            <div>
                                <label style={labelStyle}>{form.tipo === "Elástico" ? `QTD (${form.unidade === "Metro" ? "m" : "RL"})` : "QTD (RL)"}</label>
                                <input type="text" inputMode="numeric" value={form.qtd} onChange={e => setForm(p => ({ ...p, qtd: fmtInt(e.target.value) }))} placeholder="0" style={inputStyle} />
                            </div>
                            )}
                        </div>

                        {form.tipo === "Elástico" && (
                            <div>
                                <label style={labelStyle}>UNIDADE</label>
                                <div style={{ display: "flex", gap: 5 }}>
                                    {["Metro", "Rolo"].map(u => {
                                        const ativo = form.unidade === u;
                                        return (
                                            <button key={u} onClick={() => setForm(p => ({ ...p, unidade: u }))} style={{
                                                flex: 1, padding: "7px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                                                border: `1.5px solid ${ativo ? "#10B981" : "#ECEDF1"}`,
                                                background: ativo ? "#F0FDF4" : "#F9FAFB",
                                                color: ativo ? "#10B981" : "#9CA3AF",
                                            }}>{u}</button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {isZerar ? (() => {
                            const normUn = form.tipo === "Elástico" ? (form.unidade === "Metro" ? "Metro" : "Rolo") : "RL";
                            // Usa estoqueCalculado (já correto, sem logs de produção)
                            const saldoAtual = estoqueCalculado.find(e =>
                                e.tipo === form.tipo && e.medida === form.medida &&
                                e.cor === form.cor.trim() && e.unidade === normUn
                            )?.total ?? 0;
                            const unit = normUn === "Metro" ? "m" : "RL";
                            return (
                                <div>
                                    {form.cor && saldoAtual > 0 && (
                                        <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#7C3AED", fontWeight: 600 }}>
                                            Saldo atual: {saldoAtual.toLocaleString("pt-BR")} {unit}
                                        </div>
                                    )}
                                    {form.cor && saldoAtual === 0 && (
                                        <div style={{ background: "#F3F4F6", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#9CA3AF" }}>
                                            Estoque já está em 0
                                        </div>
                                    )}
                                    <button onClick={() => handleSubmit(saldoAtual)} disabled={!form.cor || saldoAtual === 0} style={{
                                        width: "100%", padding: "11px", background: !form.cor || saldoAtual === 0 ? "#ECEDF1" : "#7C3AED",
                                        border: "none", borderRadius: 8, color: !form.cor || saldoAtual === 0 ? "#9CA3AF" : "#fff",
                                        fontWeight: 700, fontSize: 14, cursor: !form.cor || saldoAtual === 0 ? "not-allowed" : "pointer",
                                    }}>⊘ Zerar esta cor</button>
                                </div>
                            );
                        })() : (
                        <button onClick={() => {
                            const unN = form.tipo === "Elástico" ? form.unidade : "RL";
                            const normU = form.tipo !== "Elástico" ? "RL" : (!unN || unN === "RL" || unN === "Rolo") ? "Rolo" : "Metro";
                            const k = `${form.tipo}|${form.medida}|${form.cor.trim()}|${normU}`;
                            const saldoAtual = estoqueCalculado.find(e => `${e.tipo}|${e.medida}|${e.cor}|${e.unidade}` === k)?.total ?? 0;
                            handleSubmit(saldoAtual);
                        }} style={{
                            width: "100%", padding: "11px", marginTop: 2,
                            background: corBtn, border: "none", borderRadius: 8,
                            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                            boxShadow: `0 2px 8px ${corBtn}40`,
                        }}>
                            {isEntrada ? "↑ Confirmar entrada" : "↓ Confirmar saída"}
                        </button>
                        )}
                    </div>
                </div>}

                {/* Posição de estoque — logs (apontamentos) + ajustes manuais − entregas */}
                {(() => {
                    const mapa = {};
                    const normUnidade = (tipo, unidade) => {
                        if (tipo !== "Elástico") return "RL";
                        if (!unidade || unidade === "RL" || unidade === "Rolo") return "Rolo";
                        if (unidade === "Metro" || unidade === "Metros") return "Metro";
                        return "Rolo";
                    };
                    const add = (tipo, medida, cor, delta, unidade) => {
                        if (!tipo || !medida) return;
                        const un = normUnidade(tipo, unidade);
                        const key = `${tipo}|${medida}|${(cor || "").trim()}|${un}`;
                        if (!mapa[key]) mapa[key] = { tipo, medida, cor: (cor || "").trim(), unidade: un, total: 0 };
                        mapa[key].total = Math.max(0, Math.round((mapa[key].total + delta) * 10) / 10);
                    };

                    // Ordena crescente (mais antigo primeiro) para Math.max funcionar corretamente
                    const parseTSd = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
                    const movOrdem = [...movimentos].sort((a, b) => parseTSd(a.timestamp) - parseTSd(b.timestamp));
                    movOrdem.forEach(m => {
                        const qty = Number(m.qtd);
                        add(m.tipo, m.medida, m.cor, m.movimento === "entrada" ? qty : -qty, m.unidade);
                    });

                    const todos = Object.values(mapa)
                        .filter(v => v.total > 0)
                        .sort((a, b) => {
                            const tipoOrder = { "Gorgurão": 0, "Poliéster": 1, "Elástico": 2 };
                            const ta = tipoOrder[a.tipo] ?? 9, tb = tipoOrder[b.tipo] ?? 9;
                            if (ta !== tb) return ta - tb;
                            const ma = parseInt(a.medida) || 0, mb = parseInt(b.medida) || 0;
                            if (ma !== mb) return ma - mb;
                            return b.total - a.total;
                        });

                    const resumo = TIPOS_ATIVOS.map(t => {
                        const itens = todos.filter(v => v.tipo === t);
                        return {
                            tipo: t,
                            itens,
                            totalRL:    itens.filter(v => v.unidade !== "Metro").reduce((s, v) => s + v.total, 0),
                            totalMetro: itens.filter(v => v.unidade === "Metro").reduce((s, v) => s + v.total, 0),
                        };
                    });

                    const tc = TIPO_COLOR[tipoAtivo] || "#9CA3AF";
                    const lista = todos.filter(v => v.tipo === tipoAtivo);

                    const renderLista = (itens, cor, unit) => (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, padding: "14px 18px" }}>
                            {itens.map((v, i) => (
                                <div key={i} style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", lineHeight: 1.3 }}><CorInline cor={v.cor} />{v.cor}</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: cor, lineHeight: 1 }}>
                                        {v.total.toLocaleString("pt-BR")}
                                        <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF", marginLeft: 3 }}>{unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );

                    return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: "1 1 300px", minWidth: 0 }}>
                            {/* Cards de resumo por tipo */}
                            <div style={{ display: "grid", gridTemplateColumns: `repeat(${resumo.length}, 1fr)`, gap: 10 }}>
                                {resumo.map(r => {
                                    const c = TIPO_COLOR[r.tipo] || "#9CA3AF";
                                    const ativo = tipoAtivo === r.tipo;
                                    return (
                                        <button key={r.tipo} onClick={() => setTipoAtivo(r.tipo)} style={{
                                            background: ativo ? TIPO_BG[r.tipo] : "#fff",
                                            border: `2px solid ${ativo ? c : "#ECEDF1"}`,
                                            borderRadius: 12, padding: "14px 16px",
                                            cursor: "pointer", textAlign: "left",
                                            boxShadow: ativo ? `0 2px 8px ${c}25` : "none",
                                        }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: "0.07em", marginBottom: 8 }}>{r.tipo.toUpperCase()}</div>
                                            {r.tipo === "Elástico" ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                    {r.totalRL > 0 && <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>{r.totalRL.toLocaleString("pt-BR")} <span style={{ fontSize: 11, color: "#9CA3AF" }}>RL</span></div>}
                                                    {r.totalMetro > 0 && <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>{r.totalMetro.toLocaleString("pt-BR")} <span style={{ fontSize: 11, color: "#9CA3AF" }}>m</span></div>}
                                                    {r.totalRL === 0 && r.totalMetro === 0 && <div style={{ fontSize: 20, fontWeight: 800, color: "#D1D5DB" }}>0</div>}
                                                    {(r.totalRL > 0 || r.totalMetro > 0) && <div style={{ fontSize: 14, fontWeight: 700, color: "#0891B2", lineHeight: 1.1, marginTop: 2, borderTop: "1px solid #ECEDF1", paddingTop: 4 }}>{((r.totalRL * 25) + r.totalMetro).toLocaleString("pt-BR")} <span style={{ fontSize: 10, color: "#9CA3AF" }}>m total</span></div>}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
                                                    {r.totalRL.toLocaleString("pt-BR")}
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginLeft: 4 }}>RL</span>
                                                </div>
                                            )}
                                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{r.itens.length} {r.itens.length === 1 ? "item" : "itens"}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Lista do tipo selecionado */}
                            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                                <div style={{ padding: "12px 18px", borderBottom: "1px solid #F3F4F6", background: TIPO_BG[tipoAtivo], display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: tc }} />
                                        <span style={{ fontSize: 14, fontWeight: 700, color: tc }}>{tipoAtivo}</span>
                                    </div>
                                    <span style={{ fontSize: 11, color: "#9CA3AF", background: "#fff", border: "1px solid #ECEDF1", borderRadius: 20, padding: "2px 10px" }}>{lista.length} {lista.length === 1 ? "item" : "itens"}</span>
                                </div>

                                {lista.length === 0 ? (
                                    <div style={{ padding: "48px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>Nenhum item de {tipoAtivo} em estoque.</div>
                                ) : tipoAtivo === "Elástico" ? (
                                    <div>
                                        {[{ unidade: "Rolo", label: "Rolo", cor: "#10B981", unit: "RL" },
                                          { unidade: "Metro", label: "Metro", cor: "#0891B2", unit: "m" }].map(({ unidade, label, cor: uc, unit }) => {
                                            const subLista = lista.filter(v => v.unidade === unidade);
                                            if (!subLista.length) return null;
                                            const medidas = [...new Set(subLista.map(v => v.medida))];
                                            const subTotal = subLista.reduce((s, v) => s + v.total, 0);
                                            return (
                                                <div key={unidade}>
                                                    <div style={{ padding: "8px 18px", background: "#F9FAFB", borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6", fontSize: 11, fontWeight: 700, color: uc }}>
                                                        {label} · {subTotal.toLocaleString("pt-BR")} {unit} total
                                                        {unidade === "Rolo" && <span style={{ color: "#0891B2", marginLeft: 8 }}>({(subTotal * 25).toLocaleString("pt-BR")} m)</span>}
                                                    </div>
                                                    {medidas.map(medida => {
                                                        const itensMedida = subLista.filter(v => v.medida === medida);
                                                        return (
                                                            <div key={medida}>
                                                                <div style={{ padding: "6px 18px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{medida}</span>
                                                                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{itensMedida.reduce((s, v) => s + v.total, 0).toLocaleString("pt-BR")} {unit}</span>
                                                                </div>
                                                                {renderLista(itensMedida, uc, unit)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div>
                                        {[...new Set(lista.map(v => v.medida))].map((medida, mi) => {
                                            const itensMedida = lista.filter(v => v.medida === medida);
                                            const subTotal = itensMedida.reduce((s, v) => s + v.total, 0);
                                            return (
                                                <div key={medida}>
                                                    <div style={{ padding: "8px 18px", background: "#F9FAFB", borderTop: mi > 0 ? "1px solid #ECEDF1" : "none", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{medida}</span>
                                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{itensMedida.length} cores · {subTotal.toLocaleString("pt-BR")} RL</span>
                                                    </div>
                                                    {renderLista(itensMedida, tc, "RL")}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Histórico de movimentações — um bloco por tipo */}
            {TIPOS_ATIVOS.filter(tipo => movimentos.some(m => m.tipo === tipo)).map(tipo => {
                const tc = TIPO_COLOR[tipo] || "#9CA3AF";
                const bg = TIPO_BG[tipo] || "#F9FAFB";
                const movTipo = movimentos.filter(m => (m.tipo || "") === tipo);
                const fMov = filtroMov[tipo] || "todos";
                const fCor = filtroCor[tipo] || "";
                const movFiltrados = movTipo.filter(m => {
                    if (fMov !== "todos" && m.movimento !== fMov) return false;
                    if (fCor && !(m.cor || "").toLowerCase().includes(fCor.toLowerCase())) return false;
                    return true;
                });
                const parseTSh = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
                const porData = {};
                [...movFiltrados]
                    .sort((a, b) => parseTSh(b.timestamp) - parseTSh(a.timestamp))
                    .forEach((m, i) => {
                        const data = m.timestamp ? m.timestamp.substring(0, 10) : "—";
                        if (!porData[data]) porData[data] = [];
                        porData[data].push({ ...m, _i: i });
                    });
                const aberto = !!histAberto[tipo];

                return (
                    <div key={tipo} style={{ marginTop: 28, background: "#fff", border: `1px solid #ECEDF1`, borderRadius: 12, overflow: "hidden" }}>
                        <div onClick={() => setHistAberto(p => ({ ...p, [tipo]: !p[tipo] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", background: aberto ? bg : "#fff", borderBottom: aberto ? "1px solid #ECEDF1" : "none", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: tc }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Histórico — {tipo}</span>
                                <span style={{ fontSize: 12, fontWeight: 400, color: "#9CA3AF" }}>{movTipo.length} registro{movTipo.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                            </div>
                        </div>

                        {aberto && <div style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 8, padding: 3, gap: 2 }}>
                                {[
                                    { val: "todos",   label: "Todos"   },
                                    { val: "entrada", label: "↑ Entrada" },
                                    { val: "saida",   label: "↓ Saída"   },
                                ].map(opt => (
                                    <button key={opt.val} onClick={() => setFiltroMov(p => ({ ...p, [tipo]: opt.val }))} style={{
                                        padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                                        border: "none", cursor: "pointer",
                                        background: fMov === opt.val ? "#fff" : "transparent",
                                        color: fMov === opt.val
                                            ? (opt.val === "entrada" ? "#16A34A" : opt.val === "saida" ? "#DC2626" : "#111827")
                                            : "#9CA3AF",
                                        boxShadow: fMov === opt.val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                    }}>{opt.label}</button>
                                ))}
                            </div>
                            <input
                                value={fCor}
                                onChange={e => setFiltroCor(p => ({ ...p, [tipo]: e.target.value }))}
                                placeholder="Buscar cor..."
                                style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #ECEDF1", borderRadius: 8, background: "#fff", color: "#111827", outline: "none", minWidth: 140 }}
                            />
                            {(fMov !== "todos" || fCor) && (
                                <button onClick={() => { setFiltroMov(p => ({ ...p, [tipo]: "todos" })); setFiltroCor(p => ({ ...p, [tipo]: "" })); }} style={{
                                    padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 7,
                                    border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", cursor: "pointer",
                                }}>Limpar</button>
                            )}
                            {movFiltrados.length !== movTipo.length && (
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{movFiltrados.length} resultado{movFiltrados.length !== 1 ? "s" : ""}</span>
                            )}
                        </div>

                        {Object.keys(porData).length === 0 ? (
                            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "28px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
                                Nenhum registro encontrado.
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {Object.entries(porData).sort(([a], [b]) => {
                                    const p = d => { const [dd, mm, yyyy] = d.split("/"); return new Date(yyyy, mm - 1, dd).getTime(); };
                                    return p(b) - p(a);
                                }).map(([data, items]) => {
                                    const itensSorted = [...items].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
                                    const diaKey = `${tipo}|${data}`;
                                    const diaAberto = !!diasAbertos[diaKey];
                                    return (
                                        <div key={data} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                                            <button onClick={() => setDiasAbertos(p => ({ ...p, [diaKey]: !p[diaKey] }))} style={{
                                                width: "100%", display: "flex", alignItems: "center", gap: 10,
                                                padding: "10px 14px", background: diaAberto ? "#F9FAFB" : "#fff",
                                                border: "none", borderBottom: diaAberto ? "1px solid #ECEDF1" : "none",
                                                cursor: "pointer", textAlign: "left", flexWrap: "wrap",
                                            }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{data}</span>
                                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{items.length} mov.</span>
                                                <div style={{ flex: 1 }} />
                                                <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 6 }}>{diaAberto ? "▲" : "▼"}</span>
                                            </button>

                                            {diaAberto && itensSorted.map((m, i) => {
                                                const isEntrada = m.movimento === "entrada";
                                                const cor = isEntrada ? "#16A34A" : "#DC2626";
                                                const hora = m.timestamp ? m.timestamp.substring(12, 20) || m.timestamp.split(",")[1]?.trim() : "";
                                                return (
                                                    <div key={m.key || m._i} style={{
                                                        display: "flex", alignItems: "center", gap: 10,
                                                        padding: "8px 14px",
                                                        borderBottom: i < itensSorted.length - 1 ? "1px solid #F9FAFB" : "none",
                                                        borderLeft: `3px solid ${cor}50`,
                                                    }}>
                                                        <div style={{
                                                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                                            background: isEntrada ? "#F0FDF4" : "#FEF2F2",
                                                            color: cor, fontSize: 14, fontWeight: 800,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                        }}>
                                                            {isEntrada ? "↑" : "↓"}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><CorInline cor={m.cor} />{m.cor}</div>
                                                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.medida}</div>
                                                        </div>
                                                        <span style={{ fontSize: 14, fontWeight: 800, color: cor, flexShrink: 0 }}>
                                                            {isEntrada ? "+" : "−"}{m.qtd} {m.unidade === "Metro" ? "m" : "RL"}
                                                        </span>
                                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                            {hora && <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>{hora}</div>}
                                                            {m.operador && <div style={{ fontSize: 10, color: "#9CA3AF" }}>{m.operador}</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        </div>}
                    </div>
                );
            })}
        </div>
    );
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.04em" };
const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 11px",
    border: "1px solid #ECEDF1", borderRadius: 8, fontSize: 13,
    color: "#111827", background: "#F9FAFB", outline: "none",
};
