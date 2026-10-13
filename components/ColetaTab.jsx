import { useState, useEffect, useMemo } from "react";
import { parseTimestampBR } from "../utils";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const fn = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", fn);
        return () => window.removeEventListener("resize", fn);
    }, []);
    return m;
}

const inputStyle = {
    width: "100%", padding: "10px 12px", fontSize: 13,
    border: "1px solid #ECEDF1", borderRadius: 8,
    background: "#F9FAFB", color: "#111827", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit", resize: "vertical",
};

const tc = "#DC2626"; // vermelho — chama atenção, é um aviso de coleta
const tb = "#FEF2F2";

function tog(active, color) {
    return {
        flex: 1, padding: "9px 8px", borderRadius: 7, cursor: "pointer", fontSize: 13,
        border: `1.5px solid ${active ? color : "#ECEDF1"}`,
        background: active ? color + "18" : "#F9FAFB",
        color: active ? color : "#6B7280",
        fontWeight: active ? 700 : 500,
    };
}

function dataDoItem(item) {
    return item.timestamp ? item.timestamp.split(",")[0].trim() : "Sem data";
}

// ─── Modal "Nova Coleta" ─────────────────────────────────────────────────────
function FormColeta({ onSubmit, onCancelar, vendedores = [] }) {
    const [descricao, setDescricao] = useState("");
    const [vendedor, setVendedor]   = useState("");
    const [urgente, setUrgente]     = useState(false);

    const pronto = Boolean(descricao.trim());

    const handleSubmit = () => {
        if (!pronto) return;
        onSubmit({ descricao: descricao.trim(), vendedor: vendedor || null, urgente });
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 20 }}>Nova Coleta</div>

                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 8 }}>O QUE TEM PARA COLETAR</div>
                    <textarea
                        autoFocus
                        rows={3}
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Ex: 5 caixas de fita gorgurão, pedido do cliente X..."
                        style={inputStyle}
                    />
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 8 }}>VENDEDOR</div>
                    <select value={vendedor} onChange={e => setVendedor(e.target.value)} style={inputStyle}>
                        <option value="">Sem vendedor</option>
                        {vendedores.map(v => <option key={v.key} value={v.nome}>{v.nome}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 8 }}>PRIORIDADE</div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => setUrgente(false)} style={tog(!urgente, "#6B7280")}>Normal</button>
                        <button type="button" onClick={() => setUrgente(true)} style={tog(urgente, tc)}>🔴 Urgente</button>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={onCancelar} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleSubmit} disabled={!pronto} style={{
                        flex: 2, padding: "10px", borderRadius: 8, border: "none",
                        background: pronto ? tc : "#ECEDF1",
                        color: pronto ? "#fff" : "#9CA3AF",
                        fontWeight: 700, fontSize: 13, cursor: pronto ? "pointer" : "not-allowed",
                    }}>
                        📦 Solicitar Coleta
                    </button>
                </div>
            </div>
        </div>
    );
}

function ItemCard({ item, isMobile, onMarcarColetado, onExcluir }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: isMobile ? "12px" : "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            {item.urgente && (
                <span style={{ fontSize: 11, fontWeight: 700, color: tc, background: tb, padding: "2px 7px", borderRadius: 5, flexShrink: 0 }}>
                    URGENTE
                </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{item.descricao}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {item.vendedor && <span style={{ fontWeight: 600, color: "#6366F1" }}>{item.vendedor} · </span>}
                    Pedido por {item.solicitadoPor} · {item.timestamp}
                </div>
                {item.finalizadoPor && (
                    <div style={{ fontSize: 11, color: "#16A34A", marginTop: 2, fontWeight: 600 }}>
                        ✓ Coletado por {item.finalizadoPor}
                    </div>
                )}
            </div>
            {item.status === "pendente" ? (
                onMarcarColetado && (
                    <button onClick={() => onMarcarColetado(item.id)} style={{ fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, border: "1px solid #BBF7D0", background: "#F0FDF4", color: "#16A34A", cursor: "pointer", flexShrink: 0 }}>
                        Marcar coletado
                    </button>
                )
            ) : (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", flexShrink: 0 }}>
                    ✓ Coletado
                </span>
            )}
            {onExcluir && (
                <button onClick={() => { if (window.confirm("Excluir este registro do histórico?")) onExcluir(item.id); }} title="Excluir" style={{ fontSize: 11, fontWeight: 600, padding: "5px 8px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", flexShrink: 0 }}>
                    🗑
                </button>
            )}
        </div>
    );
}

