
const API_URL = "http://localhost:5000";
const token = sessionStorage.getItem("token");

const $ = (id) => document.getElementById(id);

// Get Order ID from URL
const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

// Check authentication
if (!token) {
    window.location.replace("login.html");
} else if (!orderId || !/^\d+$/.test(orderId)) {
    $("pageMessage").textContent = "Invalid Order ID";
} else {
    initializeOrderDetails();
}

// API request
async function apiRequest(url) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
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

// Load order details
async function initializeOrderDetails() {
    try {
        // Check Admin Role
        const userData = await apiRequest(`${API_URL}/api/auth/me`);
        const user = userData.user || userData;

        if (user.role !== "admin") {
            alert("Access denied! Admin only.");
            window.location.replace("dashboard.html");
            return;
        }

        const data = await apiRequest(
            `${API_URL}/api/orders/${orderId}`
        );

        const order = data.order || data;
        const items = data.items || order.items || [];

        $("orderId").textContent = `#${order.id}`;
        $("customerName").textContent =
            order.customer_name || "Customer";

        $("orderDate").textContent = order.order_date
            ? new Date(order.order_date).toLocaleString("en-IN")
            : "—";

        $("orderStatus").textContent = order.status || "Pending";

        $("grandTotal").textContent =
            formatCurrency(order.total_amount);

        renderItems(items);

    } catch (error) {
        console.error("Order details error:", error);
        $("pageMessage").textContent = error.message;
        $("itemsBody").innerHTML = `
            <tr>
                <td colspan="4">Unable to load order details</td>
            </tr>
        `;
    }
}

// Render ordered products
function renderItems(items) {
    const tbody = $("itemsBody");
    tbody.replaceChildren();

    if (!Array.isArray(items) || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">No products found in this order</td>
            </tr>
        `;
        return;
    }

    items.forEach(item => {
        const row = document.createElement("tr");

        const productName =
            item.items || item.product_name || item.name || "Product";

        row.append(
            createCell(productName),
            createCell(item.quantity),
            createCell(formatCurrency(item.unit_price)),
            createCell(formatCurrency(item.line_total))
        );

        tbody.appendChild(row);
    });
}

// Create table cell
function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    return cell;
}

// Currency formatter
function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

// Back to Admin Orders
$("backButton").addEventListener("click", () => {
    window.location.href = "admin-orders.html";
});
