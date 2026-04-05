import express from "express";
import {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  convertPurchaseOrderToBill,
  convertPurchaseReceiveToBill,
} from "../controllers/BillController.js";

const router = express.Router();

router
  .route("/purchase/bills")
  .get(getBills)
  .post(createBill);

router
  .route("/purchase/bills/:id")
  .get(getBillById)
  .put(updateBill)
  .delete(deleteBill);

// Convert Purchase Order to Bill
router
  .route("/purchase/orders/:purchaseOrderId/convert-to-bill")
  .post(convertPurchaseOrderToBill);

// Convert Purchase Receive to Bill
router
  .route("/purchase/receives/:purchaseReceiveId/convert-to-bill")
  .post(convertPurchaseReceiveToBill);

export default router;

