# Résumé build notes

- The LaTeX source (`.tex`) is the source of truth. Commit updates to the appropriate dated directory.
- Build locally with [`latexmk`](https://ctan.org/pkg/latexmk) or [`pandoc`](https://pandoc.org/) if you need quick PDF or DOCX outputs.
- Continuous Integration automatically builds both `.pdf` and `.docx` artifacts on pull requests and pushes to `main` that touch `docs/resume/**` or the resume workflow.
- The workflow treats the lexicographically latest `YYYY-MM` directory under `docs/resume/` as the active source. On `main`, it publishes generated files to `public/docs/resume/<version>/` and refreshes the stable `public/resume.*` aliases without writing build outputs back into `docs/resume/`.
- Runtime site links should use `/resume.pdf` as the canonical public résumé URL. The stable `/resume.docx` alias may be linked from documentation or download contexts where an editable copy is useful, but the primary UI should stay focused on the PDF.
- Keep dated public artifacts such as `public/docs/resume/2026-06/resume.pdf` as immutable archives for source snapshots. Do not rewrite old source directories or outage records when the stable runtime alias changes.
- The automated test suite compiles the latest dated résumé with [Tectonic](https://tectonic-typesetting.github.io/en-US/) and [Pandoc](https://pandoc.org/) to ensure both the PDF and DOCX outputs fit on a single A4 page. The check downloads pinned Linux binaries if they are not already on your `PATH` (other platforms should install the tools manually).

## ATS smoke policy

- The resume workflow keeps ATS smoke orchestration in `.github/workflows/resume.yml`
  and delegates validation/reporting policy to `scripts/resume-ats-smoke.py`.
- Update `docs/resume/ats-smoke.json` when required terms, section-order checks,
  or Education degree/date pairing severity need to change.
