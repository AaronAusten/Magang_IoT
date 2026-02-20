// ═══════════════════════════════════════════════════════════
//  IoT_Sensors.js  —  HTML template + data fetching IoT
// ═══════════════════════════════════════════════════════════

// ── Template HTML dashboard sensor ──────────────────────────
function getDashboardHTML() {
  return `
  <div class="iot-header">
    <div class="iot-title">Monitor IoT</div>
    <div class="iot-right">
      <div class="iot-live"><div class="iot-dot"></div>LIVE</div>
      <div class="iot-clock" id="iot-clock">--:--:--</div>
    </div>
  </div>

  <div class="sensor-grid">

    <!-- TANGKI AIR -->
    <div class="s-card" style="--acc:#0ea5e9">
      <div class="s-bar"></div>
      <div class="s-badge">
        <div class="s-num" id="wl-val">—</div>
        <div class="s-unit">cm</div>
        <div class="s-pill st-ok" id="wl-status">—</div>
      </div>
      <div class="s-label">Tinggi Air</div>
      <div class="tank-wrap">
        <div class="tank-col">
          <div class="tank">
            <div class="tank-water" id="tank-water" style="height:0%">
              <div class="bbl" style="width:4px;height:4px;left:22%;animation-duration:2.8s"></div>
              <div class="bbl" style="width:5px;height:5px;left:52%;animation-duration:3.4s;animation-delay:1.1s"></div>
              <div class="bbl" style="width:3px;height:3px;left:74%;animation-duration:2.2s;animation-delay:.6s"></div>
            </div>
          </div>
          <div class="tank-pct" id="tank-pct">0%</div>
        </div>
        <div class="tank-ruler">
          <span>MAX</span><span>75</span><span>50</span><span>25</span><span>0</span>
        </div>
        <div class="tank-info">
          <div class="irow"><span class="ik">LEVEL</span><span class="iv" id="wl-level">— cm</span></div>
          <div class="irow"><span class="ik">PERSEN</span><span class="iv" id="wl-pct2">—%</span></div>
          <div class="irow"><span class="ik">UPDATE</span><span class="iv sm" id="wl-time">—</span></div>
        </div>
      </div>
    </div>

    <!-- PIPA FLOW -->
    <div class="s-card" style="--acc:#10b981">
      <div class="s-bar"></div>
      <div class="s-badge">
        <div class="s-num" id="wf-val">—</div>
        <div class="s-unit">L/min</div>
        <div class="s-pill st-ok" id="wf-status">—</div>
      </div>
      <div class="s-label">Flow Air</div>
      <div class="pipe-wrap">
        <div class="pipe-row">
          <div class="pipe-cap l"></div>
          <div class="pipe-seg"><div id="pfl"></div></div>
          <div class="fan-hub">
            <svg class="fan-svg" id="fan-svg" width="40" height="40" viewBox="0 0 40 40">
              <g transform="translate(20,20)">
                <ellipse rx="3" ry="7.5" transform="rotate(0)"   fill="#10b981" opacity=".95"/>
                <ellipse rx="3" ry="7.5" transform="rotate(60)"  fill="#10b981" opacity=".75"/>
                <ellipse rx="3" ry="7.5" transform="rotate(120)" fill="#10b981" opacity=".58"/>
                <ellipse rx="3" ry="7.5" transform="rotate(180)" fill="#10b981" opacity=".95"/>
                <ellipse rx="3" ry="7.5" transform="rotate(240)" fill="#10b981" opacity=".75"/>
                <ellipse rx="3" ry="7.5" transform="rotate(300)" fill="#10b981" opacity=".58"/>
                <circle r="4" fill="white" stroke="#10b981" stroke-width="1.5"/>
                <circle r="1.6" fill="#10b981"/>
              </g>
            </svg>
          </div>
          <div class="pipe-seg"><div id="pfr"></div></div>
          <div class="pipe-cap r"></div>
        </div>
        <div class="pipe-stats">
          <div class="ps"><div class="psl">KECEPATAN</div><div class="psv" id="wf-rpm">— rpm</div></div>
          <div class="ps"><div class="psl">VOLUME</div><div class="psv" id="wf-vol">— L</div></div>
          <div class="ps"><div class="psl">UPDATE</div><div class="psv sm" id="wf-time">—</div></div>
        </div>
      </div>
    </div>

    <!-- TERMOMETER -->
    <div class="s-card" style="--acc:#f97316">
      <div class="s-bar"></div>
      <div class="s-badge">
        <div class="s-num" id="suhu-val">—</div>
        <div class="s-unit">°C</div>
        <div class="s-pill st-ok" id="suhu-status">—</div>
      </div>
      <div class="s-label">Suhu</div>
      <div class="thermo-wrap">
        <div class="thermo-col">
          <div class="thermo-tube">
            <div class="thermo-merc" id="thermo-merc" style="height:0%"></div>
          </div>
          <div class="thermo-neck"></div>
          <div class="thermo-bulb" id="thermo-bulb"></div>
        </div>
        <div class="thermo-scale">
          <span>50°</span><span>40°</span><span>30°</span><span>20°</span><span>10°</span><span>0°</span>
        </div>
        <div class="tank-info">
          <div class="irow"><span class="ik">SUHU</span><span class="iv" style="color:#f97316" id="suhu-v2">—°C</span></div>
          <div class="irow"><span class="ik">KONDISI</span><span class="iv sm" style="color:#f97316" id="suhu-cond">—</span></div>
          <div class="irow"><span class="ik">UPDATE</span><span class="iv sm" style="color:#f97316" id="suhu-time">—</span></div>
        </div>
      </div>
    </div>

    <!-- GAUGE KELEMBAPAN -->
    <div class="s-card" style="--acc:#ca8a04">
      <div class="s-bar"></div>
      <div class="s-badge">
        <div class="s-num" id="kel-val">—</div>
        <div class="s-unit">%RH</div>
        <div class="s-pill st-ok" id="kel-status">—</div>
      </div>
      <div class="s-label">Kelembapan</div>
      <div class="hum-wrap">
        <div class="gauge-outer">
          <svg width="156" height="86" viewBox="0 0 156 86" style="overflow:visible">
            <defs>
              <linearGradient id="gGrd" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stop-color="#0ea5e9"/>
                <stop offset="50%"  stop-color="#eab308"/>
                <stop offset="100%" stop-color="#ef4444"/>
              </linearGradient>
            </defs>
            <path d="M13 83 A65 65 0 0 1 143 83" stroke="#e8ecf2" stroke-width="13" fill="none" stroke-linecap="round"/>
            <path id="g-arc" d="M13 83 A65 65 0 0 1 143 83" stroke="url(#gGrd)" stroke-width="13" fill="none" stroke-linecap="round"
              stroke-dasharray="204" stroke-dashoffset="204" style="transition:stroke-dashoffset 1.6s ease"/>
            <text x="7" y="84" font-family="Orbitron,monospace" font-size="8" fill="#94a3b8">0</text>
            <text x="70" y="16" font-family="Orbitron,monospace" font-size="8" fill="#94a3b8">50</text>
            <text x="140" y="84" font-family="Orbitron,monospace" font-size="8" fill="#94a3b8">100</text>
            <g id="g-needle" transform="rotate(-90,78,83)">
              <line x1="78" y1="83" x2="78" y2="25" stroke="#eab308" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="78" cy="83" r="5" fill="#eab308" stroke="white" stroke-width="2"/>
            </g>
          </svg>
          <div class="gauge-ct">
            <div class="g-num" id="g-num">0</div>
            <div class="g-unit">%RH</div>
          </div>
        </div>
        <div class="drops-row" id="drops-row"></div>
      </div>
    </div>

    <!-- GAS METER -->
    <div class="s-card" style="--acc:#8b5cf6">
      <div class="s-bar"></div>
      <div class="s-badge">
        <div class="s-num" id="gas-val">—</div>
        <div class="s-unit">ppm</div>
        <div class="s-pill st-ok" id="gas-status">—</div>
      </div>
      <div class="s-label">Kadar Gas</div>
      <div class="gas-wrap">
        <div class="gas-icon-row">
          <div class="gas-emoji">☁️</div>
          <div class="gas-bars">
            <div class="gbrow">
              <span class="gbl">NILAI</span>
              <div class="gbt"><div class="gbf" id="gbar-main" style="width:0%;background:linear-gradient(90deg,#10b981,#8b5cf6)"></div></div>
              <span class="gbv" id="gas-pct-lbl" style="color:#8b5cf6">0%</span>
            </div>
            <div class="gbrow">
              <span class="gbl" style="color:#10b981">AMAN</span>
              <div class="gbt"><div class="gbf" style="width:50%;background:linear-gradient(90deg,rgba(16,185,129,.8),rgba(16,185,129,.2))"></div></div>
              <span class="gbv" style="color:#10b981">300</span>
            </div>
            <div class="gbrow">
              <span class="gbl" style="color:#ef4444">MAX</span>
              <div class="gbt"><div class="gbf" style="width:100%;background:linear-gradient(90deg,rgba(239,68,68,.8),rgba(239,68,68,.2))"></div></div>
              <span class="gbv" style="color:#ef4444">600</span>
            </div>
          </div>
        </div>
        <div class="gas-ptcl" id="gas-ptcl"></div>
      </div>
    </div>

    <!-- PATROLI -->
    <div class="s-card" style="--acc:#0ea5e9">
      <div class="s-bar"></div>
      <div class="s-badge">
        <div class="s-num" id="pat-total">—</div>
        <div class="s-unit">total</div>
      </div>
      <div class="s-label">Laporan Patroli</div>
      <div class="patrol-wrap">
        <div class="pat-ring-outer">
          <svg viewBox="0 0 88 88" width="88" height="88">
            <defs>
              <linearGradient id="rGrd" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0ea5e9"/>
                <stop offset="100%" stop-color="#10b981"/>
              </linearGradient>
            </defs>
            <circle cx="44" cy="44" r="35" stroke="#e8ecf2" stroke-width="9" fill="none"/>
            <circle id="pat-ring" cx="44" cy="44" r="35"
              stroke="url(#rGrd)" stroke-width="9" fill="none"
              stroke-dasharray="220" stroke-dashoffset="220"
              transform="rotate(-90,44,44)"
              style="transition:stroke-dashoffset 1.6s ease;stroke-linecap:round"/>
          </svg>
          <div class="pat-ring-num" id="pat-ring-num">0</div>
        </div>
        <div class="pat-list" id="patrol-list">
          <div style="font-size:11px;color:#94a3b8">Memuat...</div>
        </div>
      </div>
    </div>

  </div><!-- /sensor-grid -->

  <!-- TABLE -->
  <div class="tbl-section">
    <div class="iot-tabs">
      <button class="iot-tab active" onclick="swTab('water-level',this)">Water Level</button>
      <button class="iot-tab" onclick="swTab('water-flow',this)">Water Flow</button>
      <button class="iot-tab" onclick="swTab('lingkungan',this)">Lingkungan</button>
      <button class="iot-tab" onclick="swTab('patroli',this)">Patroli</button>
    </div>
    <div class="tbl-wrap" id="tbl-cont">
      <div class="iot-loader"><div class="iot-spinner"></div>Memuat data...</div>
    </div>
  </div>`;
}

