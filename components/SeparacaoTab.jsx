import { useState, useMemo } from "react";
import { CorInline } from "../utils/CorDot";
import { getCodigoBonemania } from "../utils/codigosBonemania";


const TIPO_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };
const TIPO_BG    = { Gorgurão: "#FFF7ED", Poliéster: "#EEF2FF", Elástico: "#F0FDF4" };
const FATOR_ROLO_25M = 4;

const STATUS_CONFIG = {
    pendente: { label: "Pendente",  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
    separado: { label: "Separado",  color: "#0891B2", bg: "#ECFEFF", border: "#BAE6FD" },
    faturado: { label: "Faturado",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
};

function fmtData(iso) {
    try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso || ""; }
}

function fmtQtd(qtd) {
    if (typeof qtd !== "number") return qtd;
    if (Number.isInteger(qtd)) return qtd;
    return (Math.round(qtd * 100) / 100).toString().replace(".", ",");
}

function fmtAlocacao(alocacao) {
    if (!alocacao?.length) return "";
    if (alocacao.length === 1) return ` (#${alocacao[0].numero})`;
    return ` (${alocacao.map(a => `#${a.numero}: ${fmtQtd(a.qtd)}`).join(" / ")})`;
}

function textoParaCopiar(r) {
    const linhas = (r.itens || []).map(it => {
        const codigo = (it.tipo || "").toLowerCase().includes("gorgu")
            ? getCodigoBonemania(it.medida, it.cor)
            : null;
        const codStr = codigo ? `[${codigo}] ` : "";
        const cxStr = it.caixas ? ` [${it.caixas} cx]` : "";
        const r25str = it.rolo25m ? ` (${Math.round((it.qtd || 0) * FATOR_ROLO_25M)} rolos 25m)` : "";
        return `${codStr}${it.medida} ${it.cor} ${fmtQtd(it.qtd)}${r25str}${fmtAlocacao(it.alocacao)}${cxStr}`;
    });
    const volText = r.volumes ? `\n\n${r.volumes} volume${r.volumes !== 1 ? "s" : ""}` : "";
    const vendedorLine = r.vendedor ? `\nVendedor: ${r.vendedor}` : "";
    return `${r.cliente}${vendedorLine}\nPedidos: #${(r.pedidos || []).join(", #")}\n\n${linhas.join("\n")}${volText}`;
}

function ResumoCard({ resumo, onCopiar, onSalvar, salvo, copiado, onConfirmarSeparacao, onFaturar, onAtualizarItem, emEdicao, onEditar, onConfirmarEdicao }) {
    const sc = STATUS_CONFIG[resumo.status] || {};
    return (
        <div style={{ background: "#fff", border: "1.5px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>
            {/* Header escuro */}
            <div style={{ background: "#111827", padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: resumo.vendedor ? 2 : 6 }}>{resumo.cliente}</div>
                {resumo.vendedor && <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>Vendedor: <span style={{ color: "#ECEDF1", fontWeight: 600 }}>{resumo.vendedor}</span></div>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {(resumo.pedidos || []).map(n => (
                                <span key={n} style={{ fontSize: 11, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 20, padding: "2px 8px" }}>#{n}</span>
                            ))}
                        </div>
                    </div>
                    {resumo.status && sc.label && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 20, padding: "3px 10px", flexShrink: 0 }}>{sc.label}</span>
                    )}
                </div>
            </div>

            {/* Itens */}
            <div style={{ padding: "4px 0" }}>
                {(resumo.itens || []).map((it, idx) => {
                    const qtd = fmtQtd(it.qtd);
                    return (
                        <div key={idx} style={{ padding: "10px 18px", borderBottom: idx < resumo.itens.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                    <CorInline cor={it.cor} />
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{it.medida} {it.cor}</span>
                                    {it.tipo && <span style={{ fontSize: 10, fontWeight: 700, color: TIPO_COLOR[it.tipo] || "#6B7280", background: TIPO_BG[it.tipo] || "#F3F4F6", borderRadius: 4, padding: "1px 6px" }}>{it.tipo}</span>}
                                    {(() => { const cod = (it.tipo||"").toLowerCase().includes("gorgu") ? getCodigoBonemania(it.medida, it.cor) : null; return cod ? <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#DC2626", borderRadius: 4, padding: "1px 6px", fontFamily: "monospace" }}>{cod}</span> : null; })()}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                    {onAtualizarItem ? (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <input
                                                    key={it.qtd ?? ""}
                                                    type="text"
                                                    inputMode="decimal"
                                                    defaultValue={it.qtd || ""}
                                                    onChange={e => { if (!/^[0-9]*[.,]?[0-9]*$/.test(e.target.value)) e.target.value = e.target.value.replace(/[^0-9.,]/g, ""); }}
                                                    onFocus={e => e.target.style.borderColor = "#0891B2"}
                                                    onBlur={e => { e.target.style.borderColor = "#BAE6FD"; onAtualizarItem(idx, "qtd", parseFloat(e.target.value.replace(",", ".")) || it.qtd); }}
                                                    style={{ width: 60, padding: "2px 6px", border: "1.5px solid #BAE6FD", borderRadius: 6, fontSize: 14, fontWeight: 800, textAlign: "right", outline: "none", background: "#F0F9FF", color: "#0891B2", boxSizing: "border-box" }}
                                                />
                                                <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>{it.unidade || "RL"}</span>
                                            </div>
                                            {it.rolo25m && <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C" }}>{Math.round((it.qtd || 0) * FATOR_ROLO_25M).toLocaleString("pt-BR")} rolos 25m</span>}
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                            <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{qtd} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>{it.unidade || "RL"}</span></span>
                                            {it.rolo25m && <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C" }}>{Math.round((it.qtd || 0) * FATOR_ROLO_25M).toLocaleString("pt-BR")} rolos 25m</span>}
                                        </div>
                                    )}
                                    {onAtualizarItem ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <input
                                                key={it.caixas ?? ""}
                                                type="text"
                                                inputMode="numeric"
                                                defaultValue={it.caixas || ""}
                                                placeholder="— cx"
                                                onChange={e => { if (!/^[0-9]*$/.test(e.target.value)) e.target.value = e.target.value.replace(/[^0-9]/g, ""); }}
                                                onFocus={e => e.target.style.borderColor = "#F97316"}
                                                onBlur={e => { e.target.style.borderColor = "#FED7AA"; onAtualizarItem(idx, "caixas", parseInt(e.target.value) || null); }}
                                                style={{ width: 60, padding: "2px 6px", border: "1.5px solid #FED7AA", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", background: "#FFF7ED", color: "#EA580C", fontWeight: 700, boxSizing: "border-box" }}
                                            />
                                            <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>cx</span>
                                        </div>
                                    ) : (
                                        it.caixas ? <span style={{ fontSize: 11, fontWeight: 700, color: "#F97316", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 5, padding: "1px 7px" }}>{it.caixas} cx</span> : null
                                    )}
                                </div>
                            </div>
                            {it.alocacao?.length > 0 && (
                                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {it.alocacao.map((a, i) => (
                                        <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "#F97316", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 20, padding: "1px 8px" }}>
                                            #{a.numero}{it.alocacao.length > 1 ? `: ${fmtQtd(a.qtd)}` : ""}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Rastreio */}
            {(resumo.criadoPor || resumo.separadoPor || resumo.faturadoPor) && (
                <div style={{ padding: "10px 18px", background: "#F9FAFB", borderTop: "1px solid #F3F4F6", fontSize: 12, color: "#6B7280", display: "flex", flexDirection: "column", gap: 4 }}>
                    {resumo.separadoPor && <span>Separado por <b style={{ color: "#0891B2" }}>{resumo.separadoPor}</b> em {resumo.timestampSeparacao}</span>}
                    {resumo.faturadoPor && <span>Faturado por <b style={{ color: "#7C3AED" }}>{resumo.faturadoPor}</b> em {resumo.timestampFaturamento}</span>}
                </div>
            )}

            {/* Footer: volumes + caixas + ações */}
            <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", background: "#F9FAFB", borderTop: "1px solid #ECEDF1", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
                    {resumo.volumes
                        ? <span style={{ fontSize: 16, fontWeight: 800, color: "#F97316" }}>{resumo.volumes} <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>caixa{resumo.volumes !== 1 ? "s" : ""}</span></span>
                        : <span style={{ fontSize: 12, color: "#9CA3AF" }}>sem caixas</span>}
                    {(() => {
                        const porUn = {};
                        let total25m = 0;
                        (resumo.itens || []).forEach(it => {
                            const un = (it.unidade === "m" || it.unidade === "Metro") ? "Metro" : it.unidade === "Kg" ? "Kg" : "RL";
                            porUn[un] = (porUn[un] || 0) + (Number(it.qtd) || 0);
                            if (it.rolo25m) total25m += (Number(it.qtd) || 0) * FATOR_ROLO_25M;
                        });
                        return <>
                            {Object.entries(porUn).filter(([,v]) => v > 0).map(([un, v]) => (
                                <span key={un} style={{ fontSize: 16, fontWeight: 800, color: "#0891B2" }}>{v.toLocaleString("pt-BR")} <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>{un}</span></span>
                            ))}
                            {total25m > 0 && <span style={{ fontSize: 14, fontWeight: 800, color: "#EA580C" }}>{Math.round(total25m).toLocaleString("pt-BR")} <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>rolos 25m</span></span>}
                        </>;
                    })()}
                </div>
                <button onClick={onCopiar} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #ECEDF1", background: copiado ? "#F0FDF4" : "#fff", color: copiado ? "#16A34A" : "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    {copiado ? "✓ Copiado" : "Copiar"}
                </button>
                {onSalvar && (
                    <button onClick={onSalvar} disabled={salvo} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: salvo ? "#F0FDF4" : "#0891B2", color: salvo ? "#16A34A" : "#fff", fontWeight: 700, fontSize: 12, cursor: salvo ? "default" : "pointer" }}>
                        {salvo ? "✓ Salvo" : "Salvar"}
                    </button>
                )}
                {onEditar && !emEdicao && (
                    <button onClick={onEditar} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #ECEDF1", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        ✎ Editar
                    </button>
                )}
                {emEdicao && (
                    <button onClick={onConfirmarEdicao} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        Confirmar edição ✓
                    </button>
                )}
                {onConfirmarSeparacao && resumo.status === "pendente" && (
                    <button onClick={onConfirmarSeparacao} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#0891B2", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        Confirmar ✓
                    </button>
                )}
                {onFaturar && resumo.status === "separado" && (
                    <button onClick={onFaturar} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        Faturar ✓
                    </button>
                )}
            </div>
        </div>
    );
}

export default function SeparacaoTab({ orders = [], clientes = [], userRole, historico = [], onSalvar, onConfirmarSeparacao, onFaturar, onExcluir, onAtualizar, podeEditar = true }) {
    const podecriar     = true;
    const podeConfirmar = true;
    const podeFaturar   = true;
    const [buscaCliente,    setBuscaCliente]    = useState("");
    const [showDropCliente, setShowDropCliente] = useState(false);
    const [clienteSel,   setClienteSel]   = useState("");
    const [pedidosSel,   setPedidosSel]   = useState(new Set());
    const [qtdEnviando,  setQtdEnviando]  = useState({});
    const [caixasEnviando, setCaixasEnviando] = useState({});
    const [volumes,      setVolumes]      = useState("");
    const [resumo,       setResumo]       = useState(null);
    const [copiado,      setCopiado]      = useState(false);
    const [copiandoId,   setCopiandoId]   = useState(null);
    const [salvo,        setSalvo]        = useState(false);
    const [abaAtiva,     setAbaAtiva]     = useState("nova");
    const [filtroStatus, setFiltroStatus] = useState("pendente");
    const [expandidoId,  setExpandidoId]  = useState(null);
    const [editandoId,   setEditandoId]   = useState(null);
    const [buscaHistorico, setBuscaHistorico] = useState("");
    const [gruposAbertos, setGruposAbertos] = useState(new Set());
    const toggleGrupo = (chave) => setGruposAbertos(prev => { const n = new Set(prev); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });

    const pedidosCliente = useMemo(() =>
        !clienteSel ? [] : orders
            .filter(o => {
                if (o.status === "concluido") return false;
                const it = o.itens ? (Array.isArray(o.itens) ? o.itens : Object.values(o.itens)) : [];
                if (it.length === 0) return false;
                const eMap = {};
                Object.values(o.entregasParciais || {}).forEach(e => {
                    (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                        const ek = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                        eMap[ek] = (eMap[ek] || 0) + Number(ei.qtd || 0);
                    });
                });
                if (it.every(i => {
                    const ek = `${(i.cor||"").trim().toLowerCase()}|${i.medida}|${(i.tipo||"").toLowerCase()}`;
                    return (eMap[ek] || 0) >= (i.qtdTotal || 0);
                })) return false;
                return (o.cliente || "").trim().toLowerCase() === clienteSel.trim().toLowerCase();
            })
            .sort((a, b) => (a.numero || 0) - (b.numero || 0)),
        [orders, clienteSel]
    );

    const itensPendentes = useMemo(() => {
        const map = {};
        pedidosCliente.filter(o => pedidosSel.has(o.id)).forEach(order => {
            const itens = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});
            const entregasObj = order.entregasParciais || {};
            const entregueMap = {};
            const entregueOrigMap = {};
            Object.values(entregasObj).forEach(e => {
                const eitens = Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {});
                eitens.forEach(ei => {
                    const ek = `${(ei.cor || "").trim().toLowerCase()}|${ei.medida}|${(ei.tipo || "").toLowerCase()}`;
                    entregueMap[ek] = (entregueMap[ek] || 0) + Number(ei.qtd || 0);
                    entregueOrigMap[ek] = (entregueOrigMap[ek] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                });
            });
            itens.forEach(it => {
                const ek = `${(it.cor || "").trim().toLowerCase()}|${it.medida}|${(it.tipo || "").toLowerCase()}`;
                const unidade = it.unidadeOriginal || "RL";
                const isOrig = unidade !== "RL";
                const isMetro = unidade === "m" || unidade === "Metro";
                const totalDisp = isOrig
                    ? (it.qtdOriginal || (isMetro ? (it.qtdTotal || 0) * 25 : it.qtdTotal || 0))
                    : (it.qtdTotal || 0);
                const entregue = isOrig ? (entregueOrigMap[ek] || 0) : (entregueMap[ek] || 0);
                const pend = Math.max(0, totalDisp - entregue);
                if (pend <= 0) return;
                const k = `${it.tipo}|${it.medida}|${(it.cor || "").trim()}`;
                if (!map[k]) map[k] = { key: k, tipo: it.tipo, medida: it.medida, cor: it.cor || "", qtdPendente: 0, unidade, rolo25m: false, pedidosDetalhes: [] };
                if (it.rolo25m) map[k].rolo25m = true;
                map[k].qtdPendente += pend;
                map[k].pedidosDetalhes.push({ numero: order.numero, qtd: pend });
            });
        });
        return Object.values(map).sort((a, b) => a.medida.localeCompare(b.medida) || a.cor.localeCompare(b.cor));
    }, [pedidosCliente, pedidosSel]);

    const reset = () => { setPedidosSel(new Set()); setQtdEnviando({}); setCaixasEnviando({}); setVolumes(""); setResumo(null); setSalvo(false); };
    const handleClienteChange = (nome) => { setClienteSel(nome); reset(); };
    const togglePedido = (id) => { setPedidosSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setQtdEnviando({}); setCaixasEnviando({}); setResumo(null); setSalvo(false); };
    const toggleTodos = () => { setPedidosSel(pedidosSel.size === pedidosCliente.length ? new Set() : new Set(pedidosCliente.map(p => p.id))); setQtdEnviando({}); setCaixasEnviando({}); setResumo(null); setSalvo(false); };
    const setQtd = (key, val) => { setQtdEnviando(p => ({ ...p, [key]: val })); setResumo(null); setSalvo(false); };
    const getQtd = (key) => qtdEnviando[key] ?? "";
    const getCx = (key) => caixasEnviando[key] ?? "";
    const setCx = (key, val) => { setCaixasEnviando(p => ({ ...p, [key]: val })); setResumo(null); setSalvo(false); };
    const preencherTudo = () => { const n = {}; itensPendentes.forEach(it => { n[it.key] = it.rolo25m ? it.qtdPendente * FATOR_ROLO_25M : it.qtdPendente; }); setQtdEnviando(n); setResumo(null); setSalvo(false); };

    const gerarResumo = () => {
        const itensEnvio = itensPendentes
            .map(it => {
                const rawQtd = parseFloat((getQtd(it.key) || "").toString().replace(/\./g, "").replace(",", ".")) || 0;
                const qtd = it.rolo25m ? rawQtd / FATOR_ROLO_25M : rawQtd;
                let restante = qtd;
                const alocacao = [];
                for (const p of it.pedidosDetalhes) {
                    if (restante <= 0) break;
                    const qtdDeste = Math.min(restante, p.qtd);
                    alocacao.push({ numero: p.numero, qtd: qtdDeste });
                    restante -= qtdDeste;
                }
                const caixas = parseInt(getCx(it.key)) || null;
                return { ...it, qtd, alocacao, caixas };
            })
            .filter(it => it.qtd > 0);
        if (!itensEnvio.length) return;

        const pedidosUsados = new Set();
        itensEnvio.forEach(it => it.alocacao.forEach(a => pedidosUsados.add(a.numero)));
        const nums = [...pedidosUsados].sort((a, b) => a - b);
        const clienteObj = clientes.find(c => c.nome === clienteSel);
        const vendedor = clienteObj?.vendedor || "";
        const totalCaixas = itensEnvio.reduce((s, it) => s + (it.caixas || 0), 0);
        setResumo({ cliente: clienteSel, vendedor, pedidos: nums, itens: itensEnvio, volumes: totalCaixas || null });
        setSalvo(false); setCopiado(false);
    };

    const copiarHistorico = async (id, r) => {
        try { await navigator.clipboard.writeText(textoParaCopiar(r)); setCopiandoId(id); setTimeout(() => setCopiandoId(null), 2000); } catch {}
    };

    const contagem = { pendente: 0, separado: 0, faturado: 0 };
    historico.forEach(h => { if (h.status in contagem) contagem[h.status]++; });
    // Pendentes e Separados ficam na aba principal, Concluídos no Histórico
    const ativos    = historico.filter(h => h.status === "pendente" || h.status === "separado");
    const concluidos = historico.filter(h => h.status === "faturado");

    const concluidosFiltrados = useMemo(() => {
        const termo = buscaHistorico.trim().toLowerCase();
        if (!termo) return concluidos;
        return concluidos.filter(h => {
            if ((h.cliente || "").toLowerCase().includes(termo)) return true;
            if ((h.vendedor || "").toLowerCase().includes(termo)) return true;
            if ((h.pedidos || []).some(n => String(n).includes(termo))) return true;
            if ((h.itens || []).some(it => (it.medida || "").toLowerCase().includes(termo) || (it.cor || "").toLowerCase().includes(termo))) return true;
            return false;
        });
    }, [concluidos, buscaHistorico]);

    const gruposHistorico = useMemo(() => {
        const map = new Map();
        concluidosFiltrados.forEach(h => {
            const data = fmtData(h.timestamp).split(" ")[0] || "Sem data";
            if (!map.has(data)) map.set(data, []);
            map.get(data).push(h);
        });
        const grupos = Array.from(map.entries()).map(([data, itens]) => ({
            data,
            itens: itens.slice().sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)),
            maxTs: Math.max(...itens.map(h => new Date(h.timestamp || 0).getTime() || 0)),
        }));
        grupos.sort((a, b) => b.maxTs - a.maxTs);
        return grupos;
    }, [concluidosFiltrados]);

    return (
        <div style={{ padding: "20px 16px 60px", maxWidth: 680, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#111827" }}>Separação</h2>

            {/* Abas principais */}
            <div style={{ display: "flex", marginBottom: 20, background: "#F3F4F6", borderRadius: 10, padding: 3 }}>
                {[
                    { id: "nova", label: "Nova separação" },
                    { id: "historico", label: `Histórico (${concluidos.length})` }
                ].map(a => (
                    <button key={a.id} onClick={() => setAbaAtiva(a.id)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: abaAtiva === a.id ? 700 : 500, background: abaAtiva === a.id ? "#fff" : "transparent", color: abaAtiva === a.id ? "#111827" : "#6B7280", cursor: "pointer", boxShadow: abaAtiva === a.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                        {a.label}
                    </button>
                ))}
            </div>

            {/* ── Nova separação ── */}
            {abaAtiva === "nova" && podeEditar && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Cliente com busca */}
                    <div style={{ position: "relative" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6 }}>CLIENTE</label>
                        <input
                            value={clienteSel ? clienteSel : buscaCliente}
                            onChange={e => { setBuscaCliente(e.target.value); handleClienteChange(""); setShowDropCliente(true); }}
                            onFocus={() => setShowDropCliente(true)}
                            onBlur={() => setTimeout(() => setShowDropCliente(false), 150)}
                            placeholder="Buscar cliente..."
                            autoComplete="off"
                            style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${clienteSel ? "#0891B2" : "#ECEDF1"}`, borderRadius: 8, fontSize: 14, background: "#F9FAFB", color: "#111827", outline: "none", boxSizing: "border-box" }}
                        />
                        {clienteSel && (
                            <button onClick={() => { handleClienteChange(""); setBuscaCliente(""); }} style={{ position: "absolute", right: 10, top: "50%", marginTop: 8, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9CA3AF" }}>✕</button>
                        )}
                        {showDropCliente && !clienteSel && (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", marginTop: 2, maxHeight: 220, overflowY: "auto" }}>
                                {clientes
                                    .filter(c => !buscaCliente || c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
                                    .map(c => (
                                        <div key={c.key} onMouseDown={() => { handleClienteChange(c.nome); setBuscaCliente(""); setShowDropCliente(false); }}
                                            style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "#111827", borderBottom: "1px solid #F3F4F6" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                                            <span style={{ fontWeight: 600 }}>{c.nome}</span>
                                            {c.vendedor && <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>{c.vendedor}</span>}
                                        </div>
                                    ))
                                }
                                {clientes.filter(c => !buscaCliente || c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).length === 0 && (
                                    <div style={{ padding: "12px 14px", fontSize: 13, color: "#9CA3AF" }}>Nenhum cliente encontrado</div>
                                )}
                            </div>
                        )}
                    </div>

                    {clienteSel && pedidosCliente.length === 0 && (
                        <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 14, background: "#F9FAFB", borderRadius: 12 }}>Nenhum pedido em aberto para este cliente.</div>
                    )}

                    {/* Seleção de pedidos */}
                    {pedidosCliente.length > 0 && (
                        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #ECEDF1", background: "#F9FAFB" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>PEDIDOS EM ABERTO</span>
                                <button onClick={toggleTodos} style={{ fontSize: 12, fontWeight: 600, color: "#0891B2", background: "none", border: "none", cursor: "pointer" }}>
                                    {pedidosSel.size === pedidosCliente.length ? "Desmarcar todos" : "Selecionar todos"}
                                </button>
                            </div>
                            {pedidosCliente.map((p, idx) => {
                                const itens = Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {});
                                const eMap = {};
                                const eOrigMap = {};
                                Object.values(p.entregasParciais || {}).forEach(e => {
                                    (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                                        const ek = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                                        eMap[ek] = (eMap[ek] || 0) + Number(ei.qtd || 0);
                                        eOrigMap[ek] = (eOrigMap[ek] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                                    });
                                });
                                const total = itens.reduce((s, it) => {
                                    const ek = `${(it.cor||"").trim().toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`;
                                    const un = it.unidadeOriginal || "RL";
                                    const isOrig = un !== "RL";
                                    const isMetro = un === "m" || un === "Metro";
                                    const tot = isOrig ? (it.qtdOriginal || (isMetro ? (it.qtdTotal||0)*25 : it.qtdTotal||0)) : (it.qtdTotal||0);
                                    const ent = isOrig ? (eOrigMap[ek]||0) : (eMap[ek]||0);
                                    return s + Math.max(0, tot - ent);
                                }, 0);
                                const unids = [...new Set(itens.map(it => it.unidadeOriginal || "RL"))];
                                const unLabel = unids.length === 1 ? (unids[0] === "m" || unids[0] === "Metro" ? "Metro" : unids[0] === "Kg" ? "Kg" : "RL") : "RL";
                                const tem25m = itens.some(it => it.rolo25m && (it.unidadeOriginal || "RL") === "RL");
                                const total25m = tem25m ? itens.reduce((s, it) => {
                                    if (!it.rolo25m || (it.unidadeOriginal || "RL") !== "RL") return s;
                                    const ek = `${(it.cor||"").trim().toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`;
                                    const pend = Math.max(0, (it.qtdTotal||0) - (eMap[ek]||0));
                                    return s + pend * FATOR_ROLO_25M;
                                }, 0) : 0;
                                return (
                                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: idx < pedidosCliente.length - 1 ? "1px solid #F3F4F6" : "none", background: pedidosSel.has(p.id) ? "#F0F9FF" : "transparent" }}>
                                        <input type="checkbox" checked={pedidosSel.has(p.id)} onChange={() => togglePedido(p.id)} style={{ width: 16, height: 16, accentColor: "#0891B2", cursor: "pointer", flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 700, color: "#111827", fontSize: 13 }}>#{p.numero}</span>
                                            {p.dataEntrega && <span style={{ fontSize: 12, color: "#6B7280", marginLeft: 8 }}>Entrega: {p.dataEntrega}</span>}
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                                            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{total.toLocaleString("pt-BR")} {unLabel} pend.</span>
                                            {tem25m && total25m > 0 && <span style={{ fontSize: 11, color: "#EA580C", fontWeight: 700 }}>{Math.round(total25m).toLocaleString("pt-BR")} rolos de 25m</span>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {/* Itens dos pedidos selecionados */}
                    {pedidosSel.size > 0 && itensPendentes.length > 0 && (
                        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #ECEDF1", background: "#F9FAFB" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>ITENS PENDENTES</span>
                                <button onClick={preencherTudo} style={{ fontSize: 12, fontWeight: 600, color: "#0891B2", background: "none", border: "none", cursor: "pointer" }}>Preencher tudo</button>
                            </div>
                            {itensPendentes.map((it, idx) => (
                                <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: idx < itensPendentes.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                    {/* Caixas */}
                                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                        <input type="text" inputMode="numeric" placeholder="—" value={getCx(it.key)} onChange={e => { const v = e.target.value; if (/^[0-9]*$/.test(v)) setCx(it.key, v); }}
                                            style={{ width: 48, height: 36, padding: "4px 6px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                                            onFocus={e => e.target.style.borderColor = "#F97316"}
                                            onBlur={e => e.target.style.borderColor = "#ECEDF1"} />
                                        <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.04em" }}>CX</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", display: "flex", alignItems: "center", gap: 5 }}>
                                            <CorInline cor={it.cor} />
                                            {it.medida} {it.cor}
                                            <span style={{ fontSize: 10, fontWeight: 700, color: TIPO_COLOR[it.tipo] || "#6B7280", background: TIPO_BG[it.tipo] || "#F3F4F6", borderRadius: 4, padding: "1px 6px" }}>{it.tipo}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                                            {it.rolo25m
                                                ? <><span style={{ color: "#EA580C", fontWeight: 700 }}>{Math.round(it.qtdPendente * FATOR_ROLO_25M).toLocaleString("pt-BR")} rolos de 25m</span> <span>({it.qtdPendente.toLocaleString("pt-BR")} RL)</span></>
                                                : <>{it.qtdPendente.toLocaleString("pt-BR")} {it.unidade} pendente</>
                                            }
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                        <input type="text" inputMode="decimal" placeholder="0" value={getQtd(it.key)} onChange={e => { const v = e.target.value; if (/^[0-9.]*,?[0-9]*$/.test(v)) setQtd(it.key, v); }}
                                            style={{ width: 80, padding: "6px 8px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, textAlign: "right", outline: "none", boxSizing: "border-box" }}
                                            onFocus={e => e.target.style.borderColor = "#0891B2"}
                                            onBlur={e => e.target.style.borderColor = "#ECEDF1"} />
                                        <span style={{ fontSize: 11, color: it.rolo25m ? "#EA580C" : "#9CA3AF", fontWeight: it.rolo25m ? 700 : 400, minWidth: 20 }}>{it.rolo25m ? "rl 25m" : it.unidade}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {pedidosSel.size > 0 && itensPendentes.length === 0 && (
                        <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13, background: "#F9FAFB", borderRadius: 12 }}>Nenhum item pendente nos pedidos selecionados.</div>
                    )}

                    {/* Volumes + Total Caixas */}
                    {itensPendentes.length > 0 && (
                        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 24 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", flex: 1 }}>Totais</span>
                            {(() => {
                                const totalCx = Object.values(caixasEnviando).reduce((s, v) => s + (parseInt(v) || 0), 0);
                                const porUnidade = {};
                                let total25m = 0;
                                itensPendentes.forEach(it => {
                                    const raw = (qtdEnviando[it.key] || "").toString().replace(/\./g, "").replace(",", ".");
                                    const v = parseFloat(raw) || 0;
                                    if (it.rolo25m) {
                                        total25m += v;
                                        const un = "RL";
                                        porUnidade[un] = (porUnidade[un] || 0) + v / FATOR_ROLO_25M;
                                    } else {
                                        const un = it.unidade === "m" || it.unidade === "Metro" ? "Metro" : it.unidade === "Kg" ? "Kg" : "RL";
                                        porUnidade[un] = (porUnidade[un] || 0) + v;
                                    }
                                });
                                return (
                                    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                                        {Object.entries(porUnidade).map(([un, total]) => (
                                            <div key={un} style={{ textAlign: "center" }}>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: total > 0 ? "#0891B2" : "#D1D5DB" }}>{total > 0 ? total.toLocaleString("pt-BR") : "—"}</div>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF" }}>{un}</div>
                                            </div>
                                        ))}
                                        {total25m > 0 && <div style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#EA580C" }}>{Math.round(total25m).toLocaleString("pt-BR")}</div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF" }}>rolos 25m</div>
                                        </div>}
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: totalCx > 0 ? "#F97316" : "#D1D5DB" }}>{totalCx > 0 ? totalCx : "—"}</div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF" }}>CX / Vol.</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {itensPendentes.length > 0 && (
                        <button onClick={gerarResumo} style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                            Gerar resumo
                        </button>
                    )}

                    {resumo && (
                        <ResumoCard
                            resumo={resumo}
                            copiado={copiado}
                            salvo={salvo}
                            onCopiar={async () => { try { await navigator.clipboard.writeText(textoParaCopiar(resumo)); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {} }}
                            onSalvar={podecriar ? async () => {
                        const dadosLimpos = {
                            cliente: resumo.cliente,
                            pedidos: (resumo.pedidos || []).filter(n => n != null),
                            volumes: resumo.volumes ?? null,
                            itens: (resumo.itens || []).map(it => ({
                                medida: it.medida || "",
                                cor: it.cor || "",
                                tipo: it.tipo || "",
                                qtd: Number(it.qtd) || 0,
                                unidade: it.unidade || "RL",
                                rolo25m: it.rolo25m || false,
                                caixas: it.caixas || null,
                                alocacao: (it.alocacao || [])
                                    .filter(a => a.numero != null && a.numero !== undefined)
                                    .map(a => ({ numero: Number(a.numero), qtd: Number(a.qtd) })),
                            })),
                        };
                        try {
                            await onSalvar?.(dadosLimpos);
                            // Reset completo após salvar
                            setClienteSel("");
                            setBuscaCliente("");
                            setPedidosSel(new Set());
                            setQtdEnviando({});
                            setVolumes("");
                            setResumo(null);
                            setSalvo(false);
                        } catch {
                            // erro já notificado no app.jsx
                        }
                    } : null}
                        />
                    )}
                </div>
            )}

            {/* ── Ativos (Pendentes + Separados) — na aba Nova separação ── */}
            {abaAtiva === "nova" && ativos.length > 0 && (
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em" }}>
                        AGUARDANDO AÇÃO ({ativos.length})
                    </div>
                    {ativos.map(h => {
                        const clienteObj = clientes.find(c => c.nome === h.cliente);
                        const hEnriquecido = { ...h, vendedor: h.vendedor || clienteObj?.vendedor || "" };
                        return (
                        <div key={h.id}>
                            <ResumoCard
                                resumo={hEnriquecido}
                                copiado={copiandoId === h.id}
                                salvo={true}
                                onCopiar={() => copiarHistorico(h.id, h)}
                                onConfirmarSeparacao={podeEditar && h.status === "pendente" && podeConfirmar ? () => onConfirmarSeparacao?.(h.id) : null}
                                onFaturar={podeEditar && h.status === "separado" && podeFaturar ? () => onFaturar?.(h.id) : null}
                                emEdicao={editandoId === h.id}
                                onEditar={podeEditar && onAtualizar ? () => setEditandoId(h.id) : null}
                                onConfirmarEdicao={() => setEditandoId(null)}
                                onAtualizarItem={editandoId === h.id && podeEditar && onAtualizar ? (idx, campo, valor) => {
                                    const itensAtualizados = (h.itens || []).map((it, i) => i === idx ? { ...it, [campo]: valor } : it);
                                    onAtualizar(h.id, { itens: itensAtualizados });
                                } : null}
                            />
                            {podeEditar && (
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                                <button onClick={() => { if (window.confirm("Excluir esta separação?")) onExcluir?.(h.id); }} style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "4px 8px" }}>Excluir</button>
                            </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            )}

            {/* ── Histórico — só Concluídos, agrupado por data ── */}
            {abaAtiva === "historico" && (
                <div>
                    {concluidos.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14, background: "#F9FAFB", borderRadius: 12 }}>
                            Nenhuma separação concluída ainda.
                        </div>
                    ) : (
                        <>
                            <div style={{ position: "relative", marginBottom: 14 }}>
                                <input
                                    value={buscaHistorico}
                                    onChange={e => setBuscaHistorico(e.target.value)}
                                    placeholder="Buscar por cliente, pedido, produto ou vendedor..."
                                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #ECEDF1", borderRadius: 8, fontSize: 14, background: "#F9FAFB", color: "#111827", outline: "none", boxSizing: "border-box" }}
                                />
                                {buscaHistorico && (
                                    <button onClick={() => setBuscaHistorico("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9CA3AF" }}>✕</button>
                                )}
                            </div>

                            {gruposHistorico.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14, background: "#F9FAFB", borderRadius: 12 }}>
                                    Nenhum resultado encontrado.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {gruposHistorico.map(grupo => {
                                        const grupoAberto = gruposAbertos.has(grupo.data);
                                        return (
                                        <div key={grupo.data} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                                            {/* Cabeçalho da data — clicável */}
                                            <div onClick={() => toggleGrupo(grupo.data)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: grupoAberto ? "#F3F4F6" : "#F9FAFB" }}>
                                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                                                    <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{grupo.data}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0891B2", background: "#ECFEFF", border: "1px solid #BAE6FD", borderRadius: 20, padding: "2px 9px" }}>
                                                        {grupo.itens.length} pedido{grupo.itens.length !== 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{grupoAberto ? "▲" : "▼"}</span>
                                            </div>
                                            {/* Pedidos do dia */}
                                            {grupoAberto && (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px 10px", background: "#FAFAFA" }}>
                                                    {grupo.itens.map(h => {
                                                        const aberto = expandidoId === h.id;
                                                        const sc = STATUS_CONFIG[h.status] || {};
                                                        return (
                                                        <div key={h.id} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden" }}>
                                                            <div onClick={() => setExpandidoId(aberto ? null : h.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", background: aberto ? "#F9FAFB" : "#fff" }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{h.cliente}</div>
                                                                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                                                                        {fmtData(h.timestamp)} · {h.salvoPor}
                                                                        {h.pedidos?.length > 0 && <span style={{ marginLeft: 6 }}>· #{h.pedidos.join(", #")}</span>}
                                                                    </div>
                                                                </div>
                                                                {h.volumes && <span style={{ fontSize: 12, fontWeight: 700, color: "#F97316", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: "2px 8px" }}>{h.volumes} cx</span>}
                                                                <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>{sc.label}</span>
                                                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                                                            </div>
                                                            {aberto && (
                                                                <>
                                                                    <ResumoCard
                                                                        resumo={h}
                                                                        copiado={copiandoId === h.id}
                                                                        salvo={true}
                                                                        onCopiar={() => copiarHistorico(h.id, h)}
                                                                    />
                                                                    {podeEditar && (
                                                                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 12px 10px" }}>
                                                                        <button onClick={() => { if (window.confirm("Excluir?")) onExcluir?.(h.id); }} style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Excluir</button>
                                                                    </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
