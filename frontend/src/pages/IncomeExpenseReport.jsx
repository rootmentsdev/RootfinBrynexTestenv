import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import baseUrl from "../api/api";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n || 0);

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const STORE_LIST = [
  { locName: "G-Edappal",        locCode: "707" },
  { locName: "G-Edappally",      locCode: "702" },
  { locName: "G-Kalpetta",       locCode: "717" },
  { locName: "G-Kannur",         locCode: "716" },
  { locName: "G-Kottakkal",      locCode: "711" },
  { locName: "G-Kottayam",       locCode: "701" },
  { locName: "G-Manjeri",        locCode: "710" },
  { locName: "G-Mg Road",        locCode: "718" },
  { locName: "G-Palakkad",       locCode: "705" },
  { locName: "G-Perinthalmanna", locCode: "709" },
  { locName: "G-Perumbavoor",    locCode: "703" },
  { locName: "G-Thrissur",       locCode: "704" },
  { locName: "G-Vadakara",       locCode: "708" },
  { locName: "G-Chavakkad",      locCode: "706" },
  { locName: "G-Calicut",        locCode: "712" },
  { locName: "HEAD OFFICE01",    locCode: "759" },
  { locName: "Office",           locCode: "102" },
  { locName: "Production",       locCode: "101" },
  { locName: "SG-Trivandrum",    locCode: "700" },
  { locName: "Warehouse",        locCode: "858" },
  { locName: "WAREHOUSE",        locCode: "103" },
  { locName: "Z-Edappal",        locCode: "100" },
  { locName: "Z-Edapally",       locCode: "144" },
  { locName: "Z-Kottakkal",      locCode: "122" },
  { locName: "Z-Perinthalmanna", locCode: "133" },
];

// Down-pointing triangle indicator
const TriangleDown = () => (
  <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "12px solid #2d6a8f" }} />
);

