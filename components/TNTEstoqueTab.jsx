import { useState, useMemo, useEffect } from "react";
import { TNT_CATALOG } from "../utils/tntCatalog";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

function printRelatorioEstoque(resumoPorLargura) {
    const fn = v => Number(v).toLocaleString("pt-BR");
    const corLabel = { branco: "Branco", preto: "Preto" };

    const cardsHtml = `<div class="cards" style="grid-template-columns:repeat(${resumoPorLargura.length},1fr)">${resumoPorLargura.map(r => `
        <div class="card">
            <div class="label">Largura ${r.largura}m</div>
            <div class="value">${fn(r.total)}<span class="unit">bob.</span></div>
            <div class="sub">${r.itens.filter(i => i.qtd > 0).length} de ${r.itens.length} itens com saldo</div>
        </div>`).join("")}</div>`;

    const tabelasHtml = resumoPorLargura.map(r => {
        if (r.itens.length === 0) return "";
        const porCor = ["branco", "preto"].map(c => {
            const itensCor = r.itens.filter(i => i.cor === c).sort((a, b) => a.gramatura - b.gramatura || a.metragem - b.metragem);
            if (itensCor.length === 0) return "";
            const totalCor = itensCor.reduce((s, i) => s + i.qtd, 0);
            const rows = itensCor.map(i => `<tr${i.qtd <= 0 ? ' style="color:#9CA3AF;font-style:italic"' : ""}><td>${i.codigo}</td><td>${i.gramatura}GR · ${i.metragem}m/bob.</td><td class="r">${i.qtd <= 0 ? "ZERADO" : fn(i.qtd) + " bob."}</td></tr>`).join("");
            return `<tr class="subtotal"><td><strong>${corLabel[c]}</strong></td><td>SUBTOTAL</td><td class="r">${fn(totalCor)} bob.</td></tr>${rows}`;
        }).join("");
        return `<div class="section-title">Largura ${r.largura}m</div>
        <table><thead><tr><th>Código</th><th>Especificação</th><th class="r">Bobinas</th></tr></thead><tbody>${porCor}</tbody></table>`;
    }).join("");

    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relatório de Estoque TNT — FourTEX</title>
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:12px;color:#111;}
    .page-header{background:#111827;color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:flex-end;}
    .page-header .titulo{font-size:18px;font-weight:800;}.page-header .sub{font-size:11px;color:#9CA3AF;margin-top:2px;}
    .page-header .emp{font-size:13px;font-weight:700;color:#0891B2;}
    .content{padding:20px 28px;}
    .cards{display:grid;gap:10px;margin-bottom:18px;}
    .card{border-radius:9px;padding:11px 14px;border:1.5px solid #BAE6FD;background:#F0F9FF;}
    .card .label{font-size:9px;font-weight:700;letter-spacing:0.07em;color:#9CA3AF;margin-bottom:5px;text-transform:uppercase;}
    .card .value{font-size:19px;font-weight:800;line-height:1.1;color:#0369A1;}
    .card .unit{font-size:10px;font-weight:500;color:#9CA3AF;margin-left:2px;}
    .card .sub{font-size:10px;color:#9CA3AF;margin-top:3px;}
    .section-title{font-size:11px;font-weight:800;color:#0369A1;margin:16px 0 7px;padding-bottom:4px;border-bottom:2px solid #ECEDF1;text-transform:uppercase;letter-spacing:0.05em;}
    table{border-collapse:collapse;width:100%;margin-bottom:4px;}
    th{background:#111827;color:#fff;text-align:left;padding:6px 10px;font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;}
    th.r{text-align:right;}td{padding:5px 10px;border-bottom:1px solid #F3F4F6;font-size:11px;}td.r{text-align:right;font-weight:600;}
    tr.subtotal td{background:#ECFEFF;font-weight:700;color:#0369A1;}
    .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ECEDF1;font-size:9px;color:#9CA3AF;display:flex;justify-content:space-between;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    </style></head><body>
    <div class="page-header">
        <div style="display:flex;align-items:center;gap:14px">
            <div style="background:#0891B2;border-radius:8px;padding:6px 14px;font-size:15px;font-weight:900;color:#fff;letter-spacing:0.05em">TNT</div>
            <div><div class="titulo">Relatório de Estoque</div><div class="sub">Bobinas TNT</div></div>
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

export default function TNTEstoqueTab({ movimentos = [], pedidos = [], userName, onMovimento, podeEditar = true }) {
    const [largura,    setLargura]    = useState("1.40");
    const [gramatura,  setGramatura]  = useState("");
    const [cor,        setCor]        = useState("");
    const [metragem,   setMetragem]   = useState("");
    const [qtd,        setQtd]        = useState("1");
    const [tipo,       setTipo]       = useState("entrada");
    const [histAberto,    setHistAberto]    = useState(false);
    const [histFiltro,    setHistFiltro]    = useState("todos"); // "todos" | "entrada" | "saida"
    const [histDia,       setHistDia]       = useState(""); // filtro ISO date picker
    const [histDiaAberto, setHistDiaAberto] = useState(""); // accordion: chave "DD/MM/YYYY"
    const [histBusca,     setHistBusca]     = useState(""); // bobina (código/gramatura/cor) ou cliente

    const gramaturas = useMemo(() =>
        [...new Set(TNT_CATALOG.filter(p => p.largura === largura).map(p => p.gramatura))].sort((a, b) => a - b),
        [largura]
    );

    const metragens = useMemo(() => {
        if (!gramatura || !cor) return [];
        return TNT_CATALOG
            .filter(p => p.largura === largura && p.gramatura === Number(gramatura) && p.cor === cor)
            .map(p => p.metragem)
            .sort((a, b) => b - a);
    }, [largura, gramatura, cor]);

    const metSelecionada = metragens.length === 1 ? String(metragens[0]) : metragem;

    const produto = useMemo(() => {
        if (!gramatura || !cor || !metSelecionada) return null;
        return TNT_CATALOG.find(p =>
            p.largura === largura &&
            p.gramatura === Number(gramatura) &&
            p.cor === cor &&
            p.metragem === Number(metSelecionada)
        );
    }, [largura, gramatura, cor, metSelecionada]);

    const handleLargura   = (v) => { setLargura(v); setGramatura(""); setCor(""); setMetragem(""); };
    const handleGramatura = (v) => { setGramatura(v); setCor(""); setMetragem(""); };
    const handleCor       = (v) => { setCor(v); setMetragem(""); };

    const handleRegistrar = () => {
        if (!produto || Number(qtd) <= 0) return;
        onMovimento({
            tipo,
            codigo:    produto.codigo,
            largura:   produto.largura,
            gramatura: produto.gramatura,
            cor:       produto.cor,
            metragem:  produto.metragem,
            qtd:       Number(qtd),
            operador:  userName,
        });
        setQtd("1");
        setGramatura(""); setCor(""); setMetragem("");
    };

    // Códigos antigos → novos (movimentos gravados antes da atualização do catálogo)
    const CODIGO_ALIAS = { "4112": "4065", "4039": "4096", "4108": "4376", "4111": "4424", "4109": "4377" };

    const saldoPorCodigo = useMemo(() => {
        const map = {};
        movimentos.forEach(m => {
            const cod = CODIGO_ALIAS[m.codigo] || m.codigo;
            if (!map[cod]) {
                map[cod] = { codigo: cod, largura: m.largura, gramatura: m.gramatura, cor: m.cor, metragem: m.metragem, qtd: 0 };
            }
            map[cod].qtd += m.tipo === "entrada" ? Number(m.qtd) : -Number(m.qtd);
        });
        return map;
    }, [movimentos]);

    const normBusca = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const parseTSTNT = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
    // Origem de cada movimento: pedido (cliente) ou baixa direta no estoque.
    // Saídas novas gravam cliente/pedidoNumero; as antigas são ligadas ao pedido pelo horário
    // do faturamento (fluxo atual) ou da separação (fluxo antigo, que baixava na separação).
    const pedidoPorHorario = useMemo(() => {
        const map = {};
        pedidos.forEach(p => {
            const codigos = new Set((Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {})).filter(Boolean).map(i => i.codigo));
            [p.timestampFaturamento, p.timestampSeparacao].filter(Boolean).forEach(ts => {
                (map[ts] = map[ts] || []).push({ numero: p.numero, cliente: p.cliente, codigos });
            });
        });
        return map;
    }, [pedidos]);
    const origemDe = (m) => {
        if (m.pedidoNumero != null || m.cliente) return { numero: m.pedidoNumero, cliente: m.cliente || "", estorno: !!m.estorno };
        if (m.tipo === "entrada") return null;
        const p = (pedidoPorHorario[m.timestamp] || []).find(p => p.codigos.has(m.codigo));
        return p ? { numero: p.numero, cliente: p.cliente || "" } : { direto: true };
    };

    const hist = useMemo(() => [...movimentos]
        .map(m => ({ ...m, origem: origemDe(m) }))
        .sort((a, b) => parseTSTNT(b.timestamp) - parseTSTNT(a.timestamp)),
    [movimentos, pedidoPorHorario]);

    const sel = {
        padding: "7px 10px", borderRadius: 7, border: "1px solid #ECEDF1",
        fontSize: 13, background: "#F9FAFB", width: "100%", boxSizing: "border-box",
    };
    const lbl = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 };

    // Todos os itens: mantém os com movimentação real + acrescenta do catálogo os nunca movimentados
    const todosItens = useMemo(() => {
        const movimentados = Object.values(saldoPorCodigo);
        const codigosMovimentados = new Set(movimentados.map(s => s.codigo).filter(Boolean));
        // Catálogo: só os que NUNCA tiveram movimento (nem por código nem por propriedades)
        const nunca = TNT_CATALOG.filter(p =>
            !codigosMovimentados.has(p.codigo) &&
            !movimentados.some(s => !s.codigo &&
                s.largura === p.largura && Number(s.gramatura) === p.gramatura &&
                s.cor === p.cor && Number(s.metragem) === p.metragem
            )
        ).map(p => ({ ...p, qtd: 0 }));
        return [...movimentados, ...nunca];
    }, [saldoPorCodigo]);

    const itensComSaldo = todosItens.filter(s => s.qtd > 0);

    // Separado aguardando faturamento: ainda está no estoque (a baixa é no faturamento), mas já tem dono
    const reservadoPorCodigo = useMemo(() => {
        const map = {};
        pedidos.filter(p => p.status === "aguardando_faturamento").forEach(p => {
            (Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {})).filter(Boolean).forEach(i => {
                const cod = CODIGO_ALIAS[i.codigo] || i.codigo;
                if (!map[cod]) map[cod] = { qtd: 0, pedidos: [] };
                map[cod].qtd += Number(i.quantidade) || 0;
                map[cod].pedidos.push(`#${p.numero} ${p.cliente || ""} (${i.quantidade})`);
            });
        });
        return map;
    }, [pedidos]);

    // Resumo por largura para os cards de topo (só os com saldo)
    const resumoPorLargura = ["1.40", "2.10"].map(larg => ({
        largura: larg,
        total:   itensComSaldo.filter(s => s.largura === larg).reduce((s, i) => s + i.qtd, 0),
        itens:   todosItens.filter(s => s.largura === larg),
    }));

    const isMobile = useIsMobile();

    return (
        <div style={{ padding: isMobile ? "16px 12px" : 24, maxWidth: 820, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Estoque TNT</h2>
                    <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                        Registre entradas e saídas de bobinas TNT.
                    </p>
                </div>
                {itensComSaldo.length > 0 && (
                    <button onClick={() => printRelatorioEstoque(resumoPorLargura)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0369A1", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                        🖨 Relatório de Estoque
                    </button>
                )}
            </div>

            {/* Formulário de movimentação */}
            {podeEditar && (
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: 20, marginBottom: 24 }}>
                {/* Tipo */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[
                        { id: "entrada", label: "Entrada", bg: "#F0FDF4", border: "#16A34A", text: "#15803D" },
                        { id: "saida",   label: "Saída",   bg: "#FEF2F2", border: "#DC2626", text: "#DC2626" },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTipo(t.id)} style={{
                            flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
                            background: tipo === t.id ? t.bg : "#F9FAFB",
                            border:     `2px solid ${tipo === t.id ? t.border : "#ECEDF1"}`,
                            color:      tipo === t.id ? t.text : "#9CA3AF",
                        }}>
                            {tipo === t.id && (t.id === "entrada" ? "↑ " : "↓ ")}{t.label}
                        </button>
                    ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
                    {/* Largura */}
                    <div>
                        <label style={lbl}>LARGURA</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            {["1.40", "2.10"].map(l => (
                                <button key={l} onClick={() => handleLargura(l)} style={{
                                    flex: 1, padding: "7px 0", borderRadius: 7, cursor: "pointer", fontSize: 13,
                                    border:     `1.5px solid ${largura === l ? "#0891B2" : "#ECEDF1"}`,
                                    background: largura === l ? "#ECFEFF" : "#F9FAFB",
                                    color:      largura === l ? "#0369A1" : "#374151",
                                    fontWeight: largura === l ? 700 : 500,
                                }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Gramatura */}
                    <div>
                        <label style={lbl}>GRAMATURA</label>
                        <select value={gramatura} onChange={e => handleGramatura(e.target.value)} style={sel}>
                            <option value="">— selecione —</option>
                            {gramaturas.map(g => <option key={g} value={g}>{g} GR</option>)}
                        </select>
                    </div>

                    {/* Cor */}
                    <div>
                        <label style={lbl}>COR</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            {[
                                { id: "preto",  bg: "#111827", border: "#111827", text: "#fff"    },
                                { id: "branco", bg: "#fff",    border: "#374151", text: "#111827" },
                            ].map(({ id, bg, border, text }) => {
                                const ativo = cor === id;
                                return (
                                    <button key={id} onClick={() => handleCor(id)} style={{
                                        flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 13,
                                        textTransform: "capitalize", cursor: "pointer",
                                        fontWeight:  ativo ? 700 : 400,
                                        background:  ativo ? bg : "#F9FAFB",
                                        border:      `2px solid ${ativo ? border : "#ECEDF1"}`,
                                        color:       ativo ? text : "#6B7280",
                                    }}>
                                        {id}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {metragens.length > 1 && (
                        <div>
                            <label style={lbl}>METRAGEM</label>
                            <select value={metragem} onChange={e => setMetragem(e.target.value)} style={sel}>
                                <option value="">— selecione —</option>
                                {metragens.map(m => <option key={m} value={m}>{m}m</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={lbl}>BOBINAS</label>
                        <input type="number" min="1" value={qtd} onChange={e => setQtd(e.target.value)} style={sel} />
                    </div>
                </div>

                {/* Produto identificado */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "10px 14px",
                    background: produto ? "#F0F9FF" : "#F9FAFB", borderRadius: 8,
                    border: `1px solid ${produto ? "#BAE6FD" : "#ECEDF1"}`, marginBottom: 12,
                }}>
                    {produto ? (
                        <>
                            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: "#0369A1", minWidth: 52 }}>{produto.codigo}</div>
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0C4A6E" }}>
                                TNT {produto.gramatura}GR {produto.cor} — {produto.largura}m — {produto.metragem}m/bobina
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 13, color: "#9CA3AF" }}>Selecione os campos para identificar o código.</div>
                    )}
                </div>

                <button onClick={handleRegistrar} disabled={!produto || Number(qtd) <= 0} style={{
                    width: "100%", padding: 10, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14,
                    background: !produto ? "#ECEDF1" : tipo === "entrada" ? "#16A34A" : "#DC2626",
                    color:      !produto ? "#9CA3AF" : "#fff",
                    cursor:     produto ? "pointer" : "not-allowed",
                }}>
                    {tipo === "entrada" ? "↑ Registrar Entrada" : "↓ Registrar Saída"}
                </button>
            </div>
            )}

            {/* Saldo atual — agrupado por largura → cor */}
            {todosItens.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.1em", marginBottom: 10 }}>SALDO ATUAL</div>

                    {/* Cards de resumo por largura */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        {resumoPorLargura.map(r => (
                            <div key={r.largura} style={{
                                background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12,
                                padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#0891B2", letterSpacing: "0.07em", marginBottom: 6 }}>
                                    LARGURA {r.largura}m
                                </div>
                                <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
                                    {r.total}
                                    <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF", marginLeft: 4 }}>bob.</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                                    {itensComSaldo.filter(s => s.largura === r.largura).length} de {r.itens.length} itens com saldo
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Seções agrupadas */}
                    {["1.40", "2.10"].map(larg => {
                        const itensDessaLargura = todosItens.filter(s => s.largura === larg);
                        if (itensDessaLargura.length === 0) return null;
                        return (
                            <div key={larg} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                                {/* Cabeçalho da largura */}
                                <div style={{ padding: "12px 18px", background: "#ECFEFF", borderBottom: "1px solid #BAE6FD", display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0891B2" }} />
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0369A1" }}>{larg}m</span>
                                    <span style={{ fontSize: 11, color: "#0891B2", background: "#fff", border: "1px solid #BAE6FD", borderRadius: 20, padding: "2px 10px", marginLeft: 2 }}>
                                        {itensDessaLargura.length} {itensDessaLargura.length === 1 ? "item" : "itens"}
                                    </span>
                                </div>

                                {/* Sub-seções por cor */}
                                {["branco", "preto"].map(c => {
                                    const itensCor = itensDessaLargura
                                        .filter(s => s.cor === c)
                                        .sort((a, b) => a.gramatura - b.gramatura || a.metragem - b.metragem);
                                    if (itensCor.length === 0) return null;
                                    const totalCor = itensCor.reduce((s, i) => s + i.qtd, 0);
                                    const isPreto  = c === "preto";

                                    return (
                                        <div key={c}>
                                            <div style={{
                                                padding: "8px 18px", background: "#F9FAFB",
                                                borderBottom: "1px solid #F3F4F6", borderTop: "1px solid #F3F4F6",
                                                display: "flex", alignItems: "center", gap: 8,
                                            }}>
                                                <div style={{
                                                    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                                                    background: isPreto ? "#111827" : "#fff",
                                                    border: `1.5px solid ${isPreto ? "#374151" : "#D1D5DB"}`,
                                                }} />
                                                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "capitalize" }}>{c}</span>
                                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>· {totalCor} bob. total</span>
                                            </div>

                                            <div style={{ padding: "6px 14px 14px" }}>
                                                {itensCor.map((s, i) => {
                                                    const zerado = s.qtd <= 0;
                                                    const reserva = reservadoPorCodigo[s.codigo];
                                                    return (
                                                        <div key={s.codigo} style={{
                                                            display: "flex", alignItems: "center", gap: 12,
                                                            padding: "10px 4px",
                                                            borderBottom: i < itensCor.length - 1 ? "1px solid #F3F4F6" : "none",
                                                            opacity: zerado ? 0.55 : 1,
                                                        }}>
                                                            <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: zerado ? "#9CA3AF" : "#0369A1", background: zerado ? "#F3F4F6" : "#EFF6FF", borderRadius: 6, padding: "3px 8px", flexShrink: 0, minWidth: 44, textAlign: "center" }}>
                                                                {s.codigo}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 14, fontWeight: 700, color: zerado ? "#9CA3AF" : "#111827" }}>{s.gramatura}GR <span style={{ fontWeight: 500, color: "#9CA3AF" }}>· {larg}m · </span><span style={{ textTransform: "capitalize" }}>{c}</span></div>
                                                                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{s.metragem}m por bobina</div>
                                                                {reserva && (
                                                                    <div title={reserva.pedidos.join("\n")} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 11, fontWeight: 700, color: "#6D28D9", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "2px 8px" }}>
                                                                        {reserva.qtd} bob. em faturamento · {reserva.pedidos.join(" · ")}
                                                                        <span style={{ fontWeight: 600, color: s.qtd - reserva.qtd < 0 ? "#DC2626" : "#16A34A" }}>· livre {s.qtd - reserva.qtd}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: zerado ? 12 : 24, fontWeight: 900, color: zerado ? "#DC2626" : "#0891B2", lineHeight: 1, flexShrink: 0, textAlign: "right" }}>
                                                                {zerado ? "ZERADO" : s.qtd}
                                                                {!zerado && <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF", marginLeft: 3 }}>bob.</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Histórico */}
            {hist.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                    <div
                        onClick={() => setHistAberto(v => !v)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", background: histAberto ? "#F9FAFB" : "#fff", borderBottom: histAberto ? "1px solid #ECEDF1" : "none" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Histórico de Movimentações</span>
                            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{hist.length} registro{hist.length !== 1 ? "s" : ""}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{histAberto ? "▲" : "▼"}</span>
                    </div>
                    {histAberto && (
                        <div>
                            {/* Filtros */}
                            <div style={{ display: "flex", gap: 6, padding: "10px 14px", borderBottom: "1px solid #F3F4F6", flexWrap: "wrap", alignItems: "center" }}>
                                {[{ id: "todos", label: "Todos" }, { id: "entrada", label: "↑ Entradas" }, { id: "saida", label: "↓ Saídas" }, { id: "direto", label: "Baixa no estoque" }].map(f => (
                                    <button key={f.id} onClick={() => setHistFiltro(f.id)} style={{
                                        padding: "4px 12px", borderRadius: 20, border: "1.5px solid", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                        borderColor: histFiltro === f.id ? (f.id === "entrada" ? "#16A34A" : f.id === "saida" ? "#DC2626" : f.id === "direto" ? "#D97706" : "#0891B2") : "#ECEDF1",
                                        background:  histFiltro === f.id ? (f.id === "entrada" ? "#F0FDF4" : f.id === "saida" ? "#FEF2F2" : f.id === "direto" ? "#FFFBEB" : "#ECFEFF") : "#fff",
                                        color:       histFiltro === f.id ? (f.id === "entrada" ? "#16A34A" : f.id === "saida" ? "#DC2626" : f.id === "direto" ? "#D97706" : "#0891B2") : "#6B7280",
                                    }}>{f.label}</button>
                                ))}
                                <input type="text" value={histBusca} onChange={e => { setHistBusca(e.target.value); setHistDiaAberto(""); }} placeholder="🔍 Código ou cliente"
                                    style={{ marginLeft: "auto", width: 170, padding: "4px 8px", borderRadius: 7, border: "1.5px solid #ECEDF1", fontSize: 12, outline: "none" }} />
                                {histBusca && <button onClick={() => { setHistBusca(""); setHistDiaAberto(""); }} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
                                <input type="date" value={histDia} onChange={e => { setHistDia(e.target.value); setHistDiaAberto(""); }}
                                    style={{ padding: "4px 8px", borderRadius: 7, border: "1.5px solid #ECEDF1", fontSize: 12, color: histDia ? "#111827" : "#9CA3AF", outline: "none", cursor: "pointer" }} />
                                {histDia && <button onClick={() => { setHistDia(""); setHistDiaAberto(""); }} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
                            </div>
                            {(() => {
                                const filtrado = hist.filter(m => {
                                    if (histFiltro === "direto") { if (!m.origem?.direto) return false; }
                                    else if (histFiltro !== "todos" && m.tipo !== histFiltro) return false;
                                    if (histBusca.trim()) {
                                        const alvo = normBusca(`${m.codigo} ${CODIGO_ALIAS[m.codigo] || ""} ${m.gramatura}GR ${m.gramatura}gr ${m.cor} ${m.largura} ${m.metragem}m ${m.origem?.cliente || ""} ${m.origem?.numero != null ? "#" + m.origem.numero : ""} ${m.origem?.direto ? "estoque" : ""}`);
                                        if (!normBusca(histBusca.trim()).split(/\s+/).every(t => alvo.includes(t))) return false;
                                    }
                                    if (histDia) {
                                        const [d,mo,y] = (m.timestamp?.split(", ")[0] || "").split("/");
                                        const dataM = y && mo && d ? `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}` : "";
                                        if (dataM !== histDia) return false;
                                    }
                                    return true;
                                });
                                // Agrupa por dia
                                const porDia = {};
                                filtrado.forEach(m => {
                                    const dia = m.timestamp?.split(", ")[0] || "—";
                                    if (!porDia[dia]) porDia[dia] = [];
                                    porDia[dia].push(m);
                                });
                                return Object.entries(porDia).map(([dia, movs]) => {
                                    const entradas = movs.filter(m => m.tipo === "entrada").reduce((s,m) => s + Number(m.qtd||0), 0);
                                    const saidas   = movs.filter(m => m.tipo !== "entrada").reduce((s,m) => s + Number(m.qtd||0), 0);
                                    const diaAberto = histDiaAberto === dia || (histDiaAberto === "" && Object.keys(porDia).indexOf(dia) === 0);
                                    return (
                                        <div key={dia} style={{ margin: "10px 14px", border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden" }}>
                                            {/* Cabeçalho do dia — clicável */}
                                            <div onClick={() => setHistDiaAberto(p => p === dia ? "" : dia)} style={{ padding: "8px 12px", background: "#F9FAFB", borderBottom: diaAberto ? "1px solid #ECEDF1" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                                                <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{dia}</span>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#F0FDF4", borderRadius: 10, padding: "1px 8px" }}>↑ {entradas} bob.</span>
                                                {saidas > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#DC2626", background: "#FEF2F2", borderRadius: 10, padding: "1px 8px" }}>↓ {saidas} bob.</span>}
                                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>{movs.length} mov. {diaAberto ? "▲" : "▼"}</span>
                                            </div>
                                            {/* Movimentos do dia — só aparece se aberto */}
                                            {diaAberto && movs.map((m, idx) => (
                                                <div key={m.id || idx} style={{
                                                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                                    borderBottom: idx < movs.length - 1 ? "1px solid #F9FAFB" : "none",
                                                    borderLeft: `3px solid ${m.tipo === "entrada" ? "#16A34A50" : "#DC262650"}`,
                                                }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, flexShrink: 0, background: m.tipo === "entrada" ? "#F0FDF4" : "#FEF2F2", color: m.tipo === "entrada" ? "#16A34A" : "#DC2626" }}>
                                                        {m.tipo === "entrada" ? "↑" : "↓"}
                                                    </div>
                                                    <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#0369A1", flexShrink: 0 }}>{CODIGO_ALIAS[m.codigo] || m.codigo}</div>
                                                    <div style={{ flex: 1, fontSize: 12, color: "#374151" }}>
                                                        <b>{m.qtd}</b> bob. <span style={{ color: "#9CA3AF" }}>· {m.gramatura}GR {m.cor} {m.largura}m</span>
                                                        {m.origem?.direto && (
                                                            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 10, background: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D" }}>ESTOQUE</span>
                                                        )}
                                                        {m.origem && !m.origem.direto && (
                                                            <span title={m.origem.estorno ? "Estorno de pedido excluído" : "Baixa por pedido"} style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: m.origem.estorno ? "#F0FDF4" : "#EEF2FF", color: m.origem.estorno ? "#16A34A" : "#4338CA", border: `1px solid ${m.origem.estorno ? "#BBF7D0" : "#C7D2FE"}` }}>
                                                                {m.origem.estorno ? "Estorno " : ""}{m.origem.numero != null ? `#${m.origem.numero} ` : ""}{m.origem.cliente || "sem cliente"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0, textAlign: "right" }}>
                                                        <div>{m.operador}</div>
                                                        <div>{m.timestamp?.split(", ")[1] || ""}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            )}

            {itensComSaldo.length === 0 && hist.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "#9CA3AF", fontSize: 14 }}>
                    Nenhuma movimentação registrada ainda.
                </div>
            )}
        </div>
    );
}

