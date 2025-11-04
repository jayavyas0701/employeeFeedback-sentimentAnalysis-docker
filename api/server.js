import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import pkg from "pg";

const { Pool } = pkg;

// --- env ---
const {
    PORT = 3000,
    DB_HOST = "localhost",
    DB_PORT = "5432",
    DB_USER = "app",
    DB_PASSWORD = "app",
    DB_DATABASE = "portal",
    ADMIN_API_KEY = "supersecretadminkey",
} = process.env;

// --- db pool ---
const pool = new Pool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
});

// create table on boot (simple “migration” for demo)
async function ensureSchema() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).catch(async (e) => {
        // if pgcrypto not available for gen_random_uuid, enable extension:
        const msg = `${e}`;
        if (msg.includes("function gen_random_uuid()")) {
            await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
            await pool.query(`
        CREATE TABLE IF NOT EXISTS feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
        } else {
            throw e;
        }
    });
}

const app = express();
app.use(express.static("public"));
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// --- validation ---
const SubmitSchema = z.object({
    userId: z.string().min(1, "userId required"),
    message: z.string().min(1).max(2000),
});

// --- routes ---

// health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// POST /feedback  { userId, message }
app.post("/feedback", async (req, res) => {
    try {
        const body = SubmitSchema.parse(req.body);
        const { userId, message } = body;

        const { rows } = await pool.query(
            "INSERT INTO feedback (user_id, message) VALUES ($1, $2) RETURNING id, created_at",
            [userId, message]
        );

        res.status(201).json({
            id: rows[0].id,
            createdAt: rows[0].created_at,
        });
    } catch (e) {
        if (e?.issues) {
            return res.status(400).json({ error: "validation_error", details: e.issues });
        }
        console.error(e);
        res.status(500).json({ error: "server_error" });
    }
});

// GET /admin/feedback?page=1&pageSize=10
// simple admin gate via header: x-admin-key
app.get("/admin/feedback", async (req, res) => {
    try {
        const key = req.header("x-admin-key");
        if (key !== ADMIN_API_KEY) {
            return res.status(401).json({ error: "unauthorized" });
        }

        const page = Math.max(1, Number(req.query.page ?? 1));
        const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 10)));
        const offset = (page - 1) * pageSize;

        const { rows } = await pool.query(
            `SELECT id, user_id AS "userId", message, created_at AS "createdAt"
       FROM feedback
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
            [pageSize, offset]
        );

        const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM feedback`);
        res.json({
            page,
            pageSize,
            total: countRows[0].total,
            data: rows,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "server_error" });
    }
});

// boot
ensureSchema()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`API listening on http://0.0.0.0:${PORT}`);
        });
    })
    .catch((e) => {
        console.error("Failed to init schema:", e);
        process.exit(1);
    });
