
const API_URL = "http://localhost:5000";
const token = sessionStorage.getItem("token");

const $ = (id) => document.getElementById(id);

let allProducts = [];

// Check authentication
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

        await loadProducts();

    } catch (error) {
        console.error(error);
        $("pageMessage").textContent = error.message;
    }
}

// Load products
async function loadProducts() {
    try {
        const data = await apiRequest(`${API_URL}/api/products`);

        allProducts = Array.isArray(data)
            ? data
            : data.products || [];

        $("totalProducts").textContent = allProducts.length;

        renderProducts(allProducts);

    } catch (error) {
        console.error("Products error:", error);
        $("pageMessage").textContent = error.message;
    }
}

// Render products
function renderProducts(products) {
    const tbody = $("productsBody");
    tbody.replaceChildren();

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No products found</td>
            </tr>
        `;
        return;
    }

    products.forEach(product => {
        const row = document.createElement("tr");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";

        editButton.addEventListener("click", () => {
            editProduct(product);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";

        deleteButton.addEventListener("click", () => {
            deleteProduct(product.id);
        });

        const actionCell = document.createElement("td");
        actionCell.append(editButton, deleteButton);

        row.append(
            createCell(product.id),
            createCell(product.items || product.name),
            createCell(formatCurrency(product.price)),
            createCell(product.stock),
            actionCell
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

// Add or Update product
$("productForm").addEventListener("submit", async event => {
    event.preventDefault();

    const productId = $("productId").value;

    const productData = {
        items: $("productName").value.trim(),
        price: Number($("productPrice").value),
        stock: Number($("productStock").value)
    };

    if (
        !productData.items ||
        !Number.isFinite(productData.price) ||
        productData.price <= 0 ||
        !Number.isInteger(productData.stock) ||
        productData.stock < 0
    ) {
        $("formMessage").textContent = "Please enter valid product details.";
        return;
    }

    try {
        const url = productId
            ? `${API_URL}/api/products/${productId}`
            : `${API_URL}/api/products`;

        const data = await apiRequest(url, {
            method: productId ? "PUT" : "POST",
            body: JSON.stringify(productData)
        });

        $("formMessage").textContent =
            data.message || "Product saved successfully!";

        resetForm();
        await loadProducts();

    } catch (error) {
        console.error(error);
        $("formMessage").textContent = error.message;
    }
});

// Edit product
function editProduct(product) {
    $("productId").value = product.id;
    $("productName").value = product.items || product.name || "";
    $("productPrice").value = product.price;
    $("productStock").value = product.stock;

    $("formTitle").textContent = "Edit Product";
    $("submitButton").textContent = "Update Product";
    $("cancelEdit").hidden = false;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// Reset form
function resetForm() {
    $("productForm").reset();
    $("productId").value = "";

    $("formTitle").textContent = "Add New Product";
    $("submitButton").textContent = "Add Product";
    $("cancelEdit").hidden = true;
}

// Delete product
async function deleteProduct(productId) {
    const confirmed = confirm(
        `Are you sure you want to delete Product #${productId}?`
    );

    if (!confirmed) return;

    try {
        const data = await apiRequest(
            `${API_URL}/api/products/${productId}`,
            {
                method: "DELETE"
            }
        );

        alert(data.message || "Product deleted successfully!");

        await loadProducts();

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

// Search products
$("productSearch").addEventListener("input", event => {
    const query = event.target.value.toLowerCase().trim();

    const filteredProducts = allProducts.filter(product =>
        String(product.items || product.name || "")
            .toLowerCase()
            .includes(query) ||
        String(product.id).includes(query)
    );

    renderProducts(filteredProducts);
});

// Refresh products
$("refreshProducts").addEventListener("click", loadProducts);

// Cancel edit
$("cancelEdit").addEventListener("click", resetForm);

// Back to dashboard
$("backButton").addEventListener("click", () => {
    window.location.href = "dashboard.html";
});
