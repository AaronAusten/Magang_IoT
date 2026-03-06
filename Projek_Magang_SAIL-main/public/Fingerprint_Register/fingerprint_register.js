function base64urlToUint8Array(base64url) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function registerFingerprint() {
  console.log("Register fingerprint clicked");

  // Get user info saved during standard register/login
  const user_id = localStorage.getItem("user_id");
  const email = localStorage.getItem("email");

  if (!user_id || !email) {
    alert("Sesi tidak ditemukan. Silakan login terlebih dahulu.");
    return;
  }

  try {
    // STEP 1: Get registration options from server
    const optRes = await fetch("/api/webauthn/register/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, email }),
    });

    if (!optRes.ok) {
      const err = await optRes.json();
      alert("Error: " + err.message);
      return;
    }

    const options = await optRes.json();

    // STEP 2: Convert challenge and user.id to ArrayBuffer (required by browser API)
    options.challenge = base64urlToUint8Array(options.challenge);
    options.user.id = base64urlToUint8Array(options.user.id);

    // STEP 3: Trigger fingerprint/PIN prompt
    const credential = await navigator.credentials.create({ publicKey: options });

    // STEP 4: Package credential to send back to server
    const credentialData = {
      id: credential.id,
      rawId: uint8ArrayToBase64url(credential.rawId),
      type: credential.type,
      response: {
        attestationObject: uint8ArrayToBase64url(credential.response.attestationObject),
        clientDataJSON: uint8ArrayToBase64url(credential.response.clientDataJSON),
      },
    };

    // STEP 5: Verify and save on server
    const verifyRes = await fetch("/api/webauthn/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, credential: credentialData }),
    });

    const result = await verifyRes.json();

    if (verifyRes.ok && result.success) {
      alert("✅ " + result.message);
      window.location.href = "../Homepage/Homepage.html";
    } else {
      alert("❌ Gagal: " + result.message);
    }
  } catch (err) {
    console.error("Register fingerprint error:", err);
    alert("Terjadi error: " + err.message);
  }
}

document
  .getElementById("registerFingerprintBtn")
  .addEventListener("click", registerFingerprint);