/**
 * FourTEX — Impressora de Etiquetas Automática
 * Roda no computador conectado à Elgin L42
 * Não precisa de npm install — usa apenas Node.js puro
 * Comando: node index.js
 */

const https  = require("https");
const http   = require("http");
const { exec } = require("child_process");
const fs     = require("fs");
const path   = require("path");
const os     = require("os");

// ── Configuração ──────────────────────────────────────────────────────────────

// Atualizar a cada mudança neste arquivo, pra confirmar no terminal que reiniciou com o código novo
const SCRIPT_VERSION = "2026-09-02-01";

// Nome da impressora exato como aparece em: Painel de Controle → Dispositivos e Impressoras
const NOME_IMPRESSORA = "ELGIN L42PRO FULL";

// Brilho/escuridão da impressão: 0 (claro) → 30 (escuro). Padrão recomendado: 20
const DARKNESS = 1;

// Velocidade de impressão em polegadas/segundo (quanto maior, menos tempo o
// cabeçote fica encostado no ribbon por etiqueta = menos calor acumulado)
const PRINT_SPEED = 4;

// Firebase REST — não precisa de SDK
const FIREBASE_URL = process.env.FIREBASE_URL || "https://SEU-PROJETO-default-rtdb.firebaseio.com";

// Intervalo de verificação em milissegundos (3 segundos)
const INTERVALO_MS = 3000;

// ── Funções Firebase REST ─────────────────────────────────────────────────────

function firebaseGet(path) {
    return new Promise((resolve, reject) => {
        const url = `${FIREBASE_URL}${path}.json`;
        https.get(url, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve(null); }
            });
        }).on("error", reject);
    });
}

