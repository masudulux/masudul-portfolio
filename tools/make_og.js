// Renders share images: assets/og.jpg (home), assets/og/<slug>.jpg (one per case study) and assets/og/a-<slug>.jpg (one per article).
// Usage: python3 -m http.server 8765 (in the repo root), then node tools/make_og.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), BASE = 'http://localhost:8765/';
const MARK = '<svg viewBox="0 0 64 64"><path d="M9 48V16l12.5 18L34 16M34 32h21M55 16v32" fill="none" stroke="#141613" stroke-width="6" stroke-linejoin="round"/><path d="M34 13v35" fill="none" stroke="#f25a1d" stroke-width="6"/></svg>';
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Geist:wght@400;500&family=Geist+Mono:wght@500&display=block">';
const CSS = `*{box-sizing:border-box;margin:0}html,body{width:1200px;height:630px}
body{background:#f5f6f4 radial-gradient(#c9ccc5 1.2px,transparent 1.3px) 0 0/22px 22px;color:#141613;font-family:Geist,sans-serif;position:relative;overflow:hidden}
.mono{font-family:'Geist Mono',monospace;font-weight:500;letter-spacing:.08em;text-transform:uppercase}
.brand{display:flex;align-items:center;gap:12px;font-family:'Bricolage Grotesque';font-weight:700;font-size:28px;letter-spacing:-.02em}
.brand svg{width:44px;height:44px}.brand i{font-style:normal;color:#f25a1d}
.pill{display:inline-flex;align-items:center;gap:12px;background:#141613;color:#f5f6f4;border-radius:999px;padding:12px 22px 12px 14px;font:500 22px 'Geist Mono',monospace}
.pill svg{width:30px;height:30px;background:#f5f6f4;border-radius:50%;padding:4px}`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const strip = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  for (const m of html.matchAll(/<article class="case" data-case="p-([\w-]+)"[\s\S]*?<\/article>/g)) {
    const slug = m[1], a = m[0];
    const title = strip(a.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]);
    const fact = k => strip((a.match(new RegExp('<dt class="label">' + k + '</dt><dd>([\\s\\S]*?)</dd>')) || [, ''])[1]);
    const cover = a.match(/<figure class="c-cover"><img src="([^"]+)"/)[1];
    const wins = [...a.matchAll(/<li><b>([^<]+)<\/b><span>([^<]+)<\/span><\/li>/g)].slice(0, 2);
    const tail = wins.length
      ? `<div class="wins">${wins.map(w => `<div><b>${w[1]}</b><span>${w[2]}</span></div>`).join('')}</div>`
      : `<p class="svc">${fact('Services')}</p>`;
    await p.setContent(`<!doctype html><html><head><base href="${BASE}">${FONTS}<style>${CSS}
      .l{position:absolute;left:72px;top:64px;bottom:60px;width:560px;display:flex;flex-direction:column}
      .tag{font-size:17px;color:#62675f;display:flex;align-items:center;gap:10px}.tag:before{content:'';width:10px;height:10px;border-radius:50%;background:#f25a1d}
      h1{font-family:'Bricolage Grotesque';font-weight:700;font-size:${title.length > 60 ? 46 : 54}px;line-height:1.04;letter-spacing:-.035em;margin-top:26px}
      .wins{display:flex;gap:36px;margin-top:auto}.wins b{display:block;font-family:'Bricolage Grotesque';font-weight:500;font-size:44px;letter-spacing:-.03em;color:#f25a1d;line-height:1}.wins span{display:block;margin-top:6px;font-size:17px;color:#62675f;max-width:230px}
      .svc{margin-top:auto;font-size:21px;color:#62675f}.foot{margin-top:34px}
      .shot{position:absolute;left:680px;top:72px;width:620px;height:486px;border-radius:16px 0 0 16px;overflow:hidden;border:1px solid #dfe2dc;border-right:0;background:#fff;box-shadow:0 30px 60px -30px rgba(20,22,19,.35)}
      .shot img{width:100%;height:100%;object-fit:cover;object-position:top left}
      .sel{position:absolute;left:670px;top:62px;width:600px;height:506px;border-right:0;border:2px solid #2f6bff;pointer-events:none}
      .sel i{position:absolute;width:12px;height:12px;background:#fff;border:2px solid #2f6bff}
      </style></head><body>
      <div class="l"><div class="tag mono">Case study · ${fact('Client')} · ${fact('Year')}</div><h1>${title}</h1>${tail}
      <div class="foot brand">${MARK}<span>masud<i>.</i>ux</span><span style="font:500 17px 'Geist Mono',monospace;color:#62675f;margin-left:auto">hellomasudul.com</span></div></div>
      <div class="shot"><img src="${cover}"></div>
      <div class="sel"><i style="left:-7px;top:-7px"></i><i style="left:-7px;bottom:-7px"></i></div>
      </body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, 'assets/og', slug + '.jpg'), type: 'jpeg', quality: 86 });
    console.log('assets/og/' + slug + '.jpg');
  }

  // Articles: type-only cards, the title sitting in a Figma selection on an empty canvas.
  for (const m of html.matchAll(/<article class="case post-v" data-case="a-([\w-]+)" data-src="([^"]+)"[\s\S]*?<\/article>/g)) {
    const slug = m[1], src = m[2], a = m[0];
    const title = strip(a.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]);
    const date = strip(a.match(/<time[^>]*>([\s\S]*?)<\/time>/)[1]);
    const read = strip((a.match(/Reading time<\/dt><dd>([\s\S]*?)<\/dd>/) || [, ''])[1]);
    await p.setContent(`<!doctype html><html><head><base href="${BASE}">${FONTS}<style>${CSS}
      .tag{position:absolute;left:72px;top:64px;font-size:17px;color:#62675f;display:flex;align-items:center;gap:10px}.tag:before{content:'';width:10px;height:10px;border-radius:50%;background:#f25a1d}
      .box{position:absolute;left:72px;top:150px;width:1000px;padding:22px 30px 26px;border:2px solid #2f6bff}
      .box i{position:absolute;width:12px;height:12px;background:#fff;border:2px solid #2f6bff}
      .box em{position:absolute;left:-2px;top:-34px;background:#2f6bff;color:#fff;font:500 15px 'Geist Mono',monospace;font-style:normal;padding:5px 9px;border-radius:4px 4px 4px 0}
      h1{font-family:'Bricolage Grotesque';font-weight:700;font-size:${title.length > 64 ? 58 : 66}px;line-height:1.02;letter-spacing:-.035em}
      .foot{position:absolute;left:72px;right:72px;bottom:60px}
      </style></head><body>
      <div class="tag mono">Article · ${src} · ${date}${read ? ' · ' + read + ' read' : ''}</div>
      <div class="box"><em>Article</em><h1>${title}</h1><i style="left:-7px;top:-7px"></i><i style="right:-7px;top:-7px"></i><i style="left:-7px;bottom:-7px"></i><i style="right:-7px;bottom:-7px"></i></div>
      <div class="foot brand">${MARK}<span>masud<i>.</i>ux</span><span style="font:500 17px 'Geist Mono',monospace;color:#62675f;margin-left:auto">hellomasudul.com</span></div>
      </body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, 'assets/og', 'a-' + slug + '.jpg'), type: 'jpeg', quality: 86 });
    console.log('assets/og/a-' + slug + '.jpg');
  }

  // Home card: keep the existing artwork and swap the old domain pill for one carrying the MH mark.
  await p.setContent(`<!doctype html><html><head><base href="${BASE}">${FONTS}<style>${CSS}
    body{background:url(tools/og-base.jpg) 0 0/1200px 630px}
    .cover{position:absolute;left:850px;top:495px;width:290px;height:75px;background:#f5f6f4 radial-gradient(#c9ccc5 1.2px,transparent 1.3px) 0 0/22px 22px}
    .pill{position:absolute;right:80px;top:505px}</style></head><body>
    <div class="cover"></div><div class="pill">${MARK}hellomasudul.com</div></body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(ROOT, 'assets/og.jpg'), type: 'jpeg', quality: 88 });
  console.log('assets/og.jpg');
  await b.close();
})();
