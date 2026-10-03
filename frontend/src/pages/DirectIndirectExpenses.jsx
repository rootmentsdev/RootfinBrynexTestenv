import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import baseUrl from "../api/api";
import { ChevronDown, X, Menu, ArrowLeft } from "lucide-react";
import { useSidebar } from "../hooks/useSidebar.js";
import {
  IMAGE_CONFIG,
  processImageFiles,
  getFilesFromDragEvent,
  triggerFileInput,
} from "../utils/imageUpload";

const DIRECT_EXPENSE_CATS = [
  { value: "material", label: "Material & Fabrics" },
  { value: "dry cleaning", label: "Dry Cleaning" },
  { value: "altration", label: "Alteration & Tailoring" },
  { value: "courier charges", label: "Courier & Inward Freight" },
  { value: "production expenses", label: "Production & Workshop" },
  { value: "direct labour", label: "Labour / Direct Wages" },
  { value: "asset purchase", label: "Asset Purchase (Direct)" },
  { value: "other direct", label: "Other Direct Expense" },
];

const INDIRECT_EXPENSE_CATS = [
  { value: "rent", label: "Store Rent" },
  { value: "salary", label: "Staff Salary & Advance" },
  { value: "utility bill", label: "Electricity Charges" },
  { value: "maintenance expenses", label: "Repairs & Maintenance" },
  { value: "travel exp", label: "Travel & Fuel Exp" },
  { value: "petty expenses", label: "Office & Petty Expenses" },
  { value: "telephone internet", label: "Internet & Phone" },
  { value: "printing stationary", label: "Printing & Stationary" },
  { value: "staff welfare", label: "Staff Welfare" },
  { value: "staff reimbursement", label: "Staff Accommodation" },
  { value: "asset purchase", label: "Asset & Furniture" },
  { value: "water charges", label: "Water Charges" },
  { value: "waste management", label: "Waste Management" },
  { value: "spot incentive", label: "Incentives & Bonus" },
  { value: "other expenses", label: "Refund / Compensation" },
  { value: "bulk amount transfer", label: "Cash to Bank" },
  { value: "other indirect", label: "Other Indirect Expense" },
];

const fallbackLocations = [
  { locName: "Z-Edapally1", locCode: "144" },
  { locName: "Warehouse", locCode: "858" },
  { locName: "G-Edappally", locCode: "702" },
  { locName: "HEAD OFFICE01", locCode: "759" },
  { locName: "SG-Trivandrum", locCode: "700" },
  { locName: "Z- Edappal", locCode: "100" },
  { locName: "Z.Perinthalmanna", locCode: "133" },
  { locName: "Z.Kottakkal", locCode: "122" },
  { locName: "G.Kottayam", locCode: "701" },
  { locName: "G.Perumbavoor", locCode: "703" },
  { locName: "G.Thrissur", locCode: "704" },
  { locName: "G.Chavakkad", locCode: "706" },
  { locName: "G.Calicut ", locCode: "712" },
  { locName: "G.Vadakara", locCode: "708" },
  { locName: "G.Edappal", locCode: "707" },
  { locName: "G.Perinthalmanna", locCode: "709" },
  { locName: "G.Kottakkal", locCode: "711" },
  { locName: "G.Manjeri", locCode: "710" },
  { locName: "G.Palakkad ", locCode: "705" },
  { locName: "G.Kalpetta", locCode: "717" },
  { locName: "G.Kannur", locCode: "716" },
  { locName: "G.Mg Road", locCode: "718" },
  { locName: "Production", locCode: "101" },
  { locName: "Office", locCode: "102" },
  { locName: "WAREHOUSE", locCode: "103" }
];