export default function IncomeExpenseReport() {
  const user = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const isAdmin = (user.power || "").toLowerCase() === "admin";

  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate, setToDate] = useState(today());
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [selectedStore, setSelectedStore] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const API = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const locCode = isAdmin ? selectedStore : (user.locCode || "");
      const res = await fetch(
        `${API}/user/Getpayment?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`
      );
      const json = await res.json();
      const txns = Array.isArray(json) ? json : json.data || [];
      const filtered = txns.filter((t) => {
        const tp = (t.type || "").toLowerCase();
        if (tp !== "income" && tp !== "expense") return false;
        const inv = (t.invoiceNo || "").toUpperCase();
        const sub = (t.subCategory || "").toLowerCase().trim();
        // Allow shoe/shirt sales invoices through even if they have INV- prefix
        const isShoeOrShirtSale = sub === "shoe sales" || sub === "shirt sales" || sub === "mixed sales";
        if (!isShoeOrShirtSale && (inv.startsWith("INV-") || inv.startsWith("RTN-") || inv.startsWith("RET-"))) return false;
        return true;
      });
      setRows(filtered);
      setExpanded({});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedStore, isAdmin, user.locCode]);

  // Build grouped maps for income and expense separately
  const buildGrouped = (typeFilter) => {
    const map = {};
    rows.forEach((t) => {
      const tp = (t.type || "").toLowerCase();
      if (tp !== typeFilter) return;
      const sub = (t.subCategory || "").toLowerCase().trim();
      const isInvoiceSale = sub === "shoe sales" || sub === "shirt sales" || sub === "mixed sales";
      // For invoice shoe/shirt sales, use subCategory as the display label
      const cat = isInvoiceSale ? t.subCategory : (t.category || "Uncategorized");
      if (filterCategory !== "All Categories" && filterCategory !== cat) return;
      if (!map[cat]) map[cat] = { transactions: [], cash: 0, bank: 0, upi: 0 };
      map[cat].transactions.push(t);
      map[cat].cash += parseFloat(t.cash) || 0;
      map[cat].bank += parseFloat(t.bank) || 0;
      map[cat].upi += parseFloat(t.upi) || 0;
    });
    return map;
  };

  const incomeGrouped = buildGrouped("income");
  const expenseGrouped = buildGrouped("expense");

  const sumGroup = (grouped) => {
    const cats = Object.keys(grouped);
    return {
      cash: cats.reduce((s, c) => s + grouped[c].cash, 0),
      bank: cats.reduce((s, c) => s + grouped[c].bank, 0),
      upi:  cats.reduce((s, c) => s + grouped[c].upi, 0),
    };
  };

  const incTotals = sumGroup(incomeGrouped);
  const expTotals = sumGroup(expenseGrouped);
  const incTotal = incTotals.cash + incTotals.bank + incTotals.upi;
  const expTotal = expTotals.cash + expTotals.bank + expTotals.upi;
  const netCash = incTotals.cash + expTotals.cash;
  const netBank = incTotals.bank + expTotals.bank;
  const netUpi  = incTotals.upi  + expTotals.upi;
  const netTotal = incTotal + expTotal;

  const allCategories = [...new Set(rows.map((t) => t.category || "Uncategorized"))];
  const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const getBranchName = (locCode) => {
    if (!locCode) return "-";
    const store = STORE_LIST.find((s) => s.locCode === String(locCode));
    return store ? store.locName : locCode;
  };

  const renderCategoryRows = (grouped, typeLabel, isIncome) =>
    Object.keys(grouped).map((cat) => {
      const g = grouped[cat];
      const rowTotal = g.cash + g.bank + g.upi;
      const key = `${typeLabel}-${cat}`;
      const isExp = !!expanded[key];

      // Collect unique branches for this category group
      const branches = [...new Set(g.transactions.map((t) => getBranchName(t.locCode)).filter(Boolean))];
      const branchLabel = branches.length > 0 ? branches.join(", ") : "-";

      return [
        <tr key={key} className="cursor-pointer hover:brightness-95" style={{ background: "#e8d5f5" }} onClick={() => toggleExpand(key)}>
          <td className="px-3 py-2 text-center w-10">
            <TriangleDown />
          </td>
          <td className="px-3 py-2 text-sm text-gray-700">{cat}</td>
          <td className="px-3 py-2 text-sm text-gray-600">{branchLabel}</td>
          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
            {g.cash !== 0 ? (isIncome ? fmt(g.cash) : `-${fmt(Math.abs(g.cash))}`) : "-"}
          </td>
          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
            {g.bank !== 0 ? (isIncome ? fmt(g.bank) : `-${fmt(Math.abs(g.bank))}`) : "-"}
          </td>
          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
            {g.upi !== 0 ? (isIncome ? fmt(g.upi) : `-${fmt(Math.abs(g.upi))}`) : "-"}
          </td>
          <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">
            {isIncome ? fmt(rowTotal) : `-${fmt(Math.abs(rowTotal))}`}
          </td>
        </tr>,
        ...(isExp ? g.transactions.map((t, i) => {
          const tCash = parseFloat(t.cash) || 0;
          const tBank = parseFloat(t.bank) || 0;
          const tUpi  = parseFloat(t.upi)  || 0;
          const dateStr = t.date
            ? new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
            : "-";
          return (
            <tr key={`${key}-${i}`} style={{ background: "#f3e8ff" }}>
              <td className="px-3 py-2 text-xs text-gray-500">{dateStr}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{
                (() => {
                  const sub = (t.subCategory || "").toLowerCase().trim();
                  const isInvoiceSale = sub === "shoe sales" || sub === "shirt sales" || sub === "mixed sales";
                  if (isInvoiceSale && t.invoiceNo) return t.invoiceNo;
                  return t.remark || t.customerName || "-";
                })()
              }</td>
              <td className="px-3 py-2 text-xs text-gray-500">{getBranchName(t.locCode)}</td>
              <td className="px-3 py-2 text-right text-xs text-gray-700">{tCash !== 0 ? fmt(tCash) : "-"}</td>
              <td className="px-3 py-2 text-right text-xs text-gray-700">{tBank !== 0 ? fmt(tBank) : "-"}</td>
              <td className="px-3 py-2 text-right text-xs text-gray-700">{tUpi  !== 0 ? fmt(tUpi)  : "-"}</td>
              <td className="px-3 py-2"></td>
            </tr>
          );
        }) : []),
      ];
    });

  const hasData = !loading && (Object.keys(incomeGrouped).length > 0 || Object.keys(expenseGrouped).length > 0);

  return (
    <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828] uppercase tracking-wide">Income &amp; Expenses Report</h1>
        <p className="text-sm text-[#6c728a]">Detailed overview of Income &amp; Expense Report</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e6eafb] shadow-sm p-4 mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb] min-w-[160px]">
            <option>All Categories</option>
            {allCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Store</label>
            <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}
              className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb] min-w-[180px]">
              <option value="all">All Stores</option>
              {STORE_LIST.map((s) => <option key={s.locCode} value={s.locCode}>{s.locName}</option>)}
            </select>
          </div>
        )}
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60">
          {loading && <RefreshCw size={15} className="animate-spin" />}
          Apply Filter
        </button>
        <button onClick={() => { setFromDate(firstOfMonth()); setToDate(today()); setFilterCategory("All Categories"); setSelectedStore("all"); setRows([]); setExpanded({}); }}
          className="rounded-lg border border-[#d9def1] p-2 text-[#6b7280] hover:bg-[#f3f4f6]" title="Reset">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-[#e6eafb] shadow-sm overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e6eafb]">
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280] w-28">Date</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Category</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Branch</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Cash</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Bank</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">UPI</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[#6b7280]">Loading...</td></tr>
            )}
            {!loading && !hasData && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[#6b7280]">Apply a filter to load data.</td></tr>
            )}
            {!loading && !hasData && rows.length > 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[#6b7280]">No results match the selected filters.</td></tr>
            )}

            {hasData && <>
              {/* ── INCOME section ── */}
              <tr style={{ background: "#f4c9b0" }}>
                <td colSpan={7} className="px-4 py-2 text-base font-bold text-gray-800 uppercase">INCOME</td>
              </tr>
              {renderCategoryRows(incomeGrouped, "INCOME", true)}
              <tr style={{ background: "#d4edda" }}>
                <td colSpan={3} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Income Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{incTotals.cash !== 0 ? fmt(incTotals.cash) : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{incTotals.bank !== 0 ? fmt(incTotals.bank) : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{incTotals.upi  !== 0 ? fmt(incTotals.upi)  : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">{fmt(incTotal)}</td>
              </tr>

              {/* ── EXPENSES section ── */}
              <tr style={{ background: "#f4c9b0" }}>
                <td colSpan={7} className="px-4 py-2 text-base font-bold text-gray-800 uppercase">EXPENCES</td>
              </tr>
              {renderCategoryRows(expenseGrouped, "EXPENSE", false)}
              <tr style={{ background: "#d4edda" }}>
                <td colSpan={3} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Expense Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{expTotals.cash !== 0 ? `-${fmt(Math.abs(expTotals.cash))}` : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{expTotals.bank !== 0 ? `-${fmt(Math.abs(expTotals.bank))}` : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{expTotals.upi  !== 0 ? `-${fmt(Math.abs(expTotals.upi))}` : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">{expTotal !== 0 ? `-${fmt(Math.abs(expTotal))}` : "-"}</td>
              </tr>

              {/* ── Net Difference Total ── */}
              <tr style={{ background: "#b8d9f0" }}>
                <td colSpan={3} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Net Difference Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{netCash !== 0 ? fmt(netCash) : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{netBank !== 0 ? fmt(netBank) : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{netUpi  !== 0 ? fmt(netUpi)  : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">{fmt(netTotal)}</td>
              </tr>
            </>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
