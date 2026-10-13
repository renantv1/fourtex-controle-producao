import { useState, useEffect, useCallback } from "react";
import { fmtInt, parseNum } from "../utils";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return isMobile;
}

const TURNO_INFO = {
    1: { label: "Turno 1", horario: "Diurno",  color: "#10B981" },
    2: { label: "Turno 2", horario: "Vespert.", color: "#0891B2" },
    4: { label: "Bônus",   horario: "Sábado",  color: "#EAB308" },
};

function getMaquinas(machines, user) {
    const elastico = machines.filter(m => m.tipo === "Elástico");
    if (user?.maquinasPermitidas?.length) {
        return elastico.filter(m => user.maquinasPermitidas.includes(m.id));
    }
    return elastico;
}

function calcMetaSugerida(machines, user) {
    const maquinas = getMaquinas(machines, user);
    const totalFitas = maquinas.reduce((s, m) => {
        const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
        return s + fitas.length;
    }, 0);
    return Math.round(4.5 * totalFitas);
}

const inputStyle = { width: 64, textAlign: "center", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 8, fontSize: 14, color: "#111827", background: "#F9FAFB", outline: "none", boxSizing: "border-box" };

// ─── ConfigTurnoElastico ──────────────────────────────────────────────────────
function ConfigTurnoElastico({ machines, user, onSalvar }) {
    const maquinas = getMaquinas(machines, user);
    const totalDisp = maquinas.length;

    const [turnoSel, setTurnoSel] = useState(null);
    const [qtdMaquinas, setQtdMaquinas] = useState("");

    const pronto = turnoSel && Number(qtdMaquinas) > 0;

    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "24px" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>
                Iniciar turno de produção
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>
                Configure o turno e as máquinas. Essas informações ficam salvas até finalizar o turno.
            </div>

            {/* Seleção de turno */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>TURNO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(TURNO_INFO).map(([num, info]) => {
                        const sel = turnoSel === Number(num);
                        return (
                            <button key={num} onClick={() => setTurnoSel(Number(num))} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "12px 16px", borderRadius: 10, border: "1.5px solid",
                                borderColor: sel ? info.color : "#ECEDF1",
                                background: sel ? info.color + "10" : "#F9FAFB",
                                cursor: "pointer", textAlign: "left",
                            }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: info.color, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: sel ? info.color : "#374151" }}>{info.label}</div>
                                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{info.horario}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Máquinas rodando */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>MÁQUINAS RODANDO</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", width: 80 }}>Elástico</span>
                    <input
                        type="number" min={0} max={totalDisp}
                        value={qtdMaquinas}
                        onChange={e => setQtdMaquinas(e.target.value)}
                        placeholder="0"
                        style={inputStyle}
                    />
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>de {totalDisp} disponíveis</span>
                </div>
            </div>

            <button
                onClick={() => pronto && onSalvar({ numero: turnoSel, qtdMaquinas: Number(qtdMaquinas), meta: 0, metrosPorRolo: 25 })}
                disabled={!pronto}
                style={{
                    width: "100%", padding: "12px", background: pronto ? "#10B981" : "#ECEDF1",
                    border: "none", borderRadius: 9, color: pronto ? "#fff" : "#9CA3AF",
                    fontWeight: 700, fontSize: 14, cursor: pronto ? "pointer" : "default",
                    transition: "background 0.15s",
                }}
            >
                Confirmar e iniciar lançamentos →
            </button>
        </div>
    );
}

