# Favicon portrait pipeline

This project intentionally avoids committing the generated `favicon.ico`. Instead, the pixel
portrait is rendered from TypeScript code and produced on demand.

## Generating locally

```bash
npm run favicon
```

The command renders a high-resolution illustration based on Daniel's reference portrait and writes
`public/favicon.ico`. Because the file is ignored by git, re-run the command whenever you need a
fresh export.

## Continuous integration

The `Favicon portrait` GitHub Actions workflow runs the same script on pull requests and main
branch pushes that touch the favicon pipeline. It uploads the resulting `favicon.ico` as a build
artifact so reviewers can preview the latest iteration without requiring binary changes in the
repository.
