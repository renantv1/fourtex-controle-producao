import { useState } from "react";
import { APP_VERSION } from "../version";

const ROLE_ACCESS = {
    admin:             ["dashboard", "pedidos", "separacao", "maquinas", "producao", "estoque", "estoqueelastico", "historico", "metas", "historicofitas", "alertas", "planejamento", "planejamentoelastico", "clientes", "relatorios", "usuarios", "migracaocor", "etiquetas", "coleta", "elastico", "maquinaselastico", "historicoelestico", "relatorioselastico", "pesosforamedida", "tnt", "tntestoque", "cordoes", "estoquecordoes", "maquinascordoes", "producaocordoes", "producaovies", "viespedidos", "estoquefio", "custofio"],
    operador:          ["dashboard", "maquinas", "alertas", "producao", "planejamento", "historico", "etiquetas", "coleta"],
    apontador:         ["dashboard", "producao", "historico", "metas", "etiquetas", "pesosforamedida", "coleta"],
    pedidos:           ["dashboard", "pedidos", "separacao", "estoque", "clientes", "etiquetas", "coleta"],
    mecanico:          ["dashboard", "alertas", "pedidos", "estoque", "etiquetas", "coleta"],
    operadorElastico:  ["dashboard", "maquinaselastico", "alertas", "elastico", "planejamentoelastico"],
    apontadorElastico: ["dashboard", "elastico", "historicoelestico", "relatorioselastico"],
    tnt:               ["dashboard", "tnt", "tntestoque", "tntetiqueta"],
    cordoes:           ["dashboard", "cordoes", "estoquecordoes", "maquinascordoes", "producaocordoes"],
    vies:              ["dashboard", "producaovies", "viespedidos"],
};

const ROLE_LABEL = { admin: "Administrador", operador: "Operador", apontador: "Apontador", pedidos: "Pedidos", mecanico: "Mecânico", operadorElastico: "Op. Elástico", apontadorElastico: "Apt. Elástico", tnt: "TNT", cordoes: "Cordões", vies: "Viés" };

const PAINEL = { id: "dashboard", label: "Painel", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> };

