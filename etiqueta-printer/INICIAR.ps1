# FourTEX - Impressora de Etiquetas
# PowerShell puro - Windows 7, 8, 10, 11

$NOME_IMPRESSORA = "ELGIN L42PRO FULL"
$FIREBASE_URL    = "https://SEU-PROJETO-default-rtdb.firebaseio.com"
$INTERVALO_S     = 3
# Escuridão da impressão: 0 (claro) a 30 (escuro). Diminua se estiver saindo forte demais.
$DARKNESS        = 6
# Velocidade de impressão (polegadas/segundo) - quanto maior, menos tempo o cabeçote
# fica encostado no ribbon por etiqueta = menos calor acumulado
$PRINT_SPEED     = 4
# Atualizar a cada mudança neste arquivo, pra confirmar no terminal que reiniciou com o código novo
$SCRIPT_VERSION  = "2026-09-02-01"

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrint2 {
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true)]
    public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr p);
    [DllImport("winspool.Drv", EntryPoint="ClosePrinter")]
    public static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true)]
    public static extern int StartDocPrinter(IntPtr h, int lv, [In, MarshalAs(UnmanagedType.LPStruct)] DocInfo2 di);
    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter")]
    public static extern bool EndDocPrinter(IntPtr h);
    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter")]
    public static extern bool StartPagePrinter(IntPtr h);
    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter")]
    public static extern bool EndPagePrinter(IntPtr h);
    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr h, IntPtr buf, int len, out int written);
    [DllImport("kernel32.dll")]
    public static extern int GetLastError();
    [StructLayout(LayoutKind.Sequential)]
    public class DocInfo2 {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
}
"@

function Imprimir-Raw($impressora, $zpl) {
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($zpl)
        $tmpFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "fourtex_etiqueta.zpl")
        [System.IO.File]::WriteAllBytes($tmpFile, $bytes)

        # Win32 API (via spooler) — tenta RAW, depois tipo padrão do driver
        # OBS: NÃO escrever direto na porta (\\.\PORTA) — isso ignora a fila de
        # impressão do Windows e pode travar/corromper outras impressões enviadas
        # por fora do sistema (ex: pela impressora normal do Windows).
        $hp = [IntPtr]::Zero
        if (-not [RawPrint2]::OpenPrinter($impressora, [ref]$hp, [IntPtr]::Zero)) {
            Write-Host "   OpenPrinter falhou. Erro: $([RawPrint2]::GetLastError())" -ForegroundColor Red
            return $false
        }
        $iniciou = $false
        foreach ($tipo in @("RAW", "ZPL", "TEXT", $null)) {
            $di = New-Object RawPrint2+DocInfo2
            $di.pDocName = "FourTEX"; $di.pOutputFile = $null; $di.pDataType = $tipo
            if ([RawPrint2]::StartDocPrinter($hp, 1, $di) -gt 0) {
                Write-Host "   StartDocPrinter OK com tipo: '$tipo'" -ForegroundColor Green
                $iniciou = $true; break
            }
            Write-Host "   Tipo '$tipo' falhou, tentando proximo..." -ForegroundColor Yellow
        }
        if (-not $iniciou) {
            Write-Host "   StartDocPrinter falhou em todos os tipos." -ForegroundColor Red
            [RawPrint2]::ClosePrinter($hp) | Out-Null; return $false
        }
        [RawPrint2]::StartPagePrinter($hp) | Out-Null
        $ptr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
        [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
        $written = 0
        $ok = [RawPrint2]::WritePrinter($hp, $ptr, $bytes.Length, [ref]$written)
        [System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
        [RawPrint2]::EndPagePrinter($hp) | Out-Null
        [RawPrint2]::EndDocPrinter($hp) | Out-Null
        [RawPrint2]::ClosePrinter($hp) | Out-Null
        return $ok
    } catch {
        Write-Host "   Excecao: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Firebase-Get($caminho) {
    try {
        $req = [System.Net.HttpWebRequest]::Create("$FIREBASE_URL$caminho.json")
        $req.Timeout = 8000
        $req.ReadWriteTimeout = 8000
        $req.Headers.Add("Cache-Control", "no-cache")
        $resp = $req.GetResponse()
        $stream = $resp.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        $json = $reader.ReadToEnd()
        $reader.Close(); $resp.Close()
        return ConvertFrom-Json $json
    } catch { return $null }
}

function Firebase-Patch($caminho, $corpo) {
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("Content-Type", "application/json")
        $wc.UploadString("$FIREBASE_URL$caminho.json", "PATCH", (ConvertTo-Json $corpo)) | Out-Null
    } catch { }
}

