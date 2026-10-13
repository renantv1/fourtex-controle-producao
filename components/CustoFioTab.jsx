import { useState, useEffect, useMemo } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "../firebase";
import { COR_CATALOG_SORTED } from "../utils/corCatalog";
import { CorInline } from "../utils/CorDot";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
// Preço por cor é salvo pelo código (nomes como "Amarelo B. Brasil" têm ponto, inválido em chave do Firebase)
const CODIGO_POR_NOME = Object.fromEntries(COR_CATALOG_SORTED.map(c => [c.nome, c.codigo]));
const NOME_POR_CODIGO = Object.fromEntries(COR_CATALOG_SORTED.map(c => [c.codigo, c.nome]));
// Tabela de custo separada em Preto, Branco e Cores — as cores por medida (22mm, 25mm, 30mm...), cada uma com a própria média
const GRUPO_DA_COR = (cor, medida) => cor === "Preto" || cor === "Branco" ? cor : `Cores ${medida}`;
const ordemGrupo = (g) => g === "Preto" ? -2 : g === "Branco" ? -1 : parseFloat(g.replace("Cores ", "")) || 999;
// Busca sem acento e sem maiúscula
const normalizar = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const parsePreco = (s) => {
    const n = parseFloat(String(s ?? "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
};
const parseTs = (ts) => {
    const m = String(ts || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`) : null;
};
const fmtBRL = (v) => "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg  = (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN   = (v) => Number(v).toLocaleString("pt-BR");
const fmtPrecoInput = (v) => v ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";

export default function CustoFioTab({ logs = [], podeEditar = true }) {
    const isMobile = useIsMobile();
    const hoje = new Date();
    const [ano, setAno] = useState(hoje.getFullYear());
    const [mes, setMes] = useState(hoje.getMonth());

    // Preço salvo no Firebase — compartilhado entre todos os usuários
    const [porCor, setPorCor]         = useState({}); // { codigo: R$/kg }
    const [busca, setBusca]           = useState("");
    const casaBusca = (texto) => !busca.trim() || normalizar(texto).includes(normalizar(busca.trim()));
    const [precosAbertos, setPrecosAbertos] = useState(false);
    const [edicao, setEdicao]         = useState({}); // { codigo: texto digitado } — só o que ainda não foi salvo
    useEffect(() => onValue(ref(db, "precoFio/porCor"), snap => setPorCor(snap.val() || {})), []);

    // Preço cadastrado para a cor (0 = sem preço)
    const precoDaCor = (cor) => Number(porCor[CODIGO_POR_NOME[cor]]) || 0;

    // Planilha de preços: todas as cores do catálogo, editadas na célula e salvas juntas
    const valorCelula = (codigo) => edicao[codigo] ?? fmtPrecoInput(Number(porCor[codigo]) || 0);
    const alterados = Object.keys(edicao).filter(codigo => parsePreco(edicao[codigo]) !== (Number(porCor[codigo]) || 0));
    const salvarPrecos = async () => {
        if (alterados.length === 0) return;
        // Célula vazia/zero remove o preço da cor
        const novos = Object.fromEntries(alterados.map(codigo => { const v = parsePreco(edicao[codigo]); return [codigo, v > 0 ? v : null]; }));
        try { await update(ref(db, "precoFio/porCor"), novos); setEdicao({}); }
        catch { alert("Erro ao salvar os preços."); }
    };
    const coresComPreco = Object.entries(porCor)
        .filter(([, v]) => Number(v) > 0)
        .map(([codigo, v]) => ({ codigo, nome: NOME_POR_CODIGO[codigo] || codigo, valor: Number(v) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const navMes = (d) => {
        const n = new Date(ano, mes + d, 1);
        setAno(n.getFullYear()); setMes(n.getMonth());
    };

    // Gorgurão do mês, agrupado em Preto / Branco / Cores → cor + medida (logs com estimado=true vêm de utils/logsRecuperados)
    const { grupos, total } = useMemo(() => {
        const map = {};
        const somar = (medida, cor, rl, kg, estimado) => {
            const grupo = GRUPO_DA_COR(cor, medida);
            const k = `${cor}|${medida}`;
            if (!map[grupo]) map[grupo] = {};
            if (!map[grupo][k]) map[grupo][k] = { k, cor, medida, rl: 0, kg: 0, estimado: false };
            map[grupo][k].rl += rl;
            map[grupo][k].kg += kg;
            if (estimado) map[grupo][k].estimado = true;
        };
        logs.forEach(l => {
            if (l.tipo !== "Gorgurão") return;
            const d = parseTs(l.timestamp);
            if (!d || d.getFullYear() !== ano || d.getMonth() !== mes) return;
            if (!casaBusca(`${l.cor} ${l.medida} ${GRUPO_DA_COR(l.cor, l.medida)}`)) return;
            somar(l.medida || "—", l.cor || "—", Number(l.qtd) || 0, Number(l.peso) || 0, !!l.estimado);
        });
        const tot = { rl: 0, kg: 0, custo: 0 };
        const grupos = Object.keys(map).sort((a, b) => ordemGrupo(a) - ordemGrupo(b)).map(grupo => {
            const itens = Object.values(map[grupo])
                .map(v => { const p = precoDaCor(v.cor); return { ...v, custo: v.kg * p, semPreco: p <= 0 }; })
                .sort((a, b) => a.cor.localeCompare(b.cor, "pt-BR") || parseFloat(a.medida) - parseFloat(b.medida));
            const sub = itens.reduce((s, v) => ({ rl: s.rl + v.rl, kg: s.kg + v.kg, custo: s.custo + v.custo }), { rl: 0, kg: 0, custo: 0 });
            tot.rl += sub.rl; tot.kg += sub.kg; tot.custo += sub.custo;
            return { grupo, itens, ...sub };
        });
        return { grupos, total: tot };
    }, [logs, ano, mes, porCor, busca]);
    const coresGrade = COR_CATALOG_SORTED.filter(c => casaBusca(`${c.nome} ${c.codigo}`));

    const temPreco = coresComPreco.length > 0;
    const temEstimado = grupos.some(m => m.itens.some(v => v.estimado));
    const est = (v) => v.estimado ? "≈ " : "";
    const semPrecoNoMes = [...new Set(grupos.flatMap(m => m.itens.filter(v => v.semPreco).map(v => v.cor)))];
    const custoRL  = (custo, rl) => temPreco && rl > 0 ? fmtBRL(custo / rl) : "—";
    const custoTot = (custo) => temPreco ? fmtBRL(custo) : "—";

    const handlePrint = () => {
        const linhas = grupos.map(m =>
            `<tr class="grp"><td colspan="7"><strong>${m.grupo}</strong></td></tr>`
            + m.itens.map(v => `<tr><td></td><td>${v.cor} ${v.medida}</td><td class="r">${fmtN(v.rl)}</td><td class="r">${est(v)}${fmtKg(v.kg)} kg</td><td class="r">${v.rl > 0 ? (v.kg / v.rl).toFixed(3) : "—"}</td><td class="r">${v.semPreco ? "sem preço" : custoRL(v.custo, v.rl)}</td><td class="r">${v.semPreco ? "—" : custoTot(v.custo)}</td></tr>`).join("")
            + `<tr class="sub"><td colspan="2"><strong>Subtotal ${m.grupo}</strong></td><td class="r">${fmtN(m.rl)}</td><td class="r">${fmtKg(m.kg)} kg</td><td class="r">${m.rl > 0 ? (m.kg / m.rl).toFixed(3) : "—"}</td><td class="r">${custoRL(m.custo, m.rl)}</td><td class="r">${custoTot(m.custo)}</td></tr>`
        ).join("");
        const w = window.open("", "_blank", "width=900,height=700");
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Custo de Fio — ${MESES[mes]} ${ano}</title>
        <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px}
        h1{font-size:18px}.sub-t{color:#6B7280;margin:4px 0 14px}table{width:100%;border-collapse:collapse}
        th{background:#111827;color:#fff;font-size:10px;text-align:left;padding:7px 8px}td{padding:6px 8px;border-bottom:1px solid #ECEDF1}
        .r{text-align:right}tr.sub td{background:#FFF7ED;font-weight:700;border-bottom:2px solid #FED7AA}tr.grp td{color:#EA580C;background:#FFF7ED}tr.tot td{background:#111827;color:#fff;font-weight:800}
        .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.card{border:1px solid #ECEDF1;border-radius:8px;padding:8px 10px}.lbl{font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:.05em}.val{font-size:15px;font-weight:800;margin-top:2px}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
        <h1>Custo de Fio — Gorgurão · ${MESES[mes]} ${ano}</h1>
        <div class="sub-t">${semPrecoNoMes.length ? `Sem preço (fora do custo): ${semPrecoNoMes.join(", ")}` : ""}</div>
        <div class="cards">${cards.map(c => `<div class="card"><div class="lbl">${c.label}</div><div class="val" style="color:${c.color}">${c.value}</div></div>`).join("")}</div>
        <table><thead><tr><th>Grupo</th><th>Cor</th><th class="r">RL</th><th class="r">Peso</th><th class="r">kg/RL</th><th class="r">Custo/RL</th><th class="r">Custo total</th></tr></thead><tbody>
        ${linhas}
        <tr class="tot"><td colspan="2">TOTAL</td><td class="r">${fmtN(total.rl)}</td><td class="r">${fmtKg(total.kg)} kg</td><td class="r">${total.rl > 0 ? (total.kg / total.rl).toFixed(3) : "—"}</td><td class="r">${custoRL(total.custo, total.rl)}</td><td class="r">${custoTot(total.custo)}</td></tr>
        </tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
        w.document.close();
    };

    const grid = "150px 80px 100px 70px 95px 115px";
    const th = { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", whiteSpace: "nowrap", textAlign: "right" };
    const cell = { padding: "6px 10px", fontSize: 12, whiteSpace: "nowrap", textAlign: "right" };

    const cards = [
        { label: "CUSTO TOTAL",     value: custoTot(total.custo),        color: "#16A34A" },
        { label: "CUSTO MÉDIO/RL",  value: custoRL(total.custo, total.rl), color: "#16A34A" },
        { label: "ROLOS",           value: `${fmtN(total.rl)} RL`,       color: "#F97316" },
        { label: "PESO",            value: `${fmtKg(total.kg)} kg`,      color: "#0369A1" },
    ];

    return (
        <div style={{ padding: isMobile ? "16px 12px" : 24, maxWidth: 820, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Custo de Fio</h2>
                    <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                        Custo por rolo do Gorgurão: peso médio por rolo × preço do fio da cor.
                    </p>
                </div>
                {grupos.length > 0 && (
                    <button onClick={handlePrint} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#0369A1", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                        🖨 Imprimir
                    </button>
                )}
            </div>

            {/* Pesquisa — filtra a planilha de preços, os cards e a tabela */}
            <div style={{ position: "relative", marginBottom: 16 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF", pointerEvents: "none" }}>🔍</span>
                <input type="text" placeholder="Pesquisar cor ou medida (ex.: marfim, 25mm, cores)" value={busca} onChange={e => setBusca(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 36px", borderRadius: 10, border: "1px solid #ECEDF1", background: "#fff", fontSize: 13, outline: "none" }} />
                {busca && (
                    <button onClick={() => setBusca("")} title="Limpar" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 16 }}>×</button>
                )}
            </div>

            {/* Preço por cor — planilha */}
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: precosAbertos ? 10 : 0, minHeight: 32 }}>
                    <div onClick={() => setPrecosAbertos(a => !a)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", flex: 1 }}>
                        <span style={{ fontSize: 11, color: "#6B7280", display: "inline-block", transition: "transform .15s", transform: precosAbertos ? "rotate(90deg)" : "none" }}>▶</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.04em" }}>PREÇO POR COR (R$/KG)</span>
                        {!precosAbertos && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{coresComPreco.length} cores com preço · clique para abrir</span>}
                    </div>
                    {podeEditar && (precosAbertos || alterados.length > 0) && (
                        <button onClick={salvarPrecos} disabled={alterados.length === 0}
                            style={{ padding: "7px 18px", borderRadius: 7, border: "none", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
                                background: alterados.length ? "#0891B2" : "#ECEDF1", color: alterados.length ? "#fff" : "#9CA3AF",
                                cursor: alterados.length ? "pointer" : "not-allowed" }}>
                            {alterados.length ? `Salvar (${alterados.length})` : "Salvo ✓"}
                        </button>
                    )}
                </div>
                {precosAbertos && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                    // Ordem alfabética de cima para baixo em cada coluna
                    ...(isMobile ? {} : { gridTemplateRows: `repeat(${Math.ceil(coresGrade.length / 3)}, auto)`, gridAutoFlow: "column" }),
                    border: "1px solid #D1D5DB", borderRadius: 6, overflow: "hidden" }}>
                    {coresGrade.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "#9CA3AF" }}>Nenhuma cor encontrada.</div>}
                    {coresGrade.map(c => {
                        const mudou = alterados.includes(c.codigo);
                        return (
                            <div key={c.codigo} style={{ display: "grid", gridTemplateColumns: "1fr 58px", borderRight: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB", marginRight: -1, marginBottom: -1 }}>
                                <span style={{ display: "flex", alignItems: "center", padding: "5px 0 5px 8px", fontSize: 12, color: "#374151", whiteSpace: "nowrap", overflow: "hidden" }}>
                                    <CorInline cor={c.nome} />{c.nome}
                                    {/* Linha pontilhada ligando a cor ao preço */}
                                    <span style={{ flex: 1, minWidth: 12, margin: "0 0 3px 6px", alignSelf: "flex-end", borderBottom: "2px dotted #CBD5E1" }} />
                                </span>
                                <input type="text" inputMode="decimal" placeholder="—" disabled={!podeEditar}
                                    value={valorCelula(c.codigo)}
                                    onChange={e => setEdicao(p => ({ ...p, [c.codigo]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === "Enter") salvarPrecos(); }}
                                    style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px 5px 3px", border: "none", outline: "none", fontSize: 13, fontWeight: 700, textAlign: "right",
                                        color: "#16A34A", background: mudou ? "#FEF9C3" : "#fff" }} />
                            </div>
                        );
                    })}
                </div>
                )}
            </div>

            {/* Mês */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
                <button onClick={() => navMes(-1)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", cursor: "pointer", fontSize: 13 }}>‹</button>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", minWidth: 150, textAlign: "center" }}>{MESES[mes]} {ano}</div>
                <button onClick={() => navMes(1)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #ECEDF1", background: "#fff", cursor: "pointer", fontSize: 13 }}>›</button>
            </div>

            {/* Cards */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                {cards.map(c => (
                    <div key={c.label} style={{ background: "#fff", border: "1px solid #ECEDF1", borderLeft: `3px solid ${c.color}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {semPrecoNoMes.length > 0 && (
                <div style={{ fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                    Cores sem preço cadastrado (ficam fora do custo): <strong>{semPrecoNoMes.join(", ")}</strong>
                </div>
            )}

            {/* Tabela medida → cor */}
            {grupos.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "#9CA3AF", fontSize: 13, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12 }}>
                    Nenhum apontamento de Gorgurão{busca.trim() ? ` para "${busca.trim()}"` : ""} em {MESES[mes]} {ano}.
                </div>
            ) : (
                <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <div style={{ minWidth: 610 }}>
                            <div style={{ display: "grid", gridTemplateColumns: grid, background: "#111827" }}>
                                <span style={{ ...th, textAlign: "left" }}>COR / MEDIDA</span>
                                <span style={th}>ROLOS</span>
                                <span style={th}>PESO (KG)</span>
                                <span style={th}>KG/RL</span>
                                <span style={th}>CUSTO/RL</span>
                                <span style={th}>CUSTO TOTAL</span>
                            </div>
                            {grupos.map(m => (
                                <div key={m.grupo}>
                                    <div style={{ background: "#FFF7ED", borderBottom: "1px solid #FED7AA" }}>
                                        <span style={{ ...cell, display: "block", textAlign: "left", fontWeight: 800, color: "#EA580C" }}>{m.grupo}</span>
                                    </div>
                                    {m.itens.map((v, i) => (
                                        <div key={v.k} style={{ display: "grid", gridTemplateColumns: grid, background: i % 2 === 0 ? "#fff" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                                            <span style={{ ...cell, textAlign: "left", paddingLeft: 18, color: "#374151" }}><CorInline cor={v.cor} />{v.cor} <span style={{ color: "#9CA3AF", fontSize: 11 }}>{v.medida}</span></span>
                                            <span style={{ ...cell, fontWeight: 600, color: "#F97316" }}>{fmtN(v.rl)} RL</span>
                                            <span style={{ ...cell, fontSize: 11, color: "#9CA3AF" }} title={v.estimado ? "Peso estimado" : undefined}>{est(v)}{fmtKg(v.kg)} kg</span>
                                            <span style={{ ...cell, fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{v.rl > 0 ? (v.kg / v.rl).toFixed(3) : "—"}</span>
                                            {v.semPreco ? (
                                                <span style={{ ...cell, fontSize: 11, fontWeight: 600, color: "#D97706" }}>sem preço</span>
                                            ) : (
                                                <span style={{ ...cell, fontWeight: 700, color: "#16A34A" }}>{custoRL(v.custo, v.rl)}</span>
                                            )}
                                            <span style={{ ...cell, color: "#374151" }}>{v.semPreco ? "—" : custoTot(v.custo)}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "grid", gridTemplateColumns: grid, background: "#FFF7ED", borderTop: "1px solid #FED7AA", borderBottom: "2px solid #FED7AA" }}>
                                        <span style={{ ...cell, textAlign: "left", fontWeight: 800, color: "#EA580C" }}>Subtotal {m.grupo}</span>
                                        <span style={{ ...cell, fontWeight: 700, color: "#F97316" }}>{fmtN(m.rl)} RL</span>
                                        <span style={{ ...cell, fontSize: 11, color: "#9CA3AF" }}>{fmtKg(m.kg)} kg</span>
                                        <span style={{ ...cell, fontWeight: 800, color: "#EA580C" }}>{m.rl > 0 ? (m.kg / m.rl).toFixed(3) : "—"}</span>
                                        <span style={{ ...cell, fontWeight: 800, color: "#16A34A" }}>{custoRL(m.custo, m.rl)}</span>
                                        <span style={{ ...cell, fontWeight: 800, color: "#16A34A" }}>{custoTot(m.custo)}</span>
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: "grid", gridTemplateColumns: grid, background: "#111827" }}>
                                <span style={{ ...cell, textAlign: "left", fontWeight: 800, color: "#fff" }}>TOTAL</span>
                                <span style={{ ...cell, fontWeight: 800, color: "#FB923C" }}>{fmtN(total.rl)} RL</span>
                                <span style={{ ...cell, fontSize: 11, color: "#D1D5DB" }}>{fmtKg(total.kg)} kg</span>
                                <span style={{ ...cell, fontWeight: 800, color: "#fff" }}>{total.rl > 0 ? (total.kg / total.rl).toFixed(3) : "—"}</span>
                                <span style={{ ...cell, fontWeight: 800, color: "#4ADE80" }}>{custoRL(total.custo, total.rl)}</span>
                                <span style={{ ...cell, fontWeight: 800, color: "#4ADE80" }}>{custoTot(total.custo)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
