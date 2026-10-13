import { useState, useEffect } from "react";
import { workdaysBetween, addWorkdays, formatDate, today } from "../utils";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorDot, CorInline } from "../utils/CorDot";

const RL_POR_FITA_POR_TURNO = 2.5;
const TURNOS_POR_DIA = 3;
const TIPO_COLOR = { "Gorgurão": "#F97316", "Poliéster": "#6366F1", "Elástico": "#10B981" };
const TIPO_BG    = { "Gorgurão": "#FFF7ED", "Poliéster": "#EEF2FF", "Elástico": "#F0FDF4" };

function normalize(x) { return Array.isArray(x) ? x : Object.values(x || {}); }

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

function specKey(tipo, medida, cor) {
    return `${tipo}|${medida}|${(cor || "").trim().toLowerCase()}`;
}

function calcSaldoEstoque(logs, movimentos, orders) {
    // Usa apenas estoqueMovimentos — entregas já estão como "saida" dentro de movimentos
    // Processar entregasParciais separadamente causaria dupla contagem
    const mapa = {};
    const parseTSP = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
    const movOrd = [...movimentos].sort((a, b) => parseTSP(a.timestamp) - parseTSP(b.timestamp));
    movOrd.forEach(m => {
        if (!m.tipo || !m.medida) return;
        const k = specKey(m.tipo, m.medida, m.cor || "");
        const isMetroMov = m.unidade === "Metro" || m.unidade === "m";
        const qtdRL = isMetroMov ? Math.floor(Number(m.qtd) / 25) : Number(m.qtd);
        mapa[k] = (mapa[k] || 0) + (m.movimento === "entrada" ? qtdRL : -qtdRL);
    });
    const result = {};
    Object.entries(mapa).forEach(([k, v]) => { if (v > 0) result[k] = Math.floor(v); });
    return result;
}

function calcSaldoPorSpec(orders) {
    const mapa = {};
    orders.filter(o => o.status === "em_producao" || o.status === "confirmacao").forEach(o => {
        normalize(o.itens || []).forEach(i => {
            if (!i.cor || !i.medida || !i.tipo) return;
            const k = specKey(i.tipo, i.medida, i.cor);
            const isMetroUnit = i.unidadeOriginal === "Metro" || i.unidadeOriginal === "m";
            const pendente = Math.max(0, (i.qtdTotal || 0) - (i.qtdProduzida || 0));
            const pendenteRL = isMetroUnit ? Math.floor(pendente / 25) : pendente;
            const totalRL    = isMetroUnit ? Math.floor((i.qtdTotal || 0) / 25) : (i.qtdTotal || 0);
            if (!mapa[k]) mapa[k] = { cor: i.cor, medida: i.medida, tipo: i.tipo, saldo: 0, totalOrdered: 0, pedidos: [] };
            mapa[k].saldo += pendenteRL;
            mapa[k].totalOrdered += totalRL;
            if (pendenteRL > 0) mapa[k].pedidos.push({
                orderId: o.id, numero: o.numero, cliente: o.cliente || "—",
                dataEntrega: o.dataEntrega, remaining: pendenteRL,
            });
        });
    });
    Object.values(mapa).forEach(s => s.pedidos.sort((a, b) => (a.dataEntrega || "").localeCompare(b.dataEntrega || "")));
    return mapa;
}

function calcSpecNasMaquinas(machines) {
    const mapa = {};
    machines.forEach(m => {
        normalize(m.fitas).forEach(f => {
            const tipo = f.tipo || (m.tipo !== "Misto" ? m.tipo : null);
            if (!tipo || !f.cor || !f.medida) return;
            const k = specKey(tipo, f.medida, f.cor);
            if (!mapa[k]) mapa[k] = { cor: f.cor, medida: f.medida, tipo, totalFitas: 0, machineList: [] };
            mapa[k].totalFitas += (f.qtd || 1);
            mapa[k].machineList.push({ id: m.id, nome: m.nome || `Máquina ${m.id}`, qtd: (f.qtd || 1) });
        });
    });
    return mapa;
}

function calcSugestao(medida, tipo, corExcluir, saldoPorSpec, specNasMaquinas, estoqueMap = {}) {
    const isPreto = c => (c || "").trim().toLowerCase() === "preto";
    const candidatos = Object.values(saldoPorSpec)
        .filter(s => s.medida === medida && s.tipo === tipo && s.saldo > 0 &&
            s.cor.trim().toLowerCase() !== (corExcluir || "").trim().toLowerCase())
        .map(s => ({ ...s, saldoEfetivo: Math.max(0, s.saldo - (estoqueMap[specKey(s.tipo, s.medida, s.cor)] || 0)) }))
        .filter(s => s.saldoEfetivo > 0);
    const proxPedido = s => s.pedidos?.[0] ? { remaining: s.pedidos[0].remaining, dataEntrega: s.pedidos[0].dataEntrega } : null;
    const semFita = candidatos.filter(s => !specNasMaquinas[specKey(s.tipo, s.medida, s.cor)] && !isPreto(s.cor))
        .sort((a, b) => b.saldoEfetivo - a.saldoEfetivo);
    if (semFita.length > 0) return { cor: semFita[0].cor, saldo: semFita[0].saldoEfetivo, proxPedido: proxPedido(semFita[0]), motivo: "sem fita configurada" };
    const coloridas = candidatos.filter(s => !isPreto(s.cor)).sort((a, b) => b.saldoEfetivo - a.saldoEfetivo);
    if (coloridas.length > 0) return { cor: coloridas[0].cor, saldo: coloridas[0].saldoEfetivo, proxPedido: proxPedido(coloridas[0]), motivo: "maior saldo pendente" };
    const preto = candidatos.find(s => isPreto(s.cor));
    if (preto) return { cor: preto.cor, saldo: preto.saldoEfetivo, proxPedido: proxPedido(preto), motivo: "sem coloridas pendentes" };
    return null;
}