function Gerar-ZPL($item) {
    $tipo    = ($item.tipo   + "").ToUpper()
    $cor     = ($item.cor    + "").ToUpper()
    $medida  = ($item.medida + "").ToUpper()
    $unidade = ($item.unidade + "").Trim().ToUpper()
    $temMedida = $medida -ne ""

    $cultura = [System.Globalization.CultureInfo]::GetCultureInfo("pt-BR")
    $qtdRaw  = "$($item.quantidade)".Trim()

    if ($qtdRaw -eq "") {
        # Permite imprimir etiqueta sem quantidade preenchida
        $qtdLabel = ""
    } else {
        $qtdNum = [double]$qtdRaw
        if ($unidade -eq "KG") {
            $qtdFmt   = $qtdNum.ToString("N2", $cultura)
            $qtdLabel = "$qtdFmt KG"
        } elseif ($unidade -eq "M" -or $unidade -eq "METRO" -or $unidade -eq "METROS") {
            $qtdFmt   = $qtdNum.ToString("N0", $cultura)
            $qtdLabel = "$qtdFmt MTS"
        } else {
            $qtdFmt   = $qtdNum.ToString("N0", $cultura)
            $qtdLabel = "$qtdFmt RL"
        }
    }

    $darkStr = $DARKNESS.ToString("00")
    $corpo = "^FO0,40^FB844,1,0,C,0^A0N,130,130^FD$tipo^FS" +
             "^FO0,230^FB844,1,0,C,0^A0N,100,100^FD$cor^FS"
    if ($temMedida) {
        # Gorgurão/Poliéster/Elástico/TNT-cor: tem medida (mm), 4 linhas
        $corpo += "^FO0,345^FB844,1,0,C,0^A0N,100,100^FD$medida^FS" +
                  "^FO0,465^FB844,1,0,C,0^A0N,115,115^FD$qtdLabel^FS"
    } else {
        # Overlock/Soutache/Trançado: sem medida, sobe a quantidade pro lugar
        # dela pra não deixar espaço em branco na etiqueta
        $corpo += "^FO0,380^FB844,1,0,C,0^A0N,120,120^FD$qtdLabel^FS"
    }
    # OBS: usar só ~SD (absoluto). ^MD é RELATIVO ao darkness atual — usar os dois
    # juntos DOBRAVA o escurecimento de verdade (ex: ~SD05 + ^MD5 = efetivo 10)
    return "~SD$darkStr^XA^PR$PRINT_SPEED^PW844^LL640^CI28" + $corpo + "^XZ"
}

function Gerar-ZPL-TNT($item) {
    $larguraDisplay = if ($item.largura -eq "1.40") { "1,4M" } else { "2,1M" }
    $corDisplay     = if ($item.cor -eq "branco") { "BRANCA" } else { "PRETA" }
    $partes = ($item.data + "").Split("-")
    $dataDisplay = if ($partes.Length -eq 3) { "$($partes[2])/$($partes[1])/$($partes[0])" } else { $item.data + "" }

    $cultura  = [System.Globalization.CultureInfo]::GetCultureInfo("pt-BR")
    $pesoKg   = if ($item.peso) { [double]($item.peso) } else { 0.0 }
    $pesoLabel = $pesoKg.ToString("N2", $cultura) + " KG"

    $logo = if ($LOGO_ZPL) { $LOGO_ZPL } else { "" }

    $darkStr = $DARKNESS.ToString("00")
    return "~SD$darkStr^XA^PR$PRINT_SPEED^PW844^LL640" +
           $logo +
           "^FO40,105^GB764,4,4^FS" +
           "^FO0,120^FB844,1,0,C,0^A0N,38,38^FDFALSO TECIDO^FS" +
           "^FO0,163^FB844,1,0,C,0^A0N,26,26^FDPOLIPROPILENO 2.22 DTEX^FS" +
           "^FO40,200^GB764,4,4^FS" +
           "^FO40,215^A0N,22,22^FDCOR/COLOR^FS" +
           "^FO440,215^A0N,22,22^FDGRAMATURA^FS" +
           "^FO40,243^A0N,62,62^FD$corDisplay^FS" +
           "^FO440,243^A0N,62,62^FD$($item.gramatura)G/M2^FS" +
           "^FO40,315^GB764,4,4^FS" +
           "^FO40,329^A0N,18,18^FDCODIGO^FS" +
           "^FO295,329^A0N,18,18^FDLARGURA^FS" +
           "^FO570,329^A0N,18,18^FDMETRAGEM^FS" +
           "^FO40,353^A0N,52,52^FD$($item.codigo)^FS" +
           "^FO295,353^A0N,52,52^FD$larguraDisplay^FS" +
           "^FO570,353^A0N,52,52^FD$($item.metragem)m^FS" +
           "^FO40,417^GB764,4,4^FS" +
           "^FO40,431^A0N,18,18^FDDATA^FS" +
           "^FO450,431^A0N,18,18^FDPESO^FS" +
           "^FO40,455^A0N,52,52^FD$dataDisplay^FS" +
           "^FO450,455^A0N,52,52^FD$pesoLabel^FS" +
           "^FO40,520^GB764,4,4^FS" +
           "^FO40,535^A0N,22,22^FDFABRICADO NO BRASIL - POLIPROPILENO^FS" +
           "^XZ"
}

