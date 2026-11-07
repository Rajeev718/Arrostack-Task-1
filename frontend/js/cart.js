
const API_URL = "http://localhost:5000";

const token = sessionStorage.getItem("token");
let cart = JSON.parse(sessionStorage.getItem("cart") || "[]");

const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const totalItems = document.getElementById("totalItems");
const totalAmount = document.getElementById("totalAmount");
const placeOrderButton = document.getElementById("placeOrderButton");
const cartMessage = document.getElementById("cartMessage");

if (!token) {
    window.location.replace("login.html");
}

function saveCart() {
    sessionStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(amount);
}

function renderCart() {
    cartItems.innerHTML = "";

    let itemCount = 0;
    let amount = 0;

    cart.forEach((item, index) => {
        const quantity = Number(item.quantity);
        const price = Number(item.price);

        itemCount += quantity;
        amount += price * quantity;

        const row = document.createElement("div");
        row.className = "cart-item";

        const details = document.createElement("div");
        const name = document.createElement("h3");
        name.textContent = item.name;
        const priceText = document.createElement("p");
        priceText.textContent = formatCurrency(price) + " each";
        const subtotal = document.createElement("p");
        subtotal.textContent = "Subtotal: " +
            formatCurrency(price * quantity);

        details.append(name, priceText, subtotal);

        const actions = document.createElement("div");
        actions.className = "item-actions";

        const quantityInput = document.createElement("input");
        quantityInput.type = "number";
        quantityInput.min = "1";
        quantityInput.max = String(item.stock);
        quantityInput.value = quantity;
        quantityInput.setAttribute("aria-label", "Quantity");

        quantityInput.addEventListener("change", () => {
            const newQuantity = Number(quantityInput.value);

            if (
                !Number.isInteger(newQuantity) ||
                newQuantity < 1 ||
                newQuantity > Number(item.stock)
            ) {
                cartMessage.textContent =
                    `Quantity must be between 1 and ${item.stock}.`;
                quantityInput.value = item.quantity;
                return;
            }

            cart[index].quantity = newQuantity;
            cartMessage.textContent = "";
            saveCart();
        });

        const removeButton = document.createElement("button");
        removeButton.className = "remove-button";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", () => {
            cart.splice(index, 1);
            cartMessage.textContent = "";
            saveCart();
        });

        actions.append(quantityInput, removeButton);
        row.append(details, actions);
        cartItems.appendChild(row);
    });

    cartCount.textContent = itemCount;
    totalItems.textContent = itemCount;
    totalAmount.textContent = formatCurrency(amount);

    placeOrderButton.disabled = cart.length === 0;

    if (cart.length === 0) {
        cartItems.innerHTML =
            '<div class="empty-cart">Your cart is empty. ' +
            '<a href="products.html">Shop now</a></div>';
    }
}

placeOrderButton.addEventListener("click", async () => {
    if (!cart.length || placeOrderButton.disabled) return;

    placeOrderButton.disabled = true;
    cartMessage.textContent = "Placing your order...";

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                items: cart.map(item => ({
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity)
                }))
            })
        });

        const data = await response.json();

        if (response.status === 401) {
            sessionStorage.removeItem("token");
            window.location.replace("login.html");
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || "Could not place order.");
        }

        sessionStorage.removeItem("cart");
        cart = [];
        renderCart();

        cartMessage.textContent =
            `Order placed successfully! Order ID: ${data.order.id}`;

    } catch (error) {
        cartMessage.textContent = error.message;
    } finally {
        placeOrderButton.disabled = cart.length === 0;
    }
});

renderCart();
