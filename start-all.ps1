$projectRoot = $PSScriptRoot

function Start-SynapseService {
  param([string]$command)

  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location -LiteralPath '$projectRoot'; $command"
  )
}

Start-SynapseService "node .\server\ai.cjs"
Start-SynapseService "node .\server\server.cjs"
Start-SynapseService "npm run dev"

Write-Host "Started AI (5000), API (4000), and Next.js (3000) in separate terminals."
