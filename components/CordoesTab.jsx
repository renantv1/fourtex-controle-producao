import { useState, useMemo } from "react";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorSelect } from "../utils/CorSelect";
import { CorInline } from "../utils/CorDot";
import { TipoCordaoSelect } from "../utils/TipoCordaoSelect";
import { TIPOS_CORDAO, TIPO_CORDAO_COLOR } from "../utils/cordoesCatalog";
import { fmtInt, parseNum } from "../utils";

// ─── Configuração de etapas ───────────────────────────────────────────────────
const ETAPAS = {
    entrada:   { label: "Pedidos",   statuses: ["pendente"],  color: "#0891B2", bg: "#ECFEFF" },
    historico: { label: "Histórico", statuses: ["concluido"], color: "#6B7280", bg: "#F9FAFB" },
};

function etapaDefaultParaRole(role) {
    return "entrada";
}

function etapasParaRole(role) {
    return ["entrada", "historico"];
}

function statusInfo(status) {
    switch (status) {
        case "pendente":  return { label: "Pendente",  color: "#0891B2", bg: "#ECFEFF" };
        case "concluido":  return { label: "Concluído", color: "#16A34A", bg: "#F0FDF4" };
        default:           return { label: status,      color: "#6B7280", bg: "#F3F4F6" };
    }
}

