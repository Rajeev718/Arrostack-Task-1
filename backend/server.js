const express = require('express');
const cors=require('cors');
const pool = require('./db');
require('dotenv').config();
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

app.get('/',(req,res)=>{
    res.send("Hello Rajeev");
})

 
const products = [
  { id: 1, product: 'Laptop', price: 1000, quantity: 10 },
  { id: 2, product: 'Mobile', price: 15000, quantity: 5 },
  { id: 3, product: 'Tablet', price: 5000, quantity: 8 },
  { id: 4, product: 'Headphones', price: 2000, quantity: 15 },
  { id: 5, product: 'Smartwatch', price: 8000, quantity: 12 },
];

app.get('/api/products/:id',(req,res)=>{
  const productId = Number(req.params.id);
  const product = products.find(p => p.id === productId);
  if (!product){
    return res.status(404).json({
      success:false, 
      message: 'Product not found'
    });
  }
  
  res.json({
     product
  });
});

app.get("/api/db-test", async(req,res) =>{
   try{
    const result =await pool.query("SELECT NOW()");
    res.json({
      success:true,
      message: "PostgreSQL connection successful",
      time: result.rows[0].now})
    } catch(error){
      console.error(error.message);
      res.status(500).json({
        success:false,
        message: "Database connection failed",
      });
    }
});

app.get("/api/products",async(req,res) =>{
  try {
    const result =await pool.query(
      "SELECT * FROM products ORDER BY id"

    );
    res.json({
      success:true,
      products:result.rows
    })
  } catch(error){
    console.error(error.message);
    res.status(500).json({
      success:false,
      message: "products fetch nhi ho paya"
    })
  }


})


app.get("/api/products/search", async (req, res) => {
    try {
        const { items } = req.query;

        if (!items || !items.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide product name"
            });
        }

        const result = await pool.query(
            `SELECT * FROM products
             WHERE items ILIKE $1
             ORDER BY id`,
            [`%${items.trim()}%`]
        );

        res.json({
            success: true,
            count: result.rows.length,
            products: result.rows
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Product search failed"
        });
    }
});



app.get("/api/products/filter", async (req, res) => {
    try {
        const { minStock, maxStock } = req.query;

        let query = "SELECT * FROM products WHERE 1=1";
        const values = [];

        if (minStock !== undefined) {
            const min = Number(minStock);

            if (!Number.isInteger(min) || min < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid minimum stock"
                });
            }

            values.push(min);
            query += ` AND stock >= $${values.length}`;
        }

        if (maxStock !== undefined) {
            const max = Number(maxStock);

            if (!Number.isInteger(max) || max < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid maximum stock"
                });
            }

            values.push(max);
            query += ` AND stock <= $${values.length}`;
        }

        if (
            minStock !== undefined &&
            maxStock !== undefined &&
            Number(minStock) > Number(maxStock)
        ) {
            return res.status(400).json({
                success: false,
                message: "minStock cannot be greater than maxStock"
            });
        }

        query += " ORDER BY id";

        const result = await pool.query(query, values);

        res.json({
            success: true,
            count: result.rows.length,
            products: result.rows
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Product filtering failed"
        });
    }
});



app.get("/api/products/search-filter", async (req, res) => {
    try {
        const { items, minStock, maxStock } = req.query;

        let query = "SELECT * FROM products WHERE 1=1";
        const values = [];

        if (items !== undefined) {
            if (!items.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name cannot be empty"
                });
            }

            values.push(`%${items.trim()}%`);
            query += ` AND items ILIKE $${values.length}`;
        }

        if (minStock !== undefined) {
            const min = Number(minStock);

            if (!Number.isInteger(min) || min < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid minimum stock"
                });
            }

            values.push(min);
            query += ` AND stock >= $${values.length}`;
        }

        if (maxStock !== undefined) {
            const max = Number(maxStock);

            if (!Number.isInteger(max) || max < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid maximum stock"
                });
            }

            values.push(max);
            query += ` AND stock <= $${values.length}`;
        }

        if (
            minStock !== undefined &&
            maxStock !== undefined &&
            Number(minStock) > Number(maxStock)
        ) {
            return res.status(400).json({
                success: false,
                message: "minStock cannot be greater than maxStock"
            });
        }

        query += " ORDER BY id";

        const result = await pool.query(query, values);

        res.json({
            success: true,
            count: result.rows.length,
            products: result.rows
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Search and filter failed"
        });
    }
});



app.get("/api/products/:id", async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const result = await pool.query(
            "SELECT * FROM products WHERE id = $1",
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            product: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});


app.post("/api/products",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
    try {
        const { items, price, stock } = req.body;

        if (
            typeof items !== "string" ||
            !items.trim() ||
            price === undefined ||
            price === null ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !Number.isInteger(Number(stock)) ||
            Number(stock) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid items, price and stock are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO products (items, price, stock)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [items.trim(), Number(price), Number(stock)]
        );

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create product"
        });
      }
});



