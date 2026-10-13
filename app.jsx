import { useState, useEffect, useRef, useMemo } from "react";

import { ref, onValue, set, update, push, get, remove } from "firebase/database";
import { db, authReady } from "./firebase";
import { USERS, INITIAL_MACHINES } from "./constants";
import { workdaysBetween, addWorkdays, today, parseTimestampBR } from "./utils";
import LoginPage from "./components/LoginPage";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import DashboardTab from "./components/DashboardTab";
import MaquinasTab from "./components/MaquinasTab";
import ProducaoTab from "./components/ProducaoTab";
import PedidosTab from "./components/PedidosTab";
import EstoqueTab from "./components/EstoqueTab";
import LogsTab from "./components/LogsTab";
import HistoricoFitasTab from "./components/HistoricoFitasTab";
import PesosForaMedidaTab from "./components/PesosForaMedidaTab";
import AlertasTab from "./components/AlertasTab";
import PlanejamentoTab from "./components/PlanejamentoTab";
import UsuariosTab from "./components/UsuariosTab";
import ClientesTab from "./components/ClientesTab";
import RelatoriosTab from "./components/RelatoriosTab";
import HistoricoTab from "./components/HistoricoTab";
import MetasTab from "./components/MetasTab";
import EtiquetasTab from "./components/EtiquetasTab";
import SolicitacoesTab from "./components/SolicitacoesTab";
import ProducaoElasticoTab from "./components/ProducaoElasticoTab";
import HistoricoElasticoTab from "./components/HistoricoElasticoTab";
import RelatoriosElasticoTab from "./components/RelatoriosElasticoTab";
import TNTTab from "./components/TNTTab";
import SeparacaoTab from "./components/SeparacaoTab";
import TNTEstoqueTab from "./components/TNTEstoqueTab";
import TNTEtiquetaTab from "./components/TNTEtiquetaTab";
import CordoesTab from "./components/CordoesTab";
import CordoesEstoqueTab from "./components/CordoesEstoqueTab";
import CordoesProducaoTab from "./components/CordoesProducaoTab";
import { TIPOS_CORDAO, PESO_KG_POR_RL } from "./utils/cordoesCatalog";
import ViesProducaoTab from "./components/ViesProducaoTab";
import ViesPedidosTab from "./components/ViesPedidosTab";
import FioEstoqueTab from "./components/FioEstoqueTab";
import CustoFioTab from "./components/CustoFioTab";
import { kgFioDoLog, kgFioDoCordoes } from "./utils/fioConsumo";
import { recuperarLogsGorgurao, recuperarLogsElastico } from "./utils/logsRecuperados";

const ROLE_LABEL_MAP = { admin: "Administrador", operador: "Operador", apontador: "Apontador", pedidos: "Pedidos", mecanico: "Mecânico", operadorElastico: "Op. Elástico", apontadorElastico: "Apt. Elástico", tnt: "TNT", cordoes: "Cordões" };

const TNT_CODIGO_ALIAS = { "4112": "4065", "4039": "4096", "4108": "4376", "4111": "4424", "4109": "4377" };

// Lista de todas as abas do sistema — admin sempre tem acesso total a todas elas.
// Usuários comuns dependem só do que está marcado no painel de permissões (Usuários > Editar Permissões).
const ALL_TABS = ["dashboard", "pedidos", "separacao", "maquinas", "producao", "estoque", "estoqueelastico", "historico", "metas", "logs", "historicofitas", "alertas", "planejamento", "planejamentoelastico", "clientes", "relatorios", "usuarios", "etiquetas", "coleta", "elastico", "maquinaselastico", "historicoelestico", "relatorioselastico", "pesosforamedida", "tnt", "tntestoque", "tntetiqueta", "cordoes", "estoquecordoes", "maquinascordoes", "producaocordoes", "producaovies", "viespedidos", "estoquefio", "custofio"];

const DATA_VERSION = 2; // incrementar aqui sempre que mudar dados iniciais

async function seedIfEmpty() {
    const versionSnap = await get(ref(db, "dataVersion"));

    if (!versionSnap.exists() || versionSnap.val() < DATA_VERSION) {
        // Re-seed máquinas com dados atualizados
        const machinesObj = {};
        INITIAL_MACHINES.forEach(m => { machinesObj[m.id] = m; });
        await set(ref(db, "machines"), machinesObj);
        await set(ref(db, "dataVersion"), DATA_VERSION);
    }

    // Pedidos nunca são semeados automaticamente — usuário cria os próprios
}

