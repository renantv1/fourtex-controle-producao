import { useState } from "react";

export default function PesosForaMedidaTab({ pesosForaMedia = [], onLimpar, podeEditar = true }) {
    const [abertos, setAbertos] = useState({});

    const toggle = (date) => setAbertos(p => ({ ...p, [date]: !p[date] }));

    const tsDate = (ts) => ts ? ts.slice(0, 10) : "—";
    const tsHora = (ts) => { const m = ts?.match(/(\d{2}:\d{2}:\d{2})/); return m ? m[1] : (ts?.match(/(\d{2}:\d{2})/) || [])[1] || "—"; };

    // Agrupar por data
    const grupos = {};
    [...pesosForaMedia].reverse().forEach(p => {
        const date = tsDate(p.timestamp);
        if (!grupos[date]) grupos[date] = [];
        grupos[date].push(p);
    });

    const datas = Object.keys(grupos);

    return (
        <div style={{ padding: "24px 24px 40px", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>Pesos fora da média</div>
                    <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>
                        Registros de lançamentos com peso fora do esperado
                    </div>
                </div>
                {podeEditar && onLimpar && pesosForaMedia.length > 0 && (
                    <button onClick={() => { if (window.confirm("Limpar todos os registros de pesos fora da média?")) onLimpar(null); }}
                        style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", cursor: "pointer", flexShrink: 0 }}>
                        🗑 Limpar tudo
                    </button>
                )}
            </div>

            {datas.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                    Nenhum registro ainda
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {datas.map(date => {
                        const itens = grupos[date];
                        const aberto = !!abertos[date];
                        return (
                            <div key={date} style={{ background: "#fff", border: "1px solid #FECACA", borderRadius: 12, overflow: "hidden" }}>
                                <div onClick={() => toggle(date)} style={{
                                    padding: "10px 16px", background: "#FFF5F5",
                                    borderBottom: aberto ? "1px solid #FECACA" : "none",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    cursor: "pointer",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{date}</span>
                                        <span style={{ fontSize: 11, background: "#FECACA", color: "#991B1B", borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>{itens.length}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{aberto ? "▲" : "▼"}</span>
                                </div>

                                {aberto && (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: "#FFF5F5" }}>
                                                    {["Hora", "Operador", "Item", "Calculado", "Esperado", "Dif. %", ""].map(h => (
                                                        <th key={h} style={{ padding: "6px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", borderBottom: "1px solid #FECACA", whiteSpace: "nowrap" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itens.map((p, i) => (
                                                    <tr key={i} style={{ borderBottom: "1px solid #FEF2F2" }}>
                                                        <td style={{ padding: "8px 14px", color: "#6B7280", whiteSpace: "nowrap" }}>
                                                            {tsHora(p.timestamp)}
                                                        </td>
                                                        <td style={{ padding: "8px 14px", fontWeight: 600, color: "#374151" }}>{p.operador}</td>
                                                        <td style={{ padding: "8px 14px", color: "#111827" }}>
                                                            <span style={{ fontWeight: 600 }}>{p.medida} {p.cor}</span>
                                                            <span style={{ color: "#9CA3AF", marginLeft: 6, fontSize: 11 }}>{p.tipo}</span>
                                                        </td>
                                                        <td style={{ padding: "8px 14px", fontWeight: 700, color: "#DC2626" }}>{p.kgPorRolo} kg/rl</td>
                                                        <td style={{ padding: "8px 14px", color: "#6B7280" }}>{p.esperado} kg/rl</td>
                                                        <td style={{ padding: "8px 14px", fontWeight: 700, color: "#DC2626" }}>{p.diff}%</td>
                                                        <td style={{ padding: "4px 10px" }}>
                                                            {podeEditar && onLimpar && <button onClick={() => onLimpar(p.key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 14, padding: "2px 4px" }} title="Excluir">✕</button>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
