import express from "express";
import {
    createDsrRental,
    getDsrRentals,
    getDsrRentalById,
    updateDsrRental,
    deleteDsrRental,
    getDsrRentalSalesPersons,
} from "../controllers/DsrRentalController.js";

const router = express.Router();

router.get("/dsr/rental/salespersons", getDsrRentalSalesPersons); // before /:id
router.post("/dsr/rental",             createDsrRental);
router.get("/dsr/rental",              getDsrRentals);
router.get("/dsr/rental/:id",          getDsrRentalById);
router.put("/dsr/rental/:id",          updateDsrRental);
router.delete("/dsr/rental/:id",       deleteDsrRental);

export default router;
