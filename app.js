const DATA_URL = 'data/places.csv';
const DEFAULT_CENTER = { lat: 37.4292, lng: 126.9946 }; // 과천시청 인근

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
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

function catClass(cat) {
  if (cat === '음식점') return 'food';
  if (cat === '카페') return 'cafe';
  return 'other';
}
function catLabel(cat) {
  if (cat === '음식점') return '음식점';
  if (cat === '카페') return '카페·베이커리';
  return cat || '미분류';
}

function kakaoSearchUrl(place) {
  return 'https://map.kakao.com/link/search/' + encodeURIComponent('과천 ' + place);
}

function svgMarker(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="9" fill="${color}" stroke="#ffffff" stroke-width="2"/></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

async function main() {
  const res = await fetch(DATA_URL);
  const text = await res.text();
  const parsed = parseCSV(text);
  const header = parsed[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const items = parsed.slice(1).map(row => ({
    place: row[idx.place],
    count: Number(row[idx.count]) || 0,
    amount: Number(row[idx.amount]) || 0,
    users: row[idx.users] || '',
    category: row[idx.category] || '',
    lat: parseFloat(row[idx.lat]),
    lng: parseFloat(row[idx.lng]),
    address: row[idx.address] || '',
    place_url: row[idx.place_url] || '',
  })).sort((a, b) => b.count - a.count || b.amount - a.amount);

  renderStats(items);
  const mapCtl = initMap(items);
  renderTable(items, mapCtl);

  let activeCat = 'all';
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      applyFilters();
    });
  });

  const searchBox = document.getElementById('searchBox');
  searchBox.addEventListener('input', applyFilters);

  function applyFilters() {
    const q = searchBox.value.trim().toLowerCase();
    const filtered = items.filter(d => {
      const catOk = activeCat === 'all' || d.category === activeCat;
      const qOk = !q || d.place.toLowerCase().includes(q);
      return catOk && qOk;
    });
    mapCtl.setItems(filtered);
    renderTable(filtered, mapCtl);
    document.getElementById('listCount').textContent = `${filtered.length}곳 표시 중 (전체 ${items.length}곳)`;
  }
  applyFilters();
}

function renderStats(items) {
  const stats = document.getElementById('stats');
  const totalCount = items.reduce((s, d) => s + d.count, 0);
  const totalAmount = items.reduce((s, d) => s + d.amount, 0);
  const foodCount = items.filter(d => d.category === '음식점').length;
  const cafeCount = items.filter(d => d.category === '카페').length;
  const defs = [
    [items.length.toLocaleString(), '고유 식당·카페 수'],
    [totalCount.toLocaleString() + '회', '총 방문(집행 건수)'],
    ['₩' + totalAmount.toLocaleString(), '총 집행 금액'],
    [`음식점 ${foodCount} · 카페 ${cafeCount}`, '분류별 개수'],
  ];
  stats.innerHTML = defs.map(([v, l]) => `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
}

function initMap(items) {
  const container = document.getElementById('map');
  const map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
    level: 6,
  });
  map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

  const clusterer = new kakao.maps.MarkerClusterer({
    map, averageCenter: true, minLevel: 5, disableClickZoom: false,
  });

  const iwCache = new Map();
  function infoContentFor(d) {
    if (iwCache.has(d.place)) return iwCache.get(d.place);
    const link = d.place_url || kakaoSearchUrl(d.place);
    const html = `<div class="info-window">
      <b>${d.place}</b>
      <div class="badge"><span class="cat-badge ${catClass(d.category)}">${catLabel(d.category)}</span></div>
      방문 ${d.count}회 · 총 ${d.amount.toLocaleString()}원<br/>
      ${d.address ? d.address + '<br/>' : ''}
      <a href="${link}" target="_blank" rel="noopener">카카오맵에서 보기 →</a>
    </div>`;
    iwCache.set(d.place, html);
    return html;
  }

  const allMarkers = items.filter(d => !isNaN(d.lat) && !isNaN(d.lng)).map(d => {
    const color = d.category === '카페' ? getComputedColor('--series-cafe') : getComputedColor('--series-food');
    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(d.lat, d.lng),
      image: new kakao.maps.MarkerImage(svgMarker(color), new kakao.maps.Size(26, 26), { offset: new kakao.maps.Point(13, 13) }),
    });
    const iw = new kakao.maps.InfoWindow({ content: infoContentFor(d), removable: true });
    kakao.maps.event.addListener(marker, 'click', () => { iw.open(map, marker); });
    marker.__item = d;
    return marker;
  });

  if (allMarkers.length) {
    const bounds = new kakao.maps.LatLngBounds();
    allMarkers.forEach(m => bounds.extend(m.getPosition()));
    map.setBounds(bounds);
  }

  function setItems(filteredItems) {
    const filteredPlaces = new Set(filteredItems.map(d => d.place));
    const visible = allMarkers.filter(m => filteredPlaces.has(m.__item.place));
    clusterer.clear();
    clusterer.addMarkers(visible);
    if (visible.length) {
      const bounds = new kakao.maps.LatLngBounds();
      visible.forEach(m => bounds.extend(m.getPosition()));
      map.setBounds(bounds);
    }
  }

  return { setItems };
}

function getComputedColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#2a78d6';
}

function renderTable(items, mapCtl) {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = items.map((d, i) => {
    const link = d.place_url || kakaoSearchUrl(d.place);
    return `
    <tr>
      <td class="rank">${i + 1}</td>
      <td>${d.place}</td>
      <td><span class="cat-badge ${catClass(d.category)}">${catLabel(d.category)}</span></td>
      <td class="num">${d.count}</td>
      <td class="num">${d.amount.toLocaleString()}</td>
      <td class="users-chip">${d.users}</td>
      <td><a class="maplink" href="${link}" target="_blank" rel="noopener">지도</a></td>
    </tr>`;
  }).join('');
}

kakao.maps.load(main);
