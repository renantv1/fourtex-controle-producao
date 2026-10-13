import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

const TIPO_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };
const TIPO_BG    = { Gorgurão: "#FFF7ED", Poliéster: "#EEF2FF", Elástico: "#F0FDF4" };
function TipoBadge({ tipo }) {
    const c = TIPO_COLOR[tipo] || "#9CA3AF";
    const b = TIPO_BG[tipo]    || "#F3F4F6";
    return <span style={{ fontSize: 10, fontWeight: 700, color: c, background: b, border: `1px solid ${c}30`, borderRadius: 5, padding: "1px 6px", marginLeft: 6, flexShrink: 0 }}>{tipo}</span>;
}

const VENDEDOR_PALETTE = [
    { c: "#F97316", b: "#FFF7ED" },
    { c: "#6366F1", b: "#EEF2FF" },
    { c: "#10B981", b: "#F0FDF4" },
    { c: "#EC4899", b: "#FDF2F8" },
    { c: "#0EA5E9", b: "#F0F9FF" },
    { c: "#8B5CF6", b: "#F5F3FF" },
    { c: "#EAB308", b: "#FEFCE8" },
    { c: "#EF4444", b: "#FEF2F2" },
];
function corVendedor(nome) {
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
    return VENDEDOR_PALETTE[hash % VENDEDOR_PALETTE.length];
}
function VendedorBadge({ nome }) {
    if (!nome) return null;
    const { c, b } = corVendedor(nome);
    return <span style={{ fontSize: 9, fontWeight: 700, color: c, background: b, border: `1px solid ${c}30`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>{nome}</span>;
}

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}
import { workdaysBetween, formatDate, addWorkdays, today, fmtInt, fmtDec, parseNum, converterParaRL, converterDeRL, KG_POR_ROLO } from "../utils";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorInline } from "../utils/CorDot";
import { CorSelect } from "../utils/CorSelect";
import { pctColor } from "./shared/StatCard";

const RL_POR_FITA_POR_TURNO = 2.5;
const TURNOS_POR_DIA = 3;
const BUFFER = 1.2; // 20% de folga

function specKey(tipo, medida, cor) {
    return `${tipo}|${medida}|${(cor || "").trim().toLowerCase()}`;
}

function buildCapacidadePorSpec(machines) {
    const cap = {};
    (machines || []).forEach(m => {
        const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
        fitas.forEach(f => {
            const tipo = f.tipo || (m.tipo !== "Misto" ? m.tipo : null);
            if (!tipo) return;
            const k = specKey(tipo, f.medida, f.cor);
            cap[k] = (cap[k] || 0) + (f.qtd || 1) * RL_POR_FITA_POR_TURNO * TURNOS_POR_DIA;
        });
    });
    return cap;
}

function calcDataSugerida(itens, machines, orders, movimentos) {
    if (!itens.length || !machines?.length) return null;

    const capacidadePorSpec = buildCapacidadePorSpec(machines);

    // Fila pendente por spec — pedidos em andamento
    const filaPorSpec = {};
    (orders || [])
        .filter(o => o.status === "em_producao" || o.status === "confirmacao")
        .forEach(o => {
            const oi = o.itens ? (Array.isArray(o.itens) ? o.itens : Object.values(o.itens)) : [];
            oi.forEach(i => {
                if (!i.tipo) return;
                const k = specKey(i.tipo, i.medida, i.cor);
                const pendente = Math.max(0, (i.qtdTotal || 0) - (i.qtdProduzida || 0));
                filaPorSpec[k] = (filaPorSpec[k] || 0) + pendente;
            });
        });

    // Estoque disponível por spec — desconta da fila
    const estoqueMap = {};
    const parseTSF = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
    [...(movimentos || [])].sort((a,b) => parseTSF(a.timestamp) - parseTSF(b.timestamp)).forEach(m => {
        if (!m.tipo || !m.medida) return;
        const k = specKey(m.tipo, m.medida, m.cor);
        estoqueMap[k] = (estoqueMap[k] || 0) + (m.movimento === "entrada" ? Number(m.qtd) : -Number(m.qtd));
    });

    let maxDias = 0;
    itens.forEach(item => {
        if (!item.tipo || !item.qtdTotal) return;
        const k = specKey(item.tipo, item.medida, item.cor);
        const capacidade = capacidadePorSpec[k] || (RL_POR_FITA_POR_TURNO * TURNOS_POR_DIA);
        const filaPendente = filaPorSpec[k] || 0;
        const estoqueDisp  = Math.max(0, estoqueMap[k] || 0);
        // Desconta estoque da fila + novo pedido
        const totalNecessario = Math.max(0, filaPendente + Number(item.qtdTotal) - estoqueDisp);
        const dias = totalNecessario > 0 ? Math.ceil((totalNecessario / capacidade) * BUFFER) : 0;
        if (dias > maxDias) maxDias = dias;
    });

    const cobertoPorEstoque = maxDias === 0;
    const diasFinal = cobertoPorEstoque ? 2 : Math.max(maxDias, 5);
    return { data: addWorkdays(today, diasFinal), cobertoPorEstoque };
}

// Para cada pedido existente: verifica se a posição na fila permite cumprir o prazo
function calcRiscoFila(thisOrder, machines, allOrders) {
    const itens = Array.isArray(thisOrder.itens) ? thisOrder.itens : Object.values(thisOrder.itens || {});
    const pendentes = itens.filter(i => (i.qtdProduzida || 0) < (i.qtdTotal || 0));
    if (!pendentes.length || !machines?.length) return null;

    const capacidadePorSpec = buildCapacidadePorSpec(machines);

    // Pedidos com prazo anterior ou igual têm prioridade na fila
    const filaPorSpec = {};
    (allOrders || [])
        .filter(o =>
            o.id !== thisOrder.id &&
            (o.status === "em_producao" || o.status === "confirmacao") &&
            (o.dataEntrega || "") <= (thisOrder.dataEntrega || "")
        )
        .forEach(o => {
            const oi = Array.isArray(o.itens) ? o.itens : Object.values(o.itens || {});
            oi.forEach(i => {
                if (!i.tipo) return;
                const k = specKey(i.tipo, i.medida, i.cor);
                const pendente = Math.max(0, (i.qtdTotal || 0) - (i.qtdProduzida || 0));
                filaPorSpec[k] = (filaPorSpec[k] || 0) + pendente;
            });
        });

    let maxDias = 0;
    pendentes.forEach(item => {
        if (!item.tipo) return;
        const k = specKey(item.tipo, item.medida, item.cor);
        const capacidade = capacidadePorSpec[k] || (RL_POR_FITA_POR_TURNO * TURNOS_POR_DIA);
        const pendente = Math.max(0, (item.qtdTotal || 0) - (item.qtdProduzida || 0));
        const fila = filaPorSpec[k] || 0;
        const dias = Math.ceil(((fila + pendente) / capacidade) * BUFFER);
        if (dias > maxDias) maxDias = dias;
    });

    if (maxDias === 0) return null;
    const dataSugeridaFila = addWorkdays(today, maxDias);
    const emRisco = dataSugeridaFila > thisOrder.dataEntrega;
    return { dataSugeridaFila, emRisco };
}

// Calcula total de um pedido para exibição na unidade original dos itens
function calcTotalDisplay(itens) {
    const totais = {};
    itens.forEach(it => {
        if (it.rolo25m) {
            totais["rolos 25m"] = (totais["rolos 25m"] || 0) + Math.round((it.qtdTotal || 0) * FATOR_ROLO_25M);
            return;
        }
        const un = it.unidadeOriginal && it.unidadeOriginal !== "RL" ? it.unidadeOriginal : "RL";
        const qtd = un !== "RL" ? Number(it.qtdOriginal || 0) : Number(it.qtdTotal || 0);
        totais[un] = (totais[un] || 0) + qtd;
    });
    return Object.entries(totais)
        .filter(([, v]) => v > 0)
        .map(([u, v]) => `${Math.round(v).toLocaleString("pt-BR")} ${u}`)
        .join(" · ");
}

const FATOR_ROLO_25M = 4; // 1 RL (100m) = 4 rolos de 25m — apenas conversão visual

function unidadesDisponiveis(tipo, medida) {
    const units = ["RL"];
    if (tipo === "Elástico") units.push("Metro");
    if (tipo === "Poliéster" || KG_POR_ROLO[medida]) units.push("Kg");
    return units;
}

const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px",
    border: "1px solid #ECEDF1", borderRadius: 7, fontSize: 13,
    color: "#111827", background: "#F9FAFB", outline: "none",
};

