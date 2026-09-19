"""Acquire the public source packs referenced by Veldren from their publishers.

The archives are development inputs, not runtime dependencies, and branch CI can
repeat the same publisher acquisition before committing verified extractions. Downloads land in
the ignored ``.qa`` cache unless ``--cache`` is supplied. The report records the
publisher page, current upload identity, exact bytes and SHA-256 for reproducible
recovery. Authentication-gated CGTrader originals are intentionally not scraped.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import http.cookiejar
import html
import json
import re
import shutil
import struct
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[2]
USER_AGENT = "Veldren-source-recovery/1.0 (+private game-authoring cache)"


@dataclass(frozen=True)
class Pack:
    id: str
    page: str
    publisher: str
    license_note: str
    expected_uploads: tuple[str, ...]


PACKS = (
    Pack(
        "medieval-village",
        "https://quaternius.itch.io/medieval-village-megakit",
        "Quaternius",
        "Standard edition; CC0 1.0",
        ("Medieval Village MegaKit[Standard].zip",),
    ),
    Pack(
        "fantasy-props",
        "https://quaternius.itch.io/fantasy-props-megakit",
        "Quaternius",
        "Standard edition; CC0 1.0",
        ("Fantasy Props MegaKit[Standard].zip",),
    ),
    Pack(
        "fantasy-outfits",
        "https://quaternius.itch.io/modular-character-outfits-fantasy",
        "Quaternius",
        "Standard edition; CC0 1.0",
        ("Modular Character Outfits - Fantasy[Standard].zip",),
    ),
    Pack(
        "universal-animation-2",
        "https://quaternius.itch.io/universal-animation-library-2",
        "Quaternius",
        "Standard edition; CC0 1.0",
        ("Universal Animation Library 2[Standard].zip",),
    ),
    Pack(
        "bestiary",
        "https://quaternius.itch.io/bestiary-dungeon-monsters-kit",
        "Quaternius",
        "Standard edition; QAL 1.0; project use only, never a standalone asset redistribution",
        ("Bestiary - Dungeon Monsters Kit[Standard].zip",),
    ),
    Pack(
        "modular-warrior",
        "https://ch0san.itch.io/modular-warrior",
        "CH0SAN",
        "Author-page permission record is incomplete; keep private and do not redistribute",
        (
            "Modular Hero.unitypackage",
            "Modular_Warrior.fbx",
            "ModularWarior1.glb",
            "ModularWarior1_GLTF.rar",
        ),
    ),
    Pack(
        "human-archer",
        "https://kevdev.itch.io/human-archer-animations-free",
        "Kevin Iglesias",
        "Free package; existing provenance records Standard Asset Store EULA; keep private",
        (
            "Human Archer Animations FREE Godot/Unreal",
            "Human Archer Animations FREE Unity",
        ),
    ),
    Pack(
        "treant",
        "https://tennessippistudios.itch.io/treant-pack",
        "Tennessippi Studios",
        "Existing Veldren provenance records CC0 1.0; retain archive evidence",
        ("Treant Package.7z",),
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_name(name: str) -> str:
    value = html.unescape(name).replace("/", "-").replace("\\", "-").strip()
    value = re.sub(r"[\x00-\x1f]", "", value)
    if not value or value in {".", ".."}:
        raise ValueError(f"Unsafe upload name: {name!r}")
    return value


def safe_member(name: str) -> PurePosixPath:
    value = PurePosixPath(name.replace("\\", "/"))
    if value.is_absolute() or not value.parts or ".." in value.parts:
        raise ValueError(f"Unsafe archive member: {name!r}")
    return value


def request(opener, url: str, *, data: dict[str, str] | None = None):
    payload = urllib.parse.urlencode(data).encode() if data is not None else None
    headers = {"User-Agent": USER_AGENT}
    if payload is not None:
        headers["X-Requested-With"] = "XMLHttpRequest"
    return opener.open(urllib.request.Request(url, data=payload, headers=headers), timeout=90)


def text(opener, url: str) -> str:
    with request(opener, url) as response:
        return response.read().decode("utf-8")


def csrf(page: str) -> str:
    match = re.search(r'<meta name="csrf_token" value="([^"]+)"', page)
    if not match:
        raise ValueError("Publisher page did not expose an itch.io CSRF token")
    return html.unescape(match.group(1))


def generate_endpoint(page: str, fallback: str) -> str:
    match = re.search(r'"generate_download_url":"([^"]+)"', page)
    if not match:
        return fallback.rstrip("/") + "/download_url"
    return json.loads('"' + match.group(1) + '"')


def upload_rows(page: str) -> list[dict[str, str]]:
    rows = []
    pattern = re.compile(
        r'<div class="upload">(?P<body>.*?data-upload_id="(?P<id>\d+)".*?)'
        r'</div>\s*</div>',
        re.DOTALL,
    )
    for match in pattern.finditer(page):
        body = match.group("body")
        name = re.search(r'<strong title="([^"]+)"', body)
        size = re.search(
            r'<span class="file_size">\s*<span>([^<]+)</span>', body, re.DOTALL
        )
        if name:
            rows.append(
                {
                    "uploadId": match.group("id"),
                    "name": html.unescape(name.group(1)),
                    "displaySize": html.unescape(size.group(1).strip()) if size else "unknown",
                }
            )
    return rows


def download_url(opener, pack: Pack, upload_id: str, token_page: str) -> str:
    slug = urllib.parse.urlsplit(pack.page).path.strip("/")
    endpoint = urllib.parse.urljoin(pack.page.rstrip("/") + "/", f"file/{upload_id}")
    endpoint += "?source=view_game&as_props=1"
    payload = json.load(request(opener, endpoint, data={"csrf_token": csrf(token_page)}))
    url = payload.get("url")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise ValueError(f"No HTTPS download URL returned for {slug} upload {upload_id}")
    return url


def stream(opener, url: str, destination: Path) -> tuple[int, str | None]:
    part = destination.with_name(destination.name + ".part")
    part.parent.mkdir(parents=True, exist_ok=True)
    content_type = None
    try:
        with request(opener, url) as response, part.open("wb") as target:
            content_type = response.headers.get_content_type()
            shutil.copyfileobj(response, target, length=1024 * 1024)
        part.replace(destination)
    finally:
        if part.exists():
            part.unlink()
    return destination.stat().st_size, content_type


def infer_extension(path: Path) -> Path:
    if path.suffix:
        return path
    with path.open("rb") as source:
        signature = source.read(8)
    extension = ".zip" if signature.startswith(b"PK") else ".unitypackage" if signature.startswith(b"\x1f\x8b") else ""
    if extension:
        renamed = path.with_name(path.name + extension)
        path.replace(renamed)
        return renamed
    return path


def validate_file(path: Path) -> dict:
    with path.open("rb") as source:
        signature = source.read(24)
    if signature.startswith(b"PK"):
        with zipfile.ZipFile(path) as archive:
            members = [entry for entry in archive.infolist() if not entry.is_dir()]
            for entry in members:
                safe_member(entry.filename)
                if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                    raise ValueError(f"Archive contains a symlink: {entry.filename}")
            bad = archive.testzip()
            if bad:
                raise ValueError(f"ZIP CRC failed: {bad}")
        return {
            "kind": "zip",
            "members": len(members),
            "expandedBytes": sum(entry.file_size for entry in members),
            "verified": True,
        }
    if signature.startswith(b"\x1f\x8b"):
        total = 0
        count = 0
        with tarfile.open(path, "r:gz") as archive:
            for entry in archive:
                safe_member(entry.name)
                if entry.issym() or entry.islnk():
                    raise ValueError(f"Archive contains a link: {entry.name}")
                if not entry.isfile():
                    continue
                source = archive.extractfile(entry)
                if source is None:
                    raise ValueError(f"Could not read archive member: {entry.name}")
                read = 0
                for block in iter(lambda: source.read(1024 * 1024), b""):
                    read += len(block)
                if read != entry.size:
                    raise ValueError(f"Truncated archive member: {entry.name}")
                total += read
                count += 1
        return {"kind": "unitypackage", "members": count, "expandedBytes": total, "verified": True}
    if signature.startswith((b"7z\xbc\xaf\x27\x1c", b"Rar!")):
        import libarchive

        total = 0
        count = 0
        with libarchive.file_reader(str(path)) as entries:
            for entry in entries:
                safe_member(entry.pathname)
                if not entry.isfile:
                    continue
                read = sum(len(block) for block in entry.get_blocks())
                if read != entry.size:
                    raise ValueError(f"Truncated archive member: {entry.pathname}")
                total += read
                count += 1
        return {
            "kind": "7z" if signature.startswith(b"7z") else "rar",
            "members": count,
            "expandedBytes": total,
            "verified": True,
        }
    if signature.startswith(b"glTF"):
        if len(signature) < 12:
            raise ValueError(f"Truncated GLB header: {path.name}")
        version, declared = struct.unpack_from("<II", signature, 4)
        if version != 2 or declared != path.stat().st_size:
            raise ValueError(f"Invalid GLB header: {path.name}")
        return {"kind": "glb", "members": 1, "expandedBytes": declared, "verified": True}
    if signature.startswith(b"Kaydara FBX Binary"):
        return {
            "kind": "fbx",
            "members": 1,
            "expandedBytes": path.stat().st_size,
            "verified": True,
        }
    raise ValueError(f"Unknown downloaded file type: {path.name}")


def acquire(pack: Pack, cache: Path, refresh: bool) -> dict:
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    landing = text(opener, pack.page)
    endpoint = generate_endpoint(landing, pack.page)
    token = json.load(request(opener, endpoint, data={"csrf_token": csrf(landing)}))
    token_url = token.get("url")
    if not isinstance(token_url, str):
        raise ValueError(f"No download page returned for {pack.id}")
    files_page = text(opener, token_url)
    available = upload_rows(files_page)
    by_name = {row["name"]: row for row in available}
    missing = sorted(set(pack.expected_uploads) - set(by_name))
    unexpected = sorted(set(by_name) - set(pack.expected_uploads))
    if missing:
        raise ValueError(f"{pack.id}: expected uploads missing: {missing}")
    result = {
        "id": pack.id,
        "publisher": pack.publisher,
        "page": pack.page,
        "licenseBoundary": pack.license_note,
        "unexpectedUploads": unexpected,
        "files": [],
    }
    for expected in pack.expected_uploads:
        row = by_name[expected]
        destination = cache / pack.id / safe_name(expected)
        cached = next(
            (
                candidate
                for candidate in (
                    destination,
                    destination.with_name(destination.name + ".zip"),
                    destination.with_name(destination.name + ".unitypackage"),
                )
                if candidate.exists()
            ),
            None,
        )
        if cached is not None and not refresh:
            destination = infer_extension(cached)
            content_type = None
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            signed_url = download_url(opener, pack, row["uploadId"], files_page)
            _, content_type = stream(opener, signed_url, destination)
            destination = infer_extension(destination)
        result["files"].append(
            {
                **row,
                "path": destination.relative_to(ROOT).as_posix()
                if destination.is_relative_to(ROOT)
                else str(destination),
                "bytes": destination.stat().st_size,
                "sha256": sha256(destination),
                "contentType": content_type,
                "validation": validate_file(destination),
            }
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cache",
        type=Path,
        default=ROOT / ".qa/migration/model-sources/downloads",
        help="Private download cache (default: ignored .qa directory)",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "migration/reports/model-source-acquisition.json",
    )
    parser.add_argument("--pack", action="append", choices=[pack.id for pack in PACKS])
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--jobs", type=int, default=3)
    args = parser.parse_args()
    selected = [pack for pack in PACKS if not args.pack or pack.id in args.pack]
    started = time.time()
    rows = []
    errors = []
    args.cache.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        futures = {pool.submit(acquire, pack, args.cache, args.refresh): pack for pack in selected}
        for future in concurrent.futures.as_completed(futures):
            pack = futures[future]
            try:
                row = future.result()
                rows.append(row)
                size = sum(item["bytes"] for item in row["files"])
                print(f"Acquired {pack.id}: {len(row['files'])} files, {size} bytes", flush=True)
            except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as error:
                errors.append({"id": pack.id, "error": str(error)})
                print(f"FAILED {pack.id}: {error}", flush=True)
    rows.sort(key=lambda row: row["id"])
    report = {
        "schemaVersion": 1,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "purpose": "Private Veldren authoring recovery; production continues to use adapted local assets.",
        "packs": rows,
        "errors": errors,
        "notAutomated": [
            {
                "id": "cgtrader-originals",
                "reason": "The Ork/minotaur, Icebronze and Demon originals require an authenticated licensee download. The acquisition script does not bypass login or redistribute those source packages.",
            }
        ],
        "elapsedSeconds": round(time.time() - started, 3),
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"packs": len(rows), "files": sum(len(row["files"]) for row in rows), "errors": errors}))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
