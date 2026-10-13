// Usuários de demonstração (os reais ficam só no banco de dados)
export const USERS = [
    { id: 1, name: "Admin Demo", login: "admin", senha: "demo", role: "admin", permissoes: null },
    { id: 2, name: "Operador Demo", login: "operador", senha: "demo", role: "operador", permissoes: null },
];

export const TURNOS = ["Turno 1 (06h–14h)", "Turno 2 (14h–22h)", "Turno 3 (22h–06h)"];

// Feriados 2026 — Apucarana / PR
// Nacionais + Estadual (Paraná) + Municipais (Apucarana)
export const FERIADOS_2026 = [
    // Nacionais
    "2026-01-01", // Confraternização Universal (Ano Novo)
    "2026-02-16", // Carnaval (2ª feira)
    "2026-02-17", // Carnaval (3ª feira)
    "2026-04-03", // Paixão de Cristo (Sexta-feira Santa)
    "2026-04-05", // Páscoa
    "2026-04-21", // Tiradentes
    "2026-05-01", // Dia do Trabalho
    "2026-06-04", // Corpus Christi
    "2026-09-07", // Independência do Brasil
    "2026-10-12", // Nossa Senhora Aparecida
    "2026-11-02", // Finados
    "2026-11-20", // Dia da Consciência Negra
    "2026-12-25", // Natal
    // Estadual — Paraná
    "2026-08-29", // Emancipação Política do Paraná
    // Municipais — Apucarana
    "2026-01-28", // Aniversário de Apucarana
];

