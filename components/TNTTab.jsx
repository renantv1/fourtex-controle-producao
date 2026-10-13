import { useState, useMemo, useEffect, useRef } from "react";
import { TNT_CATALOG } from "../utils/tntCatalog";

// ─── Configuração de etapas ───────────────────────────────────────────────────
const ETAPAS = {
    entrada:     { label: "Entrada",     statuses: ["pendente"],                  color: "#0891B2", bg: "#ECFEFF" },
    separacao:   { label: "Separação",   statuses: ["pendente"],                  color: "#D97706", bg: "#FFFBEB" },
    faturamento: { label: "Faturamento", statuses: ["aguardando_faturamento"],    color: "#7C3AED", bg: "#F5F3FF" },
    historico:   { label: "Histórico",   statuses: ["faturado", "concluido"],     color: "#6B7280", bg: "#F9FAFB" },
};

function etapaDefaultParaRole(role) {
    return "entrada";
}

function etapasPermitidas(role, permissoes) {
    const temAcesso = role === "admin" || (permissoes || []).includes("tntseparacaofaturamento");
    return temAcesso ? ["entrada", "separacao", "faturamento", "historico"] : ["entrada", "historico"];
}

function statusInfo(status) {
    switch (status) {
        case "pendente":               return { label: "Aguard. Separação",   color: "#0891B2", bg: "#ECFEFF" };
        case "aguardando_faturamento": return { label: "Aguard. Faturamento", color: "#D97706", bg: "#FFFBEB" };
        case "faturado":               return { label: "Faturado",            color: "#16A34A", bg: "#F0FDF4" };
        case "concluido":              return { label: "Concluído",           color: "#16A34A", bg: "#F0FDF4" };
        default:                       return { label: status,                color: "#6B7280", bg: "#F3F4F6" };
    }
}

