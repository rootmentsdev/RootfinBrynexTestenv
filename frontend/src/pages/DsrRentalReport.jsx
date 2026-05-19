import { useState, useEffect, useRef } from "react";
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

const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = (iso || "").split("T")[0].split("-");
    return `${d}-${m}-${y}`;
};

const n = (v) => (isNaN(+v) ? 0 : +v);
const pct = (v) => `${n(v).toFixed(2)}%`;

// ── th helpers ──
const TH = ({ children, ...p }) => (
    <th className="border border-gray-300 bg-gray-50 py-1.5 px-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap" {...p}>
        {children}
    </th>
);
const THsub = ({ children, ...p }) => (
    <th className="border border-gray-300 bg-white py-1 px-2 text-center text-xs font-medium text-gray-500 whitespace-nowrap" {...p}>
        {children}
    </th>
);
const TD = ({ children, className = "", ...p }) => (
    <td className={`border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-700 ${className}`} {...p}>
        {children}
    </td>
);

// All numeric fields in a row (for totals)
const NUM_FIELDS = [
    "bill_ftd","bill_mtd","bill_ly_mtd","bill_l2l",
    "qty_ftd","qty_mtd","qty_ly_mtd","qty_l2l",
    "value_ftd","value_mtd","value_ly_mtd","value_l2l",
    "abs","abv",
    "value_tgt","value_ach",
    "walkin_ftd","walkin_mtd","walkin_ly_mtd","walkin_l2l",
    "loss_ftd","loss_mtd",
    "conversion",
];

const EMPTY_ROW = () => {
    const r = {};
    NUM_FIELDS.forEach(f => { r[f] = 0; });
    return r;
};

