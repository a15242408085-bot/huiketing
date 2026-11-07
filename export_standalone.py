"""Export the sanitized public demo and its introduction as one portable HTML."""
from pathlib import Path
import base64
import json
import re
import sys

ROOT = Path(__file__).resolve().parent
destination = Path(sys.argv[1]).resolve()
main = (ROOT / "dist/会客厅Demo 3.0.html").read_text(encoding="utf-8")
intro = (ROOT / "dist/会客厅-Demo1.0-产品介绍.html").read_bytes()
assert not re.search(rb"sk-[A-Za-z0-9_-]{12,}", main.encode() + intro)
main = main.replace("<title>会客厅 Demo 1.0</title>", "<title>会客厅Demo 3.0</title>")

packaging = r'''
<style id="hk-standalone-style">
  #hk-standalone-intro{padding:0;border:1px solid #d4dedb;border-radius:16px;width:min(1280px,96vw);max-width:96vw;max-height:94vh;background:#fbfbf8;color:#173f44;box-shadow:0 24px 100px #173f4440}
  #hk-standalone-intro::backdrop{background:#123d4370;backdrop-filter:blur(6px)}
  #hk-standalone-intro .hk-export-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #d4dedb;font:16px system-ui,sans-serif}
  #hk-standalone-intro button{font:inherit;color:inherit;border:1px solid #d4dedb;border-radius:20px;padding:7px 16px;background:#edf3ef;cursor:pointer}
  #hk-standalone-intro iframe{display:block;border:0;width:100%;height:82vh;background:#fbfbf8}
</style>
<script id="hk-standalone-intro-data" type="application/json">__INTRO_DATA__</script>
<script id="hk-standalone-packaging">
(function () {
  'use strict';
  var dialog;
  function fileName(anchor) {
    try { return decodeURIComponent(anchor.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop(); }
    catch (_) { return ''; }
  }
  function openIntroduction() {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'hk-standalone-intro';
      dialog.setAttribute('aria-label', '会客厅产品介绍');
      var bar = document.createElement('div');
      bar.className = 'hk-export-bar';
      var title = document.createElement('span');
      title.textContent = '会客厅 · 产品介绍';
      var close = document.createElement('button');
      close.type = 'button';
      close.textContent = '返回应用 ×';
      close.addEventListener('click', function () { dialog.close(); });
      bar.append(title, close);
      var frame = document.createElement('iframe');
      frame.title = '会客厅产品介绍';
      frame.addEventListener('load', function () {
        frame.contentDocument.addEventListener('click', function (event) {
          var link = event.target.closest && event.target.closest('a[href]');
          if (!link || !/^会客厅(?:-Demo1\.0|Demo 3\.0)\.html$/.test(fileName(link))) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          dialog.close();
        }, true);
      });
      dialog.append(bar, frame);
      document.body.appendChild(dialog);
      var encoded = JSON.parse(document.getElementById('hk-standalone-intro-data').textContent);
      frame.srcdoc = new TextDecoder().decode(Uint8Array.from(atob(encoded), function (c) { return c.charCodeAt(0); }));
    }
    dialog.showModal();
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || fileName(link) !== '会客厅-Demo1.0-产品介绍.html') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openIntroduction();
  }, true);
}());
</script>
'''.replace("__INTRO_DATA__", json.dumps(base64.b64encode(intro).decode("ascii")))
assert main.count("</body>") == 1
result = main.replace("</body>", packaging + "\n</body>")
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(result, encoding="utf-8")
print(json.dumps({"file": str(destination), "bytes": destination.stat().st_size,
                  "introduction_embedded": True, "credentials": 0}, ensure_ascii=False))
