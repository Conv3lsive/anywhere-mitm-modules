#!/usr/bin/env python3
"""Build self-contained Anywhere .amrs files without downloading any code."""
import argparse
import base64
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def row(fields):
    out = io.StringIO(newline="")
    csv.writer(out, lineterminator="\n").writerow(fields)
    return out.getvalue()


def artifacts():
    for module in json.loads((ROOT / "modules.json").read_text()):
        lines = [
            "# " + module["description"] + "\n",
            "# Self-contained scripts; no remote JavaScript downloads.\n",
            "name = " + module["name"] + "\n",
            "hostname = " + ", ".join(module["hostnames"]) + "\n\n[Rule]\n",
        ]
        for rule in module["rules"]:
            if isinstance(rule, dict):
                source = "\n".join((ROOT / path).read_text() for path in rule["scripts"])
                lines.append("# Source: " + " + ".join(rule["scripts"]) + "\n")
                lines.append(row([rule["phase"], 100, rule["pattern"], base64.b64encode(source.encode()).decode()]))
            else:
                lines.append(row(rule))
        if module["parameters"]:
            lines.append("\n[Parameter]\n")
            lines.extend(row(parameter) for parameter in module["parameters"])
        yield ROOT / "modules" / (module["id"] + ".amrs"), "".join(lines).encode()
    for routing in json.loads((ROOT / "routing.json").read_text()):
        lines = ["# " + routing["description"] + "\n", "name = " + routing["name"] + "\n"]
        if "routing" in routing:
            lines.append("routing = " + str(routing["routing"]) + "\n")
        lines.append("\n")
        lines.extend(row(rule) for rule in routing["rules"])
        yield ROOT / "routing" / (routing["id"] + ".arrs"), "".join(lines).encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify generated files and hashes without editing")
    args = parser.parse_args()
    generated = dict(artifacts())
    sources = [ROOT / "modules.json", ROOT / "routing.json", *sorted((ROOT / "scripts").rglob("*.js"))]
    hashed = {**{path: path.read_bytes() for path in sources}, **generated}
    sums = "".join(hashlib.sha256(data).hexdigest() + "  " + str(path.relative_to(ROOT)) + "\n"
                   for path, data in sorted(hashed.items()))
    generated[ROOT / "SHA256SUMS"] = sums.encode()
    stale = []
    for path, data in generated.items():
        if args.check:
            if not path.exists() or path.read_bytes() != data:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    if stale:
        raise SystemExit("Rebuild required: " + ", ".join(stale))
    print("Verified generated rule sets and SHA-256 hashes." if args.check else "Built MITM modules, routing sets, and SHA-256 hashes.")


if __name__ == "__main__":
    main()