function FormPedido({ onSubmit, onCancelar, inicial, machines, orders, clientes = [], vendedores = [], onCadastrarCliente, movimentos = [] }) {
    const isMobile = useIsMobile();
    const [dataEntrega, setDataEntrega] = useState(inicial?.dataEntrega || "");
    const [cliente, setCliente] = useState(inicial?.cliente || "");
    const [showSugestoes, setShowSugestoes] = useState(false);
    const [showCadastro, setShowCadastro] = useState(false);
    const [novoVendedor, setNovoVendedor] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [observacao, setObservacao] = useState(inicial?.observacao || "");
    const [itens, setItens] = useState(inicial?.itens || []);
    const [item, setItem] = useState({ tipo: "Gorgurão", medida: "25mm", cor: "", qtdTotal: "", unidade: "RL", rolo25m: false });

    // Reset unidade se não for mais válida para o tipo/medida atual
    const handleItemChange = (patch) => {
        setItem(prev => {
            const next = { ...prev, ...patch };
            const validas = unidadesDisponiveis(next.tipo, next.medida);
            if (!validas.includes(next.unidade)) next.unidade = "RL";
            return next;
        });
    };

    const sugestoes = cliente.trim().length > 0
        ? clientes.filter(c => c.nome.toLowerCase().includes(cliente.toLowerCase()))
        : clientes;
    const nomeExato = clientes.some(c => c.nome.toLowerCase() === cliente.trim().toLowerCase());

    const handleCadastroRapido = async () => {
        if (!cliente.trim() || salvando) return;
        setSalvando(true);
        await onCadastrarCliente?.({ nome: cliente.trim(), vendedor: novoVendedor.trim() });
        setShowCadastro(false);
        setNovoVendedor("");
        setSalvando(false);
    };

    const addItem = () => {
        if (!item.cor || !item.qtdTotal) return;
        const useRolo25m = item.unidade === "RL" && !!item.rolo25m;
        // Com "Rolo de 25m" ativo, o número digitado é a quantidade de rolos de 25m (não de RL)
        const qtdRL = useRolo25m
            ? parseNum(item.qtdTotal) / FATOR_ROLO_25M
            : converterParaRL(parseNum(item.qtdTotal), item.unidade, item.medida, item.tipo);
        const novosItens = [...itens, {
            ...item, id: Date.now(),
            qtdTotal: qtdRL,
            qtdOriginal: parseNum(item.qtdTotal),
            unidadeOriginal: item.unidade,
            rolo25m: useRolo25m,
            qtdProduzida: 0,
        }];
        setItens(novosItens);
        setItem(i => ({ ...i, cor: "", qtdTotal: "", rolo25m: false }));
    };

    const removeItem = (id) => setItens(prev => prev.filter(i => i.id !== id));

    const [editingId, setEditingId] = useState(null);
    const [editingQtd, setEditingQtd] = useState("");

    const startEdit = (it) => {
        setEditingId(it.id);
        if (it.rolo25m) setEditingQtd(String(Math.round((it.qtdTotal || 0) * FATOR_ROLO_25M)));
        else setEditingQtd(it.unidadeOriginal && it.unidadeOriginal !== "RL" ? String(it.qtdOriginal) : String(it.qtdTotal));
    };

    const confirmEdit = (it) => {
        const val = parseNum(editingQtd);
        if (val > 0) {
            if (it.rolo25m) {
                setItens(prev => prev.map(i => i.id !== it.id ? i : { ...i, qtdTotal: val / FATOR_ROLO_25M, qtdOriginal: val }));
            } else {
                const unidade = it.unidadeOriginal || "RL";
                const qtdRL = converterParaRL(val, unidade, it.medida, it.tipo);
                setItens(prev => prev.map(i => i.id !== it.id ? i : { ...i, qtdTotal: qtdRL, qtdOriginal: val, unidadeOriginal: unidade }));
            }
        }
        setEditingId(null);
    };

    const handleSubmit = () => {
        if (!dataEntrega || itens.length === 0 || !nomeExato) return;
        onSubmit({ dataEntrega, cliente, itens, observacao: observacao.trim() });
    };

    const resultSugerido = calcDataSugerida(itens, machines, orders, movimentos);
    const dataSugerida = resultSugerido?.data || null;
    const cobertoPorEstoque = resultSugerido?.cobertoPorEstoque || false;
    const formatSugerida = dataSugerida ? formatDate(dataSugerida) : null;

    // Breakdown por item: fitas configuradas, capacidade, fila, dias
    const capPorSpec = machines?.length ? buildCapacidadePorSpec(machines) : {};
    const detalheItens = itens.map(it => {
        const k = specKey(it.tipo, it.medida, it.cor);
        let fitasCount = 0;
        (machines || []).forEach(m => {
            const fs = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
            fs.forEach(f => {
                const tipo = f.tipo || (m.tipo !== "Misto" ? m.tipo : null);
                if (tipo && specKey(tipo, f.medida, f.cor) === k) fitasCount += (f.qtd || 1);
            });
        });
        const cap = capPorSpec[k] || 0;
        let fila = 0;
        (orders || []).filter(o => o.status === "em_producao" || o.status === "confirmacao").forEach(o => {
            const oi = o.itens ? (Array.isArray(o.itens) ? o.itens : Object.values(o.itens)) : [];
            oi.forEach(i => { if (i.tipo && specKey(i.tipo, i.medida, i.cor) === k) fila += Math.max(0, (i.qtdTotal || 0) - (i.qtdProduzida || 0)); });
        });
        const dias = cap > 0 ? Math.ceil(((fila + Number(it.qtdTotal)) / cap) * BUFFER) : null;
        return { ...it, fitasCount, cap, fila, dias };
    });

    // Verifica se uma cor+medida+tipo existe em alguma máquina
    const corNaMaquina = (cor, medida, tipo) => {
        if (!cor || !machines?.length) return true;
        if ((tipo || "").toLowerCase() === "poliéster") return true; // Poliéster não depende de fita específica
        return machines.some(m => {
            const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
            return fitas.some(f => {
                const fTipo = f.tipo || (m.tipo !== "Misto" ? m.tipo : null);
                return f.cor?.trim().toLowerCase() === cor.trim().toLowerCase()
                    && f.medida === medida
                    && fTipo === tipo;
            });
        });
    };

    const itemCorAviso = item.cor && !corNaMaquina(item.cor, item.medida, item.tipo);

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 20 }}>
                    {inicial ? "Editar Pedido" : "Novo Pedido"}
                </div>

                {/* Cliente + Data */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: dataSugerida ? 8 : 20 }}>
                    <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>CLIENTE</label>
                            {onCadastrarCliente && (
                                <button type="button" onClick={() => { setShowCadastro(true); setShowSugestoes(false); }} style={{ padding: "2px 8px", borderRadius: 6, border: "1.5px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Novo</button>
                            )}
                        </div>
                        <input
                            value={cliente}
                            onChange={e => { setCliente(e.target.value); setShowSugestoes(true); setShowCadastro(false); }}
                            onFocus={() => { setShowSugestoes(true); setShowCadastro(false); }}
                            onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
                            placeholder="Nome do cliente"
                            style={inputStyle}
                            autoComplete="off"
                        />
                        {showSugestoes && sugestoes.length > 0 && (
                            <div style={{
                                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                                background: "#fff", border: "1px solid #ECEDF1", borderRadius: 8,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 2, maxHeight: 180, overflowY: "auto",
                            }}>
                                {sugestoes.map(c => (
                                    <div key={c.key}
                                        onMouseDown={() => { setCliente(c.nome); setShowSugestoes(false); }}
                                        style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, color: "#111827", borderBottom: "1px solid #F3F4F6" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                                    >
                                        <span style={{ fontWeight: 600 }}>{c.nome}</span>
                                        {c.vendedor && <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>{c.vendedor}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {onCadastrarCliente && cliente.trim() && !nomeExato && !showCadastro && (
                            <button type="button" onClick={() => setShowCadastro(true)} style={{ marginTop: 5, width: "100%", padding: "6px 10px", borderRadius: 7, border: "1.5px dashed #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                                + Cadastrar "{cliente.trim()}"
                            </button>
                        )}
                        {showCadastro && (
                            <div style={{ marginTop: 6, padding: 12, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0369A1", marginBottom: 6 }}>Cadastrar novo cliente</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8, padding: "5px 8px", background: "#fff", borderRadius: 6, border: "1px solid #BAE6FD" }}>{cliente.trim()}</div>
                                <select autoFocus value={novoVendedor} onChange={e => setNovoVendedor(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
                                    <option value="">Sem vendedor</option>
                                    {vendedores.map(v => <option key={v.key} value={v.nome}>{v.nome}</option>)}
                                </select>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button type="button" onClick={() => { setShowCadastro(false); setNovoVendedor(""); }} style={{ flex: 1, padding: "6px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", fontSize: 12, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                                    <button type="button" onClick={handleCadastroRapido} disabled={salvando} style={{ flex: 2, padding: "6px", borderRadius: 7, border: "none", background: "#0891B2", color: "#fff", fontWeight: 700, fontSize: 12, cursor: salvando ? "not-allowed" : "pointer" }}>{salvando ? "Salvando..." : "✓ Cadastrar"}</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6 }}>DATA DE ENTREGA</label>
                        <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} style={inputStyle} />
                    </div>
                </div>

                {/* Data sugerida */}
                {dataSugerida && (
                    <div style={{ marginBottom: 20, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
                                {cobertoPorEstoque ? "✓ Tem estoque disponível —" : "📅 Data sugerida (20% folga):"} <strong>{formatSugerida}</strong>
                                {cobertoPorEstoque && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#059669", background: "#D1FAE5", borderRadius: 10, padding: "1px 8px" }}>2 dias úteis</span>}
                            </span>
                            <button onClick={() => setDataEntrega(dataSugerida)} style={{
                                marginLeft: "auto", padding: "4px 12px", fontSize: 12, fontWeight: 700,
                                background: "#16A34A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
                            }}>Usar</button>
                        </div>
                        {detalheItens.map((d, i) => (
                            <div key={i} style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid #BBF7D0", fontSize: 11, color: "#166534", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                <span style={{ fontWeight: 700 }}>{d.tipo} {d.medida} {d.cor}</span>
                                <span style={{ color: "#4ADE80" }}>·</span>
                                <span>{d.fitasCount} fita{d.fitasCount !== 1 ? "s" : ""} → <strong>{d.cap.toLocaleString("pt-BR")} RL/dia</strong></span>
                                {d.fila > 0 && <><span style={{ color: "#4ADE80" }}>·</span><span>Fila: {d.fila.toLocaleString("pt-BR")} RL</span></>}
                                <span style={{ color: "#4ADE80" }}>·</span>
                                <span><strong>{d.dias ?? "?"} dias úteis</strong></span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Adicionar item */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 8 }}>ADICIONAR ITEM</label>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1.5fr", gap: 8, marginBottom: 8 }}>
                        <select value={item.tipo} onChange={e => handleItemChange({ tipo: e.target.value })} style={inputStyle}>
                            <option>Gorgurão</option><option>Poliéster</option><option>Elástico</option>
                        </select>
                        <select value={item.medida} onChange={e => handleItemChange({ medida: e.target.value })} style={inputStyle}>
                            {["8mm","12mm","14mm","15mm","16mm","20mm","22mm","25mm","30mm","35mm","40mm","50mm"].map(x => <option key={x}>{x}</option>)}
                        </select>
                        <CorSelect
                            value={item.cor}
                            onChange={e => setItem(i => ({ ...i, cor: e.target.value }))}
                            options={COR_CATALOG_SORTED}
                            placeholder="Cor"
                            style={{ ...inputStyle, borderColor: itemCorAviso ? "#F97316" : undefined }}
                            wrapperStyle={{ gridColumn: isMobile ? "1 / -1" : undefined }}
                        />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "160px 90px", gap: 8, marginBottom: 8 }}>
                        <div style={{ position: "relative" }}>
                            <input
                                type="text" inputMode={item.unidade === "Kg" ? "decimal" : "numeric"}
                                value={item.qtdTotal}
                                onChange={e => setItem(i => ({ ...i, qtdTotal: item.unidade === "Kg" ? fmtDec(e.target.value) : fmtInt(e.target.value) }))}
                                placeholder={item.unidade === "Metro" ? "Metros" : item.unidade === "Kg" ? "Kg" : item.unidade === "RL" && item.rolo25m ? "Rolos 25m" : "RL"}
                                style={inputStyle}
                            />
                            {item.unidade !== "RL" && item.tipo !== "Poliéster" && item.qtdTotal && (
                                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9CA3AF", pointerEvents: "none" }}>
                                    = {converterParaRL(item.qtdTotal, item.unidade, item.medida)} RL
                                </span>
                            )}
                            {item.unidade === "RL" && item.rolo25m && item.qtdTotal && (
                                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9CA3AF", pointerEvents: "none" }}>
                                    = {(parseNum(item.qtdTotal) / FATOR_ROLO_25M).toLocaleString("pt-BR")} RL
                                </span>
                            )}
                        </div>
                        <select
                            value={item.unidade}
                            onChange={e => setItem(i => ({ ...i, unidade: e.target.value }))}
                            style={inputStyle}
                        >
                            {unidadesDisponiveis(item.tipo, item.medida).map(u => <option key={u}>{u}</option>)}
                        </select>
                    </div>
                    {item.unidade === "RL" && (() => {
                        const ativo = item.rolo25m || itens.some(i => (i.unidadeOriginal || "RL") === "RL" && i.rolo25m);
                        return (
                        <div style={{ marginBottom: 8 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    const novo = !ativo;
                                    setItem(i => ({ ...i, rolo25m: novo }));
                                    setItens(prev => prev.map(i => (i.unidadeOriginal || "RL") === "RL" ? { ...i, rolo25m: novo } : i));
                                }}
                                style={{
                                    padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    border: ativo ? "1.5px solid #F97316" : "1px solid #ECEDF1",
                                    background: ativo ? "#FFF7ED" : "#F9FAFB",
                                    color: ativo ? "#EA580C" : "#6B7280",
                                }}
                            >
                                {ativo ? "✓ " : ""}Rolo de 25m
                            </button>
                            {ativo && <span style={{ marginLeft: 8, fontSize: 11, color: "#9CA3AF" }}>quantidade em rolos de 25m</span>}
                        </div>
                        );
                    })()}
                    {itemCorAviso && (
                        <div style={{ fontSize: 12, color: "#D97706", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: "6px 10px", marginBottom: 8 }}>
                            ⚠ Cor não encontrada nas máquinas. Lembre de configurar antes de produzir.
                        </div>
                    )}
                    <button onClick={addItem} disabled={!item.cor || !item.qtdTotal} style={{
                        padding: "8px 16px", background: item.cor && item.qtdTotal ? "#F97316" : "#ECEDF1",
                        border: "none", borderRadius: 8, color: item.cor && item.qtdTotal ? "#fff" : "#9CA3AF",
                        fontWeight: 600, fontSize: 13, cursor: item.cor && item.qtdTotal ? "pointer" : "not-allowed",
                    }}>+ Adicionar item</button>
                </div>

                {/* Lista de itens */}
                {itens.length > 0 && (
                    <div style={{ background: "#F9FAFB", borderRadius: 10, border: "1px solid #ECEDF1", marginBottom: 20, overflow: "hidden" }}>
                        <div style={{ padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", borderBottom: "1px solid #ECEDF1" }}>
                            {itens.length} ITEM{itens.length !== 1 ? "S" : ""}
                        </div>
                        {itens.map((it, idx) => {
                            const semMaquina = !corNaMaquina(it.cor, it.medida, it.tipo);
                            const isEditing = editingId === it.id;
                            const unidade = it.unidadeOriginal || "RL";
                            return (
                            <div key={it.id} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "10px 14px", borderBottom: idx < itens.length - 1 ? "1px solid #F3F4F6" : "none",
                                background: isEditing ? "#FFFBEB" : "transparent",
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{it.tipo} {it.medida} – {it.cor}</span>
                                    {semMaquina && <span style={{ fontSize: 11, color: "#D97706", marginLeft: 8 }}>⚠ sem máquina</span>}
                                    {isEditing ? (
                                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                            <input
                                                autoFocus
                                                type="number"
                                                min="1"
                                                value={editingQtd}
                                                onChange={e => setEditingQtd(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") confirmEdit(it); if (e.key === "Escape") setEditingId(null); }}
                                                style={{ width: 90, padding: "4px 8px", border: "1.5px solid #F97316", borderRadius: 6, fontSize: 13, outline: "none" }}
                                            />
                                            <span style={{ fontSize: 12, color: "#6B7280" }}>{it.rolo25m ? "rolos 25m" : unidade}</span>
                                            <button onClick={() => confirmEdit(it)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#F97316", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✓</button>
                                            <button onClick={() => setEditingId(null)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ECEDF1", background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>✕</button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
                                            {it.rolo25m
                                                ? <><span style={{ color: "#EA580C", fontWeight: 700 }}>{Math.round((it.qtdTotal || 0) * FATOR_ROLO_25M)} rolos de 25m</span> <span style={{ color: "#D1D5DB" }}>({(it.qtdTotal || 0).toLocaleString("pt-BR")} RL)</span></>
                                                : it.unidadeOriginal && it.unidadeOriginal !== "RL"
                                                    ? <>{it.qtdOriginal} {it.unidadeOriginal} <span style={{ color: "#D1D5DB" }}>({it.qtdTotal} RL)</span></>
                                                    : <>{it.qtdTotal} RL</>
                                            }
                                        </span>
                                    )}
                                </div>
                                {!isEditing && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                        <button onClick={() => startEdit(it)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 14, padding: "2px 4px" }} title="Editar quantidade">✎</button>
                                        <button onClick={() => removeItem(it.id)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16 }}>×</button>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}

                {/* Observação */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6 }}>OBSERVAÇÃO (opcional)</label>
                    <textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: entregar até sexta, embalar separado..." rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                </div>

                {cliente.trim() && !nomeExato && (
                    <div style={{
                        marginBottom: 14, padding: "12px 14px", borderRadius: 10,
                        background: "#FEF2F2", border: "2px solid #FCA5A5",
                        display: "flex", alignItems: "center", gap: 10,
                    }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>
                            Cliente não cadastrado — cadastre-o acima para poder dar entrada no pedido.
                        </span>
                    </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCancelar} style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={!dataEntrega || itens.length === 0 || !nomeExato} title={!nomeExato ? "Cadastre o cliente antes de dar entrada no pedido" : undefined} style={{
                        flex: 1, padding: 12, borderRadius: 8, border: "none",
                        background: dataEntrega && itens.length > 0 && nomeExato ? "#F97316" : "#ECEDF1",
                        color: dataEntrega && itens.length > 0 && nomeExato ? "#fff" : "#9CA3AF",
                        fontWeight: 700, fontSize: 13, cursor: dataEntrega && itens.length > 0 && nomeExato ? "pointer" : "not-allowed",
                    }}>
                        {inicial ? "Salvar" : "Criar Pedido"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const CAIXA_POR_MEDIDA = { "22mm": 60, "25mm": 60, "30mm": 48 };

function calcCaixas(medida, qtdRL) {
    const porCaixa = CAIXA_POR_MEDIDA[medida];
    if (!porCaixa || !qtdRL) return null;
    return { porCaixa, total: Math.ceil(qtdRL / porCaixa) };
}

function ModalImprimir({ order, onFechar, onSolicitar, userName }) {
    const itens = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});
    const [enviando, setEnviando] = useState(false);
    const [enviados, setEnviados] = useState({});

    const handleEnviar = async (it, key) => {
        setEnviando(true);
        const caixas = calcCaixas(it.medida, it.qtdTotal);
        const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const base = { tipo: it.tipo, cor: it.cor, medida: it.medida, unidade: "RL", solicitadoPor: userName, timestamp: ts, status: "pendente" };

        if (caixas) {
            const { porCaixa, total } = caixas;
            const remainder = it.qtdTotal % porCaixa;
            const cheias = remainder === 0 ? total : total - 1;
            if (cheias > 0) await onSolicitar({ ...base, quantidade: porCaixa, copies: cheias });
            if (remainder > 0) await onSolicitar({ ...base, quantidade: remainder, copies: 1 });
        } else {
            await onSolicitar({ ...base, quantidade: it.qtdTotal, unidade: it.unidadeOriginal || "RL", copies: 1 });
        }

        setEnviados(p => ({ ...p, [key]: true }));
        setEnviando(false);
    };

    const TIPO_C = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                {/* Header */}
                <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>🖨 Imprimir Etiquetas</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Pedido #{order.numero} · {order.cliente}</div>
                    </div>
                    <button onClick={onFechar} style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#6B7280" }}>✕</button>
                </div>

                {/* Lista de itens */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {itens.map((it, i) => {
                        const key = `${it.cor}|${it.medida}|${it.tipo}`;
                        const cor = TIPO_C[it.tipo] || "#9CA3AF";
                        const enviado = enviados[key];
                        const caixas = calcCaixas(it.medida, it.qtdTotal);
                        return (
                                    <div key={i} style={{ border: `1.5px solid ${enviado ? "#16A34A" : "#ECEDF1"}`, borderRadius: 10, padding: "10px 12px", background: enviado ? "#F0FDF4" : "#fff", transition: "all 0.3s" }}>
                                        {/* Linha principal */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: cor, background: cor + "18", borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>{it.tipo}</span>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827", flex: 1, minWidth: 0 }}>{it.cor} <span style={{ fontWeight: 400, color: "#6B7280" }}>{it.medida}</span></span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", flexShrink: 0 }}>
                                                {it.unidadeOriginal && it.unidadeOriginal !== "RL" ? `${it.qtdOriginal} ${it.unidadeOriginal}` : `${it.qtdTotal?.toLocaleString("pt-BR")} RL`}
                                            </span>
                                            {enviado ? (
                                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>✓</div>
                                            ) : (
                                                <button onClick={() => !enviando && handleEnviar(it, key)} disabled={enviando} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 7, border: "none", background: cor, color: "#fff", fontWeight: 700, fontSize: 12, cursor: enviando ? "default" : "pointer", opacity: enviando ? 0.7 : 1 }}>
                                                    🖨
                                                </button>
                                            )}
                                        </div>
                                        {/* Info de caixas */}
                                        {caixas && (
                                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{caixas.porCaixa} RL/cx</span>
                                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>→</span>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: enviado ? "#16A34A" : "#374151" }}>
                                                    {caixas.total} caixa{caixas.total !== 1 ? "s" : ""}
                                                </span>
                                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>· {caixas.total} etiqueta{caixas.total !== 1 ? "s" : ""} impressas</span>
                                            </div>
                                        )}
                                    </div>
                        );
                    })}
                </div>

                <div style={{ padding: "12px 16px", borderTop: "1px solid #F3F4F6" }}>
                    <button onClick={onFechar} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "#F3F4F6", color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PedidosTab({ orders, machines, clientes = [], vendedores = [], movimentos = [], onSubmit, userRole, onDelete, onEditOrder, onSolicitarConfirmacao, onConfirmarPedido, onConcluirPedido, onReverterConclusao, onEntregaParcial, onDeleteEntregaParcial, onRecalcularDatas, onSolicitarEtiqueta, userName, onCadastrarCliente, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [showForm, setShowForm] = useState(false);
    const [etiquetaAberto, setEtiquetaAberto] = useState(new Set());
    const [printMenuAberto, setPrintMenuAberto] = useState(null);
    const [printMenuPos,    setPrintMenuPos]    = useState(null);
    const [printMenuOrder,  setPrintMenuOrder]  = useState(null);
    const [modalEntregar, setModalEntregar] = useState(null);
    const [entregarDescontarEstoque, setEntregarDescontarEstoque] = useState(true);
    const [modalCancelar, setModalCancelar] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [filterTab, setFilterTab] = useState("em_producao");
    const [showConcluidos, setShowConcluidos] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState(new Set());
    const [modalConfirm, setModalConfirm] = useState(null);
    const [novaData, setNovaData] = useState("");
    const [modalEntrega, setModalEntrega] = useState(null); // { orderId, editKey? }
    const [entregaObs, setEntregaObs] = useState("");
    const [entregaQtds, setEntregaQtds] = useState({}); // { itemId: qtd }
    const [entregaDescontarEstoque, setEntregaDescontarEstoque] = useState(false);

    const abrirEntrega = (order, entregaExistente = null) => {
        const itensPrevios = entregaExistente
            ? (Array.isArray(entregaExistente.itens) ? entregaExistente.itens : Object.values(entregaExistente.itens || {}))
            : null;
        setModalEntrega({ orderId: order.id, editKey: entregaExistente?.key || null, itensPrevios });
        if (entregaExistente) {
            const qtds = {};
            itensPrevios.forEach(it => { qtds[it.id || it.cor] = String(it.qtd); });
            setEntregaQtds(qtds);
            setEntregaObs(entregaExistente.obs || "");
        } else {
            setEntregaQtds({});
            setEntregaObs("");
        }
    };
    const isAdmin    = userRole === "admin";
    const canPrint   = true;

    const vendedorPorCliente = useMemo(() => {
        const map = {};
        clientes.forEach(c => { if (c.vendedor) map[c.nome] = c.vendedor; });
        return map;
    }, [clientes]);

    const toggleExpand = (id) => setExpandedOrders(s => {
        const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const getOrderStatus = (order) => {
        const itens = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});
        if (!itens.length) return "em_producao";
        return itens.every(i => i.qtdProduzida >= i.qtdTotal) ? "concluido" : "em_producao";
    };

    const [busca, setBusca] = useState("");
    const [dateSort, setDateSort] = useState(null); // null | "asc" | "desc"
    const [modalImprimir, setModalImprimir] = useState(null);

    const closePrintMenu = () => { setPrintMenuAberto(null); setPrintMenuPos(null); setPrintMenuOrder(null); };
    useEffect(() => {
        if (!printMenuAberto) return;
        const handler = () => closePrintMenu();
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [printMenuAberto]); // eslint-disable-line

    const toggleDateSort = (dir) => setDateSort(prev => prev === dir ? null : dir);

    const getStatusCalc = (o) => {
        const itens = Array.isArray(o.itens) ? o.itens : Object.values(o.itens || {});
        if (itens.length > 0 && itens.every(i => (i.qtdProduzida || 0) >= (i.qtdTotal || 0))) return "concluido";
        // Também conclui se entregasParciais cobrem 100% de cada item (para Elástico em Metro/Kg)
        if (itens.length > 0 && o.entregasParciais) {
            const epMap = {};
            Object.values(o.entregasParciais).forEach(e => {
                (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                    const k = `${(ei.cor||"").toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                    epMap[k] = (epMap[k] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                });
            });
            if (itens.every(i => {
                const total = i.qtdOriginal || i.qtdTotal || 0;
                const k = `${(i.cor||"").toLowerCase()}|${i.medida}|${(i.tipo||"").toLowerCase()}`;
                return total > 0 && (epMap[k] || 0) >= total;
            })) return "concluido";
        }
        return o.status || getOrderStatus(o);
    };

    const counts = {
        todos:       orders.length,
        em_producao: orders.filter(o => getStatusCalc(o) === "em_producao").length,
        confirmacao: orders.filter(o => getStatusCalc(o) === "confirmacao").length,
        urgentes:    orders.filter(o => {
            const s = getStatusCalc(o);
            const d = workdaysBetween(today, o.dataEntrega);
            return s !== "concluido" && o.dataEntrega >= today && d <= 7;
        }).length,
        atrasados:   orders.filter(o => {
            const s = getStatusCalc(o);
            const d = workdaysBetween(today, o.dataEntrega);
            return s !== "concluido" && d < 0;
        }).length,
        concluidos:  orders.filter(o => getStatusCalc(o) === "concluido" && !o.cancelado).length,
        cancelados:  orders.filter(o => getStatusCalc(o) === "concluido" && o.cancelado).length,
    };

    const filtered = orders.filter(o => {
        const status = getStatusCalc(o);
        if (filterTab === "em_producao") return status === "em_producao";
        if (filterTab === "confirmacao") return status === "confirmacao";
        if (filterTab === "concluidos")  return status === "concluido" && !o.cancelado;
        if (filterTab === "cancelados")  return status === "concluido" && !!o.cancelado;
        if (filterTab === "urgentes") {
            const d = workdaysBetween(today, o.dataEntrega);
            return status !== "concluido" && o.dataEntrega >= today && d <= 7;
        }
        if (filterTab === "atrasados") {
            const d = workdaysBetween(today, o.dataEntrega);
            return status !== "concluido" && d < 0;
        }
        // "todos": esconde concluídos por padrão
        if (!showConcluidos && status === "concluido") return false;
        return true;
    }).filter(o => {
        if (!busca.trim()) return true;
        const q = busca.trim().toLowerCase();
        return (o.cliente || "").toLowerCase().startsWith(q);
    }).sort((a, b) => {
        const aConcluido = getStatusCalc(a) === "concluido" ? 1 : 0;
        const bConcluido = getStatusCalc(b) === "concluido" ? 1 : 0;
        if (aConcluido !== bConcluido) return aConcluido - bConcluido;
        if (dateSort === "asc")  return (a.dataEntrega || "").localeCompare(b.dataEntrega || "");
        if (dateSort === "desc") return (b.dataEntrega || "").localeCompare(a.dataEntrega || "");
        return (a.numero || 0) - (b.numero || 0);
    });

    // Calcula risco de fila uma vez para todos os pedidos (evita O(n²) no render)
    const riscoMap = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            if (o.status === "em_producao" || o.status === "confirmacao") {
                map[o.id] = calcRiscoFila(o, machines, orders);
            }
        });
        return map;
    }, [orders, machines]);

    return (
        <div style={{ padding: isMobile ? "16px 12px 40px" : "24px" }}>
            {/* Modal confirmar entrega */}
            {modalEntregar && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Marcar como entregue?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
                            Pedido #{modalEntregar.numero} — <strong>{modalEntregar.cliente}</strong>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 20, justifyContent: "center" }}>
                            <input type="checkbox" checked={entregarDescontarEstoque} onChange={e => setEntregarDescontarEstoque(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#16A34A", cursor: "pointer" }} />
                            <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>Descontar do estoque</span>
                        </label>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setModalEntregar(null)} style={{ flex: 1, padding: 12, borderRadius: 9, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
                            <button onClick={() => { onConcluirPedido(modalEntregar.id, entregarDescontarEstoque); setModalEntregar(null); }} style={{ flex: 1, padding: 12, borderRadius: 9, border: "none", background: "#16A34A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal cancelar pedido — conclui como entregue, sem descontar estoque */}
            {modalCancelar && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>✕</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Cancelar pedido?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
                            Pedido #{modalCancelar.numero} — <strong>{modalCancelar.cliente}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>
                            O pedido sai da produção e vai para os concluídos como cancelado. O estoque não é descontado.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setModalCancelar(null)} style={{ flex: 1, padding: 12, borderRadius: 9, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 600 }}>Voltar</button>
                            <button onClick={() => { onConcluirPedido(modalCancelar.id, false, true); setModalCancelar(null); }} style={{ flex: 1, padding: 12, borderRadius: 9, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ Cancelar pedido</button>
                        </div>
                    </div>
                </div>
            )}
            {modalImprimir && (
                <ModalImprimir
                    order={modalImprimir}
                    onFechar={() => setModalImprimir(null)}
                    onSolicitar={onSolicitarEtiqueta}
                    userName={userName}
                />
            )}
            {/* Menu Imprimir via portal — não é cortado por overflow */}
            {printMenuAberto && printMenuPos && printMenuOrder && createPortal(
                <div
                    onMouseDown={e => e.stopPropagation()}
                    style={{ position: "fixed", top: printMenuPos.top, bottom: printMenuPos.bottom, right: printMenuPos.right, zIndex: 99999, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 9, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden" }}
                >
                    <button onClick={() => {
                        closePrintMenu();
                        const o = printMenuOrder;
                        const oi = Array.isArray(o.itens) ? o.itens : Object.values(o.itens || {});
                        const entregueMap = {};
                        Object.values(o.entregasParciais || {}).forEach(e => {
                            (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                                const ek = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                                entregueMap[ek] = (entregueMap[ek] || 0) + Number(ei.qtd || 0);
                                entregueMap[ek + "|orig"] = (entregueMap[ek + "|orig"] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                            });
                        });
                        const hoje = new Date().toLocaleDateString("pt-BR");
                        const w = window.open("", "_blank", "width=800,height=600");
                        const corMap = {};
                        COR_CATALOG_SORTED.forEach(c => { corMap[c.nome.toLowerCase().trim()] = c.codigo; });
                        const TIPO_ORDER = ["Gorgurão", "Poliéster", "Elástico"];
                        const TIPO_COLOR_PDF = { "Gorgurão": "#EA580C", "Poliéster": "#4338CA", "Elástico": "#16A34A" };
                        const itensCalc = oi.map(it => {
                            const unidadeOrig = it.unidadeOriginal || "RL";
                            const isOrig = unidadeOrig !== "RL";
                            const ek = `${(it.cor||"").trim().toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`;
                            const totalPed = it.rolo25m
                                ? Math.round((it.qtdTotal || 0) * FATOR_ROLO_25M)
                                : isOrig ? (it.qtdOriginal || (unidadeOrig === "m" || unidadeOrig === "Metro" ? (it.qtdTotal||0)*25 : it.qtdTotal||0)) : (it.qtdTotal || 0);
                            const entregue = it.rolo25m || isOrig ? (entregueMap[ek+"|orig"]||0) : (entregueMap[ek]||0);
                            const restante = Math.max(0, totalPed - entregue);
                            const unidade = it.rolo25m ? "rolos 25m" : unidadeOrig;
                            return { ...it, _totalPed: totalPed, _entregue: Math.min(entregue, totalPed), _restante: restante, _unidade: unidade };
                        });
                        const itensPendentes = itensCalc.filter(it => it._restante > 0);
                        const grupos = TIPO_ORDER.map(t => ({ tipo: t, itens: itensPendentes.filter(it => it.tipo === t) })).filter(g => g.itens.length > 0);
                        const outrosTipos = [...new Set(itensPendentes.map(it => it.tipo).filter(t => !TIPO_ORDER.includes(t)))];
                        outrosTipos.forEach(t => grupos.push({ tipo: t, itens: itensPendentes.filter(it => it.tipo === t) }));
                        let contador = 0;
                        const itensHtml = grupos.map(g => {
                            const cor = TIPO_COLOR_PDF[g.tipo] || "#374151";
                            const header = `<tr><td colspan="3" style="background:#f5f5f5;padding:6px 8px;font-weight:800;color:${cor};font-size:11px;letter-spacing:.05em;border-top:2px solid ${cor}">${g.tipo.toUpperCase()}</td></tr>`;
                            const rows = g.itens.map(it => {
                                contador++;
                                const codCor = corMap[(it.cor || "").toLowerCase().trim()] || "";
                                const refStr = codCor ? ` <span style="color:#888;font-size:10px">[${codCor}]</span>` : "";
                                return `<tr><td>${String(contador).padStart(3,"0")}</td><td>${it.medida} - ${it.cor?.toUpperCase()}${refStr}</td><td style="text-align:right;font-weight:700">${Number(it._restante).toLocaleString("pt-BR")} ${it._unidade}</td></tr>`;
                            }).join("");
                            return header + rows;
                        }).join("");
                        const sumRestante = itensPendentes.reduce((a, it) => a + it._restante, 0);
                        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Pedido #${o.numero}</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#eee;padding:6px 8px;text-align:left;border:1px solid #ccc}td{padding:5px 8px;border:1px solid #ddd}.info{display:flex;justify-content:space-between;margin:12px 0;font-size:11px}.total{font-weight:800;background:#f5f5f5}.obs{margin-top:auto;padding-top:16px}.obs div{border:1.5px solid #333;border-radius:6px;padding:10px 12px;font-size:13px;white-space:pre-wrap}@media print{@page{margin:10mm}body{margin:0;min-height:277mm;display:flex;flex-direction:column}}</style></head><body><div style="text-align:center;margin-bottom:4px;font-size:10px;color:#888">FOURTEX IND E COM DE AVIAMENTO LTDA</div><div style="text-align:center;font-size:16px;font-weight:800;margin-bottom:4px">Pedido #${o.numero}</div><h2 style="font-size:22px;font-weight:900;margin:0 0 4px;text-align:center">${o.cliente || "—"}</h2><div class="info"><span>Entrega: ${o.dataEntrega || "—"}</span><span>Impresso: ${hoje}</span></div><table><thead><tr><th style="width:6%">Item</th><th>Descrição</th><th style="width:20%;text-align:right">Falta entregar</th></tr></thead><tbody>${itensHtml || `<tr><td colspan="3" style="text-align:center;color:#16A34A;font-weight:700;padding:16px">Pedido totalmente entregue — nada pendente.</td></tr>`}<tr class="total"><td colspan="2">Total pendente</td><td style="text-align:right;color:#DC2626">${sumRestante.toLocaleString("pt-BR")}</td></tr></tbody></table>${o.observacao ? `<div class="obs"><strong style="font-size:11px">OBSERVAÇÃO</strong><div>${String(o.observacao).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></div>` : ""}<script>window.onload=()=>window.print();</script></body></html>`);
                        w.document.close();
                    }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #F3F4F6", fontSize: 13, color: "#2563EB", cursor: "pointer", fontWeight: 600 }}>
                        📄 Salvar PDF
                    </button>
                    {podeEditar && onSolicitarEtiqueta && (
                        <button onClick={() => { closePrintMenu(); setModalImprimir(printMenuOrder); }} style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: "none", border: "none", fontSize: 13, color: "#0891B2", cursor: "pointer", fontWeight: 600 }}>
                            🏷 Etiqueta
                        </button>
                    )}
                </div>,
                document.body
            )}
            {/* Modal confirmação */}
            {modalConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
                        {isAdmin && modalConfirm.order.status !== "confirmacao" ? (
                            <>
                                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 4 }}>Solicitar Confirmação</div>
                                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
                                    {modalConfirm.order.cliente} — propor data de entrega ao operador
                                </div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6 }}>DATA PROPOSTA</label>
                                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                                    style={{ ...inputStyle, marginBottom: 20 }} />
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button onClick={() => { setModalConfirm(null); setNovaData(""); }} style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                                    <button onClick={() => { onSolicitarConfirmacao(modalConfirm.order.id, novaData || modalConfirm.order.dataEntrega); setModalConfirm(null); setNovaData(""); }} style={{ flex: 1, padding: 12, borderRadius: 8, border: "none", background: "#F97316", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Enviar para Operador</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 4 }}>Confirmação de Entrega</div>
                                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>{modalConfirm.order.cliente}</div>

                                {/* Data proposta pelo admin + comparação com automática */}
                                {(() => {
                                    const itensOrder = Array.isArray(modalConfirm.order.itens) ? modalConfirm.order.itens : Object.values(modalConfirm.order.itens || {});
                                    const dataAuto = calcDataSugerida(itensOrder, machines, orders);
                                    const usouAuto = dataAuto && modalConfirm.order.dataEntrega === dataAuto;

                                    return (
                                        <>
                                            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div>
                                                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                                                        Data proposta por {modalConfirm.order.criadoPor || "—"}
                                                        {usouAuto
                                                            ? <span style={{ background: "#F0FDF4", color: "#16A34A", fontWeight: 700, fontSize: 10, padding: "1px 7px", borderRadius: 20 }}>✓ usou a data automática</span>
                                                            : dataAuto ? <span style={{ background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 10, padding: "1px 7px", borderRadius: 20 }}>editou a data</span> : null
                                                        }
                                                    </div>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#F97316" }}>{formatDate(modalConfirm.order.dataEntrega)}</div>
                                                </div>
                                                <button onClick={() => setNovaData(modalConfirm.order.dataEntrega)} style={{ fontSize: 11, fontWeight: 700, color: "#F97316", background: "transparent", border: "1px solid #FED7AA", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                                                    Usar esta
                                                </button>
                                            </div>

                                            {dataAuto && !usouAuto && (
                                                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Data automática do sistema</div>
                                                        <div style={{ fontSize: 15, fontWeight: 700, color: "#16A34A" }}>{formatDate(dataAuto)}</div>
                                                    </div>
                                                    <button onClick={() => setNovaData(dataAuto)} style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "transparent", border: "1px solid #BBF7D0", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                                                        Usar esta
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6 }}>DATA DE ENTREGA</label>
                                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }} />
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button onClick={() => { setModalConfirm(null); setNovaData(""); }} style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                                    <button onClick={() => { onConfirmarPedido(modalConfirm.order.id, novaData || modalConfirm.order.dataEntrega); setModalConfirm(null); setNovaData(""); }} style={{ flex: 2, padding: 12, borderRadius: 8, border: "none", background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                        Confirmar entrega
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showForm && (
                <FormPedido
                    onSubmit={(data) => { onSubmit(data); setShowForm(false); }}
                    onCancelar={() => setShowForm(false)}
                    machines={machines}
                    orders={orders}
                    clientes={clientes}
                    vendedores={vendedores}
                    movimentos={movimentos}
                    onCadastrarCliente={onCadastrarCliente}
                />
            )}
            {editingOrder && (
                <FormPedido
                    inicial={editingOrder}
                    onSubmit={(data) => { onEditOrder({ ...editingOrder, ...data }); setEditingOrder(null); }}
                    onCancelar={() => setEditingOrder(null)}
                    machines={machines}
                    orders={orders}
                    clientes={clientes}
                    vendedores={vendedores}
                    movimentos={movimentos}
                    onCadastrarCliente={onCadastrarCliente}
                />
            )}

            {/* Modal entrega parcial */}
            {modalEntrega && (() => {
                const modalOrder = orders.find(o => o.id === modalEntrega.orderId) || {};
                const itensEntrega = Array.isArray(modalOrder.itens)
                    ? modalOrder.itens
                    : Object.values(modalOrder.itens || {});
                const temQtd = Object.values(entregaQtds).some(v => Number(v) > 0);
                const fechar = () => { setModalEntrega(null); setEntregaObs(""); setEntregaQtds({}); };
                const confirmar = () => {
                    const itensFiltrados = itensEntrega
                        .filter(it => parseNum(entregaQtds[it.id || it.cor]) > 0)
                        .map(it => {
                            const unidade = it.unidadeOriginal || "RL";
                            const qtdInput = parseNum(entregaQtds[it.id || it.cor]);
                            if (it.rolo25m) {
                                // Quantidade digitada é em rolos de 25m
                                return { cor: it.cor, medida: it.medida, tipo: it.tipo, qtd: qtdInput / FATOR_ROLO_25M, qtdOriginal: qtdInput };
                            }
                            const qtdRL = converterParaRL(qtdInput, unidade, it.medida, it.tipo) || qtdInput;
                            const entry = { cor: it.cor, medida: it.medida, tipo: it.tipo, qtd: qtdRL };
                            if (unidade !== "RL") { entry.qtdOriginal = qtdInput; entry.unidadeOriginal = unidade; }
                            return entry;
                        });
                    onEntregaParcial(modalEntrega.orderId, { itens: itensFiltrados, obs: entregaObs, editKey: modalEntrega.editKey, itensPrevios: modalEntrega.itensPrevios, descontarEstoque: entregaDescontarEstoque });
                    fechar();
                };
                // Soma entregas reais das entregasParciais (fonte confiável, igual ao card)
                const entregueMapModal = {};
                const epsModal = modalOrder.entregasParciais ? Object.values(modalOrder.entregasParciais) : [];
                epsModal.forEach(e => {
                    (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                        const k = `${(ei.cor || "").trim()}|${ei.medida}|${(ei.tipo || "").trim()}`;
                        // Usa qtdOriginal quando disponível (Metro/Kg), caso contrário qtd (RL)
                        entregueMapModal[k] = (entregueMapModal[k] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                    });
                });
                return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                        <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>{modalEntrega.editKey ? "Editar Entrega Parcial" : "Entrega Parcial"}</div>
                            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 18 }}>{modalOrder.cliente || "—"} · {new Date().toLocaleDateString("pt-BR")}</div>

                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>QUANTO ENTREGAR AGORA</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                                {itensEntrega.map(it => {
                                    const key = it.id || it.cor;
                                    const unidade = it.rolo25m ? "rolos 25m" : (it.unidadeOriginal || "RL");
                                    const produzido = entregueMapModal[`${(it.cor || "").trim()}|${it.medida}|${(it.tipo || "").trim()}`] || 0;
                                    const total = it.rolo25m ? Math.round((it.qtdTotal || 0) * FATOR_ROLO_25M) : (it.qtdOriginal || it.qtdTotal);
                                    const restante = Math.max(0, total - produzido);
                                    const pct = total > 0 ? Math.min(100, Math.round((produzido / total) * 100)) : 0;
                                    return (
                                        <div key={key} style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}><CorInline cor={it.cor} />{it.cor}</div>
                                                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{it.medida} · {it.tipo}</div>
                                                </div>
                                                <div style={{ textAlign: "right", fontSize: 11 }}>
                                                    <div style={{ color: "#16A34A", fontWeight: 700 }}>Entregue: {produzido.toLocaleString("pt-BR")} {unidade}</div>
                                                    <div style={{ color: "#6B7280" }}>Total: {total.toLocaleString("pt-BR")} {unidade}</div>
                                                </div>
                                            </div>
                                            {/* Barra de progresso */}
                                            <div style={{ height: 4, background: "#ECEDF1", borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${pct}%`, background: "#16A34A", borderRadius: 4 }} />
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ fontSize: 11, color: "#6B7280", flex: 1 }}>
                                                    Restam <strong style={{ color: "#111827" }}>{restante.toLocaleString("pt-BR")} {unidade}</strong>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <input
                                                        type="text" inputMode="numeric"
                                                        value={entregaQtds[key] ?? ""}
                                                        onChange={e => setEntregaQtds(q => ({ ...q, [key]: fmtInt(e.target.value) }))}
                                                        placeholder="0"
                                                        style={{ ...inputStyle, width: 90, textAlign: "center" }}
                                                    />
                                                    <span style={{ fontSize: 12, color: "#6B7280", minWidth: 28 }}>{unidade}</span>
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
                                <input value={entregaObs} onChange={e => setEntregaObs(e.target.value)} placeholder="Ex: 1ª remessa" style={inputStyle} />
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={fechar} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                                <button disabled={!temQtd} onClick={confirmar} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: temQtd ? "#111827" : "#ECEDF1", color: temQtd ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 13, cursor: temQtd ? "pointer" : "not-allowed" }}>
                                    Registrar entrega
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Card: busca + tabs + lista */}
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
                {/* Busca + Ordenação */}
                <div style={{ display: "flex", gap: 10, padding: "16px 20px 12px" }}>
                    <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#F7F8FA", border: "1px solid #E9EAEE", borderRadius: 10, padding: "9px 12px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                            value={busca} onChange={e => setBusca(e.target.value)}
                            placeholder="Filtrar por cliente..."
                            style={{ flex: 1, minWidth: 0, border: "none", fontSize: 13, background: "transparent", outline: "none" }}
                        />
                        {busca && (
                            <button onClick={() => setBusca("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9CA3AF", lineHeight: 1, padding: 2, flexShrink: 0 }}>×</button>
                        )}
                    </div>
                    <button onClick={() => toggleDateSort("asc")} title="Data crescente" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, border: "1px solid #E9EAEE", display: "flex", alignItems: "center", justifyContent: "center", background: dateSort === "asc" ? "#F97316" : "#fff", cursor: "pointer" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dateSort === "asc" ? "#fff" : "#6B7280"} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                    </button>
                    <button onClick={() => toggleDateSort("desc")} title="Data decrescente" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, border: "1px solid #E9EAEE", display: "flex", alignItems: "center", justifyContent: "center", background: dateSort === "desc" ? "#F97316" : "#fff", cursor: "pointer" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dateSort === "desc" ? "#fff" : "#6B7280"} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    </button>
                    {podeEditar && (
                        <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 36, flexShrink: 0, background: "#F97316", border: "none", borderRadius: 9, fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Novo Pedido
                        </button>
                    )}
                </div>

                {/* Filter tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #ECEDF1", overflowX: "auto" }}>
                    {[
                        { id: "todos",       label: "Todos" },
                        { id: "em_producao", label: isMobile ? "Produção" : "Em Produção" },
                        { id: "confirmacao", label: isMobile ? "Conf." : "Confirmação" },
                        { id: "urgentes",    label: "Urgentes" },
                        { id: "atrasados",   label: "Atrasados" },
                        { id: "concluidos",  label: isMobile ? "Feitos" : "Concluídos" },
                        { id: "cancelados",  label: isMobile ? "Canc." : "Cancelados" },
                    ].map(ft => {
                        const cnt = counts[ft.id];
                        const isAlert = (ft.id === "atrasados" || ft.id === "urgentes") && cnt > 0;
                        return (
                            <button key={ft.id} onClick={() => setFilterTab(ft.id)} style={{
                                background: "none", border: "none", padding: isMobile ? "11px 10px" : "13px 14px", fontSize: isMobile ? 11 : 13, whiteSpace: "nowrap",
                                fontWeight: filterTab === ft.id ? 600 : 400,
                                color: filterTab === ft.id ? "#F97316" : "#6B7280",
                                borderBottom: filterTab === ft.id ? "2px solid #F97316" : "2px solid transparent",
                                cursor: "pointer",
                            }}>
                                {ft.label}
                                {cnt > 0 && (
                                    <span style={{ marginLeft: 5, background: isAlert ? "#DC2626" : filterTab === ft.id ? "#F97316" : "#ECEDF1", color: isAlert || filterTab === ft.id ? "#fff" : "#6B7280", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{cnt}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Checkbox mostrar concluídos — visível só na aba Todos */}
                {filterTab === "todos" && (
                    <div style={{ padding: "8px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#6B7280" }}>
                            <input type="checkbox" checked={showConcluidos} onChange={e => setShowConcluidos(e.target.checked)}
                                style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#16A34A" }} />
                            Mostrar concluídos ({counts.concluidos + counts.cancelados})
                        </label>
                    </div>
                )}

                {/* Orders */}
                {filtered.length === 0 && (
                    <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Nenhum pedido encontrado.</div>
                )}

                {filtered.map((order, idx) => {
                    const itens = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});
                    const status = order.status || getOrderStatus(order);
                    const dias = workdaysBetween(today, order.dataEntrega);
                    const atrasado = dias < 0;
                    const urgente = dias >= 0 && dias <= 7;
                    const isExpanded = expandedOrders.has(order.id);
                    const totalRL = Math.round(itens.reduce((a, i) => a + (i.qtdTotal || 0), 0));
                    const totalDisplay = calcTotalDisplay(itens);
                    const totalEntregue = order.entregasParciais
                        ? Object.values(order.entregasParciais).reduce((s, e) => s + (e.itens || []).reduce((ss, it) => ss + Number(it.qtd || 0), 0), 0)
                        : 0;
                    const pctEntrega = totalRL > 0 ? Math.round((totalEntregue / totalRL) * 100) : 0;
                    const risco = riscoMap[order.id] || null;

                    const accentColor = status === "concluido" ? (order.cancelado ? "#DC2626" : "#16A34A")
                        : status === "confirmacao" ? "#F97316"
                        : atrasado ? "#DC2626"
                        : urgente ? "#D97706"
                        : "#3B82F6";

                    const statusLabel = status === "concluido" ? (order.cancelado ? "Cancelado" : "Concluído")
                        : status === "confirmacao" ? "Confirmação"
                        : atrasado ? "Atrasado"
                        : urgente ? "Urgente"
                        : "Em produção";

                    const statusBg = status === "concluido" ? (order.cancelado ? "#FEF2F2" : "#F0FDF4")
                        : status === "confirmacao" ? "#FFF7ED"
                        : atrasado ? "#FEF2F2"
                        : urgente ? "#FFFBEB"
                        : "#EFF6FF";

                    const temEntregaParcial = order.entregasParciais && Object.keys(order.entregasParciais).length > 0;
                    const barPct = temEntregaParcial ? Math.min(pctEntrega, 100) : 0;
                    return (
                        <div key={order.id} style={{
                            borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                            borderLeft: isMobile ? `3px solid ${accentColor}` : "none",
                        }}>
                            {/* Card compacto — clicável para expandir */}
                            <div onClick={() => toggleExpand(order.id)} style={{ padding: isMobile ? "10px 12px" : "14px 20px", cursor: "pointer", display: "flex", flexDirection: "column", gap: isMobile ? 4 : 0 }}>
                                {isMobile ? (
                                    <>
                                        {/* Linha 1: número + cliente + dias + seta */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            {order.numero && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F3F4F6", borderRadius: 5, padding: "1px 5px", flexShrink: 0 }}>
                                                    #{order.numero}
                                                </span>
                                            )}
                                            <VendedorBadge nome={vendedorPorCliente[order.cliente]} />
                                            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {order.cliente || "—"}
                                            </span>
                                            {order.observacao && <span title={order.observacao} style={{ fontSize: 13, flexShrink: 0 }}>📝</span>}
                                            {status !== "concluido" && (
                                                <span style={{ fontSize: 11, fontWeight: 800, color: accentColor, flexShrink: 0 }}>
                                                    {atrasado ? `−${Math.abs(dias)}d` : `${dias}d`}
                                                </span>
                                            )}
                                            <div style={{ fontSize: 11, color: isExpanded ? accentColor : "#D1D5DB", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none", flexShrink: 0 }}>▶</div>
                                        </div>
                                        {/* Linha 2: datas + status + % */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap" }}>
                                                    {order.dataEntrada && <>Ent: {formatDate(order.dataEntrada)}{order.horaLancamento && <span style={{ color: "#D1D5DB" }}> {order.horaLancamento}</span>}{order.criadoPor && <span style={{ color: "#D1D5DB" }}> · {order.criadoPor}</span>}</>}
                                                    {order.dataEntrada && order.dataEntrega && " · "}
                                                    {order.dataEntrega && <span style={{ color: status === "concluido" ? "#16A34A" : atrasado ? "#DC2626" : "#6B7280" }}>Prev: {formatDate(order.dataEntrega)}</span>}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, flexShrink: 0, background: statusBg, color: accentColor, border: `1px solid ${accentColor}30` }}>
                                                {statusLabel}
                                            </span>
                                            {barPct > 0 && (
                                                <span style={{ fontSize: 11, fontWeight: 800, color: pctColor(barPct), flexShrink: 0 }}>{barPct}%</span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
                                        {/* Barra de destaque */}
                                        <div style={{ width: 4, height: 44, borderRadius: 4, background: accentColor, flexShrink: 0 }} />
                                        {/* Cliente + Entrada/Previsão + Nota */}
                                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: "#B4B7C0", flexShrink: 0 }}>#{order.numero || "–"}</span>
                                                <VendedorBadge nome={vendedorPorCliente[order.cliente]} />
                                                <span style={{ fontWeight: 700, fontSize: 13.5, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.cliente || "—"}</span>
                                            </div>
                                            {(order.dataEntrada || order.dataEntrega) && (
                                                <div style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }} title={order.criadoPor ? `Lançado por ${order.criadoPor}` : undefined}>
                                                    {order.dataEntrada && <>Entrada: {formatDate(order.dataEntrada)}{order.horaLancamento && <span style={{ color: "#D1D5DB" }}> {order.horaLancamento}</span>}{order.criadoPor && <span style={{ color: "#D1D5DB" }}> · {order.criadoPor}</span>}</>}
                                                    {order.dataEntrada && order.dataEntrega && "  ·  "}
                                                    {order.dataEntrega && <span style={{ color: status === "concluido" ? "#16A34A" : atrasado ? "#DC2626" : "#9CA3AF" }}>Previsão: {formatDate(order.dataEntrega)}</span>}
                                                </div>
                                            )}
                                            {order.observacao && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, overflow: "hidden" }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={urgente || atrasado ? "#C2410C" : "#6B7280"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                                    <span style={{ fontSize: 10.5, fontWeight: 700, color: urgente || atrasado ? "#C2410C" : "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.observacao}</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Barra + % */}
                                        <div style={{ width: 170, flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ flex: 1, height: 7, background: "#EEF0F3", borderRadius: 4, overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${barPct}%`, background: pctColor(barPct), borderRadius: 4, transition: "width 0.3s" }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: pctColor(barPct), minWidth: 32, textAlign: "right" }}>{barPct}%</span>
                                        </div>
                                        {/* Qtd */}
                                        <div style={{ width: 96, flexShrink: 0, textAlign: "right", lineHeight: 1.35 }}>
                                            {totalDisplay.split(" · ").map((parte, i) => (
                                                <div key={i} style={{ fontWeight: i === 0 ? 700 : 500, fontSize: i === 0 ? 13 : 11, color: i === 0 ? "#111827" : "#9CA3AF", whiteSpace: "nowrap" }}>{parte}</div>
                                            ))}
                                        </div>
                                        {/* Status + dias/conclusão */}
                                        <div style={{ width: 128, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, padding: "3px 8px", borderRadius: 7, fontWeight: 800, background: statusBg, color: accentColor, whiteSpace: "nowrap" }}>
                                                {(urgente || atrasado) && status !== "concluido" && (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                                )}
                                                {statusLabel.toUpperCase()}
                                            </span>
                                            {status === "concluido" && order.dataConclusao ? (
                                                <span style={{ fontSize: 10.5, color: "#9CA3AF", fontWeight: 700 }}>{formatDate(order.dataConclusao)}</span>
                                            ) : status !== "concluido" && (
                                                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF" }}>
                                                    {atrasado ? `−${Math.abs(dias)}d` : `${dias}d`}
                                                </span>
                                            )}
                                        </div>
                                        {/* Seta */}
                                        <div style={{
                                            width: 30, height: 30, borderRadius: 8, border: "1px solid #ECEDF1",
                                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isExpanded ? accentColor : "#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                                                <polyline points="9 6 15 12 9 18" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Itens expandidos */}
                            {isExpanded && (() => {
                                const entregas = order.entregasParciais
                                    ? Object.entries(order.entregasParciais).map(([key, val]) => ({ ...val, key })).sort((a, b) => a.data?.localeCompare(b.data))
                                    : [];

                                // Qtd entregue por item — calculado só pelas entregas parciais
                                const entregueMap = {};
                                const entregueOrigMap = {};
                                entregas.forEach(e => {
                                    const itensE = Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {});
                                    itensE.forEach(ei => {
                                        const k = `${(ei.cor||"").toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                                        entregueMap[k] = (entregueMap[k] || 0) + Number(ei.qtd || 0);
                                        entregueOrigMap[k] = (entregueOrigMap[k] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                                    });
                                });
                                const getE = it => entregueMap[`${(it.cor||"").toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`] || 0;
                                const getEOrig = it => entregueOrigMap[`${(it.cor||"").toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`] || 0;
                                const getPct = it => { const e = getE(it); return (it.qtdTotal||0) > 0 ? e / (it.qtdTotal||0) : 0; };
                                const sortItens = arr => [...arr].sort((a, b) => {
                                    const ma = parseInt(a.medida) || 0, mb = parseInt(b.medida) || 0;
                                    if (ma !== mb) return ma - mb;
                                    return getPct(a) - getPct(b);
                                });
                                const itensSemEntrega = sortItens(itens.filter(it => getE(it) === 0));
                                const itensFinalizando = sortItens(itens.filter(it => { const e = getE(it); return e > 0 && (it.qtdTotal||0) - e > 0; }));
                                const itensEntregues = sortItens(itens.filter(it => { const e = getE(it); return e > 0 && (it.qtdTotal||0) - e <= 0; }));
                                    const renderItem = (it, i, arr, bgColor) => {
                                        const unidade = it.unidadeOriginal || "RL";
                                        const usaOrig = unidade !== "RL" && it.qtdOriginal;
                                        const totalDisp = usaOrig ? it.qtdOriginal : (it.qtdTotal || 0);
                                        const entregueDisp = usaOrig ? getEOrig(it) : getE(it);
                                        const faltaDisplay = Math.max(0, totalDisp - entregueDisp);
                                        const entregue = getE(it);
                                        return (
                                            <div key={it.id || i} style={{
                                                padding: isMobile ? "10px 14px" : "10px 20px 10px 52px",
                                                borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none",
                                                background: bgColor,
                                            }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                                                    <CorInline cor={it.cor} />{it.medida} {it.cor}
                                                    <TipoBadge tipo={it.tipo} />
                                                </div>
                                                <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                                                        {unidade !== "RL" ? `${it.qtdOriginal} ${unidade}` : `${it.qtdTotal.toLocaleString("pt-BR")} RL`}
                                                    </span>
                                                    {faltaDisplay <= 0
                                                        ? <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700 }}>✓ entregue</span>
                                                        : entregue > 0
                                                            ? <span style={{ fontSize: 11, color: "#F97316", fontWeight: 700 }}>· falta {faltaDisplay.toLocaleString("pt-BR")} {unidade}</span>
                                                            : null
                                                    }
                                                    {it.rolo25m && <span style={{ fontSize: 11, color: "#EA580C", fontWeight: 700 }}>· 🔄 {Math.round((it.qtdTotal || 0) * FATOR_ROLO_25M)} rolos de 25m</span>}
                                                </div>
                                            </div>
                                        );
                                    };
                                const TIPO_ORDER_PED = ["Gorgurão", "Poliéster", "Elástico"];
                                const renderSecao = (lista, bgColor, headerLabel, headerBg, headerBorder, headerColor) => {
                                    if (!lista.length) return null;
                                    const tipos = TIPO_ORDER_PED.filter(t => lista.some(it => it.tipo === t))
                                        .concat([...new Set(lista.map(it => it.tipo).filter(t => !TIPO_ORDER_PED.includes(t)))]);
                                    return (
                                        <>
                                            <div style={{ padding: "4px 20px 4px 52px", background: headerBg, borderTop: `1px solid ${headerBorder}`, borderBottom: `1px solid ${headerBorder}`, fontSize: 10, fontWeight: 700, color: headerColor, letterSpacing: "0.06em" }}>
                                                {headerLabel}
                                            </div>
                                            {tipos.map(tipo => {
                                                const sub = lista.filter(it => it.tipo === tipo);
                                                const tc = TIPO_COLOR[tipo] || "#6B7280";
                                                const tb = TIPO_BG[tipo] || "#F3F4F6";
                                                return (
                                                    <div key={tipo}>
                                                        {tipos.length > 1 && (
                                                            <div style={{ padding: "3px 20px 3px 52px", background: tb, fontSize: 9, fontWeight: 700, color: tc, letterSpacing: "0.08em" }}>
                                                                {tipo.toUpperCase()}
                                                            </div>
                                                        )}
                                                        {sub.map((it, i) => renderItem(it, i, sub, bgColor))}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                };
                                return (
                                <div style={{ background: "#F9FAFB", borderTop: "1px solid #F3F4F6" }}>
                                    <div>
                                        {renderSecao(itensSemEntrega, "#fff", "PENDENTES", "#F9FAFB", "#ECEDF1", "#6B7280")}
                                        {renderSecao(itensFinalizando, "#FFF7ED", "FINALIZANDO", "#FFEDD5", "#FDBA74", "#EA580C")}
                                        {renderSecao(itensEntregues, "#F0FDF4", "✓ ENTREGUES", "#F0FDF4", "#BBF7D0", "#16A34A")}
                                    </div>

                                        {/* Histórico de entregas parciais */}
                                        {entregas.length > 0 && (
                                            <div style={{ padding: "12px 20px 12px 52px", borderTop: "1px solid #ECEDF1" }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>ENTREGAS REALIZADAS</div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                    {entregas.map((e, i) => {
                                                        const itensE = Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {});
                                                        const unidsE = [...new Set(itensE.map(it => it.unidadeOriginal).filter(Boolean))];
                                                        const usaOrigE = unidsE.length === 1;
                                                        const totalE = itensE.reduce((a, it) => a + Number(usaOrigE ? (it.qtdOriginal || it.qtd) : it.qtd), 0);
                                                        const unidE = usaOrigE ? unidsE[0] : "RL";
                                                        return (
                                                            <div key={i} style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 12px" }}>
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: itensE.length ? 6 : 0 }}>
                                                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{e.data}{e.hora ? ` ${e.hora}` : ""} · {totalE.toLocaleString("pt-BR")} {unidE}</span>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{e.registradoPor}</span>
                                                                        {(podeEditar || isAdmin) && <button onClick={() => abrirEntrega(order, e)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid #ECEDF1", background: "#fff", color: "#6B7280", cursor: "pointer" }}>Editar</button>}
                                                                        {(podeEditar || isAdmin) && <button onClick={() => { if (window.confirm("Excluir esta entrega?")) onDeleteEntregaParcial(order.id, e.key); }} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" }}>Excluir</button>}
                                                                    </div>
                                                                </div>
                                                                {itensE.map((it, j) => (
                                                                    <div key={j} style={{ fontSize: 12, color: "#374151", display: "flex", gap: 8 }}>
                                                                        <span style={{ color: "#9CA3AF" }}>—</span>
                                                                        <span style={{ fontWeight: 600 }}>{it.cor}</span>
                                                                        <span style={{ color: "#6B7280" }}>
                                                                            {it.medida} · {it.qtdOriginal ? `${Number(it.qtdOriginal).toLocaleString("pt-BR")} ${it.unidadeOriginal}` : `${Number(it.qtd).toLocaleString("pt-BR")} RL`}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {e.obs && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{e.obs}</div>}
                                                            </div>
                                                        );
                                                    })}
                                                    <div style={{ fontSize: 12, color: "#374151", fontWeight: 700 }}>
                                                        {(() => {
                                                            const allIts = entregas.flatMap(e => Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {}));
                                                            const unidsAll = [...new Set(allIts.map(it => it.unidadeOriginal).filter(Boolean))];
                                                            const usaOrig = unidsAll.length === 1;
                                                            const total = allIts.reduce((a, it) => a + Number(usaOrig ? (it.qtdOriginal || it.qtd) : it.qtd), 0);
                                                            const unid = usaOrig ? unidsAll[0] : "RL";
                                                            return `Total entregue: ${total.toLocaleString("pt-BR")} ${unid}`;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Observação */}
                                        {order.observacao && (
                                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 16px", borderTop: "1px solid #ECEDF1", background: "#FFFBEB" }}>
                                                <span style={{ fontSize: 13, flexShrink: 0 }}>📝</span>
                                                <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>{order.observacao}</div>
                                            </div>
                                        )}

                                        {/* Botões de ação */}
                                        {(isAdmin || canPrint) && (
                                            <div style={{ padding: "10px 16px", borderTop: "1px solid #ECEDF1", display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                                                {podeEditar && status === "confirmacao" && (
                                                    <button onClick={() => { setNovaData(order.dataEntrega || ""); setModalConfirm({ order }); }} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#F97316", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                                        Responder
                                                    </button>
                                                )}
                                                {(podeEditar || isAdmin) && status === "em_producao" && (
                                                    <>
                                                        <button onClick={() => { setNovaData(order.dataEntrega || ""); setModalConfirm({ order }); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #FED7AA", background: "#FFF7ED", color: "#D97706", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                                            Solicitar conf.
                                                        </button>
                                                        <button onClick={() => abrirEntrega(order)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                                            Entrega parcial
                                                        </button>
                                                        <button onClick={() => { setModalEntregar(order); setEntregarDescontarEstoque(true); }} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                                            ✓ Entregar
                                                        </button>
                                                    </>
                                                )}
                                                {(podeEditar || isAdmin) && (status === "em_producao" || status === "confirmacao") && (
                                                    <button onClick={() => setModalCancelar(order)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                                        ✕ Cancelar
                                                    </button>
                                                )}
                                                {(podeEditar || isAdmin) && status === "concluido" && onReverterConclusao && (
                                                    <button onClick={() => { if (window.confirm("Reverter a entrega deste pedido? Ele volta para \"Em produção\" e o estoque descontado é devolvido.")) onReverterConclusao(order.id); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #FDE68A", background: "#FFFBEB", color: "#B45309", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                                        ↩ Reverter entrega
                                                    </button>
                                                )}
                                                {canPrint && (
                                                    <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
                                                        {/* Botão único de impressão com dropdown via portal */}
                                                        <div>
                                                            <button
                                                                onMouseDown={e => e.stopPropagation()}
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    if (printMenuAberto === order.id) { closePrintMenu(); return; }
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setPrintMenuAberto(order.id);
                                                                    setPrintMenuOrder(order);
                                                                    const openUp = window.innerHeight - rect.bottom < 100;
                                                                    setPrintMenuPos({ top: openUp ? undefined : rect.bottom + 4, bottom: openUp ? window.innerHeight - rect.top + 4 : undefined, right: window.innerWidth - rect.right });
                                                                }}
                                                                style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #BFDBFE", background: printMenuAberto === order.id ? "#DBEAFE" : "#EFF6FF", color: "#2563EB", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                                                            >
                                                                🖨 Imprimir ▾
                                                            </button>
                                                        </div>
                                                        {podeEditar && <button onClick={() => setEditingOrder(order)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#6B7280", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Editar</button>}
                                                        {(podeEditar || isAdmin) && <button onClick={() => { if (window.confirm("Excluir este pedido?")) onDelete(order.id); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Excluir</button>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Painel etiquetas */}
                                        {podeEditar && etiquetaAberto.has(order.id) && onSolicitar && (
                                            <div style={{ padding: "10px 16px", borderTop: "1px solid #E0F2FE", background: "#F0F9FF" }} onClick={e => e.stopPropagation()}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: "#0891B2", letterSpacing: "0.06em", marginBottom: 6 }}>🖨 IMPRIMIR ETIQUETA</div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                                                    {itens.map((it, i) => (
                                                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: "#fff", borderRadius: 6, padding: "4px 8px", border: "1px solid #E0F2FE" }}>
                                                            <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.medida} {it.cor}</span>
                                                            <button onClick={() => onSolicitar({ tipo: it.tipo, cor: it.cor, medida: it.medida, quantidade: it.qtdTotal || 1, unidade: it.unidadeOriginal || "RL", copies: 1, solicitadoPor: userName || "—", timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), status: "pendente" })} style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #BAE6FD", background: "#E0F2FE", color: "#0369A1", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                                                                Imp.
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