// ── Init: jalankan setelah HTML disuntikkan ──────────────────
function initIoT() {
  // Clock
  if (window._iotClockTimer) clearInterval(window._iotClockTimer);
  window._iotClockTimer = setInterval(() => {
    const el = document.getElementById('iot-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('id-ID');
    else clearInterval(window._iotClockTimer);
  }, 1000);
  const el = document.getElementById('iot-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('id-ID');

  // Build pipe particles
  _mkPipe('pfl', 7); _mkPipe('pfr', 7);

  // Build humidity drops
  const dr = document.getElementById('drops-row');
  if (dr) for (let i = 0; i < 7; i++) {
    const d = document.createElement('div');
    d.className = 'drp'; d.id = 'drp-' + i;
    d.style.cssText = 'height:8px;background:#cbd5e1;opacity:.2';
    dr.appendChild(d);
  }

  // Build gas particles
  const gp = document.getElementById('gas-ptcl');
  const gpc = ['#8b5cf6','#a78bfa','#7c3aed','#c4b5fd','#6d28d9'];
  if (gp) for (let i = 0; i < 10; i++) {
    const p = document.createElement('div'); p.className = 'gp';
    p.style.cssText = `background:${gpc[i%5]};height:${8+Math.random()*16}px;animation-duration:${.5+Math.random()*.8}s;animation-delay:${Math.random()*.8}s`;
    gp.appendChild(p);
  }

  // Load data pertama kali
  _loadSummary();
  _loadPatroliList();
  _loadTable('water-level');

  // Auto-refresh tiap 30 detik
  window._iotRefreshTimer = setInterval(() => {
    if (!document.getElementById('wl-val')) { clearInterval(window._iotRefreshTimer); return; }
    _loadSummary();
    _loadPatroliList();
    _loadTable(window._activeTab || 'water-level');
  }, 30000);
}

// ── Helpers ──────────────────────────────────────────────────
const _fmtT  = ts => ts ? new Date(ts).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '—';
const _fmtDT = ts => ts ? new Date(ts).toLocaleString('id-ID') : '—';
const _clamp = (v,a,b) => Math.max(a, Math.min(b, v));

function _setStatus(id, v, warnAt, critAt) {
  const el = document.getElementById(id); if (!el) return;
  if (v === null || v === undefined) { el.textContent = '—'; el.className = 's-pill'; return; }
  let c = 'st-ok', t = 'NORMAL';
  if (critAt !== undefined && v >= critAt) { c = 'st-crit'; t = 'BAHAYA'; }
  else if (warnAt !== undefined && v >= warnAt) { c = 'st-warn'; t = 'PERHATIAN'; }
  el.textContent = t; el.className = 's-pill ' + c;
}

function _mkPipe(id, n) {
  const c = document.getElementById(id); if (!c) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'fp';
    p.style.cssText = `top:${8+Math.random()*8}px;height:${2+Math.random()*3}px;animation-duration:${.7+Math.random()*.8}s;animation-delay:${Math.random()*1.4}s;opacity:${.5+Math.random()*.5}`;
    c.appendChild(p);
  }
}

function _set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ── Load summary dari PostgreSQL API ─────────────────────────
async function _loadSummary() {
  try {
    const j = await (await fetch('/api/iot/dashboard/summary')).json();
    if (!j.success) throw new Error(j.message);
    const d = j.data;

    // Water Level
    const wl = d.water_level;
    if (wl) {
      const v = +(wl.tinggi_air ?? wl.water_level ?? wl.level ?? 0);
      const maxH = 300, pct = _clamp(Math.round(v / maxH * 100), 0, 100);
      _set('wl-val', v); _set('wl-level', v + ' cm');
      _set('wl-pct2', pct + '%'); _set('wl-time', _fmtT(wl.created_at));
      _set('tank-pct', pct + '%');
      const tw = document.getElementById('tank-water');
      if (tw) tw.style.height = pct + '%';
      _setStatus('wl-status', v, 200, 250);
    }

    // Water Flow
    const wf = d.water_flow;
    if (wf) {
      const v = +(wf.flow_rate ?? wf.water_flow ?? wf.flow ?? 0);
      _set('wf-val', v);
      _set('wf-rpm', Math.round(v * 8) + ' rpm');
      _set('wf-vol', (wf.volume ?? wf.total_volume ?? '—') + ' L');
      _set('wf-time', _fmtT(wf.created_at));
      const fan = document.getElementById('fan-svg');
      if (fan) fan.style.animationDuration = v > 0 ? Math.max(.2, 6 / v) + 's' : '99s';
      document.querySelectorAll('.fp').forEach(p => {
        p.style.animationPlayState = v > 0 ? 'running' : 'paused';
        p.style.animationDuration  = v > 0 ? (1.5 / Math.max(v, .5)) + 's' : '2s';
      });
      _setStatus('wf-status', v, 80, 120);
    }

    // Lingkungan
    const env = d.lingkungan;
    if (env) {
      const suhu = +(env.suhu ?? env.temperature ?? 0);
      const lemb = +(env.kelembapan ?? env.humidity ?? 0);
      const gas  = +(env.gas ?? env.gas_value ?? env.ppm ?? 0);

      // Suhu
      _set('suhu-val', suhu); _set('suhu-v2', suhu + '°C');
      _set('suhu-time', _fmtT(env.created_at));
      const merc = document.getElementById('thermo-merc');
      if (merc) merc.style.height = _clamp(suhu / 50 * 100, 0, 100) + '%';
      let cond = 'NORMAL', bb = 'radial-gradient(circle at 35% 35%,#93c5fd,#1d4ed8)';
      if      (suhu >= 38) { cond = 'SANGAT PANAS'; bb = 'radial-gradient(circle at 35% 35%,#fca5a5,#b91c1c)'; }
      else if (suhu >= 35) { cond = 'PANAS';        bb = 'radial-gradient(circle at 35% 35%,#fdba74,#c2410c)'; }
      else if (suhu >= 30) { cond = 'HANGAT';       bb = 'radial-gradient(circle at 35% 35%,#fed7aa,#ea580c)'; }
      _set('suhu-cond', cond);
      const bulb = document.getElementById('thermo-bulb');
      if (bulb) bulb.style.background = bb;
      _setStatus('suhu-status', suhu, 35, 40);

      // Kelembapan
      _set('kel-val', lemb); _set('g-num', lemb);
      const arc = document.getElementById('g-arc');
      if (arc) arc.style.strokeDashoffset = 204 - (lemb / 100) * 204;
      const needle = document.getElementById('g-needle');
      if (needle) needle.setAttribute('transform', `rotate(${-90 + (lemb / 100) * 180},78,83)`);
      for (let i = 0; i < 7; i++) {
        const active = (lemb / 100 * 7) > i;
        const drop = document.getElementById('drp-' + i);
        if (!drop) continue;
        drop.style.height     = (active ? 12 + i * 3 : 7) + 'px';
        drop.style.opacity    = active ? '.9' : '.15';
        drop.style.background = lemb > 90 ? '#ef4444' : lemb > 75 ? '#eab308' : '#0ea5e9';
      }
      _setStatus('kel-status', lemb, 80, 95);

      // Gas
      const maxG = 600, gPct = _clamp(Math.round(gas / maxG * 100), 0, 100);
      _set('gas-val', gas); _set('gas-pct-lbl', gPct + '%');
      const gbar = document.getElementById('gbar-main');
      if (gbar) {
        gbar.style.width = gPct + '%';
        gbar.style.background = gas >= 500
          ? 'linear-gradient(90deg,#f97316,#ef4444)'
          : gas >= 300
          ? 'linear-gradient(90deg,#eab308,#f97316)'
          : 'linear-gradient(90deg,#10b981,#8b5cf6)';
      }
      document.querySelectorAll('.gp').forEach((p, i) => {
        p.style.animationDuration = (Math.max(.3, 1.5 - gas / 600) + (i % 3) * .15) + 's';
      });
      _setStatus('gas-status', gas, 300, 500);
    }

    // Patroli
    const tot = parseInt(d.total_patroli) || 0;
    _set('pat-total', tot); _set('pat-ring-num', tot);
    const ring = document.getElementById('pat-ring');
    if (ring) ring.style.strokeDashoffset = 220 - (tot / Math.max(tot, 50)) * 220;

  } catch (e) { console.error('IoT summary error:', e); }
}

// ── Load daftar patroli terbaru ───────────────────────────────
async function _loadPatroliList() {
  try {
    const j  = await (await fetch('/api/iot/patroli')).json();
    const el = document.getElementById('patrol-list');
    if (!el) return;
    if (!j.success || !j.data.length) { el.innerHTML = '<div style="font-size:11px;color:#94a3b8">Belum ada data</div>'; return; }
    el.innerHTML = j.data.slice(0, 3).map(r => `
      <div class="pat-row">
        <span class="pat-name">${r.nama_petugas ?? r.petugas ?? r.nama ?? '#' + r.id}</span>
        <span class="pat-time">${_fmtT(r.created_at)}</span>
      </div>`).join('');
  } catch (e) {}
}

// ── Tabel data ────────────────────────────────────────────────
window._activeTab = 'water-level';
const _apiMap = {
  'water-level': '/api/iot/water-level',
  'water-flow':  '/api/iot/water-flow',
  'lingkungan':  '/api/iot/lingkungan',
  'patroli':     '/api/iot/patroli',
};

async function _loadTable(tab) {
  const c = document.getElementById('tbl-cont'); if (!c) return;
  c.innerHTML = '<div class="iot-loader"><div class="iot-spinner"></div>Memuat data...</div>';
  try {
    const j = await (await fetch(_apiMap[tab])).json();
    if (!j.success || !j.data.length) { c.innerHTML = '<div class="iot-loader">Tidak ada data</div>'; return; }
    const rows = j.data, keys = Object.keys(rows[0]);
    let h = `<table><thead><tr>${keys.map(k => `<th>${k.replace(/_/g,' ')}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach(r => {
      h += `<tr>${keys.map(k => {
        const v = r[k];
        if (k === 'id')          return `<td><span class="td-id">#${v}</span></td>`;
        if (k.includes('_at'))   return `<td style="color:#94a3b8;font-size:11px">${_fmtDT(v)}</td>`;
        return `<td>${v ?? '—'}</td>`;
      }).join('')}</tr>`;
    });
    c.innerHTML = h + '</tbody></table>';
  } catch (e) { c.innerHTML = `<div class="iot-loader">Error: ${e.message}</div>`; }
}

function swTab(tab, el) {
  window._activeTab = tab;
  document.querySelectorAll('.iot-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  _loadTable(tab);
}