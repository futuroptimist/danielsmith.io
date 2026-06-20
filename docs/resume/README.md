# Résumé build notes

- The LaTeX source (`.tex`) is the source of truth. Commit updates to the appropriate dated directory.
- Build locally with [`latexmk`](https://ctan.org/pkg/latexmk) or [`pandoc`](https://pandoc.org/) if you need quick PDF or DOCX outputs.
- Continuous Integration automatically builds both `.pdf` and `.docx` artifacts on pull requests and pushes to `main` that touch `docs/resume/**` or the resume workflow.
- The workflow treats the lexicographically latest `YYYY-MM` directory under `docs/resume/` as the active source. On `main`, it publishes generated files to `public/docs/resume/<version>/` and refreshes the stable `public/resume.*` aliases without writing build outputs back into `docs/resume/`.
- Use `/resume.pdf` as the canonical runtime résumé URL for active site links, static asset expectations, smoke checks, and tests. `/resume.docx` is also refreshed as a stable downloadable artifact when DOCX is useful, but primary UI should stay focused on the PDF.
- Treat `public/docs/resume/2026-06/resume.pdf` as the immutable dated PDF archive for the current source version. Older dated archives remain intentionally historical and should not be rewritten when runtime links move to the stable aliases.
- The automated test suite compiles the latest dated résumé with [Tectonic](https://tectonic-typesetting.github.io/en-US/) and [Pandoc](https://pandoc.org/) to ensure both the PDF and DOCX outputs fit on a single A4 page. The check downloads pinned Linux binaries if they are not already on your `PATH` (other platforms should install the tools manually).
