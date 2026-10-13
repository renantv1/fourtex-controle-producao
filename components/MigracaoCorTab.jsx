import { useState, useMemo } from "react";
import { ref, update } from "firebase/database";
import { db } from "../firebase";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorSelect } from "../utils/CorSelect";

const catalogNames  = new Set(COR_CATALOG_SORTED.map(c => c.nome));
const catalogByLower = new Map(COR_CATALOG_SORTED.map(c => [c.nome.toLowerCase(), c.nome]));

/** Classifica uma cor: "ok" | "autofix" | "nomatch" */
function classificar(cor) {
    if (!cor || cor.trim() === "") return "vazio";
    const v = cor.trim();
    if (catalogNames.has(v))                          return "ok";
    if (catalogByLower.has(v.toLowerCase()))          return "autofix";
    return "nomatch";
}

/** Coleta todos os registros de cor nos pedidos + logs */
function coletar(orders, logs) {
    // Map: cor_original → { classe, canonical?, ocorrencias: [{label, fbPath}] }
    const mapa = new Map();

    const adicionar = (cor, label, fbPath) => {
        const v     = (cor || "").trim();
        if (!v) return;
        const classe    = classificar(v);
        if (classe === "ok") return; // já correto, ignora
        const canonical = classe === "autofix" ? catalogByLower.get(v.toLowerCase()) : null;
        if (!mapa.has(v)) mapa.set(v, { original: v, classe, canonical, ocorrencias: [] });
        mapa.get(v).ocorrencias.push({ label, fbPath });
    };

    // Pedidos
    orders.forEach(order => {
        const itensEntradas = Array.isArray(order.itens)
            ? order.itens.map((it, i) => [String(i), it])
            : Object.entries(order.itens || {});
        itensEntradas.forEach(([key, item]) => {
            const label = `Pedido #${order.numero} — ${item.tipo || ""} ${item.medida || ""}`.trim();
            adicionar(item.cor, label, `orders/${order.id}/itens/${key}/cor`);
        });
    });

    // Logs
    logs.forEach(log => {
        if (!log.firebaseKey) return;
        const label = `Log ${log.timestamp || ""} — ${log.tipo || ""} ${log.medida || ""}`.trim();
        adicionar(log.cor, label, `logs/${log.firebaseKey}/cor`);
    });

    return mapa;
}

const inputStyle = {
    fontSize: 12, padding: "4px 8px", border: "1px solid #D1D5DB",
    borderRadius: 6, background: "#fff", color: "#111827", cursor: "pointer",
    minWidth: 200,
};

const cardStyle = {
    border: "1px solid #ECEDF1", borderRadius: 10, background: "#fff",
    marginBottom: 8, overflow: "hidden",
};

const sectionStyle = {
    background: "#F9FAFB", borderRadius: 10, padding: "16px 20px", marginBottom: 16,
};

