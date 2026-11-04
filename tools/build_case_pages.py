#!/usr/bin/env python3
"""Generate work/<slug>/index.html for every case study in index.html.

Each page is a copy of the one-page site with its own title, description,
canonical URL and share image, so Google indexes every case study and a
shared link previews that project. Run after editing index.html:

    python3 tools/build_case_pages.py
"""
import html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://hellomasudul.com'
src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()


def meta(doc, attr, key, value):
    pat = r'(<meta %s="%s" content=")[^"]*(")' % (attr, re.escape(key))
    return re.sub(pat, lambda m: m.group(1) + value + m.group(2), doc, count=1)


for m in re.finditer(r'<article class="case" data-case="p-([\w-]+)".*?</article>', src, re.S):
    slug, art = m.group(1), m.group(0)
    h1 = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<h1[^>]*>(.*?)</h1>', art, re.S).group(1))).strip()
    lede = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<p class="c-lede">(.*?)</p>', art, re.S).group(1))).strip()
    url = '%s/work/%s/' % (SITE, slug)
    img = '%s/assets/og/%s.jpg' % (SITE, slug)
    title = '%s · Masudul Haque' % h1
    e = lambda s: html.escape(s, quote=True)

    doc = re.sub(r'<title>.*?</title>', '<title>%s</title>' % e(title), src, count=1)
    doc = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % url, doc, count=1)
    doc = meta(doc, 'name', 'description', e(lede))
    doc = meta(doc, 'property', 'og:type', 'article')
    doc = meta(doc, 'property', 'og:url', url)
    for k in ('og:title', 'twitter:title'):
        doc = meta(doc, 'property' if k.startswith('og') else 'name', k, e(h1))
    for k in ('og:description', 'twitter:description'):
        doc = meta(doc, 'property' if k.startswith('og') else 'name', k, e(lede))
    for k in ('og:image', 'og:image:secure_url', 'twitter:image'):
        doc = meta(doc, 'property' if k.startswith('og') else 'name', k, img)
    for k in ('og:image:alt', 'twitter:image:alt'):
        doc = meta(doc, 'property' if k.startswith('og') else 'name', k, e('%s, a case study by Masudul Haque' % h1))
    # Open this case before first paint so the home page never flashes.
    doc = doc.replace('<body', '<body class="on-case"', 1) if '<body class=' not in doc else doc.replace('<body class="', '<body class="on-case ', 1)
    doc = doc.replace('<article class="case" data-case="p-%s" hidden' % slug, '<article class="case" data-case="p-%s"' % slug, 1)

    out = os.path.join(ROOT, 'work', slug)
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(doc)
    print('work/%s/' % slug)
