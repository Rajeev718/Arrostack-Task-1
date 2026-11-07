
const API_URL = "http://localhost:5000";
const token = sessionStorage.getItem("token");

const productsGrid = document.getElementById("productsGrid");
const productSearch = document.getElementById("productSearch");
const message = document.getElementById("message");

let allProducts = [];
let cart = JSON.parse(sessionStorage.getItem("cart") || "[]");

if (!token) {
    window.location.replace("login.html");
} else {
    loadProducts();
    updateCartCount();
    loadCustomer();
}

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

async function loadCustomer() {
    try {
        const data = await apiRequest(`${API_URL}/api/auth/me`);
        const user = data.user || data;

        document.getElementById("customerName").textContent =
            `Hi, ${user.name || "Customer"}`;
    } catch (error) {
        console.error(error);
    }
}

async function loadProducts() {
    productsGrid.textContent = "Loading products...";

    try {
        const data = await apiRequest(`${API_URL}/api/products`);

        allProducts = Array.isArray(data)
            ? data
            : data.products || [];

        if (!Array.isArray(allProducts)) {
            throw new Error("Invalid products response");
        }

        renderProducts(allProducts);
    } catch (error) {
        productsGrid.textContent = error.message;
    }
}

function renderProducts(products) {
    productsGrid.replaceChildren();

    document.getElementById("productCount").textContent =
        `${products.length} products available`;

    if (products.length === 0) {
        productsGrid.textContent = "No products found.";
        return;
    }

    products.forEach(product => {
        const stock = Number(product.stock || 0);
        const card = document.createElement("article");
        card.className = "product-card";

        const visual = document.createElement("div");
        visual.className = "product-visual";
        visual.textContent = getProductEmoji(
            product.items || product.name || ""
        );

        const id = document.createElement("span");
        id.className = "product-id";
        id.textContent = `PRODUCT #${product.id}`;

        const name = document.createElement("h3");
        name.textContent = product.items || product.name || "Product";

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = formatCurrency(product.price);

        const stockText = document.createElement("p");
        stockText.className = "product-stock";
        stockText.textContent = stock > 0
            ? `${stock} units available`
            : "Out of stock";

        const label = document.createElement("label");
        label.className = "quantity-label";
        label.textContent = "Quantity";

        const quantity = document.createElement("input");
        quantity.className = "quantity-input";
        quantity.type = "number";
        quantity.min = "1";
        quantity.max = String(stock);
        quantity.value = stock > 0 ? "1" : "0";
        quantity.disabled = stock <= 0;
        quantity.setAttribute("aria-label", `Quantity for ${name.textContent}`);

        const button = document.createElement("button");
        button.className = "add-to-cart";
        button.type = "button";
        button.textContent = stock > 0 ? "🛒 Add to Cart" : "Out of Stock";
        button.disabled = stock <= 0;

        button.addEventListener("click", () => {
            const qty = Number(quantity.value);

            if (!Number.isInteger(qty) || qty < 1 || qty > stock) {
                message.style.color = "#c62828";
                message.textContent =
                    `Enter a quantity between 1 and ${stock}.`;
                return;
            }

            addToCart(product, qty);
            message.style.color = "#087f56";
            message.textContent = `${name.textContent} added to cart.`;
        });

        card.append(visual, id, name, price, stockText, label, quantity, button);
        productsGrid.appendChild(card);
    });
}

function addToCart(product, quantity) {
    const productId = Number(product.id);
    const existing = cart.find(item => item.product_id === productId);
    const newQuantity = (existing ? existing.quantity : 0) + quantity;

    if (newQuantity > Number(product.stock)) {
        message.style.color = "#c62828";
        message.textContent = "Cart quantity exceeds available stock.";
        return;
    }

    if (existing) {
        existing.quantity = newQuantity;
    } else {
        cart.push({
            product_id: productId,
            name: product.items || product.name || "Product",
            price: Number(product.price),
            stock: Number(product.stock),
            quantity
        });
    }

    sessionStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById("cartCount").textContent = count;
}

function getProductEmoji(name) {
    const value = name.toLowerCase();

    if (value.includes("laptop")) return "💻";
    if (value.includes("mobile") || value.includes("phone")) return "📱";
    if (value.includes("tablet")) return "📲";
    if (value.includes("mouse")) return "🖱️";
    if (value.includes("keyboard")) return "⌨️";
    if (value.includes("headphone") || value.includes("earbud")) return "🎧";
    if (value.includes("adapter") || value.includes("charger")) return "🔌";

    return "📦";
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

productSearch.addEventListener("input", () => {
    const query = productSearch.value.toLowerCase().trim();

    renderProducts(allProducts.filter(product =>
        String(product.items || product.name || "")
            .toLowerCase().includes(query)
    ));
});

document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    window.location.replace("login.html");
});
