import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { COR_HEX } from "./corCatalog";

const LIGHT = new Set(["Branco", "Marfim", "Amarelo Canário", "Amarelo Fluor", "Amarelo B. Brasil", "Bege S-8166", "Verde Fluor", "Amarelo Ouro"]);

function Dot({ cor, size = 12 }) {
    const bg = COR_HEX[cor];
    if (!bg) return null;
    return (
        <span style={{
            display: "inline-block", flexShrink: 0,
            width: size, height: size, borderRadius: "50%",
            background: bg,
            border: LIGHT.has(cor) ? "1.5px solid #9CA3AF" : "1.5px solid rgba(0,0,0,0.15)",
            verticalAlign: "middle",
        }} />
    );
}

export function CorSelect({ value, onChange, options = [], style = {}, wrapperStyle = {}, placeholder = "Selecione...", showCodigo = true }) {
    const [open, setOpen]       = useState(false);
    const [dropPos, setDropPos] = useState(null);
    const ref        = useRef();
    const btnRef     = useRef();
    const touchStart = useRef(null);

    useEffect(() => {
        if (!open) return;

        const onTouchStart = e => {
            touchStart.current = { y: e.touches[0].clientY };
        };

        const onTouchEnd = e => {
            if (!touchStart.current) return;
            const moved = Math.abs(e.changedTouches[0].clientY - touchStart.current.y) > 8;
            touchStart.current = null;
            if (!moved && ref.current && !ref.current.contains(e.target)) setOpen(false);
        };

        const onMouseDown = e => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };

        const onScroll = () => {
            if (btnRef.current) {
                const rect = btnRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const goUp = spaceBelow < 280;
                setDropPos({
                    left: rect.left,
                    width: rect.width,
                    top:    goUp ? undefined : rect.bottom + 4,
                    bottom: goUp ? window.innerHeight - rect.top + 4 : undefined,
                });
            }
        };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchend", onTouchEnd);
        document.addEventListener("mousedown", onMouseDown);
        window.addEventListener("scroll", onScroll, true);
        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchend", onTouchEnd);
            document.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("scroll", onScroll, true);
        };
    }, [open]);

    const handleOpen = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const goUp = spaceBelow < 280;
            setDropPos({
                left: rect.left,
                width: rect.width,
                top:    goUp ? undefined : rect.bottom + 4,
                bottom: goUp ? window.innerHeight - rect.top + 4 : undefined,
            });
        }
        setOpen(o => !o);
    };

    const select = (nome) => {
        onChange({ target: { value: nome } });
        setOpen(false);
    };

    const handleItemTouchStart = e => {
        touchStart.current = { y: e.touches[0].clientY };
    };

    const handleItemTouchEnd = (e, nome) => {
        if (!touchStart.current) return;
        const moved = Math.abs(e.changedTouches[0].clientY - touchStart.current.y) > 8;
        touchStart.current = null;
        if (!moved) {
            e.preventDefault();
            select(nome);
        }
    };

    const baseBtn = {
        width: "100%", display: "flex", alignItems: "center", gap: 7,
        background: "#F9FAFB", border: "1.5px solid #ECEDF1", borderRadius: 8,
        padding: "8px 10px", cursor: "pointer", textAlign: "left", outline: "none",
        fontSize: 13, color: "#111827", boxSizing: "border-box",
        ...style,
    };

    const dropdown = open && dropPos && createPortal(
        <div
            style={{
                position: "fixed",
                left: dropPos.left,
                width: dropPos.width,
                top:    dropPos.top,
                bottom: dropPos.bottom,
                zIndex: 99999,
                background: "#fff", border: "1.5px solid #ECEDF1", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                maxHeight: 260, overflowY: "auto",
                WebkitOverflowScrolling: "touch",
            }}
        >
            <div
                onMouseDown={e => { e.preventDefault(); select(""); }}
                onTouchStart={handleItemTouchStart}
                onTouchEnd={e => handleItemTouchEnd(e, "")}
                style={{ padding: "9px 12px", color: "#9CA3AF", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #F3F4F6" }}
            >
                {placeholder}
            </div>
            {options.map(c => (
                <div
                    key={c.codigo}
                    onMouseDown={e => { e.preventDefault(); select(c.nome); }}
                    onTouchStart={handleItemTouchStart}
                    onTouchEnd={e => handleItemTouchEnd(e, c.nome)}
                    style={{
                        padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
                        cursor: "pointer", fontSize: 13,
                        background: value === c.nome ? "#FFF7ED" : "transparent",
                        color: value === c.nome ? "#F97316" : "#111827",
                        fontWeight: value === c.nome ? 700 : 400,
                    }}
                >
                    <Dot cor={c.nome} size={11} />
                    {showCodigo ? `${c.codigo} — ${c.nome}` : c.nome}
                </div>
            ))}
        </div>,
        document.body
    );

    return (
        <div ref={ref} style={{ position: "relative", width: style.width || "100%", ...wrapperStyle }}>
            <button ref={btnRef} type="button" onClick={handleOpen} style={baseBtn}>
                <Dot cor={value} size={12} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? "#111827" : "#9CA3AF" }}>
                    {value || placeholder}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path d="M2 4l4 4 4-4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {dropdown}
        </div>
    );
}
