const CSV_URL = '../data/places.csv';

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

function toCSVField(v) {
  v = String(v ?? '');
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function geocodeOne(places, place) {
  return new Promise((resolve) => {
    places.keywordSearch('과천 ' + place, (data, status) => {
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        resolve({ ok: true, r: data[0] });
      } else {
        places.keywordSearch(place, (data2, status2) => {
          if (status2 === kakao.maps.services.Status.OK && data2.length > 0) {
            resolve({ ok: true, r: data2[0] });
          } else {
            resolve({ ok: false });
          }
        });
      }
    });
  });
}

async function run() {
  document.getElementById('startBtn').disabled = true;
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const parsed = parseCSV(text);
  const header = parsed[0];
  const rows = parsed.slice(1);
  const idx = Object.fromEntries(header.map((h,i)=>[h,i]));

  const places = new kakao.maps.services.Places();
  const tbody = document.querySelector('#resultTable tbody');
  const progress = document.getElementById('progress');

  const outRows = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const placeName = row[idx.place];
    progress.textContent = `처리 중... ${i+1}/${rows.length} (${placeName})`;
    const result = await geocodeOne(places, placeName);
    const tr = document.createElement('tr');
    if (result.ok) {
      const r = result.r;
      outRows.push({ place: placeName, category_name: r.category_name || '', place_url: r.place_url || '' });
      tr.innerHTML = `<td>${i+1}</td><td>${escapeHtml(placeName)}</td><td>OK</td><td>${escapeHtml(r.category_name||'')}</td><td>${escapeHtml(r.place_url||'')}</td>`;
    } else {
      outRows.push({ place: placeName, category_name: '', place_url: '' });
      tr.className = 'fail';
      tr.innerHTML = `<td>${i+1}</td><td>${escapeHtml(placeName)}</td><td>FAIL</td><td colspan="2">검색 결과 없음</td>`;
    }
    tbody.appendChild(tr);
    await sleep(120);
  }
  progress.textContent = `완료: ${rows.length}건 처리`;

  const outHeader = ['place', 'category_name', 'place_url'];
  const lines = [outHeader.map(toCSVField).join(',')];
  for (const row of outRows) lines.push(outHeader.map(h => toCSVField(row[h])).join(','));
  const csvText = lines.join('\n');
  document.getElementById('output').value = csvText;

  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.disabled = false;
  downloadBtn.onclick = () => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'category_names.csv';
    a.click();
  };
}

document.getElementById('startBtn').addEventListener('click', () => {
  kakao.maps.load(run);
});
