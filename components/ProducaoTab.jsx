import { useState, useEffect } from "react";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorInline } from "../utils/CorDot";
import { CorSelect } from "../utils/CorSelect";
import { fmtInt, fmtDec, parseNum } from "../utils";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);
    return isMobile;
}

const TURNO_INFO = {
    1: { label: "Turno 1",           horario: "06h – 14h", color: "#F97316" },
    2: { label: "Turno 2",           horario: "14h – 22h", color: "#6366F1" },
    3: { label: "Turno 3",           horario: "22h – 06h", color: "#10B981" },
    4: { label: "Bônus de Produção", horario: "Sábado",    color: "#EAB308" },
};


const TIPOS_MAQUINA = [
    { tipo: "Gorgurão", color: "#F97316" },
    { tipo: "Poliéster", color: "#6366F1" },
    { tipo: "Elástico",  color: "#10B981" },
];

function calcMetaSugerida(machines, qtdMaquinas) {
    let meta = 0;
    ["Gorgurão", "Elástico"].forEach(tipo => {
        const n = Number(qtdMaquinas[tipo] || 0);
        if (n === 0) return;
        const maqsTipo = machines.filter(m => m.tipo === tipo);
        if (!maqsTipo.length) return;
        const totalFitas = maqsTipo.reduce((s, m) => {
            const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
            return s + fitas.reduce((a, f) => a + (f.qtd || 1), 0);
        }, 0);
        const mediaFitas = totalFitas / maqsTipo.length;
        meta += mediaFitas * n * 2.5;
    });
    return Math.round(meta);
}

function ConfigMaquinas({ machines, onSalvar, onCancelar }) {
    const totalPorTipo = {};
    machines.forEach(m => { totalPorTipo[m.tipo] = (totalPorTipo[m.tipo] || 0) + 1; });
    const [turnoSel, setTurnoSel] = useState(null);
    const [qtdMaquinas, setQtdMaquinas] = useState({ Gorgurão: "", Poliéster: "", Elástico: "" });
    const algumMaquina = Object.values(qtdMaquinas).some(v => Number(v) > 0);
    const pronto = turnoSel && algumMaquina;

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

            {/* Máquinas por tipo */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>MÁQUINAS RODANDO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {TIPOS_MAQUINA.filter(({ tipo }) => tipo !== "Elástico").map(({ tipo, color }) => {
                        const total = totalPorTipo[tipo] || 0;
                        if (total === 0) return null;
                        return (
                            <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", width: 80 }}>{tipo}</span>
                                <input
                                    type="number" min={0} max={total}
                                    value={qtdMaquinas[tipo]}
                                    onChange={e => setQtdMaquinas(p => ({ ...p, [tipo]: e.target.value }))}
                                    placeholder="0"
                                    style={{ ...inputStyle, width: 64, textAlign: "center" }}
                                />
                                <span style={{ fontSize: 12, color: "#9CA3AF" }}>de {total} disponíveis</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
                {onCancelar && (
                    <button onClick={onCancelar} style={{
                        flex: 1, padding: "12px", background: "transparent",
                        border: "1px solid #ECEDF1", borderRadius: 9,
                        fontSize: 14, color: "#6B7280", cursor: "pointer",
                    }}>
                        ← Voltar
                    </button>
                )}
                <button onClick={() => pronto && onSalvar(turnoSel, qtdMaquinas, 0, 30)} disabled={!pronto} style={{
                    flex: 2, padding: "12px", background: pronto ? "#F97316" : "#ECEDF1",
                    border: "none", borderRadius: 9, color: pronto ? "#fff" : "#9CA3AF",
                    fontWeight: 700, fontSize: 14, cursor: pronto ? "pointer" : "default",
                    transition: "background 0.15s",
                }}>
                    Confirmar e iniciar lançamentos →
                </button>
            </div>
        </div>
    );
}

const KG_ESPERADO = {
    "8mm": 0.150, "12mm": 0.262, "14mm": 0.305, "15mm": 0.327, "16mm": 0.349,
    "20mm": 0.436, "22mm": 0.480, "25mm": 0.550, "30mm": 0.680,
    "35mm": 0.764, "40mm": 0.873, "50mm": 1.091,
};
const TOLERANCIA = 0.15; // ±15%

function ConfirmacaoPoliester({ dados, onConfirmar, onCorrigir }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Confirmar lançamento</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Poliéster · {dados.medida} · {dados.cor}</div>
            </div>
            <div style={{ padding: "20px" }}>
                <div style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: "24px", textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: "0.06em", marginBottom: 6 }}>PESO LANÇADO</div>
                    <div style={{ fontSize: 42, fontWeight: 800, color: "#4338CA", lineHeight: 1 }}>{dados.peso}</div>
                    <div style={{ fontSize: 15, color: "#6366F1", fontWeight: 600, marginTop: 4 }}>kg</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCorrigir} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer", fontWeight: 600 }}>
                        ← Corrigir
                    </button>
                    <button onClick={onConfirmar} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#6366F1", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        Confirmar →
                    </button>
                </div>
            </div>
        </div>
    );
}

