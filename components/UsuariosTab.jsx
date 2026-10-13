import { useState, useEffect } from "react";

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 640);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}
import { ref, set, update, remove, push, get } from "firebase/database";
import { db } from "../firebase";

function parseMaquinas(str) {
    if (!str?.trim()) return null;
    const result = [];
    str.split(",").forEach(part => {
        const range = part.trim().split("-");
        if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
            for (let i = Number(range[0]); i <= Number(range[1]); i++) result.push(i);
        } else if (!isNaN(Number(part.trim()))) {
            result.push(Number(part.trim()));
        }
    });
    return result.length ? result : null;
}

async function resetDados() {
    await set(ref(db, "logs"), null);
    await set(ref(db, "alertas"), null);
    await set(ref(db, "historicoFitas"), null);
    await set(ref(db, "turnoFinalizacoes"), null);
    await set(ref(db, "turnoAtual"), { numero: 1, inicio: new Date().toISOString() });
    await set(ref(db, "orderCounter"), 0);
    await set(ref(db, "dataInitialized"), true); // impede re-seed dos pedidos de exemplo

    // Remove flag parada de todas as máquinas
    const snap = await get(ref(db, "machines"));
    if (snap.exists()) {
        const updates = {};
        Object.keys(snap.val()).forEach(id => { updates[`machines/${id}/parada`] = null; });
        await update(ref(db), updates);
    }
}

// Grupos de abas por setor — fonte única de verdade
const TAB_GROUPS = [
    {
        label: "Geral",
        color: "#6B7280",
        tabs: [
            { id: "dashboard",  label: "Painel" },
            { id: "alertas",    label: "Manutenção" },
            { id: "etiquetas",  label: "Etiquetas" },
            { id: "coleta",     label: "Coleta / Mercadoria" },
        ],
    },
    {
        label: "Gorgurão",
        color: "#F97316",
        tabs: [
            { id: "producao",      label: "Apontamento" },
            { id: "maquinas",      label: "Máquinas" },
            { id: "estoque",       label: "Estoque" },
            { id: "metas",         label: "Metas" },
            { id: "historico",     label: "Histórico" },
            { id: "logs",          label: "Log Lançamentos" },
            { id: "historicofitas",label: "Hist. Fitas" },
            { id: "planejamento",  label: "Planejamento" },
            { id: "custofio",      label: "Custo" },
        ],
    },
    {
        label: "Elástico",
        color: "#10B981",
        tabs: [
            { id: "elastico",           label: "Apontamento" },
            { id: "estoqueelastico",    label: "Estoque" },
            { id: "maquinaselastico",   label: "Máquinas" },
            { id: "historicoelestico",  label: "Histórico" },
            { id: "relatorioselastico", label: "Relatórios" },
        ],
    },
    {
        label: "Pedidos & Admin",
        color: "#6366F1",
        tabs: [
            { id: "pedidos",     label: "Pedidos" },
            { id: "separacao",   label: "Separação" },
            { id: "clientes",    label: "Clientes" },
            { id: "relatorios",  label: "Relatórios" },
            { id: "usuarios",    label: "Usuários" },
        ],
    },
    {
        label: "TNT",
        color: "#0891B2",
        tabs: [
            { id: "tnt",         label: "Pedidos TNT" },
            { id: "tntestoque",  label: "Estoque TNT" },
            { id: "tntetiqueta", label: "Etiquetas TNT" },
            { id: "tntseparacaofaturamento", label: "Separação/Faturamento TNT" },
        ],
    },
    {
        label: "Cordões",
        color: "#7C3AED",
        tabs: [
            { id: "producaocordoes", label: "Apontamento" },
            { id: "cordoes",         label: "Pedidos Cordões" },
            { id: "estoquecordoes",  label: "Estoque Cordões" },
            { id: "maquinascordoes", label: "Máquinas Cordões" },
        ],
    },
    {
        label: "Viés",
        color: "#DB2777",
        tabs: [
            { id: "producaovies", label: "Apontamento" },
            { id: "viespedidos",  label: "Pedidos Viés" },
        ],
    },
    {
        label: "Fio",
        color: "#0EA5E9",
        tabs: [
            { id: "estoquefio", label: "Estoque de Fio" },
        ],
    },
];

