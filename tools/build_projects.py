#!/usr/bin/env python3
"""Build the project case-study pages (projects/<slug>.html).

The navbar, footer (contact form), tab bar, edge blur and WhatsApp widget are
copied from index.html on every run, so the inner pages stay identical to the
homepage. Project content lives in PROJECTS below. Run from the repo root:

    python3 tools/build_projects.py

Sections whose text is still empty (challenge / solution / results) are simply
left out of the page until they're filled in.
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCOPE_ALL = ("אפיון", "עיצוב", "פיתוח")
CASE_V = 3  # bump when case.css / case.js change (cache-buster)

PROJECTS = [
    {
        "slug": "shimony",
        "name": "משרד שמעוני",
        "field": "רואי חשבון",
        "year": "2024",
        "desc": "אתר מודרני למשרד רואי חשבון שמבסס מומחיות ומניע לקוחות פוטנציאליים ליצור קשר.",
        "url": "https://www.shimony.com/he/",
        "scope": None,          # None = not confirmed yet → the services row is hidden
        "video": "shimony",
        "challenge": "", "solution": "", "results": "",
        "quote": None,
    },
    {
        "slug": "tamar-baniel",
        "name": "תמר בניאל",
        "field": "עיצוב פנים ואדריכלות",
        "year": "",
        "desc": "אתר תדמית למעצבת פנים ואדריכלית: עיצוב גריד מדויק לכל אורך האתר, הצגת פרויקטים ואזור בלוג מרשים.",
        "url": "https://tamarbaniel.co.il/",
        "scope": None,
        "video": "tamar-baniel",
        "challenge": "", "solution": "", "results": "",
        "quote": {
            "text": "מיכאל קפלין מצטיין בדיוק מקסימלי להבנת הלקוח וליצירת תדמית מושלמת! נכנסתי עכשיו לאתר שהוא בנה עבורי לעסק, והכל נראה כל כך מושלם! מהמם!",
            "name": "תמר בניאל", "role": "אדריכלית ומעצבת פנים",
            "avatar": "images/testimonials/tamar-baniel.webp",
        },
    },
    {
        "slug": "ziskind",
        "name": "עו\"ד ישראל זיסקינד",
        "field": "משרד עורך דין",
        "year": "",
        "desc": "אתר תדמית יוקרתי למשרד עורך דין: חוויה נקייה ומכובדת שמאחדת תחומי עיסוק שונים ומבססת אמון מהרגע הראשון.",
        "url": "https://ziskind-law.co.il/",
        "scope": None,
        "video": "ziskind",
        "challenge": "", "solution": "", "results": "",
        "quote": {
            "text": "האתר שמיכאל יצר לי, מאוד מקצועי, משפיע על המבקרים בו ויוצר רושם של עסק רציני ומוביל. ואני ממליץ.",
            "name": "ישראל זיסקינד", "role": "עורך דין",
            "avatar": "images/testimonials/israel-ziskind.webp",
        },
    },
    {
        "slug": "lishkatoanim",
        "name": "לשכת הטוענים הרבניים",
        "field": "מוסדות מקצועיים",
        "year": "2024",
        "desc": "מיתוג מחדש ובניית נוכחות דיגיטלית חדשה לארגון מקצועי מוביל: אתר שמשדר סמכות, נגישות ואמינות.",
        "url": "https://www.lishkatoanim.co.il/",
        "scope": SCOPE_ALL,
        "video": "lishkatoanim",
        "challenge": "", "solution": "", "results": "",
        "quote": {
            "text": "העבודה עם מיכאל הייתה פנטסטית, המקצועיות והשירות היו מדהימים! החל משלב האיפיון של האתר והעיצוב, מיותר להכביר במילים וכל גולש/ת יוכל לראות בשנייה את האיכות חסרת הפשרות. נקודה נוספת שמאוד ראויה לציון היא השירות האדיב והזמין שמיכאל נתן לנו לאורך כל הדרך! ממש לא מובן מאליו.",
            "name": "יוסי יאקאב", "role": "חבר הנהלת לשכת הטוענים הרבניים",
            "avatar": "images/testimonials/yossi-yakab.webp",
        },
    },
    {
        "slug": "silyment",
        "name": "סילימנט",
        "field": "גבס ודקורציה",
        "year": "",
        "desc": "אתר תדמית לחברת גבס ודקורציה, עם מערכת הדמיה שבה הלקוח מרכיב את התקרה שלו שלב אחר שלב ורואה את התוצאה בלייב.",
        "url": None,            # no live-site button for now (Michael)
        "scope": None,
        "video": "element",
        "challenge": "", "solution": "", "results": "",
        "quote": None,
    },
]

E = lambda s: html.escape(s, quote=False)
A = lambda s: html.escape(s, quote=True)


def domain(url):
    return re.sub(r"^https?://(www\.)?", "", url).split("/")[0]


def section(p, key, label, title):
    text = p[key].strip()
    if not text:
        return ""
    paras = "".join(f"<p>{E(t.strip())}</p>" for t in text.split("\n\n") if t.strip())
    return f'''
      <div class="case-block">
        <p class="section-label">{label}</p>
        <h2 class="case-block-title">{title}</h2>
        <div class="case-block-text">{paras}</div>
      </div>'''


def page(p, i, chunks):
    n = len(PROJECTS)
    nxt = PROJECTS[(i + 1) % n]
    others = [q for q in PROJECTS if q is not p]
    meta = []
    if p["scope"]:
        chips = "".join(f'<li class="case-chip">{E(s)}</li>' for s in p["scope"])
        meta.append(f'<div class="case-meta-item"><span>מה עשיתי</span><ul class="case-chips">{chips}</ul></div>')
    meta.append(f'<div class="case-meta-item"><span>תחום</span><b>{E(p["field"])}</b></div>')
    if p["year"]:
        meta.append(f'<div class="case-meta-item"><span>שנה</span><b>{E(p["year"])}</b></div>')
    live = ""
    if p["url"]:
        live = (f'<a class="btn btn-primary case-live" href="{A(p["url"])}" target="_blank" rel="noopener">'
                f'לאתר החי <span aria-hidden="true">↗</span></a>')
    url_label = domain(p["url"]) if p["url"] else ""
    story = (section(p, "challenge", "האתגר", "מה היה צריך לפצח")
             + section(p, "solution", "הפיצוח", "איך פתרנו את זה")
             + section(p, "results", "התוצאה", "מה זה הביא"))
    story_html = f'''
    <section class="case-story section">
      <div class="container">{story}
      </div>
    </section>''' if story else ""
    quote_html = ""
    if p["quote"]:
        q = p["quote"]
        quote_html = f'''
    <section class="case-quote section tone-light">
      <div class="container">
        <figure>
          <blockquote>״{E(q["text"])}״</blockquote>
          <figcaption>
            <img src="{A(q["avatar"])}" alt="" width="56" height="56" loading="lazy" />
            <span><b>{E(q["name"])}</b><small>{E(q["role"])}</small></span>
          </figcaption>
        </figure>
      </div>
    </section>'''
    others_html = "".join(
        f'<li><a href="projects/{q["slug"]}.html"><img src="images/portfolio/{q["video"]}-poster.webp" alt="" '
        f'width="1280" height="690" loading="lazy" decoding="async" /><b>{E(q["name"])}</b>'
        f'<span>{E(q["field"])}</span></a></li>' for q in others)

    title = f'{p["name"]} | קייס סטדי | מיכאל קאפלין'
    head = chunks["head"]
    head = re.sub(r"<title>.*?</title>", f"<title>{E(title)}</title>", head)
    head = re.sub(r'<meta name="description" content="[^"]*" />',
                  f'<meta name="description" content="{A(p["desc"])}" />', head)
    # resolve every relative URL (assets, homepage anchors) from the site root
    head = head.replace("<head>", '<head>\n  <base href="../" />', 1)
    head = head.replace("</head>", f'  <link rel="stylesheet" href="case.css?v={chunks["case_v"]}" />\n</head>')
    self_href = f'projects/{p["slug"]}.html'
    # in-page links on this page (contact lives in this page's own footer)
    nav = chunks["nav"].replace('href="#contact"', f'href="{self_href}#contact"')
    tail = chunks["tail"].replace('href="#contact"', f'href="{self_href}#contact"')
    tail = tail.replace("</body>", f'  <script src="case.js?v={chunks["case_v"]}"></script>\n</body>', 1)

    return f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
{head}
<body class="case-page">
{nav}
  <main class="page">
  <div id="dot-field-bg"></div>
  <div class="page-tone" aria-hidden="true"></div>

    <section class="case-hero section" id="hero">
      <div class="container">
        <a class="case-back" href="#portfolio"><span aria-hidden="true">→</span> כל הפרויקטים</a>
        <p class="section-label">{E(p["field"])}</p>
        <h1 class="section-title case-title">{E(p["name"])}</h1>
        <p class="case-lead">{E(p["desc"])}</p>
        <div class="case-meta">{"".join(meta)}{live}</div>
      </div>
    </section>

    <section class="case-screen section">
      <div class="container">
        <div class="case-window">
          <div class="case-window-bar" aria-hidden="true"><i></i><i></i><i></i>{f'<span>{E(url_label)}</span>' if url_label else ''}</div>
          <video class="case-video" muted loop playsinline preload="metadata"
                 poster="images/portfolio/{p["video"]}-poster.webp" data-autoplay>
            <source src="images/portfolio/{p["video"]}.mp4" type="video/mp4" />
            <source src="images/portfolio/{p["video"]}.webm" type="video/webm" />
          </video>
        </div>
      </div>
    </section>
{story_html}{quote_html}

    <section class="case-next section">
      <div class="container">
        <a class="case-next-link" href="projects/{nxt["slug"]}.html">
          <span class="section-label">הפרויקט הבא</span>
          <span class="case-next-name">{E(nxt["name"])}</span>
          <img src="images/portfolio/{nxt["video"]}-poster.webp" alt="" width="1280" height="690" loading="lazy" decoding="async" />
        </a>
        <p class="case-others-label">עוד פרויקטים</p>
        <ul class="case-others">{others_html}</ul>
      </div>
    </section>

    <div id="contact" class="page-end"></div>
  </main>
{tail}
'''


def main():
    src = (ROOT / "index.html").read_text(encoding="utf-8")
    head = src[src.index("<head>"):src.index("</head>") + len("</head>")]
    nav = src[src.index("  <!-- NAVBAR -->"):src.index("  <!-- PAGE")].rstrip() + "\n"
    tail = src[src.index("  <!-- soft shadow under the page"):src.index("</html>") + len("</html>")]
    css_v = CASE_V
    chunks = {"head": head, "nav": nav, "tail": tail, "case_v": css_v}
    for i, p in enumerate(PROJECTS):
        out = ROOT / "projects" / f'{p["slug"]}.html'
        out.write_text(page(p, i, chunks), encoding="utf-8")
        print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