app.put("/api/products/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {

    try {
        const productId = Number(req.params.id);
        const { items, price, stock } = req.body;

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (
            typeof items !== "string" ||
            !items.trim() ||
            price === undefined ||
            price === null ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !Number.isInteger(Number(stock)) ||
            Number(stock) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid items, price and stock are required"
            });
        }

        const result = await pool.query(
            `UPDATE products
             SET items = $1, price = $2, stock = $3
             WHERE id = $4
             RETURNING *`,
            [items.trim(), Number(price), Number(stock), productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully",
            product: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            success: false,
            message: "Failed to update product"
        });
    }
});



app.delete("/api/products/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {

    try {
        const productId = Number(req.params.id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }
        
        
        const orderCheck = await pool.query(
            "SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1",
            [productId]
        );

        if (orderCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this product because it is used in existing orders"
            });
        }



        const result = await pool.query(
            "DELETE FROM products WHERE id = $1 RETURNING *",
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully",
            product: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete product"
        });
    }
});



/* ========== ORDERS MANAGEMENT ========== */

// 1. CREATE ORDER

app.post("/api/orders",
    authenticateToken,
    async (req, res) => {

    const client = await pool.connect();

    try {
        const { items } = req.body;
        const userId = req.user.id;

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) { 
            return res.status(400).json({
                success: false,
                message: "Order items are required"
            });
        }

        // Validate product IDs and quantities
        const seen = new Set();

        for (const item of items) {
            if (
                !Number.isSafeInteger(item.product_id) ||
                item.product_id <= 0 ||
                !Number.isSafeInteger(item.quantity) ||
                item.quantity <= 0 ||
                seen.has(item.product_id)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Each product needs a unique valid ID and positive quantity"
                });
            }

            seen.add(item.product_id);
        }

        await client.query("BEGIN");

        // Lock products while checking and reducing stock
        const productIds = items
            .map(item => item.product_id)
            .sort((a, b) => a - b);

        const productResult = await client.query(
            `SELECT id, items, price, stock
             FROM products
             WHERE id = ANY($1::int[])
             ORDER BY id
             FOR UPDATE`,
            [productIds]
        );

        if (productResult.rows.length !== items.length) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "One or more products do not exist"
            });
        }

        const productMap = new Map(
            productResult.rows.map(product => [
                product.id,
                product
            ])
        );

        let totalAmount = 0;
        const orderLines = [];

        for (const item of items) {
            const product = productMap.get(item.product_id);

            if (product.stock < item.quantity) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.items}`
                });
            }

            const unitPrice = Number(product.price);
            const lineTotal = unitPrice * item.quantity;

            if (
                !Number.isFinite(lineTotal) ||
                !Number.isFinite(totalAmount + lineTotal)
            ) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    success: false,
                    message: "Order amount is too large"
                });
            }

            totalAmount += lineTotal;

            orderLines.push({
                product_id: product.id,
                quantity: item.quantity,
                unit_price: unitPrice,
                line_total: lineTotal
            });
        }

        // Create the order
        
        const userResult = await client.query(
            "SELECT id, name FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(401).json({
                success: false,
                message: "Authenticated user not found"
            });
        }

        const customerName = userResult.rows[0].name;

        const orderResult = await client.query(
            `INSERT INTO orders
                (user_id, customer_name, total_amount)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [userId, customerName, totalAmount]
        );


        const order = orderResult.rows[0];

        // Save items and reduce stock
        for (const line of orderLines) {
            await client.query(
                `INSERT INTO order_items
                    (order_id, product_id, quantity,
                     unit_price, line_total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    order.id,
                    line.product_id,
                    line.quantity,
                    line.unit_price,
                    line.line_total
                ]
            );

            await client.query(
                `UPDATE products
                 SET stock = stock - $1
                 WHERE id = $2`,
                [line.quantity, line.product_id]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order: order,
            items: orderLines
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create order"
        });
    } finally {
        client.release();
    }
});


// 2. GET ALL ORDERS


app.get("/api/orders",
    authenticateToken,
    async (req, res) => {


    try {
        const result = await pool.query(
            `SELECT
                o.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'product_id', oi.product_id,
                            'items', p.items,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'line_total', oi.line_total
                        )
                    ) FILTER (WHERE oi.id IS NOT NULL),
                    '[]'::json
                ) AS items
            
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE (
                    $1 = 'admin'
                    OR o.user_id = $2
                )
                GROUP BY o.id
            ORDER BY o.id DESC`,
            [req.user.role, req.user.id]
        );

        res.json({
            success: true,
            count: result.rows.length,
            orders: result.rows
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch orders"
        });
    }
});


// 3. GET ONE ORDER WITH ITS ITEMS


app.get(
    "/api/orders/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const orderId = Number(req.params.id);

            // Validate order ID
            if (!Number.isInteger(orderId) || orderId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order ID"
                });
            }

            // Admin can access all orders.
            // Customer can access only their own orders.
            const orderResult = await pool.query(
                `SELECT *
                 FROM orders
                 WHERE id = $1
                   AND ($2 = 'admin' OR user_id = $3)`,
                [orderId, req.user.role, req.user.id]
            );

            if (orderResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            const order = orderResult.rows[0];

            // Fetch products belonging to this order
            const itemsResult = await pool.query(
                `SELECT
                    oi.product_id,
                    p.items,
                    oi.quantity,
                    oi.unit_price,
                    oi.line_total
                 FROM order_items oi
                 LEFT JOIN products p
                    ON p.id = oi.product_id
                 WHERE oi.order_id = $1`,
                [orderId]
            );

            return res.status(200).json({
                success: true,
                order: order,
                items: itemsResult.rows
            });

        } catch (error) {
            console.error("GET /api/orders/:id Error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch order"
            });
        }
    }
);



// 4. UPDATE ORDER STATUS

app.patch("/api/orders/:id/status",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {

    try {
        const orderId = Number(req.params.id);
        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });
        }

        const result = await pool.query(
            `UPDATE orders
             SET status = $1
             WHERE id = $2
               AND status <> 'Cancelled'
               AND (
                   status <> 'Delivered'
                   OR status = $1
               )
             RETURNING *`,
            [status, orderId]
        );

        if (result.rows.length === 0) {
            const existing = await pool.query(
                "SELECT id, status FROM orders WHERE id = $1",
                [orderId]
            );

            if (existing.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            return res.status(400).json({
                success: false,
                message: "This order status cannot be changed"
            });
        }

        res.json({
            success: true,
            message: "Order status updated",
            order: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update order status"
        });
    }
});


// 5. DELETE A PENDING ORDER

app.delete("/api/orders/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {

    const client = await pool.connect();

    try {
        const orderId = Number(req.params.id);

        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        await client.query("BEGIN");

        const orderResult = await client.query(
            `SELECT * FROM orders
             WHERE id = $1
             FOR UPDATE`,
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const order = orderResult.rows[0];

        if (order.status !== "Pending") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Only pending orders can be deleted"
            });
        }

        const itemsResult = await client.query(
            `SELECT product_id, quantity
             FROM order_items
             WHERE order_id = $1`,
            [orderId]
        );

        // Restore stock before removing the order
        for (const item of itemsResult.rows) {
            await client.query(
                `UPDATE products
                 SET stock = stock + $1
                 WHERE id = $2`,
                [item.quantity, item.product_id]
            );
        }

        await client.query(
            "DELETE FROM orders WHERE id = $1",
            [orderId]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Pending order deleted and stock restored"
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete order"
        });
    } finally {
        client.release();
    }
});




const bcrypt = require("bcrypt");

// USER REGISTRATION API
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 8
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, valid email and password of at least 8 characters are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Check whether email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Save user in PostgreSQL
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, role, created_at`,
            [name.trim(), normalizedEmail, passwordHash]
        );

        // Send response without password
        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: result.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
});




