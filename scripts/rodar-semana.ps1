# Executa a rodada semanal sem interacao. Chamado pelo Agendador de Tarefas.
# Teste manual:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\rodar-semana.ps1

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$logs = Join-Path $raiz 'logs'
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Path $logs | Out-Null }
$log = Join-Path $logs ("rodada-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd_HHmm'))

function Escrever($msg) {
    $linha = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
    $linha | Tee-Object -FilePath $log -Append
}

Escrever "Iniciando rodada semanal em $raiz"

$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) {
    Escrever "ERRO: CLI 'claude' nao encontrada no PATH."
    Escrever "Instale com:  npm install -g @anthropic-ai/claude-code"
    exit 1
}

if (-not (Test-Path (Join-Path $raiz '.env'))) {
    Escrever "ERRO: .env ausente. Copie .env.example para .env e preencha o CANVAS_TOKEN."
    exit 1
}

# --permission-mode acceptEdits + a allowlist em .claude/settings.json evitam
# qualquer prompt interativo, que travaria a execucao agendada.
& $claude.Source -p "/atividades" --permission-mode acceptEdits 2>&1 |
    Tee-Object -FilePath $log -Append

$codigo = $LASTEXITCODE
Escrever "Rodada terminada com codigo $codigo"

$resumo = Get-ChildItem (Join-Path $raiz 'entregas') -Filter '_RESUMO-*.md' -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($resumo) { Escrever "Resumo: $($resumo.FullName)" }

exit $codigo
