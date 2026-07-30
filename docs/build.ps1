[CmdletBinding()]
param(
    [switch]$Clean
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$docsDir = $PSScriptRoot
$buildDir = Join-Path $docsDir "build"
$mainFile = "manual-quni.tex"

if ($Clean) {
    if (Test-Path -LiteralPath $buildDir) {
        Remove-Item -LiteralPath $buildDir -Recurse -Force
    }
    Write-Host "Directorio de compilacion eliminado: $buildDir"
    exit 0
}

New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
Push-Location $docsDir

try {
    $pdflatex = Get-Command pdflatex -ErrorAction SilentlyContinue
    $bibtex = Get-Command bibtex -ErrorAction SilentlyContinue
    if ($null -ne $pdflatex -and $null -ne $bibtex) {
        & $pdflatex.Source -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=build $mainFile
        if ($LASTEXITCODE -ne 0) { throw "La primera pasada de pdflatex fallo." }

        & $bibtex.Source "build/manual-quni"
        if ($LASTEXITCODE -ne 0) { throw "La pasada de BibTeX fallo." }

        & $pdflatex.Source -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=build $mainFile
        if ($LASTEXITCODE -ne 0) { throw "La segunda pasada de pdflatex fallo." }

        & $pdflatex.Source -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=build $mainFile
        if ($LASTEXITCODE -ne 0) { throw "La tercera pasada de pdflatex fallo." }
    }
    else {
        $latexmk = Get-Command latexmk -ErrorAction SilentlyContinue
        if ($null -eq $latexmk) {
            throw "No se encontro el par pdflatex/bibtex ni latexmk. Instala MiKTeX o TeX Live y vuelve a ejecutar el script."
        }
        & $latexmk.Source -pdf -interaction=nonstopmode -halt-on-error -file-line-error -outdir=build $mainFile
        if ($LASTEXITCODE -ne 0) {
            throw "latexmk termino con codigo $LASTEXITCODE."
        }
    }

    $pdfPath = Join-Path $buildDir "manual-quni.pdf"
    if (-not (Test-Path -LiteralPath $pdfPath)) {
        throw "La compilacion termino sin producir $pdfPath."
    }
    Write-Host "Documento generado: $pdfPath"
}
finally {
    Pop-Location
}
