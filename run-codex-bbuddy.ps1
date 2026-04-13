param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"

$exe = Join-Path $PSScriptRoot "codex-monorepo-local\codex-rs\target\debug\codex-tui.exe"

if (-not (Test-Path $exe)) {
    throw "Patched codex-tui.exe not found: $exe"
}

& $exe "-c" 'tui.status_line=["bbddy-status"]' @Args