function firebasePatch(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const url = new URL(`${FIREBASE_URL}${path}.json`);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };
        const req = https.request(options, res => {
            res.on("data", () => {});
            res.on("end", resolve);
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

// ── Geração ZPL — Gorgurão/Elástico (105,5 × 80mm) ──────────────────────────

function gerarZPL(item) {
    const tipo     = (item.tipo     || "").toUpperCase();
    const cor      = item.cor      || "";
    const medida   = item.medida   || "";
    const temMedida = medida !== "";
    const qtd      = item.quantidade != null ? String(item.quantidade) : "";
    const unidade  = item.unidade  || "RL";
    const qtdLabel = qtd !== "" ? `${qtd} ${unidade}` : "";

    const dark = String(DARKNESS).padStart(2, "0");

    // Overlock/Soutache/Trançado não têm medida (mm) — sobe a quantidade
    // pro lugar dela pra não deixar espaço em branco na etiqueta
    const blocoMedidaEQtd = temMedida
        ? `^FO0,335^FB844,1,0,C,0^A0N,95,95^FD${medida}^FS

^FO40,450^GB764,4,4^FS

^FO0,470^FB844,1,0,C,0^A0N,95,95^FD${qtdLabel}^FS`
        : `^FO0,380^FB844,1,0,C,0^A0N,110,110^FD${qtdLabel}^FS`;

    return `~SD${dark}
^XA
^PR${PRINT_SPEED}
^PW844
^LL640
^CI28

^FO0,40^FB844,1,0,C,0^A0N,130,130^FD${tipo}^FS

^FO40,195^GB764,4,4^FS

^FO0,220^FB844,1,0,C,0^A0N,95,95^FD${cor}^FS

${blocoMedidaEQtd}

^XZ`;
}

// ── Geração ZPL — TNT (105,5 × 150mm) ───────────────────────────────────────

function gerarZPLTNT(item) {
    const larguraDisplay = item.largura === "1.40" ? "1,4M" : "2,1M";
    const corDisplay     = item.cor === "branco" ? "BRANCA" : "PRETA";
    const [y, m, d]      = (item.data || "2026-01-01").split("-");
    const dataDisplay    = `${d}/${m}/${y}`;
    const dark           = String(DARKNESS).padStart(2, "0");

    return `~SD${dark}
^XA
^PR${PRINT_SPEED}
^PW844
^LL640

^FO0,15^FB844,1,0,C,0^A0N,38,38^FDFALSO TECIDO^FS
^FO0,58^FB844,1,0,C,0^A0N,26,26^FDPOLIPROPILENO 2.22 DTEX^FS

^FO40,95^GB764,4,4^FS

^FO15,110^A0N,22,22^FDCOR/COLOR^FS
^FO440,110^A0N,22,22^FDGRAMATURA^FS
^FO15,138^A0N,62,62^FD${corDisplay}^FS
^FO440,138^A0N,62,62^FD${item.gramatura}G/M2^FS

^FO40,210^GB764,4,4^FS

^FO15,224^A0N,18,18^FDCODIGO^FS
^FO295,224^A0N,18,18^FDLARGURA^FS
^FO570,224^A0N,18,18^FDMETRAGEM^FS
^FO15,248^A0N,52,52^FD${item.codigo}^FS
^FO295,248^A0N,52,52^FD${larguraDisplay}^FS
^FO570,248^A0N,52,52^FD${item.metragem}m^FS

^FO40,312^GB764,4,4^FS

^FO15,326^A0N,18,18^FDDATA^FS
^FO15,350^A0N,52,52^FD${dataDisplay}^FS

^FO40,415^GB764,4,4^FS

^FO15,430^A0N,22,22^FDFABRICADO NO BRASIL - POLIPROPILENO^FS
^FO15,458^FB814,2,0,L,0^A0N,18,18^FDVALIDADE 2 ANOS - MANUSEIO E ARMAZENAGEM ADEQUADOS^FS

^XZ`;
}

// ── Impressão ─────────────────────────────────────────────────────────────────

function imprimir(zpl, callback) {
    const tmpFile = path.join(os.tmpdir(), "fourtex_etiqueta.zpl");
    fs.writeFileSync(tmpFile, zpl, "binary");

    const cmd = `copy /b "${tmpFile}" "\\\\.\\${NOME_IMPRESSORA}" >nul 2>&1`;
    exec(cmd, { shell: "cmd.exe" }, (err) => {
        callback(!err);
    });
}

const aguardar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Pausa entre cada etiqueta impressa (mesmo cabeçote em ambas as filas)
const PAUSA_ENTRE_ETIQUETAS_MS = 500;
// A cada N etiquetas seguidas, faz uma pausa mais longa pro cabeçote esfriar de verdade
// (a pausa curta entre etiquetas não é suficiente pra dissipar o calor acumulado
// numa impressão contínua — o ribbon só começa a derreter depois de várias seguidas)
const ETIQUETAS_ATE_RESFRIAR = 6;
const PAUSA_RESFRIAMENTO_MS = 4000;
let impressosSeguidos = 0;

async function pausaEntreEtiquetas() {
    impressosSeguidos++;
    if (impressosSeguidos >= ETIQUETAS_ATE_RESFRIAR) {
        console.log(`   … pausa de resfriamento do cabeçote (${PAUSA_RESFRIAMENTO_MS / 1000}s)`);
        await aguardar(PAUSA_RESFRIAMENTO_MS);
        impressosSeguidos = 0;
    } else {
        await aguardar(PAUSA_ENTRE_ETIQUETAS_MS);
    }
}

// ── Loop de verificação ───────────────────────────────────────────────────────

const processando = new Set();

async function verificarFila() {
    try {
        const fila = await firebaseGet("/etiquetasFila");
        if (!fila) return;

        for (const [id, item] of Object.entries(fila)) {
            if (item.status !== "pendente") continue;
            if (processando.has(id)) continue;

            processando.add(id);
            const copies = item.copies || 1;

            console.log(`\n[Nova etiqueta] ${item.tipo} ${item.medida} ${item.cor} (x${copies})`);

            const zpl = gerarZPL(item);
            let sucessos = 0;
            for (let i = 0; i < copies; i++) {
                const ok = await new Promise(resolve => imprimir(zpl, resolve));
                if (ok) sucessos++;
                await pausaEntreEtiquetas();
            }
            if (sucessos > 0) {
                console.log(`   OK – Impresso! (${sucessos}/${copies})`);
                await firebasePatch(`/etiquetasFila/${id}`, { status: "impresso" });
            } else {
                console.log(`   ⚠️  Erro ao imprimir. Verifique: "${NOME_IMPRESSORA}"`);
                processando.delete(id);
            }
        }
    } catch (err) {
        console.error("Erro ao verificar fila:", err.message);
    }
}

async function verificarFilaTNT() {
    try {
        const fila = await firebaseGet("/tntEtiquetasFila");
        if (!fila) return;

        for (const [id, item] of Object.entries(fila)) {
            if (item.status !== "pendente") continue;
            if (processando.has("tnt_" + id)) continue;

            processando.add("tnt_" + id);
            const copies = item.copies || 1;

            console.log(`\n[Nova etiqueta TNT] ${item.codigo} ${item.cor} ${item.largura}m ${item.gramatura}gr ${item.metragem}m (x${copies})`);

            const zpl = gerarZPLTNT(item);
            let sucessos = 0;
            for (let i = 0; i < copies; i++) {
                const ok = await new Promise(resolve => imprimir(zpl, resolve));
                if (ok) sucessos++;
                await pausaEntreEtiquetas();
            }
            if (sucessos > 0) {
                console.log(`   OK – Impresso! (${sucessos}/${copies})`);
                await firebasePatch(`/tntEtiquetasFila/${id}`, { status: "impresso" });
            } else {
                console.log(`   ⚠️  Erro ao imprimir. Verifique: "${NOME_IMPRESSORA}"`);
                processando.delete("tnt_" + id);
            }
        }
    } catch (err) {
        console.error("Erro ao verificar fila TNT:", err.message);
    }
}

// ── Início ────────────────────────────────────────────────────────────────────

console.log("=====================================");
console.log("  FourTEX — Impressora de Etiquetas");
console.log("=====================================");
console.log(`Versão do script : ${SCRIPT_VERSION}`);
console.log(`Impressora : ${NOME_IMPRESSORA}`);
console.log(`Darkness   : ${DARKNESS} | Print speed: ${PRINT_SPEED}`);
console.log(`Verificando a cada ${INTERVALO_MS / 1000}s...`);
console.log("Aguardando solicitações...\n");

verificarFila();
verificarFilaTNT();
setInterval(() => { verificarFila(); verificarFilaTNT(); }, INTERVALO_MS);
