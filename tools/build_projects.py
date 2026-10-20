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
CASE_V = 7  # bump when case.css / case.js change (cache-buster)

PROJECTS = [
    {
        "slug": "shimony",
        "name": "משרד שמעוני",
        "field": "משרד רואי חשבון",
        "desc": "אתר מודרני למשרד רואי חשבון שמבסס מומחיות ומניע לקוחות פוטנציאליים ליצור קשר.",
        "url": "https://www.shimony.com/he/",
        "scope": SCOPE_ALL,
        "video": "shimony",
        "challenge": 'למשרד היה צורך באתר תדמית מודרני בקו עיצוב שתואם את השפה של הענף, ובצורך מיוחד להצגת כל סל שירותיו המקצועיים.',
        "solution": 'לאחר אפיון מעמיק יצרתי אתר דינאמי, עם אזור ייעודי לכל שירותי המשרד, ובנוסף בלוג תוכן בשתי שפות, שמציג את המשרד ואת שירותיו בליגה של הגדולים.',
        "results": "",
        "quote": None,
    },
    {
        "slug": "tamar-baniel",
        "name": "תמר בניאל",
        "field": "סטודיו לעיצוב פנים ואדריכלות",
        "desc": "אתר תדמית למעצבת פנים ואדריכלית: עיצוב גריד מדויק לכל אורך האתר, הצגת פרויקטים ואזור בלוג מרשים.",
        "url": "https://tamarbaniel.co.il/",
        "scope": SCOPE_ALL,
        "video": "tamar-baniel",
        "challenge": 'תמר מתמחה בעיצוב פנים ואדריכלות מספר שנים וכעת רוצה להציג נוכחות דיגיטלית, לשווק את הפרויקטים דרך האתר כדי להגיע לקהלי יעד איכותיים נוספים.',
        "solution": 'הקו העיצובי שמלווה את האתר, מדגיש את הדיוק האופטימלי לצד הפונקציונליות בפרויקטים של תמר. ובזכות אזור הבלוג והפרויקטים, תמר פוגשת קהלי לקוחות חדשים שכבר מתחברים למותג.',
        "results": "",
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
        "desc": "אתר תדמית יוקרתי למשרד עורך דין: חוויה נקייה ומכובדת שמאחדת תחומי עיסוק שונים ומבססת אמון מהרגע הראשון.",
        "url": "https://ziskind-law.co.il/",
        "scope": SCOPE_ALL,
        "video": "ziskind",
        "challenge": 'עו״ד ישראל זיסקינד ביקש לייצר לעצמו נוכחות דיגיטלית שתשקף את הדמות המקצועית והמרשימה שבנה לאורך השנים. האתגר היה לאחד תחומי עיסוק משפטיים מגוונים, פלילי, אזרחי ומשפחה, לכדי אתר אחד שמסביר את ערכו בצורה ברורה, מבלי לוותר על תחושת אמינות, יוקרה ונגישות ללקוח הפוטנציאלי.',
        "solution": 'בפיתוח האתר התמקדתי בחוויית משתמש נקייה ומכובדת, עם שפה עיצובית אחידה וכתיבה שמדגישה את היתרון הייחודי של ישראל. שילבתי דגשים על הצלחותיו ועל כתבות מן העיתונות שממחישות את המוניטין והנוכחות הציבורית שלו, באופן שמעביר את המקצועיות והערכים המרכזיים. התוצאה היא אתר תדמית יוקרתי שמעניק לישראל כלי עוצמתי לביסוס אמון ראשוני מול לקוחות חדשים.',
        "results": "",
        "quote": {
            "text": "האתר שמיכאל יצר לי, מאוד מקצועי, משפיע על המבקרים בו ויוצר רושם של עסק רציני ומוביל. ואני ממליץ.",
            "name": "ישראל זיסקינד", "role": "עורך דין",
            "avatar": "images/testimonials/israel-ziskind.webp",
        },
    },
    {
        "slug": "lishkatoanim",
        "name": "לשכת הטוענים הרבניים",
        "field": "הכתובת למתדיינים ולמייצגים בבתי הדין",
        "desc": "מיתוג מחדש ובניית נוכחות דיגיטלית חדשה לארגון מקצועי מוביל: אתר שמשדר סמכות, נגישות ואמינות.",
        "url": "https://www.lishkatoanim.co.il/",
        "scope": SCOPE_ALL,
        "video": "lishkatoanim",
        "challenge": 'ללשכה היה צורך לשפר את התדמית הדיגיטלית שלה, על ידי יצירת פלטפורמה דיגיטלית שתשדר מקצועיות ותסייע לחברי הלשכה להגיע לקהל היעד שלהם בצורה ברורה ונגישה.\n\nהאתגר המרכזי היה לאפשר למשתמשים למצוא במהירות את הטוען או הטוענת המתאימים לפי תחומי התמחות ואזורים גיאוגרפיים, תוך שמירה על עיצוב שמייצג את הערכים המסורתיים של המקצוע לצד נוחות שימוש מודרנית.\n\nבנוסף, היה צורך לבנות בלוג מקצועי שיעניק ערך למבקרים באתר, פרסום אירועי הלשכה הסדנאות והכנסים.',
        "solution": 'כמאפיין, מעצב ומפתח האתר, התחלתי במיפוי מדויק של צרכי הלשכה והמשתמשים. יצרתי עיצוב שמשלב בין מסורתיות למודרניות, ומערכת חיפוש מתקדמת שמאפשרת גישה מהירה לכל טוען רבני בהתאם לפרמטרים החשובים למשתמשים.\n\nהפרופילים האישיים שהוספתי לכל טוען כוללים מידע מפורט ומעודכן, והבלוג המקצועי מספק פלטפורמה לחברי הלשכה לשתף ידע ולחזק את מעמדם הדיגיטלי.\n\nכך הצלחתי לשלב את היתרון של הלשכה והמיוצג בחוויית משתמש אחת ידידותית עם מיתוג מדויק ותוך שמירה על ערכי המקצוע והעמדתם בקדמת הבמה.',
        "results": "",
        "quote": {
            "text": "העבודה עם מיכאל הייתה פנטסטית, המקצועיות והשירות היו מדהימים! החל משלב האיפיון של האתר והעיצוב, מיותר להכביר במילים וכל גולש/ת יוכל לראות בשנייה את האיכות חסרת הפשרות. נקודה נוספת שמאוד ראויה לציון היא השירות האדיב והזמין שמיכאל נתן לנו לאורך כל הדרך! ממש לא מובן מאליו.",
            "name": "יוסי יאקאב", "role": "חבר הנהלת לשכת הטוענים הרבניים",
            "avatar": "images/testimonials/yossi-yakab.webp",
        },
    },
    {
        "slug": "silyment",
        "name": "סילימנט",
        "field": "חברת גבס ודקורציה",
        "desc": "אתר תדמית לחברת גבס ודקורציה, עם מערכת הדמיה שבה הלקוח מרכיב את התקרה שלו שלב אחר שלב ורואה את התוצאה בלייב.",
        "url": None,            # no live-site button for now (Michael)
        "scope": ("פיתוח",),
        "video": "element",
        "challenge": 'תהליך המכירה של המוצר נתקל בקושי אמיתי. המוצר מורכב משלושה רכיבים שנבחרים בנפרד, בסיס, תאורה ומשרביה, ועם עשרות דגמים בכל קטגוריה נוצר מספר עצום של שילובים שהלקוח לא הצליח לדמיין ולא יכול היה לבחון זה מול זה. התוצאה היתה בחירה מופשטת, מחיר לא שקוף ודרך ארוכה ומסורבלת מהתעניינות להזמנה.',
        "solution": 'יצרתי לעסק אתר תדמית מרשים שמעניק לעסק נוכחות דיגיטלית שממצבת אותו כמותג רציני בתחום. בתוך האתר בניתי גם מערכת הדמיה ויזואלית שמאפשרת ללקוח להרכיב את התקרה שלו שלב אחר שלב ולראות את התוצאה בלייב.\n\nאת חוויית המשתמש והאפיון של הממשק עיצבתי כך שהתהליך יהיה אינטואיטיבי ובחוויית גלישה חלקה ונקייה. הוספתי אופציית השוואה שמאפשרת לשמור כמה שילובים זה לצד זה ולבחון אותם במבט אחד, וכך התעניינות הופכת לרכישה ולהגברת מכירות.',
        "results": "",
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
    paras = [t.strip() for t in text.split("\n\n") if t.strip()]
    # the opening sentence becomes the large lead (word-by-word scroll reveal);
    # everything after it stays body text
    first, _, rest = paras[0].partition(". ")
    lead = first if first.endswith(".") or not rest else first + "."
    body = ([rest] if rest else []) + paras[1:]
    words = " ".join(f'<span class="cw">{E(w)}</span>' for w in lead.split())
    body_html = "".join(f"<p>{E(t)}</p>" for t in body)
    return f'''
      <div class="case-block case-block--{key}">
        <div class="case-block-side">
          <span class="case-block-word">{label}</span>
          <span class="case-block-q">{title}</span>
        </div>
        <div class="case-block-body">
          <p class="case-block-lead">{words}</p>{f'<div class="case-block-text">{body_html}</div>' if body_html else ''}
        </div>
      </div>'''


def page(p, i, chunks):
    n = len(PROJECTS)
    nxt = PROJECTS[(i + 1) % n]
    others = [q for q in PROJECTS if q is not p and q is not nxt]
    meta = []
    if p["scope"]:
        chips = "".join(f'<li class="case-chip">{E(s)}</li>' for s in p["scope"])
        meta.append(f'<div class="case-meta-item"><span>מה עשיתי</span><ul class="case-chips">{chips}</ul></div>')
    meta.append(f'<div class="case-meta-item"><span>הלקוח</span><b>{E(p["field"])}</b></div>')
    live = ""
    if p["url"]:
        live = (f'<a class="btn btn-primary case-live" href="{A(p["url"])}" target="_blank" rel="noopener">'
                f'לאתר החי <span aria-hidden="true">↗</span></a>')
    url_label = domain(p["url"]) if p["url"] else ""
    story = (section(p, "challenge", "האתגר", "מה היה צריך לפצח")
             + section(p, "solution", "הפיצוח", "איך פיצחתי את זה")
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
        f'<li><a class="case-row" href="projects/{q["slug"]}.html" data-poster="images/portfolio/{q["video"]}-poster.webp">'
        f'<img class="case-row-bg" src="images/portfolio/{q["video"]}-poster.webp" alt="" width="1280" height="690" loading="lazy" decoding="async" />'
        f'<span class="case-row-name">{E(q["name"])}</span><span class="case-row-field">{E(q["field"])}</span>'
        f'<span class="case-row-arrow" aria-hidden="true">←</span></a></li>' for q in others)

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
        <p class="section-label">הפרויקט הבא</p>
        <a class="case-next-link" href="projects/{nxt["slug"]}.html" data-poster="images/portfolio/{nxt["video"]}-poster.webp">
          <img class="case-next-thumb" src="images/portfolio/{nxt["video"]}-poster.webp" alt="" width="1280" height="690" loading="lazy" decoding="async" />
          <span class="case-next-text"><span class="case-next-name">{E(nxt["name"])}</span><span class="case-row-field">{E(nxt["field"])}</span></span>
          <span class="case-next-arrow" aria-hidden="true">←</span>
        </a>
        <p class="case-others-label">עוד פרויקטים</p>
        <ul class="case-others">{others_html}</ul>
      </div>
      <!-- floats beside the cursor over the links above (desktop) -->
      <div class="case-float" aria-hidden="true"><img alt="" width="1280" height="690" decoding="async" /></div>
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
