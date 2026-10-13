import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function SimpleSelect({ value, onChange, options = [], style = {}, wrapperStyle = {}, placeholder = "Selecione...", getLabel = (o) => o, getValue = (o) => o }) {
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

    const select = (val) => {
        onChange({ target: { value: val } });
        setOpen(false);
    };

    const handleItemTouchStart = e => {
        touchStart.current = { y: e.touches[0].clientY };
    };

    const handleItemTouchEnd = (e, val) => {
        if (!touchStart.current) return;
        const moved = Math.abs(e.changedTouches[0].clientY - touchStart.current.y) > 8;
        touchStart.current = null;
        if (!moved) {
            e.preventDefault();
            select(val);
        }
    };

    const baseBtn = {
        width: "100%", display: "flex", alignItems: "center", gap: 7,
        background: "#F9FAFB", border: "1.5px solid #ECEDF1", borderRadius: 8,
        padding: "8px 10px", cursor: "pointer", textAlign: "left", outline: "none",
        fontSize: 13, color: "#111827", boxSizing: "border-box",
        ...style,
    };

    const selected = options.find(o => getValue(o) === value);

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
            {options.map(o => {
                const val = getValue(o);
                return (
                    <div
                        key={val}
                        onMouseDown={e => { e.preventDefault(); select(val); }}
                        onTouchStart={handleItemTouchStart}
                        onTouchEnd={e => handleItemTouchEnd(e, val)}
                        style={{
                            padding: "9px 12px", fontSize: 13, cursor: "pointer",
                            background: value === val ? "#FFF7ED" : "transparent",
                            color: value === val ? "#F97316" : "#111827",
                            fontWeight: value === val ? 700 : 400,
                        }}
                    >
                        {getLabel(o)}
                    </div>
                );
            })}
        </div>,
        document.body
    );

    return (
        <div ref={ref} style={{ position: "relative", width: style.width || "100%", ...wrapperStyle }}>
            <button ref={btnRef} type="button" onClick={handleOpen} style={baseBtn}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: selected ? "#111827" : "#9CA3AF" }}>
                    {selected ? getLabel(selected) : placeholder}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path d="M2 4l4 4 4-4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {dropdown}
        </div>
    );
}