export default function MigracaoCorTab({ orders, logs }) {
    const mapa      = useMemo(() => coletar(orders, logs), [orders, logs]);

    // mapeamento manual: cor_original → nome_catalogo escolhido pelo usuário
    const [mapeamento, setMapeamento] = useState({});
    const [status,     setStatus]     = useState("idle"); // idle | running | done
    const [resultado,  setResultado]  = useState(null);
    const [expandidos, setExpandidos] = useState({});

    const autoFix  = [...mapa.values()].filter(v => v.classe === "autofix");
    const noMatch  = [...mapa.values()].filter(v => v.classe === "nomatch");

    const totalOcorrencias = (arr) => arr.reduce((s, v) => s + v.ocorrencias.length, 0);

    const toggleExpand = (key) => setExpandidos(p => ({ ...p, [key]: !p[key] }));

    const podaAplicar = autoFix.length > 0 || noMatch.some(v => mapeamento[v.original]);

    const aplicar = async () => {
        setStatus("running");
        const updates = {};

        // Auto-fix: aplica o canonical diretamente
        autoFix.forEach(v => {
            v.ocorrencias.forEach(oc => { updates[oc.fbPath] = v.canonical; });
        });

        // Manual: aplica o que o usuário escolheu
        noMatch.forEach(v => {
            const escolhido = mapeamento[v.original];
            if (!escolhido) return;
            v.ocorrencias.forEach(oc => { updates[oc.fbPath] = escolhido; });
        });

        try {
            await update(ref(db, "/"), updates);
            setResultado({ aplicados: Object.keys(updates).length });
            setStatus("done");
        } catch (e) {
            console.error(e);
            setResultado({ erro: String(e) });
            setStatus("idle");
        }
    };

    if (status === "done") {
        return (
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 0" }}>
                <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "28px 32px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#15803D", marginBottom: 6 }}>Migração concluída!</div>
                    <div style={{ fontSize: 14, color: "#166534" }}>
                        {resultado?.aplicados} campo(s) atualizado(s) no Firebase.
                    </div>
                    <button onClick={() => { setStatus("idle"); setResultado(null); setMapeamento({}); }}
                        style={{ marginTop: 20, padding: "8px 20px", borderRadius: 8, border: "1px solid #86EFAC", background: "#fff", color: "#15803D", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Ver novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Migração de Cores</h2>
                <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    Corrige nomes de cores nos pedidos e lançamentos para que coincidam exatamente com o catálogo.
                </p>
            </div>

            {/* Resumo */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <StatCard label="Auto-corrigíveis" value={totalOcorrencias(autoFix)} sub={`${autoFix.length} cor(es)`} color="#3B82F6" />
                <StatCard label="Sem correspondência" value={totalOcorrencias(noMatch)} sub={`${noMatch.length} cor(es)`} color="#F97316" />
                <StatCard label="Total de alterações" value={totalOcorrencias(autoFix) + noMatch.filter(v => mapeamento[v.original]).reduce((s, v) => s + v.ocorrencias.length, 0)} sub="campos a atualizar" color="#8B5CF6" />
            </div>

            {/* Nada para corrigir */}
            {autoFix.length === 0 && noMatch.length === 0 && (
                <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "20px 24px", color: "#15803D", fontSize: 14 }}>
                    Todas as cores já estão corretas no catálogo.
                </div>
            )}

            {/* Seção 1: Auto-corrigíveis */}
            {autoFix.length > 0 && (
                <div style={sectionStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3B82F6" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>Auto-corrigíveis</span>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>— diferença de maiúsculas/acentos, corrigido automaticamente</span>
                    </div>
                    {autoFix.map(v => (
                        <div key={v.original} style={cardStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: 13, color: "#DC2626", fontFamily: "monospace", background: "#FEF2F2", padding: "2px 8px", borderRadius: 4 }}>{v.original}</span>
                                <span style={{ fontSize: 12, color: "#9CA3AF" }}>→</span>
                                <span style={{ fontSize: 13, color: "#15803D", fontFamily: "monospace", background: "#F0FDF4", padding: "2px 8px", borderRadius: 4 }}>{v.canonical}</span>
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#6B7280" }}>{v.ocorrencias.length} ocorrência(s)</span>
                                <button onClick={() => toggleExpand(v.original)}
                                    style={{ fontSize: 11, color: "#3B82F6", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                                    {expandidos[v.original] ? "▲ ocultar" : "▼ ver onde"}
                                </button>
                            </div>
                            {expandidos[v.original] && (
                                <div style={{ borderTop: "1px solid #F3F4F6", padding: "8px 14px", background: "#FAFAFA" }}>
                                    {v.ocorrencias.map((oc, i) => (
                                        <div key={i} style={{ fontSize: 12, color: "#6B7280", padding: "2px 0" }}>• {oc.label}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Seção 2: Sem correspondência */}
            {noMatch.length > 0 && (
                <div style={sectionStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F97316" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#C2410C" }}>Sem correspondência</span>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>— selecione a cor correta do catálogo</span>
                    </div>
                    {noMatch.map(v => (
                        <div key={v.original} style={cardStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: 13, color: "#DC2626", fontFamily: "monospace", background: "#FEF2F2", padding: "2px 8px", borderRadius: 4 }}>{v.original}</span>
                                <span style={{ fontSize: 12, color: "#9CA3AF" }}>→</span>
                                <CorSelect
                                    value={mapeamento[v.original] || ""}
                                    onChange={e => setMapeamento(p => ({ ...p, [v.original]: e.target.value }))}
                                    options={COR_CATALOG_SORTED}
                                    placeholder="— escolha uma cor —"
                                    style={inputStyle}
                                />
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#6B7280" }}>{v.ocorrencias.length} ocorrência(s)</span>
                                <button onClick={() => toggleExpand(v.original)}
                                    style={{ fontSize: 11, color: "#F97316", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                                    {expandidos[v.original] ? "▲ ocultar" : "▼ ver onde"}
                                </button>
                            </div>
                            {expandidos[v.original] && (
                                <div style={{ borderTop: "1px solid #F3F4F6", padding: "8px 14px", background: "#FAFAFA" }}>
                                    {v.ocorrencias.map((oc, i) => (
                                        <div key={i} style={{ fontSize: 12, color: "#6B7280", padding: "2px 0" }}>• {oc.label}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Botão aplicar */}
            {(autoFix.length > 0 || noMatch.length > 0) && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 8 }}>
                    {noMatch.some(v => !mapeamento[v.original]) && (
                        <span style={{ fontSize: 12, color: "#F97316", alignSelf: "center" }}>
                            {noMatch.filter(v => !mapeamento[v.original]).length} cor(es) sem mapeamento serão ignoradas.
                        </span>
                    )}
                    <button
                        onClick={aplicar}
                        disabled={!podaAplicar || status === "running"}
                        style={{
                            padding: "10px 28px", borderRadius: 8, border: "none",
                            background: podaAplicar ? "#111827" : "#ECEDF1",
                            color: podaAplicar ? "#fff" : "#9CA3AF",
                            fontSize: 14, fontWeight: 600,
                            cursor: podaAplicar ? "pointer" : "not-allowed",
                        }}
                    >
                        {status === "running" ? "Aplicando..." : "Aplicar correções"}
                    </button>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, sub, color }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 10, padding: "14px 20px", minWidth: 150, flex: 1 }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.2, marginTop: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{sub}</div>
        </div>
    );
}
