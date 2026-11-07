"""Build standalone public demos using only the Python standard library."""
from pathlib import Path
import base64
import hashlib
import json
import mimetypes
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "dist"
ASSETS = ROOT / "assets"
BAMBOO = ASSETS / "bamboo-water-town.png"
OUTPUT.mkdir(parents=True, exist_ok=True)


def data_url(path):
    mime = mimetypes.guess_type(path.name)[0]
    if mime not in {"image/png", "image/jpeg", "image/webp"}:
        raise ValueError("Only PNG, JPEG and WebP assets are supported.")
    return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def public_image(item):
    path = (ROOT / item["asset"]).resolve()
    if not path.is_relative_to(ASSETS.resolve()):
        raise ValueError("Image assets must be inside assets/.")
    result = {key: item[key] for key in
              ["title", "alt", "theme", "role", "photographer", "source_page"]
              if key in item}
    # Placeholder slots share one serialized image, rather than nine copies.
    result["src"] = "@bamboo" if path == BAMBOO.resolve() else data_url(path)
    return result


selection = json.loads((ROOT / "pubphoto-manifest.json").read_text(encoding="utf-8"))
payload = {
    "bamboo": data_url(BAMBOO),
    "photos": [public_image(item) for item in selection["items"]],
    "coast": public_image(selection["coast_reference"]),
}
payload["entryArt"] = {"traveler": data_url(ASSETS / "entry-traveler.png"), "storefront": data_url(ASSETS / "entry-storefront.png")}
payload["foregroundBamboo"] = data_url(ASSETS / "bamboo-real.png")
room_editorial = json.loads((ROOT / "room-editorial.json").read_text(encoding="utf-8"))
payload["roomEditorial"] = {key: dict(item, src=data_url(ROOT / item["asset"]))
                            for key, item in room_editorial["shops"].items()}
scenic = json.loads((ROOT / "scenic-manifest.json").read_text(encoding="utf-8"))
payload["scenicPhotos"] = [dict(item, src=data_url(ROOT / item["asset"])) for item in scenic["items"]]
payload["photos"] = []


payload["townPhotography"] = {"src": data_url(ROOT / "assets/town-yunxi-user.jpg"), "source": "用户提供摄影"}


script_files = ["silk-title.js", "landscape-motion.js", "contact-sheet.js",
                "depth-cards.js", "home-scroll.js", "bamboo-fog.js", "entry-icons.js", "entry-art.js", "home-polish.js", "today-planner.js", "owner-dashboard.js", "room-editorial.js", "town-selection.js", "controller.js"]
node = shutil.which("node")
if node:
    for name in script_files:
        subprocess.run([node, "--check", str(ROOT / "src" / name)], check=True)
else:
    print("Node.js is optional; JavaScript syntax checks were skipped.")
scripts = "\n\n".join((ROOT / "src" / name).read_text(encoding="utf-8") for name in script_files)
css_files = ["base-theme.css", "green-theme.css", "depth-cards.css",
             "landscape-motion.css", "silk-title.css", "home-scroll.css", "bamboo-fog.css", "entry-art.css", "home-polish.css", "today-planner.css", "owner-dashboard.css", "room-editorial.css", "brand-theme.css", "town-selection.css"]
main_css = "\n\n".join((ROOT / "src" / name).read_text(encoding="utf-8") for name in css_files)
main_css = main_css.replace('url("./assets/bamboo-water-town.png")', "var(--hk-bamboo-image, none)")
assert "./assets/" not in main_css
intro_css = (ROOT / "src/intro-theme.css").read_text(encoding="utf-8") + "\n" + (
    ROOT / "src/green-theme.css").read_text(encoding="utf-8") + "\n" + (ROOT / "src/brand-theme.css").read_text(encoding="utf-8")

report = []
credential_pattern = re.compile(bytes([115, 107, 45]) + rb"[A-Za-z0-9_-]{12,}")
for name, css in [("会客厅-Demo1.0.html", main_css), ("会客厅-Demo1.0-产品介绍.html", intro_css)]:
    original = (ROOT / "original" / name).read_bytes()
    if credential_pattern.search(original):
        raise ValueError("A credential-like token remains in original/; do not publish.")
    style = ('\n<style id="hk-visual-theme" media="screen">\n' + css + '\n</style>\n'
             '<script id="hk-release-title">document.title="会客厅Demo 3.0";</script>\n'
             '<style id="hk-visual-print" media="print">'
             '.hk-contact-sheet,.hk-photo-dialog,.hk-depth-layer,.hk-landscape-layer'
             '{display:none!important}</style>\n').encode("utf-8")
    body = b""
    if name == "会客厅-Demo1.0.html":
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
        body = ('\n<script id="hk-visual-data" type="application/json">' + encoded + '</script>\n'
                '<script id="hk-visual-enhancement">\n' + scripts + '\n</script>\n').encode("utf-8")
    assert original.count(b"</head>") == 1 and original.count(b"</body>") == 1
    result = original.replace(b"</head>", style + b"</head>")
    if body:
        result = result.replace(b"</body>", body + b"</body>")
    assert result.replace(style, b"").replace(body, b"") == original
    for old_script in re.findall(rb"<script\b[^>]*>[\s\S]*?</script>", original):
        assert old_script in result
    assert not credential_pattern.search(result)
    (OUTPUT / name).write_bytes(result)
    if name == '会客厅-Demo1.0.html':
        (OUTPUT / '会客厅Demo 3.0.html').write_bytes(result)
    report.append({
        "file": name,
        "sanitized_original_sha256": hashlib.sha256(original).hexdigest(),
        "sanitized_original_exactly_recovered_after_removing_added_blocks": True,
        "functional_scripts_unchanged_from_sanitized_original": True,
        "original_css_unchanged": True,
        "added_effects_hidden_from_print": True,
        "enhancement_js_syntax_checked": bool(node),
    })
    print(name + ": built; sanitized original and functional scripts preserved")

(OUTPUT / "源码校验.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(OUTPUT / "图片说明.json").write_text(json.dumps(selection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(OUTPUT / "打开说明.txt").write_text(
    "会客厅Demo 3.0 · 公开预览\n\n"
    "双击「会客厅Demo 3.0.html」打开。两份 HTML 保留在同一目录，产品介绍互链即可使用。\n"
    "公开版本包含获许可的六张风景照片、AI 生成与用户提供的设计素材；不代表虚构店铺实景。\n"
    "首页由原地区目录直接上滑覆盖首屏，不插入中间整屏图片。\n"
    "样式、图片和增强脚本已内嵌；网络字体不可用时使用系统字体。\n"
    "默认使用原型已有的本地演示回答回退；本仓库不提供在线模型后端。\n"
    "含五店三栏详情、今天怎么过与店主看板；天气和统计均明确为演示。支持减少动态效果，影像流可暂停，照片预览支持 Escape 关闭。\n",
    encoding="utf-8",
)
print("Main HTML bytes:", (OUTPUT / "会客厅-Demo1.0.html").stat().st_size)