// Seções fixas (sem colapso)
const SECOES = [
    {
        label: "OPERAÇÕES",
        items: [
            { id: "pedidos",      label: "Pedidos",     icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
            { id: "separacao",    label: "Separação",   icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
            { id: "etiquetas",    label: "Etiquetas",   icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
            { id: "coleta",       label: "Coleta / Mercadoria", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16V8z"/><path d="M3.27 6.96L12 12l8.73-5.04"/><path d="M12 22.08V12"/></svg> },        ],
    },
    {
        label: "GESTÃO",
        items: [
            { id: "clientes",     label: "Clientes",     icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
        ],
    },
    {
        label: "FÁBRICA",
        items: [
            { id: "alertas", label: "Manutenção", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg> },
        ],
    },
    {
        label: "ADMIN",
        items: [
            { id: "usuarios",    label: "Usuários",          icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
        ],
    },
];

// Grupos colapsáveis por produto
const GRUPOS_PRODUTO = [
    {
        key: "gorgurão",
        label: "Gorgurão",
        color: "#F97316",
        items: [
            { id: "producao",       label: "Apontamento",   icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
            { id: "estoque",        label: "Estoque",       icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
            { id: "metas",          label: "Metas",         icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
            { id: "maquinas",       label: "Máquinas",      icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg> },
            { id: "relatorios",     label: "Relatórios",    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
            { id: "custofio",       label: "Custo",         icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
            { id: "historico",      label: "Histórico",     icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            { id: "historicofitas", label: "Hist. Fitas",   icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h10"/></svg> },
            { id: "pesosforamedida", label: "Pesos fora da média", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
            { id: "planejamento",    label: <>Planejamento <span style={{ fontSize: 10, color: "#A78BFA", fontWeight: 800, verticalAlign: "middle" }}>✦IA</span></>,        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg> },
        ],
    },
    {
        key: "elástico",
        label: "Elástico",
        color: "#10B981",
        items: [
            { id: "elastico",           label: "Apontamento", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
            { id: "estoqueelastico",    label: "Estoque",     icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
            { id: "maquinaselastico",   label: "Máquinas",    icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg> },
            { id: "relatorioselastico", label: "Relatórios",  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
            { id: "historicoelestico",      label: "Histórico",     icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            { id: "planejamentoelastico",    label: "Planejamento",  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg> },
        ],
    },
    {
        key: "tnt",
        label: "TNT",
        color: "#06B6D4",
        items: [
            { id: "tnt",          label: "Pedidos TNT",  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg> },
            { id: "tntestoque",   label: "Estoque TNT",  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
        ],
    },
    {
        key: "cordoes",
        label: "Cordões",
        color: "#7C3AED",
        items: [
            { id: "producaocordoes",  label: "Apontamento", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
            { id: "cordoes",          label: "Pedidos",  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg> },
            { id: "estoquecordoes",   label: "Estoque",   icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
            { id: "maquinascordoes",  label: "Máquinas",  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg> },
        ],
    },
    {
        key: "vies",
        label: "Viés",
        color: "#DB2777",
        items: [
            { id: "producaovies",  label: "Apontamento", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
            { id: "viespedidos",   label: "Pedidos", icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg> },
        ],
    },
    {
        key: "fio",
        label: "Fio",
        color: "#0EA5E9",
        items: [
            { id: "estoquefio",  label: "Estoque",  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },        ],
    },
];

function NavBtn({ id, tab, setTab, icon, label, badge, badgeColor, badges, indent }) {
    const isActive = tab === id;
    return (
        <button
            onClick={() => setTab(id)}
            style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 10px", paddingLeft: indent ? 20 : 10,
                borderRadius: 8, border: "none",
                background: isActive ? "#1E293B" : "transparent",
                color: isActive ? "#fff" : "#9CA3AF",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13, cursor: "pointer", textAlign: "left",
                transition: "background 0.12s, color 0.12s",
                position: "relative",
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "#161B26"; e.currentTarget.style.color = "#D1D5DB"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9CA3AF"; } }}
        >
            {isActive && (
                <span style={{ position: "absolute", left: 0, top: "20%", height: "60%", width: 3, background: "#F97316", borderRadius: "0 3px 3px 0" }} />
            )}
            <span style={{ color: isActive ? "#F97316" : "#4B5563", display: "flex", flexShrink: 0, transition: "color 0.12s" }}>
                {icon}
            </span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            {badges && badges.length > 0 && (
                <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {badges.map((b, i) => (
                        <span key={i} style={{ background: b.color, color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                            {b.value}
                        </span>
                    ))}
                </span>
            )}
            {!badges && badge !== null && badge !== undefined && (
                <span style={{ background: badgeColor || "#F97316", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>
                    {badge}
                </span>
            )}
        </button>
    );
}

function CollapsibleGroup({ label, color, items, tab, setTab, allowed, defaultOpen, badges = {} }) {
    const visibleItems = items.filter(i => allowed.includes(i.id));
    const [open, setOpen] = useState(defaultOpen);
    if (!visibleItems.length) return null;
    const hasActive = visibleItems.some(i => i.id === tab);
    const groupBadge = visibleItems.reduce((sum, i) => sum + (badges[i.id] || 0), 0);

    return (
        <div style={{ marginTop: 16 }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "6px 10px", borderRadius: 8, border: "none",
                    background: hasActive ? color + "18" : "transparent",
                    cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = color + "25"; }}
                onMouseLeave={e => { e.currentTarget.style.background = hasActive ? color + "18" : "transparent"; }}
            >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: hasActive ? color : "#6B7280", letterSpacing: "0.08em", flex: 1, textTransform: "uppercase" }}>
                    {label}
                </span>
                {!open && groupBadge > 0 && (
                    <span style={{ background: "#F97316", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 6px", flexShrink: 0, marginRight: 4 }}>
                        {groupBadge}
                    </span>
                )}
                <span style={{ fontSize: 10, color: "#4B5563", transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>▼</span>
            </button>

            {open && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2, paddingLeft: 8, borderLeft: `2px solid ${color}30`, marginLeft: 14 }}>
                    {visibleItems.map(item => (
                        <NavBtn key={item.id} id={item.id} tab={tab} setTab={setTab} icon={item.icon} label={item.label} badge={badges[item.id] > 0 ? badges[item.id] : null} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Sidebar({ tab, setTab, userRole, user, onLogout, alertasAbertos = 0, pedidosConfirmacao = 0, pedidosVencidos = 0, separacoesPendentes = 0, tntPedidosPendentes = 0, cordoesPedidosPendentes = 0, viesPedidosPendentes = 0, coletasPendentes = 0, mercadoriaPendentes = 0 }) {
    const allowed  = user?.permissoes || ROLE_ACCESS[userRole] || [];
    const initials = user?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div style={{ width: 248, height: "100dvh", background: "#0F1117", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
            {/* Logo */}
            <div style={{ padding: "22px 20px 18px" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "-0.5px" }}>FourTEX</div>
                <div style={{ fontSize: 10, color: "#F97316", fontWeight: 700, letterSpacing: "0.12em", marginTop: 2 }}>CONTROLE DE PRODUÇÃO</div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "0 10px 12px", overflowY: "auto" }}>
                {/* Painel */}
                {allowed.includes("dashboard") && (
                    <NavBtn id="dashboard" tab={tab} setTab={setTab} icon={PAINEL.icon} label={PAINEL.label} />
                )}

                {/* Grupos colapsáveis por produto */}
                {GRUPOS_PRODUTO.map(g => (
                    <CollapsibleGroup
                        key={g.key}
                        label={g.label}
                        color={g.color}
                        items={g.items}
                        tab={tab}
                        setTab={setTab}
                        allowed={allowed}
                        defaultOpen={g.items.some(i => i.id === tab)}
                        badges={g.key === "tnt" ? { tnt: tntPedidosPendentes } : g.key === "cordoes" ? { cordoes: cordoesPedidosPendentes } : g.key === "vies" ? { viespedidos: viesPedidosPendentes } : undefined}
                    />
                ))}

                {/* Seções fixas */}
                {SECOES.map(section => {
                    const visible = section.items.filter(i => allowed.includes(i.id));
                    if (!visible.length) return null;
                    return (
                        <div key={section.label} style={{ marginTop: 20 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", letterSpacing: "0.1em", padding: "0 10px 6px", textTransform: "uppercase" }}>
                                {section.label}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                {visible.map(item => (
                                    <NavBtn
                                        key={item.id}
                                        id={item.id}
                                        tab={tab}
                                        setTab={setTab}
                                        icon={item.icon}
                                        label={item.label}
                                        badge={
                                            item.id === "alertas" && alertasAbertos > 0 ? alertasAbertos
                                            : item.id === "pedidos" && pedidosVencidos > 0 ? pedidosVencidos
                                            : item.id === "pedidos" && pedidosConfirmacao > 0 ? pedidosConfirmacao
                                            : item.id === "separacao" && separacoesPendentes > 0 ? separacoesPendentes
                                            : null
                                        }
                                        badgeColor={item.id === "pedidos" && pedidosVencidos > 0 ? "#DC2626" : item.id === "separacao" ? "#0891B2" : undefined}
                                        badges={item.id === "coleta" ? [
                                            ...(coletasPendentes > 0 ? [{ value: coletasPendentes, color: "#DC2626" }] : []),
                                            ...(mercadoriaPendentes > 0 ? [{ value: mercadoriaPendentes, color: "#D97706" }] : []),
                                        ] : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Rodapé */}
            <div style={{ borderTop: "1px solid #1F2937", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 800, flexShrink: 0, letterSpacing: "-0.3px" }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#F9FAFB", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>{ROLE_LABEL[userRole]}</div>
                    </div>
                    <button onClick={onLogout} title="Sair" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #1F2937", background: "transparent", color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#1F2937"; e.currentTarget.style.color = "#F87171"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6B7280"; }}
                    >
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    </button>
                </div>
                <div style={{ textAlign: "center", fontSize: 10, color: "#374151", marginTop: 10, letterSpacing: "0.04em" }}>
                    v{APP_VERSION}
                </div>
            </div>
        </div>
    );
}
