import { useState, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet";
import { RefreshCw, ChevronDown, ChevronRight, Download, Filter, TrendingUp, TrendingDown, ArrowUpDown, ShieldCheck, ShieldAlert, Landmark } from "lucide-react";
import { CSVLink } from "react-csv";
import Headers from "../components/Header.jsx";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

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
  "spot incentive","other expenses","shoe sales return",
  "shirt sales return","dry cleaning","altration","material","travel exp","fuel exp",
  "waste management","water charges","printing stationary","staff welfare",
  "staff accommodation","incentive","write off",
]);

// Maps raw DB category values → human-readable display labels
const CATEGORY_LABEL_MAP = {
  "dry cleaning":           "Dry Cleaning",
  "altration":              "Altration",
  "material":               "Material",
  "courier charges":        "Courier Charges",
  "maintenance expenses":   "Repairs & Maintenance",
  "travel exp":             "Travel Exp",
  "fuel exp":               "Fuel Exp",
  "petty expenses":         "Office Expense",
  "telephone internet":     "Internet Expense",
  "utility bill":           "Electricity Charges",
  "waste management":     "Waste Management",
  "water charges":          "Water Charges",
  "salary":                 "Salary / Salary Advance",
  "printing stationary":    "Printing & Stationary",
  "staff welfare":          "Staff Welfare",
  "staff reimbursement":    "Staff Accommodation",
  "rent":                   "Store Rent",
  "store rent":             "Store Rent",
  "asset purchase":         "Asset Purchase",
  "incentive":              "Incentive",
  "spot incentive":         "Incentive",
  "other expenses":         "Refund",
  "bulk amount transfer":   "Cash to Bank",
  "cash to bank":           "Cash to Bank",
  "write off":              "Write Off",
  "promotion_services":     "Promotion / Services",
  "shoe sales return":      "Shoe Sales Return",
  "shirt sales return":     "Shirt Sales Return",
  "returnable income":      "Returnable Income",
  "holded security refund": "Holded Security Refund",
  "bank to cash":           "Bank to Cash",
  "cash to branch":         "Bank to Cash",
};

const getCategoryLabel = (cat) =>
  CATEGORY_LABEL_MAP[(cat || "").toLowerCase().trim()] || cat;