function Get-LogoZPL($logoPath, $wDots, $hDots) {
    if (-not (Test-Path $logoPath)) { return "" }
    try {
        Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
        $img = [System.Drawing.Image]::FromFile($logoPath)
        $bmp = New-Object System.Drawing.Bitmap($wDots, $hDots)
        $g   = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $wDots, $hDots)
        $g.Dispose(); $img.Dispose()
        $bpr = [int][Math]::Ceiling($wDots / 8)
        $tot = $bpr * $hDots
        $sb  = New-Object System.Text.StringBuilder
        for ($y = 0; $y -lt $hDots; $y++) {
            for ($bx = 0; $bx -lt $bpr; $bx++) {
                $b = 0
                for ($bt = 0; $bt -lt 8; $bt++) {
                    $x = $bx * 8 + $bt
                    if ($x -lt $wDots) {
                        $p = $bmp.GetPixel($x, $y)
                        $lum = [int]($p.R * 0.299 + $p.G * 0.587 + $p.B * 0.114)
                        if ($p.A -gt 127 -and $lum -lt 128) { $b = $b -bor (0x80 -shr $bt) }
                    }
                }
                $sb.Append($b.ToString("X2")) | Out-Null
            }
        }
        $bmp.Dispose()
        $x0 = [int]((844 - $wDots) / 2)
        return "^FO$x0,8^GFA,$tot,$tot,$bpr,$($sb.ToString())^FS"
    } catch {
        Write-Host "  Logo erro: $($_.Exception.Message)" -ForegroundColor DarkYellow
        return ""
    }
}

# A cada N etiquetas seguidas, faz uma pausa mais longa pro cabeçote esfriar de verdade
# (a pausa curta entre etiquetas não é suficiente pra dissipar o calor acumulado
# numa impressão contínua — o ribbon só começa a derreter depois de várias seguidas)
$ETIQUETAS_ATE_RESFRIAR = 6
$PAUSA_RESFRIAMENTO_MS  = 4000
$PAUSA_ENTRE_MS         = 500
$impressosSeguidos      = 0
function Pausa-EntreEtiquetas {
    $script:impressosSeguidos++
    if ($script:impressosSeguidos -ge $ETIQUETAS_ATE_RESFRIAR) {
        Write-Host "   ... pausa de resfriamento do cabecote ($($PAUSA_RESFRIAMENTO_MS / 1000)s)" -ForegroundColor DarkCyan
        Start-Sleep -Milliseconds $PAUSA_RESFRIAMENTO_MS
        $script:impressosSeguidos = 0
    } else {
        Start-Sleep -Milliseconds $PAUSA_ENTRE_MS
    }
}

$processando    = @{}
$processandoTNT = @{}
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  FourTEX - Impressora de Etiquetas  " -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Versao     : $SCRIPT_VERSION"
Write-Host "Impressora : $NOME_IMPRESSORA"
Write-Host "Darkness   : $DARKNESS | Print speed: $PRINT_SPEED"
Write-Host "Intervalo  : ${INTERVALO_S}s"
Write-Host "Impressoras instaladas:" -ForegroundColor Cyan
Get-WmiObject Win32_Printer | ForEach-Object { Write-Host "  > '$($_.Name)'" -ForegroundColor Yellow }
Write-Host ""
Write-Host "Carregando logo TNT..." -ForegroundColor DarkGray
$logoPath = Join-Path $PSScriptRoot "..\public\bonemania-logo.png"
$LOGO_ZPL = Get-LogoZPL $logoPath 480 98
if ($LOGO_ZPL) { Write-Host "  Logo OK ($($LOGO_ZPL.Length) chars ZPL)" -ForegroundColor DarkGray }
else            { Write-Host "  Logo nao encontrado - imprimindo sem logo" -ForegroundColor DarkYellow }

