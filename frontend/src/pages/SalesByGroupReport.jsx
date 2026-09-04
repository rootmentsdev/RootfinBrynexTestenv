import { useState } from "react";
import { Helmet } from "react-helmet";
import { CSVLink } from "react-csv";
import Headers from "../components/Header.jsx";
import baseUrl from "../api/api.js";
import useSidebar from "../hooks/useSidebar";

const STORES = [
  { value: "all", label: "All Stores" },
  { value: "144", label: "Z-Edapally1" },
  { value: "702", label: "G-Edappally" },
  { value: "700", label: "SG-Trivandrum" },
  { value: "100", label: "Z-Edappal" },
  { value: "133", label: "Z.Perinthalmanna" },
  { value: "122", label: "Z.Kottakkal" },
  { value: "701", label: "G.Kottayam" },
  { value: "703", label: "G.Perumbavoor" },
  { value: "704", label: "G.Thrissur" },
  { value: "706", label: "G.Chavakkad" },
  { value: "712", label: "G.Calicut" },
  { value: "708", label: "G.Vadakara" },
  { value: "707", label: "G.Edappal" },
  { value: "709", label: "G.Perinthalmanna" },
  { value: "711", label: "G.Kottakkal" },
  { value: "710", label: "G.Manjeri" },
  { value: "705", label: "G.Palakkad" },
  { value: "717", label: "G.Kalpetta" },
  { value: "716", label: "G.Kannur" },
  { value: "718", label: "G.MG Road" },
];

