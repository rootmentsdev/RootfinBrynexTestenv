import DsrRental from "../model/DsrRental.js";
import SalesPerson from "../model/SalesPerson.js";

const mapRow = (r) => ({
    employeeName:  r.employeeName  || "",
    bill_ftd:      parseFloat(r.bill_ftd)      || 0,
    bill_mtd:      parseFloat(r.bill_mtd)      || 0,
    bill_ly_mtd:   parseFloat(r.bill_ly_mtd)   || 0,
    bill_l2l:      parseFloat(r.bill_l2l)      || 0,
    qty_ftd:       parseFloat(r.qty_ftd)       || 0,
    qty_mtd:       parseFloat(r.qty_mtd)       || 0,
    qty_ly_mtd:    parseFloat(r.qty_ly_mtd)    || 0,
    qty_l2l:       parseFloat(r.qty_l2l)       || 0,
    value_ftd:     parseFloat(r.value_ftd)     || 0,
    value_mtd:     parseFloat(r.value_mtd)     || 0,
    value_ly_mtd:  parseFloat(r.value_ly_mtd)  || 0,
    value_l2l:     parseFloat(r.value_l2l)     || 0,
    abs:           parseFloat(r.abs)           || 0,
    abv:           parseFloat(r.abv)           || 0,
    value_tgt:     parseFloat(r.value_tgt)     || 0,
    value_ach:     parseFloat(r.value_ach)     || 0,
    walkin_ftd:    parseFloat(r.walkin_ftd)    || 0,
    walkin_mtd:    parseFloat(r.walkin_mtd)    || 0,
    walkin_ly_mtd: parseFloat(r.walkin_ly_mtd) || 0,
    walkin_l2l:    parseFloat(r.walkin_l2l)    || 0,
    loss_ftd:      parseFloat(r.loss_ftd)      || 0,
    loss_mtd:      parseFloat(r.loss_mtd)      || 0,
    conversion:    parseFloat(r.conversion)    || 0,
});

// POST /api/dsr/rental  — create a new DSR Rental entry
export const createDsrRental = async (req, res) => {
    try {
        const { date, locCode, storeName, createdBy, rows } = req.body;

        if (!date || !locCode || !storeName) {
            return res.status(400).json({ message: "date, locCode and storeName are required." });
        }

        const entry = await DsrRental.create({
            date,
            locCode,
            storeName,
            createdBy: createdBy || "",
            rows: (rows || []).map(mapRow),
        });

        res.status(201).json({ message: "DSR Rental entry created.", entry });
    } catch (err) {
        console.error("createDsrRental error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// GET /api/dsr/rental  — list entries
// Query params: locCode (optional), date (optional, YYYY-MM-DD)
export const getDsrRentals = async (req, res) => {
    try {
        const { locCode, date } = req.query;

        const filter = {};
        if (locCode && locCode !== "all") filter.locCode = locCode;
        if (date)    filter.date    = date;

        const entries = await DsrRental.find(filter).sort({ date: -1, createdAt: -1 });

        res.status(200).json({ message: "DSR Rentals retrieved.", entries });
    } catch (err) {
        console.error("getDsrRentals error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// GET /api/dsr/rental/:id
export const getDsrRentalById = async (req, res) => {
    try {
        const entry = await DsrRental.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: "Entry not found." });
        res.status(200).json({ entry });
    } catch (err) {
        console.error("getDsrRentalById error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// PUT /api/dsr/rental/:id  — update an existing DSR Rental entry's rows
export const updateDsrRental = async (req, res) => {
    try {
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ message: "rows array is required." });
        }

        const entry = await DsrRental.findByIdAndUpdate(
            req.params.id,
            { $set: { rows: rows.map(mapRow) } },
            { new: true }
        );

        if (!entry) return res.status(404).json({ message: "Entry not found." });
        res.status(200).json({ message: "DSR Rental entry updated.", entry });
    } catch (err) {
        console.error("updateDsrRental error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// DELETE /api/dsr/rental/:id
export const deleteDsrRental = async (req, res) => {
    try {
        const entry = await DsrRental.findByIdAndDelete(req.params.id);
        if (!entry) return res.status(404).json({ message: "Entry not found." });
        res.status(200).json({ message: "DSR Rental entry deleted." });
    } catch (err) {
        console.error("deleteDsrRental error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// GET /api/dsr/rental/salespersons
// Returns sales persons for a given locCode
export const getDsrRentalSalesPersons = async (req, res) => {
    try {
        const { locCode } = req.query;
        if (!locCode) return res.status(400).json({ message: "locCode is required." });

        const persons = await SalesPerson.find({ locCode, isActive: true }).sort({ firstName: 1 });
        res.status(200).json({ persons });
    } catch (err) {
        console.error("getDsrRentalSalesPersons error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};
