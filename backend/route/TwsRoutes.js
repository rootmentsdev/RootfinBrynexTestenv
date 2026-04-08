import express from "express";
import { getEditedTransactions } from "../controllers/EditController.js";
import { getsaveCashBank } from "../controllers/EditController.js";
import { getSecurityReportAllStores } from "../controllers/SecurityReportController.js";

const router = express.Router();

router.get("/getEditedTransactions", getEditedTransactions);
router.get("/getsaveCashBank", getsaveCashBank);
router.get("/security-report/all-stores", getSecurityReportAllStores);

export default router;
