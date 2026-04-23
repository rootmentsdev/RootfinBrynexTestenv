import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import baseUrl from "../api/api";

const TWS_BASE = "https://rentalapi.rootments.live/api/GetBooking";

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

const EXPENSE_CATEGORIES = new Set([
  "petty expenses","staff reimbursement","maintenance expenses","telephone internet",
  "utility bill","salary","rent","courier charges","asset purchase","promotion_services",
  "spot incentive","bulk amount transfer","other expenses","shoe sales return",
  "shirt sales return","dry cleaning","altration","material","travel exp","fuel exp",
  "waste management","water charges","printing stationary","staff welfare",
  "staff accommodation","incentive","write off",
]);

// Maps raw DB category values → human-readable display labels (mirrors Expenses.jsx baseExpenseCats)
const CATEGORY_LABEL_MAP = {
  "dry cleaning":         "Dry Cleaning",
  "altration":            "Altration",
  "material":             "Material",
  "courier charges":      "Courier Charges",
  "maintenance expenses": "Repairs & Maintenance",
  "travel exp":           "Travel Exp",
  "fuel exp":             "Fuel Exp",
  "petty expenses":       "Office Expense",
  "telephone internet":   "Internet Expense",
  "utility bill":         "Electricity Charges",
  "waste management":     "Waste Management",
  "water charges":        "Water Charges",
  "salary":               "Salary / Salary Advance",
  "printing stationary":  "Printing & Stationary",
  "staff welfare":        "Staff Welfare",
  "staff reimbursement":  "Staff Accommodation",
  "rent":                 "Rent",
  "asset purchase":       "Asset Purchase",
  "incentive":            "Incentive",
  "spot incentive":       "Incentive",
  "other expenses":       "Refund",
  "bulk amount transfer": "Cash to Bank",
  "write off":            "Write Off",
  "promotion_services":   "Promotion / Services",
  "shoe sales return":    "Shoe Sales Return",
  "shirt sales return":   "Shirt Sales Return",
};

const getCategoryLabel = (cat) =>
  CATEGORY_LABEL_MAP[(cat || "").toLowerCase().trim()] || cat;

const TriangleDown = () => (
  <span style={{ display:"inline-block", width:0, height:0,
    borderLeft:"7px solid transparent", borderRight:"7px solid transparent",
    borderTop:"12px solid #2d6a8f" }} />
);

