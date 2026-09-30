import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SingleImageUpload from "../components/SingleImageUpload";
import baseUrl from "../api/api";
import { 
  DollarSign, 
  Building2, 
  Receipt, 
  ArrowDownRight, 
  ArrowUpRight, 
  Calendar, 
  Store, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  CreditCard,
  Layers,
  History,
  Download
} from "lucide-react";
import { useSidebar } from "../hooks/useSidebar.js";

const DIRECT_EXPENSE_CATS = [
  { value: "material",              label: "Material & Fabrics",          subs: ["Fabric Purchase", "Accessories", "Trims & Buttons", "Packaging Material"] },
  { value: "dry cleaning",          label: "Dry Cleaning",                subs: ["Garment Dry Cleaning", "Steam Pressing", "Spot Cleaning"] },
  { value: "altration",             label: "Alteration & Tailoring",      subs: ["Hemming/Fitting", "Stitching Work", "Tailoring Charges"] },
  { value: "courier charges",       label: "Courier & Inward Freight",    subs: ["Inter-branch Courier", "Customer Delivery", "Supplier Freight"] },
  { value: "production expenses",   label: "Production & Workshop",       subs: ["Workshop Tools", "Embroidery/Design Work", "Job Work"] },
  { value: "direct labour",         label: "Labour / Direct Wages",       subs: ["Helper Charges", "Piece Rate Wages", "Overtime Work"] },
  { value: "asset purchase",        label: "Asset Purchase (Direct)",     subs: ["Steamer", "Sewing Machine", "Ironing Equipment"] },
  { value: "other direct",          label: "Other Direct Expense",        subs: ["General Direct Expense"] },
  { value: "custom",                label: "+ Custom Category" }
];

const INDIRECT_EXPENSE_CATS = [
  { value: "rent",                  label: "Store Rent",                  subs: ["Monthly Rent", "Advance/Deposit"] },
  { value: "salary",                label: "Staff Salary & Advance",      subs: ["Monthly Salary", "Salary Advance", "Staff Incentive"] },
  { value: "utility bill",          label: "Electricity Charges",         subs: ["Electricity Bill", "Generator Fuel"] },
  { value: "maintenance expenses",  label: "Repairs & Maintenance",        subs: ["Ac Service", "Interior Maintenance", "Glass Cleaning", "Electrical Work", "Painting/Civil Work"] },
  { value: "travel exp",            label: "Travel & Fuel Exp",           subs: ["Local Travel", "Fuel/Petrol", "Vehicle Maintenance"] },
  { value: "petty expenses",        label: "Office & Petty Expenses",     subs: ["Tea/Coffee", "Office Cleaning Supplies", "Daily Sundry"] },
  { value: "telephone internet",    label: "Internet & Phone",            subs: ["Broadband Bill", "Mobile Recharge", "POS Sim"] },
  { value: "printing stationary",   label: "Printing & Stationary",        subs: ["Printout", "Books/Registers", "Bill Books/Vouchers", "Stationary Items"] },
  { value: "staff welfare",         label: "Staff Welfare",                subs: ["Staff Refreshment", "Food Allowance", "Special Occasion"] },
  { value: "staff reimbursement",   label: "Staff Accommodation",          subs: ["Room Rent", "Room Electricity", "Maintenance"] },
  { value: "asset purchase",        label: "Asset & Furniture",           subs: ["Chairs/Tables", "Electronic Items", "Display Fixtures"] },
  { value: "water charges",         label: "Water Charges",               subs: ["Water Can Purchase", "Water Authority Bill"] },
  { value: "waste management",      label: "Waste Management",            subs: ["Municipal Fee", "Garbage Collection"] },
  { value: "spot incentive",        label: "Incentives & Bonus",          subs: ["Spot Incentive", "Weekly Incentive", "Monthly Target Bonus"] },
  { value: "other expenses",        label: "Refund / Compensation",       subs: ["Security Refund", "Cancellation Refund", "Customer Compensation"] },
  { value: "bulk amount transfer",  label: "Cash to Bank",                subs: ["Deposit to Bank Account"] },
  { value: "other indirect",        label: "Other Indirect Expense",      subs: ["General Overhead"] },
  { value: "custom",                label: "+ Custom Category" }
];

