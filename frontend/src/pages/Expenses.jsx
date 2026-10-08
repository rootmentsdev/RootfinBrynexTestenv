import { useState } from 'react';
import SingleImageUpload from "../components/SingleImageUpload";
import baseUrl from "../api/api";
import { BsBank2 } from "react-icons/bs";
import { MdCurrencyRupee } from "react-icons/md";
import { ChevronDown } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar.js";
import AssignTargetModal from "../components/AssignTargetModal.jsx";

const baseExpenseCats = [
  { value: "dry cleaning",          label: "Dry Cleaning" },
  { value: "altration",             label: "Altration" },
  { value: "material",              label: "Material" },
  { value: "courier charges",       label: "Courier Charges" },
  { value: "maintenance expenses",  label: "Repairs & Maintenance",        subs: ["Ac service", "Interior Maintenance", "Glass Cleaning", "Electrical work"] },
  { value: "travel exp",            label: "Travel Exp" },
  { value: "fuel exp",              label: "Fuel Exp" },
  { value: "petty expenses",        label: "Office Expense" },
  { value: "telephone internet",    label: "Internet Expense",             subs: ["Telephone/wifi"] },
  { value: "utility bill",          label: "Electricity Charges" },
  { value: "waste management",      label: "Waste Management" },
  { value: "water charges",         label: "Water Charges" },
  { value: "salary",                label: "Salary/Salary Advance" },
  { value: "printing stationary",   label: "Printing & Stationary",        subs: ["Printout", "Books/pen/Checklist/Register/Bill Book/Voucher", "Stationary Items"] },
  { value: "staff welfare",         label: "Staff Welfare",                subs: ["Cake purchase", "Food allowance on Special Occassion", "Other Refreshment"] },
  { value: "staff reimbursement",   label: "Staff Accommodation",          subs: ["Staff room rent", "Electricity"] },
  { value: "rent",                  label: "Store Rent" },
  { value: "asset purchase",        label: "Asset Purchase",               subs: ["Steamer", "Chairs", "Electronic Items", "Any other Furniture items"] },
  { value: "spot incentive",        label: "Incentive",                    subs: ["Spot incentive", "Weekly incentive"] },
  { value: "other expenses",        label: "Refund",                       subs: ["Security Refund", "Cancellation Refund", "Compensation"] },
  { value: "bulk amount transfer",  label: "Cash to Bank" },
];

