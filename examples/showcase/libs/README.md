# Showcase loader helpers

Place Draco decoder files inside `draco/` and Basis Universal transcoder files inside `basis/` if
you want to test hardware-accelerated compression locally. The demo ships without the binaries to
keep the repository lightweight, but the loader falls back gracefully when they are absent.
