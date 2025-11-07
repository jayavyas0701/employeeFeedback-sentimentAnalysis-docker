// api/src/routes/feedback.js
import express from "express";
import { pool } from "../db.js";
const router = express.Router();

router.post("/", async (req, res, next) => {
    try {
        const { employee_id, text } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO feedbacks (employee_id, text, created_at)
       VALUES ($1, $2, now())
       RETURNING id, employee_id, text, created_at`,
            [employee_id, text]
        );
        res.status(201).json(rows[0]);
    } catch (e) { next(e); }
});

router.get("/", async (_req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, employee_id, text, created_at,
              sentiment->>'label' AS label,
              (sentiment->>'score')::numeric AS score
       FROM feedbacks
       ORDER BY created_at DESC
       LIMIT 100`
        );
        res.json(rows);
    } catch (e) { next(e); }
});

export default router;