const Expenses = () => {
  const isSidebarOpen = useSidebar();
  const currentusers = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const isAdmin = (currentusers.power || "").toLowerCase() === "admin" || (currentusers.role || "").toLowerCase() === "admin";
  const isSuperAdmin = (currentusers.role || "").toLowerCase() === "superadmin";
  const isFinancialHead = (currentusers.role || "").toLowerCase() === "financial_head";
  const canSelectStore = isAdmin || isSuperAdmin || isFinancialHead;
  const cats = canSelectStore
    ? baseExpenseCats
    : baseExpenseCats.filter(c => c.value !== "other expenses" && c.label !== "Refund");

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

  const defaultStore = currentusers.locCode || "759";
  const [selectedStore, setSelectedStore] = useState(defaultStore);

  const [selectedCategory, setSelectedCategory] = useState(cats[0]);
  const [subCategory, setSubCategory] = useState(cats[0].subs?.[0] || "");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const handleCategoryChange = (val) => {
    const cat = cats.find(c => c.value === val);
    setSelectedCategory(cat);
    if (cat.value === "bulk amount transfer") {
      setPaymentMethod("cash");
      setSplitPayment(false);
    }
    const firstSub = cat.subs?.[0] || "";
    setSubCategory(firstSub);
    if (firstSub) setRemark(firstSub);
  };

  const handleSubCategoryChange = (val) => {
    setSubCategory(val);
    if (val) setRemark(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (splitPayment) {
      const total = parseFloat(cashAmount || 0) + parseFloat(bankAmount || 0) + parseFloat(upiAmount || 0);
      if (total !== parseFloat(amount || 0)) {
        alert("Sum of cash, bank, and UPI must equal the total amount.");
        setIsSubmitting(false); return;
      }
    }
    if (!amount || parseFloat(amount) <= 0) { alert("Please enter a valid amount."); setIsSubmitting(false); return; }
    if (!remark.trim()) { alert("Please enter a remark."); setIsSubmitting(false); return; }
    if (!attachmentFile) { alert("Attachment is required for Expense."); setIsSubmitting(false); return; }

    const data = {
      type: "expense",
      category: selectedCategory.value,
      subCategory: subCategory || (selectedCategory.subs?.[0] || ""),
      remark,
      locCode: canSelectStore ? selectedStore : currentusers.locCode,
      isAdminLevel: canSelectStore,
      amount: `-${amount}`,
      cash: splitPayment ? `-${cashAmount || "0"}` : paymentMethod === "cash" ? `-${amount}` : "0",
      bank: splitPayment ? `-${bankAmount || "0"}` : paymentMethod === "bank" ? `-${amount}` : "0",
      upi:  splitPayment ? `-${upiAmount  || "0"}` : paymentMethod === "upi"  ? `-${amount}` : "0",
      paymentMethod: splitPayment ? "split" : paymentMethod,
      date: new Date().toISOString().split("T")[0],
      attachment: attachmentFile?.base64 || null,
    };

    try {
      const res = await fetch(`${baseUrl.baseUrl}user/createPayment`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) alert("Error: " + (json?.message || "Unknown error"));
      else {
        alert("Expense recorded successfully!");
        setAmount(""); setCashAmount(""); setBankAmount(""); setUpiAmount("");
        setRemark(""); setAttachmentFile(null); setSubCategory(selectedCategory.subs?.[0] || "");
      }
    } catch { alert("Failed to create transaction."); }
    finally { setIsSubmitting(false); }
  };

  const handleCancel = () => {
    setAmount(""); setRemark(""); setAttachmentFile(null);
    setSubCategory(cats[0].subs?.[0] || ""); setCashAmount(""); setBankAmount(""); setUpiAmount("");
    setPaymentMethod("cash"); setSplitPayment(false);
    setSelectedCategory(cats[0]);
  };

  return (
    <div className={`min-h-screen bg-[#f0f4ff] transition-all duration-300 ${isSidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'}`}>
      <div className="px-4 md:px-10 pt-8 pb-16">
        {/* Page title */}
        <div className="mb-6 flex items-start md:items-center gap-3">
          <button 
              onClick={() => document.dispatchEvent(new CustomEvent('toggle-sidebar'))}
              className="lg:hidden mt-1 p-2 rounded-lg bg-white shadow-sm border border-[#e6ebfa] text-gray-700 shrink-0"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#101828] tracking-wide uppercase">Expenses</h1>
            <p className="text-sm text-[#6c728a]">Record & Track your business transactions</p>
          </div>
          {canSelectStore && (
            <div className="ml-auto">
              <button
                onClick={() => setIsTargetModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-[#0a142f] text-white text-sm font-medium hover:bg-[#162548] transition-colors shadow-sm flex items-center gap-2"
              >
                Set Expense Limit
              </button>
            </div>
          )}
        </div>

        <AssignTargetModal 
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          cats={cats}
          fallbackLocations={fallbackLocations}
          currentusers={currentusers}
        />

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-sm border border-[#e6ebfa] p-8">
          <form onSubmit={handleSubmit}>

            {/* Admin Store Dropdown */}
            {canSelectStore && (
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-2">Store</label>
                <div className="relative w-full md:w-1/3">
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#d9def1] bg-white px-5 py-4 text-base text-[#101828] focus:outline-none focus:border-[#1e3a8a] pr-10 cursor-pointer"
                  >
                    {fallbackLocations.map(loc => (
                      <option key={loc.locCode} value={loc.locCode}>{loc.locName}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                </div>
              </div>
            )}

            {/* Row 1: Category and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-2">Category</label>
                <div className="relative">
                  <select
                    value={selectedCategory.value}
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] pr-10 cursor-pointer"
                  >
                    {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[15px]">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Sub Category Dropdown */}
            {selectedCategory.subs?.length > 0 && (
              <div className="mb-6">
                <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-2">Sub Category</label>
                <div className="relative w-full md:w-1/2">
                  <select
                    value={subCategory}
                    onChange={e => handleSubCategoryChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] pr-10 cursor-pointer"
                  >
                    {selectedCategory.subs.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            )}

            <hr className="border-[#e6ebfa] my-6" />

            {/* Way of Payment */}
            <div className="mb-8">
              <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-3">Way of Payment</label>
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { id: "cash", label: "Cash", icon: <MdCurrencyRupee size={18} /> },
                  ...(selectedCategory.value !== "bulk amount transfer" && canSelectStore ? [
                    { id: "bank", label: "Bank", icon: <BsBank2 size={16} /> },
                    { id: "upi",  label: "UPI",  icon: <span className="font-bold italic text-sm">UPI</span> },
                  ] : []),
                ].map(({ id, label, icon }) => {
                  const active = !splitPayment && paymentMethod === id;
                  return (
                    <label key={id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${active ? 'border-[#a855f7] bg-[#faf5ff] text-[#9333ea]' : 'border-gray-200 bg-white text-gray-600'} cursor-pointer select-none transition-colors`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={id}
                        checked={active}
                        onChange={() => { setPaymentMethod(id); setSplitPayment(false); }}
                        className="w-4 h-4 accent-[#a855f7]"
                      />
                      <span className="flex items-center gap-1.5 text-[14px] font-medium">
                        {icon} {label}
                      </span>
                    </label>
                  );
                })}
                {selectedCategory.value !== "bulk amount transfer" && canSelectStore && (
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${splitPayment ? 'border-[#a855f7] bg-[#faf5ff] text-[#9333ea]' : 'border-gray-200 bg-white text-gray-600'} cursor-pointer select-none transition-colors`}>
                    <input type="checkbox" checked={splitPayment} onChange={() => setSplitPayment(!splitPayment)}
                      className="w-4 h-4 accent-[#a855f7]" />
                    <span className="text-[14px] font-medium">Split Payment (Cash + Bank + UPI)</span>
                  </label>
                )}
              </div>

              {splitPayment && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {[["Cash", cashAmount, setCashAmount], ["Bank", bankAmount, setBankAmount], ["UPI", upiAmount, setUpiAmount]].map(([lbl, val, setVal]) => (
                    <div key={lbl}>
                      <label className="block text-xs text-[#6b7280] mb-1">{lbl} Amount</label>
                      <input type="number" value={val} onChange={e => setVal(e.target.value)} placeholder="0.00"
                        className="w-full rounded-xl border border-[#d9def1] px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a8a]" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remarks + Attachment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-2">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-2">Remarks</label>
                <textarea
                  rows={5}
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  required
                  placeholder="Enter your transaction details here..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-900 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-2">Attachment <span className="text-red-500">*</span></label>
                <SingleImageUpload onImageSelect={setAttachmentFile} existingImage={attachmentFile} required />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center gap-4 pt-4">
              <button type="button" onClick={handleCancel}
                className="px-8 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-[#a855f7] text-white text-[14px] font-medium hover:bg-purple-600 transition-colors disabled:opacity-50">
                {isSubmitting ? "Submitting..." : "Submit Expense"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
