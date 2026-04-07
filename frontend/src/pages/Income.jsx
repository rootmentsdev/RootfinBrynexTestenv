import { useState } from 'react';
import SingleImageUpload from "../components/SingleImageUpload";
import baseUrl from "../api/api";
import { BsBank2 } from "react-icons/bs";
import { MdCurrencyRupee } from "react-icons/md";
import { ChevronDown } from "lucide-react";

const baseIncomeCats = [
  { value: "compensation from cancellation", label: "Compensation from Cancellation" },
  { value: "compensation from product damage", label: "Compensation from Product Damage" },
  { value: "bank to cash",                   label: "Cash to Branch (*Bank to Cash)" },
];

const Income = () => {
  const currentusers = JSON.parse(localStorage.getItem("rootfinuser")) || {};
  const isAdmin = (currentusers.power || "").toLowerCase() === "admin";
  const cats = isAdmin ? baseIncomeCats : baseIncomeCats.filter(c => c.value !== "bank to cash");

  const [selectedCategory, setSelectedCategory] = useState(cats[0]);
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [remark, setRemark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const data = {
      type: "income",
      category: selectedCategory.value,
      remark,
      locCode: currentusers.locCode,
      amount,
      cash: splitPayment ? (cashAmount || "0") : paymentMethod === "cash" ? amount : "0",
      bank: splitPayment ? (bankAmount || "0") : paymentMethod === "bank" ? amount : "0",
      upi:  splitPayment ? (upiAmount  || "0") : paymentMethod === "upi"  ? amount : "0",
      paymentMethod: splitPayment ? "split" : paymentMethod,
      quantity: selectedCategory.value === "shoe sales" ? quantity : "",
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
        alert("Income recorded successfully!");
        setAmount(""); setCashAmount(""); setBankAmount(""); setUpiAmount("");
        setRemark(""); setQuantity(""); setAttachmentFile(null);
      }
    } catch { alert("Failed to create transaction."); }
    finally { setIsSubmitting(false); }
  };

  const handleCancel = () => {
    setAmount(""); setRemark(""); setAttachmentFile(null);
    setQuantity(""); setCashAmount(""); setBankAmount(""); setUpiAmount("");
    setPaymentMethod("cash"); setSplitPayment(false);
    setSelectedCategory(cats[0]);
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] ml-64">
      <div className="px-10 pt-8 pb-16">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-[#101828] tracking-wide uppercase">Income</h1>
          <p className="text-sm text-[#6c728a]">Record & Track your business transactions</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-sm border border-[#e6ebfa] p-8">
          <form onSubmit={handleSubmit}>

            {/* Row 1: Category + Amount */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-2">Category</label>
                <div className="relative">
                  <select
                    value={selectedCategory.value}
                    onChange={e => setSelectedCategory(cats.find(c => c.value === e.target.value))}
                    className="w-full appearance-none rounded-xl border border-[#d9def1] bg-white px-5 py-4 text-base text-[#101828] focus:outline-none focus:border-[#1e3a8a] pr-10"
                  >
                    {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9ca3af] text-base">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full rounded-xl border border-[#d9def1] bg-white pl-10 pr-5 py-4 text-base text-[#101828] focus:outline-none focus:border-[#1e3a8a]"
                  />
                </div>
              </div>
              {selectedCategory.value === "shoe sales" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-2">Quantity</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                    placeholder="Enter quantity" required
                    className="w-full rounded-xl border border-[#d9def1] px-5 py-4 text-base focus:outline-none focus:border-[#1e3a8a]" />
                </div>
              )}
            </div>

            <hr className="border-[#e6ebfa] my-6" />

            {/* Way of Payment */}
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-4">Way of Payment</label>
              <div className="flex flex-wrap items-center gap-6">
                {[
                  { id: "cash", label: "Cash", icon: <MdCurrencyRupee size={20} /> },
                  { id: "bank", label: "Bank", icon: <BsBank2 size={18} /> },
                  { id: "upi",  label: "UPI",  icon: <span className="font-black italic text-sm">UPI</span> },
                ].map(({ id, label, icon }) => {
                  const active = !splitPayment && paymentMethod === id;
                  return (
                    <label key={id} className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={id}
                        checked={active}
                        onChange={() => { setPaymentMethod(id); setSplitPayment(false); }}
                        className="w-5 h-5 accent-[#1e3a8a]"
                      />
                      <span className="flex items-center gap-1.5 text-base font-medium text-[#374151]">
                        {icon} {label}
                      </span>
                    </label>
                  );
                })}
                <label className="flex items-center gap-2.5 text-base font-medium text-[#374151] cursor-pointer ml-2">
                  <input type="checkbox" checked={splitPayment} onChange={() => setSplitPayment(!splitPayment)}
                    className="w-5 h-5 accent-[#1e3a8a]" />
                  Split Payment (Cash + Bank + UPI)
                </label>
              </div>

              {splitPayment && (
                <div className="grid grid-cols-3 gap-4 mt-4">
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
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-2">Remarks</label>
                <textarea
                  rows={6}
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  required
                  placeholder="Enter your transactions details here...."
                  className="w-full rounded-xl border border-[#d9def1] px-5 py-4 text-sm text-[#101828] focus:outline-none focus:border-[#1e3a8a] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-2">Attachment (Optional)</label>
                <SingleImageUpload onImageSelect={setAttachmentFile} existingImage={attachmentFile} />
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-6">
              <button type="button" onClick={handleCancel}
                className="w-full py-4 rounded-xl border-2 border-[#d9def1] text-sm font-bold uppercase text-[#374151] hover:bg-[#f9fafb] tracking-widest">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold uppercase hover:bg-[#1e40af] disabled:opacity-50 tracking-widest">
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Income;