export const INITIAL_MACHINES = [
    { id: 1, nome: "Máquina 1", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "22mm", qtd: 8 }, { cor: "Preto", medida: "25mm", qtd: 11 }] },
    { id: 2, nome: "Máquina 2", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "30mm", qtd: 10 }, { cor: "Noite", medida: "30mm", qtd: 1 }, { cor: "Caqui", medida: "30mm", qtd: 1 }, { cor: "Marrom", medida: "30mm", qtd: 1 }, { cor: "Branco", medida: "30mm", qtd: 3 }] },
    { id: 3, nome: "Máquina 3", tipo: "Misto", fitas: [{ cor: "Branco", medida: "25mm", qtd: 8, tipo: "Poliéster" }, { cor: "Branco", medida: "20mm", qtd: 1, tipo: "Poliéster" }, { cor: "Azul BB", medida: "25mm", qtd: 2 }, { cor: "Musgo", medida: "25mm", qtd: 2 }, { cor: "Branco", medida: "22mm", qtd: 6 }] },
    { id: 4, nome: "Máquina 4", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "25mm", qtd: 11 }, { cor: "Prata", medida: "25mm", qtd: 3 }, { cor: "Chumbo", medida: "25mm", qtd: 2 }, { cor: "Amarelo Flúor", medida: "25mm", qtd: 1 }, { cor: "Ouro", medida: "25mm", qtd: 2 }] },
    { id: 5, nome: "Máquina 5", tipo: "Gorgurão", fitas: [{ cor: "Cinza Claro", medida: "25mm", qtd: 2 }, { cor: "Bordô", medida: "25mm", qtd: 2 }, { cor: "Roxo", medida: "25mm", qtd: 2 }, { cor: "Marfim", medida: "25mm", qtd: 2 }, { cor: "Marrom", medida: "25mm", qtd: 2 }, { cor: "Noite", medida: "25mm", qtd: 8 }, { cor: "Verde Flúor", medida: "25mm", qtd: 1 }] },
    { id: 6, nome: "Máquina 6", tipo: "Gorgurão", fitas: [{ cor: "Vermelho", medida: "25mm", qtd: 4 }, { cor: "Royal", medida: "25mm", qtd: 4 }, { cor: "A.B.B", medida: "25mm", qtd: 2 }, { cor: "Canário", medida: "25mm", qtd: 2 }, { cor: "Pink", medida: "25mm", qtd: 2 }, { cor: "Laranja", medida: "25mm", qtd: 2 }, { cor: "Noite", medida: "25mm", qtd: 2 }, { cor: "Verde Flúor", medida: "25mm", qtd: 1 }] },
    { id: 7, nome: "Máquina 7", tipo: "Poliéster", fitas: [{ cor: "Preto", medida: "30mm", qtd: 11 }, { cor: "Branco", medida: "25mm", qtd: 4 }, { cor: "Canário", medida: "30mm", qtd: 1 }, { cor: "Noite", medida: "25mm", qtd: 1 }] },
    { id: 8, nome: "Máquina 8", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "25mm", qtd: 9 }, { cor: "Rosa BB", medida: "25mm", qtd: 2 }, { cor: "Branco", medida: "25mm", qtd: 2 }, { cor: "Marrom", medida: "25mm", qtd: 2 }, { cor: "Lilás", medida: "25mm", qtd: 1 }, { cor: "Pink Flúor", medida: "25mm", qtd: 1 }, { cor: "Azul BB", medida: "22mm", qtd: 1 }] },
    { id: 9, nome: "Máquina 9", tipo: "Poliéster", fitas: [{ cor: "Chumbo", medida: "14mm", qtd: 2 }, { cor: "Marinho", medida: "14mm", qtd: 1 }, { cor: "Musgo", medida: "16mm", qtd: 1 }] },
    { id: 10, nome: "Máquina 10", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "25mm", qtd: 19 }] },
    { id: 11, nome: "Máquina 11", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "25mm", qtd: 19 }] },
    { id: 12, nome: "Máquina 12", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "25mm", qtd: 19 }] },
    { id: 13, nome: "Máquina 13", tipo: "Gorgurão", fitas: [{ cor: "Preto", medida: "30mm", qtd: 16 }] },
    { id: 14, nome: "Máquina 14", tipo: "Elástico", fitas: [{ cor: "Branco", medida: "35mm", qtd: 4 }, { cor: "Preto", medida: "30mm", qtd: 12 }, { cor: "Noite", medida: "25mm", qtd: 1 }] },
    { id: 15, nome: "Máquina 15", tipo: "Elástico", fitas: [{ cor: "Preto", medida: "25mm", qtd: 18 }, { cor: "Ouro", medida: "25mm", qtd: 2 }, { cor: "Bandeira", medida: "25mm", qtd: 2 }] },
    { id: 16, nome: "Máquina 16", tipo: "Elástico", fitas: [{ cor: "Preto", medida: "25mm", qtd: 24 }] },
    { id: 17, nome: "Máquina 17", tipo: "Elástico", fitas: [{ cor: "Preto", medida: "25mm", qtd: 12 }, { cor: "Branco", medida: "25mm", qtd: 12 }] },
    { id: 18, nome: "Máquina 18", tipo: "Elástico", fitas: [{ cor: "Preto", medida: "20mm", qtd: 28 }] },
    { id: 19, nome: "Máquina 19", tipo: "Elástico", fitas: [{ cor: "Preto", medida: "15mm", qtd: 16 }] },
];

export const INITIAL_ORDERS = [
    { id: 1, cor: "Preto", medida: "22mm", tipo: "Gorgurão", qtdTotal: 11536, qtdProduzida: 0, dataEntrada: "2026-03-17", dataEntrega: "2026-12-24", status: "em_producao" },
    { id: 2, cor: "Branco", medida: "22mm", tipo: "Gorgurão", qtdTotal: 1211, qtdProduzida: 0, dataEntrada: "2026-03-17", dataEntrega: "2026-04-28", status: "em_producao" },
    { id: 3, cor: "Preto", medida: "25mm", tipo: "Gorgurão", qtdTotal: 31240, qtdProduzida: 0, dataEntrada: "2026-03-17", dataEntrega: "2026-05-28", status: "em_producao" },
    { id: 4, cor: "Noite", medida: "25mm", tipo: "Gorgurão", qtdTotal: 3660, qtdProduzida: 0, dataEntrada: "2026-03-17", dataEntrega: "2026-05-29", status: "em_producao" },
    { id: 5, cor: "Preto", medida: "30mm", tipo: "Gorgurão", qtdTotal: 9672, qtdProduzida: 0, dataEntrada: "2026-03-17", dataEntrega: "2026-06-01", status: "em_producao" },
    { id: 6, cor: "Branco", medida: "30mm", tipo: "Gorgurão", qtdTotal: 1248, qtdProduzida: 0, dataEntrada: "2026-03-17", dataEntrega: "2026-06-10", status: "em_producao" },
];
7