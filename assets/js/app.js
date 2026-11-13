/* BuglonWiki v2 — minimal wiki/kamus free · bawapi-katak */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const resultsEl = $('#result');
const suggestEl = $('#suggest');
const qInput = $('#q');
const qrModal = $('#qrModal');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKI_PAGE = 'https://en.wikipedia.org/wiki/';
const GUTENDEX = 'https://gutendex.com/books?search=';
const OPENALEX = 'https://api.openalex.org/works?search=';
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({"&":'&amp;',"<":'&lt;',">":'&gt;',"\"":'&quot;',"'":'&#39;'}[c]));
const debounce = ms => { let t; return fn => (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

let currentView = 'artikel';

function showSkeleton(n){ resultsEl.innerHTML = Array.from({length:n||4},()=>'<div class="skel"></div>').join(''); }

/* ========== Artikel (Wikipedia) ========== */
async function renderArtikel(q) {
  if (!q) { showBeranda(); return; }
  resultsEl.innerHTML = '<div class="loading-msg">Mencari artikel...</div>';
  try {
    const sugRes = await fetch(`${WIKI_API}?action=opensearch&search=${encodeURIComponent(q)}&limit=8&format=json&origin=*`).then(r => r.json());
    const titles = sugRes[1] || [];
    parallelSummaries(titles);
  } catch { resultsEl.innerHTML = '<div class="loading-msg">Pencarian gagal. Internet kamu?</div>'; }
}

async function parallelSummaries(titles) {
  const summaries = await Promise.all(titles.map(async t => {
    try { const r = await fetch(`${WIKI_REST}${encodeURIComponent(t.replace(/ /g,'_'))}`); return r.json(); } catch { return null; }
  }));
  const arts = summaries.filter(Boolean);
  if (!arts.length) { resultsEl.innerHTML = '<div class="loading-msg">Tidak ada artikel.</div>'; return; }
  resultsEl.innerHTML = '<div class="section-head">Artikel — '+escapeHTML(currentView === 'artikel' ? 'Wikipedia' : '')+'</div>' +
    arts.map(a => {
      const img = a.thumbnail ? a.thumbnail.source : null;
      return `<div class="list-card">
        <img src="${img || ''}" alt="${escapeHTML(a.title || '')}" onerror="this.style.visibility='hidden'">
        <div>
          <h3>${escapeHTML(a.title || '')}</h3>
          <small>${escapeHTML(a.extract || '').slice(0,160)}${(a.extract||'').length > 160 ? '…' : ''}</small>
          <a href="${WIKI_PAGE}${encodeURIComponent((a.title||'').replace(/ /g,'_'))}" target="_blank" rel="noopener">Baca selengkapnya →</a>
        </div>
      </div>`;
    }).join('');
}

/* ========== Buku (Gutenberg) ========== */
async function renderBuku(q) {
  if (!q) { resultsEl.innerHTML = '<div class="loading-msg">Cari judul buku / pengarang...</div>'; return; }
  showSkeleton(6);
  try {
    const data = await fetch(`${GUTENDEX}${encodeURIComponent(q)}`).then(r => r.json());
    const books = data.results || [];
    if (!books.length) { resultsEl.innerHTML = '<div class="loading-msg">Tidak ada buku ditemukan.</div>'; return; }
    resultsEl.innerHTML = '<div class="section-head">Buku Gratis — Project Gutenberg</div>' +
      books.slice(0, 24).map(b => {
        const img = (b.formats && b.formats['image/jpeg']) ? b.formats['image/jpeg'] : '';
        const html = (b.formats && b.formats['text/html']) ? b.formats['text/html'] : null;
        const author = (b.authors && b.authors[0] && b.authors[0].name) ? b.authors[0].name : 'Tidak diketahui';
        return `<div class="list-card">
          <img src="${img}" alt="${escapeHTML(b.title || '')}" onerror="this.style.visibility='hidden'">
          <div>
            <h3>${escapeHTML(b.title || '')}</h3>
            <small>${escapeHTML(author)}</small>
            ${html ? `<a href="${html}" target="_blank" rel="noopener">Baca (web)</a>` : '<small>Teks belum tersedia</small>'}
          </div>
        </div>`;
      }).join('');
  } catch { resultsEl.innerHTML = '<div class="loading-msg">Gagal memuat buku. Cek internet.</div>'; }
}

/* ========== Jurnal (OpenAlex) ========== */
async function renderJurnal(q) {
  if (!q) { resultsEl.innerHTML = '<div class="loading-msg">Cari jurnal / paper...</div>'; return; }
  showSkeleton(6);
  try {
    const data = await fetch(`${OPENALEX}${encodeURIComponent(q)}&per_page=20&sort=cited_by_count:desc`).then(r => r.json());
    const works = data.results || [];
    if (!works.length) { resultsEl.innerHTML = '<div class="loading-msg">Tidak ada jurnal.</div>'; return; }
    resultsEl.innerHTML = '<div class="section-head">Jurnal — OpenAlex (diurutkan paling disitasi)</div>' +
      works.map(w => {
        const auth = (w.authorships||[]).slice(0,3).map(a => a.author?.display_name).filter(Boolean).join(', ');
        const year = (w.publication_year || '') + (w.journal?.display_name ? ' · ' + w.journal.display_name : '');
        const doi = w.doi ? (w.doi.startsWith('http') ? w.doi : 'https://doi.org/' + w.doi) : null;
        return `<div class="list-card" style="border-style:dashed">
          <div style="width:58px;height:84px;background:var(--panel2);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--green-d);font-size:22px">§</div>
          <div>
            <h3>${escapeHTML(w.title || 'Tanpa judul')}</h3>
            <small>${escapeHTML(auth)}</small>
            <small>${escapeHTML(year)}</small>
            ${doi ? `<a href="${doi}" target="_blank" rel="noopener">DOI →</a>` : ''}
          </div>
        </div>`;
      }).join('');
  } catch { resultsEl.innerHTML = '<div class="loading-msg">Gagal memuat jurnal. Cek internet.</div>'; }
}

function showBeranda() {
  resultsEl.innerHTML = `
    <h2 style="font-size:22px;margin:4px 0 6px">Selamat datang.</h2>
    <p style="color:var(--dim);font-size:14px;line-height:1.7">BuglonWiki adalah ensiklopedia <strong>gratis</strong>: artikel Wikipedia, buku dari <em>Project Gutenberg</em>, dan jurnal dari <em>OpenAlex</em> — semua terbuka untuk umum.</p>
    <p style="margin-top:14px;color:var(--dim);font-size:13px">Ketik di kotak pencarian di atas untuk mulai. Pilih tab <strong>Artikel / Buku / Jurnal</strong> di sidebar.</p>
    <div class="section-head" style="margin-top:20px">Cara pakai</div>
    <p style="font-size:13px;line-height:2"><strong>Contoh artikel:</strong> Dinosaur · Python · Matahari · Melodrama Arg. Timur<br>
    <strong>Contoh buku:</strong> Sherlock Holmes · Jane Austen · Sejarah Nusantara<br>
    <strong>Contoh jurnal:</strong> machine learning · climate change · laktosa 🥛→ pilih <strong>Grain-free</strong> writer</p>`;
}

function showTentang() {
  resultsEl.innerHTML = `
    <h2 class="section-head" style="border-bottom:1px solid var(--line);padding-bottom:10px">Tentang BuglonWiki</h2>
    <div class="list-card" style="border-bottom:none"><div>
      <h3>Platform</h3>
      <small>Reviewer Chrome · Library · OpenAlex.</small>
      <p style="margin-top:8px;font-size:13px;line-height:1.7">Luasar dari Gutenberg membaca (akan update) plus CC BY-SA untuk artikel Wikipedia. Jurnal bersumber OpenAlex (open access). Projek ini dibuat oleh <strong>Rafie Akila (bawapi-katak)</strong>.</p>
    </div></div>`;
}

function setView(view) {
  currentView = view;
  $$('.navlink').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  qInput.placeholder = view === 'artikel' ? 'Cari artikel…' : view === 'buku' ? 'Cari buku…' : view === 'jurnal' ? 'Cari jurnal…' : 'Cari…';
  resultsEl.innerHTML = '';
  if (view === 'beranda') showBeranda();
  else if (view === 'tentang') showTentang();
  else { showSkeleton(2); refresh(); }
}

function refresh() {
  const q = qInput.value.trim();
  if (currentView === 'artikel') renderArtikel(q);
  else if (currentView === 'buku') renderBuku(q);
  else if (currentView === 'jurnal') renderJurnal(q);
}

const debouncedRefresh = debounce(250)(refresh);
qInput.addEventListener('input', () => { if (qInput.value.trim()) debouncedRefresh(); else if (currentView === 'beranda') showBeranda(); });
$('#searchBtn').addEventListener('click', refresh);

$$('.navlink').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

/* QR */
function openQr() {
  const canvas = $('#qrCanvas');
  const qr = qrcode(0, 'M');
  qr.addData(window.location.href);
  qr.make();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  const size = canvas.width, cell = size / qr.getModuleCount();
  ctx.fillStyle = '#000';
  for (let r = 0; r < qr.getModuleCount(); r++)
    for (let c = 0; c < qr.getModuleCount(); c++)
      if (qr.isDark(r,c)) ctx.fillRect(c*cell, r*cell, cell, cell);
  qrModal.classList.remove('hidden');
}
$('#openQr').addEventListener('click', openQr);
$('#closeQr').addEventListener('click', () => qrModal.classList.add('hidden'));
document.getElementById('downloadQr').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = $('#qrCanvas').toDataURL('image/png');
  a.download = 'BuglonWiki-QR.png';
  a.click();
});
qrModal.addEventListener('click', e => { if (e.target === qrModal) qrModal.classList.add('hidden'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') qrModal.classList.add('hidden'); });

try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js'); } catch (e) {}
showBeranda();
