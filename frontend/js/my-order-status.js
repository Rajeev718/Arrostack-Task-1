
const API_URL = "http://localhost:5000";
const token = sessionStorage.getItem("token");

const ordersList = document.getElementById("ordersList");
const ordersMessage = document.getElementById("ordersMessage");

if (!token) {
    window.location.replace("login.html");
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getStatusClass(status) {
    return String(status || "Pending")
        .toLowerCase()
        .replace(/[^a-z-]/g, "");
}

function renderOrders(orders) {
    ordersList.innerHTML = "";

    document.getElementById("totalOrders").textContent =
        orders.length;

    document.getElementById("pendingOrders").textContent =
        orders.filter(order =>
            String(order.status).toLowerCase() === "pending"
        ).length;

    document.getElementById("completedOrders").textContent =
        orders.filter(order =>
            String(order.status).toLowerCase() === "delivered"
        ).length;

    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-orders">
                <h3>No orders yet 📦</h3>
                <p>Your placed orders will appear here.</p>
                <a href="products.html">Browse Products</a>
            </div>
        `;
        return;
    }

    orders.forEach(order => {
        const items = Array.isArray(order.items)
            ? order.items
            : [];

        const itemsHTML = items.length
            ? items.map(item => `
                <div>
                    ${escapeHTML(item.items || item.name || "Product")}
                    × ${Number(item.quantity) || 0}
                    — ${formatCurrency(item.line_total)}
                </div>
            `).join("")
            : "<p>Item details unavailable.</p>";

        const status = order.status || "Pending";
        const card = document.createElement("article");

        card.className = "order-card";

        card.innerHTML = `
            <div class="order-top">
                <div>
                    <h3>Order #${escapeHTML(order.id)}</h3>
                    <div class="order-meta">
                        Date: ${escapeHTML(
                            formatDate(order.order_date)
                        )}
                        <br>
                        Items: ${items.reduce(
                            (sum, item) =>
                                sum + (Number(item.quantity) || 0),
                            0
                        )}
                    </div>
                </div>

                <span class="order-status status-${getStatusClass(status)}">
                    ${escapeHTML(status)}
                </span>
            </div>

            <div class="order-items">
                <strong>Products</strong>
                ${itemsHTML}
            </div>

            <div class="order-total">
                Total: ${formatCurrency(order.total_amount)}
            </div>
        `;

        ordersList.appendChild(card);
    });
}

async function loadOrders() {
    ordersMessage.textContent = "Loading your orders...";
    ordersMessage.className = "";
    ordersList.innerHTML = "";

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem("token");
            window.location.replace("login.html");
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to load orders."
            );
        }

        const orders = Array.isArray(data)
            ? data
            : data.orders || [];

        renderOrders(orders);
        ordersMessage.textContent =
            `Showing ${orders.length} order(s).`;

    } catch (error) {
        ordersMessage.textContent = error.message;
        ordersMessage.className = "error-message";
    }
}

document.getElementById("refreshOrders")
    .addEventListener("click", loadOrders);

document.getElementById("logoutButton")
    .addEventListener("click", () => {
        sessionStorage.removeItem("token");
        window.location.replace("login.html");
    });

if (token) {
    loadOrders();
}
