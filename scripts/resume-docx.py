#!/usr/bin/env python3
"""Build and render-verify the canonical resume DOCX."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import quote
from xml.etree import ElementTree as ET


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"w": WORD_NS}
REQUIRED_LINKS = {
    "mailto:daniel@danielsmith.io",
    "https://danielsmith.io",
    "https://github.com/futuroptimist",
    "https://linkedin.com/in/danielsmith4483",
    "https://token.place",
    "https://github.com/futuroptimist/sugarkube",
    "https://democratized.space",
}
REQUIRED_TEXT = ("Pacifica, CA", "Summary", "Experience", "Skills", "Education")


def word_tag(name: str) -> str:
    return f"{{{WORD_NS}}}{name}"


def set_value(parent: ET.Element, name: str, value: str) -> ET.Element:
    child = parent.find(f"w:{name}", NS)
    if child is None:
        child = ET.SubElement(parent, word_tag(name))
    child.set(word_tag("val"), value)
    return child


def apply_docx_layout(docx: Path) -> None:
    """Apply compact, deterministic Word styles without altering document content."""
    ET.register_namespace("w", WORD_NS)
    ET.register_namespace("r", OFFICE_REL_NS)
    with tempfile.TemporaryDirectory(prefix="resume-docx-layout-") as temp:
        unpacked = Path(temp)
        with zipfile.ZipFile(docx) as archive:
            archive.extractall(unpacked)

        styles_path = unpacked / "word" / "styles.xml"
        styles = ET.parse(styles_path)
        for style in styles.findall(".//w:style", NS):
            style_type = style.get(word_tag("type"))
            if style_type not in {"paragraph", "character"}:
                continue
            style_id = style.get(word_tag("styleId"), "")
            properties_name = "pPr" if style_type == "paragraph" else "rPr"
            properties = style.find(f"w:{properties_name}", NS)
            if properties is None:
                properties = ET.SubElement(style, word_tag(properties_name))
            run_properties = properties
            if style_type == "paragraph":
                spacing = properties.find("w:spacing", NS)
                if spacing is None:
                    spacing = ET.SubElement(properties, word_tag("spacing"))
                spacing.set(word_tag("before"), "0")
                spacing.set(word_tag("after"), "0")
                spacing.set(word_tag("line"), "220")
                spacing.set(word_tag("lineRule"), "auto")
                run_properties = style.find("w:rPr", NS)
                if run_properties is None:
                    run_properties = ET.SubElement(style, word_tag("rPr"))

            fonts = run_properties.find("w:rFonts", NS)
            if fonts is None:
                fonts = ET.SubElement(run_properties, word_tag("rFonts"))
            for attribute in ("ascii", "hAnsi", "eastAsia", "cs"):
                fonts.set(word_tag(attribute), "Arial")

            size = "20"
            if style_id in {"Title"}:
                size = "28"
            elif style_id in {"Heading1"}:
                size = "24"
            elif style_id in {"Heading2", "Heading3"}:
                size = "21"
            set_value(run_properties, "sz", size)
            set_value(run_properties, "szCs", size)
            if style_id == "Normal":
                set_value(run_properties, "spacing", "-10")
        styles.write(styles_path, encoding="UTF-8", xml_declaration=True)

        document_path = unpacked / "word" / "document.xml"
        document = ET.parse(document_path)
        section = document.find(".//w:sectPr", NS)
        if section is None:
            raise RuntimeError("DOCX document has no section properties")
        page_size = section.find("w:pgSz", NS)
        if page_size is None:
            page_size = ET.SubElement(section, word_tag("pgSz"))
        page_size.set(word_tag("w"), "12240")
        page_size.set(word_tag("h"), "15840")
        margins = section.find("w:pgMar", NS)
        if margins is None:
            margins = ET.SubElement(section, word_tag("pgMar"))
        for side in ("top", "right", "bottom", "left"):
            margins.set(word_tag(side), "864")
        margins.set(word_tag("header"), "360")
        margins.set(word_tag("footer"), "360")
        margins.set(word_tag("gutter"), "0")
        document.write(document_path, encoding="UTF-8", xml_declaration=True)

        replacement = docx.with_suffix(".styled.docx")
        with zipfile.ZipFile(replacement, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(unpacked.rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(unpacked))
        replacement.replace(docx)


def run_build(source: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pandoc", str(source), "-o", str(output)], check=True)
    apply_docx_layout(output)


def command_output(command: list[str]) -> str:
    return subprocess.run(command, check=True, text=True, capture_output=True).stdout


def pandoc_text(docx: Path) -> str:
    """Extract DOCX text while preserving Pandoc's parser diagnostics."""
    command = ["pandoc", str(docx), "-t", "plain"]
    try:
        return subprocess.run(
            command, check=True, text=True, capture_output=True
        ).stdout
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or str(error)).strip()
        raise RuntimeError(f"Pandoc could not parse {docx}: {detail}") from error
    except OSError as error:
        raise RuntimeError(f"Pandoc could not parse {docx}: {error}") from error