const DsrRentalReport = () => {
    const getCurrentUser = () => JSON.parse(localStorage.getItem("rootfinuser")) || {};
    const [currentuser, setCurrentuser] = useState(getCurrentUser);
    const isAdmin = currentuser.power === "admin";

    useEffect(() => {
        const iv = setInterval(() => {
            const fresh = getCurrentUser();
            setCurrentuser(prev => prev.locCode !== fresh.locCode ? fresh : prev);
        }, 500);
        return () => clearInterval(iv);
    }, []);

    // ── filter state ──
    const [date, setDate]               = useState(todayISO());
    const [locCode, setLocCode]         = useState(isAdmin ? "" : (currentuser.locCode || ""));
    const [employees, setEmployees]     = useState([]);
    const [selectedEmp, setSelectedEmp] = useState("");

    // ── result state ──
    const [allRows, setAllRows]     = useState([]);
    const [entryDate, setEntryDate] = useState("");
    const [loading, setLoading]     = useState(false);
    const [fetched, setFetched]     = useState(false);

    // ── table filter ──
    const [search, setSearch]   = useState("");
    const [page, setPage]       = useState(1);
    const PAGE_SIZE             = 10;

    const printRef = useRef(null);

    useEffect(() => {
        if (!isAdmin) setLocCode(currentuser.locCode || "");
    }, [currentuser.locCode, isAdmin]);

    useEffect(() => {
        if (!locCode) { setEmployees([]); setSelectedEmp(""); return; }
        fetch(`${API_URL}/api/sales-persons?locCode=${locCode}&isActive=true`)
            .then(r => r.json())
            .then(data => setEmployees(data.salesPersons || []))
            .catch(() => setEmployees([]));
    }, [locCode]);

    const handleFetch = async () => {
        if (!locCode) return alert("Please select a store.");
        if (!date)    return alert("Please select a date.");
        setLoading(true);
        setFetched(false);
        try {
            const res  = await fetch(`${API_URL}/api/dsr/rental?locCode=${locCode}&date=${date}`);
            const data = await res.json();
            const entries = data.entries || [];
            setEntryDate(entries[0]?.date || date);

            // flatten rows
            const savedMap = {};
            entries.forEach(e => {
                e.rows.forEach(r => {
                    const key = r.employeeName.trim().toUpperCase();
                    if (!savedMap[key]) {
                        savedMap[key] = { ...EMPTY_ROW(), employeeName: r.employeeName, _createdAt: e.createdAt || e.date };
                    }
                    NUM_FIELDS.forEach(f => { savedMap[key][f] += n(r[f]); });
                });
            });

            setAllRows(Object.values(savedMap));
            setPage(1);
            setFetched(true);
        } catch (err) {
            console.error("DsrRentalReport fetch error:", err);
            alert("Failed to fetch report data.");
        } finally {
            setLoading(false);
        }
    };

    // ── filtered rows ──
    const filtered = allRows
        .filter(r => !search || r.employeeName.toLowerCase().includes(search.toLowerCase()))
        .filter(r => !selectedEmp || r.employeeName.trim().toUpperCase() === selectedEmp.trim().toUpperCase());

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // ── totals across ALL filtered rows ──
    const totals = EMPTY_ROW();
    filtered.forEach(r => { NUM_FIELDS.forEach(f => { totals[f] += n(r[f]); }); });

    // ── Excel export ──
    const handleExcel = () => {
        const hdr = [
            "Employee Name",
            "Bill Ftd","Bill Mtd","Bill LY MTD","Bill L2L",
            "Qty Ftd","Qty Mtd","Qty LY MTD","Qty L2L",
            "Value Ftd","Value Mtd","Value LY MTD","Value L2L",
            "ABS","ABV",
            "Value TGT","Value Ach%",
            "Walkin Ftd","Walkin Mtd","Walkin LY MTD","Walkin L2L",
            "Loss FTD","Loss MTD",
            "CON%",
            "Created On",
        ];
        const rows = [hdr.join(",")];
        filtered.forEach(r => {
            rows.push([
                r.employeeName,
                ...NUM_FIELDS.map(f => n(r[f])),
                fmtDate((r._createdAt || "").split("T")[0] || entryDate),
            ].join(","));
        });
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = `dsr-rental-report-${date}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        if (!printRef.current) return;
        const w = window.open("", "_blank", "width=1400,height=700");
        w.document.write(`<html><head><title>DSR Rental Report</title>
        <style>@page{margin:8mm;size:landscape}body{font-family:Arial,sans-serif;font-size:9px}
        table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:3px 5px;text-align:center}
        th{background:#f1f5f9;font-weight:600}</style></head>
        <body>${printRef.current.innerHTML}</body></html>`);
        w.document.close(); w.focus(); w.print(); w.close();
    };

    return (
        <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
            <div className="px-8 py-6">
                <h1 className="text-xl font-bold text-gray-900 mb-5">DSR-Rental Report</h1>

                {/* ── Filter card ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 mb-5">
                    <div className="flex flex-wrap items-end gap-6">
                        {/* Date */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                            <input type="date" value={date}
                                onChange={e => { setDate(e.target.value); setFetched(false); }}
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-52 outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                        {/* Store */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Store <span className="text-red-500">*</span>
                            </label>
                            {isAdmin ? (
                                <select value={locCode}
                                    onChange={e => { setLocCode(e.target.value); setFetched(false); setSelectedEmp(""); }}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                >
                                    <option value="">-- Select Store --</option>
                                    {ALL_STORES.map(s => <option key={s.locCode} value={s.locCode}>{s.locName}</option>)}
                                </select>
                            ) : (
                                <div className="border border-gray-300 rounded px-3 py-2 text-sm w-64 bg-gray-50 text-gray-700 font-medium">
                                    {getStoreName(locCode)}
                                </div>
                            )}
                        </div>
                        {/* Employee */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee (Optional)</label>
                            <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-56 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            >
                                <option value="">Select Employee</option>
                                {employees.map(p => {
                                    const name = `${p.firstName}${p.lastName && p.lastName !== "-" ? " " + p.lastName : ""}`;
                                    return <option key={p._id} value={name}>{name}</option>;
                                })}
                            </select>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                        <span className="text-red-500 font-semibold">Note:</span> To view all employee data, do not select any employee from the dropdown.
                    </p>
                </div>

                {/* Save button */}
                <div className="flex justify-center mb-5">
                    <button onClick={handleFetch} disabled={loading || !locCode}
                        className="px-14 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg font-semibold text-sm transition"
                    >
                        {loading ? "Loading..." : "Save"}
                    </button>
                </div>

                {/* ── Results ── */}
                {fetched && (
                    <>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                            <input type="text" placeholder="Search" value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} title="Print"
                                    className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 6 2 18 2 18 9"/>
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                        <rect x="6" y="14" width="12" height="8"/>
                                    </svg>
                                </button>
                                <button onClick={handleExcel} title="Export Excel"
                                    className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                        <line x1="8" y1="13" x2="16" y2="13"/>
                                        <line x1="8" y1="17" x2="16" y2="17"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm" ref={printRef}>
                            <table className="text-xs border-collapse" style={{ minWidth: 1600 }}>
                                <thead>
                                    {/* Row 1 — group headers */}
                                    <tr>
                                        <TH rowSpan={3} style={{ minWidth: 120, textAlign: "left" }}>Employee Name</TH>
                                        <TH colSpan={4}>Bill</TH>
                                        <TH colSpan={4}>Qty</TH>
                                        <TH colSpan={4}>Value</TH>
                                        <TH rowSpan={2}>ABS</TH>
                                        <TH rowSpan={2}>ABV</TH>
                                        <TH colSpan={2}>Value</TH>
                                        <TH colSpan={4}>Qty Walkin</TH>
                                        <TH colSpan={2}>Loss of sales</TH>
                                        <TH rowSpan={2}>Conversion</TH>
                                        <TH rowSpan={3} style={{ minWidth: 80 }}>Created on</TH>
                                    </tr>
                                    {/* Row 2 — sub-group headers */}
                                    <tr>
                                        {/* Bill sub */}
                                        <TH colSpan={4}></TH>
                                        {/* Qty sub */}
                                        <TH colSpan={4}></TH>
                                        {/* Value sub */}
                                        <TH colSpan={4}></TH>
                                        {/* ABS ABV already rowspan=2 */}
                                        {/* Value TGT / Ach% */}
                                        <TH>TGT</TH>
                                        <TH>Ach %</TH>
                                        {/* Walkin sub */}
                                        <TH colSpan={4}></TH>
                                        {/* Loss sub */}
                                        <TH colSpan={2}></TH>
                                        {/* Conversion already rowspan=2 */}
                                    </tr>
                                    {/* Row 3 — leaf headers */}
                                    <tr>
                                        <THsub>Ftd</THsub><THsub>Mtd</THsub><THsub>LY MTD</THsub><THsub>L2L</THsub>
                                        <THsub>Ftd</THsub><THsub>Mtd</THsub><THsub>LY MTD</THsub><THsub>L2L</THsub>
                                        <THsub>Ftd</THsub><THsub>Mtd</THsub><THsub>LY MTD</THsub><THsub>L2L</THsub>
                                        <THsub>-</THsub><THsub>-</THsub>
                                        <THsub>-</THsub><THsub>-</THsub>
                                        <THsub>Ftd</THsub><THsub>Mtd</THsub><THsub>LY MTD</THsub><THsub>L2L</THsub>
                                        <THsub>FTD</THsub><THsub>MTD</THsub>
                                        <THsub>CON %</THsub>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paged.length === 0 ? (
                                        <tr>
                                            <td colSpan={24} className="border border-gray-200 px-4 py-8 text-center text-gray-400 text-sm">
                                                No data available in table
                                            </td>
                                        </tr>
                                    ) : paged.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="border border-gray-200 px-3 py-1.5 text-xs text-gray-700 font-medium uppercase text-left">{row.employeeName}</td>
                                            <TD>{n(row.bill_ftd)}</TD>
                                            <TD>{n(row.bill_mtd)}</TD>
                                            <TD>{n(row.bill_ly_mtd)}</TD>
                                            <TD>{n(row.bill_l2l)}</TD>
                                            <TD>{n(row.qty_ftd)}</TD>
                                            <TD>{n(row.qty_mtd)}</TD>
                                            <TD>{n(row.qty_ly_mtd)}</TD>
                                            <TD>{n(row.qty_l2l)}</TD>
                                            <TD>{n(row.value_ftd)}</TD>
                                            <TD>{n(row.value_mtd)}</TD>
                                            <TD>{n(row.value_ly_mtd)}</TD>
                                            <TD>{n(row.value_l2l)}</TD>
                                            <TD>{n(row.abs).toFixed(2)}</TD>
                                            <TD>{n(row.abv).toFixed(2)}</TD>
                                            <TD>{n(row.value_tgt)}</TD>
                                            <TD>{pct(row.value_ach)}</TD>
                                            <TD>{n(row.walkin_ftd)}</TD>
                                            <TD>{n(row.walkin_mtd)}</TD>
                                            <TD>{n(row.walkin_ly_mtd)}</TD>
                                            <TD>{n(row.walkin_l2l)}</TD>
                                            <TD>{n(row.loss_ftd)}</TD>
                                            <TD>{n(row.loss_mtd)}</TD>
                                            <TD>{pct(row.conversion)}</TD>
                                            <TD className="whitespace-nowrap">{fmtDate((row._createdAt || "").split("T")[0] || entryDate)}</TD>
                                        </tr>
                                    ))}

                                    {/* Totals */}
                                    <tr className="font-semibold bg-gray-50">
                                        <td className="border border-gray-200 px-3 py-1.5 text-xs text-gray-800 text-center">Total</td>
                                        <TD className="font-semibold text-gray-800">{n(totals.bill_ftd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.bill_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.bill_ly_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{pct(totals.bill_l2l)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.qty_ftd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.qty_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.qty_ly_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{pct(totals.qty_l2l)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.value_ftd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.value_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.value_ly_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{pct(totals.value_l2l)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.abs).toFixed(2)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.abv).toFixed(2)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.value_tgt)}</TD>
                                        <TD className="font-semibold text-gray-800">{pct(totals.value_ach)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.walkin_ftd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.walkin_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.walkin_ly_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{pct(totals.walkin_l2l)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.loss_ftd)}</TD>
                                        <TD className="font-semibold text-gray-800">{n(totals.loss_mtd)}</TD>
                                        <TD className="font-semibold text-gray-800">{pct(totals.conversion)}</TD>
                                        <TD />
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                            <span>
                                Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-40">
                                    Previous
                                </button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-40">
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DsrRentalReport;

