import { useState, useEffect } from "react";

const META_RL_POR_FITA        = 3;  // RL por fita por turno (Gorgurão)
const META_KG_POL_POR_MAQUINA = 40; // kg por máquina Poliéster por turno
const TURNOS_POR_DIA = 3;

function contarFitas(machines) {
    return (machines || [])
        .filter(m => m.tipo === "Gorgurão" || m.tipo === "Misto")
        .reduce((s, m) => {
            const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
            return s + fitas.reduce((fs, f) => fs + (Number(f.qtd) || 1), 0);
        }, 0);
}

function calcMetaRL(machines, nGorgRodando) {
    const gorgMachines = (machines || []).filter(m => m.tipo === "Gorgurão" || m.tipo === "Misto");
    const totalMaq = gorgMachines.length || 12;
    const totalFitas = contarFitas(machines);
    const fitasPorMaq = totalFitas > 0 ? totalFitas / totalMaq : 14;
    const maqAtivas = nGorgRodando > 0 ? nGorgRodando : totalMaq;
    return Math.round(maqAtivas * fitasPorMaq * META_RL_POR_FITA);
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

function ProgressBar({ value, meta, color = "#F97316", height = 10 }) {
    const pct = meta > 0 ? Math.min(100, Math.round((value / meta) * 100)) : 0;
    const bateu = pct >= 100;
    const barColor = bateu ? "#16A34A" : pct >= 70 ? color : "#EF4444";
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                    {value.toLocaleString("pt-BR")} <span style={{ fontWeight: 400, color: "#9CA3AF" }}>/ {meta.toLocaleString("pt-BR")}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: bateu ? "#16A34A" : barColor }}>
                    {pct}% {bateu ? "✓" : ""}
                </span>
            </div>
            <div style={{ height, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 99, transition: "width 0.4s" }} />
            </div>
        </div>
    );
}

