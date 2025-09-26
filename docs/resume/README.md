# Résumé build notes

- The LaTeX source (`.tex`) is the source of truth. Commit updates to the appropriate dated directory.
- Build locally with [`latexmk`](https://ctan.org/pkg/latexmk) or [`pandoc`](https://pandoc.org/) if you need quick PDF or DOCX outputs.
- Continuous Integration automatically builds both `.pdf` and `.docx` artifacts on every push that touches `docs/resume/**`.