# Limpa fila de impressão travada
try {
    $jobsTravados = Get-WmiObject Win32_PrintJob | Where-Object { $_.Name -like "*$NOME_IMPRESSORA*" }
    if ($jobsTravados) {
        Write-Host "Limpando $($jobsTravados.Count) job(s) travados na fila..." -ForegroundColor Yellow
        $jobsTravados | ForEach-Object { $_.Delete() | Out-Null }
    }
    # Garante que a impressora não está pausada
    $imp = Get-WmiObject Win32_Printer | Where-Object { $_.Name -eq $NOME_IMPRESSORA }
    if ($imp -and $imp.WorkOffline) {
        Write-Host "Impressora estava offline, reativando..." -ForegroundColor Yellow
        $imp.WorkOffline = $false; $imp.Put() | Out-Null
    }
    if ($imp -and $imp.PrinterPaused) {
        Write-Host "Impressora estava pausada, retomando..." -ForegroundColor Yellow
        $imp.Resume() | Out-Null
    }
} catch {}

Write-Host ""
Write-Host "Aguardando solicitacoes..." -ForegroundColor Cyan
Write-Host ""

while ($true) {
    try {
        $fila = Firebase-Get "/etiquetasFila"
        if ($fila) {
            $fila.PSObject.Properties | ForEach-Object {
                $id = $_.Name; $item = $_.Value
                if ($item.status -eq "pendente" -and -not $processando.ContainsKey($id)) {
                    $processando[$id] = $true
                    $copies = if ($item.copies) { [int]$item.copies } else { 1 }
                    Write-Host "[Nova etiqueta] $($item.cor) $($item.medida) - $($item.quantidade) $($item.unidade) (x$copies)" -ForegroundColor Yellow
                    $zpl = Gerar-ZPL $item
                    $sucessos = 0
                    for ($i = 0; $i -lt $copies; $i++) {
                        if (Imprimir-Raw $NOME_IMPRESSORA $zpl) { $sucessos++ }
                        Pausa-EntreEtiquetas
                    }
                    $ok = $sucessos -gt 0
                    if ($ok) {
                        Write-Host "   OK - Impresso! ($sucessos/$copies)" -ForegroundColor Green
                        Firebase-Patch "/etiquetasFila/$id" @{ status = "impresso" }
                    } else {
                        Write-Host "   ERRO - Verifique: $NOME_IMPRESSORA" -ForegroundColor Red
                        $processando.Remove($id)
                    }
                }
            }
        }
        # TNT
        $filaTNT = Firebase-Get "/tntEtiquetasFila"
        if ($filaTNT) {
            $filaTNT.PSObject.Properties | ForEach-Object {
                $id = $_.Name; $item = $_.Value
                if ($item.status -eq "pendente" -and -not $processandoTNT.ContainsKey($id)) {
                    $processandoTNT[$id] = $true
                    $copies = if ($item.copies) { [int]$item.copies } else { 1 }
                    Write-Host "[Nova etiqueta TNT] $($item.codigo) $($item.cor) $($item.largura)m $($item.gramatura)gr $($item.metragem)m (x$copies)" -ForegroundColor Cyan
                    $zpl = Gerar-ZPL-TNT $item
                    $sucessos = 0
                    for ($i = 0; $i -lt $copies; $i++) {
                        if (Imprimir-Raw $NOME_IMPRESSORA $zpl) { $sucessos++ }
                        Pausa-EntreEtiquetas
                    }
                    $ok = $sucessos -gt 0
                    if ($ok) {
                        Write-Host "   OK - Impresso! ($sucessos/$copies)" -ForegroundColor Green
                        Firebase-Patch "/tntEtiquetasFila/$id" @{ status = "impresso" }
                    } else {
                        Write-Host "   ERRO - Verifique: $NOME_IMPRESSORA" -ForegroundColor Red
                        $processandoTNT.Remove($id)
                    }
                }
            }
        }
    } catch { Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red }
    Start-Sleep $INTERVALO_S
}
