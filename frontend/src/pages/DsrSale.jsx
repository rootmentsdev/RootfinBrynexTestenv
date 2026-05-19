import { useState, useEffect, useCallback } from "react";
import baseUrl from "../api/api";

const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

const ALL_STORES = [
    { locName: "Z-Edapally",       locCode: "144" },
    { locName: "Z-Edappal",        locCode: "100" },
    { locName: "Z-Perinthalmanna", locCode: "133" },
    { locName: "Z-Kottakkal",      locCode: "122" },
    { locName: "Warehouse",        locCode: "858" },
    { locName: "G-Edappally",      locCode: "702" },
    { locName: "HEAD OFFICE01",    locCode: "759" },
    { locName: "SG-Trivandrum",    locCode: "700" },
    { locName: "G.Kottayam",       locCode: "701" },
    { locName: "G.Perumbavoor",    locCode: "703" },
    { locName: "G.Thrissur",       locCode: "704" },
    { locName: "G.Chavakkad",      locCode: "706" },
    { locName: "G.Calicut",        locCode: "712" },
    { locName: "G.Vadakara",       locCode: "708" },
    { locName: "G.Edappal",        locCode: "707" },
    { locName: "G.Perinthalmanna", locCode: "709" },
    { locName: "G.Kottakkal",      locCode: "711" },
    { locName: "G.Manjeri",        locCode: "710" },
    { locName: "G.Palakkad",       locCode: "705" },
    { locName: "G.Kalpetta",       locCode: "717" },
    { locName: "G.Kannur",         locCode: "716" },
    { locName: "G.MG Road",        locCode: "718" },
    { locName: "WAREHOUSE",        locCode: "103" },
];

const getStoreName = (code) => {
    const s = ALL_STORES.find(s => s.locCode === code);
    return s ? s.locName : code;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyRow = (name = "") => ({
    employeeName:   name,
    shoe_bill_ftd:  "",
    shoe_qty_ftd:   "",
    shirt_bill_ftd: "",
    shirt_qty_ftd:  "",
});

const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
};

// â”€â”€ th helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TH = ({ children, ...p }) => (
    <th className="border border-gray-200 bg-white py-2 px-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-widest" {...p}>
        {children}
    </th>
);
const THsub = ({ children, ...p }) => (
    <th className="border border-gray-200 bg-white py-1.5 px-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest" {...p}>
        {children}
    </th>
);

