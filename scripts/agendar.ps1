# Registra (ou remove) a tarefa semanal no Agendador de Tarefas do Windows.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\agendar.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\agendar.ps1 -Hora 07:30
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\agendar.ps1 -Remover

param(
    [string]$Hora = '08:00',
    [string]$Nome = 'Taia - Atividades semanais',
    [switch]$Remover
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

if ($Remover) {
    Unregister-ScheduledTask -TaskName $Nome -Confirm:$false
    "Tarefa '$Nome' removida."
    return
}

$script = Join-Path $PSScriptRoot 'rodar-semana.ps1'
if (-not (Test-Path $script)) { throw "Nao encontrei $script" }

$acao = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`"" `
    -WorkingDirectory $raiz

$gatilho = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At $Hora

# Se o PC estiver desligado no horario, roda assim que ligar.
$config = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 3)

Register-ScheduledTask `
    -TaskName $Nome `
    -Action $acao `
    -Trigger $gatilho `
    -Settings $config `
    -Description 'Coleta as atividades da semana no Canvas, gera as entregas e roda o revisor.' `
    -Force | Out-Null

"Tarefa '$Nome' registrada: toda quarta-feira as $Hora."
"Rodar agora para testar:  Start-ScheduledTask -TaskName '$Nome'"
"Ver o resultado:          Get-ChildItem '$raiz\logs' | Sort-Object LastWriteTime -Descending | Select-Object -First 1"
