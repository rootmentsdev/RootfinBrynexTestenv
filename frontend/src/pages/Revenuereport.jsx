import Headers from '../components/Header.jsx';
import { useMemo, useRef, useState } from "react";
import useFetch from '../hooks/useFetch.jsx';
import { Helmet } from "react-helmet";
import { useSidebar } from '../hooks/useSidebar.js';
import { Filter, ArrowUpDown, Download, Search } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const Revenuereport = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiUrl1, setApiUrl1] = useState("");
  const [selectedType, setSelectedType] = useState("all"); // "all", "RentOut", "Booking"
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" (newest first), "asc" (oldest first)

  const isSidebarOpen = useSidebar();
  const currentusers = JSON.parse(localStorage.getItem("rootfinuser")) || {};

  const handleFetch = () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates.");
      return;
    }
    const baseUrl1 = "https://rentalapi.rootments.live/api/GetBooking";
    const updatedApiUrl = `${baseUrl1}/GetBookingList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const updatedApiUrl1 = `${baseUrl1}/GetRentoutList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

    setApiUrl(updatedApiUrl);
    setApiUrl1(updatedApiUrl1);
  };

  const fetchOptions = useMemo(() => ({}), []);
  const { data, loading: loadingBooking } = useFetch(apiUrl, fetchOptions);
  const { data: data1, loading: loadingRentout } = useFetch(apiUrl1, fetchOptions);
  const loading = loadingBooking || loadingRentout;

  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = `<html><head><title>Revenue Report</title>
        <style>
            @page { size: portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; font-size: 12px; }
            th { background-color: #f3f4f6; }
            tr { break-inside: avoid; }
        </style>
    </head><body>${printContent}</body></html>`;

    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // Process Booking transactions
  const bookingTransactions = useMemo(() => {
    return (data?.dataSet?.data || []).map(transaction => ({
      ...transaction,
      date: transaction.bookingDate || transaction.date || "",
      invoiceNo: transaction.invoiceNo || transaction.locCode || "-",
      customerName: transaction.customerName || "-",
      Category: "Booking",
      SubCategory: "Advance",
      amount: parseInt(transaction.bookingBankAmount || 0, 10) + parseInt(transaction.bookingUPIAmount || 0, 10) + parseInt(transaction.bookingCashAmount || 0, 10),
    }));
  }, [data]);

  // Process RentOut transactions
  const rentOutTransactions = useMemo(() => {
    return (data1?.dataSet?.data || []).map(transaction => {
      const upi = parseInt(transaction.rentoutUPIAmount || 0, 10);
      const bank = parseInt(transaction.rentoutBankAmount || 0, 10);
      const cash = parseInt(transaction.rentoutCashAmount || 0, 10);
      const sec = parseInt(transaction.securityAmount || 0, 10);
      const netRentout = (upi + bank + cash) - sec;
      return {
        ...transaction,
        date: transaction.rentOutDate || transaction.date || "",
        invoiceNo: transaction.invoiceNo || transaction.locCode || "-",
        customerName: transaction.customerName || "-",
        Category: "RentOut",
        SubCategory: "Balance Payable",
        amount: netRentout >= 0 ? netRentout : 0,
      };
    });
  }, [data1]);

  const allTransactions = useMemo(() => {
    return [...rentOutTransactions, ...bookingTransactions];
  }, [rentOutTransactions, bookingTransactions]);

  // Filter transactions based on selectedType (All / RentOut / Booking) and search query
  const filteredTransactions = useMemo(() => {
    let list = allTransactions;
    if (selectedType !== "all") {
      list = list.filter(t => t.Category === selectedType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.invoiceNo && t.invoiceNo.toLowerCase().includes(q))
      );
    }
    // Sort
    return [...list].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [allTransactions, selectedType, searchQuery, sortOrder]);

  // Totals calculations
  const totalRentOut = useMemo(() => {
    return rentOutTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [rentOutTransactions]);

  const totalBooking = useMemo(() => {
    return bookingTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [bookingTransactions]);

  const filteredTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [filteredTransactions]);

  const hasLoaded = !!(apiUrl || apiUrl1);

  return (
    <>
      <Helmet>
        <title>Revenue Report | RootFin</title>
      </Helmet>

      <div>
        <Headers title={"Revenue Report"} />

        <div 
          style={{ 
            marginLeft: isSidebarOpen ? "256px" : "0px", 
            padding: "24px", 
            width: isSidebarOpen ? "calc(100% - 256px)" : "100%",
            maxWidth: isSidebarOpen ? "calc(100% - 256px)" : "100%",
            minHeight: "100vh",
            backgroundColor: "#f8fafc",
            transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          {/* Page Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Revenue Report</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and analyze Booking and Rent Out revenues for your location.
            </p>
          </div>

          {/* Controls & Filter Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-wrap items-end gap-4">
              {/* From Date */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  From *
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max="2099-12-31"
                  min="2000-01-01"
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
                />
              </div>

              {/* To Date */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  To *
                </label>
                <input
                  type="date"
                  value={toDate}
                  max="2099-12-31"
                  min="2000-01-01"
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
                />
              </div>

              {/* Type Filter Dropdown */}
              <div className="flex-1 min-w-[170px]">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="RentOut">RentOut</option>
                  <option value="Booking">Booking</option>
                </select>
              </div>

              {/* Fetch Button */}
              <button
                onClick={handleFetch}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Fetching..." : "Fetch Report"}
              </button>
            </div>

            {/* Quick Filter Tabs & Search Bar */}
            {hasLoaded && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                {/* Type Switcher Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl">
                  <button
                    onClick={() => setSelectedType("all")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedType === "all"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    All ({allTransactions.length})
                  </button>
                  <button
                    onClick={() => setSelectedType("RentOut")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedType === "RentOut"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-purple-700"
                    }`}
                  >
                    <span>RentOut</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedType === "RentOut" ? "bg-purple-800 text-white" : "bg-purple-100 text-purple-700"}`}>
                      {rentOutTransactions.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedType("Booking")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedType === "Booking"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-blue-700"
                    }`}
                  >
                    <span>Booking</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedType === "Booking" ? "bg-blue-800 text-white" : "bg-blue-100 text-blue-700"}`}>
                      {bookingTransactions.length}
                    </span>
                  </button>
                </div>

                {/* Search and Sort controls */}
                <div className="flex items-center gap-3">
                  <div className="relative min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search customer / invoice..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <button
                    onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                    title="Toggle Date Sorting"
                  >
                    <ArrowUpDown size={13} />
                    <span>{sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Metric Summary Cards */}
          {hasLoaded && allTransactions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Total Revenue</p>
                <h3 className="text-2xl font-black text-gray-900 font-mono">
                  {fmt(totalRentOut + totalBooking)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Combined Rent Out &amp; Booking Revenue
                </p>
              </div>

              <div className={`p-5 rounded-2xl border shadow-sm transition-all ${selectedType === "RentOut" ? "bg-purple-50/50 border-purple-300 ring-2 ring-purple-400/30" : "bg-white border-purple-100"}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">RentOut Revenue</p>
                <h3 className="text-2xl font-black text-purple-900 font-mono">
                  {fmt(totalRentOut)}
                </h3>
                <p className="text-xs text-purple-600/80 mt-1">
                  {rentOutTransactions.length} RentOut transaction(s)
                </p>
              </div>

              <div className={`p-5 rounded-2xl border shadow-sm transition-all ${selectedType === "Booking" ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-400/30" : "bg-white border-blue-100"}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Booking Revenue</p>
                <h3 className="text-2xl font-black text-blue-900 font-mono">
                  {fmt(totalBooking)}
                </h3>
                <p className="text-xs text-blue-600/80 mt-1">
                  {bookingTransactions.length} Booking transaction(s)
                </p>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div ref={printRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div style={{ maxHeight: "560px", overflowY: "auto" }}>
              <table className="w-full text-sm border-collapse">
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr className="bg-slate-800 text-white font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-left font-semibold">Date</th>
                    <th className="py-3.5 px-4 text-left font-semibold">Invoice No.</th>
                    <th className="py-3.5 px-4 text-left font-semibold">Customer Name</th>
                    <th className="py-3.5 px-4 text-left font-semibold">Category</th>
                    <th className="py-3.5 px-4 text-left font-semibold">Sub Category</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-gray-500">
                        Fetching revenue records...
                      </td>
                    </tr>
                  ) : !hasLoaded ? (
                    <tr>
                      <td colSpan="6" className="text-center py-16 text-gray-400">
                        <Filter size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium text-gray-600">Select dates and click "Fetch Report"</p>
                      </td>
                    </tr>
                  ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction, index) => {
                      const isRentOut = transaction.Category === 'RentOut';
                      const formattedDate = transaction.date
                        ? new Date(transaction.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          }) + (transaction.date.includes("T") ? " " + transaction.date.split("T")[1]?.slice(0, 5) : "")
                        : "-";

                      return (
                        <tr 
                          key={index} 
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">{formattedDate}</td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-800">{transaction.invoiceNo}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{transaction.customerName}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isRentOut 
                                ? "bg-purple-100 text-purple-800 border border-purple-200" 
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}>
                              {transaction.Category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-medium">{transaction.SubCategory}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 text-sm">
                            {fmt(transaction.amount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-gray-500">
                        No transactions found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Footer Totals */}
                {hasLoaded && filteredTransactions.length > 0 && (
                  <tfoot style={{ position: "sticky", bottom: 0, zIndex: 10 }}>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-gray-900 text-sm">
                      <td className="py-3.5 px-4 text-left uppercase tracking-wide text-xs" colSpan="5">
                        Total ({selectedType === "all" ? "All Categories" : selectedType}):
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-base font-black text-emerald-700">
                        {fmt(filteredTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Print / PDF Action */}
          {hasLoaded && filteredTransactions.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download size={16} />
                <span>Download / Print PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Revenuereport;