// Lista plana derivada dos grupos (usada em buscas)
const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);
const ALL_TAB_IDS = ALL_TABS.map(t => t.id);

const EMPTY_FORM = { name: "", login: "", senha: "", role: "user", permissoes: ["dashboard"], permissoesEdicao: [], maquinasInput: "" };

// Linha com duas caixinhas: "Ver" e "Editar" (editar liga ver automaticamente; desligar ver desliga editar)
function PermRow({ t, color, viewOn, editOn, onToggleView, onToggleEdit }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 0" }}>
            <span style={{ fontSize: 14, color: "#111827" }}>{t.label}</span>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, color: viewOn ? color : "#9CA3AF" }}>
                    <input type="checkbox" checked={viewOn} onChange={onToggleView} style={{ width: 15, height: 15, cursor: "pointer", accentColor: color }} />
                    Ver
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, color: editOn ? color : "#9CA3AF" }}>
                    <input type="checkbox" checked={editOn} onChange={onToggleEdit} style={{ width: 15, height: 15, cursor: "pointer", accentColor: color }} />
                    Editar
                </label>
            </div>
        </div>
    );
}

function badge(role) {
    const c = role === "admin" ? { bg: "#FEF3C7", color: "#D97706" } : { bg: "#F3F4F6", color: "#6B7280" };
    return (
        <span style={{ background: c.bg, color: c.color, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "2px 9px" }}>
            {role === "admin" ? "Administrador" : "Usuário"}
        </span>
    );
}

