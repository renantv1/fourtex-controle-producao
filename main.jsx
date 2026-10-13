import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./app.jsx";
import { APP_VERSION } from "./version.js";

if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        release: "app-fitas@" + APP_VERSION,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0,
    });
}

class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(e) { return { error: e }; }
    componentDidCatch(error, info) { Sentry.captureException(error, { extra: info }); }
    render() {
        if (this.state.error) return (
            <div style={{ padding: 32, fontFamily: "monospace", background: "#fff", minHeight: "100vh" }}>
                <h2 style={{ color: "#DC2626" }}>Erro no app</h2>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#374151" }}>
                    {this.state.error?.message}{"\n"}{this.state.error?.stack}
                </pre>
                <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 16px", background: "#F97316", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    Recarregar
                </button>
            </div>
        );
        return this.props.children;
    }
}

// Força limpeza do service worker e cache antigo
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
    });
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
}

// Auto-update: compara versão local com versão remota e recarrega se diferente.
// Checa ao abrir, a cada 5 min e quando a aba volta a ficar visível (quem deixa o app aberto também atualiza).
// Recarrega no máximo uma vez por versão remota, para não entrar em loop.
const checarVersao = async () => {
    try {
        const res = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== APP_VERSION && sessionStorage.getItem("ftx_updated") !== version) {
            sessionStorage.setItem("ftx_updated", version);
            window.location.reload();
        }
    } catch {}
};
checarVersao();
setInterval(checarVersao, 5 * 60 * 1000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checarVersao(); });

// Guarda contra HMR chamando createRoot() de novo sobre o mesmo container
// (isso deixava dois roots do React disputando os mesmos nós do DOM e
// causava "NotFoundError: Failed to execute 'removeChild'" em hot-updates)
const container = document.getElementById("root");
if (!container._reactRoot) container._reactRoot = createRoot(container);
container._reactRoot.render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>
);

// Remove o splash HTML assim que o React assumir o controle
if (typeof window.__hideSplash === "function") window.__hideSplash();
