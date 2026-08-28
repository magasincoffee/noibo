param(
  [Parameter(Mandatory=$true)]
  [string]$PrinterIP,
  [int[]]$Ports = @(9100, 9101, 515, 631),
  [int]$TimeoutMs = 800
)

Write-Host "MAGASIN TL31E LAN probe" -ForegroundColor Cyan
Write-Host "Printer: $PrinterIP"
Write-Host "Ports: $($Ports -join ', ')"
Write-Host "This probe only attempts TCP connections; it does not send print data."
Write-Host ""

foreach ($port in $Ports) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $task = $client.ConnectAsync($PrinterIP, $port)
    if (-not $task.Wait($TimeoutMs)) {
      Write-Host ("{0,5}  TIMEOUT" -f $port)
      continue
    }

    if ($client.Connected) {
      Write-Host ("{0,5}  OPEN" -f $port) -ForegroundColor Green
    } else {
      Write-Host ("{0,5}  CLOSED" -f $port)
    }
  }
  catch {
    Write-Host ("{0,5}  CLOSED" -f $port)
  }
  finally {
    $client.Dispose()
  }
}
