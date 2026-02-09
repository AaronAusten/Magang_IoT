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