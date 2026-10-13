import { useState } from "react";
import ColetaTab from "./ColetaTab";
import MercadoriaTab from "./MercadoriaTab";

const CORES = {
    coleta:     { cor: "#DC2626", bg: "#FEF2F2", label: "📦 Coleta" },
    mercadoria: { cor: "#D97706", bg: "#FFFBEB", label: "🧾 Mercadoria" },
};

export default function SolicitacoesTab({ coletaProps, mercadoriaProps }) {
    const [modo, setModo] = useState("coleta");
    const ativo = CORES[modo];

    return (
        <div>
            <div style={{ background: ativo.bg, borderBottom: `3px solid ${ativo.cor}`, padding: "16px 20px", display: "flex", justifyContent: "center", transition: "background 0.15s, border-color 0.15s" }}>
                <div style={{ display: "flex", background: "#fff", borderRadius: 12, padding: 4, gap: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    {Object.entries(CORES).map(([id, { cor, label }]) => (
                        <button key={id} onClick={() => setModo(id)} style={{
                            padding: "10px 26px", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 700,
                            background: modo === id ? cor : "transparent",
                            color: modo === id ? "#fff" : "#6B7280",
                            cursor: "pointer", transition: "background 0.12s, color 0.12s",
                        }}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {modo === "coleta"
                ? <ColetaTab {...coletaProps} />
                : <MercadoriaTab {...mercadoriaProps} />}
        </div>
    );
}
