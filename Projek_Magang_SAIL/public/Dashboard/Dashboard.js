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