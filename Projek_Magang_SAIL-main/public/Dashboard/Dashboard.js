function loadPage(page) {
  const content = document.getElementById("content");

  if (!content) {
    console.error("Element #content not found");
    return;
  }

  const pages = {
    dashboard: `
      <h1>Informasi Air</h1>
      <p>Water Steam Generator information :</p>
    `,

    "recent-project": `
      <h1>Recent Project</h1>
      <p>List of recent projects</p>
    `,

    "completed-project": `
      <h1>Completed Project</h1>
      <p>Finished projects</p>
    `,

    "ongoing-project": `
      <h1>On Going Project</h1>
      <p>Current active projects</p>
    `,

     Dashboard1: `
      <h1>Informasi Air</h1>
      <p>Water Steam Generator information :</p>
    `,

    production: `
      <h1>Data Entry Production</h1>
    `,

    utility: `
      <h1>Data Entry Utility</h1>
    `,

    laboratorium: `
      <h1>Data Entry Laboratorium</h1>
    `,

    limbah: `
      <h1>Data Entry Limbah</h1>
    `,

    reporting: `
      <h1>Customer Service</h1>
      <p>Form Complaint</p>
    `,

    "change-email":`
      <h1>change your email here!</h1>
    `,
    "change-password":`
      <h1>change your password here!</h1>
    `,
    "change-water-level": `
      <h1>Change Water Level</h1>
      <p>Adjust water level settings</p>
    `
  };

  content.innerHTML = pages[page] || `<h1>404</h1><p>Page not found</p>`;
}

function toggleSubmenu(element) {
  const submenu = element.nextElementSibling;
  const arrow = element.querySelector(".arrow");

  if (!submenu) return;

  submenu.classList.toggle("show");
  arrow.classList.toggle("rotate");
}

function changePassword() {
  const username = localStorage.getItem("loggedInUser");
  
  if (!username) {
    alert("Sesi berakhir, silakan login kembali.");
    window.location.href = "../Homepage/Homepage.html";
    return;
  }

  const newPassword = prompt("Enter new password");

  if (newPassword) {
    if (newPassword.length < 6) {
      alert("Password need to be at least 6 character!");
      return;
    }

    database.ref('users/' + username).update({
      password: newPassword
    })
    .then(() => {
      alert("Password successfully updated to firebase!");
      
      const localData = JSON.parse(localStorage.getItem(username));
      if (localData) {
        localData.password = newPassword;
        localStorage.setItem(username, JSON.stringify(localData));
      }
    })
    .catch((error) => {
      console.error("Failed to update password!", error);
      alert("Error. Failed to connect to database!");
    });
  }
}

async function sendSettings() {
    const minVal = document.getElementById('jarakMin').value;
    const maxVal = document.getElementById('jarakMax').value;

    if (!minVal || !maxVal) {
        alert("Harap isi kedua nilai!");
        return;
    }

    try {
        const response = await fetch('/api/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ min: minVal, max: maxVal })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Sukses: ' + data.message);
        } else {
            alert('Gagal: ' + data.error);
        }
    } catch (error) {
        console.error("Error sending settings:", error);
        alert("Koneksi server gagal.");
    }
}

// Tambahkan atau update fungsi loadPage di Dashboard.js
function loadPage(page) {
    const contentArea = document.getElementById('content');

    if (page === 'change-water-level') {
        contentArea.innerHTML = `
            <h1>Setting Water Level</h1>
            <p>Atur batas jarak sensor untuk menentukan persentase ketinggian air.</p>
            
            <div style="max-width: 400px; background: #f4f4f4; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <div style="margin-bottom: 15px;">
                    <label style="display:block; margin-bottom:5px;">Jarak Air Penuh (Min) - cm:</label>
                    <input type="number" id="jarakMin" value="30" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display:block; margin-bottom:5px;">Jarak Wadah Kosong (Max) - cm:</label>
                    <input type="number" id="jarakMax" value="200" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc;">
                </div>
                <button onclick="updateSensorSettings()" style="background:#28a745; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; width:100%;">
                    Update ke ESP32
                </button>
            </div>
        `;
    } else if (page === 'Dashboard1') {
        contentArea.innerHTML = `<h1>Informasi Air</h1><p>Water Steam Generator information :</p>`;
        // Panggil fungsi untuk menampilkan data sensor di sini
    } else {
        contentArea.innerHTML = `<h1>Halaman ${page}</h1><p>Konten untuk halaman ${page} akan muncul di sini.</p>`;
    }
}

// Fungsi untuk mengirim data ke Backend
async function updateSensorSettings() {
    const minVal = document.getElementById('jarakMin').value;
    const maxVal = document.getElementById('jarakMax').value;

    if (!minVal || !maxVal) {
        alert("Harap isi nilai Min dan Max!");
        return;
    }

    try {
        const response = await fetch('/api/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ min: minVal, max: maxVal })
        });

        const data = await response.json();
        if (response.ok) {
            alert("✅ Berhasil: " + data.message);
        } else {
            alert("❌ Gagal: " + (data.error || data.message));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Terjadi kesalahan koneksi ke server Node.js.");
    }
}

// Fungsi pendukung sidebar Anda
function toggleSubmenu(element) {
    const submenu = element.nextElementSibling;
    submenu.style.display = submenu.style.display === "block" ? "none" : "block";
}

