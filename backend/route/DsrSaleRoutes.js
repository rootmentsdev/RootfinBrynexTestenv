import express from "express";
import {
    createDsrSale,
    getDsrSales,
    getDsrSaleById,
    getDsrSaleMtd,
    getDsrFromInvoices,
    updateDsrSale,
    deleteDsrSale,
} from "../controllers/DsrSaleController.js";

const router = express.Router();

router.post("/dsr/sale",                createDsrSale);
router.get("/dsr/sale/mtd",             getDsrSaleMtd);          // before /:id
router.get("/dsr/sale/from-invoices",   getDsrFromInvoices);     // before /:id
router.get("/dsr/sale",                 getDsrSales);
router.get("/dsr/sale/:id",             getDsrSaleById);
router.put("/dsr/sale/:id",             updateDsrSale);
router.delete("/dsr/sale/:id",          deleteDsrSale);

export default router;
