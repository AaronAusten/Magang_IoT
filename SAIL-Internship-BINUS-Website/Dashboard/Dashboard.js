function loadPage(page) {
  const content = document.getElementById("content");

  if (page === "produksi") {
    content.innerHTML = `
      <h1>Data Entry Produksi</h1>
      <p>Isi data produksi di sini</p>
    `;
  }
  else if (page === "utility") {
    content.innerHTML = `
      <h1>Data Entry Utility</h1>
      <p>Isi data utility di sini</p>
    `;
  }
  else if (page === "lab") {
    content.innerHTML = `
      <h1>Data Entry Laboratorium</h1>
      <p>Isi data lab di sini</p>
    `;
  }
  else if (page === "limbah") {
    content.innerHTML = `
      <h1>Data Entry Limbah</h1>
      <p>Isi data limbah di sini</p>
    `;
  }
  else if (page === "Service") {
    content.innerHTML = `
      <h1>Service</h1>
      <p>Contanct us whatsapp : 081----------- </p>
	  <p>Email: Siliwangi.agro@gmail.com</p>
    `;
  }
  else if(page === "Reporting") {
    content.innerHTML = `
	  <h1>Daily Report (Login)</h1>
	  <p>Log contain login and logout per date (WIP)</p>
    `;
  }
  else if(page === "Help_&_Support"){
    content.innerHTML = `
	  <h1>Help & Support operation!</h1>
	  <p>Waiting consultation about the content (WIP)</p>
    `;
  }
  else if (page === "setting") {
    content.innerHTML = `
      <h2>Settings</h2>
      <div class="settings-container">
        <button onclick="changePassword()" class="btn-settings">Ganti Password</button>
        </div>
    `;
  }
}

function changePassword() {
  const username = localStorage.getItem("loggedInUser");
  
  if (!username) {
    alert("Sesi berakhir, silakan login kembali.");
    window.location.href = "../Homepage/Homepage.html";
    return;
  }

  const newPassword = prompt("Masukkan password baru Anda:");

  if (newPassword) {
    if (newPassword.length < 6) {
      alert("Password minimal harus 6 karakter!");
      return;
    }

    database.ref('users/' + username).update({
      password: newPassword
    })
    .then(() => {
      alert("Password berhasil diperbarui di database Firebase!");
      
      const localData = JSON.parse(localStorage.getItem(username));
      if (localData) {
        localData.password = newPassword;
        localStorage.setItem(username, JSON.stringify(localData));
      }
    })
    .catch((error) => {
      console.error("Gagal mengupdate password:", error);
      alert("Terjadi kesalahan saat menghubungi database.");
    });
  }
}

function confirmLogout() {
  const yakin = confirm("Apakah Anda yakin ingin keluar?");
  if(yakin) {
    localStorage.removeItem('isLoggedin');
    window.location.href = "Logout_Success.html";
  }
}