app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user by email
        const result = await pool.query(
            `SELECT id, name, email, password_hash, role
             FROM users
             WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Compare submitted password with stored hash
        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1h"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});



function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    // Check whether token was sent
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access token required"
        });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        req.user = user;
        next();
    });
}


app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Authentication successful",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Auth me error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch user information"
        });
    }
});


app.put("/api/auth/change-password",
    authenticateToken,
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (
                typeof currentPassword !== "string" ||
                !currentPassword ||
                typeof newPassword !== "string" ||
                newPassword.length < 8
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid current password and new password (minimum 8 characters) are required"
                });
            }

            // Find logged-in user
            const result = await pool.query(
                "SELECT id, password_hash FROM users WHERE id = $1",
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            const user = result.rows[0];

            // Verify current password
            const isMatch = await bcrypt.compare(
                currentPassword,
                user.password_hash
            );

            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Current password is incorrect"
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            await pool.query(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                [hashedPassword, req.user.id]
            );

            res.json({
                success: true,
                message: "Password changed successfully"
            });

        } catch (error) {
            console.error("Change password error:", error.message);

            res.status(500).json({
                success: false,
                message: "Failed to change password"
            });
        }
    }
);




function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource"
            });
        }

        next();
    };
}



app.get(
    "/api/admin-test",
    authenticateToken,
    authorizeRole("admin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Welcome, Admin!",
            user: req.user
        });
    }
);


const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
  console.log(`http://localhost:${PORT}`)
});