def verify_links(docx: Path) -> None:
    with zipfile.ZipFile(docx) as archive:
        relationships = ET.fromstring(
            archive.read("word/_rels/document.xml.rels")
        )
    targets = {
        relationship.get("Target", "")
        for relationship in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
        if relationship.get("TargetMode") == "External"
    }
    missing = sorted(REQUIRED_LINKS - targets)
    if missing:
        raise RuntimeError(f"DOCX is missing required hyperlinks: {', '.join(missing)}")


def run_verify(docx: Path, render_dir: Path) -> None:
    render_dir.mkdir(parents=True, exist_ok=True)
    profile = render_dir / "libreoffice-profile"
    profile_uri = f"file://{quote(str(profile.resolve()))}"
    subprocess.run(
        [
            "libreoffice",
            "--headless",
            f"-env:UserInstallation={profile_uri}",
            "--convert-to",
            "pdf",
            "--outdir",
            str(render_dir),
            str(docx),
        ],
        check=True,
    )
    rendered_pdf = render_dir / f"{docx.stem}.pdf"
    if not rendered_pdf.is_file():
        raise RuntimeError(f"LibreOffice did not create {rendered_pdf}")

    info = command_output(["pdfinfo", str(rendered_pdf)])
    if not re.search(r"^Pages:\s+1\s*$", info, re.MULTILINE):
        raise RuntimeError("rendered DOCX must contain exactly one page")
    size = re.search(
        r"^Page size:\s+([0-9.]+) x ([0-9.]+) pts", info, re.MULTILINE
    )
    if not size or tuple(map(float, size.groups())) != (612.0, 792.0):
        raise RuntimeError("rendered DOCX must use 612 x 792 point US Letter pages")

    text_path = render_dir / f"{docx.stem}.txt"
    subprocess.run(["pdftotext", str(rendered_pdf), str(text_path)], check=True)
    extracted = text_path.read_text(encoding="utf-8")
    for required in (*REQUIRED_TEXT, "end-to-end"):
        if required not in extracted:
            raise RuntimeError(
                f"rendered DOCX extraction is missing required text: {required}"
            )
    if "Pacif ica" in extracted:
        raise RuntimeError("rendered DOCX contains the split text 'Pacif ica'")
    split = re.search(r"[A-Za-z]{2,}-\s*\n\s*[A-Za-z]{2,}", extracted)
    if split:
        raise RuntimeError(f"rendered DOCX contains a split word: {split.group(0)!r}")

    direct = pandoc_text(docx)
    direct_path = render_dir / f"{docx.stem}-pandoc.txt"
    direct_path.write_text(direct, encoding="utf-8")
    for required in (*REQUIRED_TEXT, "end-to-end"):
        if required not in direct:
            raise RuntimeError(f"Pandoc extraction is missing required text: {required}")

    direct_hyphenated = set(
        re.findall(r"(?<![A-Za-z])[A-Za-z]+(?:-[A-Za-z]+)+(?![A-Za-z])", direct)
    )
    rendered_normalized = re.sub(r"\s+", " ", extracted)
    missing_hyphens = sorted(
        term for term in direct_hyphenated if term not in rendered_normalized
    )
    if missing_hyphens:
        raise RuntimeError(
            "rendered DOCX changed hyphenated terms: " + ", ".join(missing_hyphens)
        )
    verify_links(docx)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    build = commands.add_parser("build")
    build.add_argument("--source", type=Path, required=True)
    build.add_argument("--output", type=Path, required=True)
    verify = commands.add_parser("verify")
    verify.add_argument("--docx", type=Path, required=True)
    verify.add_argument("--render-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "build":
        run_build(args.source, args.output)
    else:
        if args.render_dir.exists():
            shutil.rmtree(args.render_dir)
        run_verify(args.docx, args.render_dir)


if __name__ == "__main__":
    main()
