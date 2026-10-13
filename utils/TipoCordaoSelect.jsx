import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { TIPOS_CORDAO, TIPO_CORDAO_COLOR } from "./cordoesCatalog";

export function TipoCordaoSelect({ value, onChange, style = {} }) {
    const [open, setOpen]       = useState(false);
    const [dropPos, setDropPos] = useState(null);
    const ref    = useRef();
    const btnRef = useRef();

    useEffect(() => {
        if (!open) return;
        const onMouseDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, [open]);

    const handleOpen = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const goUp = spaceBelow < 200;
            setDropPos({
                left: rect.left, width: rect.width,
                top:    goUp ? undefined : rect.bottom + 4,
                bottom: goUp ? window.innerHeight - rect.top + 4 : undefined,
            });
        }
        setOpen(o => !o);
    };

    const select = (t) => { onChange({ target: { value: t } }); setOpen(false); };

    const baseBtn = {
        width: "100%", display: "flex", alignItems: "center", gap: 7,
        background: "#F9FAFB", border: "1.5px solid #ECEDF1", borderRadius: 8,
        padding: "8px 10px", cursor: "pointer", textAlign: "left", outline: "none",
        fontSize: 13, color: "#111827", boxSizing: "border-box",
        ...style,
    };

    const dropdown = open && dropPos && createPortal(
        <div style={{
            position: "fixed", left: dropPos.left, width: dropPos.width,
            top: dropPos.top, bottom: dropPos.bottom, zIndex: 99999,
            background: "#fff", border: "1.5px solid #ECEDF1", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden",
        }}>
            {TIPOS_CORDAO.map(t => (
                <div key={t} onMouseDown={e => { e.preventDefault(); select(t); }} style={{
                    padding: "9px 12px", display: "flex", alignItems: "center", gap: 8,
                    cursor: "pointer", fontSize: 13,
                    background: value === t ? TIPO_CORDAO_COLOR[t] + "18" : "transparent",
                    color: value === t ? TIPO_CORDAO_COLOR[t] : "#111827",
                    fontWeight: value === t ? 700 : 400,
                }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: TIPO_CORDAO_COLOR[t], flexShrink: 0 }} />
                    {t}
                </div>
            ))}
        </div>,
        document.body
    );

    return (
        <div ref={ref} style={{ position: "relative", width: "100%" }}>
            <button ref={btnRef} type="button" onClick={handleOpen} style={baseBtn}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: TIPO_CORDAO_COLOR[value] || "#D1D5DB", flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? "#111827" : "#9CA3AF" }}>
                    {value || "Selecione o tipo"}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path d="M2 4l4 4 4-4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {dropdown}
        </div>
    );
}
