const ROLE_LABEL = { admin: "Administrador", operador: "Operador", apontador: "Apontador", pedidos: "Pedidos" };

export default function Header({ user, alertOrders, onLogout }) {
    return (
        <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎀</span>
                <span style={{ fontWeight: 500, fontSize: 15 }}>Produção de Fitas</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {alertOrders.length > 0 && (
                    <span style={{ background: "var(--color-background-warning)", color: "var(--color-text-warning)", fontSize: 12, padding: "3px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-warning)" }}>
                        ⚠ {alertOrders.length} pedido(s) urgente(s)
                    </span>
                )}
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{user.name}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", padding: "2px 8px", borderRadius: "var(--border-radius-md)" }}>{ROLE_LABEL[user.role]}</span>
                <button onClick={onLogout} style={{ fontSize: 12, padding: "4px 10px" }}>Sair</button>
            </div>
        </div>
    );
}