function confirmLogout() {
  const yakin = confirm("Are you sure to logout?");
  if(yakin) {
    localStorage.removeItem('isLoggedin');
    window.location.href = "Logout_Success.html";
  }
}

async function fetchSummary() {
  try {
    const res = await fetch(API.summary);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (!j.success) throw new Error(j.message || 'error');

    const d = j.data;

    // ✅ Check if latest data is recent (within last 2 minutes)
    const latestTimestamp = d.water_level?.created_at 
      || d.water_flow?.created_at 
      || d.lingkungan?.created_at;

    if (latestTimestamp) {
      const ageSeconds = (Date.now() - new Date(latestTimestamp)) / 1000;
      
      if (ageSeconds > 120) {  // ← 120 seconds = 2 minutes, adjust as needed
        console.warn('Data too old:', Math.round(ageSeconds), 'seconds');
        espConnected = false;
        setEspStatus('waiting');
        showOverlays(true);
        const tbl = $('tbl-cont');
        if (tbl) tbl.innerHTML = '<div class="tbl-empty">Menunggu koneksi ESP…</div>';
        return;  // ← stop here, don't update display
      }
    }

    // Data is fresh — update display
    espConnected = true;
    setEspStatus('connected');
    showOverlays(false);

    applyWL(d.water_level);
    applyWF(d.water_flow);
    applyEnv(d.lingkungan);
    applyPatroli(d.patroli?.total_hari_ini);
    loadTable(_activeTab);

  } catch(e) {
    console.warn('ESP tidak terhubung:', e.message);
    espConnected = false;
    setEspStatus('waiting');
    showOverlays(true);
    const tbl = $('tbl-cont');
    if (tbl) tbl.innerHTML = '<div class="tbl-empty">Menunggu koneksi ESP…</div>';
  }
}

function applyWF(wf) {
  if(!wf) return;
  
  // ✅ Your DB columns are rate and total
  const v = +(wf.rate ?? wf.flow_rate ?? wf.water_flow ?? wf.flow ?? 0);
  
  set('wf-val', v);
  set('wf-rpm', Math.round(v*8)+' rpm');
  set('wf-vol', (wf.total ?? '—')+' mL');
  set('wf-time', fmtT(wf.created_at));
  
  const fan=$('fan-svg');
  if(fan) fan.style.animationDuration = v>0 ? Math.max(.2,5/v)+'s' : '20s';
  document.querySelectorAll('.fp').forEach(p=>{
    p.style.animationPlayState = v>0?'running':'paused';
    p.style.animationDuration  = v>0?(1.2/Math.max(v,.5))+'s':'2s';
  });
  pill('wf-status', v, 80, 120);
}

function applyEnv(env) {
  if(!env) return;
  
  // ✅ Your DB columns are t, h, raw
  const suhu = +(env.t ?? env.suhu ?? env.temperature ?? 0);
  const lemb = +(env.h ?? env.kelembapan ?? env.humidity ?? 0);
  const gas  = +(env.raw ?? env.gas ?? env.gas_value ?? 0);

  set('suhu-val', suhu); set('suhu-v2', suhu+'°C'); set('suhu-time', fmtT(env.created_at));
  const merc=$('thermo-merc'); if(merc) merc.style.height=clamp(suhu/50*100,0,100)+'%';
  let cond='NORMAL', bb='radial-gradient(circle at 35% 35%,#93c5fd,#1d4ed8)';
  if(suhu>=38){cond='SANGAT PANAS';bb='radial-gradient(circle at 35% 35%,#fca5a5,#b91c1c)';}
  else if(suhu>=35){cond='PANAS';bb='radial-gradient(circle at 35% 35%,#fdba74,#c2410c)';}
  else if(suhu>=30){cond='HANGAT';bb='radial-gradient(circle at 35% 35%,#fed7aa,#ea580c)';}
  set('suhu-cond', cond);
  const bulb=$('thermo-bulb'); if(bulb) bulb.style.background=bb;
  pill('suhu-status', suhu, 35, 40);

  set('kel-val', lemb); set('g-num', lemb);
  const arc=$('g-arc'); if(arc) arc.style.strokeDashoffset=204-(lemb/100)*204;
  const ndl=$('g-needle'); if(ndl) ndl.setAttribute('transform',`rotate(${-90+(lemb/100)*180},78,83)`);
  for(let i=0;i<7;i++){
    const drp=$('drp-'+i); if(!drp) continue;
    const active=(lemb/100*7)>i;
    drp.style.height=(active?11+i*2:6)+'px';
    drp.style.opacity=active?'.8':'.2';
    drp.style.background=lemb>90?'var(--red)':lemb>75?'var(--yellow)':'var(--blue)';
  }
  pill('kel-status', lemb, 80, 95);

  const maxG=600, gPct=clamp(Math.round(gas/maxG*100),0,100);
  set('gas-val', gas); set('gas-pct-lbl', gPct+'%');
  const gbar=$('gbar-main');
  if(gbar){
    gbar.style.width=gPct+'%';
    gbar.style.background=gas>=500?'linear-gradient(90deg,#e07b2a,#dc3545)':gas>=300?'linear-gradient(90deg,#c99a0a,#e07b2a)':'linear-gradient(90deg,#18a96a,#6f52d9)';
  }
  document.querySelectorAll('.gp').forEach((p,i)=>{
    p.style.animationDuration=(Math.max(.3,1.4-gas/600)+(i%3)*.12)+'s';
  });
  pill('gas-status', gas, 300, 500);
}