// ─── Modal "Novo Pedido" ─────────────────────────────────────────────────────
function FormCordoes({ onSubmit, onCancelar, userName, clientes = [], vendedores = [], onCadastrarCliente, pedidoInicial, podeEditar = true }) {
    const [tipo,       setTipo]       = useState(TIPOS_CORDAO[0]);
    const [cor,        setCor]        = useState("");
    const [duasCores,  setDuasCores]  = useState(false);
    const [cor2,       setCor2]       = useState("");
    const [quantidade, setQuantidade] = useState("1");
    const [cart, setCart] = useState(() => {
        if (!pedidoInicial?.itens) return [];
        const its = Array.isArray(pedidoInicial.itens) ? pedidoInicial.itens : Object.values(pedidoInicial.itens || {});
        return its.map(it => ({ tipo: it.tipo, cor: it.cor, cor2: it.cor2 || "", quantidade: it.quantidade }));
    });
    const [cliente,       setCliente]       = useState(pedidoInicial?.cliente || "");
    const [observacao,    setObservacao]    = useState(pedidoInicial?.observacao || "");
    const [showSugestoes, setShowSugestoes] = useState(false);
    const [showCadastro,  setShowCadastro]  = useState(false);
    const [novoVendedor,  setNovoVendedor]  = useState("");
    const [salvando,      setSalvando]      = useState(false);

    const sugestoes = cliente.trim().length > 0
        ? clientes.filter(c => c.nome.toLowerCase().includes(cliente.toLowerCase()))
        : clientes;

    const nomeExato = clientes.some(c => c.nome.toLowerCase() === cliente.trim().toLowerCase());

    const handleCadastroRapido = async () => {
        if (!cliente.trim() || salvando) return;
        setSalvando(true);
        await onCadastrarCliente({ nome: cliente.trim(), vendedor: novoVendedor.trim() });
        setShowCadastro(false);
        setNovoVendedor("");
        setSalvando(false);
    };

    const addToCart = () => {
        if (!tipo || !cor || Number(quantidade) <= 0) return;
        if (duasCores && !cor2) return;
        setCart(prev => [...prev, { tipo, cor, cor2: duasCores ? cor2 : "", quantidade: Number(quantidade) }]);
        setQuantidade("1");
        setDuasCores(false);
        setCor2("");
    };

    const alterarQuantidadeItem = (idx, novaQtdStr) => {
        const novaQtd = Math.max(1, parseInt(novaQtdStr) || 1);
        setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantidade: novaQtd } : item));
    };

    const handleSubmit = () => {
        if (cart.length === 0) return;
        if (!cliente.trim()) return;
        onSubmit({ itens: cart, cliente: cliente.trim(), observacao: observacao.trim(), status: "pendente", criadoPor: userName });
    };

    const sel = { padding: "7px 10px", borderRadius: 7, border: "1px solid #ECEDF1", fontSize: 13, background: "#F9FAFB", width: "100%", boxSizing: "border-box" };
    const lbl = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 20 }}>{pedidoInicial ? "Editar Pedido de Cordões" : "Novo Pedido de Cordões"}</div>

                {/* Cliente */}
                <div style={{ marginBottom: 16, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <label style={{ ...lbl, marginBottom: 0 }}>CLIENTE</label>
                        {podeEditar && <button type="button" onClick={() => { setShowCadastro(true); setShowSugestoes(false); }} style={{ padding: "3px 9px", borderRadius: 6, border: "1.5px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>+ Novo</button>}
                    </div>
                    <input value={cliente} onChange={e => { setCliente(e.target.value); setShowSugestoes(true); setShowCadastro(false); }} onFocus={() => { setShowSugestoes(true); setShowCadastro(false); }} onBlur={() => setTimeout(() => setShowSugestoes(false), 150)} placeholder="Nome do cliente *" autoComplete="off" style={sel} />

                    {showSugestoes && sugestoes.length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 2, maxHeight: 180, overflowY: "auto" }}>
                            {sugestoes.map(c => (
                                <div key={c.key} onMouseDown={() => { setCliente(c.nome); setShowSugestoes(false); }} style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, color: "#111827", borderBottom: "1px solid #F3F4F6" }} onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                                    <span style={{ fontWeight: 600 }}>{c.nome}</span>
                                    {c.vendedor && <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>{c.vendedor}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {podeEditar && cliente.trim() && !nomeExato && !showCadastro && (
                        <button type="button" onClick={() => setShowCadastro(true)} style={{ marginTop: 6, width: "100%", padding: "7px 12px", borderRadius: 7, border: "1.5px dashed #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                            + Cadastrar "{cliente.trim()}"
                        </button>
                    )}

                    {podeEditar && showCadastro && (
                        <div style={{ marginTop: 8, padding: 14, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0369A1", marginBottom: 8 }}>Cadastrar novo cliente</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10, padding: "6px 10px", background: "#fff", borderRadius: 6, border: "1px solid #BAE6FD" }}>{cliente.trim()}</div>
                            <select autoFocus value={novoVendedor} onChange={e => setNovoVendedor(e.target.value)} style={{ ...sel, marginBottom: 10 }}>
                                <option value="">Sem vendedor</option>
                                {vendedores.map(v => <option key={v.key} value={v.nome}>{v.nome}</option>)}
                            </select>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="button" onClick={() => { setShowCadastro(false); setNovoVendedor(""); }} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", fontSize: 12, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                                <button type="button" onClick={handleCadastroRapido} disabled={salvando} style={{ flex: 2, padding: "7px", borderRadius: 7, border: "none", background: "#0891B2", color: "#fff", fontWeight: 700, fontSize: 12, cursor: salvando ? "not-allowed" : "pointer" }}>{salvando ? "Salvando..." : "✓ Cadastrar"}</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Seletores */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={lbl}>TIPO</label>
                        <TipoCordaoSelect value={tipo} onChange={e => setTipo(e.target.value)} style={sel} />
                    </div>
                    <div>
                        <label style={lbl}>COR</label>
                        <CorSelect value={cor} onChange={e => setCor(e.target.value)} options={COR_CATALOG_SORTED} placeholder="Selecione a cor" style={sel} />
                    </div>
                    <div>
                        <label style={lbl}>QUANTIDADE (RL)</label>
                        <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} style={sel} />
                    </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={duasCores} onChange={e => { setDuasCores(e.target.checked); if (!e.target.checked) setCor2(""); }} style={{ width: 16, height: 16, accentColor: "#0891B2", cursor: "pointer" }} />
                        <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>Rolo com 2 cores</span>
                    </label>
                    {duasCores && (
                        <div style={{ marginTop: 8 }}>
                            <label style={lbl}>2ª COR</label>
                            <CorSelect value={cor2} onChange={e => setCor2(e.target.value)} options={COR_CATALOG_SORTED} placeholder="Selecione a 2ª cor" style={sel} />
                        </div>
                    )}
                </div>

                <button onClick={addToCart} disabled={!tipo || !cor || Number(quantidade) <= 0 || (duasCores && !cor2)} style={{ width: "100%", padding: 9, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, marginBottom: 16, background: (tipo && cor && (!duasCores || cor2)) ? "#0891B2" : "#ECEDF1", color: (tipo && cor && (!duasCores || cor2)) ? "#fff" : "#9CA3AF", cursor: (tipo && cor && (!duasCores || cor2)) ? "pointer" : "not-allowed" }}>
                    + Adicionar ao pedido
                </button>

                {cart.length > 0 && (
                    <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
                        <div style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", borderBottom: "1px solid #ECEDF1" }}>{cart.length} ITEM{cart.length !== 1 ? "S" : ""} NO PEDIDO</div>
                        {cart.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: idx < cart.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: TIPO_CORDAO_COLOR[item.tipo], background: TIPO_CORDAO_COLOR[item.tipo] + "18", borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>{item.tipo}</span>
                                <div style={{ flex: 1, fontSize: 13, color: "#111827", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                    <CorInline cor={item.cor} />{item.cor}
                                    {item.cor2 && <><span style={{ color: "#9CA3AF", margin: "0 4px" }}>+</span><CorInline cor={item.cor2} />{item.cor2}</>}
                                </div>
                                <input
                                    type="number" min="1" value={item.quantidade}
                                    onChange={e => alterarQuantidadeItem(idx, e.target.value)}
                                    style={{ width: 52, padding: "3px 6px", borderRadius: 6, border: "1px solid #ECEDF1", fontSize: 12, textAlign: "center", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 12, color: "#6B7280", flexShrink: 0 }}>RL</span>
                                <button onClick={() => setCart(p => p.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Observação */}
                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>OBSERVAÇÃO (opcional)</label>
                    <textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: entregar até sexta..." rows={2} style={{ ...sel, resize: "vertical", fontFamily: "inherit" }} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCancelar} style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleSubmit} disabled={cart.length === 0 || !cliente.trim()} style={{ flex: 1, padding: 12, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, background: cart.length > 0 && cliente.trim() ? "#0891B2" : "#ECEDF1", color: cart.length > 0 && cliente.trim() ? "#fff" : "#9CA3AF", cursor: cart.length > 0 && cliente.trim() ? "pointer" : "not-allowed" }}>
                        Criar Pedido ({cart.length} item{cart.length !== 1 ? "s" : ""})
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Card de pedido ──────────────────────────────────────────────────────────
const itemKey = (it) => `${it.tipo}|${(it.cor || "").trim().toLowerCase()}|${(it.cor2 || "").trim().toLowerCase()}`;

function PedidoCard({ pedido, expanded, onToggle, onDelete, onConcluir, onEditarPedido, onAbrirEntrega, onEditarEntrega, onDeleteEntregaParcial, etapa, userRole, podeEditar = true }) {
    const canDelete = userRole === "admin";
    const isAdmin = userRole === "admin";
    const itens = Array.isArray(pedido.itens) ? pedido.itens : Object.values(pedido.itens || {});
    const totalRL = itens.reduce((s, i) => s + (i.quantidade || 0), 0);
    const si = statusInfo(pedido.status);

    const entregas = pedido.entregasParciais
        ? Object.entries(pedido.entregasParciais).map(([key, val]) => ({ ...val, key })).sort((a, b) => (a.data || "").localeCompare(b.data || ""))
        : [];

    const entregueMap = {};
    entregas.forEach(e => {
        (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
            entregueMap[itemKey(ei)] = (entregueMap[itemKey(ei)] || 0) + Number(ei.qtd || 0);
        });
    });
    const totalEntregue = itens.reduce((s, it) => s + Math.min(it.quantidade || 0, entregueMap[itemKey(it)] || 0), 0);
    const pctEntrega = totalRL > 0 ? Math.round((totalEntregue / totalRL) * 100) : 0;
    const temEntregaParcial = entregas.length > 0 && pedido.status !== "concluido";

    return (
        <div style={{ borderBottom: "1px solid #F3F4F6", borderLeft: `3px solid ${si.color}` }}>
            <div onClick={onToggle} style={{ padding: "10px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {pedido.numero && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F3F4F6", borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>
                            #{pedido.numero}
                        </span>
                    )}
                    {pedido.cliente && (
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pedido.cliente}
                        </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: si.bg, color: si.color, border: `1px solid ${si.color}30`, flexShrink: 0 }}>
                        {si.label}
                    </span>
                    <span style={{ fontSize: 11, color: expanded ? si.color : "#D1D5DB", transform: expanded ? "rotate(90deg)" : "none", flexShrink: 0 }}>▶</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {itens.length} item{itens.length !== 1 ? "s" : ""} · {totalRL} RL
                    </span>
                    {pedido.observacao && <span title={pedido.observacao} style={{ fontSize: 13 }}>📝</span>}
                    {temEntregaParcial && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, maxWidth: 120 }}>
                            <div style={{ flex: 1, height: 4, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(pctEntrega, 100)}%`, background: "#16A34A", borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A" }}>{pctEntrega}%</span>
                        </div>
                    )}
                    <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>{pedido.timestamp}</span>
                </div>
            </div>

            {expanded && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid #F9FAFB" }}>
                    <div style={{ background: "#F9FAFB", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                        {itens.map((item, idx) => {
                            const entregue = Math.min(item.quantidade || 0, entregueMap[itemKey(item)] || 0);
                            const falta = Math.max(0, (item.quantidade || 0) - entregue);
                            return (
                                <div key={idx} style={{ padding: "10px 12px", borderBottom: idx < itens.length - 1 ? "1px solid #F3F4F6" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: TIPO_CORDAO_COLOR[item.tipo] || "#6B7280", background: (TIPO_CORDAO_COLOR[item.tipo] || "#6B7280") + "18", borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>{item.tipo}</span>
                                    <div style={{ flex: 1, fontSize: 13, color: "#374151", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                        <CorInline cor={item.cor} />{item.cor}
                                        {item.cor2 && <><span style={{ color: "#9CA3AF", margin: "0 4px" }}>+</span><CorInline cor={item.cor2} />{item.cor2}</>}
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{item.quantidade} RL</div>
                                        {entregue > 0 && (
                                            <div style={{ fontSize: 10, fontWeight: 700, color: falta <= 0 ? "#16A34A" : "#F97316" }}>
                                                {falta <= 0 ? "✓ entregue" : `entregue ${entregue} · falta ${falta}`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {pedido.observacao && (
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 12px", marginBottom: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8 }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>📝</span>
                            <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>{pedido.observacao}</div>
                        </div>
                    )}

                    {entregas.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 8 }}>ENTREGAS REALIZADAS</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {entregas.map((e, i) => {
                                    const itensE = Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {});
                                    const totalE = itensE.reduce((a, it) => a + Number(it.qtd || 0), 0);
                                    return (
                                        <div key={i} style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: itensE.length ? 6 : 0 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{e.data}{e.hora ? ` ${e.hora}` : ""} · {totalE.toLocaleString("pt-BR")} RL</span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{e.registradoPor}</span>
                                                    {(podeEditar || isAdmin) && etapa === "entrada" && <button onClick={() => onEditarEntrega(pedido, e)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid #ECEDF1", background: "#fff", color: "#6B7280", cursor: "pointer" }}>Editar</button>}
                                                    {(podeEditar || isAdmin) && <button onClick={() => { if (window.confirm("Excluir esta entrega?")) onDeleteEntregaParcial(pedido.id, e.key); }} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" }}>Excluir</button>}
                                                </div>
                                            </div>
                                            {itensE.map((it, j) => (
                                                <div key={j} style={{ fontSize: 12, color: "#374151", display: "flex", gap: 8 }}>
                                                    <span style={{ color: "#9CA3AF" }}>—</span>
                                                    <span style={{ fontWeight: 600 }}>{it.cor}{it.cor2 ? ` + ${it.cor2}` : ""}</span>
                                                    <span style={{ color: "#6B7280" }}>{it.tipo} · {Number(it.qtd).toLocaleString("pt-BR")} RL</span>
                                                </div>
                                            ))}
                                            {e.obs && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{e.obs}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {etapa === "entrada" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }}>{pedido.criadoPor}</div>
                            {podeEditar && onEditarPedido && <button onClick={() => onEditarPedido(pedido)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Editar</button>}
                            {podeEditar && <button onClick={() => onAbrirEntrega(pedido)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Entrega parcial</button>}
                            {podeEditar && <button onClick={() => onConcluir?.(pedido.id)} style={{ padding: "7px 18px", borderRadius: 7, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: "#16A34A", color: "#fff", flexShrink: 0 }}>Concluir ✓</button>}
                            {podeEditar && canDelete && <button onClick={() => { if (window.confirm("Remover este pedido?")) onDelete(pedido.id); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>}
                        </div>
                    )}

                    {etapa === "historico" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontSize: 12, color: "#6B7280", background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, padding: "10px 12px", lineHeight: 1.9 }}>
                                <div>Criado por <b style={{ color: "#111827" }}>{pedido.criadoPor || "—"}</b> em {pedido.timestamp}</div>
                                {pedido.concluidoPor && <div>Concluído por <b style={{ color: "#111827" }}>{pedido.concluidoPor}</b>{pedido.timestampConclusao ? ` em ${pedido.timestampConclusao}` : ""}</div>}
                            </div>
                            {podeEditar && canDelete && (
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button onClick={() => { if (window.confirm("Remover este pedido do histórico?")) onDelete(pedido.id); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 12, cursor: "pointer" }}>Apagar</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function CordoesTab({ pedidos = [], clientes = [], vendedores = [], userName, userRole, onAdd, onUpdate, onDelete, onCadastrarCliente, onConcluirPedido, onEntregaParcial, onDeleteEntregaParcial, podeEditar = true }) {
    const etapasDisponiveis = etapasParaRole(userRole);
    const [etapa,       setEtapa]       = useState(() => etapaDefaultParaRole(userRole));
    const [showForm,    setShowForm]    = useState(false);
    const [editPedido,  setEditPedido]  = useState(null);
    const [expandedOrders, setExpandedOrders] = useState(new Set());
    const [modalEntrega, setModalEntrega] = useState(null);
    const [entregaQtds,  setEntregaQtds]  = useState({});
    const [entregaObs,   setEntregaObs]   = useState("");
    const [entregaDescontarEstoque, setEntregaDescontarEstoque] = useState(true);

    const toggleExpand = (id) => setExpandedOrders(s => {
        const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const abrirEntrega = (pedido, entregaExistente) => {
        const qtds = {};
        if (entregaExistente) {
            const itensE = Array.isArray(entregaExistente.itens) ? entregaExistente.itens : Object.values(entregaExistente.itens || {});
            itensE.forEach(ei => { qtds[itemKey(ei)] = String(ei.qtd); });
        }
        setEntregaQtds(qtds);
        setEntregaObs(entregaExistente?.obs || "");
        setEntregaDescontarEstoque(entregaExistente ? entregaExistente.descontouEstoque !== false : true);
        setModalEntrega({ pedidoId: pedido.id, editKey: entregaExistente?.key, itensPrevios: entregaExistente?.itens });
    };

    const statusesToShow = ETAPAS[etapa]?.statuses || ["pendente"];

    const filteredPedidos = pedidos
        .filter(p => statusesToShow.includes(p.status))
        .sort((a, b) => (b.numero || 0) - (a.numero || 0));

    const counts = {
        entrada:   pedidos.filter(p => p.status === "pendente").length,
        historico: pedidos.filter(p => p.status === "concluido").length,
    };

    const etapaAtual = ETAPAS[etapa];

    return (
        <div style={{ padding: "20px 16px 40px" }}>
            {podeEditar && showForm && (
                <FormCordoes
                    onSubmit={(dados) => { onAdd(dados); setShowForm(false); }}
                    onCancelar={() => setShowForm(false)}
                    userName={userName}
                    clientes={clientes}
                    vendedores={vendedores}
                    onCadastrarCliente={onCadastrarCliente}
                    podeEditar={podeEditar}
                />
            )}
            {podeEditar && editPedido && (
                <FormCordoes
                    pedidoInicial={editPedido}
                    onSubmit={(dados) => {
                        onUpdate(editPedido.id, { itens: dados.itens, cliente: dados.cliente, observacao: dados.observacao });
                        setEditPedido(null);
                    }}
                    onCancelar={() => setEditPedido(null)}
                    userName={userName}
                    clientes={clientes}
                    vendedores={vendedores}
                    onCadastrarCliente={onCadastrarCliente}
                    podeEditar={podeEditar}
                />
            )}

            {/* Modal entrega parcial */}
            {podeEditar && modalEntrega && (() => {
                const modalPedido = pedidos.find(p => p.id === modalEntrega.pedidoId) || {};
                const itensPedido = Array.isArray(modalPedido.itens) ? modalPedido.itens : Object.values(modalPedido.itens || {});
                const temQtd = Object.values(entregaQtds).some(v => Number(v) > 0);
                const fechar = () => { setModalEntrega(null); setEntregaObs(""); setEntregaQtds({}); };
                const confirmar = () => {
                    const itensFiltrados = itensPedido
                        .filter(it => parseNum(entregaQtds[itemKey(it)]) > 0)
                        .map(it => ({ tipo: it.tipo, cor: it.cor, cor2: it.cor2 || "", qtd: parseNum(entregaQtds[itemKey(it)]) }));
                    onEntregaParcial(modalEntrega.pedidoId, { itens: itensFiltrados, obs: entregaObs, editKey: modalEntrega.editKey, itensPrevios: modalEntrega.itensPrevios, descontarEstoque: entregaDescontarEstoque });
                    fechar();
                };
                const entregueMapModal = {};
                const epsModal = modalPedido.entregasParciais ? Object.values(modalPedido.entregasParciais) : [];
                epsModal.forEach(e => {
                    (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                        entregueMapModal[itemKey(ei)] = (entregueMapModal[itemKey(ei)] || 0) + Number(ei.qtd || 0);
                    });
                });
                const sel = { padding: "7px 10px", borderRadius: 7, border: "1px solid #ECEDF1", fontSize: 13, background: "#F9FAFB", width: 90, textAlign: "center", boxSizing: "border-box" };
                return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                        <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>{modalEntrega.editKey ? "Editar Entrega Parcial" : "Entrega Parcial"}</div>
                            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 18 }}>{modalPedido.cliente || "—"} · {new Date().toLocaleDateString("pt-BR")}</div>

                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>QUANTO ENTREGAR AGORA</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                                {itensPedido.map((it, i) => {
                                    const key = itemKey(it);
                                    const produzido = entregueMapModal[key] || 0;
                                    const total = it.quantidade || 0;
                                    const restante = Math.max(0, total - produzido);
                                    const pct = total > 0 ? Math.min(100, Math.round((produzido / total) * 100)) : 0;
                                    return (
                                        <div key={i} style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                                        <CorInline cor={it.cor} />{it.cor}
                                                        {it.cor2 && <><span style={{ color: "#9CA3AF", margin: "0 4px" }}>+</span><CorInline cor={it.cor2} />{it.cor2}</>}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{it.tipo}</div>
                                                </div>
                                                <div style={{ textAlign: "right", fontSize: 11 }}>
                                                    <div style={{ color: "#16A34A", fontWeight: 700 }}>Entregue: {produzido.toLocaleString("pt-BR")} RL</div>
                                                    <div style={{ color: "#6B7280" }}>Total: {total.toLocaleString("pt-BR")} RL</div>
                                                </div>
                                            </div>
                                            <div style={{ height: 4, background: "#ECEDF1", borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${pct}%`, background: "#16A34A", borderRadius: 4 }} />
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ fontSize: 11, color: "#6B7280", flex: 1 }}>
                                                    Restam <strong style={{ color: "#111827" }}>{restante.toLocaleString("pt-BR")} RL</strong>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <input
                                                        type="text" inputMode="numeric"
                                                        value={entregaQtds[key] ?? ""}
                                                        onChange={e => setEntregaQtds(q => ({ ...q, [key]: fmtInt(e.target.value) }))}
                                                        placeholder="0"
                                                        style={sel}
                                                    />
                                                    <span style={{ fontSize: 12, color: "#6B7280", minWidth: 20 }}>RL</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                    <input type="checkbox" checked={entregaDescontarEstoque} onChange={e => setEntregaDescontarEstoque(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#16A34A", cursor: "pointer" }} />
                                    <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>Descontar do estoque</span>
                                </label>
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5 }}>OBSERVAÇÃO (opcional)</label>
                                <input value={entregaObs} onChange={e => setEntregaObs(e.target.value)} placeholder="Ex: 1ª remessa" style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #ECEDF1", fontSize: 13, background: "#F9FAFB", width: "100%", boxSizing: "border-box" }} />
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={fechar} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                                {podeEditar && (
                                    <button disabled={!temQtd} onClick={confirmar} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: temQtd ? "#111827" : "#ECEDF1", color: temQtd ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 13, cursor: temQtd ? "pointer" : "not-allowed" }}>
                                        Registrar entrega
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
                        Pedidos de Cordões <span style={{ color: "#9CA3AF", fontWeight: 400 }}>{filteredPedidos.length}</span>
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
                        {etapaAtual?.label}
                    </p>
                </div>
                {podeEditar && etapa === "entrada" && (
                    <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#0891B2", border: "none", borderRadius: 8, fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                        + Novo Pedido
                    </button>
                )}
            </div>

            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                {etapasDisponiveis.length > 1 && (
                    <div style={{ display: "flex", borderBottom: "1px solid #ECEDF1", overflowX: "auto" }}>
                        {etapasDisponiveis.map(e => {
                            const cfg = ETAPAS[e];
                            const ativo = etapa === e;
                            return (
                                <button key={e} onClick={() => { setEtapa(e); setExpandedOrders(new Set()); }} style={{ background: "none", border: "none", padding: "13px 16px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontWeight: ativo ? 700 : 400, color: ativo ? cfg.color : "#6B7280", borderBottom: ativo ? `2px solid ${cfg.color}` : "2px solid transparent" }}>
                                    {cfg.label}
                                    {counts[e] > 0 && (
                                        <span style={{ marginLeft: 6, borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 6px", background: ativo ? cfg.color : "#ECEDF1", color: ativo ? "#fff" : "#6B7280" }}>{counts[e]}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {filteredPedidos.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                        Nenhum pedido em {etapaAtual?.label?.toLowerCase()}.
                    </div>
                ) : (
                    filteredPedidos.map(p => (
                        <PedidoCard
                            key={p.id}
                            pedido={p}
                            etapa={etapa}
                            expanded={expandedOrders.has(p.id)}
                            onToggle={() => toggleExpand(p.id)}
                            onDelete={onDelete}
                            onConcluir={onConcluirPedido}
                            onEditarPedido={etapa === "entrada" ? setEditPedido : null}
                            onAbrirEntrega={abrirEntrega}
                            onEditarEntrega={abrirEntrega}
                            onDeleteEntregaParcial={onDeleteEntregaParcial}
                            userRole={userRole}
                            podeEditar={podeEditar}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