const fallbackLocations = [
  { "locName": "Z-Edapally1", "locCode": "144" },
  { "locName": "Warehouse", "locCode": "858" },
  { "locName": "G-Edappally", "locCode": "702" },
  { "locName": "HEAD OFFICE01", "locCode": "759" },
  { "locName": "SG-Trivandrum", "locCode": "700" },
  { "locName": "Z- Edappal", "locCode": "100" },
  { "locName": "Z.Perinthalmanna", "locCode": "133" },
  { "locName": "Z.Kottakkal", "locCode": "122" },
  { "locName": "G.Kottayam", "locCode": "701" },
  { "locName": "G.Perumbavoor", "locCode": "703" },
  { "locName": "G.Thrissur", "locCode": "704" },
  { "locName": "G.Chavakkad", "locCode": "706" },
  { "locName": "G.Calicut ", "locCode": "712" },
  { "locName": "G.Vadakara", "locCode": "708" },
  { "locName": "G.Edappal", "locCode": "707" },
  { "locName": "G.Perinthalmanna", "locCode": "709" },
  { "locName": "G.Kottakkal", "locCode": "711" },
  { "locName": "G.Manjeri", "locCode": "710" },
  { "locName": "G.Palakkad ", "locCode": "705" },
  { "locName": "G.Kalpetta", "locCode": "717" },
  { "locName": "G.Kannur", "locCode": "716" },
  { "locName": "G.Mg Road", "locCode": "718" },
  { "locName": "Production", "locCode": "101" },
  { "locName": "Office", "locCode": "102" },
  { "locName": "WAREHOUSE", "locCode": "103" }
];

