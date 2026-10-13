import { useState, useEffect } from "react";
import { ref, push, update, remove } from "firebase/database";
import { db } from "../firebase";
import { formatDate } from "../utils";

const EMPTY = { nome: "", vendedor: "" };

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const h = () => setM(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return m;
}

export default function ClientesTab({ clientes = [], orders = [], vendedores = [], onAddVendedor, onDeleteVendedor, onEditVendedor, notify, userRole, podeEditar = true }) {
    const isAdmin = userRole === "admin";
    const isMobile = useIsMobile();
    const [form, setForm]         = useState(EMPTY);
    const [editKey, setEditKey]   = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [busca, setBusca]             = useState("");
    const [filtroVendedor, setFiltroVendedor] = useState("");
    const [confirmDel, setConfirmDel]   = useState(null);
    const [mostrarConcluidosKey, setMostrarConcluidosKey] = useState({});
    const [showVendedores, setShowVendedores] = useState(false);
    const [novoVendedorNome, setNovoVendedorNome] = useState("");
    const [confirmDelVendedor, setConfirmDelVendedor] = useState(null);
    const [editingVendedorKey, setEditingVendedorKey] = useState(null);
    const [editingVendedorNome, setEditingVendedorNome] = useState("");

    const vendedoresFiltro = [...new Set(clientes.map(c => c.vendedor).filter(Boolean))].sort();

    const filtered = clientes.filter(c => {
        if (filtroVendedor && c.vendedor !== filtroVendedor) return false;
        return (
            c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
            c.telefone?.includes(busca) ||
            c.email?.toLowerCase().includes(busca.toLowerCase())
        );
    });

    const openAdd = () => { setForm(EMPTY); setEditKey(null); setShowForm(true); };
    const openEdit = (c) => { setForm({ nome: c.nome, vendedor: c.vendedor || "" }); setEditKey(c.key); setShowForm(true); };

    const handleSave = async () => {
        if (!form.nome.trim()) { notify("Nome obrigatório.", "error"); return; }
        const data = { nome: form.nome.trim(), vendedor: form.vendedor.trim() };
        if (editKey) { await update(ref(db, `clientes/${editKey}`), data); notify("Cliente atualizado!"); }
        else { await push(ref(db, "clientes"), data); notify("Cliente adicionado!"); }
        setShowForm(false); setEditKey(null);
    };

    const handleDelete = async (key) => {
        await remove(ref(db, `clientes/${key}`));
        notify("Cliente removido!"); setConfirmDel(null);
    };

    const pedidosDoCliente = (nome) =>
        orders.filter(o => o.cliente?.toLowerCase() === nome?.toLowerCase());

    const imprimirPedidosCliente = (cliente) => {
        const pedidos = pedidosDoCliente(cliente.nome).filter(p => p.status !== "concluido");
        if (!pedidos.length) { notify("Nenhum pedido ativo para este cliente.", "error"); return; }

        const grupos = {};
        pedidos.forEach(p => {
            const itens = Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {});
            const entregueMap = {};
            Object.values(p.entregasParciais || {}).forEach(e => {
                (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                    const ek = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                    entregueMap[ek] = (entregueMap[ek] || 0) + Number(ei.qtd || 0);
                    entregueMap[ek + "|orig"] = (entregueMap[ek + "|orig"] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                });
            });
            itens.forEach(it => {
                const tipo = it.tipo || "—";
                const medida = it.medida || "—";
                const cor = it.cor || "—";
                const isMetro = it.unidadeOriginal === "m" || it.unidadeOriginal === "Metro";
                const isKg = it.unidadeOriginal === "Kg" || (it.tipo || "").toLowerCase() === "poliéster";
                const totalPed = (isMetro || isKg)
                    ? (it.qtdOriginal || (isMetro ? (it.qtdTotal || 0) * 25 : it.qtdTotal || 0))
                    : (it.qtdTotal || 0);
                const ek = `${(it.cor||"").trim().toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`;
                const entregueVal = (isMetro || isKg) ? (entregueMap[ek + "|orig"] || 0) : (entregueMap[ek] || 0);
                const unidade = isMetro ? "MTS" : isKg ? "KG" : "RL";
                if (!grupos[tipo]) grupos[tipo] = {};
                if (!grupos[tipo][medida]) grupos[tipo][medida] = {};
                if (!grupos[tipo][medida][cor]) grupos[tipo][medida][cor] = { totalPed: 0, entregue: 0, unidade };
                grupos[tipo][medida][cor].totalPed += totalPed;
                grupos[tipo][medida][cor].entregue += Math.min(entregueVal, totalPed);
            });
        });

        let corposHtml = "";
        let geralTotal = 0, geralEntregue = 0, geralRestante = 0;
        const tipoAbrev = { "Gorgurão": "GORG.", "Poliéster": "POL.", "Elástico": "ELAST." };
        Object.entries(grupos).forEach(([tipo, medidas]) => {
            corposHtml += `<tr><td colspan="5" class="tipo-header">${tipo.toUpperCase()}</td></tr>`;
            Object.entries(medidas).sort(([a],[b]) => parseInt(a)-parseInt(b)).forEach(([medida, cores]) => {
                const abrev = tipoAbrev[tipo] || tipo.toUpperCase().slice(0,5) + ".";
                const primeiraUnidade = Object.values(cores)[0]?.unidade || "RL";
                corposHtml += `<tr><td colspan="5" class="medida-header">${tipo.toUpperCase()} ${medida} ${primeiraUnidade} 100MTS</td></tr>`;
                let subT = 0, subE = 0, subR = 0;
                let seq = 1;
                Object.entries(cores).sort(([a],[b]) => a.localeCompare(b)).forEach(([cor, d]) => {
                    const restante = Math.max(0, d.totalPed - d.entregue);
                    subT += d.totalPed; subE += d.entregue; subR += restante;
                    const cod = String(seq++).padStart(10, "0");
                    const restColor = restante === 0 ? "color:#16A34A" : "";
                    corposHtml += `<tr>
                        <td class="cod">${cod}</td>
                        <td class="desc">${abrev} ${medida} ${d.unidade} 100MTS - ${cor.toUpperCase()}</td>
                        <td class="qtd">${d.totalPed.toLocaleString("pt-BR")}</td>
                        <td class="qtd">${d.entregue.toLocaleString("pt-BR")}</td>
                        <td class="qtd" style="${restColor}">${restante.toLocaleString("pt-BR")}</td>
                    </tr>`;
                });
                corposHtml += `<tr class="subtotal"><td colspan="2">Totais por SubGrupo</td><td class="qtd">${subT.toLocaleString("pt-BR")}</td><td class="qtd">${subE.toLocaleString("pt-BR")}</td><td class="qtd">${subR.toLocaleString("pt-BR")}</td></tr>`;
                geralTotal += subT; geralEntregue += subE; geralRestante += subR;
            });
        });
        corposHtml += `<tr class="total-geral"><td colspan="2">Totais Gerais</td><td class="qtd">${geralTotal.toLocaleString("pt-BR")}</td><td class="qtd">${geralEntregue.toLocaleString("pt-BR")}</td><td class="qtd" style="color:#DC2626">${geralRestante.toLocaleString("pt-BR")}</td></tr>`;

        const hoje = new Date().toLocaleDateString("pt-BR");
        const w = window.open("", "_blank", "width=900,height=700");
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Pedidos - ${cliente.nome}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
            h2 { text-align: center; font-size: 14px; margin: 0; }
            h3 { text-align: center; font-size: 12px; margin: 4px 0; font-weight: normal; }
            .info { font-size: 11px; margin: 8px 0 16px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #eee; padding: 6px 8px; text-align: left; border: 1px solid #ccc; font-size: 11px; }
            td { padding: 5px 8px; border: 1px solid #ddd; font-size: 11px; }
            .tipo-header { background: #888; color: #fff; font-weight: 800; letter-spacing: .05em; font-size: 12px; }
            .medida-header { background: #ddd; color: #333; font-weight: 700; font-style: italic; }
            .cod { width: 12%; font-size: 10px; color: #555; }
            .subtotal { background: #f5f5f5; font-weight: 700; }
            .total-geral { background: #e0e0e0; font-weight: 800; }
            .qtd { text-align: right; }
            .desc { width: 70%; }
            @media print { @page { margin: 10mm; } }
        </style></head><body>
        <h2>FOURTEX IND E COM DE AVIAMENTO LTDA</h2>
        <h3>Listagem de Pedidos - Por Grupo/SubGrupo</h3>
        <div class="info">
            <span style="font-size:14px"><strong>${cliente.nome}</strong>${cliente.vendedor ? ` · Vendedor: ${cliente.vendedor}` : ""}</span>
            <span>Impresso: ${hoje}</span>
        </div>
        <table>
            <thead><tr><th style="width:10%">Código</th><th class="desc">Descrição</th><th class="qtd" style="width:12%">Total</th><th class="qtd" style="width:12%">Entregue</th><th class="qtd" style="width:12%">Restante</th></tr></thead>
            <tbody>${corposHtml}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
        </body></html>`);
        w.document.close();
    };

    const imprimirVendedor = (vendedor) => {
        const clientesDoVendedor = clientes.filter(c => c.vendedor === vendedor);
        const hoje = new Date().toLocaleDateString("pt-BR");
        const tipoAbrev = { "Gorgurão": "GORG.", "Poliéster": "POL.", "Elástico": "ELAST." };
        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Pedidos - ${vendedor}</title>
        <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}h2{text-align:center;font-size:14px;margin:0}h3{text-align:center;font-size:12px;margin:4px 0 16px;font-weight:normal}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#eee;padding:6px 8px;text-align:left;border:1px solid #ccc;font-size:11px}td{padding:5px 8px;border:1px solid #ddd;font-size:11px}.ch{background:#111827;color:#fff;font-size:13px;font-weight:800;padding:8px 10px;margin-bottom:0}.th{background:#888;color:#fff;font-weight:800}.mh{background:#ddd;font-weight:700;font-style:italic}.st{background:#f5f5f5;font-weight:700}.tg{background:#e0e0e0;font-weight:800}.q{text-align:right}.d{width:75%}@media print{@page{margin:10mm}}</style>
        </head><body>
        <h2>FOURTEX IND E COM DE AVIAMENTO LTDA</h2>
        <h3>Vendedor: <strong>${vendedor}</strong> &nbsp;·&nbsp; ${hoje}</h3>`;

        clientesDoVendedor.forEach(c => {
            const pedidos = pedidosDoCliente(c.nome).filter(p => p.status !== "concluido");
            if (!pedidos.length) return;
            const grupos = {};
            pedidos.forEach(p => {
                const entregueMap = {};
                Object.values(p.entregasParciais || {}).forEach(e => {
                    (Array.isArray(e.itens) ? e.itens : Object.values(e.itens || {})).forEach(ei => {
                        const ek = `${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                        entregueMap[ek] = (entregueMap[ek] || 0) + Number(ei.qtd || 0);
                        entregueMap[ek + "|orig"] = (entregueMap[ek + "|orig"] || 0) + Number(ei.qtdOriginal || ei.qtd || 0);
                    });
                });
                (Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {})).forEach(it => {
                    const tipo=it.tipo||"—",medida=it.medida||"—",cor=it.cor||"—";
                    const isMetro=it.unidadeOriginal==="m"||it.unidadeOriginal==="Metro";
                    const isKg=it.unidadeOriginal==="Kg"||(it.tipo||"").toLowerCase()==="poliéster";
                    const totalPed=(isMetro||isKg)?(it.qtdOriginal||(isMetro?(it.qtdTotal||0)*25:it.qtdTotal||0)):(it.qtdTotal||0);
                    const ek=`${(it.cor||"").trim().toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`;
                    const entregueVal=(isMetro||isKg)?(entregueMap[ek+"|orig"]||0):(entregueMap[ek]||0);
                    const un=isMetro?"MTS":isKg?"KG":"RL";
                    if(!grupos[tipo])grupos[tipo]={};if(!grupos[tipo][medida])grupos[tipo][medida]={};
                    if(!grupos[tipo][medida][cor])grupos[tipo][medida][cor]={totalPed:0,entregue:0,un};
                    grupos[tipo][medida][cor].totalPed+=totalPed;
                    grupos[tipo][medida][cor].entregue+=Math.min(entregueVal,totalPed);
                });
            });
            if (!Object.keys(grupos).length) return;
            let rows="";let gT=0,gE=0,gR=0;
            Object.entries(grupos).forEach(([tipo,medidas])=>{
                rows+=`<tr><td colspan="4" class="th">${tipo.toUpperCase()}</td></tr>`;
                Object.entries(medidas).sort(([a],[b])=>parseInt(a)-parseInt(b)).forEach(([medida,cores])=>{
                    const abrev=tipoAbrev[tipo]||tipo.slice(0,5)+".";
                    const un=Object.values(cores)[0]?.un||"RL";
                    rows+=`<tr><td colspan="4" class="mh">${tipo.toUpperCase()} ${medida} ${un} 100MTS</td></tr>`;
                    let sT=0,sE=0,sR=0;
                    Object.entries(cores).sort(([a],[b])=>a.localeCompare(b)).forEach(([cor,d])=>{
                        const rest=Math.max(0,d.totalPed-d.entregue);sT+=d.totalPed;sE+=d.entregue;sR+=rest;
                        const rc=rest===0?"color:#16A34A":"";
                        rows+=`<tr><td class="d">${abrev} ${medida} ${d.un} 100MTS - ${cor.toUpperCase()}</td><td class="q">${d.totalPed.toLocaleString("pt-BR")}</td><td class="q">${d.entregue.toLocaleString("pt-BR")}</td><td class="q" style="${rc}">${rest.toLocaleString("pt-BR")}</td></tr>`;
                    });
                    rows+=`<tr class="st"><td>Subtotal</td><td class="q">${sT.toLocaleString("pt-BR")}</td><td class="q">${sE.toLocaleString("pt-BR")}</td><td class="q">${sR.toLocaleString("pt-BR")}</td></tr>`;gT+=sT;gE+=sE;gR+=sR;
                });
            });
            rows+=`<tr class="tg"><td>Total</td><td class="q">${gT.toLocaleString("pt-BR")}</td><td class="q">${gE.toLocaleString("pt-BR")}</td><td class="q" style="color:#DC2626">${gR.toLocaleString("pt-BR")}</td></tr>`;
            html+=`<div class="ch">${c.nome}</div><table><thead><tr><th class="d">Descrição</th><th class="q" style="width:12%">Total</th><th class="q" style="width:12%">Entregue</th><th class="q" style="width:12%">Restante</th></tr></thead><tbody>${rows}</tbody></table>`;
        });

        html += `<script>window.onload=()=>window.print();</script></body></html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        window.open(URL.createObjectURL(blob), "_blank");
    };

    return (
        <div style={{ padding: isMobile ? "16px 12px 40px" : "24px 24px 40px", maxWidth: 900, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                <div>
                    <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: "#111827" }}>Clientes</div>
                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{clientes.length} cadastrado{clientes.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
                    <button onClick={() => {
                        const tipoAbrev = { "Gorgurão": "GORG.", "Poliéster": "POL.", "Elástico": "ELAST." };
                        const hoje = new Date().toLocaleDateString("pt-BR");
                        const vendedoresUnicos = [...new Set(clientes.map(c => c.vendedor || "Sem vendedor"))].sort();
                        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Todos os Pedidos</title>
                        <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}h2{text-align:center;font-size:14px;margin:0}h3{text-align:center;font-size:12px;margin:4px 0 16px;font-weight:normal}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#eee;padding:6px 8px;text-align:left;border:1px solid #ccc;font-size:11px}td{padding:5px 8px;border:1px solid #ddd;font-size:11px}.vh{background:#1e3a5f;color:#fff;font-size:14px;font-weight:800;padding:10px;margin:16px 0 0}.ch{background:#374151;color:#fff;font-size:12px;font-weight:700;padding:6px 10px}.th{background:#888;color:#fff;font-weight:800}.mh{background:#ddd;font-weight:700;font-style:italic}.st{background:#f5f5f5;font-weight:700}.tg{background:#e0e0e0;font-weight:800}.q{text-align:right}.d{width:75%}@media print{@page{margin:10mm}}</style>
                        </head><body>
                        <h2>FOURTEX IND E COM DE AVIAMENTO LTDA</h2>
                        <h3>Relação Geral de Pedidos &nbsp;·&nbsp; ${hoje}</h3>`;

                        vendedoresUnicos.forEach(vendedor => {
                            const clientesV = clientes.filter(c => (c.vendedor || "Sem vendedor") === vendedor);
                            const temPedidos = clientesV.some(c => pedidosDoCliente(c.nome).filter(p => p.status !== "concluido").length > 0);
                            if (!temPedidos) return;
                            html += `<div class="vh">Vendedor: ${vendedor}</div>`;
                            clientesV.forEach(c => {
                                const pedidos = pedidosDoCliente(c.nome).filter(p => p.status !== "concluido");
                                if (!pedidos.length) return;
                                const grupos = {};
                                pedidos.forEach(p => {
                                    const eMap={};
                                    Object.values(p.entregasParciais||{}).forEach(e=>{
                                        (Array.isArray(e.itens)?e.itens:Object.values(e.itens||{})).forEach(ei=>{
                                            const ek=`${(ei.cor||"").trim().toLowerCase()}|${ei.medida}|${(ei.tipo||"").toLowerCase()}`;
                                            eMap[ek]=(eMap[ek]||0)+Number(ei.qtd||0);
                                            eMap[ek+"|orig"]=(eMap[ek+"|orig"]||0)+Number(ei.qtdOriginal||ei.qtd||0);
                                        });
                                    });
                                    (Array.isArray(p.itens) ? p.itens : Object.values(p.itens||{})).forEach(it => {
                                        const tipo=it.tipo||"—",medida=it.medida||"—",cor=it.cor||"—";
                                        const isMetro=it.unidadeOriginal==="m"||it.unidadeOriginal==="Metro";
                                        const isKg=it.unidadeOriginal==="Kg"||(it.tipo||"").toLowerCase()==="poliéster";
                                        const totalPed=(isMetro||isKg)?(it.qtdOriginal||(isMetro?(it.qtdTotal||0)*25:it.qtdTotal||0)):(it.qtdTotal||0);
                                        const ek=`${(it.cor||"").trim().toLowerCase()}|${it.medida}|${(it.tipo||"").toLowerCase()}`;
                                        const entregueVal=(isMetro||isKg)?(eMap[ek+"|orig"]||0):(eMap[ek]||0);
                                        const un=isMetro?"MTS":isKg?"KG":"RL";
                                        if(!grupos[tipo])grupos[tipo]={};if(!grupos[tipo][medida])grupos[tipo][medida]={};
                                        if(!grupos[tipo][medida][cor])grupos[tipo][medida][cor]={totalPed:0,entregue:0,un};
                                        grupos[tipo][medida][cor].totalPed+=totalPed;
                                        grupos[tipo][medida][cor].entregue+=Math.min(entregueVal,totalPed);
                                    });
                                });
                                let rows="";let gT=0,gE=0,gR=0;
                                Object.entries(grupos).forEach(([tipo,medidas])=>{
                                    rows+=`<tr><td colspan="4" class="th">${tipo.toUpperCase()}</td></tr>`;
                                    Object.entries(medidas).sort(([a],[b])=>parseInt(a)-parseInt(b)).forEach(([medida,cores])=>{
                                        const abrev=tipoAbrev[tipo]||tipo.slice(0,5)+".";
                                        const un=Object.values(cores)[0]?.un||"RL";
                                        rows+=`<tr><td colspan="4" class="mh">${tipo.toUpperCase()} ${medida} ${un} 100MTS</td></tr>`;
                                        let sT=0,sE=0,sR=0;
                                        Object.entries(cores).sort(([a],[b])=>a.localeCompare(b)).forEach(([cor,d])=>{
                                            const rest=Math.max(0,d.totalPed-d.entregue);sT+=d.totalPed;sE+=d.entregue;sR+=rest;
                                            const rc=rest===0?"color:#16A34A":"";
                                            rows+=`<tr><td class="d">${abrev} ${medida} ${d.un} 100MTS - ${cor.toUpperCase()}</td><td class="q">${d.totalPed.toLocaleString("pt-BR")}</td><td class="q">${d.entregue.toLocaleString("pt-BR")}</td><td class="q" style="${rc}">${rest.toLocaleString("pt-BR")}</td></tr>`;
                                        });
                                        rows+=`<tr class="st"><td>Subtotal</td><td class="q">${sT.toLocaleString("pt-BR")}</td><td class="q">${sE.toLocaleString("pt-BR")}</td><td class="q">${sR.toLocaleString("pt-BR")}</td></tr>`;gT+=sT;gE+=sE;gR+=sR;
                                    });
                                });
                                rows+=`<tr class="tg"><td>Total ${c.nome}</td><td class="q">${gT.toLocaleString("pt-BR")}</td><td class="q">${gE.toLocaleString("pt-BR")}</td><td class="q" style="color:#DC2626">${gR.toLocaleString("pt-BR")}</td></tr>`;
                                html+=`<div class="ch">${c.nome}</div><table><thead><tr><th class="d">Descrição</th><th class="q" style="width:12%">Total</th><th class="q" style="width:12%">Entregue</th><th class="q" style="width:12%">Restante</th></tr></thead><tbody>${rows}</tbody></table>`;
                            });
                        });
                        html+=`<script>window.onload=()=>window.print();</script></body></html>`;
                        const blob=new Blob([html],{type:"text/html;charset=utf-8"});
                        window.open(URL.createObjectURL(blob),"_blank");
                    }} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, cursor: "pointer", color: "#0891B2", whiteSpace: "nowrap" }}>
                        🖨 Imprimir tudo
                    </button>
                    <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." style={{
                        padding: "8px 12px", border: "1px solid #ECEDF1", borderRadius: 8, fontSize: 13,
                        background: "#F9FAFB", outline: "none", flex: isMobile ? 1 : "none", width: isMobile ? "auto" : 180,
                    }} />
                    {isAdmin && (
                        <button onClick={() => setShowVendedores(true)} style={{
                            padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#F9FAFB",
                            border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151", whiteSpace: "nowrap",
                        }}>
                            👤 Vendedores
                        </button>
                    )}
                    {podeEditar && (
                    <button onClick={openAdd} style={{
                        display: "flex", alignItems: "center", gap: 6, background: "#111827",
                        color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}>
                        <span style={{ fontSize: 16 }}>+</span> {isMobile ? "Novo" : "Novo cliente"}
                    </button>
                    )}
                </div>
            </div>

            {/* Filtro por vendedor */}
            {vendedoresFiltro.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <select
                        value={filtroVendedor}
                        onChange={e => setFiltroVendedor(e.target.value)}
                        style={{ padding: "8px 12px", border: `1.5px solid ${filtroVendedor ? "#6366F1" : "#ECEDF1"}`, borderRadius: 8, fontSize: 13, background: filtroVendedor ? "#EEF2FF" : "#F9FAFB", color: filtroVendedor ? "#4338CA" : "#6B7280", fontWeight: filtroVendedor ? 700 : 400, outline: "none", cursor: "pointer", width: isMobile ? "100%" : 220 }}
                    >
                        <option value="">Todos os vendedores</option>
                        {vendedoresFiltro.map(v => (
                            <option key={v} value={v}>{v} ({clientes.filter(c => c.vendedor === v).length} clientes)</option>
                        ))}
                    </select>
                    {filtroVendedor && (
                        <>
                            <span style={{ marginLeft: 10, fontSize: 12, color: "#9CA3AF" }}>{filtered.length} cliente{filtered.length !== 1 ? "s" : ""}</span>
                            <button onClick={() => imprimirVendedor(filtroVendedor)} style={{ marginLeft: 10, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 7, cursor: "pointer", color: "#2563EB" }}>
                                🖨 Imprimir tudo do vendedor
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Lista */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.length === 0 && (
                    <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "40px 0" }}>
                        {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
                    </div>
                )}
                {filtered.map(c => {
                    const pedidos = pedidosDoCliente(c.nome);
                    const pendente = pedidos.filter(p => p.status === "pendente").length;
                    const confirm  = pedidos.filter(p => p.status === "confirmacao").length;
                    const emProd   = pedidos.filter(p => p.status === "em_producao").length;
                    const conc     = pedidos.filter(p => p.status === "concluido").length;
                    return (
                        <div key={c.key} style={{ background: "#fff", border: "1px solid #ECEDF1", borderRadius: 12, padding: isMobile ? "12px 14px" : "16px 20px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: "50%", background: "#F97316",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 14, color: "#fff", fontWeight: 700, flexShrink: 0,
                                }}>
                                    {c.nome.slice(0, 2).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{c.nome}</div>
                                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                                        {c.vendedor ? `Vendedor: ${c.vendedor}` : "Sem vendedor"}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                        {pendente > 0 && <span style={{ background: "#FFF7ED", color: "#D97706", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{pendente} aguardando</span>}
                                        {confirm  > 0 && <span style={{ background: "#F5F3FF", color: "#7C3AED", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{confirm} confirmado{confirm !== 1 ? "s" : ""}</span>}
                                        {emProd   > 0 && <span style={{ background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{emProd} em produção</span>}
                                        {conc     > 0 && <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{conc} concluído{conc !== 1 ? "s" : ""}</span>}
                                        {pedidos.length === 0 && <span style={{ color: "#9CA3AF", fontSize: 11 }}>sem pedidos</span>}
                                    </div>
                                    {/* Pedidos — oculto no mobile */}
                                    {pedidos.length > 0 && !isMobile && (() => {
                                        const ativos    = pedidos.filter(p => p.status !== "concluido");
                                        const concluidos = pedidos.filter(p => p.status === "concluido");
                                        const verConc   = mostrarConcluidosKey[c.key];
                                        const lista     = verConc ? pedidos : ativos;
                                        return (
                                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                                                {lista.slice(0, 5).map(p => {
                                                    const itens = Array.isArray(p.itens) ? p.itens : Object.values(p.itens || {});
                                                    const total = itens.reduce((a, i) => a + (i.qtdTotal || 0), 0);
                                                    const prod  = itens.reduce((a, i) => a + (i.qtdProduzida || 0), 0);
                                                    const pct   = total > 0 ? Math.round((prod / total) * 100) : 0;
                                                    return (
                                                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#374151", opacity: p.status === "concluido" ? 0.6 : 1 }}>
                                                            <span style={{ color: "#9CA3AF" }}>#{p.numero} · Entrega {formatDate(p.dataEntrega)}</span>
                                                            <div style={{ flex: 1, maxWidth: 80, height: 4, background: "#F3F4F6", borderRadius: 2 }}>
                                                                <div style={{ height: "100%", width: `${pct}%`, background: p.status === "concluido" ? "#16A34A" : "#F97316", borderRadius: 2 }} />
                                                            </div>
                                                            <span style={{ color: "#9CA3AF" }}>{pct}%</span>
                                                        </div>
                                                    );
                                                })}
                                                {concluidos.length > 0 && (
                                                    <button onClick={() => setMostrarConcluidosKey(p => ({ ...p, [c.key]: !p[c.key] }))}
                                                        style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9CA3AF", padding: 0, marginTop: 2 }}>
                                                        {verConc ? `▲ Ocultar concluídos` : `▼ Ver ${concluidos.length} concluído${concluidos.length !== 1 ? "s" : ""}`}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 6, flexShrink: 0 }}>
                                    {pedidos.filter(p => p.status !== "concluido").length > 0 && <button onClick={() => imprimirPedidosCliente(c)} style={{ padding: isMobile ? "8px 14px" : "6px 12px", fontSize: 12, fontWeight: 600, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, cursor: "pointer", color: "#2563EB" }}>🖨 Imprimir</button>}
                                    {(isAdmin || podeEditar) && <button onClick={() => openEdit(c)} style={{ padding: isMobile ? "8px 14px" : "6px 12px", fontSize: 12, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 6, cursor: "pointer", color: "#374151" }}>Editar</button>}
                                    {(isAdmin || podeEditar) && <button onClick={() => setConfirmDel(c.key)} style={{ padding: isMobile ? "8px 14px" : "6px 12px", fontSize: 12, fontWeight: 600, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, cursor: "pointer", color: "#DC2626" }}>Remover</button>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal form */}
            {showForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
                    <div style={{ background: "#fff", borderRadius: isMobile ? "16px 16px 0 0" : 14, padding: isMobile ? "24px 20px 32px" : 28, width: "100%", maxWidth: isMobile ? "100%" : 440 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 20 }}>{editKey ? "Editar cliente" : "Novo cliente"}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>NOME *</div>
                                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                                    placeholder="Nome do cliente"
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #ECEDF1", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>VENDEDOR</div>
                                <select value={form.vendedor} onChange={e => setForm(p => ({ ...p, vendedor: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #ECEDF1", borderRadius: 7, fontSize: 13, boxSizing: "border-box", background: "#fff" }}>
                                    <option value="">Sem vendedor</option>
                                    {vendedores.map(v => <option key={v.key} value={v.nome}>{v.nome}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                            <button onClick={() => { setShowForm(false); setEditKey(null); }} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>Cancelar</button>
                            <button onClick={handleSave} style={{ flex: 2, padding: 10, fontSize: 13, fontWeight: 700, background: "#111827", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Vendedores */}
            {showVendedores && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
                    <div style={{ background: "#fff", borderRadius: isMobile ? "16px 16px 0 0" : 14, padding: isMobile ? "24px 20px 32px" : 28, width: "100%", maxWidth: isMobile ? "100%" : 400 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 16 }}>Vendedores</div>
                        {podeEditar && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                            <input
                                value={novoVendedorNome}
                                onChange={e => setNovoVendedorNome(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && novoVendedorNome.trim()) { onAddVendedor?.(novoVendedorNome); setNovoVendedorNome(""); } }}
                                placeholder="Nome do vendedor"
                                style={{ flex: 1, padding: "8px 10px", border: "1px solid #ECEDF1", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }}
                            />
                            <button
                                onClick={() => { if (novoVendedorNome.trim()) { onAddVendedor?.(novoVendedorNome); setNovoVendedorNome(""); } }}
                                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, background: "#111827", border: "none", borderRadius: 7, cursor: "pointer", color: "#fff" }}
                            >
                                + Add
                            </button>
                        </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                            {vendedores.length === 0 && (
                                <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" }}>Nenhum vendedor cadastrado.</div>
                            )}
                            {vendedores.map(v => (
                                <div key={v.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8 }}>
                                    {podeEditar && editingVendedorKey === v.key ? (
                                        <>
                                            <input
                                                autoFocus
                                                value={editingVendedorNome}
                                                onChange={e => setEditingVendedorNome(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter" && editingVendedorNome.trim()) { onEditVendedor?.(v.key, editingVendedorNome); setEditingVendedorKey(null); }
                                                    if (e.key === "Escape") setEditingVendedorKey(null);
                                                }}
                                                style={{ flex: 1, padding: "6px 8px", border: "1px solid #BAE6FD", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                                            />
                                            <button onClick={() => { if (editingVendedorNome.trim()) { onEditVendedor?.(v.key, editingVendedorNome); setEditingVendedorKey(null); } }} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, cursor: "pointer", color: "#16A34A" }}>Salvar</button>
                                            <button onClick={() => setEditingVendedorKey(null)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 6, cursor: "pointer", color: "#6B7280" }}>Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{v.nome}</span>
                                            {podeEditar && (
                                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                                <button onClick={() => { setEditingVendedorKey(v.key); setEditingVendedorNome(v.nome); }} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 6, cursor: "pointer", color: "#374151" }}>Editar</button>
                                                <button onClick={() => setConfirmDelVendedor(v)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, cursor: "pointer", color: "#DC2626" }}>Remover</button>
                                            </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <button onClick={() => setShowVendedores(false)} style={{ width: "100%", padding: 10, fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar remoção de vendedor */}
            {confirmDelVendedor && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 340, textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Remover vendedor "{confirmDelVendedor.nome}"?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Clientes já vinculados a este vendedor não serão alterados.</div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmDelVendedor(null)} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>Cancelar</button>
                            <button onClick={() => { onDeleteVendedor?.(confirmDelVendedor.key); setConfirmDelVendedor(null); }} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 700, background: "#DC2626", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}>Remover</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar remoção */}
            {confirmDel && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 340, textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Remover cliente?</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Os pedidos associados não serão afetados.</div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 600, background: "#F9FAFB", border: "1px solid #ECEDF1", borderRadius: 8, cursor: "pointer", color: "#374151" }}>Cancelar</button>
                            <button onClick={() => handleDelete(confirmDel)} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 700, background: "#DC2626", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff" }}>Remover</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
