#!/usr/bin/env python3
"""Generate work/<slug>/index.html for every case study and articles/<slug>/index.html
for every article in index.html.

Each page is a copy of the one-page site with its own title, description,
canonical URL and share image, so Google indexes every case study and a
shared link previews that project. Articles first published elsewhere keep
their canonical URL on the original platform (the "Read on ..." link), so
search engines credit the original and don't see the copy as duplicate.
Run after editing index.html:

    python3 tools/build_case_pages.py
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://hellomasudul.com'
src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()


def meta(doc, attr, key, value):
    pat = r'(<meta %s="%s" content=")[^"]*(")' % (attr, re.escape(key))
    return re.sub(pat, lambda m: m.group(1) + value + m.group(2), doc, count=1)


for m in re.finditer(r'<article class="case( post-v)?" data-case="([pa])-([\w-]+)".*?</article>', src, re.S):
    post, slug, art = m.group(2) == 'a', m.group(3), m.group(0)
    h1 = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<h1[^>]*>(.*?)</h1>', art, re.S).group(1))).strip()
    lede = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<p class="c-lede">(.*?)</p>', art, re.S).group(1))).strip()
    url = '%s/%s/%s/' % (SITE, 'articles' if post else 'work', slug)
    img = '%s/assets/og/%s%s.jpg' % (SITE, 'a-' if post else '', slug)
    # An article's canonical is its original post (the first "Read on ..." link); a case study's is its own page.
    src_url = re.search(r'<a class="a-src" href="([^"]+)"', art).group(1) if post else None
    canonical = src_url or url
    title = '%s · Masudul Haque' % h1
    e = lambda s: html.escape(s, quote=True)

    doc = re.sub(r'<title>.*?</title>', '<title>%s</title>' % e(title), src, count=1)
    doc = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % canonical, doc, count=1)
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
        doc = meta(doc, 'property' if k.startswith('og') else 'name', k, e('%s, %s by Masudul Haque' % (h1, 'an article' if post else 'a case study')))
    if post:
        date = re.search(r'<time datetime="([\d-]+)"', art).group(1)
        ld = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': h1, 'description': lede,
              'datePublished': date, 'url': url, 'mainEntityOfPage': src_url, 'image': img, 'inLanguage': 'en',
              'author': {'@id': SITE + '/#person', '@type': 'Person', 'name': 'Masudul Haque', 'url': SITE + '/'}}
        doc = doc.replace('</head>', '<meta property="article:published_time" content="%s">\n<script type="application/ld+json">%s</script>\n</head>'
                          % (date, json.dumps(ld, ensure_ascii=False).replace('</', '<\\/')), 1)
    # Open this case before first paint so the home page never flashes.
    doc = doc.replace('<body', '<body class="on-case"', 1) if '<body class=' not in doc else doc.replace('<body class="', '<body class="on-case ', 1)
    tag = '<article class="case%s" data-case="%s-%s"' % (m.group(1) or '', 'a' if post else 'p', slug)
    doc = doc.replace(tag + ' hidden', tag, 1)

    out = os.path.join(ROOT, 'articles' if post else 'work', slug)
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(doc)
    print('%s/%s/' % ('articles' if post else 'work', slug))
