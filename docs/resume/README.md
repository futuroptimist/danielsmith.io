# Résumé build notes

- The LaTeX source (`.tex`) is the source of truth. Commit updates to the appropriate dated
  directory.
- Build locally with [`latexmk`](https://ctan.org/pkg/latexmk) or
  [`pandoc`](https://pandoc.org/) if you need quick PDF or DOCX outputs.
- Continuous Integration automatically builds both `.pdf` and `.docx` artifacts on every pull
  request or push that touches `docs/resume/**` or the résumé workflow.
- The workflow selects the lexicographically latest `YYYY-MM` directory under `docs/resume/` as the
  active source and builds into a temporary directory so generated files are not written beside the
  source.
- On pushes to `main`, the workflow publishes generated résumé artifacts to versioned public paths
  (`public/docs/resume/<version>/resume.pdf` and `.docx`) plus stable aliases (`public/resume.pdf`
  and `public/resume.docx`) when outputs change.
- Generated binary artifacts under `public/` are committed by the GitHub Actions bot only after a
  successful `main` build; do not manually create or commit résumé PDFs or DOCX files from
  Codex-authored changes.
- The automated test suite compiles the latest dated résumé with
  [Tectonic](https://tectonic-typesetting.github.io/en-US/) and [Pandoc](https://pandoc.org/) to
  ensure both the PDF and DOCX outputs fit on a single A4 page. The check downloads pinned Linux
  binaries if they are not already on your `PATH` (other platforms should install the tools
  manually).
