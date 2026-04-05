import express from "express";
import {
  getSalesSummary,
  getSalesByItem,
  getSalesReturnSummary,
  getSalesByInvoice
} from "../controllers/SalesReportController.js";

const router = express.Router();

router.get("/by-invoice", getSalesByInvoice);
router.get("/summary", getSalesSummary);
router.get("/by-item", getSalesByItem);
router.get("/returns", getSalesReturnSummary);

export default router;
