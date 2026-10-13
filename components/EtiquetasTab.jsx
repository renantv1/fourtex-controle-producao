import { useState, useMemo, useEffect } from "react";
import { COR_CATALOG_SORTED } from "../utils/corCatalog.js";
import { CorInline } from "../utils/CorDot";
import { CorSelect } from "../utils/CorSelect";
import { SimpleSelect } from "../utils/SimpleSelect";
import { fmtInt, fmtDec, parseNum, parseTimestampBR } from "../utils";
import { TNT_CATALOG } from "../utils/tntCatalog";

const TIPOS = ["Gorgurão", "Poliéster", "Elástico", "TNT", "Overlock", "Soutache", "Trançado"];
const MEDIDAS = ["8mm", "12mm", "14mm", "15mm", "18mm", "20mm", "22mm", "25mm", "30mm", "35mm", "38mm", "40mm", "50mm"];
const TIPO_COLOR = { Gorgurão: "#F97316", Poliéster: "#6366F1", Elástico: "#10B981", TNT: "#0891B2", Overlock: "#0891B2", Soutache: "#7C3AED", "Trançado": "#D97706" };
const TIPO_BG    = { Gorgurão: "#FFF7ED", Poliéster: "#EEF2FF", Elástico: "#F0FDF4", TNT: "#ECFEFF", Overlock: "#ECFEFF", Soutache: "#F5F3FF", "Trançado": "#FFFBEB" };

const UNIDADES_POR_TIPO = {
    Gorgurão: ["RL", "KG"],
    Poliéster: ["KG"],
    Elástico:  ["RL", "m"],
    TNT:       [],
    Overlock:  ["RL"],
    Soutache:  ["RL"],
    "Trançado": ["RL"],
};

// Tipos de cordão: não têm largura/medida em mm, só cor + quantidade em RL
const TIPOS_SEM_MEDIDA = ["Overlock", "Soutache", "Trançado"];

const UNIDADE_LABEL = { "RL": "Rolos", "KG": "Quilos", "m": "Metros" };

const inputStyle = {
    width: "100%", padding: "10px 12px", fontSize: 13,
    border: "1px solid #ECEDF1", borderRadius: 8,
    background: "#F9FAFB", color: "#111827", outline: "none",
    boxSizing: "border-box",
};

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const fn = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", fn);
        return () => window.removeEventListener("resize", fn);
    }, []);
    return m;
}

function StatusBadge({ status }) {
    if (status === "impresso") return (
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", flexShrink: 0 }}>
            ✓ Impresso
        </span>
    );
    return (
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FFF7ED", color: "#D97706", border: "1px solid #FED7AA", flexShrink: 0 }}>
            ⏳ Aguardando
        </span>
    );
}

