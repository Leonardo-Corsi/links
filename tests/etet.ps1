$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$url = "http://127.0.0.1:4000/links/"

# Check dependencies
foreach ($cmd in @("ruby", "bundle", "npm.cmd")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        throw "$cmd was not found on PATH."
    }
}

ruby -v
bundle -v

# Generate optimized portrait
Push-Location $repo
try {
    npm.cmd run build:cards

    if ($LASTEXITCODE -ne 0) {
        throw "Card index generation failed."
    }

    npm.cmd run build:images

    if ($LASTEXITCODE -ne 0) {
        throw "Image generation failed."
    }
}
finally {
    Pop-Location
}

# Check whether Jekyll is already running
$serverReady = $false

try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    $serverReady = ($response.StatusCode -eq 200)
}
catch {}

# Start Jekyll only if necessary
if (-not $serverReady) {

    Start-Process powershell.exe `
        -WorkingDirectory $repo `
        -ArgumentList "-NoExit", "-Command", "bundle exec jekyll serve --livereload --force_polling"

    # Wait until the site actually responds
    for ($attempt = 1; $attempt -le 30; $attempt++) {

        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2

            if ($response.StatusCode -eq 200) {
                $serverReady = $true
                break
            }
        }
        catch {}

        Start-Sleep -Seconds 1
    }
}

if (-not $serverReady) {
    throw "Jekyll did not become ready. Check the Jekyll PowerShell window."
}

# Open website
Start-Process chrome.exe -ArgumentList "--new-window", $url