export default function App() {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem("fitas_session");
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [login, setLogin] = useState("");
    const [senha, setSenha] = useState("");
    const [loginError, setLoginError] = useState("");
    const [tab, setTab] = useState("dashboard");
    const [usuarios, setUsuarios] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [etiquetasFila, setEtiquetasFila] = useState([]);
    const [coletasFila, setColetasFila] = useState([]);
    const [mercadoriaFila, setMercadoriaFila] = useState([]);

    // Firebase-synced state
    const [machines, setMachines] = useState([]);
    const [orders, setOrders] = useState([]);
    const [logs, setLogs] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [historicoFitas, setHistoricoFitas] = useState({});
    const [turnoAtual, setTurnoAtual] = useState({ numero: 1, inicio: new Date().toISOString() });
    const [turnoFinalizacoes, setTurnoFinalizacoes] = useState([]);
    const [turnoElasticoAtual, setTurnoElasticoAtual] = useState(null);
    const [turnoElasticoFinalizacoes, setTurnoElasticoFinalizacoes] = useState([]);
    const [estoqueMovimentos, setEstoqueMovimentos] = useState([]);
    const [coresTemporarias, setCoresTemporarias] = useState([]);
    const [pesosForaMedia, setPesosForaMedia] = useState([]);
    const [separacaoHistorico, setSeparacaoHistorico] = useState([]);
    const [tntPedidos,       setTntPedidos]       = useState([]);
    const [tntEstoque,       setTntEstoque]       = useState([]);
    const [tntEtiquetasFila, setTntEtiquetasFila] = useState([]);
    const [cordoesPedidos,   setCordoesPedidos]   = useState([]);
    const [cordoesEstoque,   setCordoesEstoque]   = useState([]);
    const [fioEstoque,       setFioEstoque]       = useState([]);
    const [cordoesApontamentos, setCordoesApontamentos] = useState([]);
    const [cordoesDiasFinalizados, setCordoesDiasFinalizados] = useState([]);
    const [viesApontamentos, setViesApontamentos] = useState([]);
    const [viesDiasFinalizados, setViesDiasFinalizados] = useState([]);
    const [viesPedidos, setViesPedidos] = useState([]);
    const [previewUser, setPreviewUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [minLoadDone, setMinLoadDone] = useState(false);
    useEffect(() => { const t = setTimeout(() => setMinLoadDone(true), 3000); return () => clearTimeout(t); }, []);
    useEffect(() => { const t = setTimeout(() => setLoading(false), 10000); return () => clearTimeout(t); }, []);
    useEffect(() => { const t = setTimeout(() => setUsuariosCarregados(true), 8000); return () => clearTimeout(t); }, []);
    const [firebaseReady, setFirebaseReady] = useState(false);
    const [usuariosCarregados, setUsuariosCarregados] = useState(false);

    // Local UI state
    const [notification, setNotification] = useState(null);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    useEffect(() => {
        const h = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(true);
        };
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
        if (dy > Math.abs(dx)) { touchStartX.current = null; return; }
        if (dx > 50 && touchStartX.current < 48) setSidebarOpen(true);
        else if (dx < -50 && sidebarOpen) setSidebarOpen(false);
        touchStartX.current = null;
    };
    const [editMachine, setEditMachine] = useState(null);

    // Espera o auth anônimo estar pronto
    useEffect(() => {
        authReady.then(() => setFirebaseReady(true));
    }, []);

    // Seed on mount and subscribe to real-time updates
    useEffect(() => {
        if (!firebaseReady) return;
        seedIfEmpty();

        const unsubMachines = onValue(ref(db, "machines"), snap => {
            const data = snap.val();
            setMachines(data ? Object.values(data).sort((a, b) => a.id - b.id) : []);
        });

        const unsubOrders = onValue(ref(db, "orders"), snap => {
            const data = snap.val();
            setOrders(data ? Object.values(data).sort((a, b) => a.id - b.id) : []);
            setLoading(false);
        }, () => setLoading(false));

        const unsubLogs = onValue(ref(db, "logs"), snap => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([key, val]) => ({ ...val, firebaseKey: key }));
                setLogs(list.reverse());
            } else {
                setLogs([]);
            }
        });

        const unsubTurno = onValue(ref(db, "turnoAtual"), snap => {
            if (snap.exists()) {
                setTurnoAtual(snap.val());
            } else {
                const init = { numero: 1, inicio: new Date().toISOString() };
                set(ref(db, "turnoAtual"), init);
                setTurnoAtual(init);
            }
        });

        const unsubHistorico = onValue(ref(db, "historicoFitas"), snap => {
            setHistoricoFitas(snap.val() || {});
        });

        const unsubAlertas = onValue(ref(db, "alertas"), snap => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([key, val]) => ({ ...val, key }));
                setAlertas(list.sort((a, b) => parseTimestampBR(b.timestamp) - parseTimestampBR(a.timestamp)));
            } else setAlertas([]);
        });

        const unsubUsuarios = onValue(ref(db, "usuarios"), async snap => {
            if (snap.exists()) {
                const list = Object.entries(snap.val()).map(([key, val]) => ({ ...val, key }));
                setUsuarios(list);
                setUsuariosCarregados(true);
                // Adiciona usuários novos do constants.js que ainda não estão no Firebase
                const existingLogins = list.map(u => u.login);
                for (const u of USERS) {
                    if (!existingLogins.includes(u.login)) {
                        await push(ref(db, "usuarios"), { name: u.name, login: u.login, senha: u.senha, role: u.role, permissoes: u.permissoes || null });
                    }
                }
                // Garante que admins sempre têm acesso completo (atualiza se faltam abas novas)
                for (const u of list) {
                    if (u.role === "admin" && Array.isArray(u.permissoes)) {
                        const missing = ALL_TABS.some(t => !u.permissoes.includes(t));
                        if (missing) await update(ref(db, `usuarios/${u.key}`), { permissoes: null });
                    }
                }
                // Sincroniza o user logado se suas permissões mudaram
                setUser(prev => {
                    if (!prev) return prev;
                    const atual = list.find(u => u.login === prev.login);
                    if (!atual) return prev;
                    const permissoes = atual.permissoes || null;
                    const permissoesEdicao = atual.permissoesEdicao || null;
                    try { localStorage.setItem("fitas_session", JSON.stringify({ ...prev, permissoes, permissoesEdicao })); } catch {}
                    return { ...prev, permissoes, permissoesEdicao };
                });
            } else {
                // Seed inicial dos usuários do constants.js
                const seed = {};
                USERS.forEach(u => { seed[u.id] = { name: u.name, login: u.login, senha: u.senha, role: u.role, permissoes: u.permissoes || null }; });
                await set(ref(db, "usuarios"), seed);
                setUsuariosCarregados(true);
            }
        });

        const unsubClientes = onValue(ref(db, "clientes"), snap => {
            const data = snap.val();
            if (data) setClientes(Object.entries(data).map(([key, val]) => ({ ...val, key })));
            else setClientes([]);
        });

        const unsubVendedores = onValue(ref(db, "vendedores"), snap => {
            const data = snap.val();
            if (data) setVendedores(Object.entries(data).map(([key, val]) => ({ ...val, key })));
            else setVendedores([]);
        });

        const unsubFinalizacoes = onValue(ref(db, "turnoFinalizacoes"), snap => {
            const data = snap.val();
            setTurnoFinalizacoes(data ? Object.entries(data).map(([key, val]) => ({ ...val, firebaseKey: key })) : []);
        });

        const unsubEstoqueMovimentos = onValue(ref(db, "estoqueMovimentos"), snap => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([key, val]) => ({ ...val, key }));
                setEstoqueMovimentos(list);
            } else setEstoqueMovimentos([]);
        });


        const unsubEtiquetas = onValue(ref(db, "etiquetasFila"), snap => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]) => ({ ...val, id }))
                    .sort((a, b) => parseTimestampBR(b.timestamp) - parseTimestampBR(a.timestamp));
                setEtiquetasFila(list);
            } else setEtiquetasFila([]);
        });

        const unsubColetas = onValue(ref(db, "coletasFila"), snap => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]) => ({ ...val, id }))
                    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
                setColetasFila(list);
            } else setColetasFila([]);
        });

        const unsubTurnoElastico = onValue(ref(db, "turnoElasticoAtual"), snap => {
            setTurnoElasticoAtual(snap.exists() ? snap.val() : null);
        });
        const unsubFinalizacoesElastico = onValue(ref(db, "turnoElasticoFinalizacoes"), snap => {
            const data = snap.val();
            setTurnoElasticoFinalizacoes(data ? Object.entries(data).map(([key, val]) => ({ ...val, firebaseKey: key })) : []);
        });
        const DOZE_HORAS = 12 * 60 * 60 * 1000;
        const unsubPesosForaMedia = onValue(ref(db, "pesosForaMedia"), snap => {
            const data = snap.val();
            setPesosForaMedia(data ? Object.entries(data).map(([key, val]) => ({ ...val, key })) : []);
        });
        const unsubTNT = onValue(ref(db, "tntPedidos"), snap => {
            const data = snap.val();
            setTntPedidos(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });
        const unsubTNTEstoque = onValue(ref(db, "tntEstoque"), snap => {
            const data = snap.val();
            setTntEstoque(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });

        const unsubTNTEtiquetas = onValue(ref(db, "tntEtiquetasFila"), snap => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]) => ({ ...val, id }))
                    .sort((a, b) => parseTimestampBR(b.timestamp) - parseTimestampBR(a.timestamp));
                setTntEtiquetasFila(list);
            } else setTntEtiquetasFila([]);
        });

        const unsubCoresTemp = onValue(ref(db, "coresTemporarias"), snap => {
            const data = snap.val();
            if (data) {
                const agora = Date.now();
                const list = Object.entries(data)
                    .map(([key, val]) => ({ ...val, key }))
                    .filter(ct => agora - new Date(ct.criadaEm).getTime() < DOZE_HORAS);
                setCoresTemporarias(list);
            } else setCoresTemporarias([]);
        });

        const unsubSeparacao = onValue(ref(db, "separacaoHistorico"), snap => {
            const data = snap.val();
            setSeparacaoHistorico(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })).sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")) : []);
        });

        const unsubCordoesPedidos = onValue(ref(db, "cordoesPedidos"), snap => {
            const data = snap.val();
            setCordoesPedidos(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });
        const unsubCordoesEstoque = onValue(ref(db, "cordoesEstoque"), snap => {
            const data = snap.val();
            setCordoesEstoque(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });
        const unsubFioEstoque = onValue(ref(db, "fioEstoque"), snap => {
            const data = snap.val();
            setFioEstoque(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });
        const unsubCordoesApontamento = onValue(ref(db, "cordoesApontamento"), snap => {
            const data = snap.val();
            setCordoesApontamentos(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });
        const unsubCordoesDiasFinalizados = onValue(ref(db, "cordoesDiasFinalizados"), snap => {
            const data = snap.val();
            setCordoesDiasFinalizados(data ? Object.entries(data).map(([key, v]) => ({ ...v, key })) : []);
        });

        const unsubViesApontamento = onValue(ref(db, "viesApontamento"), snap => {
            const data = snap.val();
            setViesApontamentos(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });
        const unsubViesPedidos = onValue(ref(db, "viesPedidos"), snap => {
            const data = snap.val();
            setViesPedidos(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
        });
        const unsubViesDiasFinalizados = onValue(ref(db, "viesDiasFinalizados"), snap => {
            const data = snap.val();
            setViesDiasFinalizados(data ? Object.entries(data).map(([key, v]) => ({ ...v, key })) : []);
        });
        const unsubMercadoria = onValue(ref(db, "mercadoriaFila"), snap => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]) => ({ ...val, id }))
                    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
                setMercadoriaFila(list);
            } else setMercadoriaFila([]);
        });

        return () => { unsubMachines(); unsubOrders(); unsubLogs(); unsubTurno(); unsubAlertas(); unsubHistorico(); unsubUsuarios(); unsubClientes(); unsubVendedores(); unsubFinalizacoes(); unsubEstoqueMovimentos(); unsubEtiquetas(); unsubColetas(); unsubTurnoElastico(); unsubFinalizacoesElastico(); unsubCoresTemp(); unsubPesosForaMedia(); unsubTNT(); unsubTNTEstoque(); unsubTNTEtiquetas(); unsubSeparacao(); unsubCordoesPedidos(); unsubCordoesEstoque(); unsubCordoesApontamento(); unsubCordoesDiasFinalizados(); unsubViesApontamento(); unsubViesDiasFinalizados(); unsubViesPedidos(); unsubMercadoria(); unsubFioEstoque(); };
    }, [firebaseReady]);

    // ── Notificações browser ──────────────────────────────────
    const canNotify = typeof Notification !== "undefined";

    const pushNotify = (title, body) => {
        if (canNotify && Notification.permission === "granted") {
            try { new Notification(title, { body, icon: "/icon-192.png" }); } catch { /* Android com SW ativo */ }
        }
    };

    useEffect(() => {
        if (!user || !canNotify) return;
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, [user]); // eslint-disable-line

    const alertasAbertosQtd = alertas.filter(a => a.status === "aberto").length;
    const pedidosConfirmacaoQtd = orders.filter(o => o.status === "confirmacao").length;
    const tntPedidosPendentesQtd = tntPedidos.filter(p => p.status === "pendente").length;
    const cordoesPedidosPendentesQtd = cordoesPedidos.filter(p => p.status === "pendente").length;
    const viesPedidosPendentesQtd = viesPedidos.filter(p => (p.status || "pendente") === "pendente").length;
    const coletasPendentesQtd = coletasFila.filter(c => c.status === "pendente").length;
    const mercadoriaPendentesQtd = mercadoriaFila.filter(m => m.status === "pendente").length;

    useEffect(() => {
        if (!user || alertasAbertosQtd === 0) return;
        pushNotify("FourTEX — Manutenção", `${alertasAbertosQtd} máquina${alertasAbertosQtd !== 1 ? "s" : ""} com problema aberto`);
    }, [alertasAbertosQtd]); // eslint-disable-line

    // ── Limpeza automática: itens concluídos há mais de 7 dias saem do banco ──
    // (Coleta/Mercadoria/Etiquetas: só o que já foi atendido; itens pendentes nunca são apagados)
    useEffect(() => {
        if (!user || user.role !== "admin" || !firebaseReady) return;
        const hoje = new Date().toDateString();
        if (localStorage.getItem("fourtex_limpeza7dias_v3") === hoje) return;

        const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const updates = {};

        coletasFila.forEach(c => {
            if (c.status !== "pendente" && parseTimestampBR(c.timestamp) < limite) updates[`coletasFila/${c.id}`] = null;
        });
        mercadoriaFila.forEach(m => {
            if (m.status !== "pendente" && parseTimestampBR(m.timestamp) < limite) updates[`mercadoriaFila/${m.id}`] = null;
        });
        etiquetasFila.forEach(e => {
            if (e.status !== "pendente" && parseTimestampBR(e.timestamp) < limite) updates[`etiquetasFila/${e.id}`] = null;
        });
        Object.entries(historicoFitas).forEach(([machineId, entries]) => {
            Object.entries(entries || {}).forEach(([entryId, entry]) => {
                const ts = entry?.timestamp ? new Date(entry.timestamp).getTime() : 0;
                if (ts && ts < limite) updates[`historicoFitas/${machineId}/${entryId}`] = null;
            });
        });
        // Apontamentos (logs) não são apagados: relatórios e a aba Custo precisam dos meses anteriores
        pesosForaMedia.forEach(p => {
            if (p.key && parseTimestampBR(p.timestamp) < limite) updates[`pesosForaMedia/${p.key}`] = null;
        });

        const finalizar = () => localStorage.setItem("fourtex_limpeza7dias_v3", hoje);
        if (Object.keys(updates).length > 0) {
            update(ref(db), updates).then(finalizar).catch(() => {});
        } else {
            finalizar();
        }
    }, [user, firebaseReady, coletasFila, mercadoriaFila, etiquetasFila, historicoFitas, logs, pesosForaMedia]);

    useEffect(() => {
        if (!user || pedidosConfirmacaoQtd === 0) return;
        pushNotify("FourTEX — Pedidos", `${pedidosConfirmacaoQtd} pedido${pedidosConfirmacaoQtd !== 1 ? "s" : ""} aguardando confirmação`);
    }, [pedidosConfirmacaoQtd]); // eslint-disable-line

    useEffect(() => {
        if (!user || coletasPendentesQtd === 0) return;
        pushNotify("FourTEX — Coleta", `${coletasPendentesQtd} coleta${coletasPendentesQtd !== 1 ? "s" : ""} aguardando retirada`);
    }, [coletasPendentesQtd]); // eslint-disable-line

    useEffect(() => {
        if (!user || mercadoriaPendentesQtd === 0) return;
        pushNotify("FourTEX — Mercadoria", `${mercadoriaPendentesQtd} solicitaç${mercadoriaPendentesQtd !== 1 ? "ões" : "ão"} de mercadoria pendente${mercadoriaPendentesQtd !== 1 ? "s" : ""}`);
    }, [mercadoriaPendentesQtd]); // eslint-disable-line

    const notify = (msg, type = "success") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleLogin = () => {
        const found = usuarios.length > 0
            ? usuarios.find(u => u.login === login.trim().toLowerCase() && u.senha === senha)
            : USERS.find(u => u.login === login && u.senha === senha);
        if (found) {
            setUser(found);
            setLoginError("");
            setTab("dashboard");
            try { localStorage.setItem("fitas_session", JSON.stringify(found)); } catch {}
        }
        else setLoginError("Usuário ou senha incorretos.");
    };

    // ── Pedidos ──────────────────────────────────────────────
    const handleAddOrder = async ({ dataEntrega, cliente, itens, observacao }) => {
        const id = Date.now();
        const counterSnap = await get(ref(db, "orderCounter"));
        const numero = (counterSnap.val() || 0) + 1;
        const horaLancamento = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
        const order = { id, numero, dataEntrada: today, horaLancamento, dataEntrega, cliente, itens, observacao: observacao || "", status: "confirmacao", operadorConfirmou: false, criadoPor: user.name };
        try {
            await set(ref(db, `orders/${id}`), order);
            await set(ref(db, "orderCounter"), numero);
            notify(`Pedido #${numero} criado!`);
        } catch { notify("Erro ao salvar. Verifique as regras do Firebase.", "error"); }
    };

    const handleDeleteOrder = async (id) => {
        try {
            await set(ref(db, `orders/${id}`), null);
            notify("Pedido excluído!");
        } catch { notify("Erro ao excluir pedido.", "error"); }
    };

    const handleEditOrder = async (order) => {
        try {
            await update(ref(db, `orders/${order.id}`), order);
            notify("Pedido atualizado!");
        } catch { notify("Erro ao atualizar pedido.", "error"); }
    };

    const handleSolicitarConfirmacao = async (orderId, dataProposta) => {
        const order = orders.find(o => o.id === orderId);
        try {
            await update(ref(db, `orders/${orderId}`), {
                status: "confirmacao",
                dataEntrega: dataProposta,
                operadorConfirmou: false,
                criadoPor: order?.criadoPor || user.name,
            });
            notify("Confirmação solicitada ao operador!");
        } catch { notify("Erro ao solicitar confirmação.", "error"); }
    };

    const handleConfirmarPedido = async (orderId, dataConfirmada) => {
        try {
            await update(ref(db, `orders/${orderId}`), { dataEntrega: dataConfirmada, operadorConfirmou: true, status: "em_producao" });
            notify("Data confirmada! Pedido em produção.");
        } catch { notify("Erro ao confirmar pedido.", "error"); }
    };

    const handleConcluirPedido = async (orderId, descontarEstoque = true, cancelado = false) => {
        const order = orders.find(o => o.id === orderId);
        let itensPendentes = [];
        try {
            const updates = {};
            updates[`orders/${orderId}/status`] = "concluido";
            updates[`orders/${orderId}/dataConclusao`] = today;
            updates[`orders/${orderId}/cancelado`] = cancelado ? true : null;

            if (order) {
                const itens = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});

                if (descontarEstoque) {
                    const estoque = calcEstoqueAtual();
                    const entregueMapConc = {};
                    const epsConc = order.entregasParciais ? Object.values(order.entregasParciais) : [];
                    epsConc.forEach(e => { (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => { const k = `${(ei.cor||"").trim()}|${ei.medida}`; entregueMapConc[k] = (entregueMapConc[k] || 0) + Number(ei.qtd || 0); }); });
                    const semEstoque = itens.filter(it => {
                        if ((it.tipo||"").toLowerCase() === "poliéster") return false;
                        if ((it.unidadeOriginal||"").toUpperCase() === "KG") return false;
                        const jaEntregue = entregueMapConc[`${(it.cor||"").trim()}|${it.medida}`] || 0;
                        const restante = Math.max(0, (it.qtdTotal||0) - jaEntregue);
                        if (restante <= 0) return false;
                        const isMetro = it.unidadeOriginal === "m" || it.unidadeOriginal === "Metro";
                        const un = it.tipo !== "Elástico" ? "RL" : (isMetro ? "Metro" : "Rolo");
                        const k = `${it.tipo}|${it.medida}|${(it.cor||"").trim()}|${un}`;
                        return (estoque[k] || 0) < restante;
                    });
                    if (semEstoque.length > 0) {
                        const lista = semEstoque.map(it => `${it.cor} ${it.medida}`).join(", ");
                        notify(`Sem estoque suficiente para: ${lista}. Desmarque "Descontar do estoque" para continuar.`, "error");
                        return;
                    }
                }

                // Soma o que já foi entregue via entregasParciais reais
                const entregueMap = {};
                const eps = order.entregasParciais ? Object.values(order.entregasParciais) : [];
                eps.forEach(e => {
                    (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                        const k = `${(ei.cor || "").trim()}|${ei.medida}`;
                        entregueMap[k] = (entregueMap[k] || 0) + Number(ei.qtd || 0);
                    });
                });

                // Itens que ainda têm saldo a descontar (ignora Poliéster)
                itensPendentes = itens
                    .filter(it => (it.tipo || "").toLowerCase() !== "poliéster" && (it.unidadeOriginal || "").toUpperCase() !== "KG")
                    .map(it => {
                        const k = `${(it.cor || "").trim()}|${it.medida}`;
                        const jaEntregue = entregueMap[k] || 0;
                        const restante = Math.max(0, (it.qtdTotal || 0) - jaEntregue);
                        return { ...it, _restante: restante };
                    })
                    .filter(it => it._restante > 0);

                if (itensPendentes.length > 0) {
                    const agora = new Date();
                    const novaEntregaKey = `conclusao_${Date.now()}`;
                    const itensEntrega = itensPendentes.map(it => ({ cor: it.cor, medida: it.medida, tipo: it.tipo, qtd: it._restante }));
                    updates[`orders/${orderId}/entregasParciais/${novaEntregaKey}`] = {
                        data: agora.toLocaleDateString("pt-BR"),
                        hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                        itens: itensEntrega,
                        obs: "Conclusão do pedido",
                        registradoPor: user.name,
                        descontouEstoque: descontarEstoque ? true : false,
                    };
                    // Seta qtdProduzida = qtdTotal diretamente para todos os itens
                    const itensList = Array.isArray(order.itens)
                        ? order.itens.map((it, i) => [String(i), it])
                        : Object.entries(order.itens || {});
                    itensList.forEach(([key, item]) => {
                        if ((item.tipo || "").toLowerCase() !== "poliéster") {
                            updates[`orders/${orderId}/itens/${key}/qtdProduzida`] = item.qtdTotal || 0;
                        }
                    });
                }
            }

            await update(ref(db, "/"), updates);
            // Registra saída no estoque para itens pendentes entregues
            if (descontarEstoque && order && itensPendentes && itensPendentes.length > 0) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                await Promise.all(itensPendentes.map(it => {
                    const isMetro = it.unidadeOriginal === "m" || it.unidadeOriginal === "Metro";
                    const qtdEst = isMetro ? (it.qtdOriginal || it._restante) : it._restante;
                    const unEst = isMetro ? "Metro" : (it.tipo === "Elástico" ? "Rolo" : "RL");
                    return push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: it.cor, medida: it.medida, tipo: it.tipo, qtd: qtdEst, unidade: unEst, timestamp: ts, operador: user.name });
                }));
            }
            notify(cancelado ? "Pedido cancelado." : "Pedido concluído!");
        } catch { notify("Erro ao concluir pedido.", "error"); }
    };

    const handleReverterConclusao = async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (!order || order.status !== "concluido") { notify("Pedido não está concluído.", "error"); return; }
        try {
            const updates = {};
            updates[`orders/${orderId}/status`] = "em_producao";
            updates[`orders/${orderId}/dataConclusao`] = null;
            updates[`orders/${orderId}/cancelado`] = null;

            const epsEntries = order.entregasParciais ? Object.entries(order.entregasParciais) : [];
            const conclusaoPair = epsEntries.filter(([, e]) => e.obs === "Conclusão do pedido").sort((a, b) => (a[0] < b[0] ? 1 : -1))[0];

            let itensParaReverterEstoque = [];
            if (conclusaoPair) {
                const [epKey, ep] = conclusaoPair;
                updates[`orders/${orderId}/entregasParciais/${epKey}`] = null;

                const itensList = Array.isArray(order.itens) ? order.itens.map((it, i) => [String(i), it]) : Object.entries(order.itens || {});
                const remaining = epsEntries.filter(([k]) => k !== epKey);
                const producedMap = {};
                remaining.forEach(([, e]) => {
                    (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                        const k = `${(ei.cor || "").trim()}|${ei.medida}`;
                        producedMap[k] = (producedMap[k] || 0) + Number(ei.qtd || 0);
                    });
                });
                itensList.forEach(([key, item]) => {
                    if ((item.tipo || "").toLowerCase() !== "poliéster") {
                        const k = `${(item.cor || "").trim()}|${item.medida}`;
                        updates[`orders/${orderId}/itens/${key}/qtdProduzida`] = producedMap[k] || 0;
                    }
                });

                if (ep.descontouEstoque) {
                    const epItens = Array.isArray(ep.itens) ? ep.itens : Object.values(ep.itens || {});
                    const itensOrig = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});
                    itensParaReverterEstoque = epItens.map(ei => {
                        const orig = itensOrig.find(it => (it.cor || "").trim() === (ei.cor || "").trim() && it.medida === ei.medida && it.tipo === ei.tipo);
                        const isMetro = orig && (orig.unidadeOriginal === "m" || orig.unidadeOriginal === "Metro");
                        const qtd = isMetro ? (orig.qtdOriginal || ei.qtd) : ei.qtd;
                        const unidade = isMetro ? "Metro" : (ei.tipo === "Elástico" ? "Rolo" : "RL");
                        return { cor: ei.cor, medida: ei.medida, tipo: ei.tipo, qtd, unidade };
                    });
                }
            }

            await update(ref(db, "/"), updates);

            if (itensParaReverterEstoque.length > 0) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                await Promise.all(itensParaReverterEstoque.map(it => push(ref(db, "estoqueMovimentos"), {
                    movimento: "entrada", cor: it.cor, medida: it.medida, tipo: it.tipo, qtd: it.qtd, unidade: it.unidade,
                    timestamp: ts, operador: user.name, obs: `Reversão da conclusão do pedido #${order.numero}`,
                })));
            }
            notify("Conclusão revertida! Pedido voltou para em produção.");
        } catch { notify("Erro ao reverter conclusão.", "error"); }
    };

    const handleSwapFita = async ({ cor, medida, tipo, novaCor }) => {
        try {
            const updates = {};
            machines.forEach(m => {
                const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
                let changed = false;
                const novasFitas = fitas.map(f => {
                    const fTipo = f.tipo || (m.tipo !== "Misto" ? m.tipo : null);
                    if ((f.cor || "").trim().toLowerCase() === cor.trim().toLowerCase() && f.medida === medida && fTipo === tipo) {
                        changed = true;
                        return { ...f, cor: novaCor };
                    }
                    return f;
                });
                if (changed) updates[`machines/${m.id}/fitas`] = novasFitas;
            });
            if (Object.keys(updates).length > 0) {
                await update(ref(db, "/"), updates);
                notify(`Fita trocada: ${cor} → ${novaCor}`);
            } else {
                notify("Nenhuma fita encontrada para trocar.", "error");
            }
        } catch { notify("Erro ao trocar fita.", "error"); }
    };

    const handleRecalcularDatas = async () => {
        const RL_POR_FITA_POR_TURNO = 2.5;
        const TURNOS_POR_DIA = 3;
        const BUFFER = 1.2;

        const specKey = (tipo, medida, cor) => `${tipo}|${medida}|${(cor || "").trim().toLowerCase()}`;

        // Capacidade por (tipo+medida+cor)
        const capacidadePorSpec = {};
        machines.forEach(m => {
            const fitas = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
            fitas.forEach(f => {
                const tipo = f.tipo || (m.tipo !== "Misto" ? m.tipo : null);
                if (!tipo) return;
                const k = specKey(tipo, f.medida, f.cor);
                capacidadePorSpec[k] = (capacidadePorSpec[k] || 0) + (f.qtd || 1) * RL_POR_FITA_POR_TURNO * TURNOS_POR_DIA;
            });
        });

        const pendingOrders = orders
            .filter(o => o.status === "em_producao" || o.status === "confirmacao")
            .sort((a, b) => (a.numero || 0) - (b.numero || 0));

        const filaPorSpec = {};
        const updates = {};

        pendingOrders.forEach(order => {
            const itens = Array.isArray(order.itens) ? order.itens : Object.values(order.itens || {});
            let maxDias = 0;
            itens.forEach(item => {
                if (!item.tipo) return;
                const k = specKey(item.tipo, item.medida, item.cor);
                const capacidade = capacidadePorSpec[k] || (RL_POR_FITA_POR_TURNO * TURNOS_POR_DIA);
                const pendente = Math.max(0, (item.qtdTotal || 0) - (item.qtdProduzida || 0));
                const fila = filaPorSpec[k] || 0;
                const dias = Math.ceil(((fila + pendente) / capacidade) * BUFFER);
                if (dias > maxDias) maxDias = dias;
            });
            if (maxDias > 0) {
                updates[`orders/${order.id}/dataEntrega`] = addWorkdays(today, maxDias);
            }
            itens.forEach(item => {
                if (!item.tipo) return;
                const k = specKey(item.tipo, item.medida, item.cor);
                const pendente = Math.max(0, (item.qtdTotal || 0) - (item.qtdProduzida || 0));
                filaPorSpec[k] = (filaPorSpec[k] || 0) + pendente;
            });
        });

        try {
            await update(ref(db, "/"), updates);
            notify(`Datas de ${Object.keys(updates).length} pedidos recalculadas!`);
        } catch { notify("Erro ao recalcular datas.", "error"); }
    };

    // Mapa specKey → { key, item } para atualizar qtdProduzida via Firebase
    const _itensPorSpec = (order) => {
        const map = {};
        if (!order?.itens) return map;
        const entries = Array.isArray(order.itens)
            ? order.itens.map((it, i) => [String(i), it])
            : Object.entries(order.itens);
        entries.forEach(([key, item]) => {
            const k = `${item.tipo}|${item.medida}|${(item.cor || "").trim().toLowerCase()}`;
            map[k] = { key, item };
        });
        return map;
    };

    const _aplicarDeltaEntrega = (orderId, order, itensEntrega, sinal, updates) => {
        const mapa = _itensPorSpec(order);
        itensEntrega.forEach(ei => {
            const k = `${ei.tipo}|${ei.medida}|${(ei.cor || "").trim().toLowerCase()}`;
            const found = mapa[k];
            if (!found) return;
            const atual = found.item.qtdProduzida || 0;
            // sinal=+1: nova entrega (soma ao total entregue, não ultrapassa qtdTotal)
            // sinal=-1: desfaz entrega (subtrai, não vai abaixo de 0)
            const total = found.item.qtdTotal || 0;
            const novo = sinal === +1
                ? Math.min(total, atual + (ei.qtd || 0))
                : Math.max(0, atual - (ei.qtd || 0));
            updates[`orders/${orderId}/itens/${found.key}/qtdProduzida`] = novo;
        });
    };

    const calcEstoqueAtual = () => {
        const mapa = {};
        const normUn = (tipo, u) => {
            if (tipo !== "Elástico") return "RL";
            if (!u || u === "RL" || u === "Rolo") return "Rolo";
            return "Metro";
        };
        const add = (tipo, medida, cor, delta, u) => {
            if (!tipo || !medida) return;
            const un = normUn(tipo, u);
            const k = `${tipo}|${medida}|${(cor || "").trim()}|${un}`;
            if (!mapa[k]) mapa[k] = 0;
            mapa[k] = Math.max(0, Math.round((mapa[k] + delta) * 10) / 10);
        };
        // Estoque = soma total (Math.max só no final)
        const parseTSEst = (ts) => { if (!ts || typeof ts !== "string") return 0; const [d,m,y] = (ts.split(", ")[0]||"").split("/"); const t = ts.split(", ")[1]||"00:00:00"; return new Date(`${y}-${m}-${d}T${t}`).getTime()||0; };
        const movOrd = [...estoqueMovimentos].sort((a, b) => parseTSEst(a.timestamp) - parseTSEst(b.timestamp));
        movOrd.forEach(m => {
            add(m.tipo, m.medida, m.cor, m.movimento === "entrada" ? Number(m.qtd) : -Number(m.qtd), m.unidade);
        });
        return mapa;
    };

    const handleEntregaParcial = async (orderId, { itens, obs, editKey, itensPrevios, descontarEstoque = true }) => {
        const totalQtd = itens.reduce((a, i) => a + i.qtd, 0);
        const agora = new Date();
        const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const data = agora.toLocaleDateString("pt-BR");
        const order = orders.find(o => o.id === orderId);
        const updates = {};

        if (!editKey && descontarEstoque) {
            const estoque = calcEstoqueAtual();
            const semEstoque = itens.filter(ei => {
                if ((ei.tipo || "").toLowerCase() === "poliéster") return false;
                if ((ei.unidadeOriginal || "").toUpperCase() === "KG") return false;
                const isMetro = ei.unidadeOriginal === "m" || ei.unidadeOriginal === "Metro";
                const un = ei.tipo !== "Elástico" ? "RL" : (isMetro ? "Metro" : "Rolo");
                const qtdCheck = isMetro ? (ei.qtdOriginal || ei.qtd) : ei.qtd;
                const k = `${ei.tipo}|${ei.medida}|${(ei.cor || "").trim()}|${un}`;
                return (estoque[k] || 0) < (qtdCheck || 0);
            });
            if (semEstoque.length > 0) {
                const lista = semEstoque.map(ei => `${ei.cor} ${ei.medida}`).join(", ");
                notify(`Sem estoque suficiente para: ${lista}. Desmarque "Descontar do estoque" para continuar.`, "error");
                return;
            }
        }

        const toSaidaParams = (ei) => {
            const isMetro = ei.unidadeOriginal === "m" || ei.unidadeOriginal === "Metro";
            return {
                qtd:     isMetro ? (ei.qtdOriginal || ei.qtd) : ei.qtd,
                unidade: isMetro ? "Metro" : (ei.tipo === "Elástico" ? "Rolo" : "RL"),
            };
        };
        const isKgItem = (ei) => (ei.unidadeOriginal || "").toUpperCase() === "KG";
        const pushMovimentos = (lista, movimento, ts) =>
            Promise.all(lista
                .filter(ei => (ei.tipo || "").toLowerCase() !== "poliéster" && !isKgItem(ei) && (ei.qtd || 0) > 0)
                .map(ei => {
                    const { qtd, unidade } = toSaidaParams(ei);
                    return push(ref(db, "estoqueMovimentos"), { movimento, cor: ei.cor, medida: ei.medida, tipo: ei.tipo, qtd, unidade, timestamp: ts, operador: user.name });
                })
            );

        try {
            if (editKey) {
                if (itensPrevios?.length) _aplicarDeltaEntrega(orderId, order, itensPrevios, -1, updates);
                _aplicarDeltaEntrega(orderId, order, itens, +1, updates);
                updates[`orders/${orderId}/entregasParciais/${editKey}/itens`] = itens;
                updates[`orders/${orderId}/entregasParciais/${editKey}/obs`] = obs || "";
                await update(ref(db, "/"), updates);
                const snap = await get(ref(db, `orders/${orderId}/entregasParciais/${editKey}`));
                const entregaAnterior = snap.val();
                const tinhaEstoque = entregaAnterior?.descontouEstoque === true;
                if (tinhaEstoque) {
                    const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                    if (itensPrevios?.length) await pushMovimentos(itensPrevios, "entrada", ts);
                    await pushMovimentos(itens, "saida", ts);
                }
                notify(`Entrega atualizada!`);
            } else {
                // Nova entrega: +1 soma ao total entregue (qtdProduzida)
                const newRef = push(ref(db, `orders/${orderId}/entregasParciais`));
                updates[`orders/${orderId}/entregasParciais/${newRef.key}`] = { data, hora, itens, obs: obs || "", registradoPor: user.name, descontouEstoque: descontarEstoque ? true : false };
                _aplicarDeltaEntrega(orderId, order, itens, +1, updates);
                await update(ref(db, "/"), updates);
                if (descontarEstoque) await pushMovimentos(itens, "saida", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));
                notify(`Entrega parcial de ${totalQtd} RL registrada!`);
            }
        } catch { notify("Erro ao registrar entrega.", "error"); }
    };

    const handleDeleteEntregaParcial = async (orderId, entregaKey) => {
        try {
            const snap = await get(ref(db, `orders/${orderId}/entregasParciais/${entregaKey}`));
            const entry = snap.val();
            const order = orders.find(o => o.id === orderId);
            const updates = {};
            if (entry?.itens && order) {
                _aplicarDeltaEntrega(orderId, order, entry.itens, -1, updates);
            }
            // Se o pedido estava concluído e essa entrega era o que fechava o total,
            // remover a entrega deixa itens pendentes de novo — reabre o pedido.
            if (order?.status === "concluido") {
                const itensAtuais = Array.isArray(order.itens)
                    ? order.itens.map((it, i) => [String(i), it])
                    : Object.entries(order.itens || {});
                const aindaCompleto = itensAtuais.every(([key, it]) => {
                    const novaQtd = updates[`orders/${orderId}/itens/${key}/qtdProduzida`];
                    const qtdProduzida = novaQtd !== undefined ? novaQtd : (it.qtdProduzida || 0);
                    return qtdProduzida >= (it.qtdTotal || 0);
                });
                if (!aindaCompleto) {
                    updates[`orders/${orderId}/status`] = "em_producao";
                    updates[`orders/${orderId}/dataConclusao`] = null;
                }
            }
            await remove(ref(db, `orders/${orderId}/entregasParciais/${entregaKey}`));
            if (Object.keys(updates).length) await update(ref(db, "/"), updates);
            // Reverte saída do estoque apenas se a entrega original descontou
            if (entry?.itens && entry.descontouEstoque === true && !entregaKey.startsWith("conclusao_")) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                const itensList = Array.isArray(entry.itens) ? entry.itens : Object.values(entry.itens || {});
                await Promise.all(itensList
                    .filter(ei => (ei.tipo || "").toLowerCase() !== "poliéster" && (ei.unidadeOriginal || "").toUpperCase() !== "KG" && (ei.qtd || 0) > 0)
                    .map(ei => {
                        const isMetro = ei.unidadeOriginal === "m" || ei.unidadeOriginal === "Metro";
                        const qtd     = isMetro ? (ei.qtdOriginal || ei.qtd) : ei.qtd;
                        const unidade = isMetro ? "Metro" : (ei.tipo === "Elástico" ? "Rolo" : "RL");
                        return push(ref(db, "estoqueMovimentos"), { movimento: "entrada", cor: ei.cor, medida: ei.medida, tipo: ei.tipo, qtd, unidade, timestamp: ts, operador: user.name });
                    })
                );
            }
            notify("Entrega removida!");
        } catch { notify("Erro ao remover entrega.", "error"); }
    };


    const handleRecalcularEntregas = async () => {
        try {
            const snap = await get(ref(db, "orders"));
            const data = snap.val();
            if (!data) { notify("Nenhum pedido encontrado."); return; }
            const updates = {};
            Object.entries(data).forEach(([orderId, order]) => {
                const itens = Array.isArray(order.itens)
                    ? order.itens.map((it, i) => [String(i), it])
                    : Object.entries(order.itens || {});
                if (!itens.length) return;
                // soma qtd entregue por spec
                const somaPorSpec = {};
                const entregasObj = order.entregasParciais || {};
                Object.values(entregasObj).forEach(e => {
                    const eitens = Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {});
                    eitens.forEach(ei => {
                        const k = `${ei.tipo}|${ei.medida}|${(ei.cor || "").trim().toLowerCase()}`;
                        somaPorSpec[k] = (somaPorSpec[k] || 0) + Number(ei.qtd || 0);
                    });
                });
                // aplica ao qtdProduzida de cada item
                let aindaCompleto = true;
                itens.forEach(([key, item]) => {
                    const k = `${item.tipo}|${item.medida}|${(item.cor || "").trim().toLowerCase()}`;
                    const total = somaPorSpec[k] || 0;
                    const novo = Math.min(total, item.qtdTotal || 0);
                    if (novo !== (item.qtdProduzida || 0)) {
                        updates[`orders/${orderId}/itens/${key}/qtdProduzida`] = novo;
                    }
                    if (novo < (item.qtdTotal || 0)) aindaCompleto = false;
                });
                // Pedido marcado como concluído mas que não tem mais entregas suficientes (ex: entrega excluída) volta pra produção
                if (order.status === "concluido" && !aindaCompleto) {
                    updates[`orders/${orderId}/status`] = "em_producao";
                    updates[`orders/${orderId}/dataConclusao`] = null;
                }
            });
            if (!Object.keys(updates).length) { notify("Tudo já está correto!"); return; }
            await update(ref(db, "/"), updates);
            notify(`Corrigido: ${Object.keys(updates).length} item(ns) atualizado(s)!`);
        } catch { notify("Erro ao recalcular.", "error"); }
    };

    // ── Produção ─────────────────────────────────────────────
    const handleSolicitarEtiqueta = async (dados) => {
        try {
            await push(ref(db, "etiquetasFila"), dados);
            notify("Etiqueta enviada para impressão!");
        } catch { notify("Erro ao solicitar etiqueta.", "error"); }
    };

    const handleLimparFilaEtiquetas = async () => {
        try {
            await set(ref(db, "etiquetasFila"), null);
            notify("Fila limpa!");
        } catch { notify("Erro ao limpar fila.", "error"); }
    };

    const handleSolicitarColeta = async (dados) => {
        try {
            await push(ref(db, "coletasFila"), dados);
            notify("Solicitação de coleta enviada!");
        } catch { notify("Erro ao solicitar coleta.", "error"); }
    };

    const handleMarcarColetado = async (id, finalizadoPor) => {
        try {
            await update(ref(db, `coletasFila/${id}`), { status: "coletado", finalizadoPor });
        } catch { notify("Erro ao atualizar coleta.", "error"); }
    };

    const handleExcluirColeta = async (id) => {
        try {
            await remove(ref(db, `coletasFila/${id}`));
        } catch { notify("Erro ao excluir coleta.", "error"); }
    };

    const handleSolicitarMercadoria = async (dados) => {
        try {
            await push(ref(db, "mercadoriaFila"), dados);
            notify("Solicitação de mercadoria enviada!");
        } catch { notify("Erro ao solicitar mercadoria.", "error"); }
    };

    const handleMarcarMercadoriaAtendida = async (id, finalizadoPor) => {
        try {
            await update(ref(db, `mercadoriaFila/${id}`), { status: "atendido", finalizadoPor });
        } catch { notify("Erro ao atualizar solicitação.", "error"); }
    };

    const handleExcluirMercadoria = async (id) => {
        try {
            await remove(ref(db, `mercadoriaFila/${id}`));
        } catch { notify("Erro ao excluir solicitação.", "error"); }
    };


    // ── TNT ───────────────────────────────────────────────────
    const handleAddTNTPedido = async (dados) => {
        try {
            const counterSnap = await get(ref(db, "tntOrderCounter"));
            const numero = (counterSnap.val() || 0) + 1;
            await push(ref(db, "tntPedidos"), { ...dados, numero, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            await set(ref(db, "tntOrderCounter"), numero);
            notify(`Pedido TNT #${numero} criado!`);
        } catch { notify("Erro ao adicionar pedido TNT.", "error"); }
    };
    const handleUpdateTNTPedido = async (id, changes) => {
        try { await update(ref(db, `tntPedidos/${id}`), changes); }
        catch { notify("Erro ao atualizar pedido TNT.", "error"); }
    };

    const handleConcluirTNTPedido = async (id) => {
        const pedido = tntPedidos.find(p => p.id === id);
        if (!pedido) return;
        const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

        // Saldo atual por código (normaliza aliases)
        const saldos = {};
        tntEstoque.forEach(m => {
            const cod = TNT_CODIGO_ALIAS[m.codigo] || m.codigo;
            saldos[cod] = (saldos[cod] || 0) + (m.tipo === "entrada" ? Number(m.qtd) : -Number(m.qtd));
        });

        // Verifica estoque suficiente
        const semEstoque = itens.filter(item => (saldos[item.codigo] || 0) < item.quantidade);
        if (semEstoque.length > 0) {
            const lista = semEstoque.map(i => `${i.codigo} (tem ${Math.max(0, saldos[i.codigo] || 0)}, precisa ${i.quantidade})`).join(" · ");
            notify(`Estoque insuficiente: ${lista}`, "error");
            return;
        }

        try {
            const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
            await update(ref(db, `tntPedidos/${id}`), { status: "concluido" });
            await Promise.all(itens.map(item =>
                push(ref(db, "tntEstoque"), {
                    tipo: "saida",
                    codigo: item.codigo,
                    largura: item.largura,
                    gramatura: item.gramatura,
                    cor: item.cor,
                    metragem: item.metragem,
                    qtd: item.quantidade,
                    operador: user.name,
                    timestamp: ts,
                })
            ));
            notify("Pedido TNT concluído! Estoque baixado.");
        } catch { notify("Erro ao concluir pedido TNT.", "error"); }
    };
    const handleDeleteTNTPedido = async (id) => {
        try {
            const pedido = tntPedidos.find(p => p.id === id);
            // Se o estoque já foi baixado (faturado), estorna antes de excluir
            if (pedido && (pedido.status === "faturado" || pedido.status === "concluido")) {
                const itens = Array.isArray(pedido.itens) ? pedido.itens : Object.values(pedido.itens || {});
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                await Promise.all(itens.map(item =>
                    push(ref(db, "tntEstoque"), {
                        tipo: "entrada", codigo: item.codigo, largura: item.largura,
                        gramatura: item.gramatura, cor: item.cor, metragem: item.metragem,
                        qtd: item.quantidade, operador: user.name, timestamp: ts,
                        cliente: pedido.cliente || "", pedidoNumero: pedido.numero ?? null, estorno: true,
                    })
                ));
            }
            await remove(ref(db, `tntPedidos/${id}`));
            notify("Pedido TNT removido.");
        } catch { notify("Erro ao remover pedido TNT.", "error"); }
    };

    const handleCadastrarClienteTNT = async ({ nome, vendedor }) => {
        try {
            await push(ref(db, "clientes"), { nome, vendedor: vendedor || "" });
            notify(`Cliente "${nome}" cadastrado!`);
        } catch { notify("Erro ao cadastrar cliente.", "error"); }
    };

    const handleAddVendedor = async (nome) => {
        const nomeTrim = (nome || "").trim();
        if (!nomeTrim) return;
        if (vendedores.some(v => v.nome.toLowerCase() === nomeTrim.toLowerCase())) {
            notify("Vendedor já cadastrado.", "error"); return;
        }
        try {
            await push(ref(db, "vendedores"), { nome: nomeTrim });
            notify(`Vendedor "${nomeTrim}" cadastrado!`);
        } catch { notify("Erro ao cadastrar vendedor.", "error"); }
    };

    const handleDeleteVendedor = async (key) => {
        try {
            await remove(ref(db, `vendedores/${key}`));
            notify("Vendedor removido!");
        } catch { notify("Erro ao remover vendedor.", "error"); }
    };

    const handleEditVendedor = async (key, novoNome) => {
        const nomeTrim = (novoNome || "").trim();
        if (!nomeTrim) return;
        if (vendedores.some(v => v.key !== key && v.nome.toLowerCase() === nomeTrim.toLowerCase())) {
            notify("Já existe um vendedor com esse nome.", "error"); return;
        }
        const atual = vendedores.find(v => v.key === key);
        try {
            await update(ref(db, `vendedores/${key}`), { nome: nomeTrim });
            if (atual && atual.nome !== nomeTrim) {
                const clientesDoVendedor = clientes.filter(c => c.vendedor === atual.nome);
                await Promise.all(clientesDoVendedor.map(c => update(ref(db, `clientes/${c.key}`), { vendedor: nomeTrim })));
            }
            notify("Vendedor atualizado!");
        } catch { notify("Erro ao atualizar vendedor.", "error"); }
    };

    const handleTNTMovimento = async (dados) => {
        try {
            await push(ref(db, "tntEstoque"), { ...dados, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            notify(dados.tipo === "entrada" ? `Entrada: ${dados.qtd} bobina(s) — ${dados.codigo}` : `Saída: ${dados.qtd} bobina(s) — ${dados.codigo}`);
        } catch { notify("Erro ao registrar movimentação TNT.", "error"); }
    };

    // ── Cordões ───────────────────────────────────────────────
    const handleAddCordoesPedido = async (dados) => {
        try {
            const counterSnap = await get(ref(db, "cordoesOrderCounter"));
            const numero = (counterSnap.val() || 0) + 1;
            await push(ref(db, "cordoesPedidos"), { ...dados, numero, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            await set(ref(db, "cordoesOrderCounter"), numero);
            notify(`Pedido de Cordões #${numero} criado!`);
        } catch { notify("Erro ao adicionar pedido de Cordões.", "error"); }
    };
    const handleUpdateCordoesPedido = async (id, changes) => {
        try { await update(ref(db, `cordoesPedidos/${id}`), changes); }
        catch { notify("Erro ao atualizar pedido de Cordões.", "error"); }
    };
    const handleConcluirCordoesPedido = async (id) => {
        const pedido = cordoesPedidos.find(p => p.id === id);
        if (!pedido) return;
        const itens = Array.isArray(pedido.itens) ? pedido.itens : Object.values(pedido.itens || {});
        try {
            const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

            // Desconta apenas o que ainda não foi entregue via entregas parciais
            const entregueMap = {};
            const eps = pedido.entregasParciais ? Object.values(pedido.entregasParciais) : [];
            eps.forEach(e => {
                (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                    const k = `${ei.tipo}|${(ei.cor || "").trim().toLowerCase()}`;
                    entregueMap[k] = (entregueMap[k] || 0) + Number(ei.qtd || 0);
                });
            });
            const itensPendentes = itens
                .map(it => {
                    const k = `${it.tipo}|${(it.cor || "").trim().toLowerCase()}`;
                    const jaEntregue = entregueMap[k] || 0;
                    return { ...it, _restante: Math.max(0, (it.quantidade || 0) - jaEntregue) };
                })
                .filter(it => it._restante > 0);

            const updates = { [`cordoesPedidos/${id}/status`]: "concluido" };
            if (itensPendentes.length > 0) {
                const agora = new Date();
                updates[`cordoesPedidos/${id}/entregasParciais/conclusao_${Date.now()}`] = {
                    data: agora.toLocaleDateString("pt-BR"),
                    hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                    itens: itensPendentes.map(it => ({ tipo: it.tipo, cor: it.cor, qtd: it._restante })),
                    obs: "Conclusão do pedido",
                    registradoPor: user.name,
                    descontouEstoque: true,
                };
            }
            await update(ref(db, "/"), updates);
            if (itensPendentes.length > 0) {
                await Promise.all(itensPendentes.map(item =>
                    push(ref(db, "cordoesEstoque"), {
                        direcao: "saida",
                        tipoCordao: item.tipo,
                        cor: item.cor,
                        qtd: item._restante,
                        operador: user.name,
                        timestamp: ts,
                    })
                ));
            }
            notify("Pedido de Cordões concluído! Estoque baixado.");
        } catch { notify("Erro ao concluir pedido de Cordões.", "error"); }
    };
    const handleDeleteCordoesPedido = async (id) => {
        try {
            const pedido = cordoesPedidos.find(p => p.id === id);
            // Estorna qualquer entrega (parcial ou de conclusão) que já tenha descontado estoque
            const eps = pedido?.entregasParciais ? Object.values(pedido.entregasParciais) : [];
            const paraEstornar = eps.filter(e => e.descontouEstoque === true);
            if (paraEstornar.length > 0) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                await Promise.all(paraEstornar.flatMap(e => {
                    const itensList = Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {});
                    return itensList.filter(ei => Number(ei.qtd || 0) > 0).map(ei =>
                        push(ref(db, "cordoesEstoque"), { direcao: "entrada", tipoCordao: ei.tipo, cor: ei.cor, qtd: ei.qtd, operador: user.name, timestamp: ts })
                    );
                }));
            }
            await remove(ref(db, `cordoesPedidos/${id}`));
            notify("Pedido de Cordões removido.");
        } catch { notify("Erro ao remover pedido de Cordões.", "error"); }
    };
    const handleEntregaParcialCordoes = async (pedidoId, { itens, obs, editKey, itensPrevios, descontarEstoque = true }) => {
        const totalQtd = itens.reduce((a, i) => a + Number(i.qtd || 0), 0);
        const agora = new Date();
        const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const data = agora.toLocaleDateString("pt-BR");
        const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const pushMovimentos = (lista, direcao) =>
            Promise.all(lista.filter(ei => Number(ei.qtd || 0) > 0).map(ei =>
                push(ref(db, "cordoesEstoque"), { direcao, tipoCordao: ei.tipo, cor: ei.cor, qtd: ei.qtd, operador: user.name, timestamp: ts })
            ));
        try {
            if (editKey) {
                const snapAntes = await get(ref(db, `cordoesPedidos/${pedidoId}/entregasParciais/${editKey}`));
                const tinhaEstoque = snapAntes.val()?.descontouEstoque === true;
                await update(ref(db, `cordoesPedidos/${pedidoId}/entregasParciais/${editKey}`), { itens, obs: obs || "" });
                if (tinhaEstoque) {
                    if (itensPrevios?.length) await pushMovimentos(itensPrevios, "entrada");
                    await pushMovimentos(itens, "saida");
                }
                notify("Entrega atualizada!");
            } else {
                await push(ref(db, `cordoesPedidos/${pedidoId}/entregasParciais`), { data, hora, itens, obs: obs || "", registradoPor: user.name, descontouEstoque: descontarEstoque ? true : false });
                if (descontarEstoque) await pushMovimentos(itens, "saida");
                notify(`Entrega parcial de ${totalQtd} RL registrada!`);
            }
        } catch { notify("Erro ao registrar entrega.", "error"); }
    };
    const handleDeleteEntregaParcialCordoes = async (pedidoId, entregaKey) => {
        try {
            const snap = await get(ref(db, `cordoesPedidos/${pedidoId}/entregasParciais/${entregaKey}`));
            const entry = snap.val();
            await remove(ref(db, `cordoesPedidos/${pedidoId}/entregasParciais/${entregaKey}`));
            if (entry?.itens && entry.descontouEstoque === true && !entregaKey.startsWith("conclusao_")) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                const itensList = Array.isArray(entry.itens) ? entry.itens : Object.values(entry.itens || {});
                await Promise.all(itensList.filter(ei => Number(ei.qtd || 0) > 0).map(ei =>
                    push(ref(db, "cordoesEstoque"), { direcao: "entrada", tipoCordao: ei.tipo, cor: ei.cor, qtd: ei.qtd, operador: user.name, timestamp: ts })
                ));
            }
            notify("Entrega removida!");
        } catch { notify("Erro ao remover entrega.", "error"); }
    };
    const handleCordoesMovimento = async (dados) => {
        try {
            await push(ref(db, "cordoesEstoque"), { ...dados, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            notify(dados.direcao === "entrada" ? `Entrada: ${dados.qtd} — ${dados.tipoCordao}` : `Saída: ${dados.qtd} — ${dados.tipoCordao}`);
        } catch { notify("Erro ao registrar movimentação de Cordões.", "error"); }
    };

    const handleFioMovimento = async (dados) => {
        try {
            await push(ref(db, "fioEstoque"), { ...dados, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            notify(dados.direcao === "entrada" ? `Entrada de fio: ${dados.qtd} kg — ${dados.cor}` : `Saída de fio: ${dados.qtd} kg — ${dados.cor}`);
        } catch { notify("Erro ao registrar movimentação de fio.", "error"); }
    };

    const handleAddCordoesApontamento = async (dados) => {
        try {
            const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
            await push(ref(db, "cordoesApontamento"), { ...dados, timestamp: ts });
            if (Number(dados.qtd) > 0) {
                await push(ref(db, "cordoesEstoque"), { direcao: "entrada", tipoCordao: dados.tipo, cor: dados.cor, qtd: Number(dados.qtd), operador: user.name, timestamp: ts });
            }
            const kgFio = kgFioDoCordoes(dados.tipo, dados.qtd, PESO_KG_POR_RL);
            if (kgFio > 0) {
                await push(ref(db, "fioEstoque"), { direcao: "saida", cor: dados.cor, qtd: kgFio, operador: user.name, origem: `Cordões (${dados.tipo})`, timestamp: ts });
            }
            notify(`Apontamento de ${dados.qtd} un. (${dados.tipo} · ${dados.cor}) registrado!`);
        } catch { notify("Erro ao registrar apontamento de Cordões.", "error"); }
    };
    const handleUpdateCordoesApontamento = async (id, changes) => {
        try {
            const original = cordoesApontamentos.find(l => l.id === id);
            await update(ref(db, `cordoesApontamento/${id}`), changes);
            if (original) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                if (Number(original.qtd) > 0) {
                    await push(ref(db, "cordoesEstoque"), { direcao: "saida", tipoCordao: original.tipo, cor: original.cor, qtd: Number(original.qtd), operador: user.name, timestamp: ts });
                }
                const novoQtd = changes.qtd !== undefined ? Number(changes.qtd) : Number(original.qtd);
                if (novoQtd > 0) {
                    await push(ref(db, "cordoesEstoque"), { direcao: "entrada", tipoCordao: changes.tipo || original.tipo, cor: changes.cor || original.cor, qtd: novoQtd, operador: user.name, timestamp: ts });
                }
                const kgOrig = kgFioDoCordoes(original.tipo, original.qtd, PESO_KG_POR_RL);
                if (kgOrig > 0) {
                    await push(ref(db, "fioEstoque"), { direcao: "entrada", cor: original.cor, qtd: kgOrig, operador: user.name, origem: `Cordões (${original.tipo})`, timestamp: ts });
                }
                const kgNovo = kgFioDoCordoes(changes.tipo || original.tipo, novoQtd, PESO_KG_POR_RL);
                if (kgNovo > 0) {
                    await push(ref(db, "fioEstoque"), { direcao: "saida", cor: changes.cor || original.cor, qtd: kgNovo, operador: user.name, origem: `Cordões (${changes.tipo || original.tipo})`, timestamp: ts });
                }
            }
            notify("Apontamento atualizado! Estoque ajustado.");
        } catch { notify("Erro ao atualizar apontamento.", "error"); }
    };
    const handleDeleteCordoesApontamento = async (id) => {
        try {
            const original = cordoesApontamentos.find(l => l.id === id);
            await remove(ref(db, `cordoesApontamento/${id}`));
            if (original && Number(original.qtd) > 0) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                await push(ref(db, "cordoesEstoque"), { direcao: "saida", tipoCordao: original.tipo, cor: original.cor, qtd: Number(original.qtd), operador: user.name, timestamp: ts });
                const kgOrig = kgFioDoCordoes(original.tipo, original.qtd, PESO_KG_POR_RL);
                if (kgOrig > 0) {
                    await push(ref(db, "fioEstoque"), { direcao: "entrada", cor: original.cor, qtd: kgOrig, operador: user.name, origem: `Cordões (${original.tipo})`, timestamp: ts });
                }
            }
            notify("Apontamento removido. Estoque revertido.");
        } catch { notify("Erro ao remover apontamento.", "error"); }
    };
    const handleFinalizarDiaCordoes = async (data) => {
        try {
            const key = data.replace(/\//g, "-");
            await set(ref(db, `cordoesDiasFinalizados/${key}`), { data, finalizadoPor: user.name, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            notify(`Dia ${data} finalizado!`);
        } catch { notify("Erro ao finalizar o dia.", "error"); }
    };
    const handleReabrirDiaCordoes = async (data) => {
        try {
            const key = data.replace(/\//g, "-");
            await remove(ref(db, `cordoesDiasFinalizados/${key}`));
            notify(`Dia ${data} reaberto!`);
        } catch { notify("Erro ao reabrir o dia.", "error"); }
    };

    const handleAddViesApontamento = async (dados) => {
        try {
            await push(ref(db, "viesApontamento"), { ...dados, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            notify(`Apontamento de ${dados.qtd} un. (${dados.medida} · ${dados.cor}) registrado!`);
        } catch { notify("Erro ao registrar apontamento de Viés.", "error"); }
    };
    const handleUpdateViesApontamento = async (id, changes) => {
        try { await update(ref(db, `viesApontamento/${id}`), changes); notify("Apontamento atualizado!"); }
        catch { notify("Erro ao atualizar apontamento.", "error"); }
    };
    const handleDeleteViesApontamento = async (id) => {
        try { await remove(ref(db, `viesApontamento/${id}`)); notify("Apontamento removido."); }
        catch { notify("Erro ao remover apontamento.", "error"); }
    };
    const handleAddViesPedido = async (dados) => {
        try {
            const counterSnap = await get(ref(db, "viesOrderCounter"));
            const numero = (counterSnap.val() || 0) + 1;
            await push(ref(db, "viesPedidos"), { ...dados, numero, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            await set(ref(db, "viesOrderCounter"), numero);
            notify(`Pedido de Viés #${numero} criado!`);
        } catch { notify("Erro ao criar pedido de Viés.", "error"); }
    };
    const handleUpdateViesPedido = async (id, changes) => {
        try { await update(ref(db, `viesPedidos/${id}`), changes); notify("Pedido de Viés atualizado!"); }
        catch { notify("Erro ao atualizar pedido de Viés.", "error"); }
    };
    const handleDeleteViesPedido = async (id) => {
        try { await remove(ref(db, `viesPedidos/${id}`)); notify("Pedido de Viés removido."); }
        catch { notify("Erro ao remover pedido de Viés.", "error"); }
    };
    const handleReabrirDiaVies = async (data) => {
        try {
            const key = data.replace(/\//g, "-");
            await remove(ref(db, `viesDiasFinalizados/${key}`));
            notify(`Dia ${data} reaberto!`);
        } catch { notify("Erro ao reabrir o dia.", "error"); }
    };

    // Finaliza automaticamente dias anteriores do Viés que ainda têm apontamentos
    // em aberto, sem depender de alguém clicar em "Finalizar Dia" (evita esquecimento).
    useEffect(() => {
        const autoFinalizarDiasAnterioresVies = async () => {
            const hoje = new Date().toLocaleDateString("pt-BR");
            const diasJaFinalizados = new Set(viesDiasFinalizados.map(d => d.data));
            const diasComApontamento = new Set(viesApontamentos.map(l => l.data).filter(Boolean));
            for (const dia of diasComApontamento) {
                if (dia === hoje || diasJaFinalizados.has(dia)) continue;
                const key = dia.replace(/\//g, "-");
                try {
                    await set(ref(db, `viesDiasFinalizados/${key}`), { data: dia, finalizadoPor: "Automático (00h)", timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
                } catch { /* tenta novamente no próximo ciclo */ }
            }
        };
        autoFinalizarDiasAnterioresVies();
        const interval = setInterval(autoFinalizarDiasAnterioresVies, 60000);
        return () => clearInterval(interval);
    }, [viesApontamentos, viesDiasFinalizados]);

    const handleSolicitarTNTEtiqueta = async (dados) => {
        try {
            await push(ref(db, "tntEtiquetasFila"), dados);
            notify("Etiqueta TNT enviada para impressão!");
        } catch { notify("Erro ao solicitar etiqueta TNT.", "error"); }
    };

    const handleSolicitarLoteEtiquetasTNT = async (lote) => {
        try {
            await Promise.all(lote.map(d => push(ref(db, "tntEtiquetasFila"), d)));
            notify(`${lote.length} etiqueta${lote.length !== 1 ? "s" : ""} TNT enviada${lote.length !== 1 ? "s" : ""} para impressão!`);
        } catch { notify("Erro ao enviar etiquetas TNT.", "error"); }
    };

    // Confere estoque TNT para os itens do pedido: normaliza códigos antigos e soma linhas repetidas do mesmo código.
    // descontarReservaDe: na separação, desconta o que já está separado por outros pedidos aguardando faturamento.
    const faltaEstoqueTNT = (itens, descontarReservaDe = null) => {
        const saldos = {};
        tntEstoque.forEach(m => {
            const cod = TNT_CODIGO_ALIAS[m.codigo] || m.codigo;
            saldos[cod] = (saldos[cod] || 0) + (m.tipo === "entrada" ? Number(m.qtd) : -Number(m.qtd));
        });
        if (descontarReservaDe) {
            tntPedidos.filter(p => p.status === "aguardando_faturamento" && p.id !== descontarReservaDe).forEach(p => {
                (Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {})).filter(Boolean).forEach(i => {
                    const cod = TNT_CODIGO_ALIAS[i.codigo] || i.codigo;
                    saldos[cod] = (saldos[cod] || 0) - (Number(i.quantidade) || 0);
                });
            });
        }
        const precisa = {};
        itens.forEach(i => {
            const cod = TNT_CODIGO_ALIAS[i.codigo] || i.codigo;
            precisa[cod] = (precisa[cod] || 0) + (Number(i.quantidade) || 0);
        });
        const falta = Object.entries(precisa).filter(([cod, q]) => (saldos[cod] || 0) < q);
        return falta.length ? falta.map(([cod, q]) => `${cod} (tem ${Math.max(0, saldos[cod] || 0)}${descontarReservaDe ? " livre" : ""}, precisa ${q})`).join(" · ") : "";
    };
    // Evita que um clique duplo (ou dois aparelhos) separe/fature o mesmo pedido duas vezes
    const tntEmAndamento = useRef(new Set());

    const handleSepararTNTPedido = async (id) => {
        const pedido = tntPedidos.find(p => p.id === id);
        if (!pedido || pedido.status !== "pendente" || tntEmAndamento.current.has(id)) return;
        const itens = (Array.isArray(pedido.itens) ? pedido.itens : Object.values(pedido.itens || {})).filter(Boolean);

        // Só checagem — a baixa real acontece no faturamento
        const falta = faltaEstoqueTNT(itens, id);
        if (falta) { notify(`Estoque insuficiente: ${falta}`, "error"); return; }

        tntEmAndamento.current.add(id);
        try {
            const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
            await update(ref(db, `tntPedidos/${id}`), {
                status: "aguardando_faturamento",
                separadoPor: user.name,
                timestampSeparacao: ts,
            });
            notify("Separação confirmada!");
        } catch { notify("Erro ao confirmar separação.", "error"); }
        finally { tntEmAndamento.current.delete(id); }
    };

    const handleFaturarTNTPedido = async (id) => {
        const pedido = tntPedidos.find(p => p.id === id);
        if (!pedido || pedido.status !== "aguardando_faturamento" || tntEmAndamento.current.has(id)) return;
        const itens = (Array.isArray(pedido.itens) ? pedido.itens : Object.values(pedido.itens || {})).filter(Boolean);

        // Baixa real do estoque acontece aqui (revalida saldo pois pode ter mudado desde a separação)
        const falta = faltaEstoqueTNT(itens);
        if (falta) { notify(`Estoque insuficiente: ${falta}`, "error"); return; }

        tntEmAndamento.current.add(id);
        try {
            // Status do pedido e saídas de estoque gravados juntos: ou vai tudo, ou nada
            const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
            const updates = {
                [`tntPedidos/${id}/status`]: "faturado",
                [`tntPedidos/${id}/faturadoPor`]: user.name,
                [`tntPedidos/${id}/timestampFaturamento`]: ts,
            };
            itens.forEach(item => {
                updates[`tntEstoque/${push(ref(db, "tntEstoque")).key}`] = {
                    tipo: "saida", codigo: item.codigo, largura: item.largura,
                    gramatura: item.gramatura, cor: item.cor, metragem: item.metragem,
                    qtd: item.quantidade, operador: user.name, timestamp: ts,
                    cliente: pedido.cliente || "", pedidoNumero: pedido.numero ?? null,
                };
            });
            await update(ref(db), updates);
            notify("Pedido faturado! Estoque baixado.");
        } catch { notify("Erro ao faturar pedido TNT.", "error"); }
        finally { tntEmAndamento.current.delete(id); }
    };

    const handleMarcarTNTEtiquetaImpresso = async (id) => {
        try { await update(ref(db, `tntEtiquetasFila/${id}`), { status: "impresso" }); }
        catch { notify("Erro ao marcar como impresso.", "error"); }
    };

    const handleLimparFilaTNTEtiquetas = async () => {
        try { await set(ref(db, "tntEtiquetasFila"), null); notify("Fila TNT limpa!"); }
        catch {}
    };

    const handleEditarDefeitos = async (firebaseKey, novosDefeitos) => {
        try {
            await update(ref(db, `turnoFinalizacoes/${firebaseKey}`), { defeitos: novosDefeitos });
            notify("Defeitos atualizados!");
        } catch { notify("Erro ao salvar defeitos.", "error"); }
    };

    const handleMoverLogsDiaAnterior = async (logsDoGrupo) => {
        try {
            const updates = {};
            logsDoGrupo.forEach(l => {
                if (!l.firebaseKey) return;
                const base = l.turnoInicio
                    ? new Date(l.turnoInicio)
                    : new Date(l.timestamp?.split(",")[0]?.split("/").reverse().join("-") || Date.now());
                base.setDate(base.getDate() - 1);
                updates[`logs/${l.firebaseKey}/turnoInicio`] = base.toISOString();
            });
            if (Object.keys(updates).length) await update(ref(db, "/"), updates);
            notify("Turno movido para o dia anterior!");
        } catch { notify("Erro ao mover turno.", "error"); }
    };

    const handleEditLog = async (firebaseKey, logOriginal, novosValores) => {
        const isPoliester = (logOriginal.tipo || "").toLowerCase() === "poliéster";
        const isElastico  = (logOriginal.tipo || "").toLowerCase() === "elástico";
        try {
            await update(ref(db, `logs/${firebaseKey}`), novosValores);
            if (!logOriginal.manual) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                if (isElastico) {
                    const unOrig = logOriginal.unidade === "Metros" ? "Metro" : "Rolo";
                    const qtdOrig = unOrig === "Metro" ? Number(logOriginal.metros || 0) : Number(logOriginal.qtd || 0);
                    if (qtdOrig > 0) await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: logOriginal.cor, medida: logOriginal.medida, tipo: "Elástico", qtd: qtdOrig, unidade: unOrig, timestamp: ts, operador: user.name });
                    const unNovo = novosValores.unidade === "Metros" ? "Metro" : "Rolo";
                    const qtdNovo = unNovo === "Metro" ? Number(novosValores.metros || 0) : Number(novosValores.qtd || 0);
                    if (qtdNovo > 0) await push(ref(db, "estoqueMovimentos"), { movimento: "entrada", cor: novosValores.cor || logOriginal.cor, medida: novosValores.medida || logOriginal.medida, tipo: "Elástico", qtd: qtdNovo, unidade: unNovo, timestamp: ts, operador: user.name });
                } else if (!isPoliester) {
                    if ((logOriginal.qtd || 0) > 0) await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: logOriginal.cor, medida: logOriginal.medida, tipo: logOriginal.tipo, qtd: Number(logOriginal.qtd), unidade: "RL", timestamp: ts, operador: user.name });
                    if ((novosValores.qtd || 0) > 0) await push(ref(db, "estoqueMovimentos"), { movimento: "entrada", cor: novosValores.cor || logOriginal.cor, medida: novosValores.medida || logOriginal.medida, tipo: novosValores.tipo || logOriginal.tipo, qtd: Number(novosValores.qtd), unidade: "RL", timestamp: ts, operador: user.name });
                }
                const kgOrig = kgFioDoLog(logOriginal);
                if (kgOrig > 0) await push(ref(db, "fioEstoque"), { direcao: "entrada", cor: logOriginal.cor, qtd: kgOrig, operador: user.name, origem: logOriginal.tipo, timestamp: ts });
                const logNovo = { ...logOriginal, ...novosValores };
                const kgNovo = kgFioDoLog(logNovo);
                if (kgNovo > 0) await push(ref(db, "fioEstoque"), { direcao: "saida", cor: logNovo.cor, qtd: kgNovo, operador: user.name, origem: logNovo.tipo, timestamp: ts });
            }
            notify("Lançamento corrigido! Estoque ajustado.");
        } catch { notify("Erro ao editar lançamento.", "error"); }
    };

    const handleDeleteLog = async (firebaseKey, log) => {
        const isPoliester = (log.tipo || "").toLowerCase() === "poliéster";
        const isElastico  = (log.tipo || "").toLowerCase() === "elástico";
        try {
            await remove(ref(db, `logs/${firebaseKey}`));
            if (!log.manual) {
                const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
                if (isElastico) {
                    const un = log.unidade === "Metros" ? "Metro" : "Rolo";
                    const qtd = un === "Metro" ? Number(log.metros || 0) : Number(log.qtd || 0);
                    if (qtd > 0) await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: log.cor, medida: log.medida, tipo: "Elástico", qtd, unidade: un, timestamp: ts, operador: user.name });
                } else if (!isPoliester && (log.qtd || 0) > 0) {
                    await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor: log.cor, medida: log.medida, tipo: log.tipo, qtd: Number(log.qtd), unidade: "RL", timestamp: ts, operador: user.name });
                }
                const kgFio = kgFioDoLog(log);
                if (kgFio > 0) await push(ref(db, "fioEstoque"), { direcao: "entrada", cor: log.cor, qtd: kgFio, operador: user.name, origem: log.tipo, timestamp: ts });
            }
            notify("Lançamento excluído! Estoque revertido.");
        } catch { notify("Erro ao excluir lançamento.", "error"); }
    };

    const handleAddCorTemp = async ({ cor, medida, tipo }) => {
        try {
            await push(ref(db, "coresTemporarias"), { cor, medida, tipo, criadaEm: new Date().toISOString(), criadaPor: user.name });
            notify(`Cor temporária adicionada: ${cor} ${medida}`);
        } catch { notify("Erro ao adicionar cor temporária.", "error"); }
    };

    const handleRemoveCorTemp = async (key) => {
        try {
            await set(ref(db, `coresTemporarias/${key}`), null);
        } catch { notify("Erro ao remover cor temporária.", "error"); }
    };

    const handleLancamentoManual = async ({ cor, medida, tipo, qtd, peso, turno, data, unidade }) => {
        const turnoHora = { 1: "06", 2: "14", 3: "22" }[Number(turno)] || "06";
        const [d, m, y] = data.split("-");
        const tsStr = `${d}/${m}/${y}, ${turnoHora}:00:00`;
        const turnoInicio = new Date(`${y}-${m}-${d}T${turnoHora}:00:00`).toISOString();
        const unidadeFinal = tipo === "Elástico" ? (unidade || "RL") : undefined;
        const entry = { cor, medida, tipo, qtd: Number(qtd) || 0, peso: Number(peso) || 0, turno: Number(turno), turnoInicio, timestamp: tsStr, operador: user.name, manual: true, ...(unidadeFinal ? { unidade: unidadeFinal } : {}) };
        try {
            await push(ref(db, "logs"), entry);
            const unidLabel = tipo === "Poliéster" ? "kg" : (unidadeFinal || "RL");
            notify(`Lançamento manual: ${qtd} ${unidLabel} — ${cor} ${medida}`);
        } catch { notify("Erro ao salvar lançamento manual.", "error"); }
    };

    const handleProdLog = async ({ qtdMaquinas, cor, medida, tipo, qtd, peso }) => {
        const entry = { qtdMaquinas, cor, medida, tipo, qtd, peso, turno: turnoAtual.numero, turnoInicio: turnoAtual.inicio, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), operador: user.name };
        const isPoliester = (tipo || "").toLowerCase() === "poliéster";
        try {
            await push(ref(db, "logs"), entry);
            if (!isPoliester && qtd > 0) {
                await push(ref(db, "estoqueMovimentos"), { movimento: "entrada", cor, medida, tipo, qtd: Number(qtd), unidade: "RL", timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), operador: user.name });
            }
            const kgFio = kgFioDoLog(entry);
            if (kgFio > 0) {
                await push(ref(db, "fioEstoque"), { direcao: "saida", cor, qtd: kgFio, operador: user.name, origem: tipo, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            }
            notify(isPoliester ? `Lançado: ${peso} kg — ${cor} ${medida} (Poliéster)` : `Lançado: ${qtd} RL — ${cor} ${medida}`);
        } catch { notify("Erro ao salvar lançamento.", "error"); }
    };

    const handleConfigurarTurnoElastico = async ({ numero, qtdMaquinas, meta, metrosPorRolo }) => {
        const hojeStr = new Date().toLocaleDateString("pt-BR");
        const jaExiste = turnoElasticoFinalizacoes.some(f => {
            if (!f.inicio) return false;
            return new Date(f.inicio).toLocaleDateString("pt-BR") === hojeStr && f.numero === numero;
        });
        if (jaExiste) {
            notify(`Turno ${numero} do Elástico já foi finalizado hoje. Não é possível abrir novamente.`);
            return;
        }
        const turno = { numero, qtdMaquinas, meta, metrosPorRolo, inicio: new Date().toISOString(), configurado: true, configuradoPor: user.name };
        await set(ref(db, "turnoElasticoAtual"), turno);
    };

    const handleProdElasticoLog = async ({ cor, medida, qtd, metros, unidade }) => {
        const entry = { cor: (cor || "").trim(), medida: (medida || "").trim(), tipo: "Elástico", qtd: Number(qtd || 0), metros: Number(metros || 0), unidade, turno: turnoElasticoAtual.numero, turnoInicio: turnoElasticoAtual.inicio, qtdMaquinas: turnoElasticoAtual.qtdMaquinas || 0, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), operador: user.name };
        try {
            await push(ref(db, "logs"), entry);
            const qtdNum = Number(qtd || 0);
            if (qtdNum > 0) {
                const un = unidade === "Metros" ? "Metro" : "Rolo";
                const qtdEst = un === "Metro" ? Number(metros || 0) : qtdNum;
                await push(ref(db, "estoqueMovimentos"), { movimento: "entrada", cor, medida, tipo: "Elástico", qtd: qtdEst, unidade: un, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), operador: user.name });
            }
            const kgFio = kgFioDoLog(entry);
            if (kgFio > 0) {
                await push(ref(db, "fioEstoque"), { direcao: "saida", cor: entry.cor, qtd: kgFio, operador: user.name, origem: "Elástico", timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
            }
            notify(`Lançado: ${qtd} RL — ${cor} ${medida}`);
        } catch { notify("Erro ao salvar lançamento.", "error"); }
    };

    const handleFinalizarTurnoElastico = async (defeitos = 0) => {
        const logsDoTurno = logs.filter(l => l.tipo === "Elástico" && l.turnoInicio === turnoElasticoAtual.inicio);
        const totalRL = logsDoTurno.reduce((s, l) => s + (l.qtd || 0), 0);
        await push(ref(db, "turnoElasticoFinalizacoes"), { ...turnoElasticoAtual, totalRL, defeitosKg: parseFloat(defeitos) || 0, finalizadoEm: new Date().toISOString(), finalizadoPor: user.name });
        await set(ref(db, "turnoElasticoAtual"), null);
        notify("Turno de Elástico finalizado!");
    };

    const handleConfigurarTurno = async (numero, qtdMaquinas, meta, metaKgMaquina) => {
        if (!numero) {
            await set(ref(db, "turnoAtual"), { ...turnoAtual, qtdMaquinas: null });
            return;
        }
        // Bloqueia se já existe finalização desse turno hoje
        const hojeStr = new Date().toLocaleDateString("pt-BR");
        const jaExiste = turnoFinalizacoes.some(f => {
            if (!f.inicio) return false;
            const dataFin = new Date(f.inicio).toLocaleDateString("pt-BR");
            return dataFin === hojeStr && f.numero === numero;
        });
        if (jaExiste) {
            const nomes = { 1: "Turno 1", 2: "Turno 2", 3: "Turno 3", 4: "Bônus" };
            notify(`${nomes[numero] || `Turno ${numero}`} já foi finalizado hoje. Não é possível abrir novamente.`);
            return;
        }
        const novo = { numero, inicio: new Date().toISOString(), qtdMaquinas, meta: meta || 0, metaKgMaquina: metaKgMaquina || 30 };
        await set(ref(db, "turnoAtual"), novo);
        const nomesTurno = { 1: "Turno 1", 2: "Turno 2", 3: "Turno 3", 4: "Bônus de Produção" };
        notify(`${nomesTurno[numero] || `Turno ${numero}`} iniciado!`);
    };

    const _calcMetaRL = (nGorg) => {
        const gorgMachines = machines.filter(m => m.tipo === "Gorgurão" || m.tipo === "Misto");
        const totalMaq = gorgMachines.length || 12;
        const totalFitas = gorgMachines.reduce((s, m) => {
            const f = Array.isArray(m.fitas) ? m.fitas : Object.values(m.fitas || {});
            return s + f.reduce((fs, fi) => fs + (Number(fi.qtd) || 1), 0);
        }, 0);
        const fitasPorMaq = totalFitas > 0 ? totalFitas / totalMaq : 14;
        const maqAtivas = nGorg > 0 ? nGorg : totalMaq;
        return Math.round(maqAtivas * fitasPorMaq * 3);
    };

    const handleFinalizarTurno = async (defeitos) => {
        const fim = new Date().toISOString();
        const inicioTs = new Date(turnoAtual.inicio).getTime();
        const logsDoTurno = logs.filter(l => {
            if (l.turno !== turnoAtual.numero) return false;
            const ts = l.timestamp ? new Date(l.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}), /, "$3-$2-$1T")).getTime() : 0;
            return ts >= inicioTs;
        });
        // RL de Gorgurão/Elástico + KG de Poliéster separados
        const totalRL = logsDoTurno.filter(l => (l.tipo || "").toLowerCase() !== "poliéster").reduce((s, l) => s + (l.qtd || 0), 0);
        const totalKg = Math.round(logsDoTurno.filter(l => (l.tipo || "").toLowerCase() === "poliéster").reduce((s, l) => s + (l.peso || 0), 0) * 10) / 10;
        const meta = turnoAtual.meta || 0;
        const qtdMaquinas = turnoAtual.qtdMaquinas || {};
        const KG_META_POR_MAQUINA = turnoAtual.metaKgMaquina || 30;
        const nPoliester = Number(qtdMaquinas["Poliéster"] || 0);
        const nGorgFin = Number(qtdMaquinas["Gorgurão"] || 0);
        const metaRL = _calcMetaRL(nGorgFin); // salva a meta com a configuração atual das máquinas
        const metaKg = nPoliester > 0 ? nPoliester * KG_META_POR_MAQUINA : 0;
        const kgPorMaquina = nPoliester > 0 ? Math.round((totalKg / nPoliester) * 10) / 10 : null;
        const bateuMetaKg = metaKg > 0 ? totalKg >= metaKg : null;
        await push(ref(db, "turnoFinalizacoes"), {
            numero: turnoAtual.numero,
            inicio: turnoAtual.inicio,
            qtdMaquinas,
            meta,
            fim,
            finalizadoPor: user.name,
            defeitos: defeitos || {},
            totalRL,
            totalKg,
            metaKg,
            kgPorMaquina,
            bateuMetaKg,
            metaRL,
            bateuMeta: metaRL > 0 ? totalRL >= metaRL : (meta > 0 ? totalRL >= meta : null),
        });
        await set(ref(db, "turnoAtual"), { numero: turnoAtual.numero, inicio: fim });
        const nomesTurnoFin = { 1: "Turno 1", 2: "Turno 2", 3: "Turno 3", 4: "Bônus de Produção" };
        notify(`${nomesTurnoFin[turnoAtual.numero] || `Turno ${turnoAtual.numero}`} finalizado!`);
    };

    const handlePesoForaMedia = async (dados) => {
        await push(ref(db, "pesosForaMedia"), { ...dados, operador: user.name, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
    };

    // ── Estoque ───────────────────────────────────────────────
    const handleEntradaDireta = async ({ cor, medida, tipo, qtd, unidade }) => {
        const un = unidade || "RL";

        await push(ref(db, "estoqueMovimentos"), { movimento: "entrada", cor, medida, tipo, qtd, unidade: un, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), operador: user.name });
        notify(`Entrada: ${qtd} ${un === "Metro" ? "m" : "RL"} — ${cor} ${medida} ${tipo}`);
    };

    const handleSaidaEstoque = async ({ cor, medida, tipo, qtd, unidade }) => {
        const un = unidade || "RL";
        const estoque = calcEstoqueAtual();
        const unEst = tipo !== "Elástico" ? "RL" : (un === "Metro" ? "Metro" : "Rolo");
        const k = `${tipo}|${medida}|${(cor || "").trim()}|${unEst}`;
        const saldo = estoque[k] || 0;
        if (saldo < Number(qtd)) {
            notify(`Estoque insuficiente: ${saldo} ${unEst === "Metro" ? "m" : "RL"} disponível para ${cor} ${medida}.`, "error");
            return;
        }
        await push(ref(db, "estoqueMovimentos"), { movimento: "saida", cor, medida, tipo, qtd, unidade: un, timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), operador: user.name });
        notify(`Saída: ${qtd} ${un === "Metro" ? "m" : "RL"} — ${cor} ${medida} ${tipo}`);
    };



    // ── Alertas ───────────────────────────────────────────────
    const handleReportarProblema = async (machineId, machineName, motivo) => {
        await push(ref(db, "alertas"), {
            machineId, machineName, motivo,
            operador: user.name,
            timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            status: "aberto",
        });
        await update(ref(db, `machines/${machineId}`), { parada: true });
        notify(`Alerta enviado: ${machineName}`, "error");
    };

    const handleResolverAlerta = async (key) => {
        const alerta = alertas.find(a => a.key === key);
        await update(ref(db, `alertas/${key}`), { status: "resolvido", resolvidoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), resolvidoPor: user.name });
        if (alerta) await update(ref(db, `machines/${alerta.machineId}`), { parada: false });
        notify("Problema resolvido!");
    };

    const handleDeleteAlerta = async (key) => {
        await remove(ref(db, `alertas/${key}`));
        notify("Registro removido.");
    };

    // ── Máquinas ──────────────────────────────────────────────
    const handleUpdateMachineFita = async (machineId, fitaIndex, updatedFita) => {
        const machine = machines.find(m => m.id === machineId);
        if (!machine) return;
        // Firebase pode retornar arrays como objetos {0:{...}} — normalizar
        const fitas = Array.isArray(machine.fitas) ? machine.fitas : Object.values(machine.fitas || {});
        const oldFita = fitas[fitaIndex];
        const newFitas = fitas.map((f, i) => i === fitaIndex ? { ...f, ...updatedFita } : f);
        const updates = { fitas: newFitas };
        if (oldFita && oldFita.cor && (oldFita.cor !== updatedFita.cor || oldFita.medida !== updatedFita.medida)) {
            const anterior = { ...oldFita, removidaEm: new Date().toISOString() };
            const prevAnt = machine.fitasAnteriores
                ? (Array.isArray(machine.fitasAnteriores) ? machine.fitasAnteriores : Object.values(machine.fitasAnteriores))
                : [];
            updates.fitasAnteriores = [...prevAnt, anterior];
        }
        await update(ref(db, `machines/${machineId}`), updates);
        if (oldFita && oldFita.cor && (oldFita.cor !== updatedFita.cor || oldFita.medida !== updatedFita.medida || oldFita.qtd !== updatedFita.qtd)) {
            await push(ref(db, `historicoFitas/${machineId}`), {
                tipo: "alteracao",
                de: { cor: oldFita.cor, medida: oldFita.medida, qtd: oldFita.qtd },
                para: { cor: updatedFita.cor, medida: updatedFita.medida, qtd: updatedFita.qtd },
                timestamp: new Date().toISOString(),
                usuario: user.name,
            });
        }
        notify("Fita salva!");
    };

    const isFullyDelivered = (o) => {
        const itens = o.itens ? (Array.isArray(o.itens) ? o.itens : Object.values(o.itens)) : [];
        return itens.length > 0 && itens.every(i => (i.qtdProduzida || 0) >= (i.qtdTotal || 0));
    };

    // Apontamentos reais + Gorgurão reconstruído das entradas de estoque (meses apagados pela antiga limpeza) — só para relatórios/custo
    const logsComRecuperados = useMemo(() => [...logs, ...recuperarLogsGorgurao(logs, estoqueMovimentos, turnoFinalizacoes)], [logs, estoqueMovimentos, turnoFinalizacoes]);
    const logsElasticoComRecuperados = useMemo(() => [...logs, ...recuperarLogsElastico(logs, estoqueMovimentos, turnoElasticoFinalizacoes)], [logs, estoqueMovimentos, turnoElasticoFinalizacoes]);

    const alertOrders = orders.filter(o => {
        if (o.status === "concluido" || isFullyDelivered(o)) return false;
        const dias = workdaysBetween(today, o.dataEntrega);
        return dias <= 7 && dias >= 0;
    });

    const overdueOrders = orders.filter(o => {
        if (o.status === "concluido" || isFullyDelivered(o)) return false;
        const dias = workdaysBetween(today, o.dataEntrega);
        return dias < 0;
    });

    const pedidosVencidosQtd = overdueOrders.length;

    if (!user) return (
        <LoginPage login={login} setLogin={setLogin} senha={senha} setSenha={setSenha} loginError={loginError} onLogin={handleLogin} conectando={!usuariosCarregados} />
    );

    const effectiveUser = previewUser || user;
    const allowedTabs = effectiveUser.role === "admin" ? ALL_TABS : (effectiveUser.permissoes || []);
    const safeTab = allowedTabs.includes(tab) ? tab : allowedTabs[0];
    const podeSolicitarEtiqueta = allowedTabs.includes("etiquetas");
    const podeReportarProblema = allowedTabs.includes("alertas");
    // Sem permissoesEdicao salva = compatibilidade com usuários antigos (quem vê, edita). Admin sempre edita tudo.
    const podeEditar = (tabId) => effectiveUser.role === "admin" || !effectiveUser.permissoesEdicao || effectiveUser.permissoesEdicao.includes(tabId);

    if (loading || !minLoadDone) return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#0a1628" }}>
            <style>{`
                @keyframes ftx-logo-in { 0% { opacity:0; transform:scale(0.75); } 60% { opacity:1; transform:scale(1.04); } 100% { opacity:1; transform:scale(1); } }
                @keyframes ftx-oval-draw { from { stroke-dashoffset:900; opacity:0; } to { stroke-dashoffset:0; opacity:1; } }
                @keyframes ftx-text-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                @keyframes ftx-shimmer { 0% { left:-80%; } 100% { left:130%; } }
                @keyframes ftx-reload-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .ftx-brand { display:flex;align-items:baseline;position:relative;z-index:1;animation:ftx-text-in 0.3s ease 0.3s both;opacity:0; }
                .ftx-four { font-size:70px;font-weight:300;color:#5BA4D4;letter-spacing:-1px;font-family:Georgia,serif; }
                .ftx-tex  { font-size:70px;font-weight:900;color:#fff;letter-spacing:-1px;position:relative;overflow:hidden; }
                .ftx-tex::after { content:"";position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent);animation:ftx-shimmer 0.7s ease 0.7s 1 forwards; }
                .ftx-reg  { font-size:16px;font-weight:700;color:#5BA4D4;align-self:flex-start;margin-top:12px;margin-left:2px; }
                .ftx-sub  { font-size:11px;font-weight:600;color:rgba(255,255,255,0.45);letter-spacing:0.28em;text-transform:uppercase;margin-top:8px;position:relative;z-index:1;animation:ftx-text-in 0.3s ease 0.5s both;opacity:0; }
                .ftx-oval-top    { stroke-dasharray:900;stroke-dashoffset:900;animation:ftx-oval-draw 0.8s ease-out 0.2s forwards; }
                .ftx-oval-bottom { stroke-dasharray:900;stroke-dashoffset:900;animation:ftx-oval-draw 0.8s ease-out 0.5s forwards; }
                .ftx-reload-btn { animation: ftx-reload-in 0.4s ease 8s both; opacity:0; }
                @media (max-width: 480px) {
                    .ftx-four { font-size:44px; }
                    .ftx-tex  { font-size:44px; }
                    .ftx-reg  { font-size:11px; margin-top:7px; }
                    .ftx-sub  { font-size:8px; letter-spacing:0.18em; }
                }
            `}</style>

            {(() => { const mob = window.innerWidth < 480; const W = mob ? 260 : 420; const H = mob ? 135 : 218; return (
            <div key="logo" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, animation: "ftx-logo-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.05s both", opacity: 0 }}>
                <div style={{ position: "relative", width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <svg style={{ position: "absolute", top: 0, left: 0, width: W, height: H, overflow: "visible" }} viewBox="0 0 310 160">
                        <ellipse className="ftx-oval-top" cx="155" cy="80" rx="148" ry="72" fill="none" stroke="#5BA4D4" strokeWidth="5" pathLength="900" clipPath="url(#ftx-top)" />
                        <ellipse className="ftx-oval-bottom" cx="155" cy="80" rx="148" ry="72" fill="none" stroke="#2a2a2a" strokeWidth="5" pathLength="900" clipPath="url(#ftx-bot)" />
                        <defs>
                            <clipPath id="ftx-top"><rect x="0" y="0" width="310" height="80" /></clipPath>
                            <clipPath id="ftx-bot"><rect x="0" y="80" width="310" height="80" /></clipPath>
                        </defs>
                    </svg>
                    <div className="ftx-brand">
                        <span className="ftx-four">Four</span>
                        <span className="ftx-tex">TEX</span>
                        <span className="ftx-reg">®</span>
                    </div>
                    <div className="ftx-sub">Indústria Têxtil</div>
                </div>
                <button className="ftx-reload-btn" onClick={() => window.location.reload(true)} style={{
                    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 24px",
                    fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em",
                }}>
                    Recarregar página
                </button>
            </div>
            ); })()}
        </div>
    );

    return (
        <div className="flex h-screen font-sans bg-gray-50 text-gray-900 antialiased selection:bg-primary/20">
            {/* Toast notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
                    notification.type === "error" ? "bg-red-50/90 text-red-600 border-red-200" : "bg-green-50/90 text-green-700 border-green-200"
                }`}>
                    {notification.type === "error" ? "✕ " : "✓ "}{notification.msg}
                </div>
            )}

            {/* Overlay para fechar sidebar no mobile */}
            {isMobile && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: "fixed", inset: 0, zIndex: 40,
                        background: "rgba(0,0,0,0.45)",
                        opacity: sidebarOpen ? 1 : 0,
                        pointerEvents: sidebarOpen ? "auto" : "none",
                        transition: "opacity 0.25s ease",
                    }}
                />
            )}

            {/* Sidebar — always rendered on mobile for smooth animation */}
            <div style={{
                position: isMobile ? "fixed" : "relative",
                top: 0, left: 0, height: "100dvh",
                zIndex: 50,
                transform: isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
                transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
                boxShadow: isMobile && sidebarOpen ? "4px 0 24px rgba(0,0,0,0.18)" : "none",
                willChange: "transform",
            }}>
                <Sidebar tab={safeTab} setTab={(t) => { setTab(t); if (isMobile) setSidebarOpen(false); }} userRole={effectiveUser.role} user={effectiveUser} onLogout={() => { setUser(null); try { localStorage.removeItem("fitas_session"); } catch {} }} alertasAbertos={alertasAbertosQtd} pedidosConfirmacao={pedidosConfirmacaoQtd} pedidosVencidos={pedidosVencidosQtd} separacoesPendentes={separacaoHistorico.filter(s => s.status === "separado").length} tntPedidosPendentes={tntPedidosPendentesQtd} cordoesPedidosPendentes={cordoesPedidosPendentesQtd} viesPedidosPendentes={viesPedidosPendentesQtd} coletasPendentes={coletasPendentesQtd} mercadoriaPendentes={mercadoriaPendentesQtd} />
            </div>

            <div className="flex-1 flex flex-col min-w-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {/* Banner de prévia */}
                {previewUser && (
                    <div style={{
                        background: "#1D4ED8", color: "#fff",
                        padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
                        fontSize: 13, fontWeight: 600, gap: 12, flexShrink: 0,
                    }}>
                        <span>👁 Visualizando como <b>{previewUser.name}</b> ({ROLE_LABEL_MAP[previewUser.role] || previewUser.role})</span>
                        <button onClick={() => { setPreviewUser(null); setTab("usuarios"); }} style={{
                            background: "#fff", color: "#1D4ED8", border: "none",
                            borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}>✕ Sair da prévia</button>
                    </div>
                )}
                <TopBar alertOrders={alertOrders} onToggleSidebar={() => setSidebarOpen(o => !o)} />
                <main className="flex-1 overflow-y-auto overscroll-contain bg-gray-50/50 p-2 md:p-8 lg:p-10">
                    <div className="max-w-7xl mx-auto w-full space-y-6">
                        {safeTab === "dashboard" && <DashboardTab machines={machines.filter(m => !TIPOS_CORDAO.includes(m.tipo))} orders={orders} logs={logs} alertOrders={alertOrders} overdueOrders={overdueOrders} onNavigate={setTab} movimentos={estoqueMovimentos} />}
                        {safeTab === "maquinas"        && <MaquinasTab machines={machines} tiposFiltro={["Gorgurão","Poliéster","Misto"]} userRole={effectiveUser.role} userName={effectiveUser.name} notify={notify} editMachine={editMachine} setEditMachine={setEditMachine} onUpdateFita={handleUpdateMachineFita} alertas={alertas} onReportarProblema={podeReportarProblema ? handleReportarProblema : undefined} historicoFitas={historicoFitas} readOnly={!podeEditar("maquinas")} />}
                        {safeTab === "maquinaselastico" && <MaquinasTab machines={machines} tiposFiltro={["Elástico"]} userRole={effectiveUser.role} userName={effectiveUser.name} notify={notify} editMachine={editMachine} setEditMachine={setEditMachine} onUpdateFita={handleUpdateMachineFita} alertas={alertas} onReportarProblema={podeReportarProblema ? handleReportarProblema : undefined} historicoFitas={historicoFitas} readOnly={!podeEditar("maquinaselastico")} />}
                        {safeTab === "maquinascordoes"  && <MaquinasTab machines={machines} tiposFiltro={TIPOS_CORDAO} userRole={effectiveUser.role} userName={effectiveUser.name} notify={notify} editMachine={editMachine} setEditMachine={setEditMachine} onUpdateFita={handleUpdateMachineFita} alertas={alertas} onReportarProblema={podeReportarProblema ? handleReportarProblema : undefined} historicoFitas={historicoFitas} readOnly={!podeEditar("maquinascordoes")} />}
                        {safeTab === "alertas"   && <AlertasTab alertas={alertas} onResolver={handleResolverAlerta} onDeleteAlerta={effectiveUser.role === "admin" ? handleDeleteAlerta : null} podeEditar={podeEditar("alertas")} />}
                        {safeTab === "producao"  && <ProducaoTab machines={machines} logs={logs} orders={orders} turnoAtual={turnoAtual} turnoFinalizacoes={turnoFinalizacoes} onSubmit={handleProdLog} onFinalizarTurno={handleFinalizarTurno} onConfigurarTurno={handleConfigurarTurno} canLaunch={podeEditar("producao")} isAdmin={effectiveUser.role === "admin"} onMoverLogsDiaAnterior={handleMoverLogsDiaAnterior} onEditarDefeitos={handleEditarDefeitos} onLancamentoManual={handleLancamentoManual} coresTemporarias={coresTemporarias} onAddCorTemp={handleAddCorTemp} onRemoveCorTemp={effectiveUser.role === "admin" ? handleRemoveCorTemp : null} onPesoForaMedia={handlePesoForaMedia} pesosForaMedia={pesosForaMedia} onEditLog={handleEditLog} onDeleteLog={handleDeleteLog} podeEditar={podeEditar("producao")} />}
                        {safeTab === "elastico"  && <ProducaoElasticoTab machines={machines} logs={logs} turnoAtual={turnoElasticoAtual} turnoFinalizacoes={turnoElasticoFinalizacoes} onSubmit={handleProdElasticoLog} onFinalizarTurno={handleFinalizarTurnoElastico} onConfigurarTurno={handleConfigurarTurnoElastico} isAdmin={effectiveUser.role === "admin"} canLaunch={podeEditar("elastico")} user={effectiveUser} onEditLog={handleEditLog} onDeleteLog={handleDeleteLog} podeEditar={podeEditar("elastico")} />}
                        {safeTab === "separacao" && <SeparacaoTab
                            orders={orders}
                            clientes={clientes}
                            userName={effectiveUser.name}
                            userRole={effectiveUser.role}
                            podeEditar={podeEditar("separacao")}
                            historico={separacaoHistorico}
                            onSalvar={async (dados) => {
                                try {
                                    await push(ref(db, "separacaoHistorico"), { ...dados, status: "pendente", criadoPor: effectiveUser.name, timestamp: new Date().toISOString() });
                                    notify("Separação salva!");
                                } catch(e) {
                                    notify("Erro: " + (e?.message || e?.code || "desconhecido"), "error");
                                    throw e; // propaga para o botão não mostrar "✓ Salvo"
                                }
                            }}
                            onConfirmarSeparacao={async (id) => {
                                try { await update(ref(db, `separacaoHistorico/${id}`), { status: "separado", separadoPor: effectiveUser.name, timestampSeparacao: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }); notify("Separação confirmada!"); }
                                catch { notify("Erro ao confirmar.", "error"); }
                            }}
                            onFaturar={async (id) => {
                                try { await update(ref(db, `separacaoHistorico/${id}`), { status: "faturado", faturadoPor: effectiveUser.name, timestampFaturamento: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }); notify("Faturamento confirmado!"); }
                                catch { notify("Erro ao faturar.", "error"); }
                            }}
                            onExcluir={async (id) => { try { await remove(ref(db, `separacaoHistorico/${id}`)); } catch {} }}
                            onAtualizar={async (id, dados) => { try { await update(ref(db, `separacaoHistorico/${id}`), dados); } catch {} }}
                        />}
                        {safeTab === "pedidos"   && <PedidosTab orders={orders} machines={machines} clientes={clientes} vendedores={vendedores} movimentos={estoqueMovimentos} onSubmit={handleAddOrder} userRole={effectiveUser.role} onDelete={handleDeleteOrder} onEditOrder={handleEditOrder} onSolicitarConfirmacao={handleSolicitarConfirmacao} onConfirmarPedido={handleConfirmarPedido} onConcluirPedido={handleConcluirPedido} onReverterConclusao={handleReverterConclusao} onEntregaParcial={handleEntregaParcial} onDeleteEntregaParcial={handleDeleteEntregaParcial} onRecalcularDatas={handleRecalcularDatas} onSolicitarEtiqueta={podeSolicitarEtiqueta ? handleSolicitarEtiqueta : undefined} userName={effectiveUser.name} onCadastrarCliente={handleCadastrarClienteTNT} podeEditar={podeEditar("pedidos")} />}
                        {safeTab === "estoque"   && <EstoqueTab orders={orders} logs={logs} movimentos={estoqueMovimentos} onEntradaDireta={handleEntradaDireta} onSaidaEstoque={handleSaidaEstoque} userRole={effectiveUser.role} tipos={["Gorgurão", "Poliéster"]} podeEditar={podeEditar("estoque")} />}
                        {safeTab === "estoqueelastico" && <EstoqueTab orders={orders} logs={logs} movimentos={estoqueMovimentos} onEntradaDireta={handleEntradaDireta} onSaidaEstoque={handleSaidaEstoque} userRole={effectiveUser.role} tipos={["Elástico"]} podeEditar={podeEditar("estoqueelastico")} />}
                        {safeTab === "metas"     && <MetasTab logs={logs.filter(l => l.tipo !== "Elástico")} turnoAtual={turnoAtual} turnoFinalizacoes={turnoFinalizacoes} machines={machines} podeEditar={podeEditar("metas")} />}
                        {safeTab === "historico"         && <HistoricoTab logs={logs.filter(l => l.tipo !== "Elástico")} turnoFinalizacoes={turnoFinalizacoes} isAdmin={effectiveUser.role === "admin"} onEditarDefeitos={handleEditarDefeitos} podeEditar={podeEditar("historico")} />}
                        {safeTab === "historicoelestico" && <HistoricoElasticoTab logs={logs} turnoFinalizacoes={turnoElasticoFinalizacoes} isAdmin={effectiveUser.role === "admin"} onEditarDefeitosKg={async (key, kg) => { await update(ref(db, `turnoElasticoFinalizacoes/${key}`), { defeitosKg: kg }); notify("Defeitos atualizados!"); }} podeEditar={podeEditar("historicoelestico")} />}
                        {safeTab === "logs"          && <LogsTab logs={logs} isAdmin={effectiveUser.role === "admin"} podeEditar={podeEditar("logs")} />}
                        {safeTab === "historicofitas"  && <HistoricoFitasTab historicoFitas={historicoFitas} machines={machines} />}
                        {safeTab === "pesosforamedida" && <PesosForaMedidaTab pesosForaMedia={pesosForaMedia} onLimpar={async (key) => { try { if (key) { await remove(ref(db, `pesosForaMedia/${key}`)); notify("Registro excluído!"); } else { await set(ref(db, "pesosForaMedia"), null); notify("Registros limpos!"); } } catch { notify("Erro.", "error"); } }} podeEditar={podeEditar("pesosforamedida")} />}
                        {safeTab === "planejamento"        && <PlanejamentoTab machines={machines.filter(m => m.tipo !== "Elástico")} orders={orders} logs={logs} movimentos={estoqueMovimentos} onSwapFita={handleSwapFita} podeEditar={podeEditar("planejamento")} />}
                        {safeTab === "planejamentoelastico" && <PlanejamentoTab machines={machines.filter(m => m.tipo === "Elástico")} orders={orders} logs={logs} movimentos={estoqueMovimentos} onSwapFita={handleSwapFita} podeEditar={podeEditar("planejamentoelastico")} />}
                        {safeTab === "clientes"     && <ClientesTab clientes={clientes} orders={orders} vendedores={vendedores} onAddVendedor={handleAddVendedor} onDeleteVendedor={handleDeleteVendedor} onEditVendedor={handleEditVendedor} notify={notify} userRole={effectiveUser.role} podeEditar={podeEditar("clientes")} />}
                        {safeTab === "relatorios"        && <RelatoriosTab orders={orders} logs={logsComRecuperados.filter(l => l.tipo !== "Elástico")} turnoFinalizacoes={turnoFinalizacoes} machines={machines} pesosForaMedia={pesosForaMedia} isAdmin={effectiveUser.role === "admin"} podeEditar={podeEditar("relatorios")} />}
                        {safeTab === "relatorioselastico" && <RelatoriosElasticoTab logs={logsElasticoComRecuperados} turnoFinalizacoes={turnoElasticoFinalizacoes} />}
                        {safeTab === "usuarios"     && <UsuariosTab usuarios={usuarios} notify={notify} onRecalcularEntregas={handleRecalcularEntregas} onPreviewUser={u => { setPreviewUser(u); setTab("dashboard"); }} currentLogin={effectiveUser.login} podeEditar={podeEditar("usuarios")} />}
                        {safeTab === "etiquetas"    && <EtiquetasTab fila={etiquetasFila} onSolicitar={handleSolicitarEtiqueta} onLimparFila={handleLimparFilaEtiquetas} filaTNT={tntEtiquetasFila} onSolicitarTNT={handleSolicitarTNTEtiqueta} onLimparFilaTNT={handleLimparFilaTNTEtiquetas} userRole={effectiveUser.role} userName={effectiveUser.name} podeEditar={podeEditar("etiquetas")} />}
                        {safeTab === "coleta"       && <SolicitacoesTab
                            coletaProps={{ fila: coletasFila, onSolicitar: handleSolicitarColeta, onMarcarColetado: handleMarcarColetado, onExcluir: handleExcluirColeta, vendedores, userName: effectiveUser.name, userRole: effectiveUser.role, podeEditar: podeEditar("coleta") }}
                            mercadoriaProps={{ fila: mercadoriaFila, onSolicitar: handleSolicitarMercadoria, onMarcarAtendido: handleMarcarMercadoriaAtendida, onExcluir: handleExcluirMercadoria, userName: effectiveUser.name, userRole: effectiveUser.role, podeEditar: podeEditar("coleta") }}
                        />}
                        {safeTab === "tnt"          && <TNTTab pedidos={tntPedidos} movimentos={tntEstoque} clientes={clientes} vendedores={vendedores} userName={effectiveUser.name} userRole={effectiveUser.role} userPermissoes={effectiveUser.permissoes} onAdd={handleAddTNTPedido} onUpdate={handleUpdateTNTPedido} onDelete={handleDeleteTNTPedido} onCadastrarCliente={handleCadastrarClienteTNT} onSolicitarLoteEtiquetas={handleSolicitarLoteEtiquetasTNT} onSepararPedido={handleSepararTNTPedido} onFaturarPedido={handleFaturarTNTPedido} podeEditar={podeEditar("tnt")} />}
                        {safeTab === "tntestoque"   && <TNTEstoqueTab movimentos={tntEstoque} pedidos={tntPedidos} userName={effectiveUser.name} onMovimento={handleTNTMovimento} podeEditar={podeEditar("tntestoque")} />}
                        {safeTab === "tntetiqueta"  && <TNTEtiquetaTab fila={tntEtiquetasFila} onSolicitar={handleSolicitarTNTEtiqueta} onMarcarImpresso={handleMarcarTNTEtiquetaImpresso} onLimparFila={handleLimparFilaTNTEtiquetas} userName={effectiveUser.name} podeEditar={podeEditar("tntetiqueta")} />}
                        {safeTab === "cordoes"      && <CordoesTab pedidos={cordoesPedidos} clientes={clientes} vendedores={vendedores} userName={effectiveUser.name} userRole={effectiveUser.role} onAdd={handleAddCordoesPedido} onUpdate={handleUpdateCordoesPedido} onDelete={handleDeleteCordoesPedido} onCadastrarCliente={handleCadastrarClienteTNT} onConcluirPedido={handleConcluirCordoesPedido} onEntregaParcial={handleEntregaParcialCordoes} onDeleteEntregaParcial={handleDeleteEntregaParcialCordoes} podeEditar={podeEditar("cordoes")} />}
                        {safeTab === "estoquecordoes" && <CordoesEstoqueTab movimentos={cordoesEstoque} userName={effectiveUser.name} onMovimento={handleCordoesMovimento} podeEditar={podeEditar("estoquecordoes")} />}
                        {safeTab === "estoquefio" && <FioEstoqueTab movimentos={fioEstoque} userName={effectiveUser.name} onMovimento={handleFioMovimento} podeEditar={podeEditar("estoquefio")} />}
                        {safeTab === "custofio" && <CustoFioTab logs={logsComRecuperados} podeEditar={podeEditar("custofio")} />}
                        {safeTab === "producaocordoes" && <CordoesProducaoTab lancamentos={cordoesApontamentos} diasFinalizados={cordoesDiasFinalizados} userName={effectiveUser.name} isAdmin={effectiveUser.role === "admin"} onAdd={handleAddCordoesApontamento} onEdit={handleUpdateCordoesApontamento} onDelete={handleDeleteCordoesApontamento} onFinalizarDia={handleFinalizarDiaCordoes} onReabrirDia={handleReabrirDiaCordoes} podeEditar={podeEditar("producaocordoes")} />}
                        {safeTab === "producaovies" && <ViesProducaoTab lancamentos={viesApontamentos} diasFinalizados={viesDiasFinalizados} userName={effectiveUser.name} isAdmin={effectiveUser.role === "admin"} onAdd={handleAddViesApontamento} onEdit={handleUpdateViesApontamento} onDelete={handleDeleteViesApontamento} onReabrirDia={handleReabrirDiaVies} podeEditar={podeEditar("producaovies")} />}
                        {safeTab === "viespedidos"  && <ViesPedidosTab pedidos={viesPedidos} clientes={clientes} userName={effectiveUser.name} isAdmin={effectiveUser.role === "admin"} onAdd={handleAddViesPedido} onUpdate={handleUpdateViesPedido} onDelete={handleDeleteViesPedido} podeEditar={podeEditar("viespedidos")} />}
                    </div>
                </main>
            </div>
        </div>
    );
}
