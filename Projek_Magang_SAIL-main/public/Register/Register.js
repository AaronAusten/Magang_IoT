async function register(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!email || !password || !confirmPassword) {
    alert("All field are required!");
    return;
  }

  if (password !== confirmPassword) {
    alert("Password not matched!");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Register gagal");
      return;
    }

    // 🔥 WAJIB ADA
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("email", email);

    alert("Register Succeed! , Proceed to Authentication!");

    window.location.href =
      "../Fingerprint_Register/fingerprint_register.html";

  } catch (err) {
    console.error(err);
    alert("Failed to connect!");
  }
}
