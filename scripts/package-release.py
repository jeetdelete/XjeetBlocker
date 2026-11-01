"""Package built desktop/mobile artifacts without extra Python dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json
import re
import shutil

root = Path(__file__).resolve().parent.parent
version = json.loads((root / "package.json").read_text())["version"]
dist = root / "dist"
manifest = json.loads((dist / "manifest.json").read_text())
assert manifest["version"] == version, "Build before packaging: manifest version mismatch"
assert manifest["permissions"] == ["storage", "unlimitedStorage"]
assert manifest["host_permissions"] == ["https://x.com/*"]
required = [manifest["action"]["default_popup"], *[f for s in manifest["content_scripts"] for f in s["js"]]]
required += re.findall(r'<script[^>]*src="([^"]+)"', (dist / "index.html").read_text())
assert all((dist / name).is_file() for name in required), "Missing extension asset"
mobile = root / "dist-mobile" / "XjeetBlocker.user.js"
script = mobile.read_text()
assert script.startswith("// ==UserScript==\n"), "Userscript metadata must be the first bytes"
header = script.split("// ==/UserScript==", 1)[0]
assert re.search(r"^// @version\s+" + re.escape(version) + r"$", header, re.M)
assert re.findall(r"^// @match\s+(.+)$", header, re.M) == ["https://x.com/*"]
assert set(re.findall(r"^// @grant\s+(.+)$", header, re.M)) == {
    "GM.getValue", "GM.setValue", "GM.deleteValue", "GM.listValues",
}
assert "@require" not in header
assert not re.search(r"\bchrome\.(?:runtime|tabs|storage)\b", script), "Mobile build must not need Chrome APIs"
out = root / "release" / f"v{version}"
out.mkdir(parents=True, exist_ok=True)


def bundle(name, files):
    with ZipFile(out / name, "w", ZIP_DEFLATED) as archive:
        for path, relative in sorted(files, key=lambda item: str(item[1])):
            info = ZipInfo(str(relative), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
    with ZipFile(out / name) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == {str(relative) for _, relative in files}
        for path, relative in files:
            assert archive.read(str(relative)) == path.read_bytes()


bundle("x-region-blocker.zip", [(p, p.relative_to(dist).as_posix()) for p in dist.rglob("*") if p.is_file()])
bundle("XjeetBlocker-mobile.zip", [(mobile, mobile.name), (root / "MOBILE.md", "MOBILE_INSTALL.md")])
for source, name in [(mobile, mobile.name), (root / "MOBILE.md", "MOBILE_INSTALL.md"), (root / "SECURITY_REVIEW.md", "SECURITY_REVIEW.md")]:
    shutil.copyfile(source, out / name)
names = ["x-region-blocker.zip", "XjeetBlocker-mobile.zip", mobile.name, "MOBILE_INSTALL.md", "SECURITY_REVIEW.md"]
(out / "SHA256SUMS").write_text("".join(f"{hashlib.sha256((out / name).read_bytes()).hexdigest()}  {name}\n" for name in names))
print(out)
print((out / "SHA256SUMS").read_text())
