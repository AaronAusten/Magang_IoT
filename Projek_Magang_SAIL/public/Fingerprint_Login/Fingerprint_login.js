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

async function loginFingerprint() {
  const user_id = localStorage.getItem("user_id");

  if (!user_id) {
    alert("Sesi tidak ditemukan. Silakan login dengan email/password dulu.");
    return;
  }

  try {
    // STEP 1: Get login challenge from server
    const res = await fetch("/api/webauthn/login/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Error: " + err.message);
      return;
    }

    const options = await res.json();

    // STEP 2: Convert challenge and credential IDs to ArrayBuffer
    options.challenge = base64urlToUint8Array(options.challenge);
    options.allowCredentials = options.allowCredentials.map((c) => ({
      ...c,
      id: base64urlToUint8Array(c.id),
    }));

    // STEP 3: Trigger fingerprint/PIN prompt
    const assertion = await navigator.credentials.get({ publicKey: options });

    // STEP 4: Send ALL fields to server (this was the bug — before only { credential } was sent)
    const verifyRes = await fetch("/api/webauthn/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,                                          // needed to look up challenge + credential
        id: assertion.id,
        rawId: uint8ArrayToBase64url(assertion.rawId),
        type: assertion.type,
        response: {
          authenticatorData: uint8ArrayToBase64url(assertion.response.authenticatorData),
          clientDataJSON: uint8ArrayToBase64url(assertion.response.clientDataJSON),
          signature: uint8ArrayToBase64url(assertion.response.signature),
          userHandle: assertion.response.userHandle
            ? uint8ArrayToBase64url(assertion.response.userHandle)
            : null,
        },
      }),
    });

    const result = await verifyRes.json();

    if (verifyRes.ok && result.success) {
      alert("✅ " + result.message);
      window.location.href = "../Dashboard/dashboard.html";
    } else {
      alert("❌ " + (result.message || "Fingerprint login gagal"));
    }
  } catch (err) {
    console.error("Login fingerprint error:", err);
    // User cancelled the prompt — don't show scary error
    if (err.name === "NotAllowedError") {
      alert("Fingerprint dibatalkan atau tidak dikenali.");
    } else {
      alert("Terjadi error: " + err.message);
    }
  }
}

document
  .getElementById("loginBtn")
  .addEventListener("click", loginFingerprint);