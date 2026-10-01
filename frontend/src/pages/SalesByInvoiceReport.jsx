import Headers from '../components/Header.jsx';
import { useEffect, useState } from "react";
import baseUrl from '../api/api.js';
import { CSVLink } from 'react-csv';
import { Helmet } from "react-helmet";
import { SlidersHorizontal, Download, Calendar, ChevronDown, X } from "lucide-react";
import useSidebar from '../hooks/useSidebar.js';

/* ── tiny native select wrapper ── */
const NativeSelect = ({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full h-[40px] border border-gray-300 rounded-md pl-3 pr-9 text-sm text-gray-700 bg-white focus:outline-none focus:border-purple-500 appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value || "__null__"} value={o.value || ""}>{o.label}</option>
      ))}
    </select>
    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
  </div>
);

const SalesByInvoiceReport = () => {
  const isSidebarOpen = useSidebar();
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedStore, setSelectedStore] = useState("all");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [csvData, setCsvData] = useState([]);

  // Advanced filter states
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [skuSearch, setSkuSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("rootfinuser"));
  const isAdmin = (currentUser?.power || "").toLowerCase() === "admin";
  const isMainAdmin = currentUser?.locCode === '858' || currentUser?.locCode === '103' || (currentUser?.email && ['officerootments@gmail.com'].includes(currentUser.email.toLowerCase()));
  const isWarehouse = (currentUser?.power || "").toLowerCase() === "warehouse";
  const canSeeCost = isAdmin || isWarehouse || isMainAdmin;
  const isClusterManager = (currentUser?.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = currentUser?.allowedLocCodes || [];
  const canSelectStore = isAdmin || isClusterManager;

  useEffect(() => {
    if (!canSelectStore && currentUser?.locCode) setSelectedStore(currentUser.locCode);
    if (isClusterManager && clusterAllowedLocCodes.length > 0 && selectedStore === "all") setSelectedStore(clusterAllowedLocCodes[0]);
  }, []);

  const storeOptions = [
    { value: "all", label: "All Stores" },
    { value: "144", label: "Z-Edapally1" },
    { value: "858", label: "Warehouse" },
    { value: "702", label: "G-Edappally" },
    { value: "759", label: "HEAD OFFICE01" },
    { value: "700", label: "SG-Trivandrum" },
    { value: "100", label: "Z- Edappal" },
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
    { value: "101", label: "Production" },
    { value: "102", label: "Office" },
    { value: "103", label: "WAREHOUSE" }
  ];

  const categoryOptions = [
    { value: "Shoes", label: "Shoes" },
    { value: "Shirts", label: "Shirts" },
    { value: "Accessories", label: "Accessories" },
    { value: "Others", label: "Others" }
  ];

  const sizeOptions = ["XS","S","M","L","XL","XXL","6","7","8","9","10","11","12","28","30","32","34","36","38","40","42"].map(v => ({ value: v, label: v }));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom: fromDate,
        dateTo: toDate,
        locCode: canSelectStore ? selectedStore : currentUser?.locCode,
        userId: currentUser?.email || currentUser?.userId,
        isAdmin: isAdmin ? "true" : "false",
        isClusterManager: isClusterManager ? "true" : "false",
        ...(isClusterManager && clusterAllowedLocCodes.length > 0 ? { allowedLocCodes: clusterAllowedLocCodes.join(",") } : {}),
        ...(categoryFilter && { category: categoryFilter }),
        ...(skuSearch && { sku: skuSearch }),
        ...(sizeFilter && { size: sizeFilter }),
        ...(customerSearch && { customer: customerSearch })
      });
      const response = await fetch(`${baseUrl.baseUrl}api/reports/sales/by-invoice?${params}`);
      if (!response.ok) { alert(`API Error: ${response.status}`); return; }
      const result = await response.json();
      if (result.success) {
        const allInvoices = result.data.invoices || [];

        // Fix: Exclude returned invoices (itemCount === 0) from summary totals
        const nonReturned = allInvoices.filter(inv => inv.itemCount > 0);
        const returnedCount = allInvoices.length - nonReturned.length;
        const totalSales = nonReturned.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
        const totalItems = nonReturned.reduce((s, inv) => s + (inv.itemCount || 0), 0);
        const avgInvoiceValue = nonReturned.length > 0 ? totalSales / nonReturned.length : 0;

        setReportData({
          ...result.data,
          summary: {
            ...(result.data.summary || {}),
            totalInvoices: nonReturned.length,
            totalSales,
            totalItems,
            avgInvoiceValue,
            returnedCount
          }
        });

        const csv = allInvoices.map(inv => ({
          Date: inv.date, "Invoice No": inv.invoiceNumber, Customer: inv.customer,
          SKU: inv.skus || "N/A", Category: inv.category, "Item Count": inv.itemCount,
          "Total Amount": inv.totalAmount, Discount: inv.discount,
          ...(canSeeCost ? { "Net Amount": inv.netAmount, Profit: inv.profit || 0 } : {}),
          "Payment Method": inv.paymentMethod, Branch: inv.branch,
          "Status": inv.itemCount === 0 ? "RETURNED" : "Active"
        }));
        setCsvData(csv);
      } else { alert("Failed to fetch report: " + (result.message || "Unknown error")); }
    } catch (error) { alert("Error: " + error.message); }
    finally { setLoading(false); }

  };

  const clearFilters = () => { setCategoryFilter(null); setSkuSearch(""); setSizeFilter(null); setCustomerSearch(""); };
  const hasActiveFilters = categoryFilter || skuSearch || sizeFilter || customerSearch;

  const fmt = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
  const fmtRs = (n) => `₹${fmt(n)}`;

  const paymentBadgeStyle = (method) => {
    const m = (method || "").toLowerCase();
    if (m.includes("upi")) return "bg-purple-100 text-purple-700";
    if (m.includes("card") || m.includes("bank")) return "bg-blue-100 text-blue-700";
    if (m.includes("cash")) return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <>
      <Helmet><title>Sales by Invoice Report | RootFin</title></Helmet>
      <Headers />
      <div className={`transition-all duration-300 min-h-screen bg-white ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>

        {/* ── Row 1: Primary Filters ── */}
        <div className="flex items-end justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-end gap-4">
            {/* From Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-gray-500">From Date</label>
              <div className="relative">
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-[150px] h-[40px] border border-gray-300 rounded-md pl-3 pr-10 text-sm text-gray-700 bg-white focus:outline-none focus:border-purple-500 z-10" />
                <Calendar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-0" />
              </div>
            </div>
            {/* To Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-gray-500">To Date</label>
              <div className="relative">
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-[150px] h-[40px] border border-gray-300 rounded-md pl-3 pr-10 text-sm text-gray-700 bg-white focus:outline-none focus:border-purple-500 z-10" />
                <Calendar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-0" />
              </div>
            </div>
            {/* Store */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-gray-500">Store</label>
              {canSelectStore ? (
                <NativeSelect
                  value={selectedStore}
                  onChange={setSelectedStore}
                  placeholder="Select Store"
                  options={isClusterManager
                    ? [{ value: "all", label: "All My Stores" }, ...storeOptions.filter(s => clusterAllowedLocCodes.includes(s.value))]
                    : storeOptions}
                />
              ) : (
                <div className="h-[40px] flex items-center px-3 border border-gray-300 rounded-md text-sm text-gray-700 bg-gray-50 w-[170px]">
                  {storeOptions.find(s => s.value === selectedStore)?.label || selectedStore}
                </div>
              )}
            </div>
            {/* Fetch */}
            <button onClick={fetchReport} disabled={loading}
              className="h-[40px] px-7 bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-semibold rounded-md transition-colors flex items-center gap-2 disabled:opacity-60">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>Loading...</>
              ) : 'Fetch Data'}
            </button>
          </div>
          {/* Filters toggle */}
          <button onClick={() => setShowAdvancedFilters(v => !v)}
            className="h-[38px] px-4 border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[13px] font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            Filters <SlidersHorizontal size={14} strokeWidth={2} />
          </button>
        </div>

        {/* ── Row 2: Advanced Filters (collapsible) ── */}
        {showAdvancedFilters && (
          <div className="flex flex-wrap items-end gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
            {/* Category */}
            <div className="flex flex-col gap-1 w-[200px]">
              <label className="text-[12px] font-medium text-gray-500">Category</label>
              <NativeSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="All Categories" options={categoryOptions} />
            </div>
            {/* Size */}
            <div className="flex flex-col gap-1 w-[170px]">
              <label className="text-[12px] font-medium text-gray-500">Size</label>
              <NativeSelect value={sizeFilter} onChange={setSizeFilter} placeholder="All Size" options={sizeOptions} />
            </div>
            {/* Item SKU */}
            <div className="flex flex-col gap-1 w-[200px]">
              <label className="text-[12px] font-medium text-gray-500">Item SKU</label>
              <div className="relative">
                <input type="text" value={skuSearch} onChange={e => setSkuSearch(e.target.value)} placeholder="Search by SKU"
                  className="w-full h-[40px] border border-gray-300 rounded-md pl-3 pr-9 text-sm text-gray-700 bg-white focus:outline-none focus:border-purple-500" />
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {/* Customer */}
            <div className="flex flex-col gap-1 w-[220px]">
              <label className="text-[12px] font-medium text-gray-500">Customer</label>
              <div className="relative">
                <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search Customer"
                  className="w-full h-[40px] border border-gray-300 rounded-md pl-3 pr-9 text-sm text-gray-700 bg-white focus:outline-none focus:border-purple-500" />
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {/* Clear */}
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="h-[38px] px-5 border border-purple-500 text-purple-600 text-[13px] font-medium rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center">
                Clear all Filters
              </button>
            )}
          </div>
        )}

        {/* ── Body ── */}
        <div className="px-6 py-5">
          {reportData ? (
            <>
              {/* Summary + Export row */}
              <div className="flex items-end justify-between mb-5">
                <div className="flex items-center gap-10">
                  <div>
                    <div className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Total Invoices</div>
                    <div className="text-2xl font-bold text-gray-900">{fmt(reportData.summary?.totalInvoices)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Total Sales</div>
                    <div className="text-2xl font-bold text-gray-900">{fmt(reportData.summary?.totalSales)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Total Items</div>
                    <div className="text-2xl font-bold text-gray-900">{fmt(reportData.summary?.totalItems)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Avg Invoice Value</div>
                    <div className="text-2xl font-bold text-gray-900">{fmt(reportData.summary?.avgInvoiceValue)}</div>
                  </div>
                  {reportData.summary?.returnedCount > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold tracking-widest text-red-400 uppercase mb-1">Returns (Excluded)</div>
                      <div className="text-2xl font-bold text-red-500">{fmt(reportData.summary?.returnedCount)}</div>
                    </div>
                  )}
                </div>
                {csvData.length > 0 && (
                  <CSVLink data={csvData} filename={`sales-by-invoice-${fromDate}-to-${toDate}.csv`}
                    className="h-[40px] px-5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center gap-2 no-underline">
                    Export CSV <Download size={15} />
                  </CSVLink>
                )}
              </div>

              {/* Table */}
              <div className="border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-[#1a1f2e]">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Invoice No.</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Customer Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">SKU</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Category</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Items</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Amount</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Discount</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Net Amount</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Payment</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase whitespace-nowrap">Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.invoices?.length > 0 ? reportData.invoices.map((inv, idx) => {
                      const isReturned = inv.itemCount === 0;
                      return (
                        <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isReturned ? 'bg-red-50' : 'bg-white'}`}>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{inv.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`font-medium ${isReturned ? 'text-red-500' : 'text-gray-700'}`}>{inv.invoiceNumber}</span>
                            {isReturned && <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded">RETURNED</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{inv.customer}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-purple-500 font-mono text-xs">{inv.skus || "N/A"}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">{inv.category}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">{inv.itemCount}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">₹{fmt(inv.totalAmount)}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">₹{fmt(inv.discount)}</td>
                          <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">₹{fmt(inv.netAmount)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${paymentBadgeStyle(inv.paymentMethod)}`}>
                              {inv.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{inv.branch}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="11" className="px-4 py-14 text-center text-gray-400 text-sm">No invoices found for the selected criteria</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              {loading ? (
                <><svg className="animate-spin h-8 w-8 text-purple-400 mb-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg><span className="text-sm">Loading report...</span></>
              ) : (
                <><span className="text-4xl mb-3">📊</span><span className="text-sm">Select a date range and click Fetch Data</span></>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SalesByInvoiceReport;
