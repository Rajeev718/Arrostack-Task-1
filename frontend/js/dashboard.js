
const API_URL = "http://localhost:5000";
const token = sessionStorage.getItem("token");

const $ = (id) => document.getElementById(id);

let allProducts = [];
let allOrders = [];   

if (!token) {
    window.location.replace("login.html");
} else {
    initializeDashboard();
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

async function initializeDashboard() {
    $("todayDate").textContent = new Date().toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

    try {
        const data = await apiRequest(`${API_URL}/api/auth/me`);
        const user = data.user || data;

        $("topUserName").textContent = user.name || "User";
        $("topUserRole").textContent = user.role || "customer";
        $("welcomeName").textContent = user.name || "there";
        $("userAvatar").textContent =
            (user.name || "U").trim().charAt(0).toUpperCase();
        // Show Orders Management only for Admin
        const adminOrdersLink = $("adminOrdersLink");

        if (adminOrdersLink && user.role === "admin") {
          adminOrdersLink.style.display = "block";
        }

        // Show Product Management only for Admin
        const adminProductsLink = $("adminProductsLink");
              
        if (adminProductsLink && user.role === "admin") {
            adminProductsLink.style.display = "block";
        }

        await Promise.all([
            loadProducts(),
            loadOrders()
        ]);

      } catch (error) {
         console.error("Dashboard initialization:", error);
        
         const pageMessage = $("pageMessage");
        
         if (pageMessage) {
             pageMessage.textContent =
                 error.message || "Unable to load dashboard.";
         }
      }
}

async function loadProducts() {
    try {
        const data = await apiRequest(`${API_URL}/api/products`);

        allProducts = Array.isArray(data)
            ? data
            : data.products || [];

        if (!Array.isArray(allProducts)) {
            throw new Error("Invalid products response");
        }

        $("totalProducts").textContent = allProducts.length;
        renderProducts(allProducts);

    } catch (error) {
    console.error("Products error:", error);

    const productsBody = $("productsBody");

    if (productsBody) {
        productsBody.innerHTML = "";

        showTableMessage(
            "productsBody",
            4,
            "Unable to load products"
        );
    }
}
}

async function loadOrders() {
    try {
        const data = await apiRequest(`${API_URL}/api/orders`);

        allOrders = Array.isArray(data)
            ? data
            : data.orders || [];

        if (!Array.isArray(allOrders)) {
            throw new Error("Invalid orders response");
        }

        const pending = allOrders.filter(
            order => String(order.status).toLowerCase() === "pending"
        ).length;

        const totalValue = allOrders.reduce(
            (sum, order) => sum + Number(order.total_amount || 0),
            0
        );

        $("totalOrders").textContent = allOrders.length;
        $("pendingOrders").textContent = pending;
        $("totalRevenue").textContent = formatCurrency(totalValue);

        renderOrders(allOrders);

    } catch (error) {
      console.error("Orders error:", error);

      const ordersBody = $("ordersBody");

      if (ordersBody) {
        ordersBody.innerHTML = "";

        showTableMessage(
            "ordersBody",
            5,
            "Unable to load orders"
        );
      }
    }
}

function renderProducts(products) {
    const tbody = $("productsBody");
    tbody.replaceChildren();

    $("productCount").textContent =
        `${products.length} product${products.length === 1 ? "" : "s"}`;

    if (products.length === 0) {
        showTableMessage("productsBody", 4, "No products found");
        return;
    }

    products.forEach(product => {
        const row = document.createElement("tr");

        const name = product.items || product.name || "Unnamed product";
        const stock = Number(product.stock || 0);

        let stockClass = "stock-good";
        let stockText = "In Stock";

        if (stock <= 0) {
            stockClass = "stock-out";
            stockText = "Out of Stock";
        } else if (stock <= 5) {
            stockClass = "stock-low";
            stockText = "Low Stock";
        }

        row.append(
            createCell(`#${product.id}`, "product-id"),
            createCell(name, "product-name"),
            createCell(formatCurrency(product.price)),
            createBadgeCell(`${stock} · ${stockText}`, stockClass)
        );

        tbody.appendChild(row);
    });
}

function renderOrders(orders) {
    const tbody = $("ordersBody");
    tbody.replaceChildren();

    $("orderCount").textContent =
        `${orders.length} order${orders.length === 1 ? "" : "s"}`;

    if (orders.length === 0) {
        showTableMessage("ordersBody", 5, "No orders found");
        return;
    }

    orders.slice(0, 10).forEach(order => {
        const row = document.createElement("tr");

        const date = order.order_date
            ? new Date(order.order_date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
            : "—";

        const status = String(order.status || "Pending").toLowerCase();
        const knownStatuses = [
            "pending", "confirmed", "shipped",
            "delivered", "cancelled"
        ];

        const statusClass = knownStatuses.includes(status)
            ? `status-${status}`
            : "status-pending";

        row.append(
            createCell(`#${order.id}`, "order-id"),
            createCell(order.customer_name || "Customer"),
            createCell(date),
            createCell(formatCurrency(order.total_amount)),
            createBadgeCell(
                capitalize(order.status || "Pending"),
                statusClass
            )
        );

        tbody.appendChild(row);
    });
}

function createCell(value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";

    if (className) {
        cell.className = className;
    }

    return cell;
}

function createBadgeCell(value, className) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = `status-badge ${className}`;
    badge.textContent = value;

    cell.appendChild(badge);
    return cell;
}

function showTableMessage(bodyId, columns, message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = columns;
    cell.className = "table-message";
    cell.textContent = message;

    row.appendChild(cell);
    $(bodyId).appendChild(row);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

$("productSearch").addEventListener("input", event => {
    const query = event.target.value.toLowerCase().trim();

    renderProducts(
        allProducts.filter(product =>
            String(product.items || product.name || "")
                .toLowerCase()
                .includes(query) ||
            String(product.id).includes(query)
        )
    );
});

$("orderSearch").addEventListener("input", event => {
    const query = event.target.value.toLowerCase().trim();

    renderOrders(
        allOrders.filter(order =>
            String(order.id).includes(query) ||
            String(order.customer_name || "")
                .toLowerCase()
                .includes(query) ||
            String(order.status || "")
                .toLowerCase()
                .includes(query)
        )
    );
});

$("refreshProducts").addEventListener("click", loadProducts);
$("refreshOrders").addEventListener("click", loadOrders);

$("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    window.location.replace("login.html");
});

$("menuButton").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
        $("sidebar").classList.remove("open");
    });
});