function VerificacaoPeso({ dados, onConfirmar, onCorrigir, onForaMedia }) {
    const { qtd, peso, medida } = dados;
    const kgPorRolo = peso / qtd;
    const esperado  = KG_ESPERADO[medida];

    if (!esperado || !peso) {
        // sem referência ou sem peso → confirma direto
        onConfirmar();
        return null;
    }

    const diff     = Math.abs(kgPorRolo - esperado) / esperado;
    const ok       = diff <= TOLERANCIA;
    const cor      = ok ? "#16A34A" : "#DC2626";
    const bg       = ok ? "#F0FDF4" : "#FEF2F2";
    const borda    = ok ? "#BBF7D0" : "#FECACA";
    const icone    = ok ? "✓" : "✕";
    const label    = ok ? "Peso dentro do esperado" : "Peso fora do esperado";

    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Verificação de Peso</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{dados.medida} {dados.cor} · {qtd} RL · {peso} kg</div>
            </div>

            <div style={{ padding: "20px" }}>
                {/* Resultado */}
                <div style={{ background: bg, border: `1.5px solid ${borda}`, borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{icone}</span>
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: cor }}>{label}</div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{(diff * 100).toFixed(1)}% de diferença</div>
                    </div>
                </div>

                {/* Comparativo */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, marginBottom: 4 }}>CALCULADO</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: cor }}>{kgPorRolo.toFixed(3)}</div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>kg/rolo</div>
                    </div>
                    <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, marginBottom: 4 }}>ESPERADO</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#374151" }}>{esperado.toFixed(3)}</div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>kg/rolo ({medida})</div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCorrigir} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer", fontWeight: 600 }}>
                        ← Corrigir
                    </button>
                    <button onClick={() => { if (!ok && onForaMedia) onForaMedia({ ...dados, kgPorRolo: +kgPorRolo.toFixed(3), esperado, diff: +(diff * 100).toFixed(1) }); onConfirmar(); }} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: cor, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        {ok ? "Confirmar lançamento →" : "Lançar mesmo assim →"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function LancamentoForm({ machines, turnoAtual, onSubmit, onEditarMaquinas, isAdmin, onAbrirManual, onAbrirCorTemp, coresTemporarias = [], onRemoveCorTemp, onForaMedia }) {
    const [corMedida, setCorMedida] = useState(null); // { cor, medida, tipo, color }
    const [qtd, setQtd] = useState("");
    const [qtdRaw, setQtdRaw] = useState("");
    const [peso, setPeso] = useState("");
    const [pendente, setPendente] = useState(null); // dados aguardando verificação
    const qtdMaquinas = turnoAtual?.qtdMaquinas || {};

    // Montar lista de cor+medida disponíveis das máquinas rodando
    const opcoes = [];
    TIPOS_MAQUINA.forEach(({ tipo, color }) => {
        const qtdM = Number(qtdMaquinas[tipo] || 0);
        if (qtdM === 0) return;
        machines
            .filter(m => m.tipo === tipo || (m.tipo === "Misto" && m.produzindo === tipo))
            .forEach(m => (m.fitas || []).forEach(f => {
                // Para máquina Misto, só inclui fitas que pertencem ao tipo correto
                if (m.tipo === "Misto" && f.tipo && f.tipo !== tipo) return;
                const chave = `${f.cor}|${f.medida}|${tipo}`;
                if (!opcoes.find(o => o.chave === chave))
                    opcoes.push({ chave, cor: f.cor, medida: f.medida, tipo, color });
            }));
    });

    // Cores anteriores removidas/trocadas nos últimos 5 dias
    const CINCO_DIAS = 5 * 24 * 60 * 60 * 1000;
    const agora = Date.now();
    const tiposAtivos = new Set(TIPOS_MAQUINA.filter(({ tipo }) => Number(qtdMaquinas[tipo] || 0) > 0).map(t => t.tipo));

    const opcoesAnteriores = [];
    machines.forEach(m => {
        // Firebase pode retornar array como objeto {0:{...}} — normalizar
        const fitasAnt = m.fitasAnteriores
            ? (Array.isArray(m.fitasAnteriores) ? m.fitasAnteriores : Object.values(m.fitasAnteriores))
            : [];
        fitasAnt.forEach(f => {
            if (!f.removidaEm) return;
            if (!f.cor || !f.medida) return;
            if (agora - new Date(f.removidaEm).getTime() > CINCO_DIAS) return;
            const tipo = f.tipo || (m.tipo !== "Misto" ? m.tipo : null);
            if (!tipo) return;
            if (!tiposAtivos.has(tipo)) return;
            const color = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" }[tipo] || "#9CA3AF";
            const chave = `${f.cor}|${f.medida}|${tipo}|ant`;
            // não duplicar se ainda existe nas fitas ativas
            if (opcoes.find(o => o.cor === f.cor && o.medida === f.medida && o.tipo === tipo)) return;
            if (!opcoesAnteriores.find(o => o.chave === chave))
                opcoesAnteriores.push({ chave, cor: f.cor, medida: f.medida, tipo, color, anterior: true });
        });
    });

    // Cores temporárias (12h) — já filtradas pelo app
    const opcoesTemp = coresTemporarias.map(ct => {
        const color = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" }[ct.tipo] || "#9CA3AF";
        // não mostrar se já existe nas fitas ativas
        if (opcoes.find(o => o.cor === ct.cor && o.medida === ct.medida && o.tipo === ct.tipo)) return null;
        if (opcoesAnteriores.find(o => o.cor === ct.cor && o.medida === ct.medida && o.tipo === ct.tipo)) return null;
        return { chave: `${ct.cor}|${ct.medida}|${ct.tipo}|temp`, cor: ct.cor, medida: ct.medida, tipo: ct.tipo, color, temporaria: true, key: ct.key };
    }).filter(Boolean);

    const isPoliester = corMedida?.tipo === "Poliéster";

    const handleSubmit = () => {
        if (!corMedida) return;
        if (isPoliester) {
            if (!peso) return;
            // "1998" vira "1.998" na tela (milhar) e parece 1,998 kg — bloqueia peso fora da realidade
            if (parseNum(peso) > 100) { window.alert(`Peso de ${peso} kg está alto demais.\nUse vírgula para os decimais, ex.: 1,998`); return; }
            const dados = { qtdMaquinas, cor: corMedida.cor, medida: corMedida.medida, tipo: corMedida.tipo, qtd: 0, peso: parseNum(peso), _poliester: true };
            setPendente(dados);
            return;
        }
        if (!qtd) return;
        if (!peso) return; // peso obrigatório para Gorgurão/Elástico
        const dados = { qtdMaquinas, cor: corMedida.cor, medida: corMedida.medida, tipo: corMedida.tipo, qtd: Number(qtd), peso: parseNum(peso) || 0 };
        // Sempre verifica peso se medida tem referência
        if (KG_ESPERADO[corMedida.medida]) {
            setPendente(dados);
        } else {
            onSubmit(dados);
            setQtd(""); setQtdRaw(""); setPeso("");
        }
    };

    const confirmarLancamento = () => {
        onSubmit(pendente);
        setPendente(null);
        setQtd(""); setQtdRaw(""); setPeso("");
    };

    if (pendente) {
        if (pendente._poliester) {
            return <ConfirmacaoPoliester dados={pendente} onConfirmar={confirmarLancamento} onCorrigir={() => { setPendente(null); }} />;
        }
        return <VerificacaoPeso dados={pendente} onConfirmar={confirmarLancamento} onCorrigir={() => setPendente(null)} onForaMedia={onForaMedia} />;
    }

    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#111827" }}>Lançar Produção</h4>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                        {TIPOS_MAQUINA.map(({ tipo, color }) => {
                            const qtdM = qtdMaquinas[tipo];
                            if (!qtdM || Number(qtdM) === 0) return null;
                            return (
                                <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{qtdM}</span>
                                    <span style={{ fontSize: 12, color: "#6B7280" }}>{tipo}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {isAdmin && (
                            <button onClick={onAbrirManual} style={{ fontSize: 12, color: "#6B7280", background: "none", border: "1px solid #ECEDF1", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                                + Manual
                            </button>
                        )}
                        <button onClick={onAbrirCorTemp} style={{ fontSize: 12, color: "#7C3AED", background: "none", border: "1px dashed #7C3AED", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                            ⏱ Cor temp
                        </button>
                        <button onClick={onEditarMaquinas} style={{ fontSize: 12, color: "#6B7280", background: "none", border: "1px solid #ECEDF1", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                            Editar turno
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Seleção de cor + medida */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 10 }}>COR / MEDIDA</div>
                    {opcoes.length === 0 && opcoesAnteriores.length === 0 && opcoesTemp.length === 0 ? (
                        <p style={{ fontSize: 12, color: "#D97706", margin: 0 }}>Nenhuma fita configurada nas máquinas ativas.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {TIPOS_MAQUINA.map(({ tipo, color }) => {
                                const grupo = [
                                    ...opcoes.filter(o => o.tipo === tipo),
                                    ...opcoesAnteriores.filter(o => o.tipo === tipo),
                                    ...opcoesTemp.filter(o => o.tipo === tipo),
                                ];
                                if (grupo.length === 0) return null;
                                // Agrupar por medida
                                const porMedida = {};
                                grupo.forEach(o => {
                                    if (!porMedida[o.medida]) porMedida[o.medida] = [];
                                    porMedida[o.medida].push(o);
                                });
                                const tipoBg = { Gorgurão: "#FFF7ED", Poliéster: "#EEF2FF", Elástico: "#F0FDF4" }[tipo] || "#F9FAFB";
                                return (
                                    <div key={tipo} style={{ background: tipoBg, border: `1.5px solid ${color}25`, borderRadius: 10, padding: "10px 12px" }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: "0.06em", marginBottom: 10 }}>{tipo.toUpperCase()}</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {Object.entries(porMedida).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).map(([medida, itens]) => (
                                                <div key={medida}>
                                                    <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 5, paddingLeft: 2, opacity: 0.7 }}>{medida}</div>
                                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                        {itens.map(o => {
                                                            const sel = corMedida?.chave === o.chave;
                                                            const tempColor = "#7C3AED";
                                                            return (
                                                                <div key={o.chave} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                                    <button onClick={() => setCorMedida(o)} style={{
                                                                        padding: "6px 13px", borderRadius: 8,
                                                                        border: o.temporaria
                                                                            ? `1.5px dashed ${sel ? tempColor : tempColor + "80"}`
                                                                            : o.anterior
                                                                            ? `1.5px dashed ${sel ? color : "#D97706"}`
                                                                            : `1.5px solid ${sel ? color : color + "50"}`,
                                                                        fontSize: 12, fontWeight: sel ? 700 : 500, cursor: "pointer",
                                                                        background: sel ? (o.temporaria ? tempColor : color) : (o.temporaria ? "#F5F3FF" : "#fff"),
                                                                        color: sel ? "#fff" : (o.temporaria ? tempColor : o.anterior ? "#B45309" : color),
                                                                        transition: "all 0.1s",
                                                                        boxShadow: sel ? `0 2px 6px ${o.temporaria ? tempColor : color}40` : "none",
                                                                    }}>
                                                                        {o.temporaria ? "⏱ " : ""}<CorInline cor={o.cor} />{o.cor}
                                                                    </button>
                                                                    {o.temporaria && onRemoveCorTemp && (
                                                                        <button onClick={() => onRemoveCorTemp(o.key)} title="Remover" style={{
                                                                            padding: "2px 5px", borderRadius: 5, border: "none",
                                                                            background: "transparent", color: "#9CA3AF", fontSize: 11, cursor: "pointer",
                                                                        }}>✕</button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Campos de quantidade — adaptam por tipo */}
                {isPoliester ? (
                    <div>
                        <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em" }}>PESO (kg)</div>
                        <input type="text" inputMode="decimal" value={peso} onChange={e => setPeso(fmtDec(e.target.value))}
                            placeholder="0,0" style={{ ...inputStyle, borderColor: "#C7D2FE" }} autoFocus />
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Poliéster: lançamento somente por peso</div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em" }}>ROLOS (RL)</div>
                            <input type="text" inputMode="numeric" value={qtdRaw} onChange={e => { const f = fmtInt(e.target.value); setQtdRaw(f); setQtd(String(parseNum(f))); }}
                                placeholder="0" style={inputStyle} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em" }}>PESO (kg) *</div>
                            <input type="text" inputMode="decimal" value={peso} onChange={e => setPeso(fmtDec(e.target.value))}
                                placeholder="obrigatório" style={{ ...inputStyle, borderColor: peso ? undefined : "#FECACA" }} />
                        </div>
                    </div>
                )}

                {(() => {
                    const pronto = corMedida && (isPoliester ? !!peso : (!!qtd && !!peso));
                    return (
                        <button onClick={handleSubmit} disabled={!pronto} style={{
                            width: "100%", padding: "11px",
                            background: pronto ? (corMedida.temporaria ? "#7C3AED" : corMedida.anterior ? "#D97706" : corMedida.color) : "#ECEDF1",
                            border: "none", borderRadius: 9,
                            color: pronto ? "#fff" : "#9CA3AF",
                            fontWeight: 700, fontSize: 14,
                            cursor: pronto ? "pointer" : "default",
                            transition: "background 0.15s",
                        }}>
                            {corMedida ? `Lançar ${corMedida.medida} ${corMedida.cor}${corMedida.temporaria ? " ⏱" : corMedida.anterior ? " (anterior)" : ""} →` : "Selecione a cor/medida"}
                        </button>
                    );
                })()}
            </div>
        </div>
    );
}

function HistoricoLancamentos({ logs, turnoFinalizacoes = [], isAdmin = false, onEditarDefeitos, onEditLog, onDeleteLog, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [modalDefeitos, setModalDefeitos] = useState(null);
    const [editVals, setEditVals] = useState({});
    const [modalEditLog, setModalEditLog] = useState(null); // { log, vals }
    const abrirEditLog = (l) => setModalEditLog({ log: l, vals: { qtd: l.qtd ?? "", peso: l.peso ?? "" } });

    const abrirModalDefeitos = (fin) => {
        setEditVals({ ...(fin.defeitos || {}) });
        setModalDefeitos(fin);
    };
    const setVal = (k, v) => setEditVals(p => ({ ...p, [k]: v }));
    const salvarDefeitos = () => {
        const limpo = {};
        Object.entries(editVals).forEach(([k, v]) => { if (Number(v) > 0) limpo[k] = v; });
        onEditarDefeitos(modalDefeitos.firebaseKey, limpo);
        setModalDefeitos(null);
    };
    const [abertos, setAbertos] = useState({});
    const [sorts, setSorts] = useState({}); // key → { col, dir }
    const [aberto, setAberto] = useState(true);
    const [datasAbertas, setDatasAbertas] = useState({});
    const toggleData = (date) => setDatasAbertas(p => ({ ...p, [date]: !p[date] }));

    const toggleAberto = (key) => setAbertos(p => ({ ...p, [key]: !p[key] }));

    // Índice de finalizações por data+turno para lookup rápido
    const finalizacoesIdx = {};
    turnoFinalizacoes.forEach(f => {
        if (!f.inicio) return;
        const date = new Date(f.inicio).toLocaleDateString("pt-BR");
        const key = `${date}-${f.numero}`;
        finalizacoesIdx[key] = f;
    });
    const handleSort = (key, col) => setSorts(p => {
        const cur = p[key];
        if (cur?.col === col) return { ...p, [key]: { col, dir: cur.dir === "asc" ? "desc" : "asc" } };
        return { ...p, [key]: { col, dir: "asc" } };
    });

    // Agrupar por data do turno (não do log) → turno
    // turnoInicio = ISO do início do turno, garante que logs após meia-noite ficam no dia certo
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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Modal editar lançamento */}
            {modalEditLog && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 360 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Lançamento</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>
                            {modalEditLog.log.cor} {modalEditLog.log.medida} · {modalEditLog.log.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0]}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                            {(modalEditLog.log.tipo || "").toLowerCase() !== "poliéster" && (
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>QUANTIDADE (RL)</label>
                                    <input type="number" min={0} value={modalEditLog.vals.qtd}
                                        onChange={e => setModalEditLog(p => ({ ...p, vals: { ...p.vals, qtd: e.target.value } }))}
                                        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                                </div>
                            )}
                            {(modalEditLog.log.tipo || "").toLowerCase() === "poliéster" && (
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 }}>PESO (kg)</label>
                                    <input type="number" min={0} step="0.1" value={modalEditLog.vals.peso}
                                        onChange={e => setModalEditLog(p => ({ ...p, vals: { ...p.vals, peso: e.target.value } }))}
                                        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setModalEditLog(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={() => {
                                const novos = {};
                                if ((modalEditLog.log.tipo || "").toLowerCase() !== "poliéster") novos.qtd = parseFloat(modalEditLog.vals.qtd) || 0;
                                else novos.peso = parseFloat(modalEditLog.vals.peso) || 0;
                                onEditLog(modalEditLog.log.firebaseKey, modalEditLog.log, novos);
                                setModalEditLog(null);
                            }} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#F97316", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal editar defeitos */}
            {modalDefeitos && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 400 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Editar Defeitos</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>
                            {TURNO_INFO[modalDefeitos.numero]?.label} · {modalDefeitos.inicio ? new Date(modalDefeitos.inicio).toLocaleDateString("pt-BR") : "—"}
                        </div>
                        <div style={{ marginBottom: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            <span />
                            {DEFEITO_TIPOS.map(tp => <span key={tp} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "center" }}>{tp}</span>)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                            {DEFEITO_CORES.map(cor => (
                                <div key={cor} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{cor}</span>
                                    {DEFEITO_TIPOS.map(tp => (
                                        <input key={tp} type="number" min={0} placeholder="0"
                                            value={editVals[`${cor}_${tp}`] || ""}
                                            onChange={e => setVal(`${cor}_${tp}`, e.target.value)}
                                            style={{ ...inputStyle, textAlign: "center" }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setModalDefeitos(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={salvarDefeitos} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Botão toggle */}
            <button onClick={() => setAberto(v => !v)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12,
                padding: "14px 18px", cursor: "pointer", width: "100%", textAlign: "left",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Histórico</span>
                    <span style={{
                        fontSize: 11, fontWeight: 700, background: "#F3F4F6", color: "#6B7280",
                        borderRadius: 20, padding: "1px 8px",
                    }}>{Object.keys(grupos).length} dias</span>
                </div>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
            </button>

            {aberto && logs.length === 0 && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: "32px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#9CA3AF" }}>Nenhum lançamento ainda</div>
                </div>
            )}

            {aberto && Object.entries(grupos).map(([date, turnos]) => {
                const dataAberta = !!datasAbertas[date];
                return (
                <div key={date} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                    <div onClick={() => toggleData(date)} style={{ padding: "10px 16px", background: "#F9FAFB", borderBottom: dataAberta ? "1px solid #ECEDF1" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{date}</span>
                            <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
                                {(() => {
                                    const [d, m, y] = date.split("/");
                                    if (!d || !m || !y) return "";
                                    const dia = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("pt-BR", { weekday: "long" });
                                    return dia.charAt(0).toUpperCase() + dia.slice(1);
                                })()}
                            </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{dataAberta ? "▲" : "▼"}</span>
                    </div>

                    {dataAberta && Object.entries(turnos).sort(([a], [b]) => Number(a) - Number(b)).map(([turno, lans], idx, arr) => {
                        const t = TURNO_INFO[Number(turno)] || TURNO_INFO[1];
                        const key = `${date}-${turno}`;
                        const aberto = !!abertos[key];
                        const gorgRL = lans.filter(l => l.tipo === "Gorgurão").reduce((a, l) => a + (l.qtd  || 0), 0);
                        const gorgKg = lans.filter(l => l.tipo === "Gorgurão").reduce((a, l) => a + (l.peso || 0), 0);
                        const polKg  = lans.filter(l => l.tipo === "Poliéster").reduce((a, l)  => a + (l.peso || 0), 0);
                        const lansOrdenados = [...lans].sort((a, b) => {
                            const mm = s => parseInt((s || "0").replace("mm", ""), 10);
                            return mm(a.medida) - mm(b.medida) || (a.cor || "").localeCompare(b.cor || "");
                        });
                        // Totais por tipo+medida+cor (separa Gorgurão de Poliéster mesmo com mesma cor)
                        const totaisPorCorMedida = {};
                        lans.forEach(l => {
                            const k = `${l.tipo}|${l.medida}|${l.cor}`;
                            if (!totaisPorCorMedida[k]) totaisPorCorMedida[k] = { qtd: 0, peso: 0, count: 0, medida: l.medida, cor: l.cor, tipo: l.tipo };
                            totaisPorCorMedida[k].qtd += l.qtd || 0;
                            totaisPorCorMedida[k].peso += l.peso || 0;
                            totaisPorCorMedida[k].count++;
                        });
                        return (
                            <div key={turno} style={{ borderBottom: idx < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                                {/* Linha resumo */}
                                <div style={{
                                    padding: "10px 16px", display: "flex", alignItems: "center",
                                    justifyContent: "space-between", background: t.color + "06", gap: 8,
                                }}>
                                    {(() => {
                                        const fin = finalizacoesIdx[key];
                                        return (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
                                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: t.color, whiteSpace: "nowrap" }}>{t.label}</span>
                                        <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>{t.horario}</span>
                                        {fin?.qtdMaquinas && (() => {
                                            const tipos = [
                                                { key: "Gorgurão", short: "G", color: "#F97316" },
                                                { key: "Poliéster", short: "P", color: "#6366F1" },
                                                { key: "Elástico", short: "E", color: "#10B981" },
                                            ];
                                            const ativos = tipos.filter(({ key }) => Number(fin.qtdMaquinas[key] || 0) > 0);
                                            if (!ativos.length) return null;
                                            return (
                                                <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#F3F4F6", borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>
                                                    {ativos.map(({ key, short, color }, i) => (
                                                        <span key={key} style={{ fontSize: 11, fontWeight: 600 }}>
                                                            {i > 0 && <span style={{ color: "#D1D5DB" }}>·</span>}
                                                            <span style={{ color }}>{fin.qtdMaquinas[key]}{short}</span>
                                                        </span>
                                                    ))}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                        );
                                    })()}
                                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                                        {gorgRL > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{gorgRL} RL</span>}
                                        {gorgKg > 0 && <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 600, whiteSpace: "nowrap" }}>{gorgKg.toFixed(1)} kg</span>}
                                        {polKg  > 0 && <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 600, whiteSpace: "nowrap" }}>{polKg.toFixed(3)} kg</span>}
                                        {(isAdmin || podeEditar) && finalizacoesIdx[key] && (
                                            <button onClick={() => abrirModalDefeitos(finalizacoesIdx[key])} style={{
                                                fontSize: 11, fontWeight: 600, cursor: "pointer",
                                                padding: "3px 8px", borderRadius: 6,
                                                border: "1px solid #FECACA",
                                                background: "transparent", color: "#DC2626",
                                                whiteSpace: "nowrap",
                                            }}>
                                                ⚠ Defeitos
                                            </button>
                                        )}
                                        <button onClick={() => toggleAberto(key)} style={{
                                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                                            padding: "3px 8px", borderRadius: 6,
                                            border: `1px solid ${aberto ? t.color : "#ECEDF1"}`,
                                            background: aberto ? t.color + "15" : "transparent",
                                            color: aberto ? t.color : "#6B7280",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {aberto ? "▲" : "Ver ▼"}
                                        </button>
                                    </div>
                                </div>

                                {/* Defeitos do turno */}
                                {finalizacoesIdx[key]?.defeitos && Object.entries(finalizacoesIdx[key].defeitos).filter(([, v]) => Number(v) > 0).length > 0 && (
                                    <div style={{ padding: "6px 16px", background: "#FFF7ED", borderTop: "1px solid #FED7AA", display: "flex", flexWrap: "wrap", gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#D97706", marginRight: 4 }}>⚠ Defeitos:</span>
                                        {Object.entries(finalizacoesIdx[key].defeitos)
                                            .filter(([, v]) => Number(v) > 0)
                                            .map(([k, v]) => {
                                                const [cor, tipo] = k.split("_");
                                                return (
                                                    <span key={k} style={{ fontSize: 11, color: "#92400E", background: "#FEF3C7", padding: "1px 8px", borderRadius: 10 }}>
                                                        {cor} · {tipo}: <strong>{v}</strong>
                                                    </span>
                                                );
                                            })}
                                    </div>
                                )}

                                {/* Detalhe expandível */}
                                {aberto && (
                                    <div style={{ borderTop: "1px solid #F3F4F6" }}>
                                        {(() => {
                                            const COLS = [
                                                { id: "cor",  label: "COR / MEDIDA" },
                                                { id: "rl",   label: "RL" },
                                                { id: "kg",   label: "KG" },
                                                { id: "hora", label: "HORA" },
                                            ];
                                            const sort = sorts[key];
                                            const sortFn = (a, b) => {
                                                if (!sort) return 0;
                                                let va, vb;
                                                if (sort.col === "cor")  { va = `${a.medida}${a.cor}`; vb = `${b.medida}${b.cor}`; }
                                                if (sort.col === "rl")   { va = a.qtd  || 0; vb = b.qtd  || 0; }
                                                if (sort.col === "kg")   { va = a.peso || 0; vb = b.peso || 0; }
                                                if (sort.col === "hora") { va = a.timestamp || ""; vb = b.timestamp || ""; }
                                                if (va < vb) return sort.dir === "asc" ? -1 : 1;
                                                if (va > vb) return sort.dir === "asc" ? 1 : -1;
                                                return 0;
                                            };
                                            const gorgSorted = [...lansOrdenados].filter(l => l.tipo === "Gorgurão").sort(sortFn);
                                            const polSorted  = [...lansOrdenados].filter(l => l.tipo === "Poliéster").sort(sortFn);

                                            const colGrid = (isAdmin || podeEditar) && onEditLog ? "1fr 70px 70px 90px 52px" : "1fr 70px 70px 90px";
                                            const colHeaders = isMobile ? (
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "6px 16px", borderBottom: "1px solid #F3F4F6" }}>
                                                    {COLS.map(col => {
                                                        const active = sort?.col === col.id;
                                                        return (
                                                            <div key={col.id} onClick={() => handleSort(key, col.id)} style={{ fontSize: 10, fontWeight: 700, color: active ? t.color : "#9CA3AF", letterSpacing: "0.06em", cursor: "pointer", userSelect: "none" }}>
                                                                {col.label} {active ? (sort.dir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div style={{ display: "grid", gridTemplateColumns: colGrid, gap: 8, padding: "6px 16px", borderBottom: "1px solid #F3F4F6" }}>
                                                    {COLS.map(col => {
                                                        const active = sort?.col === col.id;
                                                        return (
                                                            <div key={col.id} onClick={() => handleSort(key, col.id)} style={{ fontSize: 10, fontWeight: 700, color: active ? t.color : "#9CA3AF", letterSpacing: "0.06em", cursor: "pointer", userSelect: "none" }}>
                                                                {col.label} {active ? (sort.dir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
                                                            </div>
                                                        );
                                                    })}
                                                    {(isAdmin || podeEditar) && onEditLog && <div />}
                                                </div>
                                            );

                                            const renderRows = (rowLans) => rowLans.map((l, i, arr) => {
                                                const c = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" }[l.tipo] || "#9CA3AF";
                                                const k = `${l.tipo}|${l.medida}|${l.cor}`;
                                                const total = totaisPorCorMedida[k];
                                                const next = arr[i + 1];
                                                const isLast = !next || next.medida !== l.medida || next.cor !== l.cor;
                                                const hora = l.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0] || "–";

                                                if (isMobile) {
                                                    return (
                                                        <div key={i}>
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 16px", borderBottom: "1px solid #F9FAFB" }}>
                                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                                    <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                        {l.medida && <span style={{ fontSize: 11, color: c, fontWeight: 600, marginRight: 6, background: c + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>}
                                                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{l.cor}</span>
                                                                    </div>
                                                                    <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, flexShrink: 0 }}>{hora}</span>
                                                                </div>
                                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                                    <div style={{ display: "flex", gap: 10 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{l.qtd > 0 ? `${l.qtd} RL` : "–"}</span>
                                                                        <span style={{ fontSize: 12, color: "#6B7280" }}>{l.peso ? `${l.peso.toFixed(l.tipo === "Poliéster" ? 3 : 1)} kg` : "–"}</span>
                                                                    </div>
                                                                    {(isAdmin || podeEditar) && onEditLog && (
                                                                        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                                                                            <button onClick={() => abrirEditLog(l)} title="Editar" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 11, cursor: "pointer" }}>✏</button>
                                                                            <button onClick={() => { if (window.confirm("Excluir este lançamento? O estoque será revertido.")) onDeleteLog(l.firebaseKey, l); }} title="Excluir" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 11, cursor: "pointer" }}>✕</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isLast && total.count > 1 && (
                                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 16px", background: c + "08", borderBottom: "1px solid #F3F4F6" }}>
                                                                    <span style={{ fontSize: 11, color: c, fontWeight: 700 }}>∑ Total {l.medida} {l.cor}</span>
                                                                    <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{total.qtd > 0 ? `${total.qtd} RL` : ""} {total.peso > 0 ? `${total.peso.toFixed(l.tipo === "Poliéster" ? 3 : 1)} kg` : ""}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={i}>
                                                        <div style={{ display: "grid", gridTemplateColumns: colGrid, gap: 8, padding: "8px 16px", alignItems: "center", borderBottom: "1px solid #F9FAFB" }}>
                                                            <div>
                                                                {l.medida && <span style={{ fontSize: 11, color: c, fontWeight: 600, marginRight: 6, background: c + "15", padding: "1px 6px", borderRadius: 5 }}>{l.medida}</span>}
                                                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{l.cor}</span>
                                                            </div>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{l.qtd > 0 ? `${l.qtd} RL` : "–"}</div>
                                                            <div style={{ fontSize: 12, color: "#6B7280" }}>{l.peso ? `${l.peso.toFixed(l.tipo === "Poliéster" ? 3 : 1)} kg` : "–"}</div>
                                                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{hora}</div>
                                                            {(isAdmin || podeEditar) && onEditLog && (
                                                                <div style={{ display: "flex", gap: 3 }}>
                                                                    <button onClick={() => abrirEditLog(l)} title="Editar" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0891B2", fontSize: 11, cursor: "pointer" }}>✏</button>
                                                                    <button onClick={() => { if (window.confirm("Excluir este lançamento? O estoque será revertido.")) onDeleteLog(l.firebaseKey, l); }} title="Excluir" style={{ padding: "2px 6px", borderRadius: 5, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 11, cursor: "pointer" }}>✕</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isLast && total.count > 1 && (
                                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 90px", gap: 8, padding: "6px 16px", alignItems: "center", background: c + "08", borderBottom: "1px solid #F3F4F6" }}>
                                                                <div style={{ fontSize: 11, color: c, fontWeight: 700 }}>∑ Total {l.medida} {l.cor}</div>
                                                                <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{total.qtd > 0 ? `${total.qtd} RL` : "–"}</div>
                                                                <div style={{ fontSize: 12, color: c }}>{total.peso > 0 ? `${total.peso.toFixed(l.tipo === "Poliéster" ? 3 : 1)} kg` : "–"}</div>
                                                                <div></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });

                                            return <>
                                                {gorgSorted.length > 0 && <>
                                                    <div style={{ padding: "5px 16px", background: "#FFF7ED", borderBottom: "1px solid #FED7AA", display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#D97706" }}>GORGURÃO</span>
                                                        <span style={{ fontSize: 11, color: "#F97316", fontWeight: 600 }}>{gorgRL} RL · {gorgKg.toFixed(1)} kg</span>
                                                    </div>
                                                    {colHeaders}
                                                    {renderRows(gorgSorted)}
                                                </>}
                                                {polSorted.length > 0 && <>
                                                    <div style={{ padding: "5px 16px", background: "#EEF2FF", borderTop: gorgSorted.length > 0 ? "2px solid #C7D2FE" : "none", borderBottom: "1px solid #C7D2FE", display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#4338CA" }}>POLIÉSTER</span>
                                                        <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 600 }}>{polKg.toFixed(3)} kg</span>
                                                    </div>
                                                    {colHeaders}
                                                    {renderRows(polSorted)}
                                                </>}
                                            </>;
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                );
            })}
        </div>
    );
}

const DEFEITO_CORES = ["Branco", "Preto", "Cores"];
const DEFEITO_TIPOS = ["Segunda linha", "Descarte"];

function ModalFinalizarTurno({ turno, onConfirmar, onCancelar }) {
    const t = TURNO_INFO[turno?.numero] || TURNO_INFO[1];
    const [defeitos, setDefeitos] = useState({});

    const setVal = (cor, tipo, val) =>
        setDefeitos(p => ({ ...p, [`${cor}_${tipo}`]: val }));

    const temDefeito = Object.values(defeitos).some(v => Number(v) > 0);

    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{
                background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
                width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 4 }}>
                    Finalizar {t.label}
                </div>
                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
                    Registre ao menos <strong>1 defeito</strong> antes de finalizar.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                    {/* Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em" }}></div>
                        {DEFEITO_TIPOS.map(tp => (
                            <div key={tp} style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textAlign: "center" }}>{tp.toUpperCase()}</div>
                        ))}
                    </div>
                    {DEFEITO_CORES.map(cor => (
                        <div key={cor} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{cor}</span>
                            {DEFEITO_TIPOS.map(tp => (
                                <input
                                    key={tp}
                                    type="number" min={0} placeholder="0"
                                    value={defeitos[`${cor}_${tp}`] || ""}
                                    onChange={e => setVal(cor, tp, e.target.value)}
                                    style={{ ...inputStyle, textAlign: "center" }}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCancelar} style={{
                        flex: 1, padding: "10px", background: "transparent",
                        border: "1px solid #ECEDF1", borderRadius: 8,
                        fontSize: 13, color: "#6B7280", cursor: "pointer",
                    }}>
                        Cancelar
                    </button>
                    <button onClick={() => onConfirmar(defeitos)} disabled={!temDefeito} style={{
                        flex: 2, padding: "10px", background: temDefeito ? t.color : "#ECEDF1",
                        border: "none", borderRadius: 8,
                        fontSize: 13, fontWeight: 700, color: temDefeito ? "#fff" : "#9CA3AF", cursor: temDefeito ? "pointer" : "not-allowed",
                    }}>
                        Confirmar e Finalizar →
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalLancamentoManual({ onSalvar, onCancelar }) {
    const hoje = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({ cor: "", medida: "", tipo: "Gorgurão", qtd: "", peso: "", turno: "1", data: hoje, unidade: "RL" });
    const set_ = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const isPoliester = form.tipo === "Poliéster";
    const isElastico = form.tipo === "Elástico";
    const pronto = form.cor.trim() && form.medida && form.data && form.turno &&
        (isPoliester ? Number(form.peso) > 0 : Number(form.qtd) > 0);

    const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, color: "#111827", background: "#F9FAFB", outline: "none" };
    const labelStyle = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>Lançamento Manual</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>Use para corrigir dias sem apontamento.</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <label style={labelStyle}>DATA</label>
                            <input type="date" value={form.data} onChange={e => set_("data", e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>TURNO</label>
                            <select value={form.turno} onChange={e => set_("turno", e.target.value)} style={inputStyle}>
                                <option value="1">Turno 1</option>
                                <option value="2">Turno 2</option>
                                <option value="3">Turno 3</option>
                                <option value="4">Bônus</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>TIPO</label>
                        <select value={form.tipo} onChange={e => set_("tipo", e.target.value)} style={inputStyle}>
                            <option>Gorgurão</option>
                            <option>Poliéster</option>
                            <option>Elástico</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>COR</label>
                        <CorSelect value={form.cor} onChange={e => set_("cor", e.target.value)} options={COR_CATALOG_SORTED} placeholder="Selecione a cor" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>MEDIDA</label>
                        <select value={form.medida} onChange={e => set_("medida", e.target.value)} style={inputStyle}>
                            <option value="">Selecione a medida</option>
                            {MEDIDAS_CATALOG.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                    {isPoliester ? (
                        <div>
                            <label style={labelStyle}>PESO (kg)</label>
                            <input type="number" value={form.peso} onChange={e => set_("peso", e.target.value)} placeholder="0.0" step="0.01" style={inputStyle} />
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {isElastico && (
                                <div>
                                    <label style={labelStyle}>UNIDADE</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {["RL", "metros"].map(u => {
                                            const sel = form.unidade === u;
                                            return (
                                                <button key={u} onClick={() => set_("unidade", u)} style={{
                                                    flex: 1, padding: "7px 4px", borderRadius: 7, cursor: "pointer",
                                                    border: `1.5px solid ${sel ? "#10B981" : "#ECEDF1"}`,
                                                    background: sel ? "#F0FDF4" : "#fff",
                                                    color: sel ? "#10B981" : "#6B7280",
                                                    fontWeight: sel ? 700 : 500, fontSize: 13,
                                                }}>{u}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                    <label style={labelStyle}>{isElastico ? `QUANTIDADE (${form.unidade})` : "QUANTIDADE (RL)"}</label>
                                    <input type="number" value={form.qtd} onChange={e => set_("qtd", e.target.value)} placeholder="0" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>PESO (kg)</label>
                                    <input type="number" value={form.peso} onChange={e => set_("peso", e.target.value)} placeholder="0.0" step="0.01" style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button onClick={onCancelar} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={() => pronto && onSalvar(form)} disabled={!pronto} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: pronto ? "#111827" : "#ECEDF1", color: pronto ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 13, cursor: pronto ? "pointer" : "default" }}>
                        Salvar lançamento
                    </button>
                </div>
            </div>
        </div>
    );
}

const MEDIDAS_CATALOG = ["8mm", "12mm", "14mm", "15mm", "16mm", "18mm", "20mm", "22mm", "25mm", "30mm", "35mm", "38mm", "40mm", "50mm"];

function ModalCorTemporaria({ onSalvar, onCancelar }) {
    const [form, setForm] = useState({ tipo: "Gorgurão", cor: "", medida: "" });
    const set_ = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const pronto = form.cor && form.medida;
    const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid #ECEDF1", borderRadius: 7, fontSize: 13, color: "#111827", background: "#F9FAFB", outline: "none" };
    const labelStyle = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 4 };
    const TIPO_COLORS = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981" };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 380 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 2 }}>Cor Temporária</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>Fica disponível por 12 horas para lançamento.</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                        <label style={labelStyle}>TIPO</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            {["Gorgurão", "Poliéster", "Elástico"].map(t => {
                                const sel = form.tipo === t;
                                const c = TIPO_COLORS[t];
                                return (
                                    <button key={t} onClick={() => set_("tipo", t)} style={{
                                        flex: 1, padding: "7px 4px", borderRadius: 7,
                                        border: `1.5px solid ${sel ? c : "#ECEDF1"}`,
                                        background: sel ? c + "15" : "#fff",
                                        color: sel ? c : "#6B7280",
                                        fontWeight: sel ? 700 : 500, fontSize: 12, cursor: "pointer",
                                    }}>{t}</button>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>COR</label>
                        <CorSelect value={form.cor} onChange={e => set_("cor", e.target.value)} options={COR_CATALOG_SORTED} placeholder="Selecione a cor" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>MEDIDA</label>
                        <select value={form.medida} onChange={e => set_("medida", e.target.value)} style={inputStyle}>
                            <option value="">Selecione a medida</option>
                            {MEDIDAS_CATALOG.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button onClick={onCancelar} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={() => pronto && onSalvar(form)} disabled={!pronto} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: pronto ? "#7C3AED" : "#ECEDF1", color: pronto ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 13, cursor: pronto ? "pointer" : "default" }}>
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ProducaoTab({ machines, logs, turnoAtual, turnoFinalizacoes = [], onSubmit, onFinalizarTurno, onConfigurarTurno, canLaunch = true, isAdmin = false, onEditarDefeitos, onLancamentoManual, coresTemporarias = [], onAddCorTemp, onRemoveCorTemp, onPesoForaMedia, pesosForaMedia = [], onEditLog, onDeleteLog, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [modalFinalizar, setModalFinalizar] = useState(false);
    const [modalManual, setModalManual] = useState(false);
    const [modalCorTemp, setModalCorTemp] = useState(false);
    const [editandoTurno, setEditandoTurno] = useState(false);
    const configurado = turnoAtual?.qtdMaquinas && Object.values(turnoAtual.qtdMaquinas).some(v => Number(v) > 0);
    const t = TURNO_INFO[turnoAtual?.numero] || TURNO_INFO[1];
    const inicio = turnoAtual?.inicio
        ? new Date(turnoAtual.inicio).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "–";

    const handleConfirmarFinalizar = (defeitos) => {
        setModalFinalizar(false);
        onFinalizarTurno(defeitos);
    };

    return (
        <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
            {modalFinalizar && (
                <ModalFinalizarTurno
                    turno={turnoAtual}
                    onConfirmar={handleConfirmarFinalizar}
                    onCancelar={() => setModalFinalizar(false)}
                />
            )}
            {modalManual && (
                <ModalLancamentoManual
                    onSalvar={(form) => { onLancamentoManual(form); setModalManual(false); }}
                    onCancelar={() => setModalManual(false)}
                />
            )}
            {modalCorTemp && (
                <ModalCorTemporaria
                    onSalvar={(form) => { onAddCorTemp && onAddCorTemp(form); setModalCorTemp(false); }}
                    onCancelar={() => setModalCorTemp(false)}
                />
            )}
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Apontamento de Produção</h2>
            </div>

            {!canLaunch ? (
                /* ── Modo visualização apenas ── */
                <HistoricoLancamentos logs={logs} turnoFinalizacoes={turnoFinalizacoes} isAdmin={isAdmin} onEditarDefeitos={onEditarDefeitos} onEditLog={onEditLog} onDeleteLog={onDeleteLog} podeEditar={podeEditar} />
            ) : (!configurado || editandoTurno) ? (
                /* ── Tela de configuração de turno ── */
                <>
                    {podeEditar && (
                        <div style={{ maxWidth: 480 }}>
                            <ConfigMaquinas
                                machines={machines}
                                onSalvar={(numero, qtd, meta) => { onConfigurarTurno(numero, qtd, meta); setEditandoTurno(false); }}
                                onCancelar={editandoTurno ? () => setEditandoTurno(false) : null}
                            />
                        </div>
                    )}
                    {logs.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <HistoricoLancamentos logs={logs} turnoFinalizacoes={turnoFinalizacoes} isAdmin={isAdmin} onEditarDefeitos={onEditarDefeitos} onEditLog={onEditLog} onDeleteLog={onDeleteLog} podeEditar={podeEditar} />
                        </div>
                    )}
                </>
            ) : (
                /* ── Tela de lançamento ── */
                <>
                    {/* Turno atual */}
                    <div style={{
                        background: "#fff", border: `1.5px solid ${t.color}40`, borderRadius: 12,
                        padding: "16px 20px", marginBottom: 20,
                        display: "flex", flexDirection: isMobile ? "column" : "row",
                        justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 0,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: t.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="20" height="20" fill="none" stroke={t.color} strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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
                            {podeEditar && (
                                <button onClick={() => setModalFinalizar(true)} style={{
                                    padding: "8px 18px", background: t.color, border: "none",
                                    borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                                }}>
                                    Finalizar {t.label} →
                                </button>
                            )}
                        </div>
                    </div>


                    {/* Layout: form centralizado | histórico abaixo */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {podeEditar && (
                            <LancamentoForm
                                machines={machines}
                                turnoAtual={turnoAtual}
                                onSubmit={onSubmit}
                                onEditarMaquinas={() => setEditandoTurno(true)}
                                isAdmin={isAdmin}
                                onAbrirManual={() => setModalManual(true)}
                                onAbrirCorTemp={() => setModalCorTemp(true)}
                                coresTemporarias={coresTemporarias}
                                onRemoveCorTemp={onRemoveCorTemp}
                                onForaMedia={onPesoForaMedia}
                            />
                        )}
                        <HistoricoLancamentos logs={logs} turnoFinalizacoes={turnoFinalizacoes} isAdmin={isAdmin} onEditarDefeitos={onEditarDefeitos} onEditLog={onEditLog} onDeleteLog={onDeleteLog} podeEditar={podeEditar} />
                    </div>
                </>
            )}

        </div>
    );
}
const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 11px",
    border: "1px solid #ECEDF1", borderRadius: 8, fontSize: 13,
    color: "#111827", background: "#F9FAFB", outline: "none",
};
