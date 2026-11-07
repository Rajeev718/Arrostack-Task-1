
const API_URL = "http://localhost:5000";
const token = sessionStorage.getItem("token");

const $ = (id) => document.getElementById(id);

// Authentication check
if (!token) {
    window.location.replace("login.html");
} else {
    loadProfile();
}

// API request helper
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        sessionStorage.removeItem("token");
        window.location.replace("login.html");
        throw new Error("Session expired. Please login again.");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// Load profile information
async function loadProfile() {
    try {
        const data = await apiRequest(`${API_URL}/api/auth/me`);
        const user = data.user || data;

        $("profileName").textContent = user.name || "User";
        $("userName").textContent = user.name || "—";
        $("userEmail").textContent = user.email || "—";
        $("profileRole").textContent = user.role || "customer";
        $("userRole").textContent = user.role || "customer";

        $("profileAvatar").textContent =
            (user.name || "U").trim().charAt(0).toUpperCase();

        $("createdAt").textContent = user.created_at
            ? new Date(user.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
            : "Not available";

    } catch (error) {
        console.error("Profile error:", error);
        $("pageMessage").textContent = error.message;
    }
}

// Change password
$("passwordForm").addEventListener("submit", async event => {
    event.preventDefault();

    const currentPassword = $("currentPassword").value;
    const newPassword = $("newPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (newPassword.length < 8) {
        $("formMessage").textContent =
            "New password must be at least 8 characters.";
        return;
    }

    if (newPassword !== confirmPassword) {
        $("formMessage").textContent =
            "New password and confirm password do not match.";
        return;
    }

    if (currentPassword === newPassword) {
        $("formMessage").textContent =
            "New password must be different from current password.";
        return;
    }

    try {
        $("formMessage").textContent = "Updating password...";

        const data = await apiRequest(
            `${API_URL}/api/auth/change-password`,
            {
                method: "PUT",
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            }
        );

        $("formMessage").textContent =
            data.message || "Password changed successfully!";

        $("passwordForm").reset();

    } catch (error) {
        console.error("Password change error:", error);
        $("formMessage").textContent = error.message;
    }
});

// Back to dashboard
$("backButton").addEventListener("click", () => {
    window.location.href = "dashboard.html";
});

// Sign Out
$("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    window.location.replace("login.html");
});