const SalesByGroupReport = () => {
  const isSidebarOpen = useSidebar();
  const today = new Date().toISOString().split("T")[0];
  const user = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const isAdmin = (user.power || "").toLowerCase() === "admin";
  const isClusterManager = (user.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = user.allowedLocCodes || [];
  const canSelectStore = isAdmin || isClusterManager;

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedStore, setSelectedStore] = useState(
    isAdmin ? "all" : isClusterManager ? (clusterAllowedLocCodes[0] || "all") : user.locCode || "all"
  );
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [rows, setRows] = useState([]);
  const [fetched, setFetched] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom: fromDate,
        dateTo: toDate,
        locCode: selectedStore,
        userId: user.email || "",
        isAdmin: isAdmin ? "true" : "false",
        isClusterManager: isClusterManager ? "true" : "false",
        ...(isClusterManager && clusterAllowedLocCodes.length > 0
          ? { allowedLocCodes: clusterAllowedLocCodes.join(",") }
          : {}),
      });
      const res = await fetch(`${baseUrl.baseUrl}api/reports/sales/by-group?${params}`);
      const json = await res.json();
      if (json.success) {
        setSizes(json.data.sizes);
        setRows(json.data.rows);
        setFetched(true);
      } else {
        alert("Error: " + json.message);
      }
    } catch (e) {
      alert("Fetch error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const csvHeaders = [
    { label: "Group Name", key: "groupName" },
    ...sizes.map(s => ({ label: String(s), key: `size_${s}` })),
    { label: "Total", key: "total" },
  ];
  const csvData = rows.map(r => {
    const row = { groupName: r.groupName, total: r.total };
    sizes.forEach(s => { row[`size_${s}`] = r.sizes[s] || 0; });
    return row;
  });

  const grandTotals = {};
  sizes.forEach(s => { grandTotals[s] = rows.reduce((sum, r) => sum + (r.sizes[s] || 0), 0); });
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  const inputCls = "border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 box-border bg-white";

  return (
    <>
      <Helmet><title>Sales by Group Report | RootFin</title></Helmet>
      <Headers title="Sales by Group Report" />
      <div className="ml-[240px] p-6 bg-slate-50 min-h-screen">

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-white border border-slate-200 shadow-sm no-print">
          <div className="flex items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                style={{ height: 36 }} className={inputCls} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                style={{ height: 36 }} className={inputCls} />
            </div>
            <button onClick={fetchReport} disabled={loading}
              style={{ height: 36 }}
              className={`px-6 text-sm font-semibold text-white flex items-center gap-2 transition-all duration-200 shadow-sm ${
                loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-95 cursor-pointer"
              }`}>
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Fetching...
                </>
              ) : "Fetch Report"}
            </button>
          </div>

          <div className="w-px self-stretch bg-slate-200 mx-1" />

          <div className="flex items-end gap-3">
            {canSelectStore && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Store</label>
                <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
                  style={{ height: 36 }} className={`${inputCls} w-44`}>
                  {isClusterManager
                    ? [{ value: "all", label: "All My Stores" }, ...STORES.filter(s => clusterAllowedLocCodes.includes(s.value))].map(s => <option key={s.value} value={s.value}>{s.label}</option>)
                    : STORES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)
                  }
                </select>
              </div>
            )}
            {fetched && csvData.length > 0 && (
              <div className="flex flex-col">
                <label className="text-xs invisible mb-1">.</label>
                <CSVLink data={csvData} headers={csvHeaders}
                  filename={`sales-by-group-${fromDate}-to-${toDate}.csv`}
                  style={{ height: 36 }}
                  className="border border-blue-600 text-blue-600 px-4 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-1.5">
                  Export CSV
                </CSVLink>
              </div>
            )}
          </div>
        </div>

        {/* Summary strip */}
        {fetched && rows.length > 0 && (
          <div className="flex gap-4 mb-4">
            <div className="bg-white border border-slate-200 shadow-sm px-5 py-3 flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Groups</span>
              <span className="text-2xl font-bold text-slate-800 mt-0.5">{rows.length}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-sm px-5 py-3 flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Sizes</span>
              <span className="text-2xl font-bold text-slate-800 mt-0.5">{sizes.length}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-sm px-5 py-3 flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Total Units Sold</span>
              <span className="text-2xl font-bold text-blue-600 mt-0.5">{grandTotal}</span>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-white border border-slate-200 shadow-sm p-4">
            <div className="h-8 bg-slate-100 animate-pulse mb-2 w-full" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <div className="h-6 bg-slate-100 animate-pulse" style={{ width: "20%" }} />
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="h-6 bg-slate-100 animate-pulse flex-1" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {fetched && !loading && (
          <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
            {rows.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No sales data found for the selected period.
              </div>
            ) : (
              <table className="border-collapse w-full text-xs" style={{ minWidth: `${180 + sizes.length * 56 + 60}px` }}>
                <thead>
                  <tr className="bg-slate-700 text-white text-xs uppercase tracking-wide">
                    <th className="border-r border-slate-600 px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ minWidth: 200 }}>
                      Group Name
                    </th>
                    {sizes.map(s => (
                      <th key={s} className="border-r border-slate-600 px-3 py-2 text-center font-semibold whitespace-nowrap" style={{ minWidth: 52 }}>
                        {s}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap bg-slate-800" style={{ minWidth: 60 }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="border-r border-slate-100 px-3 py-2 text-left font-medium text-slate-800 whitespace-nowrap">
                        {row.groupName}
                      </td>
                      {sizes.map(s => (
                        <td key={s} className="border-r border-slate-100 px-3 py-2 text-center">
                          {row.sizes[s] ? (
                            <span className="font-semibold text-slate-800">{row.sizes[s]}</span>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-bold text-blue-700 bg-blue-50">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                    <td className="border-r border-slate-200 px-3 py-2 text-left text-slate-700 uppercase text-xs tracking-wide">
                      Total
                    </td>
                    {sizes.map(s => (
                      <td key={s} className="border-r border-slate-200 px-3 py-2 text-center text-slate-800 font-bold">
                        {grandTotals[s] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-white bg-blue-600">
                      {grandTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {!fetched && !loading && (
          <div className="bg-white border border-slate-200 py-20 text-center">
            <div className="text-slate-300 text-4xl mb-3">📊</div>
            <p className="text-slate-500 text-sm font-medium">Select a date range and click Fetch Report</p>
            <p className="text-slate-400 text-xs mt-1">Sales quantities grouped by item group and size</p>
          </div>
        )}
      </div>
    </>
  );
};

export default SalesByGroupReport;