export default function IncomeExpenseReport() {
  const isSidebarOpen = useSidebar();
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
  const [returnableIncomeRows, setReturnableIncomeRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [holdedSecurityRefundRows, setHoldedSecurityRefundRows] = useState([]);
  const [cashToBankRows, setCashToBankRows] = useState([]);
  const [bankToCashRows, setBankToCashRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expanded, setExpanded] = useState({});

  const locCode = canSelectStore ? selectedStore : (user.locCode || "");
  const twsLocCode = (locCode === "all" || !locCode) ? (user.locCode || "") : locCode;

  const ALL_LOC_CODES = isClusterManager
    ? clusterAllowedLocCodes
    : STORE_LIST.map(s => s.locCode);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    setIncomeRows([]);
    setReturnableIncomeRows([]);
    setExpenseRows([]);
    setHoldedSecurityRefundRows([]);
    setCashToBankRows([]);
    setBankToCashRows([]);
    setExpanded({});
    try {
      const API = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

      const safeFetch = async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) { console.warn(`TWS fetch failed (${res.status}): ${url}`); return {}; }
          return await res.json();
        } catch (e) { console.warn("TWS fetch error:", url, e.message); return {}; }
      };

      const locCodesToFetch = (locCode === "all" || !locCode) ? ALL_LOC_CODES : [twsLocCode];

      const twsResults = await Promise.all(
        locCodesToFetch.map(lc => Promise.all([
          safeFetch(`${TWS_BASE}/GetBookingList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
          safeFetch(`${TWS_BASE}/GetRentoutList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
          safeFetch(`${TWS_BASE}/GetReturnList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
          safeFetch(`${TWS_BASE}/GetDeleteList?LocCode=${lc}&DateFrom=${fromDate}&DateTo=${toDate}`),
        ]))
      );

      const bookingData = { dataSet: { data: twsResults.flatMap(r => r[0]?.dataSet?.data || []) } };
      const rentoutData = { dataSet: { data: twsResults.flatMap(r => r[1]?.dataSet?.data || []) } };
      const returnData  = { dataSet: { data: twsResults.flatMap(r => r[2]?.dataSet?.data || []) } };
      const cancelData  = { dataSet: { data: twsResults.flatMap(r => r[3]?.dataSet?.data || []) } };

      const mongoRes  = await fetch(`${API}/user/Getpayment?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`);
      let mongoJson = mongoRes.ok ? await mongoRes.json() : {};

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

      // RentOut -> Split into Income (Balance Payable) and Returnable Income (Security)
      const rentoutIncomeList = [];
      const returnableList = [];

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
          locCode: item.locCode || locCode,
          cash, rbl, bank, upi,
        };

        // Returnable Income (Security received on RentOut)
        if (security > 0 || item.securityAmount) {
          returnableList.push({
            ...base,
            category: "Returnable Income",
            subCategory: "Returnable Income",
            amount: security,
            cash: security,
          });
        }

        // Actual non-returnable Income (Balance Payable)
        rentoutIncomeList.push({
          ...base,
          category: "RentOut",
          subCategory: "Balance Payable",
          amount: balancePayable,
          cash: balancePayable,
        });
      });

      // Return -> Holded Security Refund
      const returnList = (returnData?.dataSet?.data || []).map(item => {
        const rbl = -Math.abs(Number(item.rblRazorPay || 0));
        return {
          date: (item.returnedDate || item.returnDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName || "",
          category: "Holded Security Refund",
          subCategory: "Holded Security Refund",
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

      // MongoDB income / expense / cash to bank / bank to cash
      const mongoTxns = Array.isArray(mongoJson) ? mongoJson : (mongoJson.data || []);
      const mongoIncome = [];
      const mongoExpense = [];
      const mongoCashToBank = [];
      const mongoBankToCash = [];

      mongoTxns.forEach(t => {
        const tp  = (t.type || "").toLowerCase();
        const sub = (t.subCategory || "").toLowerCase().trim();
        const cat = (t.category || "").toLowerCase().trim();
        const inv = (t.invoiceNo || "").toUpperCase();
        const isShoeOrShirtSale = sub === "shoe sales" || sub === "shirt sales" || sub === "mixed sales"
          || cat === "shoe sales" || cat === "shirt sales" || cat === "mixed sales";
        const isReturnInvoice = inv.startsWith("RTN-") || inv.startsWith("RET-");
        if (!isShoeOrShirtSale && !isReturnInvoice && (inv.startsWith("INV-") || inv.startsWith("RTN-") || inv.startsWith("RET-"))) return;

        const isBankToCash = cat === "bank to cash" || sub === "bank to cash" || cat.includes("bank to cash") || sub.includes("bank to cash") || cat.includes("cash to branch") || sub.includes("cash to branch");
        const isCashToBank = !isBankToCash && (cat === "bulk amount transfer" || cat === "cash to bank" || sub === "bulk amount transfer" || sub === "cash to bank" || tp === "money transfer");

        const normalizedCategory = isShoeOrShirtSale ? "Sales" : isReturnInvoice ? "Return Invoice" : isBankToCash ? "Bank to Cash" : isCashToBank ? "Cash to Bank" : (t.category || "Uncategorized");
        const normalizedSubCategory = isShoeOrShirtSale ? (t.subCategory || t.category || "Sales") : isReturnInvoice ? (t.subCategory || "Sales Return") : isBankToCash ? "Bank to Cash" : isCashToBank ? "Cash to Bank" : (t.subCategory || t.category || "");

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

        if (isBankToCash) {
          mongoBankToCash.push(row);
        } else if (isCashToBank) {
          mongoCashToBank.push(row);
        } else if (isReturnInvoice) {
          mongoExpense.push(row);
        } else if (tp === "income") {
          mongoIncome.push(row);
        } else if (tp === "expense" || EXPENSE_CATEGORIES.has(cat)) {
          mongoExpense.push(row);
        }
      });

      setIncomeRows([...bookingList, ...rentoutIncomeList, ...mongoIncome]);
      setReturnableIncomeRows(returnableList);
      setExpenseRows([...cancelList, ...mongoExpense]);
      setHoldedSecurityRefundRows(returnList);
      setCashToBankRows(mongoCashToBank);
      setBankToCashRows(mongoBankToCash);
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

      const isRentOutOrReturnable = cat === "RentOut" || cat === "Returnable Income";
      const subG = map[cat].subCategories[sub];
      subG.transactions.push(t);

      if (isRentOutOrReturnable) {
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

  const incomeGrouped  = useMemo(() => buildGrouped(incomeRows), [incomeRows, filterCategory]);
  const returnableIncomeGrouped = useMemo(() => buildGrouped(returnableIncomeRows), [returnableIncomeRows, filterCategory]);
  const expenseGrouped = useMemo(() => buildGrouped(expenseRows), [expenseRows, filterCategory]);
  const holdedSecRefundGrouped = useMemo(() => buildGrouped(holdedSecurityRefundRows), [holdedSecurityRefundRows, filterCategory]);
  const cashToBankGrouped = useMemo(() => buildGrouped(cashToBankRows), [cashToBankRows, filterCategory]);
  const bankToCashGrouped = useMemo(() => buildGrouped(bankToCashRows), [bankToCashRows, filterCategory]);

  const sumGroup = (grouped) =>
    Object.values(grouped).reduce(
      (s, g) => ({ cash: s.cash + g.cash, rbl: s.rbl + g.rbl, bank: s.bank + g.bank, upi: s.upi + g.upi }),
      { cash: 0, rbl: 0, bank: 0, upi: 0 }
    );

  const incTotals = sumGroup(incomeGrouped);
  const retTotals = sumGroup(returnableIncomeGrouped);
  const expTotals = sumGroup(expenseGrouped);
  const holdedSecTotals = sumGroup(holdedSecRefundGrouped);
  const cashToBankTotals = sumGroup(cashToBankGrouped);
  const bankToCashTotals = sumGroup(bankToCashGrouped);

  const incTotal  = incTotals.cash + incTotals.rbl + incTotals.bank + incTotals.upi;
  const retTotal  = retTotals.cash + retTotals.rbl + retTotals.bank + retTotals.upi;
  const expTotal  = expTotals.cash + expTotals.rbl + expTotals.bank + expTotals.upi;
  const holdedSecTotal = holdedSecTotals.cash + holdedSecTotals.rbl + holdedSecTotals.bank + holdedSecTotals.upi;
  const cashToBankTotal = cashToBankTotals.cash + cashToBankTotals.rbl + cashToBankTotals.bank + cashToBankTotals.upi;
  const bankToCashTotal = bankToCashTotals.cash + bankToCashTotals.rbl + bankToCashTotals.bank + bankToCashTotals.upi;

  const netCash   = incTotals.cash + expTotals.cash;
  const netRbl    = incTotals.rbl  + expTotals.rbl;
  const netBank   = incTotals.bank + expTotals.bank;
  const netUpi    = incTotals.upi  + expTotals.upi;
  const netTotal  = incTotal + expTotal;

  const allCategories = useMemo(() => {
    return [...new Set([
      ...incomeRows,
      ...returnableIncomeRows,
      ...expenseRows,
      ...holdedSecurityRefundRows,
      ...cashToBankRows,
      ...bankToCashRows
    ].map(t => t.category || "Uncategorized"))];
  }, [incomeRows, returnableIncomeRows, expenseRows, holdedSecurityRefundRows, cashToBankRows, bankToCashRows]);

  const toggleExpand  = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const getBranchName = (lc) => {
    const store = STORE_LIST.find(s => s.locCode === String(lc));
    return store ? store.locName : (lc || "-");
  };

  const showBranch = selectedStore === "all" || (isClusterManager && selectedStore === "all");

  // CSV Export Data
  const csvData = useMemo(() => {
    const rows = [];
    rows.push(["Section", "Date", "Category", "Customer / Invoice", "Remarks", "Branch", "Cash", "Razorpay", "Bank", "UPI", "Total"]);
    
    // 1. Income
    Object.keys(incomeGrouped).forEach(cat => {
      const g = incomeGrouped[cat];
      Object.keys(g.subCategories).forEach(sub => {
        const sg = g.subCategories[sub];
        sg.transactions.forEach(t => {
          const isRentOut = cat === "RentOut";
          const tCash = isRentOut ? (t.amount || 0) : (t.cash || 0);
          const tTotal = tCash + (isRentOut ? 0 : (t.rbl || 0) + (t.bank || 0) + (t.upi || 0));
          rows.push([
            "INCOME",
            t.date || "",
            getCategoryLabel(cat),
            t.customerName || t.invoiceNo || "",
            t.remark || "",
            getBranchName(t.locCode),
            tCash,
            isRentOut ? 0 : t.rbl || 0,
            isRentOut ? 0 : t.bank || 0,
            isRentOut ? 0 : t.upi || 0,
            tTotal
          ]);
        });
      });
    });

    // 2. Returnable Income
    Object.keys(returnableIncomeGrouped).forEach(cat => {
      const g = returnableIncomeGrouped[cat];
      Object.keys(g.subCategories).forEach(sub => {
        const sg = g.subCategories[sub];
        sg.transactions.forEach(t => {
          rows.push([
            "RETURNABLE INCOME",
            t.date || "",
            "Returnable Income",
            t.customerName || t.invoiceNo || "",
            t.remark || "",
            getBranchName(t.locCode),
            t.amount || 0,
            0,
            0,
            0,
            t.amount || 0
          ]);
        });
      });
    });

    // 3. Expenses
    Object.keys(expenseGrouped).forEach(cat => {
      const g = expenseGrouped[cat];
      Object.keys(g.subCategories).forEach(sub => {
        const sg = g.subCategories[sub];
        sg.transactions.forEach(t => {
          const tTotal = (t.cash || 0) + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0);
          rows.push([
            "EXPENSES",
            t.date || "",
            getCategoryLabel(cat),
            t.customerName || t.invoiceNo || "",
            t.remark || "",
            getBranchName(t.locCode),
            t.cash || 0,
            t.rbl || 0,
            t.bank || 0,
            t.upi || 0,
            tTotal
          ]);
        });
      });
    });

    // 4. Holded Security Refund
    Object.keys(holdedSecRefundGrouped).forEach(cat => {
      const g = holdedSecRefundGrouped[cat];
      Object.keys(g.subCategories).forEach(sub => {
        const sg = g.subCategories[sub];
        sg.transactions.forEach(t => {
          const tTotal = (t.cash || 0) + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0);
          rows.push([
            "HOLDED SECURITY REFUND",
            t.date || "",
            getCategoryLabel(cat),
            t.customerName || t.invoiceNo || "",
            t.remark || "",
            getBranchName(t.locCode),
            t.cash || 0,
            t.rbl || 0,
            t.bank || 0,
            t.upi || 0,
            tTotal
          ]);
        });
      });
    });

    // 5. Cash to Bank
    Object.keys(cashToBankGrouped).forEach(cat => {
      const g = cashToBankGrouped[cat];
      Object.keys(g.subCategories).forEach(sub => {
        const sg = g.subCategories[sub];
        sg.transactions.forEach(t => {
          const tTotal = (t.cash || 0) + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0);
          rows.push([
            "CASH TO BANK",
            t.date || "",
            "Cash to Bank",
            t.customerName || t.invoiceNo || "",
            t.remark || "",
            getBranchName(t.locCode),
            t.cash || 0,
            t.rbl || 0,
            t.bank || 0,
            t.upi || 0,
            tTotal
          ]);
        });
      });
    });

    // 6. Bank to Cash
    Object.keys(bankToCashGrouped).forEach(cat => {
      const g = bankToCashGrouped[cat];
      Object.keys(g.subCategories).forEach(sub => {
        const sg = g.subCategories[sub];
        sg.transactions.forEach(t => {
          const tTotal = (t.cash || 0) + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0);
          rows.push([
            "BANK TO CASH",
            t.date || "",
            "Bank to Cash",
            t.customerName || t.invoiceNo || "",
            t.remark || "",
            getBranchName(t.locCode),
            t.cash || 0,
            t.rbl || 0,
            t.bank || 0,
            t.upi || 0,
            tTotal
          ]);
        });
      });
    });

    return rows;
  }, [incomeGrouped, returnableIncomeGrouped, expenseGrouped, holdedSecRefundGrouped, cashToBankGrouped, bankToCashGrouped]);

  // Renders: category header row → directly transaction rows (no subcategory intermediate row)
  const renderCategoryRows = (grouped, typeLabel, isIncome, isReturnable = false, isExcluded = false) =>
    Object.keys(grouped).map(cat => {
      const g = grouped[cat];
      const catTotal = g.cash + g.rbl + g.bank + g.upi;
      const catKey = `${typeLabel}-${cat}`;
      const isCatExp = !!expanded[catKey];
      const sign = (v) => isIncome || isReturnable ? fmt(v) : (v !== 0 ? `-${fmt(Math.abs(v))}` : "-");

      const headerBg = typeLabel === "RETURNABLE"
        ? "bg-amber-50 hover:bg-amber-100/70 border-amber-200/80 text-amber-900"
        : typeLabel === "BANK_CASH"
        ? "bg-teal-50 hover:bg-teal-100/70 border-teal-200/80 text-teal-900"
        : typeLabel === "HOLDED_SEC"
        ? "bg-purple-50 hover:bg-purple-100/70 border-purple-200/80 text-purple-900"
        : typeLabel === "CASH_BANK"
        ? "bg-sky-50 hover:bg-sky-100/70 border-sky-200/80 text-sky-900"
        : isIncome
        ? "bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-100 text-emerald-800"
        : "bg-rose-50/50 hover:bg-rose-100/60 border-rose-100 text-rose-800";

      const totalTextColor = typeLabel === "RETURNABLE"
        ? "text-amber-800"
        : typeLabel === "BANK_CASH"
        ? "text-teal-800"
        : typeLabel === "HOLDED_SEC"
        ? "text-purple-800"
        : typeLabel === "CASH_BANK"
        ? "text-sky-800"
        : isIncome
        ? "text-emerald-700"
        : "text-rose-700";

      // Collect all transactions directly under this category
      const transactions = Object.values(g.subCategories).flatMap(sg => sg.transactions);

      return (
        <tbody key={catKey} className="border-b border-gray-100">
          {/* Category Header Row */}
          <tr 
            className={`cursor-pointer transition-colors border-t ${headerBg}`}
            onClick={() => toggleExpand(catKey)}
          >
            <td className="px-4 py-3 text-center w-12">
              {isCatExp ? <ChevronDown size={16} className="inline-block text-gray-600" /> : <ChevronRight size={16} className="inline-block text-gray-600" />}
            </td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-800" colSpan={showBranch ? 4 : 3}>
              <span className="inline-flex items-center gap-1.5 font-bold text-gray-900">
                {getCategoryLabel(cat)}
              </span>
            </td>
            <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{g.cash !== 0 ? sign(g.cash) : "-"}</td>
            <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{g.rbl  !== 0 ? sign(g.rbl)  : "-"}</td>
            <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{g.bank !== 0 ? sign(g.bank) : "-"}</td>
            <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{g.upi  !== 0 ? sign(g.upi)  : "-"}</td>
            <td className={`px-4 py-3 text-right text-sm font-bold ${totalTextColor}`}>
              {isIncome || isReturnable ? fmt(catTotal) : `-${fmt(Math.abs(catTotal))}`}
            </td>
          </tr>

          {/* Direct Transaction Rows (no nested subcategory header) */}
          {isCatExp && transactions.map((t, i) => {
            const dateStr = t.date
              ? new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
              : "-";
            const isRentOutOrReturnable = cat === "RentOut" || cat === "Returnable Income";
            const isIncentiveCat = cat.toLowerCase() === "incentive";
            const tCash = isRentOutOrReturnable ? (t.amount || 0) : (t.cash || 0);
            return (
              <tr key={`${catKey}-tx-${i}`} className="bg-slate-50/50 hover:bg-slate-100/60 border-t border-slate-100 text-xs">
                <td className="px-4 py-2.5 text-gray-400 pl-8 whitespace-nowrap">{dateStr}</td>
                <td className="px-4 py-2.5 text-gray-600 font-medium">{t.invoiceNo || t.customerName || "-"}</td>
                <td className="px-4 py-2.5 text-gray-700">
                  {isIncentiveCat ? (t.remark || t.customerName || "-") : (t.customerName || "-")}
                </td>
                <td className="px-4 py-2.5 text-gray-500 italic max-w-[180px] truncate" title={t.remark || ""}>
                  {t.remark || "-"}
                </td>
                {showBranch && (
                  <td className="px-4 py-2.5 text-blue-700 font-medium">
                    {getBranchName(t.locCode)}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right text-gray-600 font-mono">
                  {tCash !== 0 ? (isIncome || isReturnable ? fmt(tCash) : `-${fmt(Math.abs(tCash))}`) : "-"}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600 font-mono">
                  {!isRentOutOrReturnable && t.rbl !== 0 ? (isIncome ? fmt(t.rbl) : `-${fmt(Math.abs(t.rbl))}`) : "-"}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600 font-mono">
                  {!isRentOutOrReturnable && t.bank !== 0 ? (isIncome ? fmt(t.bank) : `-${fmt(Math.abs(t.bank))}`) : "-"}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600 font-mono">
                  {!isRentOutOrReturnable && t.upi !== 0 ? (isIncome ? fmt(t.upi) : `-${fmt(Math.abs(t.upi))}`) : "-"}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-800 font-mono font-semibold">
                  {isRentOutOrReturnable ? fmt(tCash) : (
                    isIncome 
                      ? fmt(tCash + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0))
                      : `-${fmt(Math.abs(tCash + (t.rbl || 0) + (t.bank || 0) + (t.upi || 0)))}`
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      );
    });

  const hasData = !loading && (
    Object.keys(incomeGrouped).length > 0 ||
    Object.keys(returnableIncomeGrouped).length > 0 ||
    Object.keys(expenseGrouped).length > 0 ||
    Object.keys(holdedSecRefundGrouped).length > 0 ||
    Object.keys(cashToBankGrouped).length > 0 ||
    Object.keys(bankToCashGrouped).length > 0
  );

  return (
    <>
      <Helmet>
        <title>Income &amp; Expenses Report | RootFin</title>
      </Helmet>
      <Headers />
      
      <div 
        style={{ 
          marginLeft: isSidebarOpen ? "256px" : "0px", 
          padding: "24px", 
          width: isSidebarOpen ? "calc(100% - 256px)" : "100%",
          maxWidth: isSidebarOpen ? "calc(100% - 256px)" : "100%",
          minHeight: "100vh",
          backgroundColor: "#fafbfc",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        {/* Page Title & Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ 
            fontSize: "24px", 
            fontWeight: "700", 
            color: "#1e293b",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            margin: "0 0 4px 0"
          }}>
            Income &amp; Expenses Report
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            Detailed overview of Income &amp; Expense Report
          </p>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            {/* From Date */}
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
              />
            </div>

            {/* To Date */}
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
              >
                <option value="All Categories">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {getCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            {/* Store Dropdown (for admin or cluster manager) */}
            {canSelectStore && (
              <div className="flex-1 min-w-[160px]">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Store
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
                >
                  <option value="all">{isClusterManager ? "All My Stores" : "All Stores"}</option>
                  {(isClusterManager
                    ? STORE_LIST.filter((s) => clusterAllowedLocCodes.includes(s.locCode))
                    : STORE_LIST
                  ).map((s) => (
                    <option key={s.locCode} value={s.locCode}>
                      {s.locName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="h-[38px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Apply Filter</span>
              </button>

              <button
                onClick={() => {
                  setFromDate(firstOfMonth());
                  setToDate(today());
                  setFilterCategory("All Categories");
                  setSelectedStore("all");
                  setIncomeRows([]);
                  setReturnableIncomeRows([]);
                  setExpenseRows([]);
                  setHoldedSecurityRefundRows([]);
                  setCashToBankRows([]);
                  setExpanded({});
                  setHasSearched(false);
                }}
                className="h-[38px] w-[38px] border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg transition-all cursor-pointer shadow-sm inline-flex items-center justify-center shrink-0"
                title="Reset Filters"
              >
                <RefreshCw size={15} />
              </button>

              {hasData && (
                <CSVLink
                  data={csvData}
                  filename={`Income_Expenses_Report_${fromDate}_to_${toDate}.csv`}
                  className="h-[38px] px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer no-underline inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </CSVLink>
              )}
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Income */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Total Income</p>
                <h3 className="text-2xl font-black text-gray-900 font-mono">{fmt(incTotal)}</h3>
                <div className="flex flex-wrap gap-x-2 text-[11px] text-gray-500 mt-2">
                  <span>Cash: <strong className="text-gray-700">{fmt(incTotals.cash)}</strong></span>
                  <span>• Bank: <strong className="text-gray-700">{fmt(incTotals.bank)}</strong></span>
                  <span>• UPI: <strong className="text-gray-700">{fmt(incTotals.upi)}</strong></span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Returnable Income */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Returnable Income</p>
                <h3 className="text-2xl font-black text-amber-900 font-mono">{fmt(retTotal)}</h3>
                <p className="text-[11px] text-amber-600/90 mt-2">
                  Total returnable income held
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">Total Expenses</p>
                <h3 className="text-2xl font-black text-gray-900 font-mono">{fmt(Math.abs(expTotal))}</h3>
                <div className="flex flex-wrap gap-x-2 text-[11px] text-gray-500 mt-2">
                  <span>Cash: <strong className="text-gray-700">{fmt(Math.abs(expTotals.cash))}</strong></span>
                  <span>• Bank: <strong className="text-gray-700">{fmt(Math.abs(expTotals.bank))}</strong></span>
                  <span>• UPI: <strong className="text-gray-700">{fmt(Math.abs(expTotals.upi))}</strong></span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <TrendingDown size={24} />
              </div>
            </div>

            {/* Net Difference */}
            <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Net Difference</p>
                <h3 className={`text-2xl font-black font-mono ${netTotal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {netTotal >= 0 ? fmt(netTotal) : `-${fmt(Math.abs(netTotal))}`}
                </h3>
                <div className="flex flex-wrap gap-x-2 text-[11px] text-gray-500 mt-2">
                  <span>Cash: <strong className="text-gray-700">{fmt(netCash)}</strong></span>
                  <span>• Bank: <strong className="text-gray-700">{fmt(netBank)}</strong></span>
                  <span>• UPI: <strong className="text-gray-700">{fmt(netUpi)}</strong></span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ArrowUpDown size={24} />
              </div>
            </div>
          </div>
        )}

        {/* Report Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-gray-200">
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-12 text-center">#</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Category</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Customer</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Remarks</th>
                  {showBranch && (
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Branch</th>
                  )}
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">Cash</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">Razorpay</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">Bank</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">UPI</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">Total</th>
                </tr>
              </thead>

              {loading && (
                <tbody>
                  <tr>
                    <td colSpan={showBranch ? 10 : 9} className="px-4 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw size={28} className="animate-spin text-blue-600" />
                        <p className="font-medium text-gray-600">Loading Income &amp; Expense data...</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              )}

              {!loading && !hasData && !hasSearched && (
                <tbody>
                  <tr>
                    <td colSpan={showBranch ? 10 : 9} className="px-4 py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Filter size={32} className="text-gray-300" />
                        <p className="text-base font-medium text-gray-600">Apply a filter to load data.</p>
                        <p className="text-xs text-gray-400">Select dates and category, then click "Apply Filter".</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              )}

              {!loading && !hasData && hasSearched && (
                <tbody>
                  <tr>
                    <td colSpan={showBranch ? 10 : 9} className="px-4 py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-base font-medium text-gray-600">No records match the selected filters.</p>
                        <p className="text-xs text-gray-400">Try choosing a wider date range or different category.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              )}

              {hasData && (
                <>
                  {/* 1. INCOME SECTION */}
                  <tbody>
                    <tr className="bg-emerald-100/70 border-y border-emerald-200">
                      <td colSpan={showBranch ? 10 : 9} className="px-4 py-3 text-sm font-black text-emerald-900 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-2">
                          <TrendingUp size={18} className="text-emerald-700" />
                          INCOME
                        </span>
                      </td>
                    </tr>
                  </tbody>

                  {renderCategoryRows(incomeGrouped, "INCOME", true)}

                  <tbody>
                    <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                      <td colSpan={showBranch ? 5 : 4} className="px-4 py-3 text-right text-sm font-bold text-emerald-900">
                        Total Income:
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{incTotals.cash !== 0 ? fmt(incTotals.cash) : "-"}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{incTotals.rbl  !== 0 ? fmt(incTotals.rbl)  : "-"}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{incTotals.bank !== 0 ? fmt(incTotals.bank) : "-"}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{incTotals.upi  !== 0 ? fmt(incTotals.upi)  : "-"}</td>
                      <td className="px-4 py-3 text-right text-sm font-black text-emerald-700 font-mono">{fmt(incTotal)}</td>
                    </tr>
                  </tbody>

                  {/* 2. RETURNABLE INCOME (Single tab/row) */}
                  {renderCategoryRows(returnableIncomeGrouped, "RETURNABLE", false, true)}

                  {/* 3. BANK TO CASH (Single tab/row) */}
                  {renderCategoryRows(bankToCashGrouped, "BANK_CASH", true, false, true)}

                  {/* 4. EXPENSES SECTION */}
                  <tbody>
                    <tr className="bg-rose-100/70 border-y border-rose-200">
                      <td colSpan={showBranch ? 10 : 9} className="px-4 py-3 text-sm font-black text-rose-900 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-2">
                          <TrendingDown size={18} className="text-rose-700" />
                          EXPENSES
                        </span>
                      </td>
                    </tr>
                  </tbody>

                  {renderCategoryRows(expenseGrouped, "EXPENSE", false)}

                  <tbody>
                    <tr className="bg-rose-50 border-t-2 border-rose-200">
                      <td colSpan={showBranch ? 5 : 4} className="px-4 py-3 text-right text-sm font-bold text-rose-900">
                        Total Expenses:
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{expTotals.cash !== 0 ? `-${fmt(Math.abs(expTotals.cash))}` : "-"}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{expTotals.rbl  !== 0 ? `-${fmt(Math.abs(expTotals.rbl))}` : "-"}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{expTotals.bank !== 0 ? `-${fmt(Math.abs(expTotals.bank))}` : "-"}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800 font-mono">{expTotals.upi  !== 0 ? `-${fmt(Math.abs(expTotals.upi))}` : "-"}</td>
                      <td className="px-4 py-3 text-right text-sm font-black text-rose-700 font-mono">{expTotal !== 0 ? `-${fmt(Math.abs(expTotal))}` : "-"}</td>
                    </tr>
                  </tbody>

                  {/* 5. HOLDED SECURITY REFUND (Single tab/row) */}
                  {renderCategoryRows(holdedSecRefundGrouped, "HOLDED_SEC", false, false, true)}

                  {/* 6. CASH TO BANK (Single tab/row) */}
                  {renderCategoryRows(cashToBankGrouped, "CASH_BANK", false, false, true)}

                  {/* 7. NET DIFFERENCE SECTION (Total Income - Total Expenses) */}
                  <tbody>
                    <tr className="bg-blue-50/90 border-t-4 border-blue-300">
                      <td colSpan={showBranch ? 5 : 4} className="px-4 py-3.5 text-right text-sm font-black text-blue-950 uppercase tracking-wider">
                        Net Difference Total:
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs font-bold text-gray-900 font-mono">{netCash !== 0 ? fmt(netCash) : "-"}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-bold text-gray-900 font-mono">{netRbl  !== 0 ? fmt(netRbl)  : "-"}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-bold text-gray-900 font-mono">{netBank !== 0 ? fmt(netBank) : "-"}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-bold text-gray-900 font-mono">{netUpi  !== 0 ? fmt(netUpi)  : "-"}</td>
                      <td className={`px-4 py-3.5 text-right text-base font-black font-mono ${netTotal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {netTotal >= 0 ? fmt(netTotal) : `-${fmt(Math.abs(netTotal))}`}
                      </td>
                    </tr>
                  </tbody>
                </>
              )}
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
