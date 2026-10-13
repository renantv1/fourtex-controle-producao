export default function TopBar({ alertOrders, onToggleSidebar }) {
    return (
        <div style={{
            height: 56, background: "#fff", borderBottom: "1px solid #ECEDF1",
            padding: "0 16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 10, flexShrink: 0,
        }}>
            {/* Hamburguer + Atualizar juntos à esquerda */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={onToggleSidebar} style={{
                    width: 36, height: 36, borderRadius: 8, border: "1px solid #ECEDF1",
                    background: "#F9FAFB", cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                    <span style={{ width: 16, height: 2, background: "#374151", borderRadius: 2, display: "block" }} />
                    <span style={{ width: 16, height: 2, background: "#374151", borderRadius: 2, display: "block" }} />
                    <span style={{ width: 16, height: 2, background: "#374151", borderRadius: 2, display: "block" }} />
                </button>

                <button onClick={() => window.location.reload()} style={{
                    width: 36, height: 36, borderRadius: 8, border: "1px solid #ECEDF1",
                    background: "#F9FAFB", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                    </svg>
                </button>
            </div>

            {alertOrders.length > 0 && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "#FFF7ED", border: "1px solid #FDBA74",
                    borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#C2410C", fontWeight: 500,
                }}>
                    ⚠ {alertOrders.length} urgente(s)
                </div>
            )}
        </div>
    );
}
