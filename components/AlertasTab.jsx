import { useState } from "react";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const chaveMes = ts => { const m = String(ts || "").match(/^\d{2}\/(\d{2})\/(\d{4})/); return m ? `${m[2]}-${m[1]}` : "0000-00"; };
const nomeMes = k => { if (k === "0000-00") return "Sem data"; const [a, m] = k.split("-"); return `${MESES[+m - 1]} ${a}`; };

export default function AlertasTab({ alertas, onResolver, onDeleteAlerta, podeEditar = true }) {
    const abertos = alertas.filter(a => a.status === "aberto");
    const resolvidos = alertas.filter(a => a.status === "resolvido");
    // Histórico agrupado por mês (mais recente primeiro); o mês mais recente começa aberto
    const porMes = resolvidos.reduce((acc, a) => { (acc[chaveMes(a.timestamp)] ??= []).push(a); return acc; }, {});
    const meses = Object.keys(porMes).sort((x, y) => y.localeCompare(x));
    const [trocados, setTrocados] = useState(() => new Set());
    const toggleMes = k => setTrocados(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
                    Manutenção
                    {abertos.length > 0 && (
                        <span style={{ marginLeft: 10, fontSize: 13, background: "#FEE2E2", color: "#DC2626", borderRadius: 20, padding: "2px 12px", fontWeight: 700 }}>
                            {abertos.length} parada{abertos.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Máquinas paradas e histórico de manutenções</p>
            </div>

            {/* Máquinas paradas agora */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 10 }}>MÁQUINAS PARADAS AGORA</div>

            {abertos.length === 0 ? (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12, marginBottom: 32, color: "#16A34A", fontWeight: 600, fontSize: 14 }}>
                    <svg width="20" height="20" fill="none" stroke="#16A34A" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    Todas as máquinas em operação
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    {abertos.map(a => (
                        <div key={a.key} style={{ background: "#fff", border: "1.5px solid #FECACA", borderRadius: 12, padding: "16px 20px" }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <div style={{ width: 38, height: 38, borderRadius: 9, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg width="18" height="18" fill="none" stroke="#DC2626" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                                    </svg>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{a.machineName}</div>
                                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{a.motivo}</div>
                                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                                        Por <strong style={{ color: "#374151" }}>{a.operador}</strong> · {a.timestamp}
                                    </div>
                                    {podeEditar && (
                                    <button onClick={() => onResolver(a.key)} style={{
                                        marginTop: 10, padding: "7px 16px", background: "#16A34A", border: "none",
                                        borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                                    }}>
                                        ✓ Resolvido
                                    </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Histórico de manutenções */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 10 }}>HISTÓRICO DE MANUTENÇÕES</div>

            {resolvidos.length === 0 ? (
                <div style={{ fontSize: 13, color: "#9CA3AF", padding: "16px 0" }}>Nenhuma manutenção registrada.</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {meses.map(k => {
                        const itens = porMes[k];
                        const aberto = (k === meses[0]) !== trocados.has(k);
                        const maquinas = new Set(itens.map(a => a.machineName)).size;
                        return (
                            <div key={k} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                                <button onClick={() => toggleMes(k)} style={{
                                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
                                    background: aberto ? "#F9FAFB" : "#fff", border: "none", cursor: "pointer", textAlign: "left",
                                    borderBottom: aberto ? "1px solid #ECEDF1" : "none",
                                }}>
                                    <svg width="14" height="14" fill="none" stroke="#6B7280" strokeWidth="2.5" viewBox="0 0 24 24"
                                        style={{ transform: aberto ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
                                        <polyline points="9 18 15 12 9 6"/>
                                    </svg>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: "#111827", flex: 1 }}>{nomeMes(k)}</span>
                                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                                        {maquinas} máquina{maquinas !== 1 ? "s" : ""}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700, background: "#F0FDF4", color: "#16A34A", borderRadius: 20, padding: "2px 10px" }}>
                                        {itens.length} manutenç{itens.length !== 1 ? "ões" : "ão"}
                                    </span>
                                </button>
                                {aberto && itens.map((a, idx) => (
                                    <div key={a.key} style={{
                                        padding: "14px 16px",
                                        borderBottom: idx < itens.length - 1 ? "1px solid #F3F4F6" : "none",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", flexShrink: 0, marginTop: 5 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                    <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{a.machineName}</span>
                                                    <span style={{ fontSize: 13, color: "#6B7280" }}>{a.motivo}</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>Por {a.operador}</div>
                                                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Reportado: {a.timestamp}</div>
                                                {a.resolvidoEm && (
                                                    <div style={{ fontSize: 11, color: "#16A34A", marginTop: 2 }}>
                                                        Resolvido: {a.resolvidoEm}{a.resolvidoPor ? ` · ${a.resolvidoPor}` : ""}
                                                    </div>
                                                )}
                                                {podeEditar && onDeleteAlerta && (
                                                    <button onClick={() => onDeleteAlerta(a.key)} style={{
                                                        marginTop: 8, padding: "3px 10px", background: "transparent",
                                                        border: "1px solid #FECACA", borderRadius: 6,
                                                        color: "#DC2626", fontSize: 11, cursor: "pointer", fontWeight: 600,
                                                    }}>
                                                        Excluir
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