const DirectIndirectExpenses = ({ initialType = "direct" }) => {
  const isSidebarOpen = useSidebar();
  const location = useLocation();

  // Determine active tab from URL or props
  const isIndirectUrl = location.pathname.includes("indirect");
  const [expenseType, setExpenseType] = useState(isIndirectUrl ? "indirect" : initialType);
  const [entryType, setEntryType] = useState("branch_entry"); // "branch_entry" | "accountant_entry"

  useEffect(() => {
    if (location.pathname.includes("indirect")) {
      setExpenseType("indirect");
    } else if (location.pathname.includes("direct")) {
      setExpenseType("direct");
    }
  }, [location.pathname]);

  const currentusers = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const isAdmin = (currentusers.power || "").toLowerCase() === "admin" || (currentusers.role || "").toLowerCase() === "admin";
  const isSuperAdmin = (currentusers.role || "").toLowerCase() === "superadmin";
  const isFinancialHead = (currentusers.role || "").toLowerCase() === "financial_head";
  const canSelectStore = isAdmin || isSuperAdmin || isFinancialHead;

  const defaultStore = currentusers.locCode || "759";
  const [selectedStore, setSelectedStore] = useState(defaultStore);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const currentCategoryList = expenseType === "direct" ? DIRECT_EXPENSE_CATS : INDIRECT_EXPENSE_CATS;
  const [selectedCategory, setSelectedCategory] = useState(currentCategoryList[0]);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [subCategory, setSubCategory] = useState(currentCategoryList[0].subs?.[0] || "");
  
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Recent transactions state
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Reset category on expenseType toggle
  useEffect(() => {
    const list = expenseType === "direct" ? DIRECT_EXPENSE_CATS : INDIRECT_EXPENSE_CATS;
    setSelectedCategory(list[0]);
    setSubCategory(list[0].subs?.[0] || "");
    setCustomCategoryName("");
  }, [expenseType]);

  // Fetch recent expense transactions
  const fetchRecentExpenses = async () => {
    setIsLoadingHistory(true);
    try {
      const targetStore = canSelectStore ? selectedStore : currentusers.locCode;
      const todayStr = date || new Date().toISOString().split("T")[0];
      const res = await fetch(`${baseUrl.baseUrl}user/getPayment?locCode=${targetStore}&date=${todayStr}`);
      if (res.ok) {
        const json = await res.json();
        const list = (json.data || json || []).filter(item => (item.type || "").toLowerCase() === "expense");
        setRecentTransactions(list);
      }
    } catch (e) {
      console.error("Error fetching recent transactions", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchRecentExpenses();
  }, [selectedStore, date]);

  const handleCategoryChange = (val) => {
    const cat = currentCategoryList.find(c => c.value === val);
    if (cat) {
      setSelectedCategory(cat);
      if (cat.value === "bulk amount transfer") {
        setPaymentMethod("cash");
        setSplitPayment(false);
      }
      setSubCategory(cat.subs?.[0] || "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    if (splitPayment) {
      const total = parseFloat(cashAmount || 0) + parseFloat(bankAmount || 0) + parseFloat(upiAmount || 0);
      if (total !== parseFloat(amount || 0)) {
        setStatusMessage({ type: "error", text: "Sum of Cash, Bank, and UPI must exactly match the total amount." });
        setIsSubmitting(false);
        return;
      }
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatusMessage({ type: "error", text: "Please enter a valid expense amount." });
      setIsSubmitting(false);
      return;
    }

    if (!remark.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a description or remark for this expense." });
      setIsSubmitting(false);
      return;
    }

    const finalCategory = selectedCategory.value === "custom" 
      ? (customCategoryName.trim() || `${expenseType === "direct" ? "Direct" : "Indirect"} Custom Expense`) 
      : selectedCategory.value;

    const data = {
      type: "Expense",
      expenseType: expenseType, // "direct" | "indirect"
      entryType: entryType,     // "branch_entry" | "accountant_entry"
      category: finalCategory,
      subCategory: subCategory || (selectedCategory.subs?.[0] || ""),
      remark: `[${expenseType.toUpperCase()} - ${entryType === 'branch_entry' ? 'BRANCH' : 'ACCOUNTANT'}] ${remark.trim()}`,
      locCode: canSelectStore ? selectedStore : currentusers.locCode,
      isAdminLevel: canSelectStore,
      amount: `-${amount}`,
      cash: splitPayment ? `-${cashAmount || "0"}` : paymentMethod === "cash" ? `-${amount}` : "0",
      bank: splitPayment ? `-${bankAmount || "0"}` : paymentMethod === "bank" ? `-${amount}` : "0",
      upi:  splitPayment ? `-${upiAmount  || "0"}` : paymentMethod === "upi"  ? `-${amount}` : "0",
      paymentMethod: splitPayment ? "split" : paymentMethod,
      date: date || new Date().toISOString().split("T")[0],
      invoiceNo: voucherNo.trim() || undefined,
      attachment: attachmentFile?.base64 || null,
    };

    try {
      const res = await fetch(`${baseUrl.baseUrl}user/createPayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: "Error: " + (json?.message || "Failed to record expense.") });
      } else {
        setStatusMessage({ 
          type: "success", 
          text: `✅ ${expenseType === 'direct' ? 'Direct' : 'Indirect'} Expense (${entryType === 'branch_entry' ? 'Branch Entry' : 'Accountant Entry'}) recorded successfully!` 
        });
        // Reset inputs
        setAmount("");
        setCashAmount("");
        setBankAmount("");
        setUpiAmount("");
        setRemark("");
        setVoucherNo("");
        setAttachmentFile(null);
        setCustomCategoryName("");
        setSubCategory(selectedCategory.subs?.[0] || "");
        fetchRecentExpenses();
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Network error: Failed to record transaction." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAmount("");
    setRemark("");
    setVoucherNo("");
    setAttachmentFile(null);
    setCashAmount("");
    setBankAmount("");
    setUpiAmount("");
    setPaymentMethod("cash");
    setSplitPayment(false);
    setCustomCategoryName("");
    const list = expenseType === "direct" ? DIRECT_EXPENSE_CATS : INDIRECT_EXPENSE_CATS;
    setSelectedCategory(list[0]);
    setSubCategory(list[0].subs?.[0] || "");
    setStatusMessage(null);
  };

  const getStoreName = (code) => {
    return fallbackLocations.find(l => l.locCode === code)?.locName || `Store #${code}`;
  };

  return (
    <div className={`min-h-screen bg-[#f8fafc] transition-all duration-300 ${isSidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-3">
                <Layers size={14} />
                <span>Financial Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {expenseType === "direct" ? "Direct Expense Entry" : "Indirect Expense Entry"}
              </h1>
              <p className="mt-1 text-purple-100 text-sm max-w-xl">
                {expenseType === "direct" 
                  ? "Record production, materials, tailoring, alteration, freight, and direct operational costs."
                  : "Record administrative overhead, rent, utility bills, salaries, maintenance, and store expenses."}
              </p>
            </div>

            {/* Main Tabs: Direct vs Indirect */}
            <div className="flex bg-black/30 p-1.5 rounded-2xl backdrop-blur-md self-start md:self-center border border-white/15">
              <button
                type="button"
                onClick={() => setExpenseType("direct")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  expenseType === "direct"
                    ? "bg-white text-purple-900 shadow-lg scale-100"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <ArrowDownRight size={18} />
                <span>Direct Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setExpenseType("indirect")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  expenseType === "indirect"
                    ? "bg-white text-purple-900 shadow-lg scale-100"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <ArrowUpRight size={18} />
                <span>Indirect Expense</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border shadow-sm animate-fade-in ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-rose-600 shrink-0" />}
            <span className="flex-1">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs font-bold uppercase tracking-wider hover:opacity-75">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Expense Form (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
            
            {/* Sub-Type Selector: Branch Entry vs Accountant Entry */}
            <div className="mb-8">
              <label className="block text-xs font-bold tracking-wider text-slate-500 uppercase mb-3">
                Select Entry Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setEntryType("branch_entry")}
                  className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                    entryType === "branch_entry"
                      ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${entryType === 'branch_entry' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Store size={18} />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">Branch Entry Expense</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Store-level daily operational expense recorded directly for branch accounting.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryType("accountant_entry")}
                  className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                    entryType === "accountant_entry"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${entryType === 'accountant_entry' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 size={18} />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">Accountant Entry</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Central head-office audit, ledger adjustment, and consolidated voucher entry.
                  </p>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Row 1: Store & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Store size={14} className="text-purple-600" />
                    Target Branch / Store *
                  </label>
                  {canSelectStore ? (
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      required
                    >
                      {fallbackLocations.map((loc) => (
                        <option key={loc.locCode} value={loc.locCode}>
                          {loc.locName} ({loc.locCode})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={`${getStoreName(currentusers.locCode)} (${currentusers.locCode})`}
                      className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-not-allowed"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar size={14} className="text-purple-600" />
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Category & Sub Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Tag size={14} className="text-purple-600" />
                    Expense Category *
                  </label>
                  <select
                    value={selectedCategory.value}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    {currentCategoryList.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategory.value === "custom" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Custom Category Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Fabric Dyeing / Printing charges"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                ) : selectedCategory.subs && selectedCategory.subs.length > 0 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Sub-Category / Specific Tag
                    </label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    >
                      {selectedCategory.subs.map((sub, idx) => (
                        <option key={idx} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Voucher / Invoice Reference No.
                    </label>
                    <input
                      type="text"
                      placeholder="Optional reference / invoice number"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Row 3: Amount & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-purple-600" />
                    Total Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-purple-600" />
                    Payment Mode *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["cash", "bank", "upi"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(mode);
                          setSplitPayment(false);
                        }}
                        className={`h-12 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border ${
                          !splitPayment && paymentMethod === mode
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSplitPayment(!splitPayment)}
                      className={`h-12 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border ${
                        splitPayment
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Split
                    </button>
                  </div>
                </div>
              </div>

              {/* Split Breakdown Details if Split Mode is ON */}
              {splitPayment && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900 uppercase">
                    <span>Split Payment Breakdown</span>
                    <span>Total: ₹{parseFloat(amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cash (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={bankAmount}
                        onChange={(e) => setBankAmount(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">UPI (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Remark / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={14} className="text-purple-600" />
                  Description / Expense Remark *
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter detailed description, purpose, vendor name, or specific notes..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                  required
                />
              </div>

              {/* Attachment Bill Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt size={14} className="text-purple-600" />
                  Bill / Receipt / Voucher Attachment
                </label>
                <SingleImageUpload
                  onImageSelect={(file) => setAttachmentFile(file)}
                  existingImage={attachmentFile}
                  onRemoveImage={() => setAttachmentFile(null)}
                />
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl border border-slate-300 font-bold text-sm text-slate-600 hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] font-bold text-sm text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Expense...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Record {expenseType === 'direct' ? 'Direct' : 'Indirect'} Expense</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Quick Summary / History Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Context Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers size={16} className="text-purple-600" />
                Accounting Guide
              </h2>
              <div className="space-y-4 text-xs text-slate-600">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                    <ArrowDownRight size={14} className="text-emerald-600" />
                    Direct Expense
                  </div>
                  <p>
                    Costs directly tied to production, alterations, tailoring, raw materials, dry cleaning, and freight inward. Directly impacts Gross Margin.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                    <ArrowUpRight size={14} className="text-indigo-600" />
                    Indirect Expense
                  </div>
                  <p>
                    Operational overheads including store rent, administrative salaries, electricity, tea/office supplies, internet, and repairs. Impacts Net Margin.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Expenses List */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <History size={16} className="text-purple-600" />
                  Today's Store Expenses
                </h2>
                <button
                  type="button"
                  onClick={fetchRecentExpenses}
                  className="text-xs text-purple-600 hover:text-purple-700 font-bold"
                >
                  Refresh
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading today's records...</div>
              ) : recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No expense records found for selected store today.
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {recentTransactions.map((tx, idx) => (
                    <div
                      key={tx._id || idx}
                      className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            (tx.expenseType === 'direct' || tx.remark?.includes('[DIRECT'))
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {(tx.expenseType || (tx.remark?.includes('[DIRECT') ? 'direct' : 'indirect')).toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-slate-800 capitalize truncate">
                            {tx.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{tx.remark}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span>{tx.paymentMethod?.toUpperCase()}</span>
                          <span>•</span>
                          <span>{getStoreName(tx.locCode)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-rose-600">
                          ₹{Math.abs(parseFloat(tx.amount || 0)).toLocaleString()}
                        </span>
                        {tx.attachment && (
                          <div className="mt-1">
                            <a
                              href={`${baseUrl.baseUrl}user/downloadAttachment/${tx._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-purple-600 hover:underline flex items-center justify-end gap-1 font-semibold"
                            >
                              <Download size={10} /> Bill
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default DirectIndirectExpenses;
