# Résumé build notes

- The LaTeX source (`.tex`) is the source of truth. Commit updates to the appropriate dated directory.
- Build locally with [`latexmk`](https://ctan.org/pkg/latexmk) or [`pandoc`](https://pandoc.org/) if you need quick PDF or DOCX outputs.
- Continuous Integration automatically builds both `.pdf` and `.docx` artifacts on every push that touches `docs/resume/**`.
- The automated test suite compiles the latest dated résumé with [Tectonic](https://tectonic-typesetting.github.io/en-US/) and [Pandoc](https://pandoc.org/) to ensure both the PDF and DOCX outputs fit on a single A4 page. The check downloads pinned Linux binaries if they are not already on your `PATH` (other platforms should install the tools manually).
