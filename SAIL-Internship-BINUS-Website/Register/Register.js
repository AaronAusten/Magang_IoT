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

async function registerFingerprint() {
    const username = document.getElementById("username").value.trim();
    if (!username) {
        alert("Isi username terlebih dahulu!");
        return;
    }

    try {
        if (!window.PublicKeyCredential) {
            alert("Browser Anda tidak mendukung autentikasi biometrik.");
            return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const createCredentialOptions = {
            publicKey: {
                challenge: challenge,
                rp: { name: "SAIL Website" 
                    
                },
                user: {
                    id: Uint8Array.from(username, c => c.charCodeAt(0)),
                    name: username,
                    displayName: username
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: { authenticatorAttachment: "platform" },
                timeout: 60000,
                attestation: "direct"
            }
        };

        const credential = await navigator.credentials.create(createCredentialOptions);
        
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        
        await database.ref('biometrics/' + username).set({
            credentialId: credentialId,
            registered: true
        });

        document.getElementById("fingerprint-status").innerText = "Fingerprint terdaftar!";
        alert("Fingerprint berhasil didaftarkan!");

    } catch (err) {
        console.error(err);
        alert("Gagal mendaftarkan fingerprint: " + err.message);
    }
}