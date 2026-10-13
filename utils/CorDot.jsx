import { COR_HEX } from "./corCatalog";

const LIGHT = new Set(["Branco", "Marfim", "Amarelo Canário", "Amarelo Fluor", "Amarelo B. Brasil", "Bege S-8166", "Verde Fluor", "Amarelo Ouro"]);

/** Bolinha inline para usar dentro de texto/listas. */
export function CorInline({ cor }) {
    const bg = COR_HEX[cor];
    if (!bg) return null;
    return (
        <span style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: bg,
            border: LIGHT.has(cor) ? "1px solid #9CA3AF" : "1px solid rgba(0,0,0,0.12)",
            verticalAlign: "middle",
            flexShrink: 0,
            marginRight: 5,
        }} />
    );
}

/**
 * Bolinha colorida posicionada dentro de um wrapper position:relative.
 * O <select> ou <input> pai deve ter paddingLeft: 28 quando cor selecionada.
 */
export function CorDot({ cor }) {
    const bg = COR_HEX[cor];
    if (!bg) return null;
    return (
        <span style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 13,
            height: 13,
            borderRadius: "50%",
            background: bg,
            border: LIGHT.has(cor) ? "1.5px solid #9CA3AF" : "1.5px solid rgba(0,0,0,0.15)",
            pointerEvents: "none",
            zIndex: 1,
            flexShrink: 0,
        }} />
    );
}
