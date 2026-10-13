import { useState, useEffect } from "react";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return isMobile;
}
import { ref, update, remove, push } from "firebase/database";
import { db } from "../firebase";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorDot } from "../utils/CorDot";

const COLOR = "#10B981";
const TURNO_INFO = {
    1: { label: "Turno 1", horario: "Diurno",  color: COLOR },
    4: { label: "Bônus",   horario: "Sábado",  color: "#EAB308" },
};

function TurnoDetalheElastico({ lans, isAdmin, onEdit, isMobile, podeEditar = true }) {
    const mm = s => parseInt((s || "0").replace("mm", ""), 10);

    if ((isAdmin || podeEditar) && isMobile) {
        const sorted = [...lans].sort((a, b) =>
            mm(a.medida) - mm(b.medida) || (a.cor || "").localeCompare(b.cor || "")
        );
        return (
            <div style={{ borderTop: "1px solid #F3F4F6" }}>
                {sorted.map((l, i) => {
                    const isMetro = l.unidade === "Metros" || l.unidade === "Metro";
                    const valor = isMetro ? (l.metros > 0 ? `${l.metros} m` : "–") : `${l.qtd} RL`;
                    return (
                        <div key={l.firebaseKey || i} style={{
                            padding: "10px 14px", borderBottom: i < sorted.length - 1 ? "1px solid #F3F4F6" : "none",
                            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                        }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                    {l.maquinaId && <span style={{ fontSize: 11, fontWeight: 700, color: COLOR }}>M{l.maquinaId}</span>}
                                    <span style={{ fontSize: 11, fontWeight: 700, color: COLOR, background: COLOR + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.cor}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>
                                    <span style={{ fontWeight: 700, color: isMetro ? "#0891B2" : COLOR }}>{valor}</span>
                                    {l.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0] && <span style={{ marginLeft: 8, color: "#9CA3AF" }}>{l.timestamp.match(/\d{2}:\d{2}(?::\d{2})?/)[0]}</span>}
                                </div>
                            </div>
                            {podeEditar && (
                                <button onClick={() => onEdit(l)} style={{
                                    fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 6,
                                    border: "1px solid #ECEDF1", background: "#F9FAFB",
                                    color: "#6B7280", cursor: "pointer", flexShrink: 0,
                                }}>Editar</button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    if (isAdmin || podeEditar) {
        const sorted = [...lans].sort((a, b) =>
            mm(a.medida) - mm(b.medida) || (a.cor || "").localeCompare(b.cor || "")
        );
        return (
            <div style={{ borderTop: "1px solid #F3F4F6" }}>
                <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 56px 64px", gap: 8, padding: "6px 16px", background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                    {["MÁQ.", "COR / MEDIDA", "QTDE", "HORA", ""].map((h, i) => (
                        <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em" }}>{h}</div>
                    ))}
                </div>
                {sorted.map((l, i) => {
                    const isMetro = l.unidade === "Metros" || l.unidade === "Metro";
                    const valor = isMetro ? (l.metros > 0 ? `${l.metros} m` : "–") : `${l.qtd} RL`;
                    return (
                        <div key={l.firebaseKey || i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 56px 64px", gap: 8, padding: "8px 16px", alignItems: "center", borderBottom: i < sorted.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>{l.maquinaId ? `M${l.maquinaId}` : "–"}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: COLOR, background: COLOR + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.cor}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isMetro ? "#0891B2" : COLOR }}>{valor}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{l.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0] || "–"}</div>
                            {podeEditar && (
                                <button onClick={() => onEdit(l)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#6B7280", cursor: "pointer" }}>Editar</button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Modo normal: agrupa por máquina+medida+cor
    const grupos = {};
    lans.forEach(l => {
        const k = `${l.maquinaId}|${l.medida}|${l.cor}`;
        if (!grupos[k]) grupos[k] = { maquinaId: l.maquinaId, medida: l.medida, cor: l.cor, qtd: 0, metros: 0 };
        grupos[k].qtd    += l.qtd    || 0;
        grupos[k].metros += Number(l.metros) || 0;
    });
    const linhas = Object.values(grupos).sort((a, b) =>
        Number(a.maquinaId) - Number(b.maquinaId) || mm(a.medida) - mm(b.medida)
    );

    return (
        <div style={{ borderTop: "1px solid #F3F4F6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr", gap: 8, padding: "6px 16px", background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                {["MÁQ.", "COR / MEDIDA", "QTDE"].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em" }}>{h}</div>
                ))}
            </div>
            {linhas.map((l, i) => {
                const temMetro = l.metros > 0;
                const temRL    = l.qtd > 0;
                return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr", gap: 8, padding: "9px 16px", alignItems: "center", borderBottom: i < linhas.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>{l.maquinaId ? `M${l.maquinaId}` : "–"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: COLOR, background: COLOR + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.cor}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            {temRL    && <span style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>{l.qtd.toLocaleString("pt-BR")} RL</span>}
                            {temMetro && <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{l.metros.toLocaleString("pt-BR")} m</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function HistoricoElasticoTab({ logs, turnoFinalizacoes = [], isAdmin = false, onEditarDefeitosKg, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [abertos, setAbertos] = useState({});
    const [filtroDE, setFiltroDE] = useState("");
    const [filtroATE, setFiltroATE] = useState("");
    const [editLog, setEditLog] = useState(null);
    const [addLan, setAddLan] = useState(null);
    const [addForm, setAddForm] = useState({ medida: "25mm", cor: "", unidade: "RL", qtd: "", metros: "", maquinaId: "" });
    const [editDefKg, setEditDefKg] = useState(null); // { fin, valor }

    const toggle = key => setAbertos(p => ({ ...p, [key]: !p[key] }));

    const handleAddLan = async () => {
        if (!addLan || !addForm.cor.trim() || !addForm.medida.trim()) return;
        const isMetro = addForm.unidade === "Metros";
        const entry = {
            tipo: "Elástico",
            turno: Number(addLan.turno),
            turnoInicio: addLan.turnoInicio,
            medida: addForm.medida.trim(),
            cor: addForm.cor.trim(),
            unidade: addForm.unidade,
            qtd: isMetro ? 0 : Number(addForm.qtd) || 0,
            metros: isMetro ? Number(addForm.metros) || 0 : 0,
            maquinaId: addForm.maquinaId || null,
            timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            adicionadoManualmente: true,
        };
        await push(ref(db, "logs"), entry);
        setAddLan(null);
        setAddForm({ medida: "25mm", cor: "", unidade: "RL", qtd: "", metros: "", maquinaId: "" });
    };

    const handleSave = async (updated) => {
        const { firebaseKey, ...data } = updated;
        await update(ref(db, `logs/${firebaseKey}`), data);
        setEditLog(null);
    };
    const handleDelete = async (key) => {
        await remove(ref(db, `logs/${key}`));
        setEditLog(null);
    };

    // Só elástico
    const logsElastico = logs.filter(l => l.tipo === "Elástico");

    // Índice finalizações por data+turno
    const finIdx = {};
    turnoFinalizacoes.forEach(f => {
        if (!f.inicio) return;
        const date = new Date(f.inicio).toLocaleDateString("pt-BR");
        finIdx[`${date}-${f.numero}`] = f;
    });

    // Agrupar por data do turnoInicio
    const grupos = {};
    logsElastico.forEach(l => {
        const date = l.turnoInicio
            ? new Date(l.turnoInicio).toLocaleDateString("pt-BR")
            : (l.timestamp ? l.timestamp.split(",")[0] : "–");
        const turno = l.turno || 1;
        if (!grupos[date]) grupos[date] = {};
        if (!grupos[date][turno]) grupos[date][turno] = [];
        grupos[date][turno].push(l);
    });

    const totalRL = logsElastico.reduce((s, l) => s + (l.qtd || 0), 0);
    const parseDate = s => { const [d, m, y] = (s || "").split("/"); return new Date(+y, +m - 1, +d); };

    const diasList = Object.keys(grupos).sort((a, b) => parseDate(b) - parseDate(a)).filter(date => {
        const d = parseDate(date);
        if (filtroDE  && d < new Date(filtroDE))  return false;
        if (filtroATE && d > new Date(filtroATE)) return false;
        return true;
    });

    return (
        <div style={{ padding: "24px" }}>
            {/* Modal editar defeitos kg */}
            {editDefKg && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 320 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Defeitos</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>
                            Turno {editDefKg.fin?.numero} · {editDefKg.fin?.inicio ? new Date(editDefKg.fin.inicio).toLocaleDateString("pt-BR") : ""}
                        </div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6 }}>DEFEITOS (KG)</label>
                        <input type="number" min="0" step="0.1" autoFocus
                            value={editDefKg.valor}
                            onChange={e => setEditDefKg(p => ({ ...p, valor: e.target.value }))}
                            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid #ECEDF1", borderRadius: 8, fontSize: 15, marginBottom: 16 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setEditDefKg(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={async () => {
                                await onEditarDefeitosKg(editDefKg.fin.firebaseKey, parseFloat(editDefKg.valor) || 0);
                                setEditDefKg(null);
                            }} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal adicionar lançamento */}
            {addLan && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 380 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 2 }}>Adicionar Lançamento</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>Turno {addLan.turno} · {addLan.date}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>UNIDADE</label>
                                <select value={addForm.unidade} onChange={e => setAddForm(p => ({ ...p, unidade: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1.5px solid #ECEDF1", borderRadius: 7, background: "#F9FAFB", color: "#111827", outline: "none" }}>
                                    <option value="RL">Rolo (RL)</option>
                                    <option value="Metros">Metro (m)</option>
                                </select>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>MEDIDA</label>
                                    <input value={addForm.medida} onChange={e => setAddForm(p => ({ ...p, medida: e.target.value }))}
                                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, background: "#F9FAFB" }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>COR</label>
                                    <div style={{ position: "relative" }}>
                                        <input list="add-lan-cores" value={addForm.cor} onChange={e => setAddForm(p => ({ ...p, cor: e.target.value }))}
                                            placeholder="Digite ou escolha..."
                                            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", paddingLeft: addForm.cor ? 28 : undefined, border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, background: "#F9FAFB" }} />
                                        <datalist id="add-lan-cores">
                                            {COR_CATALOG_SORTED.map(c => <option key={c.codigo} value={c.nome}>{c.codigo} — {c.nome}</option>)}
                                        </datalist>
                                        <CorDot cor={addForm.cor} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>{addForm.unidade === "Metros" ? "METROS" : "RL"}</label>
                                    <input type="number" value={addForm.unidade === "Metros" ? addForm.metros : addForm.qtd}
                                        onChange={e => setAddForm(p => addForm.unidade === "Metros" ? ({ ...p, metros: e.target.value }) : ({ ...p, qtd: e.target.value }))}
                                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, background: "#F9FAFB" }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>MÁQUINA</label>
                                    <input value={addForm.maquinaId} onChange={e => setAddForm(p => ({ ...p, maquinaId: e.target.value }))}
                                        placeholder="ex: 16"
                                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, background: "#F9FAFB" }} />
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                            <button onClick={() => setAddLan(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={handleAddLan} disabled={!addForm.cor.trim()} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: !addForm.cor.trim() ? "#ECEDF1" : COLOR, color: !addForm.cor.trim() ? "#9CA3AF" : "#fff", fontWeight: 700, fontSize: 13, cursor: addForm.cor.trim() ? "pointer" : "not-allowed" }}>
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit modal inline */}
            {editLog && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 380 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Lançamento</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>{editLog.timestamp}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {/* Unidade */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>UNIDADE</span>
                                <select value={editLog.unidade || "RL"} onChange={e => setEditLog(p => ({ ...p, unidade: e.target.value }))}
                                    style={{ padding: "6px 10px", fontSize: 13, border: "1.5px solid #ECEDF1", borderRadius: 7, background: "#F9FAFB", color: "#111827", outline: "none" }}>
                                    <option value="RL">Rolo (RL)</option>
                                    <option value="Metros">Metro (m)</option>
                                </select>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>MEDIDA</label>
                                    <input value={editLog.medida || ""} onChange={e => setEditLog(p => ({ ...p, medida: e.target.value }))}
                                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, color: "#111827", background: "#F9FAFB" }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>COR</label>
                                    <input value={editLog.cor || ""} onChange={e => setEditLog(p => ({ ...p, cor: e.target.value }))}
                                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, color: "#111827", background: "#F9FAFB" }} />
                                </div>
                            </div>
                            <div>
                                {(editLog.unidade || "RL") === "RL" ? (
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>RL</label>
                                        <input type="number" value={editLog.qtd ?? ""} onChange={e => setEditLog(p => ({ ...p, qtd: Number(e.target.value) }))}
                                            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, color: "#111827", background: "#F9FAFB" }} />
                                    </div>
                                ) : (
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>METROS</label>
                                        <input type="number" value={editLog.metros ?? ""} onChange={e => setEditLog(p => ({ ...p, metros: Number(e.target.value) }))}
                                            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, color: "#111827", background: "#F9FAFB" }} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                            <button onClick={() => setEditLog(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={() => handleSave(editLog)} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                        </div>
                        <div style={{ marginTop: 10, borderTop: "1px solid #F3F4F6", paddingTop: 10 }}>
                            <button onClick={() => handleDelete(editLog.firebaseKey)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                Excluir este lançamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Histórico — Elástico</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
                        {diasList.length} dia{diasList.length !== 1 ? "s" : ""} · {logsElastico.length} lançamento{logsElastico.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>De</span>
                    <input type="date" value={filtroDE} onChange={e => setFiltroDE(e.target.value)}
                        style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #ECEDF1", borderRadius: 7, background: "#fff", color: "#111827" }} />
                    <span style={{ fontSize: 12, color: "#6B7280" }}>até</span>
                    <input type="date" value={filtroATE} onChange={e => setFiltroATE(e.target.value)}
                        style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #ECEDF1", borderRadius: 7, background: "#fff", color: "#111827" }} />
                    {(filtroDE || filtroATE) && (
                        <button onClick={() => { setFiltroDE(""); setFiltroATE(""); }}
                            style={{ fontSize: 11, padding: "5px 10px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", borderRadius: 7, cursor: "pointer", fontWeight: 600 }}>
                            Limpar
                        </button>
                    )}
                </div>
                {totalRL > 0 && (
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: COLOR }}>{totalRL.toLocaleString("pt-BR")}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#059669" }}>TOTAL RL</div>
                    </div>
                )}
            </div>

            {diasList.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF", fontSize: 13 }}>
                    Nenhum lançamento de Elástico registrado.
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {diasList.map(date => {
                    const turnos = grupos[date];
                    const totalDia   = Object.values(turnos).flat().reduce((s, l) => s + (l.qtd || 0), 0);
                    const totalDiaM  = Object.values(turnos).flat().reduce((s, l) => s + (Number(l.metros) || 0), 0);
                    const isDiaAberto = abertos[date] !== false;

                    return (
                        <div key={date} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                            {/* Cabeçalho do dia */}
                            <button onClick={() => toggle(date)} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                width: "100%", padding: "14px 18px", background: "transparent",
                                border: "none", cursor: "pointer", textAlign: "left",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{date}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, background: COLOR + "15", color: COLOR, borderRadius: 20, padding: "2px 10px" }}>
                                        {totalDia.toLocaleString("pt-BR")} RL
                                    </span>
                                    {totalDiaM > 0 && (
                                        <span style={{ fontSize: 11, fontWeight: 700, background: "#EFF6FF", color: "#2563EB", borderRadius: 20, padding: "2px 10px", border: "1px solid #BFDBFE" }}>
                                            {totalDiaM.toLocaleString("pt-BR")} m
                                        </span>
                                    )}
                                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                                        {Object.values(turnos).flat().length} lançamentos
                                    </span>
                                </div>
                                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{isDiaAberto ? "▲" : "▼"}</span>
                            </button>

                            {isDiaAberto && Object.entries(turnos)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([turnoNum, lans]) => {
                                    const tInfo = TURNO_INFO[Number(turnoNum)] || { label: `Turno ${turnoNum}`, color: COLOR };
                                    const fin = finIdx[`${date}-${turnoNum}`];
                                    const turnoRL = lans.reduce((s, l) => s + (l.qtd || 0), 0);
                                    const turnoM  = lans.reduce((s, l) => s + (Number(l.metros) || 0), 0);
                                    const key = `${date}-${turnoNum}`;
                                    const isAberto = abertos[key] !== false;

                                    // Resumo por máquina
                                    const porMaquina = {};
                                    lans.forEach(l => { porMaquina[l.maquinaId] = (porMaquina[l.maquinaId] || 0) + (l.qtd || 0); });

                                    return (
                                        <div key={turnoNum} style={{ borderTop: "1px solid #F3F4F6" }}>
                                            <button onClick={() => toggle(key)} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                width: "100%", padding: "11px 16px", background: tInfo.color + "08",
                                                border: "none", cursor: "pointer", textAlign: "left", gap: 8,
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: tInfo.color, flexShrink: 0 }} />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: tInfo.color }}>{tInfo.label}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: COLOR }}>{turnoRL} RL</span>
                                    {turnoM > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB" }}>{turnoM.toLocaleString("pt-BR")} m</span>}
                                                    {/* Badges por máquina */}
                                                    {Object.entries(porMaquina).filter(([id]) => id && id !== "undefined").sort(([a], [b]) => Number(a) - Number(b)).map(([id, qtd]) => (
                                                        <span key={id} style={{ fontSize: 10, fontWeight: 700, background: tInfo.color + "15", color: tInfo.color, borderRadius: 6, padding: "1px 7px" }}>
                                                            M{id}: {qtd} RL
                                                        </span>
                                                    ))}
                                                    {fin?.meta > 0 && (() => {
                                                        const ok = turnoRL >= fin.meta;
                                                        return (
                                                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ok ? "#F0FDF4" : "#FEF2F2", color: ok ? "#16A34A" : "#DC2626", border: `1px solid ${ok ? "#BBF7D0" : "#FECACA"}` }}>
                                                                {ok ? "✓" : "✕"} {turnoRL}/{fin.meta} RL
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                                    {fin?.defeitosKg > 0 && (
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "2px 7px" }}>
                                                            ⚠ {fin.defeitosKg.toFixed(1)} kg def.
                                                        </span>
                                                    )}
                                                    {podeEditar && fin && onEditarDefeitosKg && (
                                                        <button onClick={e => { e.stopPropagation(); setEditDefKg({ fin, valor: fin.defeitosKg || 0 }); }}
                                                            style={{ fontSize: 11, padding: "2px 7px", border: "1px solid #FECACA", borderRadius: 5, background: "#FEF2F2", cursor: "pointer", color: "#DC2626" }}>
                                                            ✏ Def.
                                                        </button>
                                                    )}
                                                    {podeEditar && (
                                                        <button onClick={e => { e.stopPropagation(); setAddLan({ turno: turnoNum, turnoInicio: fin?.inicio || lans[0]?.turnoInicio, date }); setAddForm({ medida: "25mm", cor: "", unidade: "RL", qtd: "", metros: "", maquinaId: "" }); }}
                                                            style={{ fontSize: 13, fontWeight: 700, width: 26, height: 26, borderRadius: 6, border: "1px solid #D1FAE5", background: "#F0FDF4", color: COLOR, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                            +
                                                        </button>
                                                    )}
                                                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{isAberto ? "▲" : "▼"}</span>
                                                </div>
                                            </button>

                                            {isAberto && (
                                                <TurnoDetalheElastico
                                                    lans={lans}
                                                    isAdmin={isAdmin}
                                                    onEdit={setEditLog}
                                                    isMobile={isMobile}
                                                    podeEditar={podeEditar}
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
