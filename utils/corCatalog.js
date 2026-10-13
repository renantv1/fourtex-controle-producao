export const COR_CATALOG = [
    { codigo: "2210", nome: "Branco" },
    { codigo: "2109", nome: "Preto" },
    { codigo: "2127", nome: "Marrom" },
    { codigo: "2117", nome: "Marinho" },
    { codigo: "2825", nome: "Noite" },
    { codigo: "4024", nome: "Thifany" },
    { codigo: "3725", nome: "Lilás" },
    { codigo: "3726", nome: "Verde Fluor" },
    { codigo: "2153", nome: "Royal" },
    { codigo: "2154", nome: "Cinza Claro" },
    { codigo: "2199", nome: "Bege S-8166" },
    { codigo: "3958", nome: "Bege C-104" },
    { codigo: "3735", nome: "Verde Pistache" },
    { codigo: "3736", nome: "Roxo" },
    { codigo: "3762", nome: "Marfim" },
    { codigo: "3840", nome: "Laranja Fluor" },
    { codigo: "3957", nome: "Bege A-3004" },
    { codigo: "2241", nome: "Bandeira" },
    { codigo: "2240", nome: "Vermelho" },
    { codigo: "2277", nome: "Cinza Escuro" },
    { codigo: "3896", nome: "Pink Fluor" },
    { codigo: "3897", nome: "Amarelo Fluor" },
    { codigo: "3952", nome: "Verde Claro" },
    { codigo: "3953", nome: "Ocre" },
    { codigo: "2274", nome: "Rosa Bebê" },
    { codigo: "2278", nome: "Pink" },
    { codigo: "2314", nome: "Bordô" },
    { codigo: "2347", nome: "Laranja" },
    { codigo: "3956", nome: "Nude" },
    { codigo: "4314", nome: "Mostarda" },
    { codigo: "2590", nome: "Caqui" },
    { codigo: "2705", nome: "Amarelo Ouro" },
    { codigo: "2706", nome: "Musgo" },
    { codigo: "4228", nome: "Militar" },
    { codigo: "2707", nome: "Turquesa" },
    { codigo: "2751", nome: "Azul Bebê" },
    { codigo: "2756", nome: "Amarelo B. Brasil" },
    { codigo: "2757", nome: "Amarelo Canário" },

];

/** Lista ordenada A-Z pelo nome */
export const COR_CATALOG_SORTED = [...COR_CATALOG].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

/** Mapa nome → cor CSS aproximada para exibição visual */
export const COR_HEX = {
    "Amarelo B. Brasil": "#FFD700",
    "Amarelo Canário":   "#FFF44F",
    "Amarelo Fluor":     "#CCFF00",
    "Amarelo Ouro":      "#FFC200",
    "Azul Bebê":         "#89CFF0",
    "Bandeira":          "#009C3B",
    "Bege A-3004":       "#D8B870",
    "Bege C-104":        "#E8D490",
    "Bege S-8166":       "#CDB89A",
    "Bordô":             "#800020",
    "Branco":            "#FFFFFF",
    "Caqui":             "#C3B091",
    "Cinza Claro":       "#BDBDBD",
    "Cinza Escuro":      "#555555",
    "Laranja":           "#FF6600",
    "Laranja Fluor":     "#FF4500",
    "Lilás":             "#C8A2C8",
    "Marfim":            "#FFFADC",
    "Marinho":           "#001F5B",
    "Marrom":            "#8B4513",
    "Militar":           "#4B5320",
    "Mostarda":          "#FFDB58",
    "Musgo":             "#8A9A5B",
    "Noite":             "#0D1B2A",
    "Nude":              "#E3C5A0",
    "Ocre":              "#CC7722",
    "Pink":              "#FF69B4",
    "Pink Fluor":        "#FF1493",
    "Preto":             "#1A1A1A",
    "Rosa Bebê":         "#FFB7C5",
    "Royal":             "#4169E1",
    "Roxo":              "#7B2D8B",
    "Thifany":           "#81D8D0",
    "Turquesa":          "#00CED1",
    "Verde Claro":       "#90EE90",
    "Verde Fluor":       "#39FF14",
    "Verde Pistache":    "#93C572",
    "Vermelho":          "#CC0000",
};


/** Retorna o nome da cor a partir do código, ou null se não encontrado */
export function resolverCor(input) {
    const v = (input || "").trim();
    const porCodigo = COR_CATALOG.find(c => c.codigo === v);
    if (porCodigo) return porCodigo.nome;
    const porNome = COR_CATALOG.find(c => c.nome.toLowerCase() === v.toLowerCase());
    if (porNome) return porNome.nome;
    return null;
}

/** Retorna o código de uma cor pelo nome (primeiro match) */
export function codigoDaCor(nome) {
    const entry = COR_CATALOG.find(c => c.nome.toLowerCase() === (nome || "").trim().toLowerCase());
    return entry ? entry.codigo : null;
}

