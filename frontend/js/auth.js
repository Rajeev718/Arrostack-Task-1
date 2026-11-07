
const API_URL = "http://localhost:5000";

// ================= LOGIN =================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const message = document.getElementById("message");
    const loginButton = document.getElementById("loginButton");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        message.textContent = "";
        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            if (!data.token) {
                throw new Error("Login response did not contain a token");
            }

            sessionStorage.setItem("token", data.token);

            message.textContent = "Login successful! Redirecting...";
            message.style.color = "green";

            window.location.href = "dashboard.html";

        } catch (error) {
            message.textContent = error.message;
            message.style.color = "red";

        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    });
}


// ================= REGISTER =================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    const message = document.getElementById("message");
    const registerButton = document.getElementById("registerButton");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        message.textContent = "";
        registerButton.disabled = true;
        registerButton.textContent = "Registering...";

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            message.textContent = "Registration successful! Redirecting to login...";
            message.style.color = "green";

            registerForm.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);

        } catch (error) {
            message.textContent = error.message;
            message.style.color = "red";

        } finally {
            registerButton.disabled = false;
            registerButton.textContent = "Register";
        }
    });
}
