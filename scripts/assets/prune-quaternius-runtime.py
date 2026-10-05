"""Keep the complete importer reproducible while shipping only used meshes.

Run after ``import-full-quaternius-environment.py``.  The source packs remain
the catalog of record; the browser payload keeps the original Veldren models
plus authored environment models referenced by the current game code.
"""

import json
import pathlib
import re


ROOT = pathlib.Path(__file__).resolve().parents[2]
MODELS = ROOT / "client/assets/realms/models.js"

raw = MODELS.read_text()
runtime = json.loads(raw.split("=", 1)[1].rstrip(";\n"))
catalog = runtime.get("fullEnvironmentCatalog")
if not catalog:
    raise SystemExit("Import the full Quaternius catalogs before pruning")

all_models = set(runtime["models"])
keep = set(catalog.get("protectedModels", []))

# A quoted model identifier is the stable contract used throughout the plain
# browser runtime.  worldModel() intentionally omits the World_ prefix.
for path in (ROOT / "client").rglob("*.js"):
    if path == MODELS or "server" in path.parts:
        continue
    text = path.read_text(errors="ignore")
    for token in re.findall(r"['\"]([A-Za-z0-9_.-]+)['\"]", text):
        if token in all_models:
            keep.add(token)
        if "World_" + token in all_models:
            keep.add("World_" + token)
    keep.update(
        token
        for token in re.findall(r"\brebuiltModels\.([A-Za-z0-9_]+)", text)
        if token in all_models
    )

imported = {
    name
    for names in catalog.get("importedModels", {}).values()
    for name in names
}
removed = sorted((all_models & imported) - keep)
for name in removed:
    del runtime["models"][name]

catalog["runtimeModels"] = len(runtime["models"])
catalog["prunedImportedModels"] = len(removed)
MODELS.write_text("const REALM_MODELS=" + json.dumps(runtime, separators=(",", ":")) + ";\n")
print(f"Kept {len(runtime['models'])} runtime models; pruned {len(removed)} unused imported meshes")