export default function UsuariosTab({ usuarios = [], notify, onRecalcularEntregas, onPreviewUser, currentLogin, podeEditar = true }) {
    const podeVerSenhas = (currentLogin || "").toLowerCase() === "renan";
    const isMobile = useIsMobile();
    const [form, setForm] = useState(EMPTY_FORM);
    const [editKey, setEditKey] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [showSenha, setShowSenha] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [permUserKey, setPermUserKey] = useState("");
    const [permLocal, setPermLocal] = useState([]);
    const [permLocalEdit, setPermLocalEdit] = useState([]);

    const permUser = usuarios.find(u => u.key === permUserKey) || null;

    const handleSelectPermUser = (key) => {
        setPermUserKey(key);
        const u = usuarios.find(x => x.key === key);
        // Admin tem acesso total sempre, independente do que está marcado.
        const view = u ? (u.role === "admin" ? ALL_TAB_IDS : (u.permissoes || [])) : [];
        // sem permissoesEdicao salva ainda = compatibilidade: todo mundo que vê, edita (comportamento antigo)
        const edit = u ? (u.role === "admin" ? ALL_TAB_IDS : (u.permissoesEdicao || u.permissoes || [])) : [];
        setPermLocal(view);
        setPermLocalEdit(edit);
    };

    const togglePermLocalView = (id) => {
        setPermLocal(p => {
            const ligar = !p.includes(id);
            return ligar ? [...p, id] : p.filter(x => x !== id);
        });
        // desligar "ver" desliga "editar" junto (não faz sentido editar sem ver)
        setPermLocalEdit(p => (permLocal.includes(id) ? p.filter(x => x !== id) : p));
    };

    const togglePermLocalEdit = (id) => {
        setPermLocalEdit(p => {
            const ligar = !p.includes(id);
            return ligar ? [...p, id] : p.filter(x => x !== id);
        });
        // ligar "editar" garante que "ver" também fique ligado
        setPermLocal(p => (!p.includes(id) ? [...p, id] : p));
    };

    const salvarPermissoes = async () => {
        if (!permUser) return;
        await update(ref(db, `usuarios/${permUser.key}`), { permissoes: permLocal, permissoesEdicao: permLocalEdit });
        notify(`Permissões de ${permUser.name} salvas!`);
    };

    const toggleAdmin = () => {
        setForm(f => ({ ...f, role: f.role === "admin" ? "user" : "admin" }));
    };

    const openAdd = () => {
        setForm(EMPTY_FORM);
        setEditKey(null);
        setShowForm(true);
    };

    const openEdit = (u) => {
        const maquinasInput = u.maquinasPermitidas?.length ? u.maquinasPermitidas.join(",") : "";
        const permissoes = u.role === "admin" ? ALL_TAB_IDS : (u.permissoes || []);
        const permissoesEdicao = u.role === "admin" ? ALL_TAB_IDS : (u.permissoesEdicao || u.permissoes || []);
        setForm({ name: u.name, login: u.login, senha: u.senha, role: u.role, permissoes, permissoesEdicao, maquinasInput });
        setEditKey(u.key);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.login.trim() || !form.senha.trim()) {
            notify("Preencha nome, login e senha.", "error");
            return;
        }
        const loginLower = form.login.trim().toLowerCase();
        const duplicado = usuarios.find(u => u.login.toLowerCase() === loginLower && u.key !== editKey);
        if (duplicado) {
            notify("Esse login já está em uso.", "error");
            return;
        }
        const maquinasPermitidas = parseMaquinas(form.maquinasInput);
        const data = { name: form.name.trim(), login: loginLower, senha: form.senha.trim(), role: form.role, permissoes: form.permissoes, permissoesEdicao: form.permissoesEdicao, maquinasPermitidas: maquinasPermitidas || null };
        if (editKey) {
            await update(ref(db, `usuarios/${editKey}`), data);
            notify("Usuário atualizado!");
        } else {
            await push(ref(db, "usuarios"), data);
            notify("Usuário criado!");
        }
        setShowForm(false);
        setForm(EMPTY_FORM);
        setEditKey(null);
    };

    const handleDelete = async (key) => {
        await remove(ref(db, `usuarios/${key}`));
        notify("Usuário removido!");
        setConfirmDelete(null);
    };

    return (
        <div style={{ padding: isMobile ? "16px 12px 40px" : "24px 24px 40px", maxWidth: 780, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Usuários & Permissões</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Gerencie os acessos ao sistema</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        {podeVerSenhas && onRecalcularEntregas && (
                            <button onClick={() => { if (window.confirm("Recalcular quantidades entregues e status de todos os pedidos? Use isso se um pedido concluído não voltou a aparecer após excluir uma entrega.")) onRecalcularEntregas(); }} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: "#fff", color: "#111827", border: "1px solid #ECEDF1",
                                borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}>
                                ↻ Recalcular pedidos
                            </button>
                        )}
                        {podeEditar && (
                            <button onClick={openAdd} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: "#111827", color: "#fff", border: "none",
                                borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}>
                                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Novo usuário
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Painel Editar Permissões Rápidas */}
            <div style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Editar Permissões</div>
                <select value={permUserKey} onChange={e => handleSelectPermUser(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #ECEDF1", borderRadius: 8, fontSize: 13, marginBottom: 16, boxSizing: "border-box", background: "#F9FAFB" }}>
                    <option value="">Selecione um usuário...</option>
                    {usuarios.map(u => <option key={u.key} value={u.key}>{u.name}{u.role === "admin" ? " (Administrador)" : ""}</option>)}
                </select>

                {permUser && (
                    <>
                        {/* Info do usuário selecionado */}
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F9FAFB", borderRadius: 8, marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                                    {permUser.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{permUser.name}</div>
                                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                                        login: <b>{permUser.login}</b>
                                        {podeVerSenhas && <> · senha: <span style={{ fontFamily: "monospace" }}>{showSenha[permUser.key] ? permUser.senha : "••••"}</span>
                                            <button onClick={() => setShowSenha(s => ({ ...s, [permUser.key]: !s[permUser.key] }))} style={{ marginLeft: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9CA3AF", textDecoration: "underline" }}>
                                                {showSenha[permUser.key] ? "ocultar" : "ver"}
                                            </button></>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto" }}>
                                <button onClick={() => onPreviewUser?.(permUser)} style={{ flex: isMobile ? 1 : "none", padding: "7px 12px", fontSize: 12, fontWeight: 600, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 7, cursor: "pointer", color: "#1D4ED8" }}>Ver</button>
                                {podeEditar && <button onClick={() => openEdit(permUser)} style={{ flex: isMobile ? 1 : "none", padding: "7px 12px", fontSize: 12, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 7, cursor: "pointer", color: "#374151" }}>Editar</button>}
                                {podeEditar && <button onClick={() => setConfirmDelete(permUser.key)} style={{ flex: isMobile ? 1 : "none", padding: "7px 12px", fontSize: 12, fontWeight: 600, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, cursor: "pointer", color: "#DC2626" }}>Remover</button>}
                            </div>
                        </div>

                        {/* Checkboxes de permissões */}
                        {podeEditar && (
                            <>
                                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
                                    {TAB_GROUPS.map(group => (
                                        <div key={group.label}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: group.color, letterSpacing: "0.06em", marginBottom: 6 }}>
                                                {group.label.toUpperCase()}
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                {group.tabs.map(t => (
                                                    <PermRow key={t.id} t={t} color={group.color}
                                                        viewOn={permLocal.includes(t.id)} editOn={permLocalEdit.includes(t.id)}
                                                        onToggleView={() => togglePermLocalView(t.id)} onToggleEdit={() => togglePermLocalEdit(t.id)} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={salvarPermissoes} style={{ width: "100%", padding: "10px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                                    Salvar permissões de {permUser.name}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Lista removida — gestão feita pelo painel acima */}
            <div style={{ display: "none" }}>
                {[].map(u => (
                    <div key={u.key} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, overflow: "hidden" }}>
                        {/* Top: avatar + nome + role */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px" }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: "50%", background: "#111827",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, color: "#fff", fontWeight: 700, flexShrink: 0,
                            }}>
                                {u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    {badge(u.role)}
                                    {u.maquinasPermitidas?.length > 0 && (
                                        <span style={{ fontSize: 10, color: "#6B7280", background: "#F3F4F6", border: "1px solid #ECEDF1", borderRadius: 5, padding: "2px 7px" }}>
                                            M{Math.min(...u.maquinasPermitidas)}–M{Math.max(...u.maquinasPermitidas)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Login + senha */}
                        <div style={{ padding: "0 16px 12px", fontSize: 12, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span>login: <b style={{ color: "#374151" }}>{u.login}</b></span>
                            <span style={{ color: "#ECEDF1" }}>·</span>
                            {podeVerSenhas && (
                            <span>senha:{" "}
                                <span style={{ fontFamily: "monospace", color: "#374151" }}>
                                    {showSenha[u.key] ? u.senha : "••••"}
                                </span>
                                <button onClick={() => setShowSenha(s => ({ ...s, [u.key]: !s[u.key] }))} style={{
                                    marginLeft: 4, background: "none", border: "none", cursor: "pointer",
                                    fontSize: 11, color: "#9CA3AF", padding: "0 2px", textDecoration: "underline",
                                }}>{showSenha[u.key] ? "ocultar" : "ver"}</button>
                            </span>
                        )}
                        </div>

                        {/* Permissões agrupadas por setor */}
                        <div style={{ borderTop: "1px solid #F3F4F6", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                            {TAB_GROUPS.map(group => {
                                const perms = u.role === "admin" ? ALL_TAB_IDS : (u.permissoes || []);
                                const ativas = group.tabs.filter(t => perms.includes(t.id));
                                if (!ativas.length) return null;
                                return (
                                    <div key={group.label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: group.color, background: `${group.color}15`, border: `1px solid ${group.color}30`, borderRadius: 4, padding: "2px 6px", flexShrink: 0, marginTop: 1 }}>
                                            {group.label.toUpperCase()}
                                        </span>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                            {ativas.map(t => (
                                                <span key={t.id} style={{ fontSize: 11, color: "#374151", background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 5, padding: "2px 7px" }}>
                                                    {t.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botões */}
                        <div style={{ borderTop: "1px solid #F3F4F6", padding: "10px 16px", display: "flex", gap: 8 }}>
                            <button onClick={() => onPreviewUser?.(u)} style={{
                                flex: 1, padding: "8px", fontSize: 12, fontWeight: 600,
                                background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 7, cursor: "pointer", color: "#1D4ED8",
                            }}>👁 Ver</button>
                            <button onClick={() => openEdit(u)} style={{
                                flex: 1, padding: "8px", fontSize: 12, fontWeight: 600,
                                background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 7, cursor: "pointer", color: "#374151",
                            }}>Editar</button>
                            <button onClick={() => setConfirmDelete(u.key)} style={{
                                flex: 1, padding: "8px", fontSize: 12, fontWeight: 600,
                                background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, cursor: "pointer", color: "#DC2626",
                            }}>Remover</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Formulário */}
            {showForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 20 }}>
                            {editKey ? "Editar usuário" : "Novo usuário"}
                        </div>

                        {/* Campos básicos */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                            {[
                                { label: "Nome completo", field: "name", placeholder: "Ex: João Silva" },
                                { label: "Login", field: "login", placeholder: "Ex: joao" },
                                { label: "Senha", field: "senha", placeholder: "Ex: 1234" },
                            ].map(({ label, field, placeholder }) => (
                                <div key={field}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</div>
                                    <input
                                        value={form[field]}
                                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                                        placeholder={placeholder}
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ECEDF1", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Administrador */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 12px", border: "1px solid #ECEDF1", borderRadius: 8, background: form.role === "admin" ? "#FEF3C7" : "#F9FAFB" }}>
                                <input type="checkbox" checked={form.role === "admin"} onChange={toggleAdmin} style={{ width: 16, height: 16, cursor: "pointer" }} />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Administrador geral</div>
                                    <div style={{ fontSize: 11, color: "#6B7280" }}>Acesso total, ignora as permissões abaixo. Deixe desmarcado pra controlar tudo pelo painel de permissões.</div>
                                </div>
                            </label>
                        </div>

                        {/* Máquinas Permitidas */}
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5 }}>MÁQUINAS PERMITIDAS</label>
                            <input
                                value={form.maquinasInput}
                                onChange={e => setForm(f => ({ ...f, maquinasInput: e.target.value }))}
                                placeholder="Ex: 14-19 ou 1,2,3 (vazio = todas)"
                                style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #ECEDF1", borderRadius: 7, fontSize: 13 }}
                            />
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>Deixe vazio para acesso a todas as máquinas</div>
                        </div>

                        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 20 }}>
                            As permissões (Ver/Editar por aba) são ajustadas no painel principal, após salvar.
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setShowForm(false); setEditKey(null); }} style={{
                                flex: 1, padding: "9px", fontSize: 13, fontWeight: 600,
                                background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151",
                            }}>Cancelar</button>
                            <button onClick={handleSave} style={{
                                flex: 2, padding: "9px", fontSize: 13, fontWeight: 700,
                                background: "#111827", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff",
                            }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar reset */}
            {confirmReset && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Resetar todos os dados?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>Isso vai apagar permanentemente:</div>
                        <ul style={{ fontSize: 13, color: "#374151", paddingLeft: 20, marginBottom: 20, lineHeight: 2 }}>
                            <li>Todos os pedidos</li>
                            <li>Histórico de lançamentos</li>
                            <li>Alertas de manutenção</li>
                            <li>Histórico de fitas</li>
                            <li>Turnos finalizados</li>
                        </ul>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", marginBottom: 20 }}>✓ Máquinas e usuários serão mantidos.</div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>Cancelar</button>
                            <button onClick={async () => { await resetDados(); setConfirmReset(false); notify("Dados resetados com sucesso!"); }} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 700, background: "#DC2626", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}>Confirmar reset</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar remoção */}
            {confirmDelete && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 360, textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Remover usuário?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Essa ação não pode ser desfeita.</div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>Cancelar</button>
                            <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 700, background: "#DC2626", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}>Remover</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