function StatCard({ label, value, color, bg, icon, sub }) {
    return (
        <div style={{ background: bg || "#fff", border: "1px solid #ECEDF1", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: color ? color : "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, opacity: 0.8 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: color || "#111827", lineHeight: 1 }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5, fontWeight: 500 }}>{sub}</div>}
            </div>
            {icon && (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: color ? `${color}18` : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 17 }}>{icon}</span>
                </div>
            )}
        </div>
    );
}

function SwapAlertCard({ item, isLast, onAbrir, isMobile, podeEditar = true }) {
    const tColor = TIPO_COLOR[item.tipo] || "#9CA3AF";
    const machineNames = item.machineList?.map(m => m.nome).join(", ") || "—";
    return (
        <div style={{ background: "#fff", borderBottom: isLast ? "none" : "1px solid #FDE68A", display: "flex" }}>
            <div style={{ width: 4, background: "#F97316", flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center" }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}><CorInline cor={item.cor} />{item.cor} {item.medida}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: tColor, background: TIPO_BG[item.tipo] || "#F3F4F6", padding: "2px 8px", borderRadius: 10 }}>{item.tipo}</span>
                            <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F9FAFB", padding: "2px 8px", borderRadius: 8, border: "1px solid #ECEDF1" }}>{machineNames}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#D97706", fontWeight: 600, marginBottom: 8 }}>
                            Saldo: {item.saldo.toLocaleString("pt-BR")} RL — finaliza na próxima produção
                        </div>
                        {item.sugestao ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "7px 10px" }}>
                                <span style={{ fontSize: 11, color: "#6B7280" }}>Sugestão:</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}><CorInline cor={item.sugestao.cor} />{item.sugestao.cor} {item.medida}</span>
                                <span style={{ fontSize: 11, color: "#6B7280" }}>· {item.sugestao.saldo.toLocaleString("pt-BR")} RL total</span>
                                {item.sugestao.proxPedido && <span style={{ fontSize: 11, color: "#6B7280" }}>· próximo: {item.sugestao.proxPedido.remaining.toLocaleString("pt-BR")} RL até {formatDate(item.sugestao.proxPedido.dataEntrega)}</span>}
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", background: "#DBEAFE", padding: "1px 7px", borderRadius: 10 }}>{item.sugestao.motivo}</span>
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>Nenhuma cor pendente para esta medida.</div>
                        )}
                    </div>
                    {podeEditar && (
                    <button onClick={onAbrir} style={{
                        padding: "11px 20px", background: "#F97316", border: "none", borderRadius: 9,
                        color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                        width: isMobile ? "100%" : "auto", flexShrink: 0, marginTop: isMobile ? 8 : 0,
                    }}>
                        Ver e confirmar →
                    </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ModalTroca({ swap, onConfirmar, onCancelar, saldoPorSpec, estoqueMap = {}, readOnly = false }) {
    const [novaCor, setNovaCor] = useState(swap.sugestao?.cor || "");
    const [corExpandida, setCorExpandida] = useState(null);
    const candidatos = Object.values(saldoPorSpec)
        .filter(s => s.medida === swap.medida && s.tipo === swap.tipo && s.saldo > 0
            && s.cor.trim().toLowerCase() !== swap.cor.trim().toLowerCase())
        .map(s => ({ ...s, saldoEfetivo: Math.max(0, s.saldo - (estoqueMap[specKey(s.tipo, s.medida, s.cor)] || 0)) }))
        .filter(s => s.saldoEfetivo > 0)
        .sort((a, b) => b.saldoEfetivo - a.saldoEfetivo);
    const machines = swap.machineList?.map(m => m.nome).join(", ") || "—";
    const canConfirm = novaCor.trim().length > 0;
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 2 }}>{readOnly ? "Opções de Troca" : "Troca de Fita"}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
                    {machines} · {swap.tipo} {swap.medida}
                    {readOnly && " · informativo, a troca é feita pelo operador na máquina"}
                </div>

                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2, fontWeight: 600 }}>{readOnly ? "FITA ATUAL" : "SUBSTITUINDO"}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#DC2626" }}><CorInline cor={swap.cor} />{swap.cor} {swap.medida}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                        Saldo restante: {swap.saldo.toLocaleString("pt-BR")} RL · {swap.totalFitas} fita{swap.totalFitas !== 1 ? "s" : ""}
                    </div>
                </div>

                {!readOnly && (
                <>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 6 }}>NOVA COR</label>
                <div style={{ position: "relative" }}>
                    <input
                        list="swap-cores"
                        value={novaCor}
                        onChange={e => setNovaCor(e.target.value)}
                        placeholder="Digite ou escolha..."
                        autoFocus
                        style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", paddingLeft: novaCor ? 34 : "12px", border: `2px solid ${canConfirm ? "#F97316" : "#ECEDF1"}`, borderRadius: 9, fontSize: 15, outline: "none", marginBottom: 8, fontWeight: 600 }}
                    />
                    <CorDot cor={novaCor} />
                </div>
                <datalist id="swap-cores">
                    {candidatos.map(c => <option key={c.cor} value={c.cor} />)}
                </datalist>
                </>
                )}

                {candidatos.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>CORES COM PEDIDO PENDENTE</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {candidatos.slice(0, 5).map((c, i) => {
                                const isPreto = c.cor.trim().toLowerCase() === "preto";
                                const proxPedido = c.pedidos?.[0];
                                const expandido = corExpandida === c.cor;
                                return (
                                    <div key={i}>
                                        <button
                                            onClick={() => { if (!readOnly) setNovaCor(c.cor); setCorExpandida(expandido ? null : c.cor); }}
                                            style={{
                                                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                                                padding: "7px 12px", borderRadius: expandido ? "8px 8px 0 0" : 8,
                                                border: `1px solid ${(readOnly ? expandido : novaCor === c.cor) ? "#F97316" : "#ECEDF1"}`,
                                                borderBottom: expandido ? "none" : undefined,
                                                background: (readOnly ? expandido : novaCor === c.cor) ? "#FFF7ED" : "#F9FAFB",
                                                cursor: "pointer", textAlign: "left",
                                            }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}><CorInline cor={c.cor} />{c.cor}</span>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span style={{ fontSize: 11, color: "#6B7280" }}>{c.saldoEfetivo.toLocaleString("pt-BR")} RL total</span>
                                                    {i === 0 && !isPreto && <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", padding: "1px 6px", borderRadius: 10 }}>sugerido</span>}
                                                    {isPreto && <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F3F4F6", padding: "1px 6px", borderRadius: 10 }}>preto</span>}
                                                    {c.pedidos?.length > 1 && <span style={{ fontSize: 10, color: "#9CA3AF" }}>{expandido ? "▲" : "▼"}</span>}
                                                </div>
                                                {proxPedido && (
                                                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>próximo: {proxPedido.remaining.toLocaleString("pt-BR")} RL até {formatDate(proxPedido.dataEntrega)}</span>
                                                )}
                                            </div>
                                        </button>
                                        {expandido && c.pedidos?.length > 0 && (
                                            <div style={{ border: "1px solid #ECEDF1", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "6px 12px", background: "#fff" }}>
                                                {c.pedidos.map((p, pi) => (
                                                    <div key={pi} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: pi > 0 ? "1px solid #F3F4F6" : "none" }}>
                                                        <span style={{ fontSize: 11, color: "#6B7280" }}>#{p.numero} · {p.cliente}</span>
                                                        <span style={{ fontSize: 11, color: "#111827", fontWeight: 600 }}>{p.remaining.toLocaleString("pt-BR")} RL · {formatDate(p.dataEntrega)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {readOnly ? (
                    <button onClick={onCancelar} style={{ width: "100%", padding: 12, borderRadius: 9, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Fechar</button>
                ) : (
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button onClick={onCancelar} style={{ flex: 1, padding: 12, borderRadius: 9, border: "1px solid #ECEDF1", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>Cancelar</button>
                        <button disabled={!canConfirm} onClick={() => onConfirmar({ ...swap, novaCor: novaCor.trim() })} style={{
                            flex: 2, padding: 12, borderRadius: 9, border: "none",
                            background: canConfirm ? "#F97316" : "#ECEDF1",
                            color: canConfirm ? "#fff" : "#9CA3AF",
                            fontWeight: 700, fontSize: 13, cursor: canConfirm ? "pointer" : "not-allowed",
                        }}>
                            Confirmar troca
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ProgressBar({ pct }) {
    const color = pct >= 80 ? "#16A34A" : pct >= 50 ? "#F97316" : "#EAB308";
    return (
        <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
    );
}

function Chip({ label, value, valueColor }) {
    return (
        <div style={{ background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>{label}:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: valueColor || "#111827" }}>{value}</span>
        </div>
    );
}

function SpecCard({ item, isLast }) {
    const [expandido, setExpandido] = useState(false);
    const tColor = TIPO_COLOR[item.tipo] || "#9CA3AF";
    const pct = item.totalOrdered > 0 ? Math.round(((item.totalOrdered - item.saldo) / item.totalOrdered) * 100) : 0;

    let statusColor, statusLabel, accentColor;
    if (item.concluido)            { statusColor = "#16A34A"; statusLabel = "Concluído";   accentColor = "#16A34A"; }
    else if (item.cobertoPorEstoque) { statusColor = "#0369A1"; statusLabel = "No estoque"; accentColor = "#0369A1"; }
    else if (item.semFitas)        { statusColor = "#DC2626"; statusLabel = "Sem fitas";   accentColor = "#DC2626"; }
    else if (item.finalizing)      { statusColor = "#D97706"; statusLabel = "Finalizando"; accentColor = "#F97316"; }
    else                            { statusColor = "#16A34A"; statusLabel = "Produzindo";  accentColor = "#16A34A"; }

    const conclusaoColor = item.diasNecessarios <= 3 ? "#D97706" : "#6B7280";

    return (
        <div style={{ borderBottom: isLast ? "none" : "1px solid #F3F4F6" }}>
            {/* Linha principal clicável */}
            <div onClick={() => setExpandido(e => !e)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                borderLeft: `3px solid ${accentColor}`,
                background: expandido ? "#FAFAFA" : "#fff",
            }}>
                {/* Cor + medida */}
                <div style={{ flex: "0 0 160px", minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <CorInline cor={item.cor} />{item.medida} {item.cor}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: tColor }}>{item.tipo}</span>
                        {item.machineList?.length > 0 && (
                            <span style={{ fontSize: 10, color: "#6B7280", background: "#F3F4F6", border: "1px solid #ECEDF1", borderRadius: 6, padding: "0px 5px", fontWeight: 600 }}>
                                {item.machineList.length > 1
                                    ? item.machineList.map(ml => `M${(ml.nome||"").replace(/\D/g,"") || ml.nome}`).join(", ")
                                    : `M${(item.machineList[0].nome||"").replace(/\D/g,"") || item.machineList[0].nome}`}
                            </span>
                        )}
                    </div>
                </div>

                {/* Barra progresso */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: accentColor, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", minWidth: 28, textAlign: "right" }}>{pct}%</span>
                </div>

                {/* Pendente */}
                <div style={{ flex: "0 0 90px", textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{item.saldo.toLocaleString("pt-BR")} RL</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{item.totalFitas} fita{item.totalFitas !== 1 ? "s" : ""}</div>
                </div>

                {/* Termina */}
                <div style={{ flex: "0 0 100px", textAlign: "right" }}>
                    {item.concluido ? (
                        <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>Feito</div>
                    ) : item.saldoEfetivo === 0 && item.estoqueDisp > 0 ? (
                        <div style={{ fontSize: 11, color: "#0369A1", fontWeight: 700 }}>No estoque</div>
                    ) : item.dataConclusao ? (
                        <>
                            <div style={{ fontSize: 11, fontWeight: 700, color: conclusaoColor }}>{formatDate(item.dataConclusao)}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{item.diasNecessarios}d úteis</div>
                        </>
                    ) : <div style={{ fontSize: 11, color: "#9CA3AF" }}>—</div>}
                </div>

                {/* Status */}
                <div style={{ flex: "0 0 80px", textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                </div>

                {/* Seta */}
                <div style={{ fontSize: 11, color: expandido ? accentColor : "#D1D5DB", transform: expandido ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>▶</div>
            </div>

            {/* Expandido: alerta + pedidos */}
            {expandido && (
                <div style={{ background: "#F9FAFB", borderLeft: `3px solid ${accentColor}` }}>
                    {/* Capacidade de produção */}
                    {!item.concluido && (
                        <div style={{ margin: "10px 16px 0", background: item.semFitas ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${item.semFitas ? "#FECACA" : "#BBF7D0"}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: item.semFitas ? "#DC2626" : "#166534" }}>
                            {item.semFitas
                                ? "⚠ Nenhuma fita configurada. Adicione nas máquinas."
                                : item.saldoEfetivo === 0
                                    ? <>✓ Estoque cobre todos os pedidos ({item.estoqueDisp.toLocaleString("pt-BR")} RL disponíveis)</>
                                    : <>
                                        {item.totalFitas} fita{item.totalFitas !== 1 ? "s" : ""} · {item.rlPorDia.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} RL/dia
                                        {item.estoqueDisp > 0 && <span style={{ color: "#0369A1" }}> · {item.estoqueDisp.toLocaleString("pt-BR")} RL em estoque</span>}
                                        {" · "}produzir ainda <strong>{item.saldoEfetivo.toLocaleString("pt-BR")} RL</strong> · termina em <strong>{item.diasNecessarios}d úteis</strong> ({formatDate(item.dataConclusao)})
                                    </>
                            }
                        </div>
                    )}
                    {item.machineList?.length > 0 && (
                        <>
                            <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em" }}>MÁQUINAS PRODUZINDO</div>
                            <div style={{ padding: "0 16px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {item.machineList.map((mac, mi) => (
                                    <div key={mi} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 8, padding: "5px 10px" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>M{(mac.nome||"").replace(/\D/g,"") || mac.nome}</span>
                                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{mac.qtd} fita{mac.qtd !== 1 ? "s" : ""}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {item.pedidos.length > 0 && (
                        <>
                            <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em" }}>PEDIDOS DEPENDENTES</div>
                            {item.pedidos.map((p, i) => (
                                    <div key={i} style={{ padding: "8px 16px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            {p.numero && <span style={{ fontSize: 10, color: "#9CA3AF", marginRight: 5, fontWeight: 600 }}>#{p.numero}</span>}
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.cliente}</span>
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{p.remaining.toLocaleString("pt-BR")} RL</span>
                                    </div>
                                ))}
                        </>
                    )}
                    <div style={{ height: 8 }} />
                </div>
            )}
        </div>
    );
}

function MaquinaView({ machines, saldoPorSpec, specNasMaquinas, estoqueMap, podeEditar = true }) {
    const [modalSwap, setModalSwap] = useState(null);

    const maquinasComFitas = machines.filter(m => normalize(m.fitas).length > 0);

    return (
        <>
            {modalSwap && (
                <ModalTroca
                    swap={modalSwap}
                    saldoPorSpec={saldoPorSpec}
                    estoqueMap={estoqueMap}
                    readOnly
                    onCancelar={() => setModalSwap(null)}
                />
            )}
            {maquinasComFitas.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                    Nenhuma máquina com fitas configuradas.
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                    {maquinasComFitas.map(m => {
                        const fitas = normalize(m.fitas);
                        const mTipo = m.tipo !== "Misto" ? m.tipo : null;

                        return (
                            <div key={m.id} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                                {/* Header máquina */}
                                <div style={{ padding: "12px 16px", background: "#F9FAFB", borderBottom: "1px solid #ECEDF1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFF7ED", border: "1px solid #FED7AA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#F97316" }}>
                                            {m.numero || m.id}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{m.nome || `Máquina ${m.id}`}</div>
                                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.tipo} · {fitas.length} fita{fitas.length !== 1 ? "s" : ""}</div>
                                        </div>
                                    </div>
                                    {m.parada && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 20, padding: "2px 8px" }}>PARADA</span>
                                    )}
                                </div>

                                {/* Fitas */}
                                <div>
                                    {fitas.map((f, fi) => {
                                        const tipo = f.tipo || mTipo || "Gorgurão";
                                        const k = specKey(tipo, f.medida, f.cor);
                                        const demanda = saldoPorSpec[k];
                                        const saldo = demanda?.saldo || 0;
                                        const estoqueDisp = estoqueMap[k] || 0;
                                        const saldoEfetivo = Math.max(0, saldo - estoqueDisp);
                                        const qtdFita = f.qtd || 1;
                                        const totalFitasSpec = specNasMaquinas[k]?.totalFitas || qtdFita;
                                        const rlPorTurno = totalFitasSpec * RL_POR_FITA_POR_TURNO;
                                        const tColor = TIPO_COLOR[tipo] || "#9CA3AF";

                                        let status, statusColor, statusBg, acao;
                                        if (!demanda || saldo <= 0) {
                                            status = "Concluído"; statusColor = "#16A34A"; statusBg = "#F0FDF4";
                                            acao = "pode_trocar";
                                        } else if (saldoEfetivo === 0 && estoqueDisp > 0) {
                                            status = "No estoque"; statusColor = "#0369A1"; statusBg = "#EFF6FF";
                                            acao = "pode_trocar";
                                        } else if (saldoEfetivo <= rlPorTurno) {
                                            status = "Finalizando"; statusColor = "#D97706"; statusBg = "#FFFBEB";
                                            acao = "finalizando";
                                        } else {
                                            status = "Produzindo"; statusColor = "#6B7280"; statusBg = "#F9FAFB";
                                            acao = "ok";
                                        }

                                        const sugestao = (acao === "pode_trocar" || acao === "finalizando")
                                            ? calcSugestao(f.medida, tipo, f.cor, saldoPorSpec, specNasMaquinas, estoqueMap)
                                            : null;

                                        const pedidos = demanda?.pedidos || [];

                                        const outrasMaquinas = (specNasMaquinas[k]?.machineList || []).filter(ml => ml.id !== m.id);
                                        const mLabel = n => `M${n.replace(/\D/g, "") || n}`;
                                        const toMLabel = mac => `M${(mac.nome || "").replace(/\D/g, "") || mac.nome}`;

                                        return (
                                            <div key={fi} style={{ borderBottom: fi < fitas.length - 1 ? "1px solid #F3F4F6" : "none", padding: "12px 16px", background: statusBg }}>
                                                {/* Cor + medida + status */}
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                        <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}><CorInline cor={f.cor} />{f.cor}</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: tColor, background: TIPO_BG[tipo], padding: "1px 7px", borderRadius: 8 }}>{f.medida}</span>
                                                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{qtdFita} fita{qtdFita !== 1 ? "s" : ""}</span>
                                                        {outrasMaquinas.length > 0 && (
                                                            <span style={{ fontSize: 10, fontWeight: 600, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 6, padding: "1px 6px" }}>
                                                                também: {outrasMaquinas.map(toMLabel).join(", ")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{status}</span>
                                                </div>

                                                {/* Saldo */}
                                                {saldo > 0 ? (
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: statusColor, marginBottom: 4 }}>
                                                        {saldo.toLocaleString("pt-BR")} RL pendentes
                                                        {estoqueDisp > 0 && (
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: "#0369A1", marginLeft: 6 }}>
                                                                ({estoqueDisp.toLocaleString("pt-BR")} em estoque)
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, marginBottom: 4 }}>
                                                        Pedido completo — pode remover a fita
                                                    </div>
                                                )}
                                                {saldo > 0 && saldoEfetivo > 0 && (
                                                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8 }}>
                                                        produzir ainda {saldoEfetivo.toLocaleString("pt-BR")} RL · ~{Math.ceil(saldoEfetivo / rlPorTurno)} turno{Math.ceil(saldoEfetivo / rlPorTurno) !== 1 ? "s" : ""}
                                                        {totalFitasSpec > qtdFita && <span style={{ color: "#7C3AED" }}> ({totalFitasSpec} fitas no total)</span>}
                                                    </div>
                                                )}
                                                {saldo > 0 && saldoEfetivo === 0 && estoqueDisp > 0 && (
                                                    <div style={{ fontSize: 11, color: "#0369A1", fontWeight: 600, marginBottom: 8 }}>
                                                        Estoque cobre todos os pedidos
                                                    </div>
                                                )}

                                                {/* Conclusão estimada */}
                                                {saldoEfetivo > 0 && (() => {
                                                    const diasEst = Math.ceil(saldoEfetivo / rlPorTurno / TURNOS_POR_DIA);
                                                    const dataEst = addWorkdays(today, diasEst);
                                                    const cor = diasEst <= 3 ? "#D97706" : "#6B7280";
                                                    return (
                                                        <div style={{ fontSize: 11, color: cor, marginBottom: sugestao ? 8 : 0 }}>
                                                            Termina: <strong>{formatDate(dataEst)}</strong> · {diasEst}d úteis
                                                        </div>
                                                    );
                                                })()}

                                                {/* Sugestão de troca — clicável, abre as opções de troca */}
                                                {sugestao && (
                                                    <div
                                                        onClick={podeEditar ? () => setModalSwap({ ...specNasMaquinas[k] || { cor: f.cor, medida: f.medida, tipo, totalFitas: qtdFita, machineList: [{ nome: m.nome || `Máquina ${m.id}` }] }, saldo, sugestao }) : undefined}
                                                        style={{
                                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                                            background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "7px 10px", marginTop: 6,
                                                            cursor: podeEditar ? "pointer" : "default",
                                                        }}
                                                        onMouseEnter={podeEditar ? e => e.currentTarget.style.background = "#DBEAFE" : undefined}
                                                        onMouseLeave={podeEditar ? e => e.currentTarget.style.background = "#EFF6FF" : undefined}
                                                    >
                                                        <div>
                                                            <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>PRÓXIMA COR</div>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}><CorInline cor={sugestao.cor} />{sugestao.cor} · {sugestao.saldo.toLocaleString("pt-BR")} RL total</div>
                                                            {sugestao.proxPedido && (
                                                                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                                                                    próximo pedido: {sugestao.proxPedido.remaining.toLocaleString("pt-BR")} RL até {formatDate(sugestao.proxPedido.dataEntrega)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {podeEditar && <span style={{ fontSize: 18, color: "#2563EB", flexShrink: 0 }}>→</span>}
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
        </>
    );
}

export default function PlanejamentoTab({ machines, orders, logs = [], movimentos = [], onSwapFita, podeEditar = true }) {
    const isMobile = useIsMobile();
    const [view, setView] = useState("maquinas");
    const [filtro, setFiltro] = useState("todos");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [filtroMedida, setFiltroMedida] = useState("");
    const [filtroCor, setFiltroCor] = useState("");
    const [modalSwap, setModalSwap] = useState(null);

    const tiposPermitidos = new Set(
        machines.flatMap(m => m.tipo === "Misto" ? ["Gorgurão", "Poliéster"] : [m.tipo])
    );

    const saldoPorSpecTodos = calcSaldoPorSpec(orders);
    const saldoPorSpec = Object.fromEntries(
        Object.entries(saldoPorSpecTodos).filter(([, d]) => tiposPermitidos.has(d.tipo))
    );
    const specNasMaquinas = calcSpecNasMaquinas(machines);
    const estoqueMap      = calcSaldoEstoque(logs, movimentos, orders);

    // Alertas de troca: specs com saldo ≤ 1 turno (threshold = totalFitas × 2.5)
    const alertasTroca = Object.entries(specNasMaquinas)
        .filter(([k, spec]) => {
            const s = saldoPorSpec[k];
            if (!s || s.saldo <= 0) return false;
            return s.saldo <= spec.totalFitas * RL_POR_FITA_POR_TURNO;
        })
        .map(([k, spec]) => {
            const s = saldoPorSpec[k];
            return { key: k, ...spec, saldo: s.saldo, sugestao: calcSugestao(spec.medida, spec.tipo, spec.cor, saldoPorSpec, specNasMaquinas, estoqueMap) };
        });

    // Full analysis per spec
    const analise = Object.entries(saldoPorSpec).map(([k, demanda]) => {
        const spec = specNasMaquinas[k];
        const totalFitas = spec?.totalFitas || 0;
        const machineList = spec?.machineList || [];
        const rlPorDia = totalFitas * RL_POR_FITA_POR_TURNO * TURNOS_POR_DIA;
        const concluido = demanda.saldo <= 0;
        const estoqueDisp = estoqueMap[k] || 0;
        const saldoEfetivo = Math.max(0, demanda.saldo - estoqueDisp);
        const cobertoPorEstoque = !concluido && saldoEfetivo === 0;
        const semFitas = totalFitas === 0 && !cobertoPorEstoque;
        const diasNecessarios = (!semFitas && !cobertoPorEstoque && saldoEfetivo > 0) ? Math.ceil(saldoEfetivo / rlPorDia) : 0;
        const dataConclusao = (!semFitas && !cobertoPorEstoque && saldoEfetivo > 0) ? addWorkdays(today, diasNecessarios) : (!concluido && estoqueDisp >= demanda.saldo) ? today : null;
        const finalizing = !semFitas && !concluido && !cobertoPorEstoque && saldoEfetivo <= totalFitas * RL_POR_FITA_POR_TURNO;
        return { key: k, ...demanda, totalFitas, machineList, semFitas, cobertoPorEstoque, rlPorDia, diasNecessarios, dataConclusao, finalizing, concluido, estoqueDisp, saldoEfetivo };
    }).sort((a, b) => {
        if (a.semFitas !== b.semFitas) return a.semFitas ? -1 : 1;
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
        if (a.finalizing !== b.finalizing) return a.finalizing ? -1 : 1;
        return (a.dataConclusao || "9999").localeCompare(b.dataConclusao || "9999");
    });

    const semFitasCount = analise.filter(a => a.semFitas && !a.concluido).length;
    const finalizando   = analise.filter(a => a.finalizing).length;

    const filtrado = analise.filter(a => {
        if (filtro === "semfitas")   { if (!a.semFitas || a.concluido) return false; }
        else if (filtro === "finalizando") { if (!a.finalizing) return false; }
        else if (filtro === "ok")    { if (a.semFitas || a.finalizing || a.concluido) return false; }
        if (filtroTipo   && a.tipo   !== filtroTipo)   return false;
        if (filtroMedida && a.medida !== filtroMedida) return false;
        if (filtroCor    && !(a.cor || "").toLowerCase().includes(filtroCor.toLowerCase())) return false;
        return true;
    });

    const confirmarTroca = ({ cor, medida, tipo, novaCor }) => {
        onSwapFita({ cor, medida, tipo, novaCor });
        setModalSwap(null);
    };

    return (
        <div style={{ padding: isMobile ? "16px 12px 40px" : "24px" }}>
            {modalSwap && (
                <ModalTroca
                    swap={modalSwap}
                    saldoPorSpec={saldoPorSpec}
                    estoqueMap={estoqueMap}
                    onConfirmar={confirmarTroca}
                    onCancelar={() => setModalSwap(null)}
                />
            )}

            {/* Header */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>Planejamento</h2>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9CA3AF" }}>2,5 RL/fita/turno · {TURNOS_POR_DIA} turnos/dia</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 10, padding: 3, gap: 2 }}>
                    {[{ id: "maquinas", label: "Por Máquina" }, { id: "specs", label: "Por Spec" }].map(v => (
                        <button key={v.id} onClick={() => setView(v.id)} style={{
                            padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", cursor: "pointer",
                            background: view === v.id ? "#fff" : "transparent",
                            color: view === v.id ? "#F97316" : "#6B7280",
                            boxShadow: view === v.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                            transition: "all 0.15s",
                        }}>{v.label}</button>
                    ))}
                </div>
                </div>
            </div>

            {/* Stats */}
            {(() => {
                const totalRL = Math.round(analise.reduce((a, b) => a + b.saldo, 0));
                const coresAtivas = analise.filter(a => !a.concluido).length;
                return (
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 12, marginBottom: 24 }}>
                        <StatCard
                            label="Cores ativas"
                            value={coresAtivas}
                            color="#2563EB"
                            bg="#EFF6FF"
                            icon="🎨"
                            sub={`${analise.filter(a => a.concluido).length} concluídas`}
                        />
                        <StatCard
                            label="Sem fita"
                            value={semFitasCount}
                            color={semFitasCount > 0 ? "#DC2626" : "#16A34A"}
                            bg={semFitasCount > 0 ? "#FEF2F2" : "#F0FDF4"}
                            icon={semFitasCount > 0 ? "⚠" : "✓"}
                            sub={semFitasCount > 0 ? "requer atenção" : "tudo configurado"}
                        />
                        <StatCard
                            label="Finalizando"
                            value={finalizando}
                            color={finalizando > 0 ? "#D97706" : "#6B7280"}
                            bg={finalizando > 0 ? "#FFFBEB" : "#F9FAFB"}
                            icon="⏳"
                            sub={finalizando > 0 ? "trocar em breve" : "nenhuma"}
                        />
                        <StatCard
                            label="RL pendente"
                            value={totalRL.toLocaleString("pt-BR")}
                            color="#7C3AED"
                            bg="#F5F3FF"
                            icon="📦"
                            sub={`~${Math.round(totalRL / (RL_POR_FITA_POR_TURNO * TURNOS_POR_DIA * machines.filter(m => normalize(m.fitas).length > 0).reduce((a, m) => a + normalize(m.fitas).reduce((s, f) => s + (f.qtd || 1), 0), 0) || 1)).toLocaleString("pt-BR")} dias úteis`}
                        />
                    </div>
                );
            })()}

            {/* View por máquina */}
            {view === "maquinas" && (
                <MaquinaView
                    machines={machines}
                    saldoPorSpec={saldoPorSpec}
                    specNasMaquinas={specNasMaquinas}
                    estoqueMap={estoqueMap}
                    podeEditar={podeEditar}
                />
            )}

            {view === "specs" && <>
            {/* Swap alerts */}
            {alertasTroca.length > 0 && (
                <div style={{ marginBottom: 24, borderRadius: 12, overflow: "hidden", border: "1px solid #FDE68A" }}>
                    <div style={{ padding: "12px 16px", background: "#FFFBEB", borderBottom: "1px solid #FDE68A", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>↻</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#92400E" }}>Trocas Sugeridas</div>
                            <div style={{ fontSize: 12, color: "#B45309" }}>{alertasTroca.length} cor{alertasTroca.length !== 1 ? "es" : ""} finalizando na próxima produção</div>
                        </div>
                    </div>
                    {alertasTroca.map((a, i) => (
                        <SwapAlertCard
                            key={a.key}
                            item={a}
                            isLast={i === alertasTroca.length - 1}
                            onAbrir={() => setModalSwap(a)}
                            isMobile={isMobile}
                            podeEditar={podeEditar}
                        />
                    ))}
                </div>
            )}

            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
                {/* Status pills */}
                <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
                    {[
                        { id: "todos",       label: "Todos",    count: analise.filter(a => !a.concluido).length, dot: null },
                        { id: "semfitas",    label: "Sem fita", count: semFitasCount,  dot: "#DC2626" },
                        { id: "finalizando", label: "Trocando", count: finalizando,    dot: "#D97706" },
                        { id: "ok",          label: "OK",       count: analise.filter(a => !a.semFitas && !a.finalizing && !a.concluido).length, dot: "#16A34A" },
                    ].map(f => (
                        <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                            background: filtro === f.id ? "#fff" : "transparent",
                            color: filtro === f.id ? "#111827" : "#6B7280",
                            fontWeight: filtro === f.id ? 700 : 500,
                            fontSize: 13, whiteSpace: "nowrap",
                            boxShadow: filtro === f.id ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                            transition: "all 0.15s",
                        }}>
                            {f.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: f.dot, flexShrink: 0, display: "inline-block" }} />}
                            {f.label}
                            {f.count > 0 && (
                                <span style={{
                                    fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "1px 6px",
                                    background: filtro === f.id ? (f.dot || "#F97316") : "#ECEDF1",
                                    color: filtro === f.id ? "#fff" : "#6B7280",
                                }}>{f.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tipo + Medida */}
                <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setFiltroMedida(""); setFiltroCor(""); }} style={{
                    padding: "7px 10px", borderRadius: 8, border: `1px solid ${filtroTipo ? "#F97316" : "#ECEDF1"}`,
                    background: "#fff", color: filtroTipo ? "#F97316" : "#6B7280",
                    fontWeight: filtroTipo ? 700 : 400, fontSize: 13, cursor: "pointer", outline: "none",
                }}>
                    <option value="">Tipo</option>
                    {[...tiposPermitidos].map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select value={filtroMedida} onChange={e => { setFiltroMedida(e.target.value); setFiltroCor(""); }} style={{
                    padding: "7px 10px", borderRadius: 8, border: `1px solid ${filtroMedida ? "#F97316" : "#ECEDF1"}`,
                    background: "#fff", color: filtroMedida ? "#F97316" : "#6B7280",
                    fontWeight: filtroMedida ? 700 : 400, fontSize: 13, cursor: "pointer", outline: "none",
                }}>
                    <option value="">Medida</option>
                    {[...new Set(analise.filter(a => !filtroTipo || a.tipo === filtroTipo).map(a => a.medida))]
                        .sort((a, b) => parseFloat(a) - parseFloat(b))
                        .map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                {/* Busca por cor */}
                <input
                    type="text"
                    placeholder="Buscar cor..."
                    value={filtroCor}
                    onChange={e => setFiltroCor(e.target.value)}
                    style={{
                        padding: "7px 12px", borderRadius: 8, border: `1px solid ${filtroCor ? "#F97316" : "#ECEDF1"}`,
                        background: "#fff", color: "#111827", fontSize: 13, outline: "none",
                        width: 140, fontWeight: filtroCor ? 600 : 400,
                    }}
                />

                {/* Limpar */}
                {(filtroTipo || filtroMedida || filtroCor || filtro !== "todos") && (
                    <button onClick={() => { setFiltro("todos"); setFiltroTipo(""); setFiltroMedida(""); setFiltroCor(""); }} style={{
                        padding: "7px 12px", borderRadius: 8, border: "1px solid #ECEDF1",
                        background: "#fff", color: "#9CA3AF", fontSize: 12, cursor: "pointer", fontWeight: 600,
                    }}>✕ Limpar</button>
                )}

                <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>
                    {filtrado.length} resultado{filtrado.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Lista compacta */}
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                {/* Cabeçalho */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 10px 19px", background: "#F9FAFB", borderBottom: "1px solid #ECEDF1" }}>
                    <div style={{ flex: "0 0 160px", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em" }}>COR / MEDIDA</div>
                    <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em" }}>PROGRESSO</div>
                    <div style={{ flex: "0 0 90px", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textAlign: "right" }}>PENDENTE</div>
                    <div style={{ flex: "0 0 100px", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textAlign: "right" }}>TERMINA</div>
                    <div style={{ flex: "0 0 80px", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textAlign: "right" }}>STATUS</div>
                    <div style={{ width: 16 }} />
                </div>
                {filtrado.length === 0 && (
                    <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                        Nenhum item encontrado.
                    </div>
                )}
                {filtrado.map((a, i) => <SpecCard key={a.key} item={a} isLast={i === filtrado.length - 1} />)}
            </div>
            </>}
        </div>
    );
}