export default function IncomeExpenseReport() {
  const user = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const isAdmin = (user.power || "").toLowerCase() === "admin";
  const isClusterManager = (user.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = user.allowedLocCodes || [];
  const canSelectStore = isAdmin || isClusterManager;

  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate, setToDate] = useState(today());
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [selectedStore, setSelectedStore] = useState("all");
  const [incomeRows, setIncomeRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const locCode = canSelectStore ? selectedStore : (user.locCode || "");
  // TWS API only accepts a real locCode, not "all" — fall back to user's own store
  const twsLocCode = (locCode === "all" || !locCode) ? (user.locCode || "") : locCode;

  // All store locCodes for fetching TWS data when "all" is selected
  // For cluster managers, restrict to their assigned stores only
  const ALL_LOC_CODES = isClusterManager
    ? clusterAllowedLocCodes
    : STORE_LIST.map(s => s.locCode);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setIncomeRows([]);
    setExpenseRows([]);
    setExpanded({});
    try {
      const API = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

      // Fetch TWS APIs individually so one failure doesn't block the rest
      const safeFetch = async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) { console.warn(`TWS fetch failed (${res.status}): ${url}`); return {}; }
          return await res.json();
        } catch (e) { console.warn("TWS fetch error:", url, e.message); return {}; }
      };

      // When "all stores" selected, fetch TWS for every store and merge results
      const locCodesToFetch = (locCode === "all" || !locCode) ? ALL_LOC_CODES : [twsLocCode];

      const twsResults = await Promise.all(
        locCodesToFetch.map(lc => Promise.all([
          safeFetch(`${TWS_BASE}/GetBookingList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
          safeFetch(`${TWS_BASE}/GetRentoutList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
          safeFetch(`${TWS_BASE}/GetReturnList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
          safeFetch(`${TWS_BASE}/GetDeleteList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
        ]))
      );

      // Merge all store results into single arrays
      const bookingData = { dataSet: { data: twsResults.flatMap(r => r[0]?.dataSet?.data || []) } };
      const rentoutData = { dataSet: { data: twsResults.flatMap(r => r[1]?.dataSet?.data || []) } };
      const returnData  = { dataSet: { data: twsResults.flatMap(r => r[2]?.dataSet?.data || []) } };
      const cancelData  = { dataSet: { data: twsResults.flatMap(r => r[3]?.dataSet?.data || []) } };

      const mongoRes  = await fetch(`${API}/user/Getpayment?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`);
      let mongoJson = mongoRes.ok ? await mongoRes.json() : {};

      // For cluster managers viewing "all stores", fetch mongo data per allowed store and merge
      if (isClusterManager && (locCode === "all" || !locCode)) {
        const mongoResults = await Promise.all(
          clusterAllowedLocCodes.map(lc =>
            fetch(`${API}/user/Getpayment?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`)
              .then(r => r.ok ? r.json() : {})
              .catch(() => ({}))
          )
        );
        const merged = mongoResults.flatMap(r => Array.isArray(r) ? r : (r?.data || []));
        mongoJson = { data: merged };
      }

      // Booking -> Income
      const bookingList = (bookingData?.dataSet?.data || []).map(item => ({
        date: (item.bookingDate || "").split("T")[0],
        invoiceNo: item.invoiceNo,
        customerName: item.customerName || "",
        category: "Booking",
        subCategory: "Advance",
        cash: Number(item.bookingCashAmount || 0),
        rbl:  Number(item.rblRazorPay || 0),
        bank: Number(item.bookingBankAmount || 0),
        upi:  Number(item.bookingUPIAmount || 0),
        locCode: item.locCode || locCode,
      }));

      // RentOut -> Income: split into Security row + Balance Payable row
      const rentoutList = [];
      (rentoutData?.dataSet?.data || []).forEach(item => {
        const security       = Number(item.securityAmount || 0);
        const advance        = Number(item.advanceAmount || 0);
        const balancePayable = Number(item.invoiceAmount || 0) - advance;
        const cash  = Number(item.rentoutCashAmount || 0);
        const rbl   = Number(item.rblRazorPay || 0);
        const bank  = Number(item.rentoutBankAmount || 0);
        const upi   = Number(item.rentoutUPIAmount || 0);
        const base  = {
          date: (item.rentOutDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName || "",
          category: "RentOut",
          locCode: item.locCode || locCode,
          cash, rbl, bank, upi,
        };
        rentoutList.push({ ...base, subCategory: "Security",        amount: security });
        rentoutList.push({ ...base, subCategory: "Balance Payable", amount: balancePayable });
      });

      // Return -> Expense
      const returnList = (returnData?.dataSet?.data || []).map(item => {
        const rbl = -Math.abs(Number(item.rblRazorPay || 0));
        return {
          date: (item.returnedDate || item.returnDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName || "",
          category: "Return",
          subCategory: "Security Refund",
          cash: -Math.abs(Number(item.returnCashAmount || 0)),
          rbl,
          bank: rbl !== 0 ? 0 : -Math.abs(Number(item.returnBankAmount || 0)),
          upi:  rbl !== 0 ? 0 : -Math.abs(Number(item.returnUPIAmount || 0)),
          locCode: item.locCode || locCode,
        };
      });

      // Cancel -> Expense
      const cancelList = (cancelData?.dataSet?.data || []).map(item => {
        const rbl = -Math.abs(Number(item.rblRazorPay || 0));
        return {
          date: (item.cancelDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName || "",
          category: "Cancel",
          subCategory: "Cancellation Refund",
          cash: -Math.abs(Number(item.deleteCashAmount || 0)),
          rbl,
          bank: rbl !== 0 ? 0 : -Math.abs(Number(item.deleteBankAmount || 0)),
          upi:  rbl !== 0 ? 0 : -Math.abs(Number(item.deleteUPIAmount || 0)),
          locCode: item.locCode || locCode,
        };
      });

      // MongoDB income / expense
      const mongoTxns = Array.isArray(mongoJson) ? mongoJson : (mongoJson.data || []);
      const mongoIncome = [];
      const mongoExpense = [];

      mongoTxns.forEach(t => {
        const tp  = (t.type || "").toLowerCase();
        const sub = (t.subCategory || "").toLowerCase().trim();
        const cat = (t.category || "").toLowerCase().trim();
        const inv = (t.invoiceNo || "").toUpperCase();
        const isShoeOrShirtSale = sub === "shoe sales" || sub === "shirt sales" || sub === "mixed sales"
          || cat === "shoe sales" || cat === "shirt sales" || cat === "mixed sales";
        if (!isShoeOrShirtSale && (inv.startsWith("INV-") || inv.startsWith("RTN-") || inv.startsWith("RET-"))) return;

        // Normalize shoe/shirt/mixed sales into a single "Sales" category
        const normalizedCategory = isShoeOrShirtSale ? "Sales" : (t.category || "Uncategorized");
        const normalizedSubCategory = isShoeOrShirtSale ? (t.subCategory || t.category || "Sales") : (t.subCategory || t.category || "");

        const row = {
          date: (t.date || "").split("T")[0],
          invoiceNo: t.invoiceNo || t.locCode || "",
          customerName: t.customerName || "",
          category: normalizedCategory,
          subCategory: normalizedSubCategory,
          remark: t.remark || t.remarks || "",
          cash: Number(t.cash || 0),
          rbl:  Number(t.rbl || t.rblRazorPay || 0),
          bank: Number(t.bank || 0),
          upi:  Number(t.upi || 0),
          locCode: t.locCode || locCode,
        };

        if (tp === "income") mongoIncome.push(row);
        else if (tp === "expense") mongoExpense.push(row);
        else if (EXPENSE_CATEGORIES.has(cat)) mongoExpense.push(row);
      });

      setIncomeRows([...bookingList, ...rentoutList, ...mongoIncome]);
      setExpenseRows([...returnList, ...cancelList, ...mongoExpense]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, locCode, twsLocCode]);

  // Group: category -> subCategory -> { transactions, totals }
  const buildGrouped = (rows) => {
    const map = {};
    rows.forEach(t => {
      const cat = t.category || "Uncategorized";
      const sub = t.subCategory || cat;
      if (filterCategory !== "All Categories" && filterCategory !== cat) return;
      if (!map[cat]) map[cat] = { subCategories: {}, cash: 0, rbl: 0, bank: 0, upi: 0 };
      if (!map[cat].subCategories[sub]) map[cat].subCategories[sub] = { transactions: [], cash: 0, rbl: 0, bank: 0, upi: 0 };

      // For RentOut rows, use the split `amount` field for the sub-row display
      // but accumulate payment fields (cash/rbl/bank/upi) only once per invoice per category
      // to avoid double-counting. We track by invoiceNo.
      const isRentOut = cat === "RentOut";
      const subG = map[cat].subCategories[sub];
      subG.transactions.push(t);

      if (isRentOut) {
        // amount is the split value (security or balance payable)
        subG.cash += t.amount || 0;
        map[cat].cash += t.amount || 0;
      } else {
        subG.cash += t.cash || 0;
        subG.rbl  += t.rbl  || 0;
        subG.bank += t.bank || 0;
        subG.upi  += t.upi  || 0;
        map[cat].cash += t.cash || 0;
        map[cat].rbl  += t.rbl  || 0;
        map[cat].bank += t.bank || 0;
        map[cat].upi  += t.upi  || 0;
      }
    });
    return map;
  };

  const incomeGrouped  = buildGrouped(incomeRows);
  const expenseGrouped = buildGrouped(expenseRows);

  const sumGroup = (grouped) =>
    Object.values(grouped).reduce(
      (s, g) => ({ cash: s.cash + g.cash, rbl: s.rbl + g.rbl, bank: s.bank + g.bank, upi: s.upi + g.upi }),
      { cash: 0, rbl: 0, bank: 0, upi: 0 }
    );
  const incTotals = sumGroup(incomeGrouped);
  const expTotals = sumGroup(expenseGrouped);
  const incTotal  = incTotals.cash + incTotals.rbl + incTotals.bank + incTotals.upi;
  const expTotal  = expTotals.cash + expTotals.rbl + expTotals.bank + expTotals.upi;
  const netCash   = incTotals.cash + expTotals.cash;
  const netRbl    = incTotals.rbl  + expTotals.rbl;
  const netBank   = incTotals.bank + expTotals.bank;
  const netUpi    = incTotals.upi  + expTotals.upi;
  const netTotal  = incTotal + expTotal;

  const allCategories = [...new Set([...incomeRows, ...expenseRows].map(t => t.category || "Uncategorized"))];
  const toggleExpand  = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const getBranchName = (lc) => {
    const store = STORE_LIST.find(s => s.locCode === String(lc));
    return store ? store.locName : (lc || "-");
  };

  const showBranch = selectedStore === "all" || (isClusterManager && selectedStore === "all");

  // Renders: category header row → subcategory rows (expandable) → category total
  const renderCategoryRows = (grouped, typeLabel, isIncome) =>
    Object.keys(grouped).map(cat => {
      const g = grouped[cat];
      const catTotal = g.cash + g.rbl + g.bank + g.upi;
      const catKey = `${typeLabel}-${cat}`;
      const isCatExp = !!expanded[catKey];
      const sign = (v) => isIncome ? fmt(v) : (v !== 0 ? `-${fmt(Math.abs(v))}` : "-");

      return [
        // Category header row (clickable)
        <tr key={catKey} className="cursor-pointer hover:brightness-95" style={{ background: "#e8d5f5" }} onClick={() => toggleExpand(catKey)}>
          <td className="px-3 py-2 text-center w-10"><TriangleDown /></td>
          <td className="px-3 py-2 text-sm font-semibold text-gray-800" colSpan={showBranch ? 4 : 3}>{getCategoryLabel(cat)}</td>
          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">{g.cash !== 0 ? sign(g.cash) : "-"}</td>
          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">{g.rbl  !== 0 ? sign(g.rbl)  : "-"}</td>
          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">{g.bank !== 0 ? sign(g.bank) : "-"}</td>
          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">{g.upi  !== 0 ? sign(g.upi)  : "-"}</td>
          <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">
            {isIncome ? fmt(catTotal) : `-${fmt(Math.abs(catTotal))}`}
          </td>
        </tr>,

        // SubCategory rows (shown when category is expanded)
        ...(isCatExp ? Object.keys(g.subCategories).map(sub => {
          const sg = g.subCategories[sub];
          const subTotal = sg.cash + sg.rbl + sg.bank + sg.upi;
          const subKey = `${catKey}-${sub}`;
          const isSubExp = !!expanded[subKey];

          // Hide the sub-row when it's redundant (only one sub and it matches the category)
          const subCats = Object.keys(g.subCategories);
          const isRedundantSub = subCats.length === 1 &&
            sub.toLowerCase().trim() === cat.toLowerCase().trim();

          const txRows = sg.transactions.map((t, i) => {
            const dateStr = t.date
              ? new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
              : "-";
            const isRentOut = cat === "RentOut";
            const isIncentiveCat = cat.toLowerCase() === "incentive";
            const tCash = isRentOut ? (t.amount || 0) : (t.cash || 0);
            return (
              <tr key={`${subKey}-${i}`} style={{ background: "#faf5ff" }}>
                <td className="px-3 py-2 text-xs text-gray-400 pl-12">{dateStr}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{t.invoiceNo || t.customerName || "-"}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {isIncentiveCat ? (t.remark || t.customerName || "-") : (t.customerName || "-")}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400 italic max-w-[160px] truncate" title={t.remark || ""}>{t.remark || "-"}</td>
                {showBranch && <td className="px-3 py-2 text-xs text-blue-700 font-medium">{getBranchName(t.locCode)}</td>}
                <td className="px-3 py-2 text-right text-xs text-gray-700">{tCash !== 0 ? fmt(tCash) : "-"}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-700">{!isRentOut && t.rbl  !== 0 ? fmt(t.rbl)  : "-"}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-700">{!isRentOut && t.bank !== 0 ? fmt(t.bank) : "-"}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-700">{!isRentOut && t.upi  !== 0 ? fmt(t.upi)  : "-"}</td>
                <td className="px-3 py-2"></td>
              </tr>
            );
          });

          if (isRedundantSub) {
            // Skip the sub-row, show transactions directly under the category
            return isCatExp ? txRows : [];
          }

          return [
            // SubCategory summary row (clickable to expand transactions)
            <tr key={subKey} className="cursor-pointer hover:brightness-95" style={{ background: "#f3e8ff" }} onClick={e => { e.stopPropagation(); toggleExpand(subKey); }}>
              <td className="px-3 py-2 text-center w-10 pl-8"><TriangleDown /></td>
              <td className="px-3 py-2 text-xs text-gray-600 pl-6" colSpan={showBranch ? 4 : 3}>{getCategoryLabel(sub)}</td>
              <td className="px-3 py-2 text-right text-xs text-gray-700">{sg.cash !== 0 ? sign(sg.cash) : "-"}</td>
              <td className="px-3 py-2 text-right text-xs text-gray-700">{sg.rbl  !== 0 ? sign(sg.rbl)  : "-"}</td>
              <td className="px-3 py-2 text-right text-xs text-gray-700">{sg.bank !== 0 ? sign(sg.bank) : "-"}</td>
              <td className="px-3 py-2 text-right text-xs text-gray-700">{sg.upi  !== 0 ? sign(sg.upi)  : "-"}</td>
              <td className="px-3 py-2 text-right text-xs font-semibold text-gray-800">
                {isIncome ? fmt(subTotal) : `-${fmt(Math.abs(subTotal))}`}
              </td>
            </tr>,

            // Individual transaction rows (shown when subcategory is expanded)
            ...(isSubExp ? txRows : []),
          ];
        }).flat() : []),
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
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Category</label>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb] min-w-[160px]">
            <option>All Categories</option>
            {allCategories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {canSelectStore && (
          <div>
            <label className="block text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Store</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
              className="rounded-lg border border-[#d9def1] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb] min-w-[180px]">
              <option value="all">{isClusterManager ? "All My Stores" : "All Stores"}</option>
              {(isClusterManager
                ? STORE_LIST.filter(s => clusterAllowedLocCodes.includes(s.locCode))
                : STORE_LIST
              ).map(s => <option key={s.locCode} value={s.locCode}>{s.locName}</option>)}
            </select>
          </div>
        )}
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60">
          {loading && <RefreshCw size={15} className="animate-spin" />}
          Apply Filter
        </button>
        <button
          onClick={() => { setFromDate(firstOfMonth()); setToDate(today()); setFilterCategory("All Categories"); setSelectedStore("all"); setIncomeRows([]); setExpenseRows([]); setExpanded({}); }}
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
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Category / Sub Category</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Customer</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Remarks</th>
              {showBranch && <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Branch</th>}
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Cash</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">RBL</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Bank</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">UPI</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={showBranch ? 10 : 9} className="px-4 py-10 text-center text-[#6b7280]">Loading...</td></tr>
            )}
            {!loading && !hasData && incomeRows.length === 0 && expenseRows.length === 0 && (
              <tr><td colSpan={showBranch ? 10 : 9} className="px-4 py-10 text-center text-[#6b7280]">Apply a filter to load data.</td></tr>
            )}
            {!loading && !hasData && (incomeRows.length > 0 || expenseRows.length > 0) && (
              <tr><td colSpan={showBranch ? 10 : 9} className="px-4 py-10 text-center text-[#6b7280]">No results match the selected filters.</td></tr>
            )}

            {hasData && <>
              {/* INCOME: Booking + RentOut + mongo income */}
              <tr style={{ background: "#f4c9b0" }}>
                <td colSpan={showBranch ? 10 : 9} className="px-4 py-2 text-base font-bold text-gray-800 uppercase">INCOME</td>
              </tr>
              {renderCategoryRows(incomeGrouped, "INCOME", true)}
              <tr style={{ background: "#d4edda" }}>
                <td colSpan={showBranch ? 5 : 4} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Income Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{incTotals.cash !== 0 ? fmt(incTotals.cash) : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{incTotals.rbl  !== 0 ? fmt(incTotals.rbl)  : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{incTotals.bank !== 0 ? fmt(incTotals.bank) : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{incTotals.upi  !== 0 ? fmt(incTotals.upi)  : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">{fmt(incTotal)}</td>
              </tr>

              {/* EXPENSES: Return + Cancel + mongo expense */}
              <tr style={{ background: "#f4c9b0" }}>
                <td colSpan={showBranch ? 10 : 9} className="px-4 py-2 text-base font-bold text-gray-800 uppercase">EXPENSES</td>
              </tr>
              {renderCategoryRows(expenseGrouped, "EXPENSE", false)}
              <tr style={{ background: "#d4edda" }}>
                <td colSpan={showBranch ? 5 : 4} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Expense Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{expTotals.cash !== 0 ? `-${fmt(Math.abs(expTotals.cash))}` : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{expTotals.rbl  !== 0 ? `-${fmt(Math.abs(expTotals.rbl))}` : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{expTotals.bank !== 0 ? `-${fmt(Math.abs(expTotals.bank))}` : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{expTotals.upi  !== 0 ? `-${fmt(Math.abs(expTotals.upi))}` : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">{expTotal !== 0 ? `-${fmt(Math.abs(expTotal))}` : "-"}</td>
              </tr>

              {/* Net Difference */}
              <tr style={{ background: "#b8d9f0" }}>
                <td colSpan={showBranch ? 5 : 4} className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Net Difference Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{netCash !== 0 ? fmt(netCash) : "-"}</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">{netRbl  !== 0 ? fmt(netRbl)  : "-"}</td>
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
