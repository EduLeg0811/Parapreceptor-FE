# dev.ps1 — sobe o Main-Server (FastAPI) e o frontend (Vite) neste terminal.
#   .\dev.ps1                            -> Main-Server em ..\Main-Server + Vite
#   .\dev.ps1 -NoServer                  -> só o Vite, contra um Main-Server já rodando
#   .\dev.ps1 -ServerPath D:\outro\path  -> Main-Server em outro diretório
#   .\dev.ps1 -ServerPort 8000           -> porta fixa do Main-Server
param(
    [string]$ServerPath = "",
    [int]$ServerPort = 0,
    [switch]$NoServer
)

# Configura codificação UTF-8 para console do Windows
$OutputEncoding = [System.Text.Encoding]::UTF8

# Função recursiva para parar a árvore de processos via WMI/CIM
function Stop-ProcessTree ([int]$parentPid) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId = $parentPid" -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-ProcessTree -parentPid $_.ProcessId
    }
    try {
        $proc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "[SYSTEM] Finalizando $parentPid ($($proc.Name))..." -ForegroundColor Yellow
            Stop-Process -Id $parentPid -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# Limpa processos órfãos anteriores usando os PIDs gravados localmente
function Clear-OrphanedProcesses {
    @("server", "frontend") | ForEach-Object {
        $file = "$PSScriptRoot\.$($_).pid"
        if (Test-Path $file) {
            $pidText = Get-Content $file -ErrorAction SilentlyContinue
            if ($pidText -match '^\d+$' -and ($proc = Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue)) {
                if ($proc.ProcessName -match "python|node|npm|cmd|pwsh|powershell") {
                    Write-Host "[SYSTEM] Encerrando órfão $_ (PID $pidText)..." -ForegroundColor Cyan
                    Stop-ProcessTree -parentPid ([int]$pidText)
                }
            }
            Remove-Item $file -Force -ErrorAction SilentlyContinue
        }
    }
}

# Obtém a primeira porta TCP livre de forma otimizada via pipeline
function Get-FreePort ([int]$startPort) {
    $properties = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
    $inUse = ($properties.GetActiveTcpListeners().Port) + ($properties.GetActiveTcpConnections().LocalEndPoint.Port)
    $port = $startPort
    while ($inUse -contains $port) { $port++ }
    return $port
}

try {
    # 1. Limpeza inicial
    Clear-OrphanedProcesses

    # 2. Localiza o Main-Server (suporta pastas MainServer e Main-Server)
    if (-not $ServerPath) {
        $parentDir = Split-Path $PSScriptRoot -Parent
        $candidates = @(
            (Join-Path $parentDir "MainServer"),
            (Join-Path $parentDir "Main-Server"),
            (Join-Path $parentDir "_SERVER\Main-Server")
        )
        foreach ($cand in $candidates) {
            if (Test-Path (Join-Path $cand "run_dev.ps1")) {
                $ServerPath = (Resolve-Path $cand).Path
                break
            }
        }
        if (-not $ServerPath) {
            $ServerPath = Join-Path $parentDir "MainServer"
        }
    }
    $serverScript = Join-Path $ServerPath "run_dev.ps1"

    if (-not $NoServer -and -not (Test-Path $serverScript)) {
        Write-Warning "Main-Server não encontrado em '$ServerPath'. Subindo apenas o frontend."
        Write-Warning "Use -ServerPath para indicar o diretório, ou -NoServer para silenciar."
        $NoServer = $true
    }

    # 3. Resolução dinâmica de portas livres
    if ($ServerPort -le 0) {
        $ServerPort = if ($NoServer) { 8000 } else { Get-FreePort 8000 }
    }
    $frontendPort = Get-FreePort 5175
    Write-Host "[SYSTEM] Portas: Main-Server=$ServerPort, Frontend=$frontendPort" -ForegroundColor Green

    # 4. Resolução do npm e dependências frontend
    $npmCmd = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }
    if (-not (Test-Path "$PSScriptRoot\node_modules")) {
        Write-Host "[SYSTEM] Instalando dependências Frontend..." -ForegroundColor Cyan
        Start-Process -FilePath $npmCmd -ArgumentList "install" -WorkingDirectory $PSScriptRoot -NoNewWindow -Wait
    }

    # 5. Inicialização dos servidores
    # O proxy /api do vite.config.ts lê esta variável.
    $env:DEV_PORT = $ServerPort

    $processes = @()

    if (-not $NoServer) {
        # run_dev.ps1 do Main-Server é UTF-8 sem BOM; o pwsh 7 preserva os acentos.
        $psExe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }
        $serverProcess = Start-Process -FilePath $psExe `
            -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "run_dev.ps1", "-Port", $ServerPort, "-LocalMode" `
            -WorkingDirectory $ServerPath -NoNewWindow -PassThru
        $serverProcess.Id | Out-File -FilePath "$PSScriptRoot\.server.pid" -Encoding ascii
        $processes += $serverProcess
    }

    $frontendProcess = Start-Process -FilePath $npmCmd `
        -ArgumentList "run dev -- --host 127.0.0.1 --port $frontendPort" `
        -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru
    $frontendProcess.Id | Out-File -FilePath "$PSScriptRoot\.frontend.pid" -Encoding ascii
    $processes += $frontendProcess

    # 6. Aguarda e abre o navegador apontando para o Main-Server via query string
    Start-Sleep -Seconds 3
    Start-Process "http://127.0.0.1:$frontendPort/?api=http://127.0.0.1:$ServerPort"

    if ($NoServer) {
        Write-Host "[SYSTEM] Main-Server: instância externa em http://127.0.0.1:$ServerPort" -ForegroundColor Green
    } else {
        Write-Host "[SYSTEM] Main-Server em http://127.0.0.1:$ServerPort (docs: /docs)" -ForegroundColor Green
    }
    Write-Host "[SYSTEM] Servidores rodando. Pressione Ctrl+C para encerrar." -ForegroundColor Green
    while ($true) {
        if ($processes | Where-Object { $_.HasExited }) { break }
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "[SYSTEM] Encerrando processos de desenvolvimento..." -ForegroundColor Cyan
    Clear-OrphanedProcesses
    Write-Host "[SYSTEM] Ambiente finalizado com sucesso." -ForegroundColor Green
}
