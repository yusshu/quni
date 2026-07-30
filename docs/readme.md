# Documentación de Q'uñi

Este directorio contiene el manual de usuario y referencia técnica de Q'uñi en LaTeX.

## Requisitos

Instala una distribución LaTeX con `pdflatex` y BibTeX. `latexmk` es opcional:

- Windows: MiKTeX o TeX Live.
- Linux: TeX Live con los paquetes recomendados y de idioma español.
- macOS: MacTeX.

Los paquetes usados son comunes: `babel`, `lmodern`, `microtype`, `geometry`, `amsmath`, `booktabs`, `longtable`, `tabularx`, `enumitem`, `xcolor`, `listings`, `fancyhdr`, `titlesec` e `hyperref`.

## Compilar en Windows

Desde la raíz del repositorio:

```powershell
npm run docs:build
```

O directamente:

```powershell
.\docs\build.ps1
```

Para borrar los artefactos:

```powershell
npm run docs:clean
```

## Compilar en Linux o macOS

```sh
cd docs
make
```

También se puede usar `latexmk` directamente:

```sh
latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error -outdir=build manual-quni.tex
```

El resultado se escribe en `docs/build/manual-quni.pdf`.

## Archivos

- `manual-quni.tex`: documento principal en español.
- `references.bib`: fuentes técnicas primarias y documentación oficial.
- `build.ps1`: compilación reproducible en PowerShell, con alternativa sin `latexmk`.
- `Makefile`: compilación para entornos tipo Unix.
- `latexmkrc`: configuración local de `latexmk`.

Los archivos generados bajo `build/` no se versionan.
