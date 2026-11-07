
const API_URL = "http://localhost:5000";
const token = sessionStorage.getItem("token");

const $ = (id) => document.getElementById(id);

let allOrders = [];

const statuses = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Cancelled"
];

// Check login
if (!token) {
    window.location.replace("login.html");
} else {
    initializePage();
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

// Initialize page
async function initializePage() {
    try {
        const data = await apiRequest(`${API_URL}/api/auth/me`);
        const user = data.user || data;

        if (user.role !== "admin") {
            alert("Access denied! Admin only.");
            window.location.replace("dashboard.html");
            return;
        }

        await loadOrders();

    } catch (error) {
        console.error(error);
        $("pageMessage").textContent = error.message;
    }
}

// Load all orders
async function loadOrders() {
    try {
        const data = await apiRequest(`${API_URL}/api/orders`);

        allOrders = Array.isArray(data)
            ? data
            : data.orders || [];

        $("totalOrders").textContent = allOrders.length;

        $("pendingOrders").textContent = allOrders.filter(
            order => order.status.toLowerCase() === "pending"
        ).length;

        renderOrders(allOrders);

    } catch (error) {
        console.error("Orders loading error:", error);
        $("pageMessage").textContent = error.message;
    }
}

// Render orders
function renderOrders(orders) {
    const tbody = $("ordersBody");
    tbody.replaceChildren();

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">No orders found</td>
            </tr>
        `;
        return;
    }

    orders.forEach(order => {
        const row = document.createElement("tr");

        const date = order.order_date
            ? new Date(order.order_date).toLocaleDateString("en-IN")
            : "—";

        const statusSelect = document.createElement("select");
        statusSelect.className = "status-select";

        statuses.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            option.selected =
                status.toLowerCase() ===
                String(order.status).toLowerCase();

            statusSelect.appendChild(option);
        });

        statusSelect.addEventListener("change", () => {
            updateOrderStatus(order.id, statusSelect.value);
        });

        const actionCell = document.createElement("td");
        const viewButton = document.createElement("button");

        viewButton.textContent = "View Details";
        viewButton.className = "view-btn";
              
        viewButton.addEventListener("click", () => {
            window.location.href = `order-details.html?id=${order.id}`;
        });
        
        actionCell.appendChild(viewButton);
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";

        deleteButton.disabled =
            String(order.status).toLowerCase() !== "pending";

        deleteButton.addEventListener("click", () => {
            deleteOrder(order.id);
        });

        actionCell.appendChild(deleteButton);

        row.append(
            createCell(`#${order.id}`),
            createCell(order.customer_name || "Customer"),
            createCell(date),
            createCell(formatCurrency(order.total_amount))
        );

        const statusCell = document.createElement("td");
        statusCell.appendChild(statusSelect);

        row.append(statusCell, actionCell);

        tbody.appendChild(row);
    });
}

// Create table cell
function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    return cell;
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        const data = await apiRequest(
            `${API_URL}/api/orders/${orderId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({ status })
            }
        );

        alert(data.message || "Order status updated successfully!");

        await loadOrders();

    } catch (error) {
        alert(error.message);
        await loadOrders();
    }
}

// Delete order
async function deleteOrder(orderId) {
    const confirmDelete = confirm(
        `Are you sure you want to delete Order #${orderId}?`
    );

    if (!confirmDelete) return;

    try {
        const data = await apiRequest(
            `${API_URL}/api/orders/${orderId}`,
            {
                method: "DELETE"
            }
        );

        alert(data.message || "Order deleted successfully!");

        await loadOrders();

    } catch (error) {
        alert(error.message);
    }
}

// Currency formatter
function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

// Search orders
$("orderSearch").addEventListener("input", event => {
    const query = event.target.value.toLowerCase().trim();

    const filteredOrders = allOrders.filter(order =>
        String(order.id).includes(query) ||
        String(order.customer_name || "")
            .toLowerCase()
            .includes(query) ||
        String(order.status || "")
            .toLowerCase()
            .includes(query)
    );

    renderOrders(filteredOrders);
});

// Refresh
$("refreshOrders").addEventListener("click", loadOrders);

// Back to dashboard
$("backButton").addEventListener("click", () => {
    window.location.href = "dashboard.html";
});