// const API_URL = "http://localhost:5000";
// const token = sessionStorage.getItem("token");
// const $ = id => document.getElementById(id);
// let allProducts = [], allOrders = [];

// if (!token) window.location.replace("login.html");
// else initializeDashboard();

// async function apiRequest(url) {
//   const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//   if (response.status === 401) {
//     sessionStorage.removeItem("token");
//     window.location.replace("login.html");
//     throw new Error("Session expired. Please login again.");
//   }
//   const data = await response.json();
//   if (!response.ok) throw new Error(data.message || "Request failed");
//   return data;
// }
// async function initializeDashboard() {
//   $("todayDate").textContent = new Date().toLocaleDateString("en-IN", {weekday:"long",day:"numeric",month:"short",year:"numeric"});
//   try {
//     const data = await apiRequest(`${API_URL}/api/auth/me`), user = data.user || data;
//     $("topUserName").textContent = user.name || "User";
//     $("topUserRole").textContent = user.role || "customer";
//     $("welcomeName").textContent = user.name || "there";
//     $("userAvatar").textContent = (user.name || "U").trim()[0].toUpperCase();
//     await Promise.all([loadProducts(), loadOrders()]);
//   } catch (error) { console.error(error); $("pageMessage").textContent = error.message || "Unable to load dashboard."; }
// }
// async function loadProducts() {
//   try {
//     const data = await apiRequest(`${API_URL}/api/products`);
//     allProducts = Array.isArray(data) ? data : data.products || [];
//     if (!Array.isArray(allProducts)) throw new Error("Invalid products response");
//     $("totalProducts").textContent = allProducts.length; renderProducts(allProducts); renderLowStock();
//   } catch (error) { console.error(error); $("productsBody").replaceChildren(); showTableMessage("productsBody",5,"Unable to load products"); $("totalProducts").textContent = "—"; $("lowStockList").textContent = "Unable to load stock information."; }
// }
// async function loadOrders() {
//   try {
//     const data = await apiRequest(`${API_URL}/api/orders`);
//     allOrders = Array.isArray(data) ? data : data.orders || [];
//     if (!Array.isArray(allOrders)) throw new Error("Invalid orders response");
//     $("totalOrders").textContent = allOrders.length;
//     $("pendingOrders").textContent = allOrders.filter(o => String(o.status).toLowerCase() === "pending").length;
//     $("totalRevenue").textContent = formatCurrency(allOrders.reduce((sum,o) => sum + Number(o.total_amount || 0),0)); renderOrders(allOrders);
//   } catch (error) { console.error(error); $("recentOrders").textContent = "Unable to load orders."; $("totalOrders").textContent = $("pendingOrders").textContent = $("totalRevenue").textContent = "—"; }
// }
// function renderProducts(products) {
//   const tbody = $("productsBody"); tbody.replaceChildren();
//   $("productCount").textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;
//   if (!products.length) return showTableMessage("productsBody",5,"No products found");
//   products.forEach(p => {
//     const stock = Number(p.stock || 0); let cls = "stock-good", status = "In Stock";
//     if (stock <= 0) { cls = "stock-out"; status = "Out of Stock"; } else if (stock <= 5) { cls = "stock-low"; status = "Low Stock"; }
//     const tr = document.createElement("tr");
//     tr.append(cell(`#${p.id}`,"product-id"),cell(p.items || p.name || "Unnamed product","product-name"),cell(formatCurrency(p.price),"price"),cell(stock),badgeCell(status,cls)); tbody.appendChild(tr);
//   });
// }
// function renderOrders(orders) {
//   const box = $("recentOrders"); box.replaceChildren();
//   if (!orders.length) { box.textContent = "No orders available."; return; }
//   orders.slice(0,5).forEach(o => {
//     const row = document.createElement("div"); row.className = "recent-order";
//     const icon = document.createElement("div"); icon.className = "order-symbol"; icon.textContent = "🛒";
//     const main = document.createElement("div"); main.className = "order-main";
//     const id = document.createElement("strong"); id.textContent = `#ORD-${String(o.id).padStart(4,"0")}`;
//     const customer = document.createElement("span"); customer.textContent = o.customer_name || "Customer"; main.append(id,customer);
//     const end = document.createElement("div"); end.className = "order-end";
//     const amount = document.createElement("strong"); amount.className = "order-amount"; amount.textContent = formatCurrency(o.total_amount);
//     const status = String(o.status || "Pending").toLowerCase(), allowed = ["pending","confirmed","shipped","delivered","cancelled"];
//     const badge = document.createElement("span"); badge.className = `status-badge ${allowed.includes(status) ? `status-${status}` : "status-pending"}`; badge.textContent = capitalize(o.status || "Pending"); end.append(amount,badge); row.append(icon,main,end); box.appendChild(row);
//   });
// }
// function renderLowStock() {
//   const box = $("lowStockList"); box.replaceChildren(); const low = allProducts.filter(p => Number(p.stock || 0) <= 10).slice(0,5);
//   if (!low.length) { box.textContent = "All products have healthy stock levels."; return; }
//   low.forEach(p => { const row=document.createElement("div");row.className="low-stock-row";const icon=document.createElement("div");icon.className="low-stock-symbol";icon.textContent=Number(p.stock||0)<=0?"⚠️":"📦";const info=document.createElement("div");info.className="low-stock-info";const name=document.createElement("strong");name.textContent=p.items||p.name||"Product";const stock=document.createElement("span");stock.className=Number(p.stock||0)<=5?"low":"";stock.textContent=`${Number(p.stock||0)} in stock`;info.append(name,stock);row.append(icon,info);box.appendChild(row); });
// }
// function cell(value,cls=""){const td=document.createElement("td");td.textContent=value??"—";if(cls)td.className=cls;return td;}
// function badgeCell(value,cls){const td=document.createElement("td"),badge=document.createElement("span");badge.className=`stock-badge ${cls}`;badge.textContent=value;td.appendChild(badge);return td;}
// function showTableMessage(id,span,message){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=span;td.className="table-message";td.textContent=message;tr.appendChild(td);$(id).appendChild(tr);}
// function formatCurrency(value){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value)||0);}
// function capitalize(value){value=String(value);return value.charAt(0).toUpperCase()+value.slice(1).toLowerCase();}
// $("productSearch").addEventListener("input",e=>{const q=e.target.value.toLowerCase().trim();renderProducts(allProducts.filter(p=>String(p.items||p.name||"").toLowerCase().includes(q)||String(p.id).includes(q)));});
// $("globalSearch").addEventListener("input",e=>{const q=e.target.value.toLowerCase().trim();$("productSearch").value=q;renderProducts(allProducts.filter(p=>String(p.items||p.name||"").toLowerCase().includes(q)||String(p.id).includes(q)));renderOrders(allOrders.filter(o=>String(o.id).includes(q)||String(o.customer_name||"").toLowerCase().includes(q)||String(o.status||"").toLowerCase().includes(q)));});
// $("refreshProducts").addEventListener("click",loadProducts);$("logoutButton").addEventListener("click",()=>{sessionStorage.removeItem("token");window.location.replace("login.html");});$("menuButton").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
// document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>{document.querySelectorAll(".nav-link").forEach(x=>x.classList.remove("active"));a.classList.add("active");$("sidebar").classList.remove("open");}));
