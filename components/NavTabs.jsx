export default function NavTabs({ tabs, activeTab, onTabChange }) {
    return (
        <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", padding: "0 1.5rem" }}>
            {tabs.map(t => (
                <button key={t.id} onClick={() => onTabChange(t.id)} style={{ background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent", padding: "10px 16px", fontSize: 14, fontWeight: activeTab === t.id ? 500 : 400, color: activeTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", borderRadius: 0 }}>
                    {t.label}
                </button>
            ))}
        </div>
    );
}
