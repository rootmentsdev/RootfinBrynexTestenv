import express from "express";
import { getDashboardSummary } from "../controllers/DashboardController.js";

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Retrieve aggregated high-performance dashboard summary
 *     description: Returns computed income, expense, returnables, daybook statuses, and store rankings with caching.
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateTo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
router.get("/summary", getDashboardSummary);

export default router;
