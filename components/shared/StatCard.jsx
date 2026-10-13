// Cartão de estatística padrão do app — usado no topo das telas de lista (Pedidos, Dashboard, etc).
export function pctColor(pct) {
    return pct >= 80 ? "#16A34A" : pct >= 40 ? "#F59E0B" : "#DC2626";
}

export function StatCard({ label, value, sub, color, iconBg, iconColor, iconPath }) {
    return (
        <div style={{ flex: 1, minWidth: 150, background: "#fff", border: "1px solid #ECEDF1", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7280", letterSpacing: "0.3px" }}>{label.toUpperCase()}</span>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">{iconPath}</svg>
                </div>
            </div>
            <span style={{ fontSize: 25, fontWeight: 800, color: color || "#111827" }}>{value}</span>
            {sub && <span style={{ fontSize: 11, color: "#9CA3AF", marginTop: -6 }}>{sub}</span>}
        </div>
    );
}
