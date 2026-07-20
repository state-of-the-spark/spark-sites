import base64, os, re, subprocess, sys
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\grant\Downloads\Lakeland Fence Repair\brand-package\logos"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FONT_B64 = open(os.path.join(D, "font.b64")).read().strip()


def build_html(svg, name):
    """Inline the SVG in a page that carries Marcellus as an embedded webfont."""
    html = f"""<!doctype html><meta charset="utf-8">
<style>
@font-face {{ font-family:'Marcellus'; font-style:normal; font-weight:400;
  src:url(data:font/ttf;base64,{FONT_B64}) format('truetype'); }}
html,body {{ margin:0; padding:0; background:transparent; }}
svg {{ display:block; }}
</style>
{svg}"""
    p = os.path.join(D, name + ".html")
    open(p, "w", encoding="utf-8").write(html)
    return p


def shot(html_path, out_png, w, h):
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--default-background-color=00000000",
        f"--window-size={w},{h}",
        f"--screenshot={out_png}",
        "file:///" + html_path.replace("\\", "/"),
    ], check=True, capture_output=True)


# ---------- 1. Lockup: render roomy, then trim to the real alpha bounds ----------
svg = open(os.path.join(SRC, "lockup-light.svg"), encoding="utf-8").read()
svg = svg.replace('<?xml version="1.0"?>', "")
# widen the canvas so nothing clips; coordinates are untouched
svg = re.sub(r'viewBox="0 0 640 140"', 'viewBox="0 0 900 180" width="2700" height="540"', svg)
shot(build_html(svg, "lockup"), os.path.join(D, "lockup_raw.png"), 2700, 560)

im = Image.open(os.path.join(D, "lockup_raw.png")).convert("RGBA")
bbox = im.getbbox()
print("lockup raw:", im.size, "content bbox:", bbox)
im = im.crop(bbox)
# scale to a retina-friendly width
target_w = 1200
im = im.resize((target_w, max(1, round(im.height * target_w / im.width))), Image.LANCZOS)
im.save(os.path.join(D, "lfr-logo-lockup.png"))
print("lockup final:", im.size)

# ---------- 2. Favicon: pure geometry, fixed square ----------
fav = open(os.path.join(SRC, "favicon.svg"), encoding="utf-8").read()
fav = fav.replace('<?xml version="1.0"?>', "")
fav = fav.replace('viewBox="0 0 96 96"', 'viewBox="0 0 96 96" width="512" height="512"')
shot(build_html(fav, "favicon"), os.path.join(D, "favicon_raw.png"), 512, 512)
fi = Image.open(os.path.join(D, "favicon_raw.png")).convert("RGBA").crop((0, 0, 512, 512))
fi.save(os.path.join(D, "lfr-site-icon.png"))
print("favicon final:", fi.size)
