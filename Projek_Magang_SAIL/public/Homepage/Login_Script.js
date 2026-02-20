async function login(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login gagal");
      return;
    }

    // ✅ Save to localStorage
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("email", data.email);

    // ✅ Go to fingerprint LOGIN to verify
    window.location.href = "../Fingerprint_Login/fingerprint_login.html";

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    alert("Server mati / ga nyambung");
  }
}

document.getElementById("loginForm").addEventListener("submit", login);