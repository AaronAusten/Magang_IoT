function register(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!username || !email || !password || !confirmPassword) {
        alert("All field is required to fill!");
        return;
    }

    if (password !== confirmPassword) {
        alert("Password dont matched!");
        return;
    }

    database.ref('users/' + username).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            alert("Username already used!");
        } else {
            database.ref('users/' + username).set({
                email: email,
                password: password
            }).then(() => {
                alert("Register sukses!");
                window.location.href = "../Homepage/Homepage.html";
            }).catch((error) => {
                console.error("Firebase Error:", error);
                alert("Gagal menyimpan data ke database.");
            });
        }
    }).catch((error) => {
        console.error("Firebase Connection Error:", error);
        alert("Gagal terhubung ke database. Periksa koneksi atau konfigurasi Firebase.");
    });
}
