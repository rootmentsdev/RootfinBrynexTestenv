import DsrSale from "../model/DsrSale.js";
import SalesInvoice from "../model/SalesInvoice.js";

// POST /api/dsr/sale  — create a new DSR entry
export const createDsrSale = async (req, res) => {
    try {
        const { date, locCode, storeName, createdBy, rows } = req.body;

        if (!date || !locCode || !storeName) {
            return res.status(400).json({ message: "date, locCode and storeName are required." });
        }

        const entry = await DsrSale.create({
            date,
            locCode,
            storeName,
            createdBy: createdBy || "",
            rows: (rows || []).map(r => ({
                employeeName:   r.employeeName  || "",
                shoe_bill_ftd:  parseFloat(r.shoe_bill_ftd)  || 0,
                shoe_qty_ftd:   parseFloat(r.shoe_qty_ftd)   || 0,
                shirt_bill_ftd: parseFloat(r.shirt_bill_ftd) || 0,
                shirt_qty_ftd:  parseFloat(r.shirt_qty_ftd)  || 0,
            })),
        });

        res.status(201).json({ message: "DSR Sale entry created.", entry });
    } catch (err) {
        console.error("createDsrSale error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// GET /api/dsr/sale  — list entries
// Query params: locCode (optional), date (optional, YYYY-MM-DD)
export const getDsrSales = async (req, res) => {
    try {
        const { locCode, date } = req.query;

        const filter = {};
        if (locCode) filter.locCode = locCode;
        if (date)    filter.date    = date;

        const entries = await DsrSale.find(filter).sort({ date: -1, createdAt: -1 });

        res.status(200).json({ message: "DSR Sales retrieved.", entries });
    } catch (err) {
        console.error("getDsrSales error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// GET /api/dsr/sale/:id
export const getDsrSaleById = async (req, res) => {
    try {
        const entry = await DsrSale.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: "Entry not found." });
        res.status(200).json({ entry });
    } catch (err) {
        console.error("getDsrSaleById error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// PUT /api/dsr/sale/:id  — update an existing DSR entry's rows
export const updateDsrSale = async (req, res) => {
    try {
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ message: "rows array is required." });
        }

        const entry = await DsrSale.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    rows: rows.map(r => ({
                        employeeName:   r.employeeName  || "",
                        shoe_bill_ftd:  parseFloat(r.shoe_bill_ftd)  || 0,
                        shoe_qty_ftd:   parseFloat(r.shoe_qty_ftd)   || 0,
                        shirt_bill_ftd: parseFloat(r.shirt_bill_ftd) || 0,
                        shirt_qty_ftd:  parseFloat(r.shirt_qty_ftd)  || 0,
                    })),
                },
            },
            { new: true }
        );

        if (!entry) return res.status(404).json({ message: "Entry not found." });
        res.status(200).json({ message: "DSR Sale entry updated.", entry });
    } catch (err) {
        console.error("updateDsrSale error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// GET /api/dsr/sale/mtd  — MTD aggregation per employee, computed from SalesInvoice data
// MTD = Day 1 of the month up to (but NOT including) the selected date
// Query params: locCode (required, pass "all" for all stores), date (YYYY-MM-DD, required)
export const getDsrSaleMtd = async (req, res) => {
    try {
        const { locCode, date } = req.query;
        if (!locCode || !date) {
            return res.status(400).json({ message: "locCode and date are required." });
        }

        // Build the date range: from the 1st of the month up to (but NOT including) the given date
        const [year, month] = date.split("-").map(Number);
        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

        // If the selected date IS the 1st of the month, MTD is 0 for everyone
        if (date <= monthStart) {
            return res.status(200).json({ mtd: {} });
        }

        // Query invoices from Day 1 up to (but not including) the selected date
        const rangeStart = new Date(monthStart + "T00:00:00.000Z");
        const rangeEnd   = new Date(date       + "T00:00:00.000Z"); // exclusive — midnight of selected date

        const EXCLUDED_CATEGORIES = ["return", "refund", "cancel"];

        const query = {
            invoiceDate: { $gte: rangeStart, $lt: rangeEnd },
            category:    { $nin: EXCLUDED_CATEGORIES },
        };
        // Only filter by locCode when a specific store is selected
        if (locCode !== "all") query.locCode = locCode;

        const invoices = await SalesInvoice.find(query);

        // Aggregate per salesperson — key is "STORECODE||EMPLOYEENAME" for all-stores, just "EMPLOYEENAME" for single store
        const mtdMap = {};

        for (const inv of invoices) {
            const rawName = (inv.salesperson || "").trim();
            if (!rawName) continue;

            // For all-stores view, scope key by locCode so same-named employees across stores are separate
            const storeKey = locCode === "all" ? `${inv.locCode}||${rawName.toUpperCase()}` : rawName.toUpperCase();

            if (!mtdMap[storeKey]) {
                mtdMap[storeKey] = {
                    employeeName:   rawName,
                    storeName:      inv.branch || inv.warehouse || inv.locCode || "",
                    locCode:        inv.locCode || "",
                    shoe_bill_mtd:  0,
                    shoe_qty_mtd:   0,
                    shirt_bill_mtd: 0,
                    shirt_qty_mtd:  0,
                };
            }

            // BILL = count of invoices per category
            const sub          = (inv.subCategory || "").toLowerCase().trim();
            const hasShoeItem  = (inv.lineItems || []).some(li => ((li.itemData?.category) || "").toLowerCase() === "shoe");
            const hasShirtItem = (inv.lineItems || []).some(li => ((li.itemData?.category) || "").toLowerCase() === "shirt");

            if (sub === "shoe sales" || (hasShoeItem && !hasShirtItem)) {
                mtdMap[storeKey].shoe_bill_mtd += 1;
            } else if (sub === "shirt sales" || (hasShirtItem && !hasShoeItem)) {
                mtdMap[storeKey].shirt_bill_mtd += 1;
            } else if (sub === "mixed sales" || (hasShoeItem && hasShirtItem)) {
                mtdMap[storeKey].shoe_bill_mtd  += 1;
                mtdMap[storeKey].shirt_bill_mtd += 1;
            } else {
                mtdMap[storeKey].shoe_bill_mtd += 1;
            }

            // QTY = sum of lineItem quantities by category
            for (const li of (inv.lineItems || [])) {
                const cat = ((li.itemData?.category) || "").toLowerCase().trim();
                const qty = li.quantity || 0;
                if (cat === "shoe")       mtdMap[storeKey].shoe_qty_mtd  += qty;
                else if (cat === "shirt") mtdMap[storeKey].shirt_qty_mtd += qty;
            }
        }

        res.status(200).json({ mtd: mtdMap });
    } catch (err) {
        console.error("getDsrSaleMtd error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// DELETE /api/dsr/sale/:id
export const deleteDsrSale = async (req, res) => {
    try {
        const entry = await DsrSale.findByIdAndDelete(req.params.id);
        if (!entry) return res.status(404).json({ message: "Entry not found." });
        res.status(200).json({ message: "DSR Sale entry deleted." });
    } catch (err) {
        console.error("deleteDsrSale error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};

// GET /api/dsr/sale/from-invoices
// Auto-compute DSR figures from actual SalesInvoice data for a given date + locCode.
// Returns per-salesperson: shoe_bill_ftd, shoe_qty_ftd, shirt_bill_ftd, shirt_qty_ftd
// Query params: locCode (required, pass "all" for all stores), date (YYYY-MM-DD, required)
export const getDsrFromInvoices = async (req, res) => {
    try {
        const { locCode, date } = req.query;
        if (!locCode || !date) {
            return res.status(400).json({ message: "locCode and date are required." });
        }

        // Build date range for the full day (UTC)
        const dayStart = new Date(date + "T00:00:00.000Z");
        const dayEnd   = new Date(date + "T23:59:59.999Z");

        // Exclude returns / refunds / cancels
        const EXCLUDED_CATEGORIES = ["return", "refund", "cancel"];

        const query = {
            invoiceDate: { $gte: dayStart, $lte: dayEnd },
            category:    { $nin: EXCLUDED_CATEGORIES },
        };
        // Only filter by locCode when a specific store is selected
        if (locCode !== "all") query.locCode = locCode;

        const invoices = await SalesInvoice.find(query);

        // Aggregate per salesperson
        // For all-stores: key is "STORECODE||EMPLOYEENAME" so same-named employees across stores stay separate
        const map = {};

        for (const inv of invoices) {
            const rawName = (inv.salesperson || "").trim();
            if (!rawName) continue; // skip invoices with no salesperson

            const storeKey = locCode === "all"
                ? `${inv.locCode}||${rawName.toUpperCase()}`
                : rawName.toUpperCase();

            if (!map[storeKey]) {
                map[storeKey] = {
                    employeeName:   rawName,
                    storeName:      inv.branch || inv.warehouse || inv.locCode || "",
                    locCode:        inv.locCode || "",
                    shoe_bill_ftd:  0,
                    shoe_qty_ftd:   0,
                    shirt_bill_ftd: 0,
                    shirt_qty_ftd:  0,
                };
            }

            const sub = (inv.subCategory || "").toLowerCase().trim();

            // BILL = count of invoices (not rupee amount).
            const hasShoeItem  = (inv.lineItems || []).some(li => ((li.itemData?.category) || "").toLowerCase() === "shoe");
            const hasShirtItem = (inv.lineItems || []).some(li => ((li.itemData?.category) || "").toLowerCase() === "shirt");

            if (sub === "shoe sales" || (hasShoeItem && !hasShirtItem)) {
                map[storeKey].shoe_bill_ftd += 1;
            } else if (sub === "shirt sales" || (hasShirtItem && !hasShoeItem)) {
                map[storeKey].shirt_bill_ftd += 1;
            } else if (sub === "mixed sales" || (hasShoeItem && hasShirtItem)) {
                map[storeKey].shoe_bill_ftd  += 1;
                map[storeKey].shirt_bill_ftd += 1;
            } else {
                map[storeKey].shoe_bill_ftd += 1;
            }

            // QTY: sum quantities from lineItems by item category
            for (const li of (inv.lineItems || [])) {
                const cat = ((li.itemData?.category) || "").toLowerCase().trim();
                const qty = li.quantity || 0;
                if (cat === "shoe")       map[storeKey].shoe_qty_ftd  += qty;
                else if (cat === "shirt") map[storeKey].shirt_qty_ftd += qty;
            }
        }

        res.status(200).json({ rows: Object.values(map) });
    } catch (err) {
        console.error("getDsrFromInvoices error:", err);
        res.status(500).json({ message: "Server error.", error: err.message });
    }
};
