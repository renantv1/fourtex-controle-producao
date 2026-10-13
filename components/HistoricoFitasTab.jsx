import { useState } from "react";

const TIPO_CONFIG = {
    alteracao: { cor: "#F97316", bg: "#FFF7ED", border: "#FED7AA", icone: "↔", label: "Troca"   },
    adicao:    { cor: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icone: "+", label: "Adição"  },
    remocao:   { cor: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icone: "−", label: "Remoção" },
};

export default function HistoricoFitasTab({ historicoFitas, machines }) {
    const [diasAbertos, setDiasAbertos] = useState({});
    const toggleDia = (dia) => setDiasAbertos(p => ({ ...p, [dia]: !p[dia] }));

    const machineMap = {};
    machines.forEach(m => { machineMap[m.id] = m.nome || `Máquina ${m.id}`; });

    const todos = [];
    Object.entries(historicoFitas || {}).forEach(([machineId, entries]) => {
        Object.values(entries || {}).forEach(h => {
            todos.push({ ...h, machineId, machineName: machineMap[machineId] || `M${machineId}` });
        });
    });
    todos.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

    const porDia = {};
    todos.forEach(h => {
        const dia = h.timestamp
            ? new Date(h.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
            : "—";
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(h);
    });

    const dias = Object.entries(porDia);

    const totalTrocas   = todos.filter(e => e.tipo === "alteracao").length;
    const totalAdicoes  = todos.filter(e => e.tipo === "adicao").length;
    const totalRemocoes = todos.filter(e => e.tipo === "remocao").length;

    return (
        <div style={{ padding: "24px", maxWidth: 860, margin: "0 auto" }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Histórico de Fitas</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9CA3AF" }}>
                    {todos.length} registro{todos.length !== 1 ? "s" : ""} · {dias.length} dia{dias.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Stat cards */}
            {todos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                    {[
                        { tipo: "alteracao", count: totalTrocas   },
                        { tipo: "adicao",    count: totalAdicoes  },
                        { tipo: "remocao",   count: totalRemocoes },
                    ].map(({ tipo, count }) => {
                        const cfg = TIPO_CONFIG[tipo];
                        return (
                            <div key={tipo} style={{
                                background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                                borderRadius: 12, padding: "14px 18px",
                                display: "flex", alignItems: "center", gap: 12,
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: cfg.cor + "20", color: cfg.cor,
                                    fontSize: 16, fontWeight: 800,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                }}>{cfg.icone}</div>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{count}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: cfg.cor, marginTop: 2 }}>{cfg.label}{count !== 1 ? "s" : ""}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {todos.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, padding: "56px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nenhuma alteração registrada</div>
                    <div style={{ fontSize: 13, color: "#9CA3AF" }}>As trocas de fitas aparecerão aqui automaticamente.</div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {dias.map(([dia, eventos], dIdx) => {
                        const [d, m, y] = dia.split("/");
                        const nomeDia = (d && m && y)
                            ? new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("pt-BR", { weekday: "long" })
                            : "";
                        const qtdTrocas   = eventos.filter(e => e.tipo === "alteracao").length;
                        const qtdAdicoes  = eventos.filter(e => e.tipo === "adicao").length;
                        const qtdRemocoes = eventos.filter(e => e.tipo === "remocao").length;
                        const aberto = !!diasAbertos[dia];

                        return (
                            <div key={dia} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>

                                {/* Cabeçalho do dia */}
                                <button onClick={() => toggleDia(dia)} style={{
                                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                                    padding: "13px 18px", background: aberto ? "#F9FAFB" : "#fff",
                                    border: "none", borderBottom: aberto ? "1px solid #ECEDF1" : "none",
                                    cursor: "pointer", textAlign: "left",
                                }}>
                                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{dia}</span>
                                        {nomeDia && (
                                            <span style={{ fontSize: 12, color: "#9CA3AF", textTransform: "capitalize" }}>{nomeDia}</span>
                                        )}
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, background: "#F3F4F6",
                                            color: "#374151", borderRadius: 20, padding: "2px 8px",
                                        }}>{eventos.length}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        {qtdTrocas   > 0 && <Pill cor="#F97316" border="#FED7AA" bg="#FFF7ED" label={`↔ ${qtdTrocas}`}   />}
                                        {qtdAdicoes  > 0 && <Pill cor="#16A34A" border="#BBF7D0" bg="#F0FDF4" label={`+ ${qtdAdicoes}`}  />}
                                        {qtdRemocoes > 0 && <Pill cor="#DC2626" border="#FECACA" bg="#FEF2F2" label={`− ${qtdRemocoes}`} />}
                                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 2 }}>{aberto ? "▲" : "▼"}</span>
                                    </div>
                                </button>

                                {/* Lista de eventos */}
                                {aberto && (
                                    <div>
                                        {eventos.map((h, i) => {
                                            const cfg  = TIPO_CONFIG[h.tipo] || TIPO_CONFIG.alteracao;
                                            const hora = h.timestamp
                                                ? new Date(h.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                                : "—";
                                            const isLast = i === eventos.length - 1;

                                            return (
                                                <div key={i} style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "4px 56px 1fr auto",
                                                    alignItems: "center",
                                                    borderBottom: isLast ? "none" : "1px solid #F3F4F6",
                                                    minHeight: 60,
                                                }}>
                                                    {/* Barra colorida lateral */}
                                                    <div style={{ height: "100%", background: cfg.cor + "60", borderRadius: 0 }} />

                                                    {/* Badge da máquina */}
                                                    <div style={{ padding: "0 10px", display: "flex", justifyContent: "center" }}>
                                                        <div style={{
                                                            background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                                                            borderRadius: 8, padding: "4px 0", textAlign: "center", width: 36,
                                                        }}>
                                                            <div style={{ fontSize: 12, fontWeight: 800, color: cfg.cor }}>M{h.machineId}</div>
                                                        </div>
                                                    </div>

                                                    {/* Conteúdo */}
                                                    <div style={{ padding: "12px 8px 12px 0" }}>
                                                        <EventoDesc h={h} cfg={cfg} />
                                                        {h.usuario && (
                                                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{h.usuario}</div>
                                                        )}
                                                    </div>

                                                    {/* Hora */}
                                                    <div style={{ padding: "0 18px 0 12px", fontSize: 12, fontWeight: 600, color: "#9CA3AF", whiteSpace: "nowrap" }}>
                                                        {hora}
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
            )}
        </div>
    );
}

function Pill({ cor, border, bg, label }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: bg, color: cor, border: `1px solid ${border}`,
            whiteSpace: "nowrap",
        }}>{label}</span>
    );
}

function EventoDesc({ h, cfg }) {
    if (h.tipo === "adicao") {
        return (
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: cfg.cor }}>+ Fita adicionada</span>
                {h.para?.medida && (
                    <span style={{ color: "#374151", marginLeft: 6 }}>
                        <span style={{ fontWeight: 600 }}>{h.para.medida}</span>
                        {h.para.cor && <span style={{ color: "#6B7280" }}> {h.para.cor}</span>}
                    </span>
                )}
            </div>
        );
    }
    if (h.tipo === "remocao") {
        return (
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: cfg.cor }}>− Fita removida</span>
                {h.de?.medida && (
                    <span style={{ color: "#374151", marginLeft: 6 }}>
                        <span style={{ fontWeight: 600 }}>{h.de.medida}</span>
                        {h.de.cor && <span style={{ color: "#6B7280" }}> {h.de.cor}</span>}
                    </span>
                )}
            </div>
        );
    }
    // alteracao
    return (
        <div style={{ fontSize: 13, lineHeight: 1.4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "#6B7280" }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>{h.de?.medida}</span>
                {h.de?.cor && <span style={{ color: "#9CA3AF" }}> {h.de.cor}</span>}
            </span>
            <span style={{ color: cfg.cor, fontWeight: 800, fontSize: 15 }}>→</span>
            <span>
                <span style={{ fontWeight: 700, color: "#111827" }}>{h.para?.medida}</span>
                {h.para?.cor && <span style={{ color: "#374151" }}> {h.para.cor}</span>}
            </span>
            {h.de?.qtd !== h.para?.qtd && h.de?.qtd != null && h.para?.qtd != null && (
                <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F3F4F6", borderRadius: 5, padding: "1px 6px" }}>
                    {h.de.qtd} → {h.para.qtd} fitas
                </span>
            )}
        </div>
    );
}
