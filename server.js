import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import sqlite3 from "sqlite3";
import { promisify } from "util";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const dbFile = process.env.DB_FILE || path.join(__dirname, "data.db");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// SQLite setup
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile);
const run = promisify(db.run.bind(db));

async function initDb() {
    await run(`CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS service_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            service TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS book_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS hire_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Email setup (optional)
const transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        })
    : null;

async function sendNotification(subject, html) {
    if (!transporter) {
        console.log("[notify]", subject, html.replace(/<[^>]+>/g, " "));
        return;
    }
    const to = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
    try {
        await transporter.sendMail({ from: process.env.FROM_EMAIL || to, to, subject, html });
        console.log(`[notify] ✓ Email sent to ${to}: ${subject}`);
    } catch (err) {
        // Log and continue so DB writes still succeed even if email fails
        console.error("[notify] ✗ Failed to send email:", err.message);
        console.error("Full error:", err);
    }
}

// Helpers
function requireFields(body, fields) {
    for (const f of fields) {
        if (!body[f] || String(body[f]).trim() === "") return f;
    }
    return null;
}

// Routes
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/contact", async (req, res) => {
    const missing = requireFields(req.body, ["name", "email", "message"]);
    if (missing) return res.status(400).json({ error: `${missing} is required` });
    const { name, email, message } = req.body;
    try {
        await run(`INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`, [name, email, message]);
        await sendNotification("New contact message", `<p><b>${name}</b> (${email})</p><p>${message}</p>`);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save message" });
    }
});

app.post("/api/services", async (req, res) => {
    const missing = requireFields(req.body, ["name", "email", "service"]);
    if (missing) return res.status(400).json({ error: `${missing} is required` });
    const { name, email, service, details = "" } = req.body;
    try {
        await run(`INSERT INTO service_requests (name, email, service, details) VALUES (?, ?, ?, ?)`, [name, email, service, details]);
        await sendNotification("New service request", `<p><b>${name}</b> (${email})</p><p>Service: ${service}</p><p>${details}</p>`);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save service request" });
    }
});

app.post("/api/buy", async (req, res) => {
    const missing = requireFields(req.body, ["name", "email", "quantity"]);
    if (missing) return res.status(400).json({ error: `${missing} is required` });
    const { name, email, quantity, note = "" } = req.body;
    const qty = Number(quantity) || 1;
    try {
        await run(`INSERT INTO book_orders (name, email, quantity, note) VALUES (?, ?, ?, ?)`, [name, email, qty, note]);
        await sendNotification("New book order", `<p><b>${name}</b> (${email})</p><p>Quantity: ${qty}</p><p>${note}</p>`);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save order" });
    }
});

app.post("/api/hire", async (req, res) => {
    const missing = requireFields(req.body, ["name", "email"]);
    if (missing) return res.status(400).json({ error: `${missing} is required` });
    const { name, email, role = "", details = "" } = req.body;
    try {
        await run(`INSERT INTO hire_requests (name, email, role, details) VALUES (?, ?, ?, ?)`, [name, email, role, details]);
        await sendNotification("New hire inquiry", `<p><b>${name}</b> (${email})</p><p>Role: ${role}</p><p>${details}</p>`);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save hire inquiry" });
    }
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

initDb()
    .then(() => {
        app.listen(port, () => {
            console.log(`server running on port ${port}`);
        });
    })
    .catch((err) => {
        console.error("Failed to initialize database", err);
        process.exit(1);
    });