export default function EtiquetasTab({ fila = [], onSolicitar, onLimparFila, filaTNT = [], onSolicitarTNT, onLimparFilaTNT, userRole, userName, podeEditar = true }) {
    const isMobile = useIsMobile();
    const todayStr = new Date().toISOString().split("T")[0];

    // Estado Gorgurão / Poliéster / Elástico
    const [tipo, setTipo]       = useState("Gorgurão");
    const [cor, setCor]         = useState("");
    const [medida, setMedida]   = useState("25mm");
    const [qtd, setQtd]         = useState("");
    const [unidade, setUnidade] = useState("RL");
    const [copies, setCopies]   = useState("1");
    const [enviado, setEnviado] = useState(false);

    // Estado TNT
    const [tntLargura,   setTntLargura]   = useState("1.40");
    const [tntCor,       setTntCor]       = useState("branco");
    const [tntGramatura, setTntGramatura] = useState("");
    const [tntMetragem,  setTntMetragem]  = useState("");
    const [tntData,      setTntData]      = useState(todayStr);
    const [tntPeso,      setTntPeso]      = useState("");

    const unidadesDisponiveis = UNIDADES_POR_TIPO[tipo] || [];
    const temUnidades = unidadesDisponiveis.length > 1;
    const temMedida = !TIPOS_SEM_MEDIDA.includes(tipo);
    const isDecimal = unidade === "KG";

    const formatarQtd = (val) => isDecimal ? fmtDec(val) : fmtInt(val);
    const qtdNumerico = () => parseNum(qtd);

    // Computed TNT
    const tntGramaturas = useMemo(() =>
        tipo === "TNT" ? [...new Set(TNT_CATALOG.filter(p => p.largura === tntLargura && p.cor === tntCor).map(p => p.gramatura))].sort((a, b) => a - b) : [],
        [tipo, tntLargura, tntCor]
    );
    const tntMetragens = useMemo(() =>
        (tipo === "TNT" && tntGramatura) ? TNT_CATALOG.filter(p => p.largura === tntLargura && p.cor === tntCor && p.gramatura === Number(tntGramatura)).map(p => p.metragem).sort((a, b) => b - a) : [],
        [tipo, tntLargura, tntCor, tntGramatura]
    );
    useEffect(() => {
        if (tntMetragens.length === 1) setTntMetragem(String(tntMetragens[0]));
        else setTntMetragem("");
    }, [tntMetragens.join(",")]); // eslint-disable-line
    const tntProduto = useMemo(() =>
        (tipo === "TNT" && tntGramatura && tntMetragem) ? TNT_CATALOG.find(p => p.largura === tntLargura && p.cor === tntCor && p.gramatura === Number(tntGramatura) && p.metragem === Number(tntMetragem)) : null,
        [tipo, tntLargura, tntCor, tntGramatura, tntMetragem]
    );

    function handleTipo(t) {
        setTipo(t);
        if (t !== "TNT") setUnidade(UNIDADES_POR_TIPO[t][0]);
        setQtd("");
    }

    const handleSubmit = () => {
        if (tipo === "TNT") {
            if (!tntProduto) return;
            const pesoNum = parseFloat(tntPeso.replace(",", ".")) || 0;
            onSolicitarTNT({
                largura: tntLargura, cor: tntCor,
                gramatura: Number(tntGramatura), metragem: Number(tntMetragem),
                codigo: tntProduto.codigo, data: tntData, peso: pesoNum,
                copies: Number(copies) || 1, solicitadoPor: userName || "—",
                timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), status: "pendente",
            });
        } else {
            if (!cor.trim()) return;
            onSolicitar({
                tipo, cor: cor.trim(), medida: temMedida ? medida : "", quantidade: qtd ? qtdNumerico() : null, unidade,
                copies: Number(copies) || 1, solicitadoPor: userName || "—",
                timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), status: "pendente",
            });
            setCor(""); setQtd(""); setCopies("1");
        }
        setEnviado(true);
        setTimeout(() => setEnviado(false), 3000);
    };

    const tc = TIPO_COLOR[tipo];
    const tb = TIPO_BG[tipo];
    const pronto = tipo === "TNT" ? Boolean(tntProduto) : Boolean(cor.trim());

    const [reimpressoId, setReimpressoId] = useState(null);

    const handleReimprimir = (item) => {
        const base = {
            copies: item.copies || 1,
            solicitadoPor: userName || "—",
            timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            status: "pendente",
        };
        if (item._qt === "tnt") {
            onSolicitarTNT({
                largura: item.largura, cor: item.cor, gramatura: item.gramatura, metragem: item.metragem,
                codigo: item.codigo, data: item.data, peso: item.peso,
                ...base,
            });
        } else {
            onSolicitar({
                tipo: item.tipo, cor: item.cor, medida: item.medida || "", quantidade: item.quantidade ?? null, unidade: item.unidade,
                ...base,
            });
        }
        setReimpressoId(item.id);
        setTimeout(() => setReimpressoId(null), 2000);
    };

    // Fila unificada
    const filaOrdenada = [
        ...(fila || []).map(f => ({ ...f, _qt: "gorgurao" })),
        ...(filaTNT || []).map(f => ({ ...f, _qt: "tnt" })),
    ].sort((a, b) => {
        if (a.status === b.status) return parseTimestampBR(b.timestamp) - parseTimestampBR(a.timestamp);
        return a.status === "pendente" ? -1 : 1;
    });

    const pendentes = filaOrdenada.filter(f => f.status === "pendente").length;

    const tog = (active, color) => ({
        flex: 1, padding: "9px 8px", borderRadius: 7, cursor: "pointer", fontSize: 13,
        border: `1.5px solid ${active ? color : "#ECEDF1"}`,
        background: active ? color + "18" : "#F9FAFB",
        color: active ? color : "#6B7280",
        fontWeight: active ? 700 : 500,
    });

    return (
        <div style={{ padding: isMobile ? "16px 12px" : "24px", maxWidth: 700, margin: "0 auto" }}>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#111827" }}>Solicitar Etiqueta</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>Impressa automaticamente na impressora do depósito</div>
            </div>

            {podeEditar && (
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, padding: isMobile ? "14px" : "20px", marginBottom: 20 }}>

                {/* Tipo */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 8 }}>TIPO</div>
                    <SimpleSelect value={tipo} onChange={e => handleTipo(e.target.value)} options={TIPOS} style={inputStyle} />
                </div>

                {tipo === "TNT" ? (
                    /* ── Campos TNT ── */
                    <>
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>LARGURA</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                {["1.40", "2.10"].map(l => (
                                    <button key={l} type="button" onClick={() => { setTntLargura(l); setTntGramatura(""); setTntMetragem(""); }} style={tog(tntLargura === l, tc)}>
                                        {l === "1.40" ? "1,4 m" : "2,1 m"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>COR</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                {["branco", "preto"].map(c => (
                                    <button key={c} type="button" onClick={() => { setTntCor(c); setTntGramatura(""); setTntMetragem(""); }} style={tog(tntCor === c, tc)}>
                                        {c.charAt(0).toUpperCase() + c.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>GRAMATURA</div>
                            <SimpleSelect
                                value={tntGramatura} onChange={e => setTntGramatura(e.target.value)}
                                options={tntGramaturas} getLabel={g => `${g} G/M2`} style={inputStyle}
                            />
                        </div>

                        {tntMetragens.length > 1 && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>METRAGEM/BOB</div>
                                <SimpleSelect
                                    value={tntMetragem} onChange={e => setTntMetragem(e.target.value)}
                                    options={tntMetragens} getLabel={m => `${m} m`} style={inputStyle}
                                />
                            </div>
                        )}

                        {tntProduto && (
                            <div style={{ padding: "8px 12px", background: tb, border: `1px solid ${tc}40`, borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                                <span style={{ fontFamily: "monospace", fontWeight: 900, color: tc, marginRight: 8 }}>{tntProduto.codigo}</span>
                                <span style={{ color: "#374151" }}>TNT {tntProduto.gramatura}GR {tntCor} {tntLargura}m — {tntProduto.metragem}m/bob</span>
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>DATA</div>
                                <input type="date" value={tntData} onChange={e => setTntData(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>PESO (KG)</div>
                                <input
                                    type="text" inputMode="decimal"
                                    value={tntPeso}
                                    onChange={e => setTntPeso(e.target.value.replace(/[^0-9,.]/g, ""))}
                                    placeholder="0,0"
                                    style={{ ...inputStyle, borderColor: tntProduto ? tc + "60" : undefined }}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>CÓPIAS</div>
                                <input type="number" min="1" max="50" value={copies} onChange={e => setCopies(e.target.value)} style={inputStyle} />
                            </div>
                        </div>
                    </>
                ) : (
                    /* ── Campos Gorgurão / Poliéster / Elástico ── */
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: temMedida ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 14 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>COR</div>
                                <CorSelect value={cor} onChange={e => setCor(e.target.value)} options={COR_CATALOG_SORTED} style={inputStyle} showCodigo={false} />
                            </div>
                            {temMedida && (
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>MEDIDA</div>
                                    <SimpleSelect
                                        value={medida} onChange={e => setMedida(e.target.value)}
                                        options={MEDIDAS} style={inputStyle}
                                    />
                                </div>
                            )}
                        </div>

                        {temUnidades && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>UNIDADE</div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {unidadesDisponiveis.map(u => (
                                        <button key={u} onClick={() => { setUnidade(u); setQtd(""); }} style={tog(unidade === u, tc)}>
                                            {UNIDADE_LABEL[u] || u}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>QUANTIDADE</div>
                                <input
                                    type="text" inputMode={isDecimal ? "decimal" : "numeric"}
                                    value={qtd} onChange={e => setQtd(formatarQtd(e.target.value))}
                                    placeholder={isDecimal ? "0,0" : "0"}
                                    style={{ ...inputStyle, borderColor: tc + "60" }}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", marginBottom: 6 }}>CÓPIAS</div>
                                <input type="number" min="1" max="20" value={copies} onChange={e => setCopies(e.target.value)} style={inputStyle} />
                            </div>
                        </div>

                        {cor && (
                            <div style={{ background: tb, border: `1px solid ${tc}30`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>PRÉVIA DA ETIQUETA</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: tc }}>{tipo}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{cor}</div>
                                    {temMedida && <div style={{ fontSize: 12, color: "#6B7280" }}>{medida}</div>}
                                    {qtd ? (
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{qtd} {UNIDADE_LABEL[unidade] || unidade}</div>
                                    ) : (
                                        <div style={{ fontSize: 12, fontStyle: "italic", color: "#9CA3AF" }}>Sem quantidade — etiqueta sai em branco p/ marcar</div>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{copies}x cópia{Number(copies) !== 1 ? "s" : ""}</div>
                            </div>
                        )}
                    </>
                )}

                <button onClick={handleSubmit} disabled={!pronto} style={{
                    width: "100%", padding: "13px", borderRadius: 9, border: "none",
                    background: pronto ? tc : "#ECEDF1",
                    color: pronto ? "#fff" : "#9CA3AF",
                    fontWeight: 700, fontSize: 14, cursor: pronto ? "pointer" : "default",
                }}>
                    {enviado ? "✓ Etiqueta enviada para impressão!" : "🖨 Solicitar Impressão"}
                </button>
            </div>
            )}

            {/* Fila unificada */}
            {filaOrdenada.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6", fontSize: 13, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            Fila de Impressão
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginLeft: 8 }}>
                                {pendentes} pendente(s)
                            </span>
                        </div>
                        {podeEditar && (onLimparFila || onLimparFilaTNT) && (
                            <button onClick={() => {
                                if (window.confirm("Limpar toda a fila?")) {
                                    if (onLimparFila) onLimparFila();
                                    if (onLimparFilaTNT) onLimparFilaTNT();
                                }
                            }} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" }}>
                                Limpar fila
                            </button>
                        )}
                    </div>
                    {filaOrdenada.slice(0, 20).map((item, i) => {
                        const isTNT = item._qt === "tnt";
                        const c = isTNT ? "#0891B2" : (TIPO_COLOR[item.tipo] || "#9CA3AF");
                        return (
                            <div key={item.id || i} style={{
                                padding: isMobile ? "10px 12px" : "12px 20px",
                                borderBottom: i < filaOrdenada.length - 1 ? "1px solid #F3F4F6" : "none",
                                display: "flex", alignItems: "center", gap: 10,
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: c, background: c + "15", padding: "2px 7px", borderRadius: 5, flexShrink: 0 }}>
                                    {isTNT ? "TNT" : item.tipo}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {isTNT ? (
                                            <>
                                                <span style={{ fontFamily: "monospace", color: "#0891B2" }}>{item.codigo}</span>
                                                <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 400 }}> {item.cor} · {item.largura}m · {item.gramatura}gr · {item.metragem}m{item.copies > 1 ? ` ×${item.copies}` : ""}</span>
                                            </>
                                        ) : (
                                            <>
                                                <CorInline cor={item.cor} />{item.cor}
                                                <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 400 }}> {item.medida ? `${item.medida} · ` : ""}{item.quantidade != null ? `${Number(item.quantidade).toLocaleString("pt-BR")} ${UNIDADE_LABEL[item.unidade] || item.unidade}` : "(em branco)"}{item.copies > 1 ? ` ×${item.copies}` : ""}</span>
                                            </>
                                        )}
                                    </div>
                                    {!isMobile && (
                                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{item.solicitadoPor} · {item.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0]}</div>
                                    )}
                                </div>
                                <StatusBadge status={item.status} />
                                {podeEditar && item.status === "impresso" && (
                                    <button
                                        onClick={() => handleReimprimir(item)}
                                        title="Imprimir novamente"
                                        style={{
                                            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, flexShrink: 0,
                                            border: `1px solid ${reimpressoId === item.id ? "#BBF7D0" : "#ECEDF1"}`,
                                            background: reimpressoId === item.id ? "#F0FDF4" : "#F9FAFB",
                                            color: reimpressoId === item.id ? "#16A34A" : "#374151",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {reimpressoId === item.id ? "✓ Reenviada" : "🔁 Reimprimir"}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