const DirectIndirectExpenses = ({ initialType = "direct" }) => {
  const isSidebarOpen = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const isIndirectUrl = location.pathname.includes("indirect");
  const [expenseType, setExpenseType] = useState(isIndirectUrl ? "indirect" : initialType);

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

  const defaultStore = canSelectStore ? "" : (currentusers.locCode || "759");

  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState(defaultStore);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  
  // Image Upload States
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const categories = expenseType === "direct" ? DIRECT_EXPENSE_CATS : INDIRECT_EXPENSE_CATS;

  // Reset category when tab switches
  useEffect(() => {
    setCategory("");
  }, [expenseType]);

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = getFilesFromDragEvent(e);
    if (files.length > 0) {
      await handleFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFiles = async (files) => {
    setUploading(true);
    setUploadErrors([]);

    try {
      const remainingSlots = IMAGE_CONFIG.MAX_FILES - images.length;
      if (remainingSlots <= 0) {
        setUploadErrors([`You can only upload up to ${IMAGE_CONFIG.MAX_FILES} images.`]);
        setUploading(false);
        return;
      }

      const filesToProcess = files.slice(0, remainingSlots);
      const { images: processedImages, errors: validationErrors } = await processImageFiles(filesToProcess);

      if (validationErrors.length > 0) {
        setUploadErrors(validationErrors);
      }

      if (processedImages.length > 0) {
        setImages((prev) => [...prev, ...processedImages]);
      }
    } catch (error) {
      setUploadErrors(["Error processing images. Please try again."]);
      console.error("Image upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setStatusMessage(null);

    if (!category) {
      setStatusMessage({ type: "error", text: "Please select a Category." });
      return;
    }

    const targetBranch = canSelectStore ? branch : (currentusers.locCode || "759");
    if (!targetBranch) {
      setStatusMessage({ type: "error", text: "Please select a Branch." });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatusMessage({ type: "error", text: "Please enter a valid Amount." });
      return;
    }

    if (images.length === 0) {
      setStatusMessage({ type: "error", text: "Please upload at least one Attachment." });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      type: "Expense",
      expenseType: expenseType, // "direct" | "indirect"
      category: category,
      remark: remarks.trim() ? `[${expenseType.toUpperCase()}] ${remarks.trim()}` : `[${expenseType.toUpperCase()}] ${category}`,
      locCode: targetBranch,
      isAdminLevel: canSelectStore,
      amount: `-${amount}`,
      cash: `-${amount}`,
      bank: "0",
      upi: "0",
      paymentMethod: "cash",
      date: new Date().toISOString().split("T")[0],
      attachment: images[0]?.base64 || null,
      attachments: images.map(img => img.base64),
    };

    try {
      const res = await fetch(`${baseUrl.baseUrl}user/createPayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: json?.message || "Failed to save expense." });
      } else {
        setStatusMessage({
          type: "success",
          text: `${expenseType === "direct" ? "Direct" : "Indirect"} Expense saved successfully!`,
        });
        handleCancel();
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Network error: Failed to save expense." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCategory("");
    if (canSelectStore) setBranch("");
    setAmount("");
    setRemarks("");
    setImages([]);
    setUploadErrors([]);
    navigate("/record-expense");
  };

  return (
    <div className={`min-h-screen bg-[#FAFAFB] transition-all duration-300 ${isSidebarOpen ? "md:ml-64 ml-0" : "ml-0"}`}>
      <div className="w-full px-6 sm:px-10 py-8">
        
        {/* Top Header: Sidebar Menu Toggle, Back Button & Direct / Indirect Expense Pill Switch */}
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-sidebar'))}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-xs cursor-pointer transition-colors"
            title="Toggle Sidebar Menu"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/record-expense")}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-xs cursor-pointer transition-colors"
            title="Back to Expense List"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="inline-flex bg-[#EBECEF] p-1 rounded-full border border-gray-200/60 shadow-xs">
            <button
              type="button"
              onClick={() => setExpenseType("direct")}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
                expenseType === "direct"
                  ? "bg-white text-gray-800 shadow-sm font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Direct Expense
            </button>
            <button
              type="button"
              onClick={() => setExpenseType("indirect")}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
                expenseType === "indirect"
                  ? "bg-white text-gray-800 shadow-sm font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Indirect Expense
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm font-medium border shadow-xs transition-all ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs uppercase font-bold text-gray-500 hover:text-gray-800 cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form Container (Left-aligned) */}
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
          
          {/* Row 1: Category, Branch, Amount (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Category */}
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm transition-all focus:outline-none focus:border-purple-500 pr-10 cursor-pointer ${
                    category ? "text-gray-800 font-medium" : "text-gray-400"
                  }`}
                >
                  <option value="" disabled className="text-gray-400">
                    Select Category
                  </option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value} className="text-gray-800">
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Branch <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {canSelectStore ? (
                  <>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className={`w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm transition-all focus:outline-none focus:border-purple-500 pr-10 cursor-pointer ${
                        branch ? "text-gray-800 font-medium" : "text-gray-400"
                      }`}
                    >
                      <option value="" disabled className="text-gray-400">
                        Select Branch
                      </option>
                      {fallbackLocations.map((loc) => (
                        <option key={loc.locCode} value={loc.locCode} className="text-gray-800">
                          {loc.locName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </>
                ) : (
                  <>
                    <select
                      disabled
                      value={currentusers.locCode || "759"}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-700 cursor-not-allowed pr-10"
                    >
                      <option value={currentusers.locCode || "759"}>
                        {fallbackLocations.find(l => l.locCode === (currentusers.locCode || "759"))?.locName || `Branch #${currentusers.locCode}`}
                      </option>
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="Enter the amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all font-medium"
              />
            </div>

          </div>

          {/* Row 2: Attachment (Left) and Remarks (Right) (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Attachment */}
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Attachment <span className="text-red-500">*</span>
              </label>

              {/* Upload Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border border-dashed rounded-2xl p-8 bg-white flex flex-col items-center justify-center text-center min-h-[200px] transition-colors ${
                  dragActive
                    ? "border-purple-500 bg-purple-50/20"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">
                  Drag image (s) here or browse images
                </p>
                <p className="mt-1 text-xs text-gray-400 max-w-xs leading-relaxed">
                  You can add up to 15 images, each not exceeding 5MB in size and 7000x7000 pixels resolution.
                </p>

                <button
                  type="button"
                  onClick={() => triggerFileInput(fileInputRef)}
                  disabled={uploading}
                  className="mt-4 rounded-lg bg-[#272B30] hover:bg-black text-white px-7 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />
              </div>

              {/* Error messages if any */}
              {uploadErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadErrors.map((err, idx) => (
                    <p key={idx} className="text-xs text-red-500 font-medium">
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Uploaded Images Thumbnails */}
              {images.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-gray-500">
                    Uploaded Images ({images.length}/{IMAGE_CONFIG.MAX_FILES})
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square shadow-2xs"
                      >
                        <img
                          src={img.base64 || img}
                          alt={img.name || `Upload ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                placeholder="Enter remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-[200px] rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all resize-none"
              />
            </div>

          </div>

          {/* Row 3: Action Buttons (Bottom Left) */}
          <div className="flex items-center gap-3 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#9B48D7] hover:bg-[#8B38C7] text-white px-7 py-2.5 text-sm font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-gray-700 px-7 py-2.5 text-sm font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default DirectIndirectExpenses;
