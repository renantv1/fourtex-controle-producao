import { useState, useEffect } from "react";
import { fmtInt, parseNum } from "../utils";
import { MEDIDAS_VIES, MEDIDA_VIES_COLOR, CORES_VIES } from "../utils/viesCatalog";
import { CorSelect } from "../utils/CorSelect";
import { CorInline } from "../utils/CorDot";

const COLOR = "#DB2777";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

const listaItens = (p) => Array.isArray(p?.itens) ? p.itens : Object.values(p?.itens || {});
const fmtQtd = (v) => Number(v || 0).toLocaleString("pt-BR");

const parseTS = (ts) => {
    if (!ts || typeof ts !== "string") return 0;
    const [d, mo, y] = (ts.split(", ")[0] || "").split("/");
    const t = ts.split(", ")[1] || "00:00:00";
    return new Date(`${y}-${mo}-${d}T${t}`).getTime() || 0;
};

const sel = { padding: "7px 10px", borderRadius: 7, border: "1px solid #ECEDF1", fontSize: 13, background: "#F9FAFB", width: "100%", boxSizing: "border-box" };
const lbl = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 };

// ─── Modal "Novo Pedido" — vai adicionando itens e finaliza no fim ──────────
function FormPedidoVies({ pedidoInicial, clientes = [], onSubmit, onCancelar }) {
    const [qtd,    setQtd]    = useState("");
    const [cor,    setCor]    = useState("");
    const [medida, setMedida] = useState("2,5 cm");
    const [cart, setCart] = useState(() => listaItens(pedidoInicial).map(it => ({ qtd: it.qtd, cor: it.cor, medida: it.medida })));
    const [cliente,    setCliente]    = useState(pedidoInicial?.cliente || "");
    const [observacao, setObservacao] = useState(pedidoInicial?.observacao || "");

    const podeAdicionar = parseNum(qtd) > 0 && cor && medida;
    const addToCart = () => {
        if (!podeAdicionar) return;
        setCart(prev => [...prev, { qtd: parseNum(qtd), cor, medida }]);
        setQtd("");
    };
    const totalPecas = cart.reduce((s, it) => s + (Number(it.qtd) || 0), 0);

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 20 }}>
                    {pedidoInicial ? `Editar Pedido de Viés #${pedidoInicial.numero}` : "Novo Pedido de Viés"}
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>CLIENTE (opcional)</label>
                    <input value={cliente} onChange={e => setCliente(e.target.value)} list="vies-clientes" placeholder="Nome do cliente" autoComplete="off" style={sel} />
                    <datalist id="vies-clientes">{clientes.map(c => <option key={c.key || c.nome} value={c.nome} />)}</datalist>
                </div>

                {/* Item: quantidade de peças + cor + medida */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={lbl}>PEÇAS</label>
                        <input type="text" inputMode="numeric" value={qtd} onChange={e => setQtd(fmtInt(e.target.value))}
                            onKeyDown={e => { if (e.key === "Enter") addToCart(); }} placeholder="0" style={sel} />
                    </div>
                    <div>
                        <label style={lbl}>COR</label>
                        <CorSelect value={cor} onChange={e => setCor(e.target.value)} options={CORES_VIES} placeholder="Selecione a cor" style={sel} />
                    </div>
                    <div>
                        <label style={lbl}>MEDIDA</label>
                        <select value={medida} onChange={e => setMedida(e.target.value)} style={sel}>
                            {MEDIDAS_VIES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <button onClick={addToCart} disabled={!podeAdicionar} style={{
                    width: "100%", padding: 9, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, marginBottom: 16,
                    background: podeAdicionar ? COLOR : "#ECEDF1", color: podeAdicionar ? "#fff" : "#9CA3AF", cursor: podeAdicionar ? "pointer" : "not-allowed",
                }}>
                    + Adicionar ao pedido
                </button>

                {cart.length > 0 && (
                    <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
                        <div style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", borderBottom: "1px solid #ECEDF1", display: "flex", justifyContent: "space-between" }}>
                            <span>{cart.length} ITEM{cart.length !== 1 ? "S" : ""} NO PEDIDO</span>
                            <span>{fmtQtd(totalPecas)} PEÇAS</span>
                        </div>
                        {cart.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: idx < cart.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: MEDIDA_VIES_COLOR[item.medida] || COLOR, background: (MEDIDA_VIES_COLOR[item.medida] || COLOR) + "18", borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>{item.medida}</span>
                                <div style={{ flex: 1, fontSize: 13, color: "#111827", display: "flex", alignItems: "center" }}>
                                    <CorInline cor={item.cor} />{item.cor}
                                </div>
                                <input type="text" inputMode="numeric" value={fmtQtd(item.qtd)}
                                    onChange={e => { const n = parseNum(fmtInt(e.target.value)); setCart(p => p.map((it, i) => i === idx ? { ...it, qtd: n } : it)); }}
                                    style={{ width: 60, padding: "3px 6px", borderRadius: 6, border: "1px solid #ECEDF1", fontSize: 12, textAlign: "center", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: "#6B7280", flexShrink: 0 }}>peças</span>
                                <button onClick={() => setCart(p => p.filter((_, i) => i !== idx))} title="Remover item" style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>OBSERVAÇÃO (opcional)</label>
                    <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} placeholder="Ex: entregar até sexta..." style={{ ...sel, resize: "vertical", fontFamily: "inherit" }} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCancelar} style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                    <button
                        onClick={() => cart.length > 0 && onSubmit({ itens: cart.filter(it => it.qtd > 0), cliente: cliente.trim(), observacao: observacao.trim() })}
                        disabled={cart.length === 0}
                        style={{ flex: 2, padding: 12, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13,
                            background: cart.length > 0 ? COLOR : "#ECEDF1", color: cart.length > 0 ? "#fff" : "#9CA3AF", cursor: cart.length > 0 ? "pointer" : "not-allowed" }}>
                        {pedidoInicial ? "Salvar Pedido" : "Finalizar Pedido"} ({cart.length} item{cart.length !== 1 ? "s" : ""})
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Aba Pedidos Viés ────────────────────────────────────────────────────────
export default function ViesPedidosTab({ pedidos = [], clientes = [], userName, isAdmin, onAdd, onUpdate, onDelete, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [etapa, setEtapa] = useState("pendente");
    const [form, setForm] = useState(null); // null | { pedido? }
    const [abertos, setAbertos] = useState(new Set());
    const toggle = (id) => setAbertos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const lista = pedidos.filter(p => (p.status || "pendente") === etapa).sort((a, b) => parseTS(b.timestamp) - parseTS(a.timestamp));
    const qtdPendentes = pedidos.filter(p => (p.status || "pendente") === "pendente").length;

    const handleSubmit = (dados) => {
        if (form?.pedido) onUpdate(form.pedido.id, dados);
        else onAdd({ ...dados, status: "pendente", criadoPor: userName });
        setForm(null);
    };

    return (
        <div style={{ padding: isMobile ? "16px 12px" : 24, maxWidth: 820, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Pedidos de Viés</h2>
                    <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Peças por cor e medida.</p>
                </div>
                {podeEditar && (
                    <button onClick={() => setForm({})} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: COLOR, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        + Novo Pedido
                    </button>
                )}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["pendente", `Pendentes${qtdPendentes ? ` (${qtdPendentes})` : ""}`], ["concluido", "Concluídos"]].map(([k, label]) => (
                    <button key={k} onClick={() => setEtapa(k)} style={{
                        padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        border: `1.5px solid ${etapa === k ? COLOR : "#ECEDF1"}`, background: etapa === k ? "#FDF2F8" : "#fff", color: etapa === k ? COLOR : "#6B7280",
                    }}>{label}</button>
                ))}
            </div>

            {lista.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12 }}>
                    {etapa === "pendente" ? "Nenhum pedido pendente." : "Nenhum pedido concluído."}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {lista.map(p => {
                        const itens = listaItens(p);
                        const total = itens.reduce((s, it) => s + (Number(it.qtd) || 0), 0);
                        const aberto = abertos.has(p.id);
                        return (
                            <div key={p.id} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                                <div onClick={() => toggle(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: COLOR, background: "#FDF2F8", borderRadius: 6, padding: "2px 8px" }}>#{p.numero}</span>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: "#111827", flex: 1, minWidth: 120 }}>{p.cliente || "Sem cliente"}</span>
                                    <span style={{ fontSize: 12, color: "#6B7280" }}>{itens.length} item{itens.length !== 1 ? "s" : ""} · <strong style={{ color: "#111827" }}>{fmtQtd(total)} peças</strong></span>
                                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{(p.timestamp || "").split(",")[0]}</span>
                                </div>
                                {aberto && (
                                    <div style={{ borderTop: "1px solid #F3F4F6" }}>
                                        {itens.map((it, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid #F9FAFB", borderLeft: `3px solid ${(MEDIDA_VIES_COLOR[it.medida] || "#9CA3AF")}50` }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: MEDIDA_VIES_COLOR[it.medida] || "#6B7280", flexShrink: 0, width: 48 }}>{it.medida}</span>
                                                <span style={{ flex: 1, fontSize: 13, color: "#111827", display: "flex", alignItems: "center" }}><CorInline cor={it.cor} />{it.cor}</span>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{fmtQtd(it.qtd)} peças</span>
                                            </div>
                                        ))}
                                        <div style={{ padding: "10px 16px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 11, color: "#9CA3AF", flex: 1 }}>
                                                {p.criadoPor ? `Por ${p.criadoPor}` : ""}{p.observacao ? ` · ${p.observacao}` : ""}
                                                {p.concluidoEm ? ` · Concluído ${p.concluidoEm}${p.concluidoPor ? ` por ${p.concluidoPor}` : ""}` : ""}
                                            </span>
                                            {podeEditar && etapa === "pendente" && (
                                                <>
                                                    <button onClick={() => setForm({ pedido: p })} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏ Editar</button>
                                                    <button onClick={() => onUpdate(p.id, { status: "concluido", concluidoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), concluidoPor: userName })} style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: "#16A34A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Concluir</button>
                                                </>
                                            )}
                                            {podeEditar && etapa === "concluido" && (
                                                <button onClick={() => onUpdate(p.id, { status: "pendente", concluidoEm: null, concluidoPor: null })} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", color: "#6B7280", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reabrir</button>
                                            )}
                                            {isAdmin && (
                                                <button onClick={() => { if (window.confirm(`Excluir o pedido #${p.numero}?`)) onDelete(p.id); }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #FECACA", background: "transparent", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Excluir</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {podeEditar && form && (
                <FormPedidoVies pedidoInicial={form.pedido} clientes={clientes} onSubmit={handleSubmit} onCancelar={() => setForm(null)} />
            )}
        </div>
    );
}
