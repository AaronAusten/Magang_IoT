function login(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
 
  database.ref('users/' + username).once('value').then((snapshot) => {
    const userData = snapshot.val();

    if (userData && userData.password === password) {
      alert("Login success!");
      
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loggedInUser", username);

      window.location.href = "../Dashboard/Dashboard.html";
    } else {
      alert("Username or Password is wrong!");
    }
  }).catch((error) => {
    console.error(error);
    alert("Login failed!");
  });
}

async function loginWithFingerprint() {
    const username = document.getElementById("username").value.trim();
    if (!username) {
        alert("Masukkan username untuk login biometrik");
        return;
    }

    try {
        const snapshot = await database.ref('biometrics/' + username).once('value');
        const bioData = snapshot.val();

        if (!bioData || !bioData.registered) {
            alert("Fingerprint belum terdaftar untuk akun ini.");
            return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const allowCredentials = [{
            id: Uint8Array.from(atob(bioData.credentialId), c => c.charCodeAt(0)),
            type: 'public-key'
        }];

        const getCredentialOptions = {
            publicKey: {
                challenge: challenge,
                allowCredentials: allowCredentials,
                timeout: 60000,
                userVerification: "required"
            }
        };

        const assertion = await navigator.credentials.get(getCredentialOptions);
        
        if (assertion) {
            alert("Fingerprint terverifikasi! Login sukses.");
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("loggedInUser", username);
            window.location.href = "../Dashboard/Dashboard.html";
        }

    } catch (err) {
        console.error(err);
        alert("Verifikasi fingerprint gagal.");
    }
}