// ─── LancamentoElastico ───────────────────────────────────────────────────────
function LancamentoElastico({ machines, turnoAtual, onSubmit, user, onEditarMaquinas }) {
    const maquinas = getMaquinas(machines, user);
    const [corMedida, setCorMedida] = useState(null); // { cor, medida }
    const [unidade, setUnidade] = useState("RL");
    const [valor, setValor] = useState("");
    const [loading, setLoading] = useState(false);

    const COLOR = "#10B981";
    const metrosPorRolo = turnoAtual?.metrosPorRolo || 25;
    const rlConvertido = unidade === "Metros" && valor ? Math.round(parseNum(valor) / metrosPorRolo) : null;

    // Agrega fitas de todas as máquinas elásticas (deduplica por medida+cor)
    const fitasMap = {};
    maquinas.forEach(m => {
        const fs = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
        fs.forEach(f => {
            const cor = (f.cor || "").trim();
            const medida = (f.medida || "").trim();
            if (!cor || !medida) return;
            const k = `${medida}|${cor}`;
            if (!fitasMap[k]) fitasMap[k] = { cor, medida };
        });
    });
    const porMedida = {};
    Object.values(fitasMap).forEach(f => {
        if (!porMedida[f.medida]) porMedida[f.medida] = [];
        porMedida[f.medida].push(f);
    });

    const handleLancar = async () => {
        if (!corMedida || !valor) return;
        const num = parseNum(valor);
        if (!num || num <= 0) return;
        const qtd = unidade === "RL" ? num : Math.max(1, Math.round(num / metrosPorRolo));
        const metros = unidade === "Metros" ? num : 0;
        setLoading(true);
        await onSubmit({ cor: corMedida.cor.trim(), medida: corMedida.medida.trim(), qtd, metros, unidade });
        setLoading(false);
        setValor("");
    };

    const pronto = corMedida && valor && parseNum(valor) > 0;
    const temFitas = Object.keys(porMedida).length > 0;

    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12 }}>
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>Lançar Produção</h4>
                <button onClick={onEditarMaquinas} style={{ fontSize: 12, color: "#6B7280", background: "none", border: "1px solid #ECEDF1", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                    Editar turno
                </button>
            </div>

            {/* Resumo do turno — igual ao Gorgurão */}
            <div style={{ padding: "10px 20px", background: "#F9FAFB", borderBottom: "1px solid #F3F4F6", display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLOR }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>{turnoAtual?.qtdMaquinas || 0}</span>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>Elástico</span>
                </div>
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* COR / MEDIDA */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>COR / MEDIDA</div>
                    {!temFitas ? (
                        <p style={{ fontSize: 12, color: "#D97706", margin: 0 }}>Nenhuma fita configurada nas máquinas elásticas.</p>
                    ) : (
                        <div style={{ background: "#F0FDF4", border: `1.5px solid ${COLOR}25`, borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: COLOR, letterSpacing: "0.06em", marginBottom: 10 }}>ELÁSTICO</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {Object.entries(porMedida).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).map(([medida, itens]) => (
                                    <div key={medida}>
                                        <div style={{ fontSize: 11, color: COLOR, fontWeight: 700, marginBottom: 5, paddingLeft: 2, opacity: 0.7 }}>{medida}</div>
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            {itens.map((f, i) => {
                                                const sel = corMedida?.cor === f.cor && corMedida?.medida === f.medida;
                                                return (
                                                    <button key={i} onClick={() => setCorMedida({ cor: f.cor, medida: f.medida })} style={{
                                                        padding: "6px 13px", borderRadius: 8,
                                                        border: `1.5px solid ${sel ? COLOR : COLOR + "50"}`,
                                                        fontSize: 12, fontWeight: sel ? 700 : 500, cursor: "pointer",
                                                        background: sel ? COLOR : "#fff",
                                                        color: sel ? "#fff" : COLOR,
                                                        transition: "all 0.1s",
                                                        boxShadow: sel ? `0 2px 6px ${COLOR}40` : "none",
                                                    }}>
                                                        {f.cor}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RL / Metros + Quantidade */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em" }}>UNIDADE</div>
                        <div style={{ display: "flex", gap: 4 }}>
                            {["RL", "Metros"].map(u => (
                                <button key={u} onClick={() => { setUnidade(u); setValor(""); }} style={{
                                    flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                    border: unidade === u ? `1.5px solid ${COLOR}` : "1.5px solid #ECEDF1",
                                    background: unidade === u ? COLOR + "15" : "#F9FAFB",
                                    color: unidade === u ? COLOR : "#6B7280",
                                    transition: "all 0.12s",
                                }}>{u}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em" }}>QUANTIDADE</div>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={valor}
                            onChange={e => setValor(fmtInt(e.target.value))}
                            placeholder="0"
                            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                        />
                        {unidade === "Metros" && rlConvertido !== null && (
                            <div style={{ fontSize: 10, color: COLOR, marginTop: 2, fontWeight: 600 }}>≈ {rlConvertido} RL</div>
                        )}
                    </div>
                </div>

                {/* Submit */}
                <button onClick={handleLancar} disabled={loading || !pronto} style={{
                    width: "100%", padding: "11px",
                    background: pronto ? COLOR : "#ECEDF1",
                    border: "none", borderRadius: 9,
                    color: pronto ? "#fff" : "#9CA3AF",
                    fontWeight: 700, fontSize: 14,
                    cursor: pronto ? "pointer" : "default",
                    transition: "background 0.15s",
                }}>
                    {loading ? "Lançando..." : corMedida ? `Lançar ${corMedida.medida} ${corMedida.cor} →` : "Selecione a cor/medida"}
                </button>
            </div>
        </div>
    );
}

// ─── HistoricoTurnoElastico ───────────────────────────────────────────────────
function HistoricoTurnoElastico({ lans, meta, turnoAtual, turnoFinalizacoes = [], isAdmin, isMobile, defaultAberto = true, onEditLog, onDeleteLog, podeEditar = true }) {
    const [datasAbertas, setDatasAbertas] = useState({});
    const [modalEdit, setModalEdit] = useState(null); // { log, vals }
    const t = TURNO_INFO[turnoAtual?.numero] || TURNO_INFO[1];

    // Mapa de data → defeitosKg somados
    const defeitosMap = {};
    turnoFinalizacoes.forEach(f => {
        if (!f.inicio || !f.defeitosKg) return;
        const date = new Date(f.inicio).toLocaleDateString("pt-BR");
        defeitosMap[date] = (defeitosMap[date] || 0) + (f.defeitosKg || 0);
    });

    const horaOnly = (ts) => {
        if (!ts) return "";
        const m = ts.match(/(\d{2}:\d{2})/);
        return m ? m[1] : ts;
    };

    // Agrupa por data
    const grupos = {};
    lans.forEach(l => {
        const date = l.turnoInicio
            ? new Date(l.turnoInicio).toLocaleDateString("pt-BR")
            : (l.timestamp ? l.timestamp.split(",")[0] : "–");
        if (!grupos[date]) grupos[date] = [];
        grupos[date].push(l);
    });

    const diasList = Object.keys(grupos).sort((a, b) => {
        const p = s => { const [d, m, y] = s.split("/"); return new Date(+y, +m - 1, +d); };
        return p(b) - p(a);
    });

    const toggle = (date) => setDatasAbertas(p => ({ ...p, [date]: !p[date] }));

    // Abre o dia mais recente por padrão
    useState(() => {
        if (diasList.length > 0 && defaultAberto) {
            setDatasAbertas({ [diasList[0]]: true });
        }
    });

    if (lans.length === 0) return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>Nenhum lançamento ainda</div>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Modal editar lançamento elástico */}
            {modalEdit && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 360 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Lançamento</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>{modalEdit.log.cor} {modalEdit.log.medida} · {modalEdit.log.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0]}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>QUANTIDADE (RL)</label>
                                <input type="number" min={0} value={modalEdit.vals.qtd}
                                    onChange={e => setModalEdit(p => ({ ...p, vals: { ...p.vals, qtd: e.target.value } }))}
                                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid #ECEDF1", borderRadius: 8, fontSize: 14, outline: "none" }} />
                            </div>
                            {modalEdit.log.unidade === "Metros" && (
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>METROS</label>
                                    <input type="number" min={0} value={modalEdit.vals.metros}
                                        onChange={e => setModalEdit(p => ({ ...p, vals: { ...p.vals, metros: e.target.value } }))}
                                        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid #ECEDF1", borderRadius: 8, fontSize: 14, outline: "none" }} />
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setModalEdit(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={() => {
                                const novos = { qtd: parseFloat(modalEdit.vals.qtd) || 0, ...(modalEdit.log.unidade === "Metros" ? { metros: parseFloat(modalEdit.vals.metros) || 0 } : {}) };
                                onEditLog(modalEdit.log.firebaseKey, modalEdit.log, novos);
                                setModalEdit(null);
                            }} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}
            {diasList.map(date => {
                const dlans = grupos[date];
                const aberto = !!datasAbertas[date];
                const totalRL = dlans.reduce((s, l) => s + (l.qtd || 0), 0);
                const totalM  = dlans.reduce((s, l) => s + (Number(l.metros) || 0), 0);
                const nomeDia = (() => {
                    const [d, m, y] = date.split("/");
                    if (!d || !m || !y) return "";
                    const nome = new Date(+y, +m - 1, +d).toLocaleDateString("pt-BR", { weekday: "long" });
                    return nome.charAt(0).toUpperCase() + nome.slice(1);
                })();

                return (
                    <div key={date} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                        <div onClick={() => toggle(date)} style={{
                            padding: "10px 16px", background: "#F9FAFB",
                            borderBottom: aberto ? "1px solid #ECEDF1" : "none",
                            display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{date}</span>
                                {nomeDia && <span style={{ fontSize: 12, color: "#9CA3AF" }}>{nomeDia}</span>}
                                {totalRL > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: t.color, marginLeft: 4 }}>{totalRL} RL</span>}
                                {totalM  > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "1px 8px" }}>{totalM.toLocaleString("pt-BR")} m</span>}
                            </div>
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                        </div>

                        {defeitosMap[date] > 0 && (
                            <div style={{ padding: "5px 16px", background: "#FFF7ED", borderTop: "1px solid #FED7AA", display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#D97706" }}>⚠ Defeitos:</span>
                                <span style={{ fontSize: 11, color: "#92400E", background: "#FEF3C7", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>{defeitosMap[date].toFixed(1)} kg</span>
                            </div>
                        )}
                        {aberto && (
                            <div>
                                <div style={{ display: "grid", gridTemplateColumns: ((isAdmin || podeEditar) && onEditLog && !isMobile) ? "1fr 90px 56px 52px" : "1fr 90px 56px", gap: 8, padding: "6px 16px", borderBottom: "1px solid #F3F4F6" }}>
                                    {["FITA", "QTD", "HORA"].map(h => (
                                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em" }}>{h}</div>
                                    ))}
                                    {(isAdmin || podeEditar) && onEditLog && !isMobile && <div />}
                                </div>
                                {[...dlans].reverse().map((l, i) => (
                                    <div key={l.firebaseKey || i} style={{ borderBottom: i < dlans.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                                        <div style={{
                                            display: "grid", gridTemplateColumns: ((isAdmin || podeEditar) && onEditLog && !isMobile) ? "1fr 90px 56px 52px" : "1fr 90px 56px",
                                            gap: 8, padding: isMobile && (isAdmin || podeEditar) && onEditLog ? "9px 16px 4px" : "9px 16px", alignItems: "center",
                                        }}>
                                            <div>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: t.color, background: t.color + "15", padding: "1px 6px", borderRadius: 5, marginRight: 5 }}>{l.medida}</span>
                                                <span style={{ fontSize: 13, color: "#374151" }}>{l.cor}</span>
                                            </div>
                                            <div>
                                                {l.unidade === "Metros"
                                                    ? <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{l.metros}m</span>
                                                    : <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{l.qtd} RL</span>
                                                }
                                            </div>
                                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{horaOnly(l.timestamp)}</div>
                                            {(isAdmin || podeEditar) && onEditLog && !isMobile && (
                                                <div style={{ display: "flex", gap: 3 }}>
                                                    <button onClick={() => setModalEdit({ log: l, vals: { qtd: l.qtd ?? "", metros: l.metros ?? "" } })} title="Editar" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #A7F3D0", background: "#F0FDF4", color: "#059669", fontSize: 11, cursor: "pointer" }}>✏</button>
                                                    <button onClick={() => { if (window.confirm("Excluir este lançamento? O estoque será revertido.")) onDeleteLog(l.firebaseKey, l); }} title="Excluir" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 11, cursor: "pointer" }}>✕</button>
                                                </div>
                                            )}
                                        </div>
                                        {(isAdmin || podeEditar) && onEditLog && isMobile && (
                                            <div style={{ display: "flex", gap: 8, padding: "4px 16px 10px", justifyContent: "flex-end" }}>
                                                <button onClick={() => setModalEdit({ log: l, vals: { qtd: l.qtd ?? "", metros: l.metros ?? "" } })} style={{ padding: "7px 18px", borderRadius: 7, border: "1px solid #A7F3D0", background: "#F0FDF4", color: "#059669", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✏ Editar</button>
                                                <button onClick={() => { if (window.confirm("Excluir este lançamento? O estoque será revertido.")) onDeleteLog(l.firebaseKey, l); }} style={{ padding: "7px 18px", borderRadius: 7, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ Excluir</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── ModalFinalizarTurnoElastico ──────────────────────────────────────────────
function ModalFinalizarTurnoElastico({ turnoAtual, total, onFinalizar, onCancelar }) {
    const [confirmando, setConfirmando] = useState(false);
    const [defeitos, setDefeitos] = useState("");
    const info = TURNO_INFO[turnoAtual?.numero] || { label: `Turno ${turnoAtual?.numero}`, color: "#10B981" };
    const meta = turnoAtual?.meta || 0;
    const bateu = meta > 0 ? total >= meta : null;

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400 }}>
                {!confirmando ? (
                    <>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Finalizar turno de Elástico?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>Confira os dados antes de confirmar.</div>

                        <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "14px 16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 12, color: "#6B7280" }}>Turno</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: info.color }}>{info.label}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 12, color: "#6B7280" }}>Total produzido</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{total} RL</span>
                            </div>
                            {meta > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 12, color: "#6B7280" }}>Meta</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: bateu ? "#10B981" : "#EF4444" }}>
                                        {meta} RL {bateu ? "✓ Atingida" : "✗ Não atingida"}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Defeitos */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>DEFEITOS (kg)</label>
                            <input
                                type="number" min="0" step="0.1" value={defeitos}
                                onChange={e => setDefeitos(e.target.value)}
                                placeholder="0.0"
                                style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid #ECEDF1", borderRadius: 8, fontSize: 14, color: "#111827", background: "#F9FAFB", outline: "none" }}
                            />
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={onCancelar} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>
                                Cancelar
                            </button>
                            <button onClick={() => setConfirmando(true)} style={{ flex: 2, padding: "10px", fontSize: 13, fontWeight: 700, background: "#111827", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}>
                                Finalizar
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626", marginBottom: 8 }}>Confirmar finalização?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
                            Esta ação encerrará o turno atual de Elástico e registrará {total} RL no histórico.
                        </div>
                        {Number(defeitos) > 0 && (
                            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 13, color: "#92400E", fontWeight: 600 }}>
                                ⚠ {defeitos} kg de defeitos serão registrados
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmando(false)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>
                                Voltar
                            </button>
                            <button onClick={() => onFinalizar(Number(defeitos) || 0)} style={{ flex: 2, padding: "10px", fontSize: 13, fontWeight: 700, background: "#DC2626", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}>
                                Confirmar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── ProducaoElasticoTab (default export) ─────────────────────────────────────
export default function ProducaoElasticoTab({ machines, logs, turnoAtual, turnoFinalizacoes = [], onSubmit, onFinalizarTurno, onConfigurarTurno, isAdmin, canLaunch, user, onEditLog, onDeleteLog, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [showFinalizar, setShowFinalizar] = useState(false);
    const [editandoTurno, setEditandoTurno] = useState(false);

    const logsElastico = logs.filter(l => l.tipo === "Elástico");
    const logsDoTurno = turnoAtual?.inicio
        ? logsElastico.filter(l => l.turnoInicio === turnoAtual.inicio)
        : [];
    const totalDoTurno = logsDoTurno.reduce((s, l) => s + (l.qtd || 0), 0);

    const configurado = turnoAtual?.configurado;
    const t = TURNO_INFO[turnoAtual?.numero] || TURNO_INFO[1];
    const inicio = turnoAtual?.inicio
        ? new Date(turnoAtual.inicio).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "–";

    return (
        <div style={{ padding: "24px" }}>
            {showFinalizar && (
                <ModalFinalizarTurnoElastico
                    turnoAtual={turnoAtual}
                    total={totalDoTurno}
                    onFinalizar={async (defeitos) => { await onFinalizarTurno(defeitos); setShowFinalizar(false); }}
                    onCancelar={() => setShowFinalizar(false)}
                />
            )}

            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Apontamento — Elástico</h2>
            </div>

            {(!configurado || editandoTurno) ? (
                <>
                    {/* Card do último turno finalizado */}
                    {turnoFinalizacoes.length > 0 && (() => {
                        const ultimo = [...turnoFinalizacoes].sort((a, b) => new Date(b.finalizadoEm || b.inicio) - new Date(a.finalizadoEm || a.inicio))[0];
                        const tInfo = TURNO_INFO[ultimo?.numero] || TURNO_INFO[1];
                        const dataFin = ultimo.finalizadoEm
                            ? new Date(ultimo.finalizadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "–";
                        return (
                            <div style={{
                                background: "#fff", border: `1.5px solid ${tInfo.color}40`, borderRadius: 12,
                                padding: "14px 16px", marginBottom: 20,
                            }}>
                                {/* Linha 1: turno + badge */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: tInfo.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="15" height="15" fill="none" stroke={tInfo.color} strokeWidth="2" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{tInfo.label} — {tInfo.horario}</div>
                                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{dataFin} · {ultimo.finalizadoPor || "–"}</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#F0FDF4", color: "#16A34A", fontWeight: 700, border: "1px solid #BBF7D0", flexShrink: 0 }}>
                                        ✓ Finalizado
                                    </span>
                                </div>
                                {/* Linha 2: totais */}
                                {(ultimo.totalRL > 0 || ultimo.defeitosKg > 0) && (
                                    <div style={{ display: "flex", gap: 16, paddingTop: 8, borderTop: `1px solid ${tInfo.color}20` }}>
                                        {ultimo.totalRL > 0 && (
                                            <div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: tInfo.color }}>{ultimo.totalRL}</div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>TOTAL RL</div>
                                            </div>
                                        )}
                                        {ultimo.defeitosKg > 0 && (
                                            <div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: "#DC2626" }}>{ultimo.defeitosKg.toFixed(1)}</div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>DEFEITOS kg</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {podeEditar && (
                        <div style={{ maxWidth: 480 }}>
                            <ConfigTurnoElastico
                                machines={machines}
                                user={user}
                                onSalvar={(cfg) => { onConfigurarTurno(cfg); setEditandoTurno(false); }}
                            />
                        </div>
                    )}
                    {logsElastico.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <HistoricoTurnoElastico lans={logsElastico} meta={0} turnoAtual={turnoAtual} turnoFinalizacoes={turnoFinalizacoes} isAdmin={isAdmin} isMobile={isMobile} defaultAberto={false} onEditLog={onEditLog} onDeleteLog={onDeleteLog} podeEditar={podeEditar} />
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Card turno ativo */}
                    <div style={{
                        background: "#fff", border: `1.5px solid ${t.color}40`, borderRadius: 12,
                        padding: "16px 20px", marginBottom: 20,
                        display: "flex", flexDirection: isMobile ? "column" : "row",
                        justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 0,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: t.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="20" height="20" fill="none" stroke={t.color} strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{t.label} — {t.horario}</div>
                                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Iniciado em {inicio}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: t.color + "15", color: t.color, fontWeight: 600 }}>
                                Em andamento
                            </span>
                            {(isAdmin || canLaunch) && podeEditar && (
                                <button onClick={() => setShowFinalizar(true)} style={{
                                    padding: "8px 18px", background: t.color, border: "none",
                                    borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                                }}>
                                    Finalizar {t.label} →
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Barra de meta */}
                    {turnoAtual?.meta > 0 && (() => {
                        const meta = turnoAtual.meta;
                        const pct = Math.min(100, Math.round((totalDoTurno / meta) * 100));
                        const color = pct >= 100 ? "#16A34A" : pct >= 60 ? t.color : "#DC2626";
                        return (
                            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: isMobile ? "12px 14px" : "14px 20px", marginBottom: 20 }}>
                                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 8 : 0, marginBottom: 10 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Meta do Turno</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 16, fontSize: 13 }}>
                                        <span style={{ color: "#6B7280" }}>Meta: <strong style={{ color: "#111827" }}>{meta.toLocaleString("pt-BR")} RL</strong></span>
                                        <span style={{ color: "#6B7280" }}>Realizado: <strong style={{ color }}>{totalDoTurno.toLocaleString("pt-BR")} RL</strong></span>
                                        <span style={{ fontWeight: 700, color }}>{pct}%</span>
                                    </div>
                                </div>
                                <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s" }} />
                                </div>
                            </div>
                        );
                    })()}

                    {/* Layout: form em cima | histórico abaixo */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {canLaunch && podeEditar && (
                            <LancamentoElastico
                                machines={machines}
                                turnoAtual={turnoAtual}
                                onSubmit={onSubmit}
                                user={user}
                                onEditarMaquinas={() => setEditandoTurno(true)}
                            />
                        )}
                        <HistoricoTurnoElastico
                            lans={logsDoTurno}
                            meta={turnoAtual.meta || 0}
                            turnoAtual={turnoAtual}
                            turnoFinalizacoes={turnoFinalizacoes}
                            isAdmin={isAdmin}
                            isMobile={isMobile}
                            onEditLog={onEditLog}
                            onDeleteLog={onDeleteLog}
                            podeEditar={podeEditar}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