// â”€â”€ component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DsrSale = () => {
    const getCurrentUser = () => JSON.parse(localStorage.getItem("rootfinuser")) || {};
    const [currentuser, setCurrentuser] = useState(getCurrentUser);
    const isAdmin = currentuser.power === "admin";

    // sync when Header switches store
    useEffect(() => {
        const onStorage = () => setCurrentuser(getCurrentUser());
        window.addEventListener("storage", onStorage);
        const iv = setInterval(() => {
            const fresh = getCurrentUser();
            setCurrentuser(prev => prev.locCode !== fresh.locCode ? fresh : prev);
        }, 500);
        return () => { window.removeEventListener("storage", onStorage); clearInterval(iv); };
    }, []);

    // â”€â”€ views â”€â”€
    const [view, setView] = useState("list"); // "list" | "add" | "edit"

    // â”€â”€ edit state â”€â”€
    const [editEntry, setEditEntry]   = useState(null);  // the full entry being edited
    const [editRows, setEditRows]     = useState([]);
    const [updating, setUpdating]     = useState(false);

    const openEdit = (entry) => {
        setEditEntry(entry);
        // pre-fill rows from the entry; also include any listPersons not in the entry
        const savedMap = {};
        entry.rows.forEach(r => { savedMap[r.employeeName.trim().toUpperCase()] = { ...r }; });
        const merged = listPersons.length > 0
            ? listPersons.map(p => {
                const name = `${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`;
                const key  = name.trim().toUpperCase();
                return savedMap[key] || { employeeName: name, shoe_bill_ftd: 0, shoe_qty_ftd: 0, shirt_bill_ftd: 0, shirt_qty_ftd: 0 };
            })
            : entry.rows.map(r => ({ ...r }));
        setEditRows(merged);
        setView("edit");
    };

    const handleEditRowChange = (idx, field, value) =>
        setEditRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

    const handleUpdate = async () => {
        if (!editEntry) return;
        setUpdating(true);
        try {
            const res = await fetch(`${API_URL}/api/dsr/sale/${editEntry._id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    rows: editRows.map(r => ({
                        employeeName:   r.employeeName,
                        shoe_bill_ftd:  parseFloat(r.shoe_bill_ftd)  || 0,
                        shoe_qty_ftd:   parseFloat(r.shoe_qty_ftd)   || 0,
                        shirt_bill_ftd: parseFloat(r.shirt_bill_ftd) || 0,
                        shirt_qty_ftd:  parseFloat(r.shirt_qty_ftd)  || 0,
                    })),
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                return alert(err.message || "Failed to update.");
            }
            setView("list");
            setEditEntry(null);
            fetchEntries();
            fetchMtd();
            fetchInvoiceFtd();
        } catch (err) {
            console.error("handleUpdate error:", err);
            alert("Network error. Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    // â”€â”€ list filters â”€â”€
    const [listLocCode, setListLocCode] = useState(isAdmin ? "all" : (currentuser.locCode || ""));
    const [listDate, setListDate]       = useState(todayISO());

    // keep listLocCode in sync for non-admin
    useEffect(() => {
        if (!isAdmin) setListLocCode(currentuser.locCode || "");
    }, [currentuser.locCode, isAdmin]);

    // â”€â”€ list data from MongoDB â”€â”€
    const [entries, setEntries]         = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    // MTD aggregation map: { "EMPLOYEE NAME (UPPER)": { shoe_bill_mtd, shoe_qty_mtd, shirt_bill_mtd, shirt_qty_mtd } }
    const [mtdMap, setMtdMap]           = useState({});
    // Invoice-based FTD rows for list view (shown when no manual DSR entry exists)
    const [invoiceFtdRows, setInvoiceFtdRows] = useState([]); // [{ employeeName, shoe_bill_ftd, ... }]
    const [loadingInvoiceFtd, setLoadingInvoiceFtd] = useState(false);
    // full sales-person list for the selected store (for zero-fill)
    const [listPersons, setListPersons] = useState([]);

    const fetchEntries = useCallback(async () => {
        setLoadingList(true);
        try {
            const params = new URLSearchParams();
            if (listDate)                             params.set("date",    listDate);
            if (listLocCode && listLocCode !== "all") params.set("locCode", listLocCode);
            const res  = await fetch(`${API_URL}/api/dsr/sale?${params}`);
            const data = await res.json();
            setEntries(data.entries || []);
        } catch (err) {
            console.error("fetchEntries error:", err);
        } finally {
            setLoadingList(false);
        }
    }, [listDate, listLocCode]);

    // Fetch MTD whenever date or store changes
    const fetchMtd = useCallback(async () => {
        if (!listLocCode || !listDate) {
            setMtdMap({});
            return;
        }
        try {
            const params = new URLSearchParams({ locCode: listLocCode, date: listDate });
            const res  = await fetch(`${API_URL}/api/dsr/sale/mtd?${params}`);
            const data = await res.json();
            setMtdMap(data.mtd || {});
        } catch (err) {
            console.error("fetchMtd error:", err);
            setMtdMap({});
        }
    }, [listDate, listLocCode]);

    // Fetch invoice-based FTD for list view
    const fetchInvoiceFtd = useCallback(async () => {
        if (!listLocCode || !listDate) {
            setInvoiceFtdRows([]);
            return;
        }
        setLoadingInvoiceFtd(true);
        try {
            const params = new URLSearchParams({ locCode: listLocCode, date: listDate });
            const res  = await fetch(`${API_URL}/api/dsr/sale/from-invoices?${params}`);
            const data = await res.json();
            setInvoiceFtdRows(data.rows || []);
        } catch (err) {
            console.error("fetchInvoiceFtd error:", err);
            setInvoiceFtdRows([]);
        } finally {
            setLoadingInvoiceFtd(false);
        }
    }, [listDate, listLocCode]);

    // fetch sales persons for the selected store (for zero-fill in list view)
    useEffect(() => {
        if (!listLocCode || listLocCode === "all") { setListPersons([]); return; }
        fetch(`${API_URL}/api/sales-persons?locCode=${listLocCode}&isActive=true`)
            .then(r => r.json())
            .then(data => setListPersons(data.salesPersons || []))
            .catch(() => setListPersons([]));
    }, [listLocCode]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);
    useEffect(() => { fetchMtd(); }, [fetchMtd]);
    useEffect(() => { fetchInvoiceFtd(); }, [fetchInvoiceFtd]);

    // â”€â”€ add-form state â”€â”€
    const [formDate, setFormDate]               = useState(todayISO());
    const [selectedLocCode, setSelectedLocCode] = useState(isAdmin ? "" : (currentuser.locCode || ""));
    const [employees, setEmployees]             = useState([]);
    const [rows, setRows]                       = useState([]);
    const [loadingEmps, setLoadingEmps]         = useState(false);
    const [saving, setSaving]                   = useState(false);
    const [autoFetching, setAutoFetching]       = useState(false);
    const [autoFetched, setAutoFetched]         = useState(false); // true once invoice data was loaded

    // Auto-fetch DSR figures from invoices and merge into rows
    const fetchFromInvoices = async (locCode, date, currentRows) => {
        if (!locCode || !date) return;
        setAutoFetching(true);
        try {
            const params = new URLSearchParams({ locCode, date });
            const res  = await fetch(`${API_URL}/api/dsr/sale/from-invoices?${params}`);
            const data = await res.json();
            const invoiceRows = data.rows || []; // [{ employeeName, shoe_bill_ftd, shoe_qty_ftd, shirt_bill_ftd, shirt_qty_ftd }]

            if (invoiceRows.length === 0) return; // nothing to merge

            // Build a lookup map from invoice data (uppercase key)
            const invMap = {};
            invoiceRows.forEach(r => { invMap[r.employeeName.trim().toUpperCase()] = r; });

            // Merge into existing rows (sales-person list takes precedence for names)
            setRows(prev => {
                const merged = prev.map(row => {
                    const key = row.employeeName.trim().toUpperCase();
                    const inv = invMap[key];
                    if (inv) {
                        return {
                            ...row,
                            shoe_bill_ftd:  inv.shoe_bill_ftd,
                            shoe_qty_ftd:   inv.shoe_qty_ftd,
                            shirt_bill_ftd: inv.shirt_bill_ftd,
                            shirt_qty_ftd:  inv.shirt_qty_ftd,
                        };
                    }
                    return row;
                });

                // Also add any invoice rows for salespersons NOT in the store list
                const existingKeys = new Set(prev.map(r => r.employeeName.trim().toUpperCase()));
                invoiceRows.forEach(r => {
                    const k = r.employeeName.trim().toUpperCase();
                    if (!existingKeys.has(k)) {
                        merged.push({
                            employeeName:   r.employeeName,
                            shoe_bill_ftd:  r.shoe_bill_ftd,
                            shoe_qty_ftd:   r.shoe_qty_ftd,
                            shirt_bill_ftd: r.shirt_bill_ftd,
                            shirt_qty_ftd:  r.shirt_qty_ftd,
                        });
                    }
                });
                return merged;
            });
            setAutoFetched(true);
        } catch (err) {
            console.error("fetchFromInvoices error:", err);
        } finally {
            setAutoFetching(false);
        }
    };

    // fetch sales persons when locCode changes
    useEffect(() => {
        if (!selectedLocCode) { setEmployees([]); setRows([]); setAutoFetched(false); return; }
        setLoadingEmps(true);
        fetch(`${API_URL}/api/sales-persons?locCode=${selectedLocCode}&isActive=true`)
            .then(r => r.json())
            .then(data => {
                const persons = data.salesPersons || [];
                setEmployees(persons);
                const baseRows = persons.map(p =>
                    emptyRow(`${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`)
                );
                setRows(baseRows);
                setAutoFetched(false);
                // Auto-populate from invoices right after loading employees
                fetchFromInvoices(selectedLocCode, formDate, baseRows);
            })
            .catch(err => { console.error(err); setEmployees([]); setRows([]); })
            .finally(() => setLoadingEmps(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLocCode]);

    // Re-fetch from invoices when date changes (if store already selected)
    useEffect(() => {
        if (selectedLocCode && employees.length > 0) {
            setAutoFetched(false);
            fetchFromInvoices(selectedLocCode, formDate, rows);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formDate]);

    // sync add-form store for non-admin
    useEffect(() => {
        if (!isAdmin && currentuser.locCode) setSelectedLocCode(currentuser.locCode);
    }, [currentuser.locCode, isAdmin]);

    const handleRowChange = (idx, field, value) =>
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

    // â”€â”€ save to MongoDB â”€â”€
    const handleSave = async () => {
        if (!selectedLocCode) return alert("Please select a store.");
        if (rows.length === 0) return;
        setSaving(true);
        try {
            const payload = {
                date:      formDate,
                locCode:   selectedLocCode,
                storeName: getStoreName(selectedLocCode),
                createdBy: currentuser.email || "",
                rows:      rows.map(r => ({
                    employeeName:   r.employeeName,
                    shoe_bill_ftd:  parseFloat(r.shoe_bill_ftd)  || 0,
                    shoe_qty_ftd:   parseFloat(r.shoe_qty_ftd)   || 0,
                    shirt_bill_ftd: parseFloat(r.shirt_bill_ftd) || 0,
                    shirt_qty_ftd:  parseFloat(r.shirt_qty_ftd)  || 0,
                })),
            };
            const res = await fetch(`${API_URL}/api/dsr/sale`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                return alert(err.message || "Failed to save.");
            }
            // go back to list and refresh
            setView("list");
            // reset rows
            setRows(employees.map(p =>
                emptyRow(`${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`)
            ));
            // sync list date to the saved date so user sees it immediately
            setListDate(formDate);
            if (!isAdmin) setListLocCode(selectedLocCode);
            fetchEntries();
            fetchInvoiceFtd();
        } catch (err) {
            console.error("handleSave error:", err);
            alert("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // â”€â”€ flat rows for list table â”€â”€
    // When viewing a single store: merge saved rows with full sales-person list.
    // If no manual DSR entry exists yet, fall back to invoice-computed FTD data.
    // When viewing all stores: always use invoice data (FTD + MTD from invoices).
    const hasManualEntry = entries.length > 0;

    const visibleRows = (() => {
        // â”€â”€ ALL STORES view: always built from invoice data â”€â”€
        if (listLocCode === "all") {
            // Build a combined map: invoice FTD rows merged with MTD
            const combinedMap = {};

            // Start from invoice FTD rows
            invoiceFtdRows.forEach(r => {
                const key = `${r.locCode}||${r.employeeName.trim().toUpperCase()}`;
                combinedMap[key] = { ...r };
            });

            // Overlay any manually saved DSR entries on top
            entries.forEach(e => {
                e.rows.forEach(r => {
                    const key = `${e.locCode}||${r.employeeName.trim().toUpperCase()}`;
                    if (combinedMap[key]) {
                        // Manual entry overrides invoice FTD
                        combinedMap[key].shoe_bill_ftd  = r.shoe_bill_ftd  || 0;
                        combinedMap[key].shoe_qty_ftd   = r.shoe_qty_ftd   || 0;
                        combinedMap[key].shirt_bill_ftd = r.shirt_bill_ftd || 0;
                        combinedMap[key].shirt_qty_ftd  = r.shirt_qty_ftd  || 0;
                        combinedMap[key].storeName      = e.storeName;
                        combinedMap[key]._entry         = e;
                    } else {
                        combinedMap[key] = {
                            employeeName:   r.employeeName,
                            storeName:      e.storeName,
                            locCode:        e.locCode,
                            shoe_bill_ftd:  r.shoe_bill_ftd  || 0,
                            shoe_qty_ftd:   r.shoe_qty_ftd   || 0,
                            shirt_bill_ftd: r.shirt_bill_ftd || 0,
                            shirt_qty_ftd:  r.shirt_qty_ftd  || 0,
                            _entry:         e,
                        };
                    }
                });
            });

            return Object.values(combinedMap);
        }

        // â”€â”€ SINGLE STORE view â”€â”€

        // Build invoice FTD map (used as fallback when no manual entry)
        const invFtdMap = {};
        invoiceFtdRows.forEach(r => { invFtdMap[r.employeeName.trim().toUpperCase()] = r; });

        const savedMap = {};
        entries.forEach(e => {
            e.rows.forEach(r => {
                const key = r.employeeName.trim().toUpperCase();
                if (!savedMap[key]) {
                    savedMap[key] = { ...r, date: e.date, storeName: e.storeName, _entry: e };
                } else {
                    savedMap[key].shoe_bill_ftd  += r.shoe_bill_ftd  || 0;
                    savedMap[key].shoe_qty_ftd   += r.shoe_qty_ftd   || 0;
                    savedMap[key].shirt_bill_ftd += r.shirt_bill_ftd || 0;
                    savedMap[key].shirt_qty_ftd  += r.shirt_qty_ftd  || 0;
                }
            });
        });

        const storeName = getStoreName(listLocCode);
        const result = listPersons.map(p => {
            const fullName = `${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`;
            const key      = fullName.trim().toUpperCase();
            if (savedMap[key]) return savedMap[key];
            // No manual entry â€” use invoice data if available
            const inv = invFtdMap[key];
            return {
                employeeName:   fullName,
                shoe_bill_ftd:  inv ? inv.shoe_bill_ftd  : 0,
                shoe_qty_ftd:   inv ? inv.shoe_qty_ftd   : 0,
                shirt_bill_ftd: inv ? inv.shirt_bill_ftd : 0,
                shirt_qty_ftd:  inv ? inv.shirt_qty_ftd  : 0,
                date:           listDate,
                storeName,
                _entry:         null,
                _fromInvoice:   !!inv && !hasManualEntry, // flag to show "from invoices" indicator
            };
        });

        // Also add invoice rows for salespersons not in the store list (only when no manual entry)
        if (!hasManualEntry) {
            const existingKeys = new Set(result.map(r => r.employeeName.trim().toUpperCase()));
            invoiceFtdRows.forEach(r => {
                const k = r.employeeName.trim().toUpperCase();
                if (!existingKeys.has(k)) {
                    result.push({
                        employeeName:   r.employeeName,
                        shoe_bill_ftd:  r.shoe_bill_ftd,
                        shoe_qty_ftd:   r.shoe_qty_ftd,
                        shirt_bill_ftd: r.shirt_bill_ftd,
                        shirt_qty_ftd:  r.shirt_qty_ftd,
                        date:           listDate,
                        storeName,
                        _entry:         null,
                        _fromInvoice:   true,
                    });
                }
            });
        }

        // mark first row for the edit button
        if (result.length > 0) result[0]._showEditBtn = true;
        return result;
    })();

    const totals = {
        shoe_bill_ftd:  visibleRows.reduce((s, r) => s + (r.shoe_bill_ftd  || 0), 0),
        shoe_qty_ftd:   visibleRows.reduce((s, r) => s + (r.shoe_qty_ftd   || 0), 0),
        shirt_bill_ftd: visibleRows.reduce((s, r) => s + (r.shirt_bill_ftd || 0), 0),
        shirt_qty_ftd:  visibleRows.reduce((s, r) => s + (r.shirt_qty_ftd  || 0), 0),
    };

    // Helper: get MTD values for a row
    const getMtd = (employeeName, rowLocCode) => {
        const key = listLocCode === "all"
            ? `${rowLocCode}||${(employeeName || "").trim().toUpperCase()}`
            : (employeeName || "").trim().toUpperCase();
        return mtdMap[key] || { shoe_bill_mtd: 0, shoe_qty_mtd: 0, shirt_bill_mtd: 0, shirt_qty_mtd: 0 };
    };

    const mtdTotals = {
        shoe_bill_mtd:  Object.values(mtdMap).reduce((s, r) => s + (r.shoe_bill_mtd  || 0), 0),
        shoe_qty_mtd:   Object.values(mtdMap).reduce((s, r) => s + (r.shoe_qty_mtd   || 0), 0),
        shirt_bill_mtd: Object.values(mtdMap).reduce((s, r) => s + (r.shirt_bill_mtd || 0), 0),
        shirt_qty_mtd:  Object.values(mtdMap).reduce((s, r) => s + (r.shirt_qty_mtd  || 0), 0),
    };

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // EDIT VIEW
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (view === "edit" && editEntry) {
        return (
            <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
                <div className="bg-white min-h-screen px-10 py-8">
                    <div className="flex items-center gap-3 mb-8">
                        <button
                            onClick={() => { setView("list"); setEditEntry(null); }}
                            className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
                        >
                            â†
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Edit DSR-Sales</h1>
                        <span className="text-sm text-gray-400 ml-2">
                            {fmtDate(editEntry.date)} Â· {editEntry.storeName}
                        </span>
                    </div>

                    <div className="w-full overflow-x-auto mb-10">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    <th className="border border-gray-200 bg-white" style={{ width: "20%" }} rowSpan={3} />
                                    <TH colSpan={2}>SHOE</TH>
                                    <TH colSpan={2}>SHIRT</TH>
                                </tr>
                                <tr>
                                    <TH style={{ width: "20%" }}>BILL</TH>
                                    <TH style={{ width: "20%" }}>QTY</TH>
                                    <TH style={{ width: "20%" }}>BILL</TH>
                                    <TH style={{ width: "20%" }}>QTY</TH>
                                </tr>
                                <tr>
                                    <THsub>FTD</THsub><THsub>FTD</THsub>
                                    <THsub>FTD</THsub><THsub>FTD</THsub>
                                </tr>
                                <tr>
                                    <th className="border border-gray-200 bg-white px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">
                                        EMPLOYEE NAME
                                    </th>
                                    <th className="border border-gray-200 bg-white" colSpan={4} />
                                </tr>
                            </thead>
                            <tbody>
                                {editRows.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-200 px-4 py-2">
                                            <span className="text-sm font-medium text-gray-800 uppercase">{row.employeeName}</span>
                                        </td>
                                        {["shoe_bill_ftd","shoe_qty_ftd","shirt_bill_ftd","shirt_qty_ftd"].map(field => (
                                            <td key={field} className="border border-gray-200 px-2 py-2">
                                                <input
                                                    type="number"
                                                    value={row[field] ?? ""}
                                                    onChange={e => handleEditRowChange(idx, field, e.target.value)}
                                                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => { setView("list"); setEditEntry(null); }}
                            className="px-10 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={updating}
                            className="px-16 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-semibold text-sm transition"
                        >
                            {updating ? "Updating..." : "Update"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ADD FORM
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (view === "add") {
        return (
            <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
                <div className="bg-white min-h-screen px-10 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-xl font-bold text-gray-900">Add DSR-Sales</h1>
                        {/* Auto-fetch status badge */}
                        {selectedLocCode && (
                            <div className="flex items-center gap-3">
                                {autoFetching ? (
                                    <span className="text-xs text-blue-500 font-medium animate-pulse">âŸ³ Loading from invoicesâ€¦</span>
                                ) : autoFetched ? (
                                    <span className="text-xs text-green-600 font-medium">âœ“ Auto-filled from invoices</span>
                                ) : null}
                                <button
                                    onClick={() => fetchFromInvoices(selectedLocCode, formDate, rows)}
                                    disabled={autoFetching || !selectedLocCode}
                                    className="px-4 py-1.5 text-xs font-semibold border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40 transition"
                                >
                                    â†» Refresh from Invoices
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-8 mb-8">
                        {/* Date */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-48 outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>

                        {/* Store */}
                        {isAdmin ? (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Store</label>
                                <select
                                    value={selectedLocCode}
                                    onChange={e => setSelectedLocCode(e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm w-56 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                >
                                    <option value="">-- Select Store --</option>
                                    {ALL_STORES.map(s => (
                                        <option key={s.locCode} value={s.locCode}>{s.locName}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="flex items-end">
                                <span className="text-sm font-semibold text-gray-700">{getStoreName(selectedLocCode)}</span>
                            </div>
                        )}
                    </div>

                    {loadingEmps && <p className="text-sm text-gray-400 mb-4">Loading sales persons...</p>}

                    {!loadingEmps && selectedLocCode && (
                        <div className="w-full overflow-x-auto mb-10">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-200 bg-white" style={{ width: "20%" }} rowSpan={3} />
                                        <TH colSpan={2}>SHOE</TH>
                                        <TH colSpan={2}>SHIRT</TH>
                                    </tr>
                                    <tr>
                                        <TH style={{ width: "20%" }}>BILL</TH>
                                        <TH style={{ width: "20%" }}>QTY</TH>
                                        <TH style={{ width: "20%" }}>BILL</TH>
                                        <TH style={{ width: "20%" }}>QTY</TH>
                                    </tr>
                                    <tr>
                                        <THsub>FTD</THsub><THsub>FTD</THsub>
                                        <THsub>FTD</THsub><THsub>FTD</THsub>
                                    </tr>
                                    <tr>
                                        <th className="border border-gray-200 bg-white px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">
                                            EMPLOYEE NAME
                                        </th>
                                        <th className="border border-gray-200 bg-white" colSpan={4} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="border border-gray-200 px-4 py-8 text-center text-gray-400 text-sm">
                                                No sales persons found for this store.
                                            </td>
                                        </tr>
                                    ) : rows.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-gray-200 px-4 py-2">
                                                <span className="text-sm font-medium text-gray-800 uppercase">{row.employeeName}</span>
                                            </td>
                                            {["shoe_bill_ftd","shoe_qty_ftd","shirt_bill_ftd","shirt_qty_ftd"].map(field => (
                                                <td key={field} className="border border-gray-200 px-2 py-2">
                                                    <input
                                                        type="number"
                                                        value={row[field]}
                                                        onChange={e => handleRowChange(idx, field, e.target.value)}
                                                        className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loadingEmps && !selectedLocCode && (
                        <div className="w-full border border-gray-200 rounded py-16 text-center text-gray-400 text-sm mb-10">
                            Select a store to load sales persons.
                        </div>
                    )}

                    <div className="flex justify-center mt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !selectedLocCode || rows.length === 0}
                            className="px-16 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg font-semibold text-sm transition"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // LIST VIEW
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    return (
        <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
            <div className="px-8 py-6">

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-gray-900">DSR-Sale List</h1>
                        {/* Show indicator when displaying invoice-computed data */}
                        {!hasManualEntry && invoiceFtdRows.length > 0 && !loadingInvoiceFtd && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-0.5">
                                Auto from Invoices
                            </span>
                        )}
                        {loadingInvoiceFtd && (
                            <span className="text-xs text-gray-400 animate-pulse">Loading invoice dataâ€¦</span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date filter */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Date</label>
                            <input
                                type="date"
                                value={listDate}
                                onChange={e => setListDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>

                        {/* Store filter */}
                        {isAdmin ? (
                            <select
                                value={listLocCode}
                                onChange={e => setListLocCode(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 min-w-[180px]"
                            >
                                <option value="all">All Stores</option>
                                {ALL_STORES.map(s => (
                                    <option key={s.locCode} value={s.locCode}>{s.locName}</option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-4 py-2">
                                {getStoreName(listLocCode)}
                            </span>
                        )}

                        <button
                            onClick={() => setView("add")}
                            className="px-5 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 transition whitespace-nowrap"
                        >
                            + Add Work Update
                        </button>

                        {/* Edit icon â€” opens edit for the current entry */}
                        {entries.length > 0 && (
                            <button
                                onClick={() => openEdit(entries[0])}
                                className="text-gray-700 hover:text-black transition"
                                title="Edit entry"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                    {loadingList ? (
                        <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading...</div>
                    ) : (
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-white">
                                    <th rowSpan={3} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ minWidth: 140 }}>
                                        EMPLOYEE NAME
                                    </th>
                                    {isAdmin && (
                                        <th rowSpan={3} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                                            STORE
                                        </th>
                                    )}
                                    <th colSpan={4} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">SHOE</th>
                                    <th colSpan={4} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">SHIRT</th>
                                </tr>
                                <tr className="bg-white">
                                    <th colSpan={2} className="border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">BILL</th>
                                    <th colSpan={2} className="border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">QTY</th>
                                    <th colSpan={2} className="border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">BILL</th>
                                    <th colSpan={2} className="border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">QTY</th>
                                </tr>
                                <tr className="bg-white">
                                    {["FTD","MTD","FTD","MTD","FTD","MTD","FTD","MTD"].map((l, i) => (
                                        <th key={i} className="border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{l}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 11 : 10} className="border border-gray-200 px-4 py-10 text-center text-gray-400 text-sm">
                                            No DSR data for {fmtDate(listDate)}.
                                        </td>
                                    </tr>
                                ) : visibleRows.map((row, i) => {
                                    const mtd = getMtd(row.employeeName, row.locCode);
                                    return (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="border border-gray-200 px-3 py-2 text-gray-700 font-medium uppercase">{row.employeeName}</td>
                                        {isAdmin && <td className="border border-gray-200 px-3 py-2 text-center text-gray-500 text-xs">{row.storeName}</td>}
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-700">{row.shoe_bill_ftd  || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{mtd.shoe_bill_mtd  || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-700">{row.shoe_qty_ftd   || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{mtd.shoe_qty_mtd   || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-700">{row.shirt_bill_ftd || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{mtd.shirt_bill_mtd || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-700">{row.shirt_qty_ftd  || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{mtd.shirt_qty_mtd  || 0}</td>
                                    </tr>
                                    );
                                })}

                                {/* Totals */}
                                <tr className="font-semibold bg-white">
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">Total</td>
                                    {isAdmin && <td className="border border-gray-200 px-3 py-2" />}
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.shoe_bill_ftd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{mtdTotals.shoe_bill_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.shoe_qty_ftd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{mtdTotals.shoe_qty_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.shirt_bill_ftd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{mtdTotals.shirt_bill_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.shirt_qty_ftd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{mtdTotals.shirt_qty_mtd}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DsrSale;


