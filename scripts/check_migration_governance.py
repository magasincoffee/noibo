#!/usr/bin/env python3
"""MAGASIN migration governance static validator."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
migrations = root / "supabase" / "migrations"
policy = root / "PROJECT_CONTROL" / "MIGRATION_GOVERNANCE_V1.md"
reconciliation = root / "PROJECT_CONTROL" / "MIGRATION_RECONCILIATION.md"

pattern = re.compile(r"^(\d{14})_[a-z0-9][a-z0-9_]*\.sql$")
files = sorted(p.name for p in migrations.glob("*.sql"))
errors = []

if not files:
    errors.append("no migration files found")

versions = []
for name in files:
    m = pattern.match(name)
    if not m:
        errors.append(f"invalid migration filename: {name}")
        continue
    version = m.group(1)
    versions.append(version)
    if "placeholder" in name:
        errors.append(f"placeholder migration forbidden: {name}")

if len(versions) != len(set(versions)):
    errors.append("duplicate migration version detected")

if versions != sorted(versions):
    errors.append("migration versions are not strictly ordered")

if not policy.exists():
    errors.append("missing PROJECT_CONTROL/MIGRATION_GOVERNANCE_V1.md")

if not reconciliation.exists():
    errors.append("missing PROJECT_CONTROL/MIGRATION_RECONCILIATION.md")
else:
    text = reconciliation.read_text(encoding="utf-8")
    required = [
        "Do **not**",
        "schema_migrations",
        "Fresh PostgreSQL replay: NOT RUN",
        "pre-Phase-11 database-governance gate",
    ]
    for marker in required:
        if marker not in text:
            errors.append(f"reconciliation evidence missing marker: {marker}")

if errors:
    print("MIGRATION GOVERNANCE: FAIL")
    for err in errors:
        print(f"- {err}")
    sys.exit(1)

print("MIGRATION GOVERNANCE: PASS")
print(f"- migration files: {len(files)}")
print(f"- first version: {versions[0]}")
print(f"- last version: {versions[-1]}")
print("- historical drift remains documented and immutable")
