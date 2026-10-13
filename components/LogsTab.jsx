import { useState } from "react";
import { ref, set, update, remove, push } from "firebase/database";
import { db } from "../firebase";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorSelect } from "../utils/CorSelect";
import { movimentosFioCorrecao } from "../utils/fioConsumo";

const TIPOS = ["Gorgurão", "Poliéster", "Elástico"];
const MEDIDAS = ["8mm", "12mm", "14mm", "15mm", "16mm", "20mm", "22mm", "25mm", "30mm", "35mm", "40mm", "50mm"];

const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px",
    border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13,
    color: "#111827", background: "#F9FAFB", outline: "none",
};

function EditModal({ log, onSave, onClose, onDelete }) {
    const [form, setForm] = useState({
        cor:       log.cor       || "",
        medida:    log.medida    || "",
        tipo:      log.tipo      || "",
        qtd:       String(log.qtd ?? ""),
        peso:      String(log.peso ?? ""),
        turno:     String(log.turno ?? ""),
        operador:  log.operador  || "",
        timestamp: log.timestamp || "",
        defeito:   log.defeito   || "",
    });
    const [confirmDel, setConfirmDel] = useState(false);

    const set_ = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = () => {
        onSave({
            ...log,
            cor:      form.cor.trim(),
            medida:   form.medida,
            tipo:     form.tipo,
            qtd:      Number(form.qtd),
            peso:     Number(form.peso) || 0,
            turno:    Number(form.turno),
            operador: form.operador.trim(),
            timestamp: form.timestamp.trim(),
            defeito:  form.defeito.trim() || null,
        });
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Lançamento</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>{log.timestamp}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>TIPO</label>
                            <select value={form.tipo} onChange={e => set_("tipo", e.target.value)} style={inputStyle}>
                                {TIPOS.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>MEDIDA</label>
                            <select value={form.medida} onChange={e => set_("medida", e.target.value)} style={inputStyle}>
                                {MEDIDAS.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>COR</label>
                        <CorSelect value={form.cor} onChange={e => set_("cor", e.target.value)} options={COR_CATALOG_SORTED} placeholder="Cor" style={inputStyle} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>ROLOS (RL)</label>
                            <input type="number" value={form.qtd} onChange={e => set_("qtd", String(Math.floor(Number(e.target.value))))}
                                style={{ ...inputStyle, borderColor: form.qtd && form.qtd.includes(".") ? "#DC2626" : undefined }} step="1" min="0" />
                            {form.qtd && form.qtd.includes(".") && (
                                <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, marginTop: 4 }}>⚠ RL deve ser número inteiro</div>
                            )}
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>PESO (kg)</label>
                            <input type="number" step="0.1" value={form.peso} onChange={e => set_("peso", e.target.value)} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>TURNO</label>
                            <select value={form.turno} onChange={e => set_("turno", e.target.value)} style={inputStyle}>
                                <option value="1">Turno 1</option>
                                <option value="2">Turno 2</option>
                                <option value="3">Turno 3</option>
                                <option value="4">Bônus de Produção</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>OPERADOR</label>
                            <input value={form.operador} onChange={e => set_("operador", e.target.value)} style={inputStyle} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>DATA / HORA</label>
                        <input value={form.timestamp} onChange={e => set_("timestamp", e.target.value)} style={inputStyle} placeholder="dd/mm/aaaa, hh:mm:ss" />
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>DEFEITO <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(opcional)</span></label>
                        <input value={form.defeito} onChange={e => set_("defeito", e.target.value)} style={inputStyle} placeholder="Descreva o defeito, se houver" />
                    </div>
                </div>

                <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={!!(form.qtd && form.qtd.includes("."))} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: form.qtd && form.qtd.includes(".") ? "#ECEDF1" : "#111827", color: form.qtd && form.qtd.includes(".") ? "#9CA3AF" : "#fff", fontWeight: 700, fontSize: 13, cursor: form.qtd && form.qtd.includes(".") ? "default" : "pointer" }}>
                        Salvar alterações
                    </button>
                </div>

                {/* Excluir */}
                <div style={{ marginTop: 12, borderTop: "1px solid #F3F4F6", paddingTop: 12 }}>
                    {!confirmDel ? (
                        <button onClick={() => setConfirmDel(true)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            Excluir este lançamento
                        </button>
                    ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#DC2626", flex: 1 }}>Confirmar exclusão?</span>
                            <button onClick={onDelete} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Excluir</button>
                            <button onClick={() => setConfirmDel(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", color: "#374151", fontSize: 12, cursor: "pointer" }}>Não</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LogsTab({ logs, isAdmin, podeEditar = true }) {
    const [confirmLimpar, setConfirmLimpar] = useState(false);
    const [editLog, setEditLog] = useState(null);
    const [diasAbertos, setDiasAbertos] = useState({});

    const toggleDia = (dia) => setDiasAbertos(p => ({ ...p, [dia]: !p[dia] }));

    // Agrupar logs por data (dd/mm/aaaa)
    const porDia = {};
    logs.forEach(l => {
        const dia = l.timestamp ? l.timestamp.split(",")[0] : "—";
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(l);
    });

    const handleLimpar = async () => {
        await set(ref(db, "logs"), null);
        setConfirmLimpar(false);
    };

    const handleSave = async (updated) => {
        const { firebaseKey, ...data } = updated;
        const isPoliester = (data.tipo || "").toLowerCase() === "poliéster";
        if (!isPoliester && !editLog.manual) {
            const isElastico = (data.tipo || "").toLowerCase() === "elástico";
            const unidade = isElastico ? (editLog.unidade === "Metros" ? "Metro" : "Rolo") : "RL";
            const delta = (Number(data.qtd) || 0) - (Number(editLog.qtd) || 0);
            if (delta !== 0) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                await push(ref(db, "estoqueMovimentos"), { movimento: delta > 0 ? "entrada" : "saida", cor: data.cor, medida: data.medida, tipo: data.tipo, qtd: Math.abs(delta), unidade, timestamp: ts, operador: data.operador, obs: "Correção de apontamento" });
            }
        }
        await Promise.all(movimentosFioCorrecao(editLog, { ...editLog, ...data }, data.operador, "Correção de apontamento").map(m => push(ref(db, "fioEstoque"), m)));
        await update(ref(db, `logs/${firebaseKey}`), data);
        setEditLog(null);
    };

    const handleDelete = async (firebaseKey) => {
        await Promise.all(movimentosFioCorrecao(editLog, null, editLog.operador, "Exclusão de apontamento").map(m => push(ref(db, "fioEstoque"), m)));
        const isPoliester = (editLog.tipo || "").toLowerCase() === "poliéster";
        if (!isPoliester && !editLog.manual && Number(editLog.qtd) > 0) {
            const isElastico = (editLog.tipo || "").toLowerCase() === "elástico";
            const unidade = isElastico ? (editLog.unidade === "Metros" ? "Metro" : "Rolo") : "RL";
            const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
            await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: editLog.cor, medida: editLog.medida, tipo: editLog.tipo, qtd: Number(editLog.qtd), unidade, timestamp: ts, operador: editLog.operador, obs: "Exclusão de apontamento" });
        }
        await remove(ref(db, `logs/${firebaseKey}`));
        setEditLog(null);
    };

    return (
        <div style={{ padding: "24px" }}>
            {editLog && (
                <EditModal
                    log={editLog}
                    onSave={handleSave}
                    onClose={() => setEditLog(null)}
                    onDelete={() => handleDelete(editLog.firebaseKey)}
                />
            )}

            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
                        Histórico <span style={{ color: "#9CA3AF", fontWeight: 400 }}>{logs.length}</span>
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Todos os apontamentos de produção</p>
                </div>
                {(isAdmin || podeEditar) && logs.length > 0 && !confirmLimpar && (
                    <button onClick={() => setConfirmLimpar(true)} style={{
                        padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer",
                        background: "transparent", border: "1.5px solid #DC2626", color: "#DC2626",
                    }}>
                        Limpar histórico
                    </button>
                )}
                {podeEditar && confirmLimpar && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "#374151" }}>Apagar todos os lançamentos?</span>
                        <button onClick={handleLimpar} style={{ padding: "7px 14px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", background: "#DC2626", border: "none", color: "#fff" }}>Confirmar</button>
                        <button onClick={() => setConfirmLimpar(false)} style={{ padding: "7px 14px", fontSize: 13, borderRadius: 8, cursor: "pointer", background: "#F3F4F6", border: "none", color: "#374151" }}>Cancelar</button>
                    </div>
                )}
            </div>

            {logs.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "48px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Nenhum apontamento registrado</div>
                    <div style={{ fontSize: 13, color: "#9CA3AF" }}>Os lançamentos aparecerão aqui após o primeiro apontamento.</div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(porDia).map(([dia, itens]) => {
                        const aberto = !!diasAbertos[dia];
                        const totalRL = itens.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (Number(l.qtd) || 0), 0);
                        const totalKg = itens.filter(l => l.tipo === "Poliéster").reduce((s, l) => s + (Number(l.peso) || Number(l.qtd) || 0), 0);
                        const [d, m, y] = dia.split("/");
                        const nomeDia = (d && m && y)
                            ? new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("pt-BR", { weekday: "long" })
                            : "";
                        return (
                            <div key={dia} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                                {/* Cabeçalho do dia — clicável */}
                                <button onClick={() => toggleDia(dia)} style={{
                                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "13px 20px", background: aberto ? "#F9FAFB" : "#fff",
                                    border: "none", borderBottom: aberto ? "1px solid #ECEDF1" : "none",
                                    cursor: "pointer", textAlign: "left", gap: 12,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{dia}</span>
                                        {nomeDia && <span style={{ fontSize: 12, color: "#9CA3AF", textTransform: "capitalize" }}>{nomeDia}</span>}
                                        <span style={{ fontSize: 11, fontWeight: 700, background: "#F3F4F6", color: "#6B7280", borderRadius: 20, padding: "1px 8px" }}>{itens.length}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        {totalRL > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#F97316" }}>{totalRL.toLocaleString("pt-BR")} RL</span>}
                                        {totalKg > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#6366F1" }}>{totalKg.toFixed(1)} kg</span>}
                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                                    </div>
                                </button>

                                {/* Linhas do dia */}
                                {aberto && (
                                    <>
                                        <div style={{ display: "grid", gridTemplateColumns: (isAdmin || podeEditar) ? "2fr 1fr 80px 120px 1fr 60px" : "2fr 1fr 80px 120px 160px", gap: 12, padding: "8px 20px", background: "#F9FAFB", borderBottom: "1px solid #ECEDF1" }}>
                                            {["MÁQUINA / FITA", "TURNO", "QTD", "OPERADOR", "HORA", ...((isAdmin || podeEditar) ? [""] : [])].map(h => (
                                                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em" }}>{h}</div>
                                            ))}
                                        </div>
                                        {itens.map((l, idx) => (
                                            <div key={l.firebaseKey || idx} style={{
                                                display: "grid",
                                                gridTemplateColumns: (isAdmin || podeEditar) ? "2fr 1fr 80px 120px 1fr 60px" : "2fr 1fr 80px 120px 160px",
                                                gap: 12, padding: "12px 20px", alignItems: "center",
                                                borderBottom: idx < itens.length - 1 ? "1px solid #F3F4F6" : "none",
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                                                        {l.medida} {l.cor}
                                                        <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 400, marginLeft: 6 }}>{l.tipo}</span>
                                                    </div>
                                                    {l.defeito && <div style={{ fontSize: 11, color: "#D97706", marginTop: 2 }}>⚠ {l.defeito}</div>}
                                                </div>
                                                <div style={{ fontSize: 12, color: "#6B7280" }}>Turno {l.turno}</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: l.tipo === "Poliéster" ? "#6366F1" : "#F97316" }}>
                                                    {l.tipo === "Poliéster" ? `${l.peso ?? l.qtd} kg` : `${l.qtd} RL`}
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                                                        {l.operador?.[0] || "?"}
                                                    </div>
                                                    <span style={{ fontSize: 12, color: "#374151" }}>{l.operador}</span>
                                                </div>
                                                <div style={{ fontSize: 12, color: "#6B7280" }}>
                                                    {l.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0] || l.timestamp}
                                                </div>
                                                {(isAdmin || podeEditar) && (
                                                    <button onClick={() => setEditLog(l)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #ECEDF1", background: "#F9FAFB", color: "#6B7280", cursor: "pointer" }}>
                                                        Editar
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
