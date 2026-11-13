/* BuglonWiki â€” Ensiklopedi terbuka Indonesia Â· bawapi-katak */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const resultsEl = $('#result');
const suggestEl = $('#suggest');
const qInput = $('#q');
const qrModal = $('#qrModal');
const aboutModal = $('#aboutModal');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKI_PAGE = 'https://en.wikipedia.org/wiki/';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const OPENALEX = 'https://api.openalex.org/works';

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ========== Wikipedia search ========== */
async function fetchSuggestions(q) {
  const url = `${WIKI_API}?action=opensearch&search=${encodeURIComponent(q)}&limit=6&format=json&origin=*`;
  try { const r = await fetch(url); return (await r.json())[1] || []; } catch { return []; }
}

async function searchArticle(query) {
  resultsEl.innerHTML = '<div class="loading-msg">Mencari...</div>';
  const title = (await fetchSuggestions(query))[0];
  if (!title) { resultsEl.innerHTML = '<div class="loading-msg">Tidak ada artikel ditemukan.</div>'; return; }
  showArticle(title);
}

async function showArticle(title) {
  resultsEl.innerHTML = '<div class="fade-in"><div class="skel" style="width:70%"></div><div class="skel" style="width:90%"></div><div class="skel" style="width:60%"></div></div>';
  const safeTitle = encodeURIComponent(title.replace(/ /g, '_'));
  try {
    const sum = await (await fetch(WIKI_REST + safeTitle)).json();
    const openalexP = fetch(`${OPENALEX}?search=${encodeURIComponent(title)}&per-page=4&sort=cited_by_count:desc`).then(r => r.json()).catch(() => null);
    const commonsP = fetch(`${COMMONS}?action=query&generator=search&gsrsearch=${encodeURIComponent(title)}&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=200&format=json&origin=*`).then(r => r.json()).catch(() => null);
    const [alex, commons] = await Promise.all([openalexP, commonsP]);
    renderArticle(sum, alex, commons, title);
  } catch {
    resultsEl.innerHTML = '<div class="loading-msg">Gagal memuat. Coba pencarian lain.</div>';
  }
}

function renderArticle(sum, alex, commons, query) {
  const title = sum.title || query;
  const extract = (sum.extract || 'Belum ada ringkasan.').replace(/\n/g, '<br>');
  const img = sum.thumbnail ? sum.thumbnail.source : null;
  const wikiLink = `${WIKI_PAGE}${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const works = (alex && alex.results) ? alex.results : [];
  const images = commons && commons.query && commons.query.pages
    ? Object.values(commons.query.pages).map(p => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl).filter(Boolean)
    : [];

  resultsEl.innerHTML = `
    <div class="art-layout fade-in">
      <article class="art-card">
        <div class="art-img">${img ? `<img src="${img}" alt="${escapeHTML(title)}">` : '<div class="loading-msg">Tidak ada gambar</div>'}</div>
        <div class="art-body">
          <div class="kicker">Ringkasan Wikipedia</div>
          <h2>${escapeHTML(title)}</h2>
          <p>${extract}</p>
          <a class="read-btn" href="${wikiLink}" target="_blank" rel="noopener">Lanjutkan di Wikipedia â†’</a>
        </div>
      </article>
      <aside>
        <div class="side-panel">
          <h3>Makalah Ilmiah (OpenAlex)</h3>
          ${works.length ? works.map(w => `<div class="work-item"><b>${escapeHTML((w.title||'Karya').split('.')[0])}</b><small>${(w.authorships||[]).slice(0,2).map(a=>a.author&&a.author.display_name).filter(Boolean).join(', ')||'Tidak diketahui'}</small><a href="${w.doi?('https://doi.org/'+w.doi):(w.id||'#')}" target="_blank" rel="noopener">DOI â†’</a></div>`).join('') : '<div class="muted">Tidak ada karya terkait.</div>'}
        </div>
        ${images.length ? `<div class="side-panel"><h3>Gambar â€” Wikimedia Commons</h3><div class="gallery">${images.map(u => `<img loading="lazy" src="${u}" alt="${escapeHTML(title)}">`).join('')}</div></div>` : ''}
      </aside>
    </div>`;
}

/* ========== Beranda ========== */
function showBeranda() {
  resultsEl.innerHTML = `
    <div class="fade-in" style="max-width:760px;margin:40px auto;text-align:center">
      <p style="font-size:19px;color:var(--dim)">Ketik sesuatu di kolom pencarian di atas â€” lalu artikel akan masuk ke sini.</p>
      <p style="margin-top:18px" class="muted">Contoh: <em>"Dinosaur"</em> Â· <em>"Einstein"</em> Â· <em>"Pythagoras"</em> Â· <em>"Bunga Matahari"</em></p>
    </div>`;
}

/* ========== QR ========== */
function openQr() {
  const url = window.location.href;
  const canvas = $('#qrCanvas');
  canvas.width = 220; canvas.height = 220;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const ctx = canvas.getContext('2d');
  const cell = canvas.width / qr.getModuleCount();
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (let r = 0; r < qr.getModuleCount(); r++) {
    for (let c = 0; c < qr.getModuleCount(); c++) {
      if (qr.isDark(r, c)) ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
  qrModal.classList.remove('hidden');
}
$('#openQr').addEventListener('click', openQr);
$('#closeQr').addEventListener('click', () => qrModal.classList.add('hidden'));
$('#downloadQr').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = $('#qrCanvas').toDataURL('image/png');
  a.download = 'BuglonWIKI-QR.png';
  a.click();
});
qrModal.addEventListener('click', e => { if (e.target === qrModal) qrModal.classList.add('hidden'); });

$('#navBeranda').addEventListener('click', () => { $('#navBeranda').classList.add('active'); $('#navTentang').classList.remove('active'); showBeranda(); });
$('#navTentang').addEventListener('click', () => { $('#navTentang').classList.add('active'); $('#navBeranda').classList.remove('active'); aboutModal.classList.remove('hidden'); });
$('#closeAbout').addEventListener('click', () => aboutModal.classList.add('hidden'));
aboutModal.addEventListener('click', e => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { qrModal.classList.add('hidden'); aboutModal.classList.add('hidden'); suggestEl.classList.add('hidden'); } });

/* ========== suggest ========== */
let debounce;
qInput.addEventListener('input', () => {
  clearTimeout(debounce);
  const q = qInput.value.trim();
  if (q.length < 2) { suggestEl.classList.add('hidden'); return; }
  debounce = setTimeout(async () => {
    const items = await fetchSuggestions(q);
    if (!items.length) { suggestEl.classList.add('hidden'); return; }
    suggestEl.innerHTML = items.map(s => `<div class="sug-item">${escapeHTML(s)}</div>`).join('');
    suggestEl.classList.remove('hidden');
    $$('.sug-item', suggestEl).forEach(el => el.addEventListener('click', () => {
      qInput.value = el.textContent;
      suggestEl.classList.add('hidden');
      showArticle(el.textContent);
    }));
  }, 220);
});
document.addEventListener('click', e => { if (!suggestEl.contains(e.target) && e.target !== qInput) suggestEl.classList.add('hidden'); });
qInput.addEventListener('keydown', e => { if (e.key === 'Enter') { suggestEl.classList.add('hidden'); searchArticle(qInput.value); } });
$('#searchBtn').addEventListener('click', () => { suggestEl.classList.add('hidden'); searchArticle(qInput.value); });

showBeranda();

try { if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); } } catch (e) {}

