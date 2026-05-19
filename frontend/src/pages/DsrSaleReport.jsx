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
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
};

const ach = (ftd, tgt) => {
    if (!tgt || tgt === 0) return "0.00%";
    return ((ftd / tgt) * 100).toFixed(2) + "%";
};

// ── th helpers ──
const TH = ({ children, ...p }) => (
    <th className="border border-gray-200 bg-white py-2 px-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide" {...p}>
        {children}
    </th>
);
const THsub = ({ children, ...p }) => (
    <th className="border border-gray-200 bg-white py-1.5 px-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide" {...p}>
        {children}
    </th>
);

const DsrSaleReport = () => {
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
    const [allRows, setAllRows]   = useState([]);   // full unfiltered result
    const [mtdMap, setMtdMap]     = useState({});
    const [entryDate, setEntryDate] = useState("");  // date from the fetched entry
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);

    // ── table filter state ──
    const [filterType, setFilterType] = useState("All");
    const [search, setSearch]         = useState("");

    const printRef = useRef(null);

    // sync locCode for non-admin
    useEffect(() => {
        if (!isAdmin) setLocCode(currentuser.locCode || "");
    }, [currentuser.locCode, isAdmin]);

    // load employees when store changes
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
            const [entriesRes, mtdRes] = await Promise.all([
                fetch(`${API_URL}/api/dsr/sale?locCode=${locCode}&date=${date}`),
                fetch(`${API_URL}/api/dsr/sale/mtd?locCode=${locCode}&date=${date}`),
            ]);
            const entriesData = await entriesRes.json();
            const mtdData     = await mtdRes.json();

            const entries = entriesData.entries || [];
            const mtd     = mtdData.mtd || {};
            setMtdMap(mtd);
            setEntryDate(entries[0]?.date || date);

            // flatten all rows from all entries for this date+store
            const savedMap = {};
            entries.forEach(e => {
                e.rows.forEach(r => {
                    const key = r.employeeName.trim().toUpperCase();
                    if (!savedMap[key]) {
                        savedMap[key] = { ...r, _createdAt: e.createdAt || e.date };
                    } else {
                        savedMap[key].shoe_bill_ftd  += r.shoe_bill_ftd  || 0;
                        savedMap[key].shoe_qty_ftd   += r.shoe_qty_ftd   || 0;
                        savedMap[key].shirt_bill_ftd += r.shirt_bill_ftd || 0;
                        savedMap[key].shirt_qty_ftd  += r.shirt_qty_ftd  || 0;
                    }
                });
            });

            setAllRows(Object.values(savedMap));
            setFetched(true);
        } catch (err) {
            console.error("DsrSaleReport fetch error:", err);
            alert("Failed to fetch report data.");
        } finally {
            setLoading(false);
        }
    };

    const getMtd = (employeeName) => {
        const key = (employeeName || "").trim().toUpperCase();
        return mtdMap[key] || { shoe_bill_mtd: 0, shoe_qty_mtd: 0, shirt_bill_mtd: 0, shirt_qty_mtd: 0 };
    };

    // ── apply table filters ──
    const displayedRows = allRows.filter(row => {
        const name = (row.employeeName || "").toLowerCase();
        const matchSearch = !search || name.includes(search.toLowerCase());
        // filterType: "All" | "Shoe" | "Shirt"
        return matchSearch;
    }).filter(row => {
        if (filterType === "Shoe")  return (row.shoe_bill_ftd  || 0) > 0 || (row.shoe_qty_ftd  || 0) > 0;
        if (filterType === "Shirt") return (row.shirt_bill_ftd || 0) > 0 || (row.shirt_qty_ftd || 0) > 0;
        return true;
    }).filter(row => {
        if (!selectedEmp) return true;
        return row.employeeName.trim().toUpperCase() === selectedEmp.trim().toUpperCase();
    });

    // ── totals ──
    const totals = {
        shoe_bill_ftd:  displayedRows.reduce((s, r) => s + (r.shoe_bill_ftd  || 0), 0),
        shoe_qty_ftd:   displayedRows.reduce((s, r) => s + (r.shoe_qty_ftd   || 0), 0),
        shirt_bill_ftd: displayedRows.reduce((s, r) => s + (r.shirt_bill_ftd || 0), 0),
        shirt_qty_ftd:  displayedRows.reduce((s, r) => s + (r.shirt_qty_ftd  || 0), 0),
    };
    const mtdTotals = {
        shoe_bill_mtd:  Object.values(mtdMap).reduce((s, r) => s + (r.shoe_bill_mtd  || 0), 0),
        shoe_qty_mtd:   Object.values(mtdMap).reduce((s, r) => s + (r.shoe_qty_mtd   || 0), 0),
        shirt_bill_mtd: Object.values(mtdMap).reduce((s, r) => s + (r.shirt_bill_mtd || 0), 0),
        shirt_qty_mtd:  Object.values(mtdMap).reduce((s, r) => s + (r.shirt_qty_mtd  || 0), 0),
    };

    // ── Excel export ──
    const handleExcel = () => {
        const headers = [
            "Employee Name",
            "Shoe Bill FTD","Shoe Bill MTD","Shoe Qty FTD","Shoe Qty MTD","Shoe TGT","Shoe ACH%",
            "Shirt Bill FTD","Shirt Bill MTD","Shirt Qty FTD","Shirt Qty MTD","Shirt TGT","Shirt ACH%",
            "Created On"
        ];
        const csvRows = [headers.join(",")];
        displayedRows.forEach(row => {
            const mtd = getMtd(row.employeeName);
            csvRows.push([
                row.employeeName,
                row.shoe_bill_ftd  || 0, mtd.shoe_bill_mtd  || 0,
                row.shoe_qty_ftd   || 0, mtd.shoe_qty_mtd   || 0,
                0, ach(row.shoe_bill_ftd || 0, 0),
                row.shirt_bill_ftd || 0, mtd.shirt_bill_mtd || 0,
                row.shirt_qty_ftd  || 0, mtd.shirt_qty_mtd  || 0,
                0, ach(row.shirt_bill_ftd || 0, 0),
                fmtDate(row._createdAt?.split?.("T")[0] || entryDate),
            ].join(","));
        });
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = `dsr-sale-report-${date}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // ── Print ──
    const handlePrint = () => {
        if (!printRef.current) return;
        const w = window.open("", "_blank", "width=1100,height=700");
        w.document.write(`<html><head><title>DSR Sale Report</title>
        <style>@page{margin:10mm}body{font-family:Arial,sans-serif;font-size:11px}
        table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:center}
        th{background:#f1f5f9;font-weight:600}</style></head>
        <body>${printRef.current.innerHTML}</body></html>`);
        w.document.close(); w.focus(); w.print(); w.close();
    };

    return (
        <div className="ml-[240px] min-h-screen bg-[#f4f6f9]">
            <div className="px-8 py-6">
                <h1 className="text-xl font-bold text-gray-900 mb-5">DSR Sale Report</h1>

                {/* ── Filter card ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 mb-6">
                    <div className="flex flex-wrap items-end gap-6">

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                            <input
                                type="date"
                                value={date}
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
                                <select
                                    value={locCode}
                                    onChange={e => { setLocCode(e.target.value); setFetched(false); setSelectedEmp(""); }}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                >
                                    <option value="">-- Select Store --</option>
                                    {ALL_STORES.map(s => (
                                        <option key={s.locCode} value={s.locCode}>{s.locName}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="border border-gray-300 rounded px-3 py-2 text-sm w-64 bg-gray-50 text-gray-700 font-medium">
                                    {getStoreName(locCode)}
                                </div>
                            )}
                        </div>

                        {/* Employee (optional) */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee (Optional)</label>
                            <select
                                value={selectedEmp}
                                onChange={e => setSelectedEmp(e.target.value)}
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

                    {/* Note */}
                    <p className="mt-3 text-xs text-gray-500">
                        <span className="text-red-500 font-semibold">Note:</span> To view all employee data, do not select any employee from the dropdown.
                    </p>
                </div>

                {/* Save / Fetch button */}
                <div className="flex justify-center mb-6">
                    <button
                        onClick={handleFetch}
                        disabled={loading || !locCode}
                        className="px-14 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg font-semibold text-sm transition"
                    >
                        {loading ? "Loading..." : "Save"}
                    </button>
                </div>

                {/* ── Results section ── */}
                {fetched && (
                    <>
                        {/* Table toolbar */}
                        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <select
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="All">All</option>
                                    <option value="Shoe">Shoe</option>
                                    <option value="Shirt">Shirt</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Print */}
                                <button
                                    onClick={handlePrint}
                                    title="Print"
                                    className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                        <rect x="6" y="14" width="12" height="8"/>
                                    </svg>
                                </button>
                                {/* Excel */}
                                <button
                                    onClick={handleExcel}
                                    title="Export Excel"
                                    className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm" ref={printRef}>
                            {displayedRows.length === 0 ? (
                                <div className="px-6 py-10 text-center text-gray-400 text-sm">
                                    No DSR data found for the selected filters.
                                </div>
                            ) : (
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        {/* Row 1: group headers */}
                                        <tr className="bg-white">
                                            <TH rowSpan={3} style={{ minWidth: 130, textAlign: "left" }}>
                                                EMPLOYEE{"\n"}NAME
                                            </TH>
                                            <TH colSpan={6}>SHOE</TH>
                                            <TH colSpan={6}>SHIRT</TH>
                                            <TH rowSpan={3} style={{ minWidth: 80 }}>CREATED ON</TH>
                                        </tr>
                                        {/* Row 2: sub-group headers */}
                                        <tr className="bg-white">
                                            <TH colSpan={2}>BILL</TH>
                                            <TH colSpan={2}>QTY</TH>
                                            <TH rowSpan={2}>TGT</TH>
                                            <TH rowSpan={2}>ACH %</TH>
                                            <TH colSpan={2}>BILL</TH>
                                            <TH colSpan={2}>QTY</TH>
                                            <TH rowSpan={2}>TGT</TH>
                                            <TH rowSpan={2}>ACH %</TH>
                                        </tr>
                                        {/* Row 3: FTD/MTD labels */}
                                        <tr className="bg-white">
                                            <THsub>FTD</THsub><THsub>MTD</THsub>
                                            <THsub>FTD</THsub><THsub>MTD</THsub>
                                            <THsub>FTD</THsub><THsub>MTD</THsub>
                                            <THsub>FTD</THsub><THsub>MTD</THsub>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedRows.map((row, i) => {
                                            const mtd = getMtd(row.employeeName);
                                            const shoeTgt   = 0;
                                            const shirtTgt  = 0;
                                            const shoeAch   = ach(row.shoe_bill_ftd  || 0, shoeTgt);
                                            const shirtAch  = ach(row.shirt_bill_ftd || 0, shirtTgt);
                                            const createdOn = fmtDate(
                                                (row._createdAt || "").split("T")[0] || entryDate
                                            );
                                            return (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="border border-gray-200 px-3 py-2 text-gray-700 font-medium uppercase text-left">{row.employeeName}</td>
                                                    {/* SHOE BILL */}
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-700">{row.shoe_bill_ftd  || 0}</td>
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{mtd.shoe_bill_mtd  || 0}</td>
                                                    {/* SHOE QTY */}
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-700">{row.shoe_qty_ftd   || 0}</td>
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{mtd.shoe_qty_mtd   || 0}</td>
                                                    {/* SHOE TGT / ACH */}
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{shoeTgt}</td>
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{shoeAch}</td>
                                                    {/* SHIRT BILL */}
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-700">{row.shirt_bill_ftd || 0}</td>
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{mtd.shirt_bill_mtd || 0}</td>
                                                    {/* SHIRT QTY */}
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-700">{row.shirt_qty_ftd  || 0}</td>
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{mtd.shirt_qty_mtd  || 0}</td>
                                                    {/* SHIRT TGT / ACH */}
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{shirtTgt}</td>
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500">{shirtAch}</td>
                                                    {/* CREATED ON */}
                                                    <td className="border border-gray-200 px-2 py-2 text-center text-gray-500 whitespace-nowrap">{createdOn}</td>
                                                </tr>
                                            );
                                        })}

                                        {/* Totals row */}
                                        <tr className="font-semibold bg-gray-50">
                                            <td className="border border-gray-200 px-3 py-2 text-gray-800 text-center">Total</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{totals.shoe_bill_ftd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{mtdTotals.shoe_bill_mtd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{totals.shoe_qty_ftd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{mtdTotals.shoe_qty_mtd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">0</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{ach(totals.shoe_bill_ftd, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{totals.shirt_bill_ftd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{mtdTotals.shirt_bill_mtd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{totals.shirt_qty_ftd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{mtdTotals.shirt_qty_mtd}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">0</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center text-gray-800">{ach(totals.shirt_bill_ftd, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2" />
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DsrSaleReport;

