export default function LoginPage({ login, setLogin, senha, setSenha, loginError, onLogin, conectando }) {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #111827 0%, #1F2937 100%)",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: 16,
        }}>
            <div style={{
                width: "100%", maxWidth: 400, background: "#fff",
                borderRadius: 16, padding: "40px 36px",
                boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
            }}>
                {/* Logo */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
                    <img src="/icons/logo.png.jpeg" alt="FourTEX" style={{ height: 140, objectFit: "contain" }} />
                </div>

                <div style={{ marginBottom: 24, textAlign: "center" }}>
                    <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#111827" }}>Entrar</h2>
                    <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>Use suas credenciais para acessar o sistema</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>USUÁRIO</label>
                        <input
                            placeholder="Digite seu usuário"
                            value={login}
                            onChange={e => setLogin(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && onLogin()}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>SENHA</label>
                        <input
                            placeholder="Digite sua senha"
                            type="password"
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && onLogin()}
                            style={inputStyle}
                        />
                    </div>
                    {conectando && (
                        <div style={{ fontSize: 12, color: "#6B7280", background: "#F3F4F6", border: "1px solid #ECEDF1", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                            Conectando ao servidor...
                        </div>
                    )}
                    {loginError && (
                        <div style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", fontWeight: 500 }}>
                            ✕ {loginError}
                        </div>
                    )}
                    <button onClick={conectando ? undefined : onLogin} style={{
                        marginTop: 4, padding: "12px", background: conectando ? "#D1D5DB" : "#F97316", border: "none",
                        borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 15,
                        cursor: conectando ? "not-allowed" : "pointer", letterSpacing: "0.02em",
                        opacity: conectando ? 0.7 : 1,
                    }}>
                        {conectando ? "Aguardando..." : "Entrar →"}
                    </button>
                </div>

            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "11px 13px",
    border: "1.5px solid #ECEDF1", borderRadius: 9, fontSize: 14,
    color: "#111827", background: "#F9FAFB", outline: "none",
    transition: "border-color 0.15s",
};
