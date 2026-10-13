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

const fmtQtd = (v) => Number(v || 0).toLocaleString("pt-BR");

const parseTS = (ts) => {
    if (!ts || typeof ts !== "string") return 0;
    const [d, mo, y] = (ts.split(", ")[0] || "").split("/");
    const t = ts.split(", ")[1] || "00:00:00";
    return new Date(`${y}-${mo}-${d}T${t}`).getTime() || 0;
};

export default function ViesProducaoTab({ lancamentos = [], diasFinalizados = [], userName, isAdmin, onAdd, onEdit, onDelete, onReabrirDia, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [medida, setMedida] = useState("2,5 cm");
    const [cor, setCor] = useState("");
    const [qtd, setQtd] = useState("");
    const [histAberto, setHistAberto] = useState(false);
    const [diasAbertos, setDiasAbertos] = useState(new Set());
    const toggleDia = (dia) => setDiasAbertos(prev => { const n = new Set(prev); n.has(dia) ? n.delete(dia) : n.add(dia); return n; });
    const [modalEdit, setModalEdit] = useState(null); // { l, qtd, medida }

    const hoje = new Date().toLocaleDateString("pt-BR");
    const finalizacaoHoje = diasFinalizados.find(d => d.data === hoje);
    const diaFinalizado = !!finalizacaoHoje;

    const handleRegistrar = () => {
        const qtdNum = parseNum(qtd);
        if (qtdNum <= 0 || !cor || diaFinalizado) return;
        const agora = new Date();
        onAdd({
            medida, cor, qtd: qtdNum,
            operador: userName,
            data: agora.toLocaleDateString("pt-BR"),
            hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        });
        setQtd(""); setCor("");
    };

    const hist = [...lancamentos].sort((a, b) => parseTS(b.timestamp) - parseTS(a.timestamp));
    const porDia = {};
    hist.forEach(l => {
        const dia = l.data || "—";
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(l);
    });
    const diasFinalizadosMap = {};
    diasFinalizados.forEach(d => { diasFinalizadosMap[d.data] = d; });

    const sel = { padding: "7px 10px", borderRadius: 7, border: "1px solid #ECEDF1", fontSize: 13, background: "#F9FAFB", width: "100%", boxSizing: "border-box" };
    const lbl = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 };

    return (
        <div style={{ padding: isMobile ? "16px 12px" : 24, maxWidth: 820, margin: "0 auto" }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Apontamento de Viés</h2>
                <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Registre a produção por medida e cor de viés.</p>
            </div>

            {/* Formulário */}
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: 20, marginBottom: 24 }}>
                {diaFinalizado ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>✓</span>
                        <div style={{ flex: 1, fontSize: 13, color: "#166534" }}>
                            <b>Dia finalizado</b> por {finalizacaoHoje.finalizadoPor} {finalizacaoHoje.timestamp ? `às ${finalizacaoHoje.timestamp.split(", ")[1] || finalizacaoHoje.timestamp}` : ""}
                        </div>
                        {(isAdmin || podeEditar) && (
                            <button onClick={() => onReabrirDia(hoje)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                                Reabrir dia
                            </button>
                        )}
                    </div>
                ) : podeEditar ? (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
                            <div>
                                <label style={lbl}>MEDIDA</label>
                                <select value={medida} onChange={e => setMedida(e.target.value)} style={sel}>
                                    {MEDIDAS_VIES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={lbl}>COR</label>
                                <CorSelect value={cor} onChange={e => setCor(e.target.value)} options={CORES_VIES} placeholder="Selecione a cor" style={sel} />
                            </div>
                            <div>
                                <label style={lbl}>QUANTIDADE</label>
                                <input type="text" inputMode="numeric" value={qtd} onChange={e => setQtd(fmtInt(e.target.value))} placeholder="0" style={sel} />
                            </div>
                        </div>
                        <button onClick={handleRegistrar} disabled={parseNum(qtd) <= 0 || !cor} style={{
                            width: "100%", padding: 10, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14,
                            background: (parseNum(qtd) > 0 && cor) ? (MEDIDA_VIES_COLOR[medida] || COLOR) : "#ECEDF1",
                            color: (parseNum(qtd) > 0 && cor) ? "#fff" : "#9CA3AF",
                            cursor: (parseNum(qtd) > 0 && cor) ? "pointer" : "not-allowed",
                        }}>
                            Registrar Apontamento
                        </button>
                    </>
                ) : null}
            </div>

            {/* Modal editar */}
            {podeEditar && modalEdit && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 360 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Apontamento</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>{modalEdit.l.cor} · {modalEdit.l.data} {modalEdit.l.hora}</div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>MEDIDA</label>
                            <select value={modalEdit.medida} onChange={e => setModalEdit(p => ({ ...p, medida: e.target.value }))} style={{ ...sel, width: "100%" }}>
                                {[...new Set([...MEDIDAS_VIES, modalEdit.l.medida].filter(Boolean))].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={lbl}>QUANTIDADE</label>
                            <input type="text" inputMode="numeric" value={modalEdit.qtd} onChange={e => setModalEdit(p => ({ ...p, qtd: fmtInt(e.target.value) }))} style={{ ...sel, width: "100%" }} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setModalEdit(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={() => { onEdit(modalEdit.l.id, { qtd: parseNum(modalEdit.qtd), medida: modalEdit.medida }); setModalEdit(null); }} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: COLOR, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Histórico */}
            {hist.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                    <div onClick={() => setHistAberto(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", background: histAberto ? "#F9FAFB" : "#fff", borderBottom: histAberto ? "1px solid #ECEDF1" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Histórico de Apontamentos</span>
                            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{hist.length} registro{hist.length !== 1 ? "s" : ""}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{histAberto ? "▲" : "▼"}</span>
                    </div>
                    {histAberto && Object.entries(porDia).map(([dia, itens]) => {
                        const totalDia = itens.reduce((s, l) => s + (Number(l.qtd) || 0), 0);
                        const aberto = diasAbertos.has(dia);
                        return (
                            <div key={dia} style={{ margin: "10px 14px", border: "1px solid #ECEDF1", borderRadius: 10, overflow: "hidden" }}>
                                <div onClick={() => toggleDia(dia)} style={{ padding: "8px 12px", background: "#F9FAFB", borderBottom: aberto ? "1px solid #ECEDF1" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{dia}</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: COLOR, background: "#FDF2F8", borderRadius: 10, padding: "1px 8px" }}>{fmtQtd(totalDia)} un.</span>
                                    {diasFinalizadosMap[dia] && <span style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#F0FDF4", borderRadius: 10, padding: "1px 8px" }}>✓ Finalizado</span>}
                                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>{itens.length} lanç. {aberto ? "▲" : "▼"}</span>
                                </div>
                                {aberto && itens.map((l, i) => (
                                    <div key={l.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: i < itens.length - 1 ? "1px solid #F9FAFB" : "none", borderLeft: `3px solid ${(MEDIDA_VIES_COLOR[l.medida] || "#9CA3AF")}50` }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: MEDIDA_VIES_COLOR[l.medida] || "#6B7280", flexShrink: 0 }}>{l.medida}</span>
                                        <div style={{ flex: 1, fontSize: 12, color: "#374151", display: "flex", alignItems: "center" }}>
                                            {l.cor && <CorInline cor={l.cor} />}
                                            {l.cor && <span style={{ marginRight: 6 }}>{l.cor}</span>}
                                            <b>{fmtQtd(l.qtd)}</b>&nbsp;un.
                                        </div>
                                        <div style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0, textAlign: "right" }}>
                                            <div>{l.operador}</div>
                                            <div>{l.hora}</div>
                                        </div>
                                        {(isAdmin || podeEditar) && (
                                            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                                                <button onClick={() => setModalEdit({ l, qtd: String(l.qtd), medida: l.medida })} title="Editar" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 11, cursor: "pointer" }}>✏</button>
                                                <button onClick={() => { if (window.confirm("Excluir este apontamento?")) onDelete(l.id); }} title="Excluir" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 11, cursor: "pointer" }}>✕</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {hist.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "#9CA3AF", fontSize: 14 }}>
                    Nenhum apontamento registrado ainda.
                </div>
            )}
        </div>
    );
}
