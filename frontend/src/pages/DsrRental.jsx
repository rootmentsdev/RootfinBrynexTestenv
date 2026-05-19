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

const RENTAL_FIELDS = [
    "bill_ftd","bill_mtd","bill_ly_mtd","bill_l2l",
    "qty_ftd","qty_mtd","qty_ly_mtd","qty_l2l",
    "value_ftd","value_mtd","value_ly_mtd","value_l2l",
    "abs","abv","value_tgt",
];

const emptyRow = (name = "") => {
    const row = { employeeName: name };
    RENTAL_FIELDS.forEach(f => { row[f] = ""; });
    return row;
};

const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
};

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

const DsrRental = () => {
    const getCurrentUser = () => JSON.parse(localStorage.getItem("rootfinuser")) || {};
    const [currentuser, setCurrentuser] = useState(getCurrentUser);
    const isAdmin = currentuser.power === "admin";

    useEffect(() => {
        const onStorage = () => setCurrentuser(getCurrentUser());
        window.addEventListener("storage", onStorage);
        const iv = setInterval(() => {
            const fresh = getCurrentUser();
            setCurrentuser(prev => prev.locCode !== fresh.locCode ? fresh : prev);
        }, 500);
        return () => { window.removeEventListener("storage", onStorage); clearInterval(iv); };
    }, []);

    const [view, setView] = useState("list");

    // ── edit state ──
    const [editEntry, setEditEntry] = useState(null);
    const [editRows, setEditRows]   = useState([]);
    const [updating, setUpdating]   = useState(false);

    const openEdit = (entry) => {
        setEditEntry(entry);
        const savedMap = {};
        entry.rows.forEach(r => { savedMap[r.employeeName.trim().toUpperCase()] = { ...r }; });
        const merged = listPersons.length > 0
            ? listPersons.map(p => {
                const name = `${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`;
                const key  = name.trim().toUpperCase();
                const base = { employeeName: name };
                RENTAL_FIELDS.forEach(f => { base[f] = 0; });
                return savedMap[key] || base;
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
            const res = await fetch(`${API_URL}/api/dsr/rental/${editEntry._id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    rows: editRows.map(r => {
                        const row = { employeeName: r.employeeName };
                        RENTAL_FIELDS.forEach(f => { row[f] = parseFloat(r[f]) || 0; });
                        return row;
                    }),
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                return alert(err.message || "Failed to update.");
            }
            setView("list");
            setEditEntry(null);
            fetchEntries();
        } catch (err) {
            console.error("handleUpdate error:", err);
            alert("Network error. Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    // ── list filters ──
    const [listLocCode, setListLocCode] = useState(isAdmin ? "all" : (currentuser.locCode || ""));
    const [listDate, setListDate]       = useState(todayISO());

    useEffect(() => {
        if (!isAdmin) setListLocCode(currentuser.locCode || "");
    }, [currentuser.locCode, isAdmin]);

    // ── list data ──
    const [entries, setEntries]         = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [listPersons, setListPersons] = useState([]);

    const fetchEntries = useCallback(async () => {
        setLoadingList(true);
        try {
            const params = new URLSearchParams();
            if (listDate)                             params.set("date",    listDate);
            if (listLocCode && listLocCode !== "all") params.set("locCode", listLocCode);
            const res  = await fetch(`${API_URL}/api/dsr/rental?${params}`);
            const data = await res.json();
            setEntries(data.entries || []);
        } catch (err) {
            console.error("fetchEntries error:", err);
        } finally {
            setLoadingList(false);
        }
    }, [listDate, listLocCode]);

    useEffect(() => {
        if (!listLocCode || listLocCode === "all") { setListPersons([]); return; }
        fetch(`${API_URL}/api/sales-persons?locCode=${listLocCode}&isActive=true`)
            .then(r => r.json())
            .then(data => setListPersons(data.salesPersons || []))
            .catch(() => setListPersons([]));
    }, [listLocCode]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    // ── add-form state ──
    const [formDate, setFormDate]               = useState(todayISO());
    const [selectedLocCode, setSelectedLocCode] = useState(isAdmin ? "" : (currentuser.locCode || ""));
    const [employees, setEmployees]             = useState([]);
    const [rows, setRows]                       = useState([]);
    const [loadingEmps, setLoadingEmps]         = useState(false);
    const [saving, setSaving]                   = useState(false);

    useEffect(() => {
        if (!selectedLocCode) { setEmployees([]); setRows([]); return; }
        setLoadingEmps(true);
        fetch(`${API_URL}/api/sales-persons?locCode=${selectedLocCode}&isActive=true`)
            .then(r => r.json())
            .then(data => {
                const persons = data.salesPersons || [];
                setEmployees(persons);
                setRows(persons.map(p =>
                    emptyRow(`${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`)
                ));
            })
            .catch(err => { console.error(err); setEmployees([]); setRows([]); })
            .finally(() => setLoadingEmps(false));
    }, [selectedLocCode]);

    useEffect(() => {
        if (!isAdmin && currentuser.locCode) setSelectedLocCode(currentuser.locCode);
    }, [currentuser.locCode, isAdmin]);

    const handleRowChange = (idx, field, value) =>
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

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
                rows:      rows.map(r => {
                    const row = { employeeName: r.employeeName };
                    RENTAL_FIELDS.forEach(f => { row[f] = parseFloat(r[f]) || 0; });
                    return row;
                }),
            };
            const res = await fetch(`${API_URL}/api/dsr/rental`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                return alert(err.message || "Failed to save.");
            }
            setView("list");
            setRows(employees.map(p =>
                emptyRow(`${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`)
            ));
            setListDate(formDate);
            if (!isAdmin) setListLocCode(selectedLocCode);
            fetchEntries();
        } catch (err) {
            console.error("handleSave error:", err);
            alert("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ── visible rows for list ──
    const visibleRows = (() => {
        if (listLocCode === "all") {
            const combinedMap = {};
            entries.forEach(e => {
                e.rows.forEach(r => {
                    const key = `${e.locCode}||${r.employeeName.trim().toUpperCase()}`;
                    if (!combinedMap[key]) {
                        combinedMap[key] = { ...r, storeName: e.storeName, locCode: e.locCode, _entry: e };
                    }
                });
            });
            return Object.values(combinedMap);
        }

        const savedMap = {};
        entries.forEach(e => {
            e.rows.forEach(r => {
                const key = r.employeeName.trim().toUpperCase();
                if (!savedMap[key]) {
                    savedMap[key] = { ...r, date: e.date, storeName: e.storeName, _entry: e };
                } else {
                    RENTAL_FIELDS.forEach(f => { savedMap[key][f] = (savedMap[key][f] || 0) + (r[f] || 0); });
                }
            });
        });

        const storeName = getStoreName(listLocCode);
        const result = listPersons.map(p => {
            const fullName = `${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`;
            const key      = fullName.trim().toUpperCase();
            if (savedMap[key]) return savedMap[key];
            const base = { employeeName: fullName, date: listDate, storeName, _entry: null };
            RENTAL_FIELDS.forEach(f => { base[f] = 0; });
            return base;
        });

        if (result.length > 0) result[0]._showEditBtn = true;
        return result;
    })();

    const totals = {};
    RENTAL_FIELDS.forEach(f => {
        totals[f] = visibleRows.reduce((s, r) => s + (parseFloat(r[f]) || 0), 0);
    });

    const fmtTotal = (f) => {
        if (f === "abs" || f === "abv") return totals[f].toFixed(2);
        if (f === "value_tgt") return `${totals[f]}/0`;
        return totals[f];
    };

    // ════════════════════════════════════════════════════════
    // EDIT VIEW
    // ════════════════════════════════════════════════════════
    if (view === "edit" && editEntry) {
        return (
            <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
                <div className="bg-white min-h-screen px-10 py-8">
                    <div className="flex items-center gap-3 mb-8">
                        <button
                            onClick={() => { setView("list"); setEditEntry(null); }}
                            className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
                        >
                            &#8592;
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Edit DSR-Rental</h1>
                        <span className="text-sm text-gray-400 ml-2">
                            {fmtDate(editEntry.date)} &middot; {editEntry.storeName}
                        </span>
                    </div>

                    <div className="w-full overflow-x-auto mb-10">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    <TH rowSpan={3} style={{ minWidth: 160, textAlign: "left" }}>EMPLOYEE NAME</TH>
                                    <TH colSpan={4}>BILL</TH>
                                    <TH colSpan={4}>QTY</TH>
                                    <TH colSpan={4}>VALUE</TH>
                                    <TH rowSpan={2}>ABS</TH>
                                    <TH rowSpan={2}>ABV</TH>
                                    <TH rowSpan={2}>VALUE TGT</TH>
                                </tr>
                                <tr>
                                    <THsub>FTD</THsub><THsub>MTD</THsub><THsub>LY MTD</THsub><THsub>L2L</THsub>
                                    <THsub>FTD</THsub><THsub>MTD</THsub><THsub>LY MTD</THsub><THsub>L2L</THsub>
                                    <THsub>FTD</THsub><THsub>MTD</THsub><THsub>LY MTD</THsub><THsub>L2L</THsub>
                                </tr>
                                <tr>
                                    {RENTAL_FIELDS.map(f => (
                                        <th key={f} className="border border-gray-200 bg-white" />
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {editRows.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-200 px-4 py-2">
                                            <span className="text-sm font-medium text-gray-800 uppercase">{row.employeeName}</span>
                                        </td>
                                        {RENTAL_FIELDS.map(field => (
                                            <td key={field} className="border border-gray-200 px-2 py-2">
                                                <input
                                                    type="number"
                                                    value={row[field] ?? ""}
                                                    onChange={e => handleEditRowChange(idx, field, e.target.value)}
                                                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                    style={{ minWidth: 70 }}
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

    // ════════════════════════════════════════════════════════
    // ADD FORM
    // ════════════════════════════════════════════════════════
    if (view === "add") {
        return (
            <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
                <div className="bg-white min-h-screen px-10 py-8">

                    {/* ── Date + Store ── */}
                    <div className="flex flex-wrap gap-8 mb-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-48 outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>

                        {isAdmin && (
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
                        )}
                    </div>

                    {loadingEmps && <p className="text-sm text-gray-400 mb-4">Loading employees...</p>}

                    {/* ── Table: only FTD columns, matching DSR-Sale add UI ── */}
                    {!loadingEmps && selectedLocCode && (
                        <div className="w-full overflow-x-auto mb-10">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-200 bg-white" style={{ width: "28%" }} rowSpan={2} />
                                        <TH style={{ width: "24%" }}>BILL</TH>
                                        <TH style={{ width: "24%" }}>QTY</TH>
                                        <TH style={{ width: "24%" }}>VALUE</TH>
                                    </tr>
                                    <tr>
                                        <THsub>FTD</THsub>
                                        <THsub>FTD</THsub>
                                        <THsub>FTD</THsub>
                                    </tr>
                                    <tr>
                                        <th className="border border-gray-200 bg-white px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">
                                            EMPLOYEE NAME
                                        </th>
                                        <th className="border border-gray-200 bg-white" colSpan={3} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="border border-gray-200 px-4 py-8 text-center text-gray-400 text-sm">
                                                No employees found for this store.
                                            </td>
                                        </tr>
                                    ) : rows.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-gray-200 px-4 py-2">
                                                <span className="text-sm font-medium text-gray-800 uppercase">{row.employeeName}</span>
                                            </td>
                                            {["bill_ftd", "qty_ftd", "value_ftd"].map(field => (
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
                            Select a store to load employees.
                        </div>
                    )}

                    <div className="flex justify-center mt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !selectedLocCode || rows.length === 0}
                            className="px-16 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded font-semibold text-sm transition"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════
    // LIST VIEW
    // ════════════════════════════════════════════════════════
    return (
        <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
            <div className="px-8 py-6">

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-gray-900">DSR-Rental List</h1>
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
                            + Add update
                        </button>

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
                                    <th colSpan={4} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">BILL</th>
                                    <th colSpan={4} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">QTY</th>
                                    <th colSpan={4} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">VALUE</th>
                                    <th rowSpan={2} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">ABS</th>
                                    <th rowSpan={2} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">ABV</th>
                                    <th rowSpan={2} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">VALUE TGT</th>
                                </tr>
                                <tr className="bg-white">
                                    {["FTD","MTD","LY MTD","L2L","FTD","MTD","LY MTD","L2L","FTD","MTD","LY MTD","L2L"].map((l, i) => (
                                        <th key={i} className="border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{l}</th>
                                    ))}
                                </tr>
                                <tr className="bg-white">
                                    {RENTAL_FIELDS.map(f => (
                                        <th key={f} className="border border-gray-200 bg-white" />
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 18 : 17} className="border border-gray-200 px-4 py-10 text-center text-gray-400 text-sm">
                                            No DSR rental data for {fmtDate(listDate)}.
                                        </td>
                                    </tr>
                                ) : visibleRows.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="border border-gray-200 px-3 py-2 text-gray-700 font-medium uppercase">{row.employeeName}</td>
                                        {isAdmin && <td className="border border-gray-200 px-3 py-2 text-center text-gray-500 text-xs">{row.storeName}</td>}
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-700">{row.bill_ftd    || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.bill_mtd    || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.bill_ly_mtd || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.bill_l2l   || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-700">{row.qty_ftd     || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.qty_mtd     || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.qty_ly_mtd  || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.qty_l2l    || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-700">{row.value_ftd   || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.value_mtd   || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.value_ly_mtd|| 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.value_l2l  || 0}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.abs        != null ? parseFloat(row.abs).toFixed(2) : "0.00"}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.abv        != null ? parseFloat(row.abv).toFixed(2) : "0.00"}</td>
                                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{row.value_tgt  != null ? `${row.value_tgt}/0` : "0/0"}</td>
                                    </tr>
                                ))}

                                {/* Totals row */}
                                <tr className="font-semibold bg-white">
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">Total</td>
                                    {isAdmin && <td className="border border-gray-200 px-3 py-2" />}
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.bill_ftd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.bill_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.bill_ly_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.bill_l2l}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.qty_ftd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.qty_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.qty_ly_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.qty_l2l}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.value_ftd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.value_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.value_ly_mtd}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.value_l2l}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.abs.toFixed(2)}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.abv.toFixed(2)}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-800">{totals.value_tgt}/0</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DsrRental;


