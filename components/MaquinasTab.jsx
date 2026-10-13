import { useState } from "react";
import { ref, update, set, push } from "firebase/database";
import { db } from "../firebase";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorSelect } from "../utils/CorSelect";
import { CorInline } from "../utils/CorDot";

const TIPOS = ["Gorgurão", "Poliéster", "Elástico", "Misto", "Overlock", "Soutache", "Trançado"];
const MEDIDAS = ["8mm", "12mm", "14mm", "15mm", "16mm", "20mm", "22mm", "25mm", "30mm", "35mm", "40mm", "50mm"];
const TYPE_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981", Misto: "#EC4899", Overlock: "#0891B2", Soutache: "#7C3AED", "Trançado": "#D97706" };

const FITA_VAZIA = { cor: "", medida: "25mm", qtd: 1, tipo: "" };

function VisaoGeral({ machines, tipo }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[tipo].map(tipo => {
                const color = TYPE_COLOR[tipo];
                const maquinas = machines;
                const totalFitas = maquinas.reduce((a, m) =>
                    a + (m.fitas || []).reduce((s, f) => s + (f.qtd || 0), 0), 0
                );

                return (
                    <div key={tipo} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                        {/* Seção header */}
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{tipo}</span>
                                <span style={{ marginLeft: 8, fontSize: 13, color: "#9CA3AF" }}>
                                    {maquinas.length} máquina{maquinas.length !== 1 ? "s" : ""} · {totalFitas} fitas no total
                                </span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: color, background: color + "15", padding: "3px 10px", borderRadius: 20 }}>
                                {maquinas.length} ativas
                            </span>
                        </div>

                        {maquinas.length === 0 ? (
                            <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
                                Nenhuma máquina produzindo {tipo} no momento.
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 0 }}>
                                {maquinas.map((m, idx) => {
                                    const fitasTipo = (m.fitas || []).filter(f =>
                                        m.tipo === "Misto" ? (f.tipo === tipo || !f.tipo) : true
                                    );
                                    const totalM = fitasTipo.reduce((a, f) => a + (f.qtd || 0), 0);
                                    return (
                                        <div key={m.id} style={{
                                            padding: "12px 20px",
                                            borderRight: (idx + 1) % 3 !== 0 ? "1px solid #F3F4F6" : "none",
                                            borderBottom: "1px solid #F3F4F6",
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{m.nome}</div>
                                                    {m.tipo === "Misto" && (
                                                        <span style={{ fontSize: 10, color: TYPE_COLOR["Misto"], fontWeight: 600 }}>MISTO</span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 12, color: "#6B7280", background: "#F9FAFB", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                                                    {totalM} fitas
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                {fitasTipo.map((f, i) => (
                                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                                        <span style={{ color: "#374151" }}><CorInline cor={f.cor} />{f.cor} <span style={{ color: "#9CA3AF" }}>{f.medida}</span></span>
                                                        <span style={{ color: color, fontWeight: 600 }}>{f.qtd}×</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ModalAlerta({ machine, onConfirmar, onCancelar }) {
    const [motivo, setMotivo] = useState("");
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 4 }}>Reportar Problema</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>{machine.nome}</div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", marginBottom: 8 }}>MOTIVO (obrigatório)</div>
                <textarea
                    value={motivo} onChange={e => setMotivo(e.target.value)}
                    placeholder="Descreva o problema da máquina..."
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1.5px solid #ECEDF1", fontSize: 13, resize: "none", height: 100, boxSizing: "border-box", marginBottom: 20, outline: "none" }}
                    autoFocus
                />

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCancelar} style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>
                        Cancelar
                    </button>
                    <button onClick={() => motivo.trim() && onConfirmar(motivo.trim())} disabled={!motivo.trim()} style={{
                        flex: 1, padding: 12, borderRadius: 8, border: "none",
                        background: motivo.trim() ? "#DC2626" : "#ECEDF1",
                        color: motivo.trim() ? "#fff" : "#9CA3AF",
                        fontWeight: 700, fontSize: 13, cursor: motivo.trim() ? "pointer" : "not-allowed",
                    }}>
                        Enviar Alerta
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MaquinasTab({ machines: machinesRaw, tiposFiltro = null, userRole, userName, notify, editMachine, setEditMachine, onUpdateFita, alertas = [], onReportarProblema, historicoFitas = {}, readOnly = false }) {
    const machines = tiposFiltro ? machinesRaw.filter(m => tiposFiltro.includes(m.tipo)) : machinesRaw;
    const visaoTabs = [
        { id: "todas", label: "Todas" },
        ...(tiposFiltro || ["Gorgurão", "Poliéster", "Elástico"]).filter(t => t !== "Misto").map(t => ({ id: t, label: t, color: TYPE_COLOR[t] })),
    ];
    const canEdit = !readOnly;
    const [addingMachine, setAddingMachine] = useState(false);
    const [newMachineName, setNewMachineName] = useState("");
    const [editingName, setEditingName] = useState(null); // machineId
    const [editingNameVal, setEditingNameVal] = useState("");
    const [visaoTab, setVisaoTab] = useState("todas");
    const [modalAlerta, setModalAlerta] = useState(null);
    const [historicoAberto, setHistoricoAberto] = useState({});

    const handleAddMachine = async () => {
        const nome = newMachineName.trim();
        if (!nome) return;
        const id = Date.now();
        const tipoDefault = (tiposFiltro && tiposFiltro.length > 0) ? tiposFiltro[0] : "Gorgurão";
        await set(ref(db, `machines/${id}`), { id, nome, tipo: tipoDefault, fitas: [] });
        setNewMachineName("");
        setAddingMachine(false);
        notify("Máquina adicionada!");
    };

    const handleRenumerar = async (machine) => {
        const val = editingNameVal.trim();
        const num = Number(val);
        if (val && isFinite(num) && num > 0 && num !== machine.numero) {
            await update(ref(db, `machines/${machine.id}`), { numero: num });
            notify("Número atualizado!");
        }
        setEditingName(null);
    };

    const handleChangeTipo = async (machine, novoTipo) => {
        await update(ref(db, `machines/${machine.id}`), { tipo: novoTipo });
        notify("Tipo atualizado!");
    };

    const handleAddFita = async (machine) => {
        const novasFitas = [...(machine.fitas || []), { ...FITA_VAZIA }];
        await update(ref(db, `machines/${machine.id}`), { fitas: novasFitas });
        await push(ref(db, `historicoFitas/${machine.id}`), {
            tipo: "adicao",
            para: { cor: "", medida: "25mm", qtd: 1 },
            timestamp: new Date().toISOString(),
            usuario: userName || "—",
        });
    };

    const handleRemoveFita = async (machine, idx) => {
        const fitas = Array.isArray(machine.fitas) ? machine.fitas : Object.values(machine.fitas || {});
        const fitaRemovida = fitas[idx];
        const novasFitas = fitas.filter((_, i) => i !== idx);
        const anterior = { ...fitaRemovida, removidaEm: new Date().toISOString() };
        const prevAnt = machine.fitasAnteriores
            ? (Array.isArray(machine.fitasAnteriores) ? machine.fitasAnteriores : Object.values(machine.fitasAnteriores))
            : [];
        const fitasAnteriores = [...prevAnt, anterior];
        await update(ref(db, `machines/${machine.id}`), { fitas: novasFitas, fitasAnteriores });
        if (fitaRemovida?.cor) {
            await push(ref(db, `historicoFitas/${machine.id}`), {
                tipo: "remocao",
                de: { cor: fitaRemovida.cor, medida: fitaRemovida.medida, qtd: fitaRemovida.qtd },
                timestamp: new Date().toISOString(),
                usuario: userName || "—",
            });
        }
        notify("Fita removida!");
    };

    const pertenceAoTipo = (m, tipo) => {
        if (m.tipo === tipo) return true;
        if (m.tipo === "Misto") {
            const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
            // fitas com tipo explícito
            if (fitas.some(f => f.tipo === tipo)) return true;
            // fitas sem tipo → pertence ao que está produzindo (ou a todos se não definido)
            const temFitaSemTipo = fitas.some(f => !f.tipo);
            if (temFitaSemTipo) {
                if (!m.produzindo) return true; // sem produzindo definido: aparece em todos
                return m.produzindo === tipo;
            }
        }
        return false;
    };

    const machinesFiltradas = visaoTab === "todas"
        ? machines
        : machines.filter(m => pertenceAoTipo(m, visaoTab));

    return (
        <div style={{ padding: "24px" }}>
            {modalAlerta && (
                <ModalAlerta
                    machine={modalAlerta}
                    onConfirmar={(motivo) => { onReportarProblema(modalAlerta.id, modalAlerta.nome, motivo); setModalAlerta(null); }}
                    onCancelar={() => setModalAlerta(null)}
                />
            )}
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
                        Máquinas <span style={{ color: "#9CA3AF", fontWeight: 400 }}>{machines.length}</span>
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Configuração de fitas por máquina</p>
                </div>
                {canEdit && (
                    <button onClick={() => setAddingMachine(v => !v)} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", background: "#F97316", border: "none",
                        borderRadius: 8, fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 600,
                    }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova Máquina
                    </button>
                )}
            </div>

            {/* Abas de visão */}
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 10, marginBottom: 20, display: "flex", overflow: "hidden" }}>
                {visaoTabs.map(vt => (
                    <button key={vt.id} onClick={() => setVisaoTab(vt.id)} style={{
                        flex: 1, padding: "11px 8px", border: "none", background: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: visaoTab === vt.id ? 700 : 400,
                        color: visaoTab === vt.id ? (vt.color || "#111827") : "#6B7280",
                        borderBottom: visaoTab === vt.id ? `2.5px solid ${vt.color || "#111827"}` : "2.5px solid transparent",
                        transition: "all 0.15s",
                    }}>
                        {vt.label}
                        {vt.id !== "todas" && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: visaoTab === vt.id ? vt.color : "#9CA3AF", fontWeight: 600 }}>
                                {machines.filter(m => pertenceAoTipo(m, vt.id)).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Add machine form */}
            {addingMachine && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 10, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                        value={newMachineName}
                        onChange={e => setNewMachineName(e.target.value)}
                        placeholder="Nome da máquina (ex: Máquina 20)"
                        onKeyDown={e => e.key === "Enter" && handleAddMachine()}
                        style={{ flex: 1, padding: "8px 11px", border: "1px solid #ECEDF1", borderRadius: 7, fontSize: 13, outline: "none" }}
                    />
                    <button onClick={handleAddMachine} style={{ padding: "8px 18px", background: "#F97316", border: "none", borderRadius: 7, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        Adicionar
                    </button>
                    <button onClick={() => setAddingMachine(false)} style={{ padding: "8px 14px", background: "transparent", border: "1px solid #ECEDF1", borderRadius: 7, color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
                        Cancelar
                    </button>
                </div>
            )}

            {/* Visão agrupada por tipo */}
            {visaoTab !== "todas" && <VisaoGeral machines={machinesFiltradas} tipo={visaoTab} />}

            {/* Machine cards */}
            {visaoTab === "todas" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
                {machinesFiltradas.map(m => {
                    const accentColor = TYPE_COLOR[m.tipo] || "#9CA3AF";
                    const isEditing = editMachine === m.id;
                    const totalFitas = (m.fitas || []).reduce((a, f) => a + (f.qtd || 0), 0);
                    const temAlerta = alertas.some(a => a.machineId === m.id && a.status === "aberto");

                    return (
                        <div key={m.id} style={{ background: "#fff", border: `1px solid ${temAlerta ? "#FECACA" : "#ECEDF1"}`, borderRadius: 12, overflow: "hidden" }}>
                            {/* Card header */}
                            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #F3F4F6", background: temAlerta ? "#FFF5F5" : "transparent" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isEditing ? 10 : 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: temAlerta ? "#DC2626" : accentColor, flexShrink: 0 }} />
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{m.nome.replace(/\s*\d+$/, "")}</span>
                                                {canEdit && editingName === m.id ? (
                                                    <input
                                                        autoFocus
                                                        value={editingNameVal}
                                                        onChange={e => setEditingNameVal(e.target.value)}
                                                        onBlur={() => handleRenumerar(m)}
                                                        onKeyDown={e => { if (e.key === "Enter") handleRenumerar(m); if (e.key === "Escape") setEditingName(null); }}
                                                        style={{ fontWeight: 700, fontSize: 13, color: "#F97316", border: "none", borderBottom: "2px solid #F97316", outline: "none", background: "transparent", width: 44, padding: "0 2px", textAlign: "center" }}
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() => { if (canEdit) { setEditingName(m.id); setEditingNameVal(String(m.numero ?? "")); } }}
                                                        style={{ fontWeight: 700, fontSize: 13, color: "#9CA3AF", background: "#F3F4F6", borderRadius: 5, padding: "1px 7px", cursor: canEdit ? "text" : "default" }}
                                                    >#{m.numero ?? "—"}</span>
                                                )}
                                                {temAlerta && <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEE2E2", padding: "1px 7px", borderRadius: 20 }}>PARADA</span>}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                                                <span style={{ color: accentColor, fontWeight: 600 }}>{m.tipo}</span>
                                                {m.tipo === "Misto" && m.produzindo && (
                                                    <span style={{ marginLeft: 4 }}>· fazendo <strong style={{ color: "#374151" }}>{m.produzindo}</strong></span>
                                                )}
                                                {" "}· {totalFitas} fitas
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {canEdit && !temAlerta && onReportarProblema && (
                                            <button onClick={() => setModalAlerta(m)} style={{
                                                padding: "5px 10px", fontSize: 11, borderRadius: 7, cursor: "pointer", fontWeight: 600,
                                                background: "transparent", border: "1px solid #FECACA", color: "#DC2626",
                                            }}>
                                                ⚠ Problema
                                            </button>
                                        )}
                                        {canEdit && (
                                            <button onClick={() => setEditMachine(isEditing ? null : m.id)} style={{
                                                padding: "5px 12px", fontSize: 12, borderRadius: 7, cursor: "pointer", fontWeight: 600,
                                                background: isEditing ? "#FFF7ED" : "transparent",
                                                border: "1px solid #ECEDF1",
                                                color: isEditing ? "#F97316" : "#6B7280",
                                            }}>
                                                {isEditing ? "Fechar" : "Editar"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Tipo selector (only in edit mode) */}
                                {isEditing && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 6 }}>TIPO DA MÁQUINA</div>
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            {(tiposFiltro && tiposFiltro.length > 0 ? tiposFiltro : TIPOS).map(t => (
                                                <button key={t} onClick={() => handleChangeTipo(m, t)} style={{
                                                    padding: "4px 12px", borderRadius: 20, border: "1.5px solid",
                                                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                                                    borderColor: m.tipo === t ? TYPE_COLOR[t] : "#ECEDF1",
                                                    background: m.tipo === t ? TYPE_COLOR[t] + "20" : "transparent",
                                                    color: m.tipo === t ? TYPE_COLOR[t] : "#6B7280",
                                                }}>
                                                    {t}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Produzindo agora (só para Misto) */}
                                        {m.tipo === "Misto" && (
                                            <div style={{ marginTop: 10 }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 6 }}>PRODUZINDO AGORA</div>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    {["Gorgurão", "Poliéster", "Elástico"].map(t => (
                                                        <button key={t} onClick={async () => {
                                                            await update(ref(db, `machines/${m.id}`), { produzindo: t });
                                                            notify(`Máquina ${m.nome}: produzindo ${t}`);
                                                        }} style={{
                                                            padding: "4px 12px", borderRadius: 20, border: "1.5px solid",
                                                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                                                            borderColor: m.produzindo === t ? TYPE_COLOR[t] : "#ECEDF1",
                                                            background: m.produzindo === t ? TYPE_COLOR[t] + "20" : "transparent",
                                                            color: m.produzindo === t ? TYPE_COLOR[t] : "#6B7280",
                                                        }}>
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Fitas list */}
                            <div style={{ padding: "6px 0" }}>
                                {(m.fitas || []).length === 0 && !isEditing && (
                                    <div style={{ padding: "14px 18px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>Nenhuma fita configurada</div>
                                )}
                                {isEditing ? (
                                    (m.fitas || []).map((f, i) => (
                                        <div key={i} style={{
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            padding: "8px 16px",
                                            borderBottom: i < m.fitas.length - 1 ? "1px solid #F9FAFB" : "none",
                                        }}>
                                            <EditRow
                                                fita={f}
                                                medidas={MEDIDAS}
                                                isMisto={m.tipo === "Misto"}
                                                onSave={(updated) => onUpdateFita(m.id, i, updated)}
                                                onRemove={() => handleRemoveFita(m, i)}
                                            />
                                        </div>
                                    ))
                                ) : m.tipo === "Misto" ? (() => {
                                    // Agrupa por tipo para não repetir em cada linha
                                    const grupos = {};
                                    (m.fitas || []).forEach((f, i) => {
                                        const t = f.tipo || "—";
                                        if (!grupos[t]) grupos[t] = [];
                                        grupos[t].push({ ...f, _i: i });
                                    });
                                    return Object.entries(grupos).map(([tipo, fitas]) => (
                                        <div key={tipo}>
                                            <div style={{ padding: "5px 16px 3px", background: "#F9FAFB", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLOR[tipo] || "#9CA3AF", letterSpacing: "0.07em" }}>{tipo.toUpperCase()}</span>
                                            </div>
                                            {fitas.map((f, fi) => (
                                                <div key={f._i} style={{
                                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                                    padding: "7px 16px",
                                                    borderBottom: fi < fitas.length - 1 ? "1px solid #F9FAFB" : "none",
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, minWidth: 36 }}>{f.medida}</span>
                                                        <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}><CorInline cor={f.cor} />{f.cor}</span>
                                                    </div>
                                                    <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, background: "#F9FAFB", padding: "2px 8px", borderRadius: 6 }}>
                                                        {f.qtd} fitas
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ));
                                })() : (m.fitas || []).map((f, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "8px 16px",
                                        borderBottom: i < m.fitas.length - 1 ? "1px solid #F9FAFB" : "none",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, minWidth: 36 }}>{f.medida}</span>
                                            <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}><CorInline cor={f.cor} />{f.cor}</span>
                                        </div>
                                        <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, background: "#F9FAFB", padding: "2px 8px", borderRadius: 6 }}>
                                            {f.qtd} fitas
                                        </span>
                                    </div>
                                ))}

                                {/* Add fita button (edit mode) */}
                                {isEditing && (
                                    <button onClick={() => handleAddFita(m)} style={{
                                        display: "flex", alignItems: "center", gap: 6,
                                        width: "100%", padding: "10px 16px", background: "transparent",
                                        border: "none", borderTop: "1px dashed #ECEDF1",
                                        color: "#F97316", fontSize: 13, fontWeight: 600,
                                        cursor: "pointer",
                                    }}>
                                        <span style={{ fontSize: 18 }}>+</span> Adicionar fita
                                    </button>
                                )}
                            </div>

                            {/* Histórico de alterações (últimas 24h) */}
                            {(() => {
                                const limite24h = Date.now() - 24 * 60 * 60 * 1000;
                                const hist = historicoFitas[m.id]
                                    ? Object.values(historicoFitas[m.id])
                                        .filter(h => h.timestamp && new Date(h.timestamp).getTime() >= limite24h)
                                        .sort((a, b) => b.timestamp?.localeCompare(a.timestamp))
                                    : [];
                                const aberto = !!historicoAberto[m.id];
                                return (
                                    <div style={{ borderTop: "1px solid #F3F4F6", padding: "10px 14px" }}>
                                        <button onClick={() => setHistoricoAberto(p => ({ ...p, [m.id]: !p[m.id] }))} style={{
                                            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                            background: "#fff", border: "1px solid #ECEDF1", borderRadius: 10,
                                            padding: "10px 14px", cursor: "pointer", textAlign: "left",
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Histórico</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, background: hist.length ? "#FFF7ED" : "#F3F4F6", color: hist.length ? "#F97316" : "#9CA3AF", borderRadius: 20, padding: "1px 8px" }}>
                                                    {hist.length}
                                                </span>
                                                <span style={{ fontSize: 10, color: "#9CA3AF" }}>últimas 24h</span>
                                            </div>
                                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                                        </button>

                                        {aberto && (
                                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                                {hist.length === 0 ? (
                                                    <div style={{ padding: "14px", textAlign: "center", fontSize: 12, color: "#9CA3AF", background: "#F9FAFB", borderRadius: 8 }}>
                                                        Nenhuma alteração nas últimas 24h.
                                                    </div>
                                                ) : hist.map((h, i) => {
                                                    const hora = h.timestamp ? new Date(h.timestamp).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
                                                    const isAlteracao = h.tipo === "alteracao";
                                                    const isAdicao = h.tipo === "adicao";
                                                    const cor = isAdicao ? "#16A34A" : isAlteracao ? "#F97316" : "#DC2626";
                                                    const bg  = isAdicao ? "#F0FDF4" : isAlteracao ? "#FFF7ED" : "#FEF2F2";
                                                    const icone = isAdicao ? "+" : isAlteracao ? "↔" : "−";
                                                    return (
                                                        <div key={i} style={{
                                                            display: "flex", alignItems: "center", gap: 10,
                                                            background: bg, borderRadius: 8, padding: "8px 12px",
                                                            border: `1px solid ${cor}20`,
                                                        }}>
                                                            <span style={{ width: 22, height: 22, borderRadius: "50%", background: cor, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icone}</span>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                {isAlteracao ? (
                                                                    <div style={{ fontSize: 12, color: "#374151" }}>
                                                                        <span style={{ fontWeight: 600 }}><CorInline cor={h.de?.cor} />{h.de?.medida} {h.de?.cor}</span>
                                                                        <span style={{ color: "#9CA3AF", margin: "0 5px" }}>→</span>
                                                                        <span style={{ fontWeight: 700, color: "#111827" }}><CorInline cor={h.para?.cor} />{h.para?.medida} {h.para?.cor}</span>
                                                                        {h.de?.qtd !== h.para?.qtd && <span style={{ color: "#9CA3AF", fontSize: 11, marginLeft: 4 }}>({h.de?.qtd}→{h.para?.qtd} fitas)</span>}
                                                                    </div>
                                                                ) : isAdicao ? (
                                                                    <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>Fita adicionada</div>
                                                                ) : (
                                                                    <div style={{ fontSize: 12, color: "#DC2626" }}>Removeu <strong><CorInline cor={h.de?.cor} />{h.de?.medida} {h.de?.cor}</strong></div>
                                                                )}
                                                                {h.usuario && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{h.usuario}</div>}
                                                            </div>
                                                            <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>{hora}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>}
        </div>
    );
}

function EditRow({ fita, medidas, isMisto, onSave, onRemove }) {
    const [cor, setCor] = useState(fita.cor);
    const [medida, setMedida] = useState(fita.medida);
    const [qtd, setQtd] = useState(fita.qtd);
    const [tipo, setTipo] = useState(fita.tipo || "");

    return (
        <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center", flexWrap: "wrap" }}>
            <CorSelect value={cor} onChange={e => setCor(e.target.value)} options={COR_CATALOG_SORTED} placeholder="Cor" style={{ ...fieldStyle, width: 160 }} />
            <select value={medida} onChange={e => setMedida(e.target.value)} style={fieldStyle}>
                {medidas.map(x => <option key={x}>{x}</option>)}
            </select>
            <input value={qtd} type="number" min={1} onChange={e => setQtd(Number(e.target.value))} style={{ ...fieldStyle, width: 50 }} />
            {isMisto && (
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...fieldStyle, width: 90 }}>
                    <option value="">Tipo</option>
                    <option>Gorgurão</option>
                    <option>Poliéster</option>
                    <option>Elástico</option>
                </select>
            )}
            <button onClick={() => onSave({ cor, medida, qtd, tipo })} style={{ padding: "5px 10px", background: "#F97316", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Salvar
            </button>
            <button onClick={onRemove} style={{ padding: "5px 8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, color: "#DC2626", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                ✕
            </button>
        </div>
    );
}

const fieldStyle = {
    padding: "5px 8px", border: "1px solid #ECEDF1", borderRadius: 6,
    fontSize: 12, color: "#111827", background: "#F9FAFB", outline: "none",
};

