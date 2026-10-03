# Résumé build notes

- The active source is [`2026-10/resume.tex`](2026-10/resume.tex). It adds the reviewed Muon Space
  role while retaining the independent open-source entry as June 2025–Present. Older dated
  sources remain immutable.
- The LaTeX source (`.tex`) is the source of truth. Commit updates to the appropriate dated directory.
- Build the PDF locally with [`latexmk`](https://ctan.org/pkg/latexmk). Build the DOCX with
  `python3 scripts/resume-docx.py build` so it receives the production page geometry and styles.
- Continuous Integration automatically builds both `.pdf` and `.docx` artifacts on pull requests and pushes to `main` that touch `docs/resume/**` or the resume workflow.
- The workflow treats the lexicographically latest `YYYY-MM` directory under `docs/resume/` as the active source. On `main`, it publishes generated files to `public/docs/resume/<version>/` and refreshes the stable `public/resume.*` aliases without writing build outputs back into `docs/resume/`.
- Runtime site links should use `/resume.pdf` as the canonical public résumé URL. The stable `/resume.docx` alias may be linked from documentation or download contexts where an editable copy is useful, but the primary UI should stay focused on the PDF.
- Keep dated public artifacts such as `public/docs/resume/2026-06/resume.pdf` as immutable archives for source snapshots. Do not rewrite old source directories or outage records when the stable runtime alias changes.
- The automated test suite compiles the latest dated résumé with
  [Tectonic](https://tectonic-typesetting.github.io/en-US/) and
  [Pandoc](https://pandoc.org/). The résumé workflow is the authoritative DOCX gate: it renders
  the production DOCX with headless LibreOffice and requires one 612 × 792-point page, clean text
  extraction, and preserved contact and project links. Local artifact tests run the same verifier
  when LibreOffice and Poppler are installed.

## ATS smoke policy

- The resume workflow keeps ATS smoke orchestration in `.github/workflows/resume.yml`
  and delegates validation/reporting policy to `scripts/resume-ats-smoke.py`.
- Update `docs/resume/ats-smoke.json` when required terms, section-order checks,
  Education degree/date pairing severity, or employer-scoped role/date/team checks need to change.
- The ATS smoke check treats extracted line-ending split words as failures and uses
  `pdfinfo` to require populated PDF metadata and US Letter dimensions.

## October 2026 review

The Muon entry uses the owner-confirmed title, start date, and Mission Planning Platform team.
Its modest present-tense responsibility text follows the
[public Ground Software role posting](https://job-boards.greenhouse.io/muonspace/jobs/5083758007);
the posting supports the role's scope, not completed individual achievements or personally used
technologies. The separate open-source entry continues through Present.

For each candidate source, inspect both the actual PDF and the LibreOffice-rendered DOCX, including
one-page US Letter layout, metadata, contact/project links, extracted text, and employer/date/role
pairing. Run the ATS policy against the PDF's plain and layout extraction; the reviewed career
pairings are also checked against the DOCX extraction by the artifact tests when their tools are
available. A test skipped because a rendering tool is missing is not render evidence. Generated
review outputs stay outside the repository; only the post-merge workflow publishes public aliases.