function StatCard({ label, value, unit, color, sub }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em", marginBottom: 4 }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>
                {value} <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>{unit}</span>
            </div>
            {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

export default function MetasTab({ logs = [], turnoAtual, turnoFinalizacoes = [], machines = [], podeEditar = true }) {
    const isMobile = useIsMobile();

    // ── Turno atual ──────────────────────────────────────────────────────────
    const logsDoTurno = logs.filter(l => l.turnoInicio === turnoAtual?.inicio);
    const rlTurno  = logsDoTurno.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (Number(l.qtd)  || 0), 0);
    const kgTurno  = logsDoTurno.filter(l => l.tipo === "Poliéster") .reduce((s, l) => s + (Number(l.peso) || 0), 0);

    const nGorg = Number(turnoAtual?.qtdMaquinas?.["Gorgurão"] || 0);
    const nPol  = Number(turnoAtual?.qtdMaquinas?.["Poliéster"] || 0);
    const metaRLTurno  = calcMetaRL(machines, nGorg);
    const metaKgTurno  = nPol  > 0 ? nPol  * META_KG_POL_POR_MAQUINA : 0;

    const totalFitasGorg = contarFitas(machines);

    // ── Hoje ─────────────────────────────────────────────────────────────────
    const hoje = new Date().toLocaleDateString("pt-BR");
    const logsHoje = logs.filter(l => {
        const d = l.turnoInicio
            ? new Date(l.turnoInicio).toLocaleDateString("pt-BR")
            : (l.timestamp || "").split(",")[0];
        return d === hoje;
    });
    const rlHoje = logsHoje.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (Number(l.qtd) || 0), 0);
    const kgHoje = logsHoje.filter(l => l.tipo === "Poliéster") .reduce((s, l) => s + (Number(l.peso) || 0), 0);
    const metaRLDia = metaRLTurno * TURNOS_POR_DIA;
    const metaKgDia = metaKgTurno * TURNOS_POR_DIA;

    // ── Histórico de turnos finalizados ───────────────────────────────────────
    // Agrupa logs por turnoInicio
    const logsPorTurno = {};
    logs.forEach(l => {
        const key = l.turnoInicio || l.timestamp?.split(",")[0] || "—";
        if (!logsPorTurno[key]) logsPorTurno[key] = [];
        logsPorTurno[key].push(l);
    });

    // Lançamentos de um turno reiniciado (turnoInicio sem finalização) vão para a
    // finalização do mesmo dia e mesmo número de turno
    const iniciosFinalizados = new Set(turnoFinalizacoes.map(f => f.inicio));
    const orfaosPorDiaTurno = {};
    logs.forEach(l => {
        if (!l.turnoInicio || iniciosFinalizados.has(l.turnoInicio) || l.turnoInicio === turnoAtual?.inicio) return;
        const k = `${new Date(l.turnoInicio).toLocaleDateString("pt-BR")}|${l.turno}`;
        (orfaosPorDiaTurno[k] ??= []).push(l);
    });

    // Agrupa finalizações por dia
    const porDia = {};
    [...turnoFinalizacoes]
        .filter(f => f.inicio)
        .forEach(f => {
            const kOrf = `${new Date(f.inicio).toLocaleDateString("pt-BR")}|${f.numero}`;
            const lans = [...(logsPorTurno[f.inicio] || []), ...(orfaosPorDiaTurno[kOrf] || [])];
            delete orfaosPorDiaTurno[kOrf];
            const rl  = lans.filter(l => l.tipo !== "Poliéster").reduce((s, l) => s + (Number(l.qtd)  || 0), 0);
            const kg  = lans.filter(l => l.tipo === "Poliéster") .reduce((s, l) => s + (Number(l.peso) || 0), 0);
            const ng  = Number(f.qtdMaquinas?.["Gorgurão"] || 0);
            const np  = Number(f.qtdMaquinas?.["Poliéster"] || 0);
            const mRL = calcMetaRL(machines, ng);
            const mKg = np > 0 ? np * META_KG_POL_POR_MAQUINA : 0;
            const pctRL = mRL > 0 ? Math.round((rl / mRL) * 100) : 0;
            const pctKg = mKg > 0 ? Math.round((kg / mKg) * 100) : null;
            const data  = new Date(f.inicio).toLocaleDateString("pt-BR");
            const entry = { ...f, rl, kg, mRL, mKg, pctRL, pctKg, data, ng, np };
            if (!porDia[data]) porDia[data] = [];
            porDia[data].push(entry);
        });

    const diasOrdenados = Object.entries(porDia)
        .sort((a, b) => {
            const parse = s => { if (!s || typeof s !== "string") return new Date(0); const [d,m,y] = s.split("/"); return new Date(`${y}-${m}-${d}`); };
            return parse(b[0]) - parse(a[0]);
        })
        .slice(0, 10)
        .map(([data, turnos]) => ({
            data,
            turnos: turnos.sort((a, b) => a.numero - b.numero),
            totalRL: turnos.reduce((s, t) => s + t.rl, 0),
            totalKg: turnos.reduce((s, t) => s + t.kg, 0),
            metaRLDia: turnos.reduce((s, t) => s + t.mRL, 0),
        }));

    const TURNO_LABEL = { 1: "T1", 2: "T2", 3: "T3", 4: "Bônus" };
    const TURNO_COLOR = { 1: "#F97316", 2: "#6366F1", 3: "#10B981", 4: "#EAB308" };

    return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px", maxWidth: 700, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Metas de Produção</h2>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "8px 14px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F97316", flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>GORGURÃO</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#F97316" }}>{META_RL_POR_FITA} RL <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>por fita / turno</span></div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Meta turno: {metaRLTurno} RL · {totalFitasGorg} fitas</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "8px 14px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366F1", flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>POLIÉSTER</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#6366F1" }}>{META_KG_POL_POR_MAQUINA} kg <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>por máquina / turno</span></div>
                            {metaKgTurno > 0 && <div style={{ fontSize: 11, color: "#9CA3AF" }}>Meta turno: {metaKgTurno} kg</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Turno atual */}
            <div style={{ background: "#fff", border: "1.5px solid #F97316", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F97316", letterSpacing: "0.07em", marginBottom: 12 }}>
                    TURNO ATUAL — T{turnoAtual?.numero || "?"} {nGorg > 0 ? `· ${nGorg} Gorg.` : ""}{nPol > 0 ? ` · ${nPol} Pol.` : ""}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>GORGURÃO</div>
                        <ProgressBar value={rlTurno} meta={metaRLTurno} color="#F97316" />
                    </div>
                    {metaKgTurno > 0 && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>POLIÉSTER</div>
                            <ProgressBar value={Number(kgTurno.toFixed(1))} meta={metaKgTurno} color="#6366F1" />
                        </div>
                    )}
                </div>
            </div>

            {/* Hoje */}
            <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.07em", marginBottom: 12 }}>HOJE — {hoje}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <StatCard label="RL produzido" value={rlHoje.toLocaleString("pt-BR")} unit="RL" color="#F97316"
                        sub={`meta: ${metaRLDia.toLocaleString("pt-BR")} RL`} />
                    {metaKgDia > 0 && (
                        <StatCard label="Kg Poliéster" value={kgHoje.toFixed(3)} unit="kg" color="#6366F1"
                            sub={`meta: ${metaKgDia} kg`} />
                    )}
                </div>
                <ProgressBar value={rlHoje} meta={metaRLDia} color="#F97316" height={8} />
            </div>

            {/* Histórico por dia */}
            {diasOrdenados.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Histórico por Dia</div>
                    {diasOrdenados.map(({ data, turnos, totalRL, totalKg, metaRLDia: mDia }) => {
                        const pctDia = mDia > 0 ? Math.round((totalRL / mDia) * 100) : 0;
                        const bateuDia = pctDia >= 100;
                        return (
                            <div key={data} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>
                                {/* Cabeçalho do dia */}
                                <div style={{ padding: "10px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFAFA" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{data}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: bateuDia ? "#16A34A" : "#F97316" }}>
                                            {totalRL.toLocaleString("pt-BR")} RL
                                        </span>
                                        {totalKg > 0 && <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 600 }}>{totalKg.toFixed(1)} kg</span>}
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                                            background: bateuDia ? "#F0FDF4" : pctDia >= 70 ? "#FFF7ED" : "#FEF2F2",
                                            color: bateuDia ? "#16A34A" : pctDia >= 70 ? "#F97316" : "#EF4444",
                                            border: `1px solid ${bateuDia ? "#86EFAC" : pctDia >= 70 ? "#FED7AA" : "#FECACA"}`,
                                        }}>{pctDia}%</span>
                                    </div>
                                </div>

                                {/* Turnos do dia lado a lado */}
                                <div style={{ display: "grid", gridTemplateColumns: `repeat(${turnos.length}, 1fr)` }}>
                                    {turnos.map((f, ti) => {
                                        const bateuRL = f.pctRL >= 100;
                                        const bateuKg = f.pctKg === null || f.pctKg >= 100;
                                        const bateu = bateuRL && bateuKg;
                                        const tc = TURNO_COLOR[f.numero] || "#9CA3AF";
                                        return (
                                            <div key={f.firebaseKey || ti} style={{
                                                padding: "10px 12px",
                                                borderRight: ti < turnos.length - 1 ? "1px solid #F3F4F6" : "none",
                                                borderTop: "none",
                                            }}>
                                                {/* Label turno */}
                                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: tc, background: tc + "18", padding: "1px 7px", borderRadius: 20 }}>
                                                        {TURNO_LABEL[f.numero] || `T${f.numero}`}
                                                    </span>
                                                    <span style={{ fontSize: 12, fontWeight: 700,
                                                        color: bateu ? "#16A34A" : "#EF4444" }}>
                                                        {bateu ? "✓" : "✕"}
                                                    </span>
                                                </div>

                                                {/* RL */}
                                                <div style={{ marginBottom: 4 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: bateuRL ? "#16A34A" : "#EF4444" }}>
                                                            {f.rl.toLocaleString("pt-BR")} RL
                                                        </span>
                                                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{f.pctRL}%</span>
                                                    </div>
                                                    <div style={{ height: 4, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                                                        <div style={{ height: "100%", width: `${Math.min(100, f.pctRL)}%`, background: bateuRL ? "#16A34A" : f.pctRL >= 70 ? "#F97316" : "#EF4444", borderRadius: 99 }} />
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>meta {f.mRL}</div>
                                                </div>

                                                {/* Pol */}
                                                {f.mKg > 0 && (
                                                    <div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: bateuKg ? "#16A34A" : "#EF4444" }}>
                                                                {f.kg.toFixed(1)} kg
                                                            </span>
                                                            <span style={{ fontSize: 10, color: "#9CA3AF" }}>{f.pctKg}%</span>
                                                        </div>
                                                        <div style={{ height: 4, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                                                            <div style={{ height: "100%", width: `${Math.min(100, f.pctKg)}%`, background: bateuKg ? "#16A34A" : "#6366F1", borderRadius: 99 }} />
                                                        </div>
                                                        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>meta {f.mKg} kg</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
