import { useState, useMemo, useEffect } from "react";
import { TNT_CATALOG } from "../utils/tntCatalog";

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

function gerarLabelHTML(item) {
    const numCopies = Number(item.copies) || 1;
    const [y, m, d] = (item.data || "").split("-");
    const dataDisplay = `${d}/${m}/${y}`;
    const larguraDisplay = item.largura === "1.40" ? "1,4 M" : "2,1 M";
    const corDisplay = item.cor === "branco" ? "BRANCA" : "PRETA";
    const pesoNum = Number(item.peso) || 0;
    const pesoDisplay = pesoNum > 0 ? pesoNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
    const logoUrl = `${window.location.origin}/bonemania-logo.png`;
    const css = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff}.page{display:flex;align-items:center;justify-content:center;min-height:100vh;page-break-after:always}.page:last-child{page-break-after:auto}.label{width:720px;border:3px solid #000}.logo-hdr{text-align:center;padding:12px 16px;border-bottom:2px solid #000;background:#fff}.logo-hdr img{height:64px;max-width:100%;object-fit:contain}.hdr{text-align:center;padding:12px;font-weight:bold;font-size:16px;line-height:1.5;border-bottom:2px solid #000}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000}.lbl{font-size:11px;font-weight:bold;text-align:center;padding:6px}.val{font-size:26px;font-weight:bold;text-align:center;padding:8px}.th{font-size:11px;font-weight:bold;text-align:center;padding:6px}.td{font-size:22px;font-weight:bold;text-align:center;padding:8px}.peso-row{text-align:center;padding:10px 14px;border-bottom:2px solid #000;font-weight:bold;font-size:14px}.peso-val{font-size:28px;font-weight:bold}.ft1{display:flex;justify-content:space-between;padding:8px 14px;border-top:2px solid #000;font-size:13px;font-weight:bold}.ft2{text-align:center;padding:8px 14px;font-size:12px;border-top:1px solid #000}@media print{.page{min-height:auto}}`;
    const pesoHtml = pesoDisplay ? `<div class="peso-row"><span class="lbl">PESO / WEIGHT</span><br><span class="peso-val">${pesoDisplay} KG</span></div>` : "";
    const label = `<div class="label"><div class="logo-hdr"><img src="${logoUrl}" alt="Bonémania"/></div><div class="hdr">FALSO TECIDO DE POLIPROPILENO, 2.22 DTEX<br>DE FILAMENTO CONTINUO</div><table style="border-bottom:2px solid #000"><tr><td style="width:50%"><div class="lbl">COR/COLOR</div><div class="val">${corDisplay}</div></td><td style="width:50%"><div class="lbl">GRAMATURA</div><div class="val">${item.gramatura} G/M2</div></td></tr></table><table style="border-bottom:2px solid #000"><thead><tr><th class="th">CODIGO</th><th class="th">LARGURA<br>WIDHT(M)</th><th class="th">METRAGEM/LENGHT</th><th class="th">DATA</th></tr></thead><tbody><tr><td class="td">${item.codigo}</td><td class="td">${larguraDisplay}</td><td class="td">${item.metragem} MTS</td><td class="td">${dataDisplay}</td></tr></tbody></table>${pesoHtml}<div class="ft1"><span>FABRICADO NO BRASIL</span><span>COMPOSIÇÃO: POLIPROPILENO</span></div><div class="ft2">VALIDADE DE 2 ANOS DESDE QUE SEJAM SEGUIDAS AS CONDIÇÕES DE MANUSEIO E ARMAZENAGEM.</div></div>`;
    const pages = Array(numCopies).fill(`<div class="page">${label}</div>`).join("");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${pages}<script>window.onload=function(){window.print()}<\/script></body></html>`;
}

export default function TNTEtiquetaTab({ onSolicitar, onMarcarImpresso, onLimparFila, fila = [], userName, podeEditar = true }) {
    const todayStr = new Date().toISOString().split("T")[0];
    const [largura,   setLargura]   = useState("1.40");
    const [cor,       setCor]       = useState("branco");
    const [gramatura, setGramatura] = useState("");
    const [metragem,  setMetragem]  = useState("");
    const [data,      setData]      = useState(todayStr);
    const [copies,    setCopies]    = useState("1");
    const [enviado,   setEnviado]   = useState(false);

    const gramaturas = useMemo(() =>
        [...new Set(TNT_CATALOG.filter(p => p.largura === largura && p.cor === cor).map(p => p.gramatura))].sort((a, b) => a - b),
        [largura, cor]
    );
    const metragens = useMemo(() =>
        gramatura ? TNT_CATALOG.filter(p => p.largura === largura && p.cor === cor && p.gramatura === Number(gramatura)).map(p => p.metragem).sort((a, b) => b - a) : [],
        [largura, cor, gramatura]
    );
    useEffect(() => {
        if (metragens.length === 1) setMetragem(String(metragens[0]));
        else setMetragem("");
    }, [metragens.join(",")]); // eslint-disable-line
    const produto = useMemo(() =>
        (gramatura && metragem) ? TNT_CATALOG.find(p => p.largura === largura && p.cor === cor && p.gramatura === Number(gramatura) && p.metragem === Number(metragem)) : null,
        [largura, cor, gramatura, metragem]
    );

    const pronto = produto;

    const handleSolicitar = () => {
        if (!pronto) return;
        onSolicitar({
            largura,
            cor,
            gramatura: Number(gramatura),
            metragem: Number(metragem),
            codigo: produto.codigo,
            data,
            copies: Number(copies) || 1,
            solicitadoPor: userName || "—",
            timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            status: "pendente",
        });
        setEnviado(true);
        setTimeout(() => setEnviado(false), 3000);
    };

    const handleImprimirItem = (item) => {
        const html = gerarLabelHTML(item);
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank", "width=900,height=700");
        if (!w) { alert("Permita popups neste site para imprimir."); return; }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        if (onMarcarImpresso) onMarcarImpresso(item.id);
    };

    const filaOrdenada = [...fila].sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "pendente" ? -1 : 1;
    });

    const inp = { padding: "8px 10px", borderRadius: 7, border: "1px solid #ECEDF1", fontSize: 13, background: "#F9FAFB", width: "100%", boxSizing: "border-box" };
    const lbl = { fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5 };
    const tog = (active) => ({
        flex: 1, padding: "9px 8px", borderRadius: 7, cursor: "pointer", fontSize: 13,
        border: `1.5px solid ${active ? "#0891B2" : "#ECEDF1"}`,
        background: active ? "#ECFEFF" : "#F9FAFB",
        color: active ? "#0369A1" : "#6B7280",
        fontWeight: active ? 700 : 500,
    });

    return (
        <div style={{ padding: "24px 16px 40px", maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontWeight: 700, fontSize: 22, color: "#111827", marginBottom: 4 }}>Etiqueta TNT</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>Solicite a impressão da etiqueta da bobina</div>

            {podeEditar && (
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div>
                    <label style={lbl}>LARGURA</label>
                    <div style={{ display: "flex", gap: 8 }}>
                        {["1.40", "2.10"].map(l => (
                            <button key={l} type="button" onClick={() => { setLargura(l); setGramatura(""); setMetragem(""); }} style={tog(largura === l)}>
                                {l === "1.40" ? "1,4 m" : "2,1 m"}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label style={lbl}>COR</label>
                    <div style={{ display: "flex", gap: 8 }}>
                        {["branco", "preto"].map(c => (
                            <button key={c} type="button" onClick={() => { setCor(c); setGramatura(""); setMetragem(""); }} style={tog(cor === c)}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label style={lbl}>GRAMATURA</label>
                    <select value={gramatura} onChange={e => setGramatura(e.target.value)} style={inp}>
                        <option value="">Selecione...</option>
                        {gramaturas.map(g => <option key={g} value={g}>{g} G/M2</option>)}
                    </select>
                </div>

                {metragens.length > 1 && (
                    <div>
                        <label style={lbl}>METRAGEM/BOB</label>
                        <select value={metragem} onChange={e => setMetragem(e.target.value)} style={inp}>
                            <option value="">Selecione...</option>
                            {metragens.map(m => <option key={m} value={m}>{m} m</option>)}
                        </select>
                    </div>
                )}

                {produto && (
                    <div style={{ padding: "8px 12px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, fontSize: 13 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#0369A1", marginRight: 8 }}>{produto.codigo}</span>
                        <span style={{ color: "#374151" }}>TNT {produto.gramatura}GR {cor} {largura}m — {produto.metragem}m/bob</span>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                        <label style={lbl}>DATA</label>
                        <input type="date" value={data} onChange={e => setData(e.target.value)} style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>CÓPIAS</label>
                        <input type="number" min="1" max="50" value={copies} onChange={e => setCopies(e.target.value)} style={inp} />
                    </div>
                </div>

                <button onClick={handleSolicitar} disabled={!pronto} style={{
                    padding: "13px", borderRadius: 9, border: "none",
                    background: pronto ? "#0891B2" : "#ECEDF1",
                    color: pronto ? "#fff" : "#9CA3AF",
                    fontWeight: 700, fontSize: 14, cursor: pronto ? "pointer" : "default",
                }}>
                    {enviado ? "✓ Etiqueta enviada!" : "🖨 Solicitar Impressão"}
                </button>
            </div>
            )}

            {filaOrdenada.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6", fontSize: 13, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            Fila de Impressão
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginLeft: 8 }}>
                                {filaOrdenada.filter(f => f.status === "pendente").length} pendente(s)
                            </span>
                        </div>
                        {podeEditar && onLimparFila && (
                            <button onClick={() => { if (window.confirm("Limpar toda a fila?")) onLimparFila(); }} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" }}>
                                Limpar fila
                            </button>
                        )}
                    </div>
                    {filaOrdenada.slice(0, 20).map((item, i) => (
                        <div key={item.id || i} style={{
                            padding: "12px 16px",
                            borderBottom: i < filaOrdenada.length - 1 ? "1px solid #F3F4F6" : "none",
                            display: "flex", alignItems: "center", gap: 10,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                                    <span style={{ fontFamily: "monospace", color: "#0369A1" }}>{item.codigo}</span>
                                    <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 400, marginLeft: 6 }}>
                                        {item.cor} · {item.largura}m · {item.gramatura}gr · {item.metragem}m
                                        {item.copies > 1 ? ` ×${item.copies}` : ""}
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{item.solicitadoPor} · {item.timestamp?.match(/\d{2}:\d{2}(?::\d{2})?/)?.[0]}</div>
                            </div>
                            {podeEditar && item.status === "pendente" && (
                                <button onClick={() => handleImprimirItem(item)} style={{
                                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                                    border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0369A1",
                                    cursor: "pointer", flexShrink: 0,
                                }}>
                                    Imprimir
                                </button>
                            )}
                            <StatusBadge status={item.status} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
