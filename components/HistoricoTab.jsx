import { useState, useEffect } from "react";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}
import { ref, update, remove, push } from "firebase/database";
import { db } from "../firebase";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorSelect } from "../utils/CorSelect";
import { movimentosFioCorrecao } from "../utils/fioConsumo";

const TIPOS   = ["Gorgurão", "Poliéster", "Elástico"];
const MEDIDAS = ["8mm", "12mm", "14mm", "15mm", "16mm", "20mm", "22mm", "25mm", "30mm", "35mm", "40mm", "50mm"];
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, color: "#111827", background: "#F9FAFB", outline: "none" };

function EditModal({ log, onSave, onClose, onDelete }) {
    const [form, setForm] = useState({ cor: log.cor || "", medida: log.medida || "", tipo: log.tipo || "", qtd: String(log.qtd ?? ""), peso: String(log.peso ?? ""), turno: String(log.turno ?? ""), operador: log.operador || "", timestamp: log.timestamp || "" });
    const [confirmDel, setConfirmDel] = useState(false);
    const [correcaoRetro, setCorrecaoRetro] = useState(false);
    const [qtdErrada, setQtdErrada] = useState("");
    const set_ = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const isPoliester = (form.tipo || "").toLowerCase() === "poliéster";
    const delta = !isPoliester ? (Number(form.qtd) || 0) - (Number(log.qtd) || 0) : 0;

    const handleSave = () => onSave({
        ...log,
        cor: form.cor.trim(), medida: form.medida, tipo: form.tipo,
        qtd: Number(form.qtd), peso: Number(form.peso) || 0,
        turno: Number(form.turno), operador: form.operador.trim(), timestamp: form.timestamp.trim(),
        _qtdErradaRetro: correcaoRetro && qtdErrada ? Number(qtdErrada) : null,
    });
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Lançamento</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>{log.timestamp}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>TIPO</label>
                            <select value={form.tipo} onChange={e => set_("tipo", e.target.value)} style={inputStyle}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>MEDIDA</label>
                            <select value={form.medida} onChange={e => set_("medida", e.target.value)} style={inputStyle}>{MEDIDAS.map(m => <option key={m}>{m}</option>)}</select></div>
                    </div>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>COR</label>
                        <CorSelect value={form.cor} onChange={e => set_("cor", e.target.value)} options={COR_CATALOG_SORTED} placeholder="Cor" style={inputStyle} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>ROLOS (RL)</label>
                            <input type="number" step="1" min="0" value={form.qtd} onChange={e => set_("qtd", e.target.value)} style={inputStyle} /></div>
                        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>PESO (kg)</label>
                            <input type="number" step="0.1" value={form.peso} onChange={e => set_("peso", e.target.value)} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>TURNO</label>
                            <select value={form.turno} onChange={e => set_("turno", e.target.value)} style={inputStyle}>
                                <option value="1">Turno 1</option><option value="2">Turno 2</option><option value="3">Turno 3</option><option value="4">Bônus</option>
                            </select></div>
                        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>OPERADOR</label>
                            <input value={form.operador} onChange={e => set_("operador", e.target.value)} style={inputStyle} /></div>
                    </div>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>DATA / HORA</label>
                        <input value={form.timestamp} onChange={e => set_("timestamp", e.target.value)} style={inputStyle} /></div>
                </div>
                {/* Preview do impacto no estoque */}
                {!isPoliester && delta !== 0 && (
                    <div style={{ marginTop: 12, background: delta > 0 ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${delta > 0 ? "#BBF7D0" : "#FECACA"}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                        <span style={{ color: delta > 0 ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                            {delta > 0 ? "▲" : "▼"} Estoque: {delta > 0 ? "+" : ""}{delta} RL ({form.cor} {form.medida})
                        </span>
                    </div>
                )}

                {/* Correção retroativa */}
                <div style={{ marginTop: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: correcaoRetro ? 8 : 0 }}>
                        <input type="checkbox" checked={correcaoRetro} onChange={e => { setCorrecaoRetro(e.target.checked); setQtdErrada(""); }}
                            style={{ accentColor: "#D97706", cursor: "pointer" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>Corrigir estoque retroativo (lançamento já editado sem corrigir)</span>
                    </label>
                    {correcaoRetro && (
                        <div>
                            <div style={{ fontSize: 11, color: "#92400E", marginBottom: 6 }}>Informe quantos RL foram lançados errado no estoque:</div>
                            <input type="number" min="0" value={qtdErrada} onChange={e => setQtdErrada(e.target.value)}
                                placeholder="Ex: 10000" style={{ ...inputStyle, borderColor: "#FDE68A" }} />
                            {qtdErrada && Number(qtdErrada) > 0 && (
                                <div style={{ fontSize: 11, color: "#D97706", marginTop: 4, fontWeight: 600 }}>
                                    Vai criar uma saída de {Number(qtdErrada) - (Number(form.qtd) || 0) > 0 ? Number(qtdErrada) - (Number(form.qtd) || 0) : Number(qtdErrada)} RL para corrigir
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleSave} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                </div>
                <div style={{ marginTop: 12, borderTop: "1px solid #F3F4F6", paddingTop: 12 }}>
                    {!confirmDel
                        ? <button onClick={() => setConfirmDel(true)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Excluir este lançamento</button>
                        : <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#DC2626", flex: 1 }}>Confirmar exclusão?</span>
                            <button onClick={onDelete} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Excluir</button>
                            <button onClick={() => setConfirmDel(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", color: "#374151", fontSize: 12, cursor: "pointer" }}>Não</button>
                          </div>}
                </div>
            </div>
        </div>
    );
}

const TURNO_INFO = {
    1: { label: "Turno 1",           horario: "06h–14h", color: "#F97316" },
    2: { label: "Turno 2",           horario: "14h–22h", color: "#6366F1" },
    3: { label: "Turno 3",           horario: "22h–06h", color: "#10B981" },
    4: { label: "Bônus de Produção", horario: "Sábado",  color: "#EAB308" },
};

const TIPO_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };

function MetaBadge({ fin, turnoKg }) {
    if (!fin) return null;
    if (turnoKg <= 0) return null;
    const nPol = Number(fin.qtdMaquinas?.["Poliéster"] || 0);
    const metaKg = fin.metaKgMaquina || 30;
    const kgPorMaq = nPol > 0 ? Math.round((turnoKg / nPol) * 10) / 10 : null;
    if (kgPorMaq === null) return null;
    const bateu = kgPorMaq >= metaKg;
    return (
        <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: bateu ? "#EEF2FF" : "#FEF2F2",
            color: bateu ? "#4338CA" : "#DC2626",
            border: `1px solid ${bateu ? "#C7D2FE" : "#FECACA"}`,
            whiteSpace: "nowrap",
        }}>
            {bateu ? "✓" : "✕"} Pol. {kgPorMaq}/{metaKg} kg/máq
        </span>
    );

}

function MaquinasBadge({ qtdMaquinas }) {
    if (!qtdMaquinas) return null;
    const tipos = [
        { key: "Gorgurão", short: "Gorg.", color: "#F97316" },
        { key: "Poliéster", short: "Pol.",  color: "#6366F1" },
        { key: "Elástico",  short: "Elás.", color: "#10B981" },
    ];
    const ativos = tipos.filter(({ key }) => Number(qtdMaquinas[key] || 0) > 0);
    if (!ativos.length) return null;
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#F3F4F6", borderRadius: 6, padding: "2px 8px" }}>
            {ativos.map(({ key, short, color }, i) => (
                <span key={key} style={{ fontSize: 11, fontWeight: 600 }}>
                    {i > 0 && <span style={{ color: "#D1D5DB", marginRight: 3 }}>·</span>}
                    <span style={{ color }}>{qtdMaquinas[key]}</span>
                    <span style={{ color: "#9CA3AF" }}> {short}</span>
                </span>
            ))}
        </span>
    );
}

function TurnoDetalhe({ lans, isAdmin, onEdit, isMobile, podeEditar = true }) {
    const mm = s => parseInt((s || "0").replace("mm", ""), 10);

    if (isAdmin || podeEditar) {
        const sorted = [...lans].sort((a, b) => {
            if (a.tipo !== b.tipo) return (a.tipo || "").localeCompare(b.tipo || "");
            return mm(a.medida) - mm(b.medida) || (a.cor || "").localeCompare(b.cor || "");
        });

        if (isMobile) {
            return (
                <div style={{ borderTop: "1px solid #F3F4F6" }}>
                    {sorted.map((l, i) => {
                        const c = TIPO_COLOR[l.tipo] || "#9CA3AF";
                        return (
                            <div key={l.firebaseKey || i} style={{
                                padding: "10px 14px", borderBottom: i < sorted.length - 1 ? "1px solid #F3F4F6" : "none",
                                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                            }}>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: c, background: c + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.cor}</span>
                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{l.tipo}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>
                                        <span style={{ fontWeight: 700, color: l.tipo === "Poliéster" ? "#6366F1" : "#F97316" }}>
                                            {l.tipo === "Poliéster" ? `${(l.peso || 0).toFixed(3)} kg` : `${l.qtd} RL`}
                                        </span>
                                        {(l.peso || 0) > 0 && l.tipo !== "Poliéster" && <span style={{ marginLeft: 8 }}>{l.peso.toFixed(1)} kg</span>}
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

        return (
            <div style={{ borderTop: "1px solid #F3F4F6" }}>
                <div style={{
                    display: "grid", gridTemplateColumns: "1fr 70px 70px 60px 64px",
                    gap: 8, padding: "6px 16px", background: "#F9FAFB",
                    borderBottom: "1px solid #F3F4F6",
                }}>
                    {["COR / MEDIDA", "QTD", "PESO", "HORA", ""].map((h, i) => (
                        <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em" }}>{h}</div>
                    ))}
                </div>
                {sorted.map((l, i) => {
                    const c = TIPO_COLOR[l.tipo] || "#9CA3AF";
                    return (
                        <div key={l.firebaseKey || i} style={{
                            display: "grid", gridTemplateColumns: "1fr 70px 70px 60px 64px",
                            gap: 8, padding: "8px 16px", alignItems: "center",
                            borderBottom: i < sorted.length - 1 ? "1px solid #F9FAFB" : "none",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: c, background: c + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.cor}</span>
                                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{l.tipo}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: l.tipo === "Poliéster" ? "#6366F1" : "#F97316" }}>
                                {l.tipo === "Poliéster" ? `${(l.peso || 0).toFixed(3)} kg` : `${l.qtd} RL`}
                            </div>
                            <div style={{ fontSize: 12, color: "#6B7280" }}>
                                {(l.peso || 0) > 0 && l.tipo !== "Poliéster" ? `${l.peso.toFixed(1)} kg` : "–"}
                            </div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                                {l.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0] || "–"}
                            </div>
                            {podeEditar && (
                                <button onClick={() => onEdit(l)} style={{
                                    fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6,
                                    border: "1px solid #ECEDF1", background: "#F9FAFB",
                                    color: "#6B7280", cursor: "pointer",
                                }}>Editar</button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Modo normal: agrupa por tipo+medida+cor e soma totais
    const grupos = {};
    lans.forEach(l => {
        const k = `${l.tipo}|${l.medida}|${l.cor}`;
        if (!grupos[k]) grupos[k] = { tipo: l.tipo, medida: l.medida, cor: l.cor, qtd: 0, peso: 0 };
        grupos[k].qtd  += l.qtd  || 0;
        grupos[k].peso += l.peso || 0;
    });

    const linhas = Object.values(grupos).sort((a, b) => {
        if (a.tipo !== b.tipo) return (a.tipo || "").localeCompare(b.tipo || "");
        return mm(a.medida) - mm(b.medida) || (a.cor || "").localeCompare(b.cor || "");
    });

    return (
        <div style={{ borderTop: "1px solid #F3F4F6" }}>
            <div style={{
                display: "grid", gridTemplateColumns: "1fr 70px 70px",
                gap: 8, padding: "6px 16px", background: "#F9FAFB",
                borderBottom: "1px solid #F3F4F6",
            }}>
                {["COR / MEDIDA", "QTD", "PESO"].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em" }}>{h}</div>
                ))}
            </div>
            {linhas.map((l, i) => {
                const c = TIPO_COLOR[l.tipo] || "#9CA3AF";
                return (
                    <div key={i} style={{
                        display: "grid", gridTemplateColumns: "1fr 70px 70px",
                        gap: 8, padding: "9px 16px", alignItems: "center",
                        borderBottom: i < linhas.length - 1 ? "1px solid #F9FAFB" : "none",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c, background: c + "15", padding: "1px 6px", borderRadius: 5 }}>
                                {l.medida}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.cor}</span>
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{l.tipo}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: l.tipo === "Poliéster" ? "#6366F1" : "#F97316" }}>
                            {l.tipo === "Poliéster" ? `${(l.peso || 0).toFixed(3)} kg` : `${l.qtd} RL`}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                            {l.peso > 0 && l.tipo !== "Poliéster" ? `${l.peso.toFixed(1)} kg` : "–"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function HistoricoTab({ logs, turnoFinalizacoes = [], isAdmin = false, onEditarDefeitos, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [abertos, setAbertos] = useState({});
    const [filtroDE,  setFiltroDE]  = useState("");
    const [filtroATE, setFiltroATE] = useState("");
    const [view, setView] = useState("dia"); // "dia" | "cor"
    const [sortCor, setSortCor] = useState({ col: "medida", dir: "asc" });
    const [editLog, setEditLog] = useState(null);
    const [editTurnoKey, setEditTurnoKey] = useState(null);
    const [editDefeitos, setEditDefeitos] = useState(null); // { fin, valores: { Gorgurão: x, Poliéster: y } }

    const toggle = key => setAbertos(p => ({ ...p, [key]: !p[key] }));

    const handleSave = async (updated) => {
        const { firebaseKey, _qtdErradaRetro, ...data } = updated;
        const isPoliester = (data.tipo || "").toLowerCase() === "poliéster";
        const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

        if (!isPoliester && !editLog.manual) {
            const isElastico = (data.tipo || "").toLowerCase() === "elástico";
            const unidade = isElastico ? (editLog.unidade === "Metros" ? "Metro" : "Rolo") : "RL";
            if (_qtdErradaRetro && _qtdErradaRetro > 0) {
                const correcao = _qtdErradaRetro - (Number(data.qtd) || 0);
                if (correcao > 0)
                    await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: data.cor, medida: data.medida, tipo: data.tipo, qtd: correcao, unidade, timestamp: ts, operador: data.operador, obs: "Correção retroativa de apontamento" });
                else if (correcao < 0)
                    await push(ref(db, "estoqueMovimentos"), { movimento: "entrada", cor: data.cor, medida: data.medida, tipo: data.tipo, qtd: Math.abs(correcao), unidade, timestamp: ts, operador: data.operador, obs: "Correção retroativa de apontamento" });
            } else {
                const delta = (Number(data.qtd) || 0) - (Number(editLog.qtd) || 0);
                if (delta !== 0)
                    await push(ref(db, "estoqueMovimentos"), { movimento: delta > 0 ? "entrada" : "saida", cor: data.cor, medida: data.medida, tipo: data.tipo, qtd: Math.abs(delta), unidade, timestamp: ts, operador: data.operador, obs: "Correção de apontamento" });
            }
        }
        await Promise.all(movimentosFioCorrecao(editLog, { ...editLog, ...data }, data.operador, "Correção de apontamento").map(m => push(ref(db, "fioEstoque"), m)));
        await update(ref(db, `logs/${firebaseKey}`), data);
        setEditLog(null);
    };

    const handleDelete = async (key) => {
        await Promise.all(movimentosFioCorrecao(editLog, null, editLog.operador, "Exclusão de apontamento").map(m => push(ref(db, "fioEstoque"), m)));
        const isPoliester = (editLog.tipo || "").toLowerCase() === "poliéster";
        if (!isPoliester && !editLog.manual && Number(editLog.qtd) > 0) {
            const isElastico = (editLog.tipo || "").toLowerCase() === "elástico";
            const unidade = isElastico ? (editLog.unidade === "Metros" ? "Metro" : "Rolo") : "RL";
            const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
            await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: editLog.cor, medida: editLog.medida, tipo: editLog.tipo, qtd: Number(editLog.qtd), unidade, timestamp: ts, operador: editLog.operador, obs: "Exclusão de apontamento" });
        }
        await remove(ref(db, `logs/${key}`));
        setEditLog(null);
    };

    const handleEditTurnoNumero = async (fin, novoNumero) => {
        if (!fin?.firebaseKey) return;
        await update(ref(db, `turnoFinalizacoes/${fin.firebaseKey}`), { numero: novoNumero });
        // Atualiza também os logs vinculados ao mesmo turnoInicio
        const logsVinculados = logs.filter(l => l.turnoInicio && l.turnoInicio === fin.inicio);
        await Promise.all(logsVinculados.map(l =>
            update(ref(db, `logs/${l.firebaseKey}`), { turno: novoNumero })
        ));
        setEditTurnoKey(null);
    };

    // Índice finalizações por data+turno
    const finIdx = {};
    turnoFinalizacoes.forEach(f => {
        if (!f.inicio) return;
        const date = new Date(f.inicio).toLocaleDateString("pt-BR");
        finIdx[`${date}-${f.numero}`] = f;
    });

    // Agrupar logs por data do turno (turnoInicio) — turno pertence ao dia em que começou
    const grupos = {};
    logs.forEach(l => {
        const date = l.turnoInicio
            ? new Date(l.turnoInicio).toLocaleDateString("pt-BR")
            : (l.timestamp ? l.timestamp.split(",")[0] : "–");
        const turno = l.turno || 1;
        if (!grupos[date]) grupos[date] = {};
        if (!grupos[date][turno]) grupos[date][turno] = [];
        grupos[date][turno].push(l);
    });

    // Totais gerais
    const totalRL      = logs.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (l.qtd  || 0), 0);
    const totalKg      = logs.filter(l => l.tipo === "Poliéster").reduce((s, l) => s + (l.peso || 0), 0);
    const totalGorgKg  = logs.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (l.peso || 0), 0);
    const parseDate = s => { const [d, m, y] = (s || "").split("/"); return new Date(+y, +m - 1, +d); };

    const diasList = Object.keys(grupos).sort((a, b) => parseDate(b) - parseDate(a)).filter(date => {
        const d = parseDate(date);
        if (filtroDE  && d < new Date(filtroDE))  return false;
        if (filtroATE && d > new Date(filtroATE)) return false;
        return true;
    });

    // Dados para o gráfico — últimos 21 dias ordenados crescente
    const chartDias = [...diasList].reverse().slice(-21);
    const chartData = chartDias.map(date => {
        const lans = Object.values(grupos[date]).flat();
        return {
            date,
            rl:  lans.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (l.qtd  || 0), 0),
            kg:  lans.filter(l => l.tipo === "Poliéster").reduce((s, l) => s + (l.peso || 0), 0),
        };
    });
    const maxRL = Math.max(...chartData.map(d => d.rl), 1);
    const maxKg = Math.max(...chartData.map(d => d.kg), 1);

    return (
        <div style={{ padding: "24px" }}>
            {editDefeitos && (() => {
                const CORES = ["Branco", "Preto", "Cores"];
                const TIPOS = ["Segunda linha", "Descarte"];
                const setVal = (k, v) => setEditDefeitos(p => ({ ...p, valores: { ...p.valores, [k]: v } }));
                return (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 400 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Defeitos</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>Turno {editDefeitos.fin?.numero} · {editDefeitos.fin?.inicio ? new Date(editDefeitos.fin.inicio).toLocaleDateString("pt-BR") : ""}</div>
                        {/* Cabeçalho */}
                        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 6, marginBottom: 8 }}>
                            <span />
                            {TIPOS.map(tp => <span key={tp} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "center" }}>{tp.toUpperCase()}</span>)}
                        </div>
                        {/* Linhas por cor */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                            {CORES.map(cor => (
                                <div key={cor} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 6, alignItems: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{cor}</span>
                                    {TIPOS.map(tp => (
                                        <input key={tp} type="number" min={0} placeholder="0"
                                            value={editDefeitos.valores[`${cor}_${tp}`] || ""}
                                            onChange={e => setVal(`${cor}_${tp}`, e.target.value)}
                                            style={{ padding: "8px 4px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, textAlign: "center", outline: "none", width: "100%", boxSizing: "border-box" }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setEditDefeitos(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ECEDF1", background: "#F9FAFB", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={async () => {
                                const novos = {};
                                Object.entries(editDefeitos.valores).forEach(([k, v]) => { if (Number(v) > 0) novos[k] = Number(v); });
                                await onEditarDefeitos(editDefeitos.fin.firebaseKey, novos);
                                setEditDefeitos(null);
                            }} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                        </div>
                    </div>
                </div>
                );
            })()}
            {editLog && (
                <EditModal
                    log={editLog}
                    onSave={handleSave}
                    onClose={() => setEditLog(null)}
                    onDelete={() => handleDelete(editLog.firebaseKey)}
                />
            )}
            {/* Header */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
                        Histórico de Produção
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
                        {diasList.length} dia{diasList.length !== 1 ? "s" : ""} · {logs.length} lançamento{logs.length !== 1 ? "s" : ""}
                    </p>
                    <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                        {[{ id: "dia", label: "Por dia" }, { id: "cor", label: "Por cor" }].map(v => (
                            <button key={v.id} onClick={() => setView(v.id)} style={{
                                fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 20, cursor: "pointer",
                                border: `1px solid ${view === v.id ? "#F97316" : "#ECEDF1"}`,
                                background: view === v.id ? "#FFF7ED" : "transparent",
                                color: view === v.id ? "#F97316" : "#6B7280",
                            }}>{v.label}</button>
                        ))}
                    </div>
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
                {(totalRL > 0 || totalKg > 0 || totalGorgKg > 0) && (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {totalRL > 0 && (
                            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "#F97316" }}>{totalRL.toLocaleString("pt-BR")}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#D97706" }}>TOTAL RL</div>
                            </div>
                        )}
                        {totalGorgKg > 0 && (
                            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "#16A34A" }}>{totalGorgKg.toFixed(1)}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#15803D" }}>KG GORG.</div>
                            </div>
                        )}
                        {totalKg > 0 && (
                            <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "#6366F1" }}>{totalKg.toFixed(3)}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#4338CA" }}>KG POL.</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Gráfico de produção */}
            {chartData.length > 1 && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Produção por dia</span>
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#9CA3AF" }}>
                            {maxRL > 1 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#F97316", display: "inline-block" }} />RL (Gorg./Elás.)</span>}
                            {maxKg > 1 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#6366F1", display: "inline-block" }} />Kg (Pol.)</span>}
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, overflowX: "auto" }}>
                        {chartData.map((d, i) => {
                            const [day, mon] = d.date.split("/");
                            const rlH  = d.rl  > 0 ? Math.max(4, Math.round((d.rl  / maxRL) * 80)) : 0;
                            const kgH  = d.kg  > 0 ? Math.max(4, Math.round((d.kg  / maxKg) * 80)) : 0;
                            const isLast = i === chartData.length - 1;
                            return (
                                <div key={d.date} title={`${d.date}\n${d.rl > 0 ? d.rl + " RL" : ""}${d.kg > 0 ? " · " + d.kg.toFixed(3) + " kg" : ""}`}
                                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: "1 0 28px", minWidth: 28 }}>
                                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 72 }}>
                                        {d.rl > 0 && (
                                            <div style={{ width: 9, height: rlH, background: isLast ? "#EA580C" : "#F97316", borderRadius: "3px 3px 0 0", opacity: isLast ? 1 : 0.75 }} />
                                        )}
                                        {d.kg > 0 && (
                                            <div style={{ width: 9, height: kgH, background: isLast ? "#4338CA" : "#6366F1", borderRadius: "3px 3px 0 0", opacity: isLast ? 1 : 0.75 }} />
                                        )}
                                        {d.rl === 0 && d.kg === 0 && (
                                            <div style={{ width: 9, height: 2, background: "#ECEDF1", borderRadius: 1 }} />
                                        )}
                                    </div>
                                    <div style={{ fontSize: 9, color: isLast ? "#374151" : "#9CA3AF", fontWeight: isLast ? 700 : 400, whiteSpace: "nowrap" }}>{day}/{mon}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── View: Por cor/medida ── */}
            {view === "cor" && (() => {
                // Filtra logs pelo período selecionado
                const logsFiltrados = logs.filter(l => {
                    const date = l.turnoInicio
                        ? new Date(l.turnoInicio).toLocaleDateString("pt-BR")
                        : (l.timestamp ? l.timestamp.split(",")[0] : "–");
                    const d = parseDate(date);
                    if (filtroDE  && d < new Date(filtroDE))  return false;
                    if (filtroATE && d > new Date(filtroATE)) return false;
                    return true;
                });

                // Agrupa por tipo+medida+cor
                const resumo = {};
                logsFiltrados.forEach(l => {
                    const k = `${l.tipo}|${l.medida}|${l.cor}`;
                    if (!resumo[k]) resumo[k] = { tipo: l.tipo, medida: l.medida, cor: l.cor, rl: 0, kg: 0, count: 0 };
                    resumo[k].rl    += l.qtd  || 0;
                    resumo[k].kg    += l.peso || 0;
                    resumo[k].count += 1;
                });

                const mm = s => parseInt((s || "0").replace("mm", ""), 10);
                const linhas = Object.values(resumo).sort((a, b) => {
                    if (sortCor.col === "medida") {
                        const d = mm(a.medida) - mm(b.medida) || (a.cor || "").localeCompare(b.cor || "");
                        return sortCor.dir === "asc" ? d : -d;
                    }
                    if (sortCor.col === "rl") {
                        const d = a.rl - b.rl;
                        return sortCor.dir === "asc" ? d : -d;
                    }
                    if (sortCor.col === "kg") {
                        const d = a.kg - b.kg;
                        return sortCor.dir === "asc" ? d : -d;
                    }
                    return 0;
                });

                const handleSort = col => setSortCor(s => ({
                    col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc"
                }));
                const sortIcon = col => sortCor.col === col ? (sortCor.dir === "asc" ? " ↑" : " ↓") : <span style={{ opacity: 0.3 }}> ↕</span>;

                if (linhas.length === 0) return (
                    <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "56px", textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Nenhum lançamento no período</div>
                    </div>
                );

                // Agrupa linhas por tipo para renderizar seções
                const secoes = ["Gorgurão", "Poliéster"].map(tipo => ({
                    tipo,
                    linhas: linhas.filter(l => l.tipo === tipo),
                })).filter(s => s.linhas.length > 0);

                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {secoes.map(({ tipo, linhas: sl }) => {
                            const c = TIPO_COLOR[tipo] || "#9CA3AF";
                            const totalRL = sl.reduce((s, l) => s + l.rl, 0);
                            const totalKg = sl.reduce((s, l) => s + l.kg, 0);
                            return (
                                <div key={tipo} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>
                                    <div style={{ padding: "10px 16px", background: c + "10", borderBottom: `1px solid ${c}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: c }}>{tipo}</span>
                                        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                                            {totalRL > 0 && <span style={{ fontWeight: 700, color: c }}>{totalRL.toLocaleString("pt-BR")} RL</span>}
                                            {totalKg > 0 && <span style={{ fontWeight: 600, color: "#6B7280" }}>{totalKg.toFixed(tipo === "Poliéster" ? 3 : 1)} kg</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8, padding: "6px 16px", borderBottom: "1px solid #F3F4F6" }}>
                                        {[{ id: "medida", label: "COR / MEDIDA" }, { id: "rl", label: "RL" }, { id: "kg", label: "KG" }].map(col => (
                                            <div key={col.id} onClick={() => handleSort(col.id)} style={{ fontSize: 10, fontWeight: 700, color: sortCor.col === col.id ? c : "#9CA3AF", letterSpacing: "0.06em", cursor: "pointer", userSelect: "none" }}>
                                                {col.label}{sortIcon(col.id)}
                                            </div>
                                        ))}
                                    </div>
                                    {sl.map((l, i) => (
                                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8, padding: "9px 16px", alignItems: "center", borderBottom: i < sl.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: c, background: c + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{l.cor}</span>
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: l.rl > 0 ? "#111827" : "#9CA3AF" }}>
                                                {l.rl > 0 ? `${l.rl.toLocaleString("pt-BR")} RL` : "–"}
                                            </div>
                                            <div style={{ fontSize: 12, color: "#6B7280" }}>
                                                {l.kg > 0 ? `${l.kg.toFixed(tipo === "Poliéster" ? 3 : 1)} kg` : "–"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {view === "dia" && logs.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "56px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nenhum lançamento registrado</div>
                    <div style={{ fontSize: 13, color: "#9CA3AF" }}>Os apontamentos aparecerão aqui após o primeiro lançamento.</div>
                </div>
            ) : view === "dia" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {diasList.map(date => {
                        const turnos = grupos[date];
                        const [d, m, y] = date.split("/");
                        const nomeDia = (d && m && y)
                            ? new Date(+y, +m - 1, +d).toLocaleDateString("pt-BR", { weekday: "long" })
                            : "";
                        const diaRL      = Object.values(turnos).flat().filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (l.qtd  || 0), 0);
                        const diaKg      = Object.values(turnos).flat().filter(l => l.tipo === "Poliéster").reduce((s, l) => s + (l.peso || 0), 0);
                        const diaGorgKg  = Object.values(turnos).flat().filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (l.peso || 0), 0);

                        return (
                            <div key={date} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>
                                {/* Cabeçalho do dia */}
                                <div style={{ padding: "12px 18px", background: "#F9FAFB", borderBottom: "1px solid #ECEDF1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{date}</span>
                                        {nomeDia && <span style={{ fontSize: 12, color: "#9CA3AF", textTransform: "capitalize" }}>{nomeDia}</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        {diaRL     > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#F97316" }}>{diaRL.toLocaleString("pt-BR")} RL</span>}
                                        {diaGorgKg > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{diaGorgKg.toFixed(1)} kg</span>}
                                        {diaKg     > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#6366F1" }}>{diaKg.toFixed(3)} kg</span>}
                                    </div>
                                </div>

                                {/* Turnos do dia */}
                                {Object.entries(turnos).sort(([a], [b]) => +a - +b).map(([turno, lans], idx, arr) => {
                                    const t   = TURNO_INFO[+turno] || TURNO_INFO[1];
                                    const key = `${date}-${turno}`;
                                    const fin = finIdx[key];
                                    const aberto = !!abertos[key];

                                    const turnoRL     = lans.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (l.qtd  || 0), 0);
                                    const turnoKg     = lans.filter(l => l.tipo === "Poliéster").reduce((s, l) => s + (l.peso || 0), 0);
                                    const turnoGorgKg = lans.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (l.peso || 0), 0);
                                    const finalizado = !!fin;

                                    return (
                                        <div key={turno} style={{ borderBottom: idx < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                            {/* Linha do turno */}
                                            <div style={{ padding: "12px 18px", background: t.color + "05" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                                    {/* Esquerda: info turno */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: finalizado ? t.color : "#D1D5DB", flexShrink: 0 }} />
                                                        {editTurnoKey === fin?.firebaseKey ? (
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
                                                                <select defaultValue={+turno} onChange={e => handleEditTurnoNumero(fin, +e.target.value)}
                                                                    style={{ fontSize: 12, fontWeight: 700, border: `1.5px solid ${t.color}`, borderRadius: 6, padding: "3px 8px", color: t.color, background: "#fff", cursor: "pointer" }}>
                                                                    {[1,2,3,4].map(n => <option key={n} value={n}>Turno {n}</option>)}
                                                                </select>
                                                                <button onClick={() => setEditTurnoKey(null)} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #ECEDF1", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#6B7280" }}>Cancelar</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.label}</span>
                                                                {podeEditar && fin && (
                                                                    <button onClick={e => { e.stopPropagation(); setEditTurnoKey(fin.firebaseKey); }}
                                                                        title="Editar número do turno"
                                                                        style={{ fontSize: 11, padding: "1px 6px", border: "1px solid #ECEDF1", borderRadius: 5, background: "transparent", cursor: "pointer", color: "#9CA3AF", lineHeight: 1.4 }}>✏</button>
                                                                )}
                                                            </>
                                                        )}
                                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{t.horario}</span>
                                                        {!finalizado && (
                                                            <span style={{ fontSize: 10, fontWeight: 600, color: "#D97706", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 20, padding: "1px 7px" }}>
                                                                Em andamento
                                                            </span>
                                                        )}
                                                        <MaquinasBadge qtdMaquinas={fin?.qtdMaquinas} />
                                                    </div>

                                                    {/* Direita: totais + expandir */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        {turnoRL     > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{turnoRL} RL</span>}
                                                        {turnoGorgKg > 0 && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>{turnoGorgKg.toFixed(1)} kg</span>}
                                                        {turnoKg     > 0 && <span style={{ fontSize: 12, color: "#6366F1", fontWeight: 600 }}>{turnoKg.toFixed(3)} kg</span>}
                                                        {fin?.defeitos && Object.values(fin.defeitos).some(v => Number(v) > 0) && (
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "2px 7px" }}>
                                                                ⚠ {Object.values(fin.defeitos).reduce((s, v) => s + Number(v), 0).toFixed(1)} kg def.
                                                            </span>
                                                        )}
                                                        {podeEditar && fin && onEditarDefeitos && (
                                                            <button onClick={e => { e.stopPropagation(); setEditDefeitos({ fin, valores: { ...(fin.defeitos || {}) } }); }}
                                                                style={{ fontSize: 11, padding: "2px 7px", border: "1px solid #FECACA", borderRadius: 5, background: "#FEF2F2", cursor: "pointer", color: "#DC2626" }}>
                                                                ✏ Def.
                                                            </button>
                                                        )}
                                                        <button onClick={() => toggle(key)} style={{
                                                            fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6,
                                                            border: `1px solid ${aberto ? t.color : "#ECEDF1"}`,
                                                            background: aberto ? t.color + "15" : "transparent",
                                                            color: aberto ? t.color : "#6B7280",
                                                            cursor: "pointer",
                                                        }}>
                                                            {aberto ? "Fechar ▲" : "Ver ▼"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {aberto && <TurnoDetalhe lans={lans} isAdmin={isAdmin} onEdit={setEditLog} isMobile={isMobile} podeEditar={podeEditar} />}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
