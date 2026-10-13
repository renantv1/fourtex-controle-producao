import { useState, useMemo, useEffect } from "react";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorSelect } from "../utils/CorSelect";
import { CorInline } from "../utils/CorDot";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

function fmtKg(kg) {
    return kg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function printRelatorioFio(itens) {
    const w = window.open("", "_blank", "width=900,height=700");
    const rows = itens
        .slice()
        .sort((a, b) => a.cor.localeCompare(b.cor, "pt-BR"))
        .map(i => `<tr class="${i.kg <= 0.001 ? "zerado" : ""}"><td>${i.cor}</td><td>${i.kg > 0.001 ? fmtKg(i.kg) : (i.kg < -0.001 ? `${fmtKg(i.kg)} kg` : "ZERADO")}</td></tr>`).join("");
    const totalGeral = itens.reduce((s, i) => s + i.kg, 0);

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Relatório de Estoque de Fio — FourTEX</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px 28px; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0EA5E9; padding-bottom: 10px; margin-bottom: 18px; }
        .report-header .brand { font-size: 20px; font-weight: 900; color: #111; letter-spacing: -0.5px; }
        .report-header .brand span { color: #0EA5E9; }
        .report-header .report-title { font-size: 13px; font-weight: 700; color: #374151; text-align: right; }
        .report-header .report-sub { font-size: 11px; color: #9CA3AF; margin-top: 2px; text-align: right; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
        th { background: #F3F4F6; text-align: left; padding: 6px 10px; border: 1px solid #ECEDF1; font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: .04em; }
        td { padding: 6px 10px; border: 1px solid #ECEDF1; font-size: 12px; }
        tr:nth-child(even) td { background: #F9FAFB; }
        tr.zerado td { background: #F9FAFB; color: #9CA3AF; font-style: italic; }
        .total-geral { margin-top: 16px; padding: 10px 14px; background: #1F2937; color: #fff; border-radius: 6px; font-weight: 800; font-size: 14px; display: flex; justify-content: space-between; }
        .footer { margin-top: 24px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #ECEDF1; padding-top: 8px; display: flex; justify-content: space-between; }
        @media print {
            body { padding: 10px 16px; }
            @page { margin: 12mm 10mm; size: A4 portrait; }
        }
    </style></head><body>
    <div class="report-header">
        <div class="brand">Four<span>TEX</span></div>
        <div>
            <div class="report-title">Relatório de Estoque de Fio</div>
            <div class="report-sub">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
        </div>
    </div>
    <table><thead><tr><th>Cor</th><th>KG</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total-geral"><span>Total Geral</span><span>${fmtKg(totalGeral)} kg</span></div>
    <div class="footer"><span>FourTEX — Indústria Têxtil</span><span>Relatório de Estoque de Fio</span></div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    w.document.close();
}

export default function FioEstoqueTab({ movimentos = [], userName, onMovimento, podeEditar = true }) {
    const [cor,     setCor]     = useState("");
    const [qtd,     setQtd]     = useState("1");
    const [direcao, setDirecao] = useState("entrada");
    const [histAberto,    setHistAberto]    = useState(false);
    const [histFiltro,    setHistFiltro]    = useState("todos"); // "todos" | "entrada" | "saida"
    const [histDia,       setHistDia]       = useState("");
    const [histDiaAberto, setHistDiaAberto] = useState("");

    const handleRegistrar = () => {
        if (!cor || Number(qtd) <= 0) return;
        onMovimento({
            direcao,
            cor,
            qtd: Number(qtd),
            operador: userName,
            origem: "Manual",
        });
        setQtd("1"); setCor("");
    };

    const saldoPorCor = useMemo(() => {
        const map = {};
        COR_CATALOG_SORTED.forEach(c => { map[c.nome] = { cor: c.nome, kg: 0 }; });
        movimentos.forEach(m => {
            if (!map[m.cor]) map[m.cor] = { cor: m.cor, kg: 0 };
            map[m.cor].kg += m.direcao === "entrada" ? Number(m.qtd) : -Number(m.qtd);
        });
        return map;
    }, [movimentos]);

    const parseTS = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,mo,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${mo}-${d}T${t}`).getTime()||0; };
    const hist = [...movimentos].sort((a, b) => parseTS(b.timestamp) - parseTS(a.timestamp));

    const sel = {
        padding: "7px 10px", borderRadius: 7, border: "1px solid #ECEDF1",
        fontSize: 13, background: "#F9FAFB", width: "100%", boxSizing: "border-box",
    };
    const lbl = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 };

    const todosItens = Object.values(saldoPorCor).sort((a, b) => a.cor.localeCompare(b.cor, "pt-BR"));
    const itensComSaldo = todosItens.filter(s => s.kg > 0.001);

    const isMobile = useIsMobile();

    return (
        <div style={{ padding: isMobile ? "16px 12px" : 24, maxWidth: 820, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Estoque de Fio</h2>
                    <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                        Fio (poliéster) usado no Gorgurão, Elástico e Cordões. É descontado automaticamente sempre que um apontamento de produção é lançado.
                    </p>
                </div>
                {todosItens.length > 0 && (
                    <button onClick={() => printRelatorioFio(todosItens)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0369A1", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                        🖨 Relatório de Estoque
                    </button>
                )}
            </div>

            {/* Formulário de movimentação manual */}
            {podeEditar && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        {[
                            { id: "entrada", label: "Entrada", bg: "#F0FDF4", border: "#16A34A", text: "#15803D" },
                            { id: "saida",   label: "Saída",   bg: "#FEF2F2", border: "#DC2626", text: "#DC2626" },
                        ].map(t => (
                            <button key={t.id} onClick={() => setDirecao(t.id)} style={{
                                flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
                                background: direcao === t.id ? t.bg : "#F9FAFB",
                                border:     `2px solid ${direcao === t.id ? t.border : "#ECEDF1"}`,
                                color:      direcao === t.id ? t.text : "#9CA3AF",
                            }}>
                                {direcao === t.id && (t.id === "entrada" ? "↑ " : "↓ ")}{t.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
                        <div>
                            <label style={lbl}>COR</label>
                            <CorSelect value={cor} onChange={e => setCor(e.target.value)} options={COR_CATALOG_SORTED} placeholder="Selecione a cor" style={sel} />
                        </div>

                        <div>
                            <label style={lbl}>QUANTIDADE (KG)</label>
                            <input type="number" min="0.1" step="0.1" value={qtd} onChange={e => setQtd(e.target.value)} style={sel} />
                        </div>
                    </div>

                    <button onClick={handleRegistrar} disabled={!cor || Number(qtd) <= 0} style={{
                        width: "100%", padding: 10, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14,
                        background: !cor ? "#ECEDF1" : direcao === "entrada" ? "#16A34A" : "#DC2626",
                        color:      !cor ? "#9CA3AF" : "#fff",
                        cursor:     cor ? "pointer" : "not-allowed",
                    }}>
                        {direcao === "entrada" ? "↑ Registrar Entrada" : "↓ Registrar Saída"}
                    </button>
                </div>
            )}

            {/* Saldo atual */}
            {todosItens.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.1em" }}>SALDO ATUAL</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#0369A1" }}>
                            {fmtKg(itensComSaldo.reduce((s, i) => s + i.kg, 0))} kg no total
                        </div>
                    </div>

                    <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                        <div style={{ padding: "6px 14px 14px" }}>
                            {todosItens.map((s, i) => {
                                const zerado = s.kg <= 0.001;
                                return (
                                    <div key={s.cor} style={{
                                        display: "flex", alignItems: "center", gap: 12,
                                        padding: "10px 4px",
                                        borderBottom: i < todosItens.length - 1 ? "1px solid #F3F4F6" : "none",
                                        opacity: zerado ? 0.55 : 1,
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                                            <CorInline cor={s.cor} />
                                            <div style={{ fontSize: 14, fontWeight: 700, color: zerado ? "#9CA3AF" : "#111827" }}>{s.cor}</div>
                                        </div>
                                        <div style={{ fontSize: zerado ? 12 : 20, fontWeight: 900, color: zerado ? (s.kg < 0 ? "#DC2626" : "#9CA3AF") : "#0369A1", lineHeight: 1, flexShrink: 0, textAlign: "right" }}>
                                            {zerado ? (s.kg < -0.001 ? `${fmtKg(s.kg)} kg` : "ZERADO") : `${fmtKg(s.kg)} kg`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
                            <div style={{ display: "flex", gap: 6, padding: "10px 14px", borderBottom: "1px solid #F3F4F6", flexWrap: "wrap", alignItems: "center" }}>
                                {[{ id: "todos", label: "Todos" }, { id: "entrada", label: "↑ Entradas" }, { id: "saida", label: "↓ Saídas" }].map(f => (
                                    <button key={f.id} onClick={() => setHistFiltro(f.id)} style={{
                                        padding: "4px 12px", borderRadius: 20, border: "1.5px solid", fontSize: 11, fontWeight: 600, cursor: "pointer",
                                        borderColor: histFiltro === f.id ? (f.id === "entrada" ? "#16A34A" : f.id === "saida" ? "#DC2626" : "#0EA5E9") : "#ECEDF1",
                                        background:  histFiltro === f.id ? (f.id === "entrada" ? "#F0FDF4" : f.id === "saida" ? "#FEF2F2" : "#F0F9FF") : "#fff",
                                        color:       histFiltro === f.id ? (f.id === "entrada" ? "#16A34A" : f.id === "saida" ? "#DC2626" : "#0369A1") : "#6B7280",
                                    }}>{f.label}</button>
                                ))}
                                <input type="date" value={histDia} onChange={e => { setHistDia(e.target.value); setHistDiaAberto(""); }}
                                    style={{ marginLeft: "auto", padding: "4px 8px", borderRadius: 7, border: "1.5px solid #ECEDF1", fontSize: 12, color: histDia ? "#111827" : "#9CA3AF", outline: "none", cursor: "pointer" }} />
                                {histDia && <button onClick={() => { setHistDia(""); setHistDiaAberto(""); }} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
                            </div>
                            {(() => {
                                const filtrado = hist.filter(m => {
                                    if (histFiltro !== "todos" && m.direcao !== histFiltro) return false;
                                    if (histDia) {
                                        const [d,mo,y] = (m.timestamp?.split(", ")[0] || "").split("/");
                                        const dataM = y && mo && d ? `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}` : "";
                                        if (dataM !== histDia) return false;
                                    }
                                    return true;
                                });
                                const porDia = {};
                                filtrado.forEach(m => {
                                    const dia = m.timestamp?.split(", ")[0] || "—";
                                    if (!porDia[dia]) porDia[dia] = [];
                                    porDia[dia].push(m);
                                });
                                return Object.entries(porDia).map(([dia, movs]) => {
                                    const entradas = movs.filter(m => m.direcao === "entrada").reduce((s,m) => s + Number(m.qtd||0), 0);
                                    const saidas   = movs.filter(m => m.direcao !== "entrada").reduce((s,m) => s + Number(m.qtd||0), 0);
                                    const diaAberto = histDiaAberto === dia || (histDiaAberto === "" && Object.keys(porDia).indexOf(dia) === 0);
                                    return (
                                        <div key={dia} style={{ margin: "10px 14px", border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden" }}>
                                            <div onClick={() => setHistDiaAberto(p => p === dia ? "" : dia)} style={{ padding: "8px 12px", background: "#F9FAFB", borderBottom: diaAberto ? "1px solid #ECEDF1" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                                                <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{dia}</span>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#F0FDF4", borderRadius: 10, padding: "1px 8px" }}>↑ {fmtKg(entradas)} kg</span>
                                                {saidas > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#DC2626", background: "#FEF2F2", borderRadius: 10, padding: "1px 8px" }}>↓ {fmtKg(saidas)} kg</span>}
                                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>{movs.length} mov. {diaAberto ? "▲" : "▼"}</span>
                                            </div>
                                            {diaAberto && movs.map((m, idx) => (
                                                <div key={m.id || idx} style={{
                                                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                                    borderBottom: idx < movs.length - 1 ? "1px solid #F9FAFB" : "none",
                                                    borderLeft: `3px solid ${m.direcao === "entrada" ? "#16A34A50" : "#DC262650"}`,
                                                }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, flexShrink: 0, background: m.direcao === "entrada" ? "#F0FDF4" : "#FEF2F2", color: m.direcao === "entrada" ? "#16A34A" : "#DC2626" }}>
                                                        {m.direcao === "entrada" ? "↑" : "↓"}
                                                    </div>
                                                    {m.origem && <span style={{ fontSize: 10, fontWeight: 700, color: "#0369A1", flexShrink: 0, background: "#F0F9FF", borderRadius: 5, padding: "2px 6px" }}>{m.origem}</span>}
                                                    <div style={{ flex: 1, fontSize: 12, color: "#374151" }}>
                                                        <b>{fmtKg(Number(m.qtd || 0))}</b> kg <span style={{ color: "#9CA3AF" }}>· {m.cor}</span>
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
        </div>
    );
}
