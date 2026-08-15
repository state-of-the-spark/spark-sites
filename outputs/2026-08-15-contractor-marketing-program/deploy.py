import re, json, base64, urllib.request, sys, os

BASE = "https://sparkmysite.com/wp-json/wp/v2"
USER = "Grarissa"
APP = "iaoG SkRx ZOe7 hALl u5ar PXaS"
AUTH = base64.b64encode(f"{USER}:{APP}".encode()).decode()

DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(DIR, "page.html"), encoding="utf-8") as f:
    html = f.read()

# defeat wpautop: strip inter-tag whitespace, collapse newlines/indents
html = re.sub(r">\s+<", "><", html)
html = html.replace("\n", " ")
html = re.sub(r"[ \t]{2,}", " ", html)

def api(method, path, payload=None):
    url = f"{BASE}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Basic {AUTH}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as r:
        return json.load(r)

# create or update by slug
SLUG = "contractor-program-preview"
existing = api("GET", f"/pages?slug={SLUG}&status=publish,draft,private&_fields=id")
payload = {
    "title": "Contractor Marketing Program (Preview)",
    "slug": SLUG,
    "status": "publish",
    "content": html,
    "template": "page-template-blank.php",
}
if existing:
    pid = existing[0]["id"]
    res = api("POST", f"/pages/{pid}", payload)
    print("UPDATED")
else:
    res = api("POST", "/pages", payload)
    print("CREATED")
print("ID:", res["id"])
print("LINK:", res["link"])
print("STATUS:", res["status"])
print("TEMPLATE:", res.get("template"))