export default function ColetaTab({ fila = [], onSolicitar, onMarcarColetado, onExcluir, vendedores = [], userName, userRole, podeEditar = true }) {
    const isMobile = useIsMobile();
    const isAdmin = userRole === "admin";
    const marcarColetado = (podeEditar && onMarcarColetado) ? (id) => onMarcarColetado(id, userName || "—") : null;

    const [showForm, setShowForm]   = useState(false);
    const [abaAtiva, setAbaAtiva]   = useState("nova");
    const [buscaHistorico, setBuscaHistorico] = useState("");
    const [diasAbertos, setDiasAbertos] = useState(new Set());
    const toggleDia = (dia) => setDiasAbertos(prev => { const n = new Set(prev); n.has(dia) ? n.delete(dia) : n.add(dia); return n; });

    const handleSubmit = (dados) => {
        onSolicitar({
            ...dados,
            solicitadoPor: userName || "—",
            timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            status: "pendente",
        });
        setShowForm(false);
    };

    const pendentes = useMemo(() =>
        (fila || []).filter(f => f.status === "pendente").sort((a, b) => parseTimestampBR(b.timestamp) - parseTimestampBR(a.timestamp)),
        [fila]
    );
    const coletados = useMemo(() =>
        (fila || []).filter(f => f.status === "coletado").sort((a, b) => parseTimestampBR(b.timestamp) - parseTimestampBR(a.timestamp)),
        [fila]
    );

    const coletadosFiltrados = useMemo(() => {
        const termo = buscaHistorico.trim().toLowerCase();
        if (!termo) return coletados;
        return coletados.filter(h =>
            (h.descricao || "").toLowerCase().includes(termo) ||
            (h.vendedor || "").toLowerCase().includes(termo) ||
            (h.solicitadoPor || "").toLowerCase().includes(termo)
        );
    }, [coletados, buscaHistorico]);

    const gruposHistorico = useMemo(() => {
        const map = new Map();
        coletadosFiltrados.forEach(h => {
            const dia = dataDoItem(h);
            if (!map.has(dia)) map.set(dia, []);
            map.get(dia).push(h);
        });
        return Array.from(map.entries()).map(([dia, itens]) => ({ dia, itens }));
    }, [coletadosFiltrados]);

    return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px", maxWidth: 700, margin: "0 auto" }}>
            {podeEditar && showForm && (
                <FormColeta onSubmit={handleSubmit} onCancelar={() => setShowForm(false)} vendedores={vendedores} />
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                <div>
                    <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#111827" }}>Solicitação de Coleta</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>Avisa a loja que tem material pronto para buscar na indústria</div>
                </div>
                {podeEditar && (
                <button onClick={() => setShowForm(true)} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
                    background: tc, border: "none", borderRadius: 8, fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 700,
                }}>
                    + Nova Coleta
                </button>
                )}
            </div>

            {/* Abas */}
            <div style={{ display: "flex", marginBottom: 20, background: "#F3F4F6", borderRadius: 10, padding: 3 }}>
                {[
                    { id: "nova", label: `Pendentes${pendentes.length ? ` (${pendentes.length})` : ""}` },
                    { id: "historico", label: `Histórico (${coletados.length})` },
                ].map(a => (
                    <button key={a.id} onClick={() => setAbaAtiva(a.id)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: abaAtiva === a.id ? 700 : 500, background: abaAtiva === a.id ? "#fff" : "transparent", color: abaAtiva === a.id ? "#111827" : "#6B7280", cursor: "pointer", boxShadow: abaAtiva === a.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                        {a.label}
                    </button>
                ))}
            </div>

            {abaAtiva === "nova" && (
                pendentes.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {pendentes.map(item => (
                            <ItemCard key={item.id} item={item} isMobile={isMobile} onMarcarColetado={marcarColetado} />
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14, background: "#F9FAFB", borderRadius: 12 }}>
                        Nenhuma coleta pendente. Clique em "+ Nova Coleta" para solicitar.
                    </div>
                )
            )}

            {abaAtiva === "historico" && (
                <div>
                    {coletados.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14, background: "#F9FAFB", borderRadius: 12 }}>
                            Nenhuma coleta concluída ainda.
                        </div>
                    ) : (
                        <>
                            <div style={{ position: "relative", marginBottom: 14 }}>
                                <input
                                    value={buscaHistorico}
                                    onChange={e => setBuscaHistorico(e.target.value)}
                                    placeholder="Buscar por descrição, vendedor ou solicitante..."
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
                                        const aberto = diasAbertos.has(grupo.dia);
                                        return (
                                            <div key={grupo.dia} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                                                <div onClick={() => toggleDia(grupo.dia)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: aberto ? "#F3F4F6" : "#F9FAFB" }}>
                                                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                                                        <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>{grupo.dia}</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 20, padding: "2px 9px" }}>
                                                            {grupo.itens.length} coleta{grupo.itens.length !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                                                </div>
                                                {aberto && (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px 10px", background: "#FAFAFA" }}>
                                                        {grupo.itens.map(item => (
                                                            <ItemCard key={item.id} item={item} isMobile={isMobile} onMarcarColetado={null} onExcluir={(isAdmin || podeEditar) ? onExcluir : null} />
                                                        ))}
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