// ─── Modal "Novo Pedido" ─────────────────────────────────────────────────────
function FormTNT({ onSubmit, onCancelar, userName, movimentos = [], clientes = [], vendedores = [], onCadastrarCliente, pedidoInicial }) {
    const [largura,    setLargura]    = useState("1.40");
    const [gramatura,  setGramatura]  = useState("");
    const [cor,        setCor]        = useState("");
    const [metragem,   setMetragem]   = useState("");
    const [quantidade, setQuantidade] = useState("1");
    const [cart,          setCart]          = useState(() => {
        if (!pedidoInicial?.itens) return [];
        const its = Array.isArray(pedidoInicial.itens) ? pedidoInicial.itens : Object.values(pedidoInicial.itens || {});
        return its.map(it => ({ codigo: it.codigo, descricao: it.descricao, largura: it.largura, gramatura: it.gramatura, cor: it.cor, metragem: it.metragem, quantidade: it.quantidade, pesos: it.pesos || null }));
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

    const gramaturas = useMemo(() =>
        [...new Set(TNT_CATALOG.filter(p => p.largura === largura).map(p => p.gramatura))].sort((a, b) => a - b),
        [largura]
    );

    const metragens = useMemo(() => {
        if (!gramatura || !cor) return [];
        return TNT_CATALOG
            .filter(p => p.largura === largura && p.gramatura === Number(gramatura) && p.cor === cor)
            .map(p => p.metragem).sort((a, b) => b - a);
    }, [largura, gramatura, cor]);

    const metSelecionada = metragens.length === 1 ? String(metragens[0]) : metragem;

    const produto = useMemo(() => {
        if (!gramatura || !cor || !metSelecionada) return null;
        return TNT_CATALOG.find(p =>
            p.largura === largura && p.gramatura === Number(gramatura) &&
            p.cor === cor && p.metragem === Number(metSelecionada)
        );
    }, [largura, gramatura, cor, metSelecionada]);

    const CODIGO_ALIAS = { "4112": "4065", "4039": "4096", "4108": "4376", "4111": "4424", "4109": "4377" };

    const saldoPorCodigo = useMemo(() => {
        const map = {};
        movimentos.forEach(m => {
            const cod = CODIGO_ALIAS[m.codigo] || m.codigo;
            map[cod] = (map[cod] || 0) + (m.tipo === "entrada" ? Number(m.qtd) : -Number(m.qtd));
        });
        return map;
    }, [movimentos]);

    const saldoProduto = produto ? (saldoPorCodigo[produto.codigo] || 0) : null;

    const handleLargura   = (v) => { setLargura(v); setGramatura(""); setCor(""); setMetragem(""); };
    const handleGramatura = (v) => { setGramatura(v); setCor(""); setMetragem(""); };
    const handleCor       = (v) => { setCor(v); setMetragem(""); };

    const addToCart = () => {
        if (!produto || Number(quantidade) <= 0) return;
        setCart(prev => [...prev, {
            codigo:    produto.codigo,
            descricao: `TNT ${produto.gramatura}GR ${produto.cor} ${produto.largura}m — ${produto.metragem}m/bob.`,
            largura:   produto.largura,
            gramatura: produto.gramatura,
            cor:       produto.cor,
            metragem:  produto.metragem,
            quantidade: Number(quantidade),
        }]);
        setGramatura(""); setCor(""); setMetragem(""); setQuantidade("1");
    };

    const alterarQuantidadeItem = (idx, novaQtdStr) => {
        const novaQtd = Math.max(1, parseInt(novaQtdStr) || 1);
        setCart(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const pesos = fbPesos(item.pesos, item.quantidade || 0).slice(0, novaQtd);
            while (pesos.length < novaQtd) pesos.push(null);
            return { ...item, quantidade: novaQtd, pesos: pesos.some(p => p != null) ? pesos : null };
        }));
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
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 20 }}>{pedidoInicial ? "Editar Pedido TNT" : "Novo Pedido TNT"}</div>

                {/* Cliente */}
                <div style={{ marginBottom: 16, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <label style={{ ...lbl, marginBottom: 0 }}>CLIENTE</label>
                        <button type="button" onClick={() => { setShowCadastro(true); setShowSugestoes(false); }} style={{ padding: "3px 9px", borderRadius: 6, border: "1.5px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>+ Novo</button>
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

                    {cliente.trim() && !nomeExato && !showCadastro && (
                        <button type="button" onClick={() => setShowCadastro(true)} style={{ marginTop: 6, width: "100%", padding: "7px 12px", borderRadius: 7, border: "1.5px dashed #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                            + Cadastrar "{cliente.trim()}"
                        </button>
                    )}

                    {showCadastro && (
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
                        <label style={lbl}>LARGURA</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            {["1.40", "2.10"].map(l => (
                                <button key={l} onClick={() => handleLargura(l)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, cursor: "pointer", fontSize: 13, border: `1.5px solid ${largura === l ? "#0891B2" : "#ECEDF1"}`, background: largura === l ? "#ECFEFF" : "#F9FAFB", color: largura === l ? "#0369A1" : "#374151", fontWeight: largura === l ? 700 : 500 }}>{l}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label style={lbl}>GRAMATURA</label>
                        <select value={gramatura} onChange={e => handleGramatura(e.target.value)} style={sel}>
                            <option value="">— selecione —</option>
                            {gramaturas.map(g => <option key={g} value={g}>{g} GR</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={lbl}>COR</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            {[{ id: "preto", bg: "#111827", border: "#111827", text: "#fff" }, { id: "branco", bg: "#fff", border: "#374151", text: "#111827" }].map(({ id, bg, border, text }) => {
                                const ativo = cor === id;
                                return <button key={id} onClick={() => handleCor(id)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 13, textTransform: "capitalize", cursor: "pointer", fontWeight: ativo ? 700 : 400, background: ativo ? bg : "#F9FAFB", border: `2px solid ${ativo ? border : "#ECEDF1"}`, color: ativo ? text : "#6B7280" }}>{id}</button>;
                            })}
                        </div>
                    </div>
                    {metragens.length > 1 && (
                        <div>
                            <label style={lbl}>METRAGEM</label>
                            <select value={metragem} onChange={e => setMetragem(e.target.value)} style={sel}>
                                <option value="">— selecione —</option>
                                {metragens.map(m => {
                                    const p = TNT_CATALOG.find(x => x.largura === largura && x.gramatura === Number(gramatura) && x.cor === cor && x.metragem === m);
                                    const saldo = p ? (saldoPorCodigo[p.codigo] || 0) : 0;
                                    return <option key={m} value={m}>{m}m — {saldo > 0 ? `${saldo} bob.` : "sem estoque"}</option>;
                                })}
                            </select>
                        </div>
                    )}
                    <div>
                        <label style={lbl}>BOBINAS</label>
                        <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} style={sel} />
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 8, marginBottom: 10, background: produto ? "#F0F9FF" : "#F9FAFB", border: `1px solid ${produto ? "#BAE6FD" : "#ECEDF1"}` }}>
                    {produto ? (
                        <>
                            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: "#0369A1", minWidth: 52 }}>{produto.codigo}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0C4A6E" }}>TNT {produto.gramatura}GR {produto.cor} — {produto.largura}m — {produto.metragem}m/bob.</div>
                                <div style={{ fontSize: 11, marginTop: 2, fontWeight: 700, color: saldoProduto > 0 ? "#16A34A" : "#DC2626" }}>Estoque: {saldoProduto > 0 ? `${saldoProduto} bobina${saldoProduto !== 1 ? "s" : ""}` : "sem estoque"}</div>
                            </div>
                            <div style={{ fontSize: 12, color: "#0891B2" }}>{quantidade} bob.</div>
                        </>
                    ) : (
                        <div style={{ fontSize: 13, color: "#9CA3AF" }}>Complete os campos para identificar o código.</div>
                    )}
                </div>

                <button onClick={addToCart} disabled={!produto || Number(quantidade) <= 0} style={{ width: "100%", padding: 9, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, marginBottom: 16, background: produto ? "#0891B2" : "#ECEDF1", color: produto ? "#fff" : "#9CA3AF", cursor: produto ? "pointer" : "not-allowed" }}>
                    + Adicionar ao pedido
                </button>

                {cart.length > 0 && (
                    <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
                        <div style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", borderBottom: "1px solid #ECEDF1" }}>{cart.length} ITEM{cart.length !== 1 ? "S" : ""} NO PEDIDO</div>
                        {cart.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: idx < cart.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 900, color: "#0369A1", background: "#EFF6FF", borderRadius: 5, padding: "1px 7px", flexShrink: 0 }}>{item.codigo}</div>
                                <div style={{ flex: 1, fontSize: 13, color: "#111827" }}>{item.descricao}</div>
                                <input
                                    type="number" min="1" value={item.quantidade}
                                    onChange={e => alterarQuantidadeItem(idx, e.target.value)}
                                    style={{ width: 52, padding: "3px 6px", borderRadius: 6, border: "1px solid #ECEDF1", fontSize: 12, textAlign: "center", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 12, color: "#6B7280", flexShrink: 0 }}>bob.</span>
                                <button onClick={() => setCart(p => p.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Observação */}
                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>OBSERVAÇÃO (opcional)</label>
                    <textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: enviar junto com pedido de fitas, entregar até sexta..." rows={2} style={{ ...sel, resize: "vertical", fontFamily: "inherit" }} />
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fbPesos(raw, len) {
    if (!raw) return Array(len).fill(null);
    if (Array.isArray(raw)) return raw.slice();
    return Array.from({ length: len }, (_, i) => (raw[i] !== undefined ? raw[i] : null));
}

// ─── Card de pedido ──────────────────────────────────────────────────────────
function PedidoCard({ pedido, expanded, onToggle, onUpdate, onDelete, onSolicitarEtiquetas, onSepararPedido, onFaturarPedido, onEditarPedido, etapa, userRole, podeEditar = true }) {
    const canDelete = userRole === "admin";
    const itens = Array.isArray(pedido.itens) ? pedido.itens : Object.values(pedido.itens || {});
    const totalBob = itens.reduce((s, i) => s + (i.quantidade || 0), 0);

    const toStrings = (its) =>
        its.map(item => {
            const pesos = fbPesos(item.pesos, item.quantidade || 0);
            return Array.from({ length: item.quantidade || 0 }, (_, j) =>
                pesos[j] != null ? String(pesos[j]) : ""
            );
        });

    const [pesosItens, setPesosItens] = useState(() => toStrings(itens));
    const [confirmEtiquetasFat, setConfirmEtiquetasFat] = useState(false);
    const [confirmEtiquetasHist, setConfirmEtiquetasHist] = useState(false);
    const editando = useRef(new Set());

    useEffect(() => {
        setPesosItens(prev =>
            itens.map((item, idx) => {
                const pesos = fbPesos(item.pesos, item.quantidade || 0);
                return Array.from({ length: item.quantidade || 0 }, (_, j) => {
                    if (editando.current.has(`${idx}-${j}`)) return (prev[idx] || [])[j] ?? "";
                    return pesos[j] != null ? String(pesos[j]) : "";
                });
            })
        );
    }, [pedido.itens]); // eslint-disable-line

    const totalPeso = pesosItens.flat().reduce((s, v) => {
        const n = parseFloat((v || "").replace(",", "."));
        return s + (isNaN(n) ? 0 : n);
    }, 0);

    // Peso somado por item (bobinas daquele código)
    const pesoItem = idx => (pesosItens[idx] || []).reduce((s, v) => {
        const n = parseFloat((v || "").replace(",", "."));
        return s + (isNaN(n) ? 0 : n);
    }, 0);
    const fmtKg = n => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const pesoObrigatorio = !!pedido.pesoObrigatorio;
    const totalBobinas    = pesosItens.flat().length;
    const bobinasComPeso  = pesosItens.flat().filter(v => v !== "").length;
    const pesosCompletos  = bobinasComPeso === totalBobinas;

    const salvarPeso = (itemIdx, pIdx, val) => {
        const v = parseFloat((val || "").replace(",", "."));
        const itensAtualizados = itens.map((item, i) => {
            if (i !== itemIdx) return item;
            const pesos = fbPesos(item.pesos, item.quantidade || 0);
            pesos[pIdx] = isNaN(v) ? null : v;
            return { ...item, pesos };
        });
        onUpdate(pedido.id, { itens: itensAtualizados });
    };

    const handlePesoChange = (itemIdx, pIdx, val) => {
        editando.current.add(`${itemIdx}-${pIdx}`);
        setPesosItens(prev => {
            const next = prev.map(arr => [...arr]);
            next[itemIdx][pIdx] = val;
            return next;
        });
        if (val === "") salvarPeso(itemIdx, pIdx, "");
    };

    const handlePesoBlur = (itemIdx, pIdx, val) => {
        editando.current.delete(`${itemIdx}-${pIdx}`);
        salvarPeso(itemIdx, pIdx, val);
    };

    const enviarEtiquetasParaFila = () => {
        if (!onSolicitarEtiquetas) return;
        const todayISO    = new Date().toISOString().split("T")[0];
        const todayLocale = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const lote = [];
        itens.forEach(item => {
            const pesos = fbPesos(item.pesos, item.quantidade || 0);
            for (let p = 0; p < (item.quantidade || 0); p++) {
                const pesoVal = pesos[p] != null ? Number(pesos[p]) : 0;
                lote.push({ largura: item.largura, cor: item.cor, gramatura: item.gramatura, metragem: item.metragem, codigo: item.codigo, peso: pesoVal, data: todayISO, copies: 1, status: "pendente", solicitadoPor: pedido.criadoPor || "—", timestamp: todayLocale });
            }
        });
        if (lote.length > 0) onSolicitarEtiquetas(lote);
    };

    const si = statusInfo(pedido.status);

    return (
        <div style={{ borderBottom: "1px solid #F3F4F6", borderLeft: `3px solid ${si.color}` }}>
            {/* Linha compacta — clicável */}
            <div onClick={onToggle} style={{ padding: "10px 14px", cursor: "pointer" }}>
                {/* Linha 1: número + status + seta */}
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
                {/* Linha 2: resumo + pesos */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {itens.length} item{itens.length !== 1 ? "s" : ""} · {totalBob} bobina{totalBob !== 1 ? "s" : ""}
                    </span>
                    {totalPeso > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                            {totalPeso.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                        </span>
                    )}
                    {pesoObrigatorio && etapa !== "historico" && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: pesosCompletos ? "#F0FDF4" : "#FEF9C3", color: pesosCompletos ? "#16A34A" : "#92400E", border: `1px solid ${pesosCompletos ? "#BBF7D0" : "#FDE68A"}` }}>
                            {pesosCompletos ? "✓ pesos ok" : `⚖ ${bobinasComPeso}/${totalBobinas}`}
                        </span>
                    )}
                    {pedido.observacao && <span title={pedido.observacao} style={{ fontSize: 13 }}>📝</span>}
                    <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>{pedido.timestamp}</span>
                </div>
            </div>

            {/* Detalhe expandido */}
            {expanded && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid #F9FAFB" }}>

                    {/* Itens */}
                    <div style={{ background: "#F9FAFB", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                        {itens.map((item, idx) => (
                            <div key={idx} style={{ padding: "10px 12px", borderBottom: idx < itens.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: (pesoObrigatorio && etapa !== "historico") ? 8 : 0 }}>
                                    <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 900, color: "#0369A1", background: "#EFF6FF", borderRadius: 5, padding: "1px 7px", flexShrink: 0 }}>{item.codigo}</div>
                                    <div style={{ flex: 1, fontSize: 12, color: "#374151" }}>{item.descricao}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", flexShrink: 0 }}>{item.quantidade} bob.</div>
                                    {podeEditar && pesoObrigatorio && etapa !== "historico" && pesoItem(idx) > 0 && (
                                        <div style={{ fontSize: 12, fontWeight: 800, color: "#16A34A", background: "#F0FDF4", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>
                                            {fmtKg(pesoItem(idx))} kg
                                        </div>
                                    )}
                                </div>
                                {/* Peso por bobina editável — entrada, separação e faturamento */}
                                {podeEditar && pesoObrigatorio && etapa !== "historico" && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {Array.from({ length: item.quantidade || 0 }, (_, pIdx) => {
                                            const val = (pesosItens[idx] || [])[pIdx] || "";
                                            const preenchido = val !== "";
                                            return (
                                                <div key={pIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                                    <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.04em" }}>BOB. {pIdx + 1}</span>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                        <input type="text" inputMode="decimal" placeholder="—" value={val} onChange={e => handlePesoChange(idx, pIdx, e.target.value)} onBlur={e => handlePesoBlur(idx, pIdx, e.target.value)} style={{ width: 58, padding: "4px 6px", borderRadius: 6, textAlign: "right", border: `1px solid ${preenchido ? "#BAE6FD" : "#ECEDF1"}`, background: preenchido ? "#F0F9FF" : "#fff", fontSize: 12, outline: "none" }} />
                                                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>kg</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Pesos em modo leitura — histórico (ou sem peso obrigatório), ou sem permissão de edição */}
                                {(!podeEditar || etapa === "historico" || !pesoObrigatorio) && (() => {
                                    const pesos = fbPesos(item.pesos, item.quantidade || 0);
                                    if (!pesos.some(p => p != null)) return null;
                                    const pesoTotal = pesos.reduce((s, p) => s + (p != null ? Number(p) : 0), 0);
                                    return (
                                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                                            {pesos.map((p, pIdx) => (
                                                <span key={pIdx} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#EFF6FF", color: "#0369A1", fontWeight: 600 }}>
                                                    Bob. {pIdx + 1}: {p != null ? `${Number(p).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : "—"}
                                                </span>
                                            ))}
                                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#F0FDF4", color: "#16A34A", fontWeight: 700 }}>
                                                Total: {pesoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                        {itens.length > 1 && totalPeso > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: "1px solid #ECEDF1", background: "#F0FDF4" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Total geral · {totalBob} bob.</span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: "#16A34A" }}>{fmtKg(totalPeso)} kg</span>
                            </div>
                        )}
                    </div>

                    {/* Observação */}
                    {pedido.observacao && (
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 12px", marginBottom: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8 }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>📝</span>
                            <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>{pedido.observacao}</div>
                        </div>
                    )}

                    {/* ── Ações por etapa ── */}

                    {/* ENTRADA */}
                    {etapa === "entrada" && (
                        <>
                            {podeEditar && (
                                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", userSelect: "none" }}>
                                    <input type="checkbox" checked={pesoObrigatorio} onChange={e => onUpdate(pedido.id, { pesoObrigatorio: e.target.checked })} style={{ width: 15, height: 15, accentColor: "#0891B2", cursor: "pointer" }} />
                                    <span style={{ fontSize: 12, fontWeight: pesoObrigatorio ? 700 : 400, color: pesoObrigatorio ? "#0369A1" : "#6B7280" }}>Exigir peso de cada bobina</span>
                                </label>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }}>{pedido.criadoPor}</div>
                                {podeEditar && <button onClick={enviarEtiquetasParaFila} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Etiquetas</button>}
                                {podeEditar && onEditarPedido && <button onClick={() => onEditarPedido(pedido)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Editar</button>}
                                {podeEditar && canDelete && <button onClick={() => { if (window.confirm("Remover este pedido TNT?")) onDelete(pedido.id); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>}
                            </div>
                        </>
                    )}

                    {/* SEPARAÇÃO */}
                    {etapa === "separacao" && (
                        <>
                            {podeEditar && (
                                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", userSelect: "none" }}>
                                    <input type="checkbox" checked={pesoObrigatorio} onChange={e => onUpdate(pedido.id, { pesoObrigatorio: e.target.checked })} style={{ width: 15, height: 15, accentColor: "#D97706", cursor: "pointer" }} />
                                    <span style={{ fontSize: 12, fontWeight: pesoObrigatorio ? 700 : 400, color: pesoObrigatorio ? "#B45309" : "#6B7280" }}>Exigir peso de cada bobina</span>
                                </label>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }}>Criado por {pedido.criadoPor}</div>
                                {pesoObrigatorio && !pesosCompletos && (
                                    <span style={{ fontSize: 11, color: "#92400E", background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 6, padding: "4px 8px", flexShrink: 0 }}>
                                        Preencha todos os pesos
                                    </span>
                                )}
                                {podeEditar && <button onClick={enviarEtiquetasParaFila} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Etiquetas</button>}
                                {podeEditar && (
                                    <button
                                        onClick={() => onSepararPedido?.(pedido.id)}
                                        disabled={pesoObrigatorio && !pesosCompletos}
                                        style={{ padding: "5px 14px", borderRadius: 7, border: "none", fontWeight: 700, fontSize: 12, flexShrink: 0, cursor: (pesoObrigatorio && !pesosCompletos) ? "not-allowed" : "pointer", background: (pesoObrigatorio && !pesosCompletos) ? "#ECEDF1" : "#FFFBEB", color: (pesoObrigatorio && !pesosCompletos) ? "#9CA3AF" : "#D97706", border: "1px solid #FDE68A" }}
                                    >
                                        Confirmar ✓
                                    </button>
                                )}
                                {podeEditar && canDelete && <button onClick={() => { if (window.confirm("Remover este pedido TNT?")) onDelete(pedido.id); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>}
                            </div>
                        </>
                    )}

                    {/* FATURAMENTO */}
                    {etapa === "faturamento" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ fontSize: 12, color: "#6B7280", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 12px", lineHeight: 1.7 }}>
                                <div>Criado por <b style={{ color: "#111827" }}>{pedido.criadoPor || "—"}</b> em {pedido.timestamp}</div>
                                {pedido.separadoPor && <div>Separado por <b style={{ color: "#111827" }}>{pedido.separadoPor}</b>{pedido.timestampSeparacao ? ` em ${pedido.timestampSeparacao}` : ""}</div>}
                            </div>
                            {podeEditar && (
                                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    {confirmEtiquetasFat ? (
                                        <>
                                            <span style={{ fontSize: 12, color: "#92400E" }}>Imprimir etiquetas?</span>
                                            <button onClick={() => { enviarEtiquetasParaFila(); setConfirmEtiquetasFat(false); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BAE6FD", background: "#0891B2", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                                Sim, imprimir
                                            </button>
                                            <button onClick={() => setConfirmEtiquetasFat(false)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                                Cancelar
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => setConfirmEtiquetasFat(true)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                            Etiquetas
                                        </button>
                                    )}
                                    <button onClick={() => onFaturarPedido?.(pedido.id)} style={{ padding: "7px 20px", borderRadius: 7, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: "#7C3AED", color: "#fff" }}>
                                        Faturar ✓
                                    </button>
                                    {canDelete && <button onClick={() => { if (window.confirm("Remover este pedido TNT?")) onDelete(pedido.id); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* HISTÓRICO */}
                    {etapa === "historico" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontSize: 12, color: "#6B7280", background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, padding: "10px 12px", lineHeight: 1.9 }}>
                                <div>Criado por <b style={{ color: "#111827" }}>{pedido.criadoPor || "—"}</b> em {pedido.timestamp}</div>
                                {pedido.separadoPor && <div>Separado por <b style={{ color: "#111827" }}>{pedido.separadoPor}</b>{pedido.timestampSeparacao ? ` em ${pedido.timestampSeparacao}` : ""}</div>}
                                {pedido.faturadoPor  && <div>Faturado por <b style={{ color: "#111827" }}>{pedido.faturadoPor}</b>{pedido.timestampFaturamento ? ` em ${pedido.timestampFaturamento}` : ""}</div>}
                            </div>
                            {podeEditar && (
                                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    {confirmEtiquetasHist ? (
                                        <>
                                            <span style={{ fontSize: 12, color: "#92400E" }}>Imprimir etiquetas?</span>
                                            <button onClick={() => { enviarEtiquetasParaFila(); setConfirmEtiquetasHist(false); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BAE6FD", background: "#0891B2", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                                Sim, imprimir
                                            </button>
                                            <button onClick={() => setConfirmEtiquetasHist(false)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                                Cancelar
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => setConfirmEtiquetasHist(true)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                            Etiquetas
                                        </button>
                                    )}
                                    {canDelete && <button onClick={() => { if (window.confirm("Remover este pedido do histórico?")) onDelete(pedido.id); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 12, cursor: "pointer" }}>Apagar</button>}
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
export default function TNTTab({ pedidos = [], movimentos = [], clientes = [], vendedores = [], userName, userRole, userPermissoes, onAdd, onUpdate, onDelete, onCadastrarCliente, onSolicitarLoteEtiquetas, onSepararPedido, onFaturarPedido, podeEditar = true }) {
    const etapasDisponiveis = etapasPermitidas(userRole, userPermissoes);
    const [etapa,       setEtapa]       = useState(() => etapaDefaultParaRole(userRole));
    const [showForm,    setShowForm]    = useState(false);
    const [editPedido,  setEditPedido]  = useState(null);
    const [expandedOrders, setExpandedOrders] = useState(new Set());

    const toggleExpand = (id) => setExpandedOrders(s => {
        const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const statusesToShow = ETAPAS[etapa]?.statuses || ["pendente"];

    const filteredPedidos = pedidos
        .filter(p => statusesToShow.includes(p.status))
        .sort((a, b) => (b.numero || 0) - (a.numero || 0));

    const counts = {
        entrada:     pedidos.filter(p => p.status === "pendente").length,
        separacao:   pedidos.filter(p => p.status === "pendente").length,
        faturamento: pedidos.filter(p => p.status === "aguardando_faturamento").length,
        historico:   pedidos.filter(p => ["faturado", "concluido"].includes(p.status)).length,
    };

    const etapaAtual = ETAPAS[etapa];

    return (
        <div style={{ padding: "20px 16px 40px" }}>
            {showForm && (
                <FormTNT
                    onSubmit={(dados) => { onAdd(dados); setShowForm(false); }}
                    onCancelar={() => setShowForm(false)}
                    userName={userName}
                    movimentos={movimentos}
                    clientes={clientes}
                    vendedores={vendedores}
                    onCadastrarCliente={onCadastrarCliente}
                />
            )}
            {editPedido && (
                <FormTNT
                    pedidoInicial={editPedido}
                    onSubmit={(dados) => {
                        onUpdate(editPedido.id, { itens: dados.itens, cliente: dados.cliente, observacao: dados.observacao });
                        setEditPedido(null);
                    }}
                    onCancelar={() => setEditPedido(null)}
                    userName={userName}
                    movimentos={movimentos}
                    clientes={clientes}
                    vendedores={vendedores}
                    onCadastrarCliente={onCadastrarCliente}
                />
            )}

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
                        Pedidos TNT <span style={{ color: "#9CA3AF", fontWeight: 400 }}>{filteredPedidos.length}</span>
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

            {/* Seletor de etapas */}
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
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onSolicitarEtiquetas={onSolicitarLoteEtiquetas}
                            onSepararPedido={onSepararPedido}
                            onFaturarPedido={onFaturarPedido}
                            onEditarPedido={etapa === "entrada" ? setEditPedido : null}
                            userRole={userRole}
                            podeEditar={podeEditar}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
