import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Head from "../components/Head";
import { X, Mail, Phone, MapPin, Building2, FileText, CreditCard, MessageSquare, FileSpreadsheet, Mail as MailIcon } from "lucide-react";
import baseUrl from "../api/api";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const PurchaseVendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billStatusFilter, setBillStatusFilter] = useState("All");
  const [vendorHistory, setVendorHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

        // First, try to fetch from API
        let foundVendor = null;

        try {
          const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`);
          if (response.ok) {
            foundVendor = await response.json();
          }
        } catch (apiError) {
          console.warn("API fetch failed, trying localStorage:", apiError);
        }

        // If not found in API, try localStorage
        if (!foundVendor) {
          const vendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          foundVendor = vendors.find((v) =>
            v.id === id ||
            v._id === id ||
            (v.id && String(v.id) === String(id)) ||
            (v._id && String(v._id) === String(id))
          );
        }

        if (foundVendor) {
          // Ensure vendor has an id field
          const vendorWithId = {
            ...foundVendor,
            id: foundVendor.id || foundVendor._id || id,
          };
          setVendor(vendorWithId);
          // Load comments for this vendor
          const vendorComments = JSON.parse(localStorage.getItem(`vendor_comments_${id}`) || "[]");
          setComments(vendorComments);
        } else {
          // If not found, redirect to vendors list
          navigate("/purchase/vendors");
        }
      } catch (error) {
        console.error("Error fetching vendor:", error);
        navigate("/purchase/vendors");
      }
    };

    fetchVendor();
  }, [id, navigate]);

  // Fetch vendor history
  useEffect(() => {
    const fetchVendorHistory = async () => {
      const vendorId = vendor?.id || vendor?._id || id;
      if (!vendorId) return;

      setLoadingHistory(true);
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
        const response = await fetch(`${API_URL}/api/purchase/vendors/${vendorId}/history?limit=50`);

        if (response.ok) {
          const history = await response.json();
          console.log("Vendor history fetched:", history);
          setVendorHistory(Array.isArray(history) ? history : []);
        } else {
          console.warn("Failed to fetch vendor history:", response.status);
          setVendorHistory([]);
        }
      } catch (error) {
        console.error("Error fetching vendor history:", error);
        setVendorHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (vendor) {
      fetchVendorHistory();
    }
  }, [vendor, id]);

  // Fetch bills for this vendor when Transactions tab is active
  useEffect(() => {
    if (activeTab === "Transactions" && vendor) {
      const fetchBills = async () => {
        setLoadingBills(true);
        try {
          const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
          const userStr = localStorage.getItem("rootfinuser");
          const user = userStr ? JSON.parse(userStr) : null;
          const userId = user?.email || null;
          const userPower = user?.power || "";

          if (!userId) {
            setBills([]);
            setLoadingBills(false);
            return;
          }

          // Fetch all bills and filter by vendor
          const response = await fetch(`${API_URL}/api/purchase/bills?userId=${encodeURIComponent(userId)}${userPower ? `&userPower=${encodeURIComponent(userPower)}` : ""}`);
          if (response.ok) {
            const allBills = await response.json();
            // Filter bills by vendorId or vendorName
            const vendorId = vendor.id || vendor._id || id;
            const vendorName = vendor.displayName || vendor.companyName || vendor.firstName + " " + vendor.lastName;

            const vendorBills = Array.isArray(allBills) ? allBills.filter(bill => {
              const billVendorId = bill.vendorId?.toString() || bill.vendorId;
              const billVendorName = bill.vendorName || "";
              return (
                billVendorId === vendorId?.toString() ||
                billVendorId === id ||
                billVendorName === vendorName
              );
            }) : [];

            setBills(vendorBills);
          }
        } catch (error) {
          console.error("Error fetching bills:", error);
          setBills([]);
        } finally {
          setLoadingBills(false);
        }
      };

      fetchBills();
    }
  }, [activeTab, vendor, id]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    const newComment = {
      id: `comment_${Date.now()}`,
      text: commentText,
      createdAt: new Date().toISOString(),
      createdBy: JSON.parse(localStorage.getItem("rootfinuser") || "{}")?.name || "User",
    };

    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    localStorage.setItem(`vendor_comments_${id}`, JSON.stringify(updatedComments));
    setCommentText("");
  };

  const applyFormatting = (format) => {
    const textarea = document.getElementById("comment-textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = commentText.substring(start, end);

    let formattedText = "";
    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `__${selectedText}__`;
        break;
      default:
        formattedText = selectedText;
    }

    const newText = commentText.substring(0, start) + formattedText + commentText.substring(end);
    setCommentText(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && !event.target.closest('.relative')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  if (!vendor) {
    return (
      <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  const tabs = ["Overview", "Comments", "Transactions", "Mails", "Statement"];

  return (
    <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
      <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)]">
        {/* Header */}
        <div className="border-b border-[#e7ebf8] px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-[#1f2937]">{vendor.displayName || vendor.companyName || vendor.firstName + " " + vendor.lastName}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/purchase/vendors/${id}/edit`)}
                className="rounded-md border border-[#d7dcf5] px-4 py-2 text-base font-medium text-[#475569] transition hover:bg-[#f8f9ff]"
              >
                Edit
              </button>
              <div className="rounded-md border border-[#d7dcf5] px-3 py-2 text-base font-medium text-[#475569]">
                9
              </div>
              <button
                onClick={() => {
                  // Navigate to new bill page with vendor pre-selected
                  navigate(`/purchase/bills/new?vendorId=${id}&vendorName=${encodeURIComponent(vendor.displayName || vendor.companyName || '')}`);
                }}
                className="rounded-md bg-[#3762f9] px-4 py-2 text-base font-semibold text-white transition hover:bg-[#2748c9]"
              >
                New Transaction
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="rounded-md border border-[#d7dcf5] px-4 py-2 text-base font-medium text-[#475569] transition hover:bg-[#f8f9ff]"
                >
                  More
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-[#d7dcf5] bg-white shadow-lg z-50">
                    <button
                      onClick={async () => {
                        setShowMoreMenu(false);
                        if (confirm(`Are you sure you want to mark "${vendor.displayName || vendor.companyName}" as inactive?`)) {
                          try {
                            const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
                            const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                ...vendor,
                                isActive: false,
                                status: 'inactive'
                              }),
                            });

                            if (response.ok) {
                              // Update localStorage if it exists
                              try {
                                const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
                                const updatedVendorsList = savedVendors.map(v => {
                                  if (v.id === id || v._id === id || (v.id && String(v.id) === String(id)) || (v._id && String(v._id) === String(id))) {
                                    return { ...v, isActive: false, status: 'inactive' };
                                  }
                                  return v;
                                });
                                localStorage.setItem("vendors", JSON.stringify(updatedVendorsList));
                                // Also update current vendor in localStorage if stored individually
                                localStorage.setItem(`vendor_${id}`, JSON.stringify({ ...vendor, isActive: false, status: 'inactive' }));
                              } catch (localErr) {
                                console.warn("Failed to update localStorage:", localErr);
                              }

                              alert('Vendor marked as inactive successfully!');
                              navigate('/purchase/vendors');
                            } else {
                              throw new Error('Failed to update vendor');
                            }
                          } catch (error) {
                            console.error('Error marking vendor as inactive:', error);
                            alert('Failed to mark vendor as inactive. Please try again.');
                          }
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#475569] hover:bg-[#f8f9ff] transition"
                    >
                      Mark as Inactive
                    </button>
                    <button
                      onClick={async () => {
                        setShowMoreMenu(false);
                        const vendorName = vendor.displayName || vendor.companyName || "this vendor";
                        if (confirm(`Are you sure you want to delete "${vendorName}"? This action cannot be undone.`)) {
                          try {
                            const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
                            const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`, {
                              method: 'DELETE',
                            });

                            if (response.ok) {
                              // Update localStorage if it exists
                              try {
                                const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
                                const updatedVendorsList = savedVendors.filter(v =>
                                  !(v.id === id || v._id === id || (v.id && String(v.id) === String(id)) || (v._id && String(v._id) === String(id)))
                                );
                                localStorage.setItem("vendors", JSON.stringify(updatedVendorsList));
                                localStorage.removeItem(`vendor_${id}`);
                                localStorage.removeItem(`vendor_comments_${id}`);
                              } catch (localErr) {
                                console.warn("Failed to update localStorage after deletion:", localErr);
                              }

                              alert('Vendor deleted successfully!');
                              navigate('/purchase/vendors');
                            } else {
                              const errorData = await response.json();
                              throw new Error(errorData.message || 'Failed to delete vendor');
                            }
                          } catch (error) {
                            console.error('Error deleting vendor:', error);
                            alert(`Failed to delete vendor: ${error.message}`);
                          }
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#ef4444] hover:bg-[#fef2f2] transition"
                    >
                      Delete Vendor
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        window.print();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#475569] hover:bg-[#f8f9ff] transition"
                    >
                      Print / Save as PDF
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);

                        // Prepare CSV Headers
                        const headers = [
                          "Display Name", "Company Name", "Salutation", "First Name", "Last Name",
                          "Email", "Phone", "Mobile", "Language",
                          "GST Treatment", "GSTIN", "PAN", "Source of Supply", "Currency", "Payment Terms", "TDS",
                          "Portal Enabled", "Receivables/Payables", "Unused Credits", "Items to Receive", "Total Items Ordered",
                          "Billing Attention", "Billing Address", "Billing Address 2", "Billing City", "Billing State", "Billing Pin Code", "Billing Country", "Billing Phone", "Billing Fax",
                          "Shipping Attention", "Shipping Address", "Shipping Address 2", "Shipping City", "Shipping State", "Shipping Pin Code", "Shipping Country", "Shipping Phone", "Shipping Fax",
                          "Contact Persons", "Bank Accounts", "Remarks"
                        ];

                        // Format complex fields
                        const contactsStr = (vendor.contacts || []).map(c =>
                          `${c.salutation || ""} ${c.firstName || ""} ${c.lastName || ""} (${c.email || ""}, ${c.mobile || ""})`
                        ).join(" | ");

                        const bankStr = (vendor.bankAccounts || []).map(b =>
                          `${b.bankName || ""}: ${b.accountNumber || ""} (${b.ifsc || ""})`
                        ).join(" | ");

                        const row = [
                          vendor.displayName || "",
                          vendor.companyName || "",
                          vendor.salutation || "",
                          vendor.firstName || "",
                          vendor.lastName || "",
                          vendor.email || "",
                          vendor.phone || "",
                          vendor.mobile || "",
                          vendor.vendorLanguage || "",
                          vendor.gstTreatment || "",
                          vendor.gstin || "",
                          vendor.pan || "",
                          vendor.sourceOfSupply || "",
                          vendor.currency || "INR",
                          vendor.paymentTerms || "",
                          vendor.tds || "",
                          vendor.enablePortal ? "Yes" : "No",
                          vendor.payables || 0,
                          vendor.credits || 0,
                          vendor.itemsToReceive || 0,
                          vendor.totalItemsOrdered || 0,
                          vendor.billingAttention || "",
                          (vendor.billingAddress || "").replace(/,/g, " "),
                          (vendor.billingAddress2 || "").replace(/,/g, " "),
                          vendor.billingCity || "",
                          vendor.billingState || "",
                          vendor.billingPinCode || "",
                          vendor.billingCountry || "",
                          vendor.billingPhone || "",
                          vendor.billingFax || "",
                          vendor.shippingAttention || "",
                          (vendor.shippingAddress || "").replace(/,/g, " "),
                          (vendor.shippingAddress2 || "").replace(/,/g, " "),
                          vendor.shippingCity || "",
                          vendor.shippingState || "",
                          vendor.shippingPinCode || "",
                          vendor.shippingCountry || "",
                          vendor.shippingPhone || "",
                          vendor.shippingFax || "",
                          contactsStr,
                          bankStr,
                          (vendor.remarks || "").replace(/\n/g, " ")
                        ];

                        // Create CSV Content
                        const csvContent = [
                          headers.map(h => `"${h}"`).join(","),
                          row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")
                        ].join("\n");

                        // Download Trigger
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement("a");
                        const url = URL.createObjectURL(blob);
                        const fileName = `${(vendor.displayName || "vendor").replace(/\s+/g, "_")}_full_details.csv`;

                        link.setAttribute("href", url);
                        link.setAttribute("download", fileName);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#475569] hover:bg-[#f8f9ff] transition"
                    >
                      Export Details
                    </button>
                  </div>
                )}
              </div>
              <Link
                to="/purchase/vendors"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#64748b] hover:bg-[#f8f9ff]"
              >
                <X size={20} />
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-6 border-b border-[#e7ebf8]">
            {tabs.map((tab) => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-base font-medium cursor-pointer transition ${activeTab === tab
                  ? "border-b-2 border-[#2563eb] text-[#2563eb]"
                  : "text-[#64748b] hover:text-[#1f2937]"
                  }`}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === "Overview" && (
          <div className="px-8 py-6">
            <div className="grid gap-8 md:grid-cols-[1fr_400px]">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-[#e0e7ff] flex items-center justify-center">
                      <Building2 size={24} className="text-[#6366f1]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1f2937]">{vendor.displayName || vendor.companyName || vendor.firstName + " " + vendor.lastName}</h3>
                  </div>
                  <div className="space-y-2 text-base text-[#475569]">
                    {vendor.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-[#94a3b8]" />
                        <span>{vendor.email}</span>
                      </div>
                    )}
                    {(vendor.phone || vendor.mobile) && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-[#94a3b8]" />
                        <span>{vendor.phone || vendor.mobile}</span>
                        {vendor.phone && vendor.mobile && vendor.phone !== vendor.mobile && (
                          <span className="text-[#94a3b8]">, {vendor.mobile}</span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-4 mt-3">
                      <span
                        onClick={() => {
                          alert(`Invite to Portal feature:\n\nAn invitation email will be sent to ${vendor.email || 'the vendor'} to access the vendor portal.`);
                        }}
                        className="text-sm font-medium text-[#2563eb] hover:underline cursor-pointer"
                      >
                        Invite to Portal
                      </span>
                      <span
                        onClick={() => {
                          if (vendor.email) {
                            window.location.href = `mailto:${vendor.email}?subject=Regarding ${vendor.displayName || 'Your Account'}`;
                          } else {
                            alert('No email address found for this vendor.');
                          }
                        }}
                        className="text-sm font-medium text-[#2563eb] hover:underline cursor-pointer"
                      >
                        Send Email
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="text-base font-semibold text-[#1f2937] mb-3">ADDRESS</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-[#64748b] mb-2">Billing Address</p>
                      <div className="text-base text-[#475569] space-y-1">
                        {vendor.billingAddress ? (
                          <>
                            <p>{vendor.billingAddress}</p>
                            {vendor.billingCity && <p>{vendor.billingCity}</p>}
                            {vendor.billingState && <p>{vendor.billingState}</p>}
                            {vendor.billingPinCode && <p>{vendor.billingPinCode}</p>}
                            {vendor.billingCountry && <p>{vendor.billingCountry}</p>}
                            {vendor.billingPhone && <p className="mt-2">Phone: {vendor.billingPhone}</p>}
                          </>
                        ) : (
                          <p className="text-[#94a3b8]">No billing address</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#64748b] mb-2">Shipping Address</p>
                      <div className="text-base text-[#475569]">
                        {vendor.shippingAddress ? (
                          <>
                            <p>{vendor.shippingAddress}</p>
                            {vendor.shippingCity && <p>{vendor.shippingCity}</p>}
                            {vendor.shippingState && <p>{vendor.shippingState}</p>}
                            {vendor.shippingPinCode && <p>{vendor.shippingPinCode}</p>}
                            {vendor.shippingCountry && <p>{vendor.shippingCountry}</p>}
                            {vendor.shippingPhone && <p className="mt-2">Phone: {vendor.shippingPhone}</p>}
                          </>
                        ) : (
                          <>
                            <p className="text-[#94a3b8] mb-2">No Shipping Address</p>
                            <button
                              onClick={() => navigate(`/purchase/vendors/${id}/edit?section=shipping`)}
                              className="text-sm font-medium text-[#2563eb] hover:underline"
                            >
                              New Address
                            </button>
                            <span className="mx-2 text-[#94a3b8]">|</span>
                            <button
                              onClick={() => navigate(`/purchase/vendors/${id}/edit?section=shipping`)}
                              className="text-sm font-medium text-[#2563eb] hover:underline"
                            >
                              Add additional address
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other Details */}
                <div>
                  <h4 className="text-base font-semibold text-[#1f2937] mb-3">OTHER DETAILS</h4>
                  <div className="space-y-3 text-base">
                    {vendor.currency && (
                      <div>
                        <span className="text-[#64748b]">Default Currency: </span>
                        <span className="text-[#1f2937]">{vendor.currency}</span>
                      </div>
                    )}
                    {vendor.gstTreatment && (
                      <div>
                        <span className="text-[#64748b]">GST Treatment: </span>
                        <span className="text-[#1f2937]">{vendor.gstTreatment}</span>
                      </div>
                    )}
                    {vendor.gstin && (
                      <div>
                        <span className="text-[#64748b]">GSTIN: </span>
                        <span className="text-[#1f2937]">{vendor.gstin}</span>
                      </div>
                    )}
                    {vendor.sourceOfSupply && (
                      <div>
                        <span className="text-[#64748b]">Source of Supply: </span>
                        <span className="text-[#1f2937]">{vendor.sourceOfSupply}</span>
                      </div>
                    )}
                    {vendor.pan && (
                      <div>
                        <span className="text-[#64748b]">PAN: </span>
                        <span className="text-[#1f2937]">{vendor.pan}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[#64748b]">Portal Status: </span>
                      <span className="text-[#ef4444]">Disabled</span>
                    </div>
                    {vendor.vendorLanguage && (
                      <div>
                        <span className="text-[#64748b]">Vendor Language: </span>
                        <span className="text-[#1f2937]">{vendor.vendorLanguage}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax Information */}
                {vendor.gstin && (
                  <div>
                    <h4 className="text-base font-semibold text-[#1f2937] mb-3">TAX INFORMATION</h4>
                    <div className="space-y-2 text-base">
                      <div>
                        <span className="text-[#64748b]">GSTIN/UIN: </span>
                        <span className="text-[#1f2937]">{vendor.gstin} (Primary)</span>
                      </div>
                      {vendor.sourceOfSupply && (
                        <div>
                          <span className="text-[#64748b]">Source of Supply: </span>
                          <span className="text-[#1f2937]">{vendor.sourceOfSupply}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Persons */}
                <div>
                  <h4 className="text-base font-semibold text-[#1f2937] mb-3">CONTACT PERSONS</h4>
                  {vendor.contacts && vendor.contacts.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-[#e6eafb]">
                      <table className="min-w-full divide-y divide-[#e6eafb]">
                        <thead className="bg-[#f5f6ff]">
                          <tr className="text-left text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                            <th className="px-4 py-2">Salutation</th>
                            <th className="px-4 py-2">First Name</th>
                            <th className="px-4 py-2">Last Name</th>
                            <th className="px-4 py-2">Email Address</th>
                            <th className="px-4 py-2">Work Phone</th>
                            <th className="px-4 py-2">Mobile</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef2ff] text-base">
                          {vendor.contacts.map((contact, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2">{contact.salutation || "-"}</td>
                              <td className="px-4 py-2">{contact.firstName || "-"}</td>
                              <td className="px-4 py-2">{contact.lastName || "-"}</td>
                              <td className="px-4 py-2">{contact.email || "-"}</td>
                              <td className="px-4 py-2">{contact.workPhone || "-"}</td>
                              <td className="px-4 py-2">{contact.mobile || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-base text-[#64748b] mb-3">No contact persons added</div>
                  )}
                  <button
                    onClick={() => navigate(`/purchase/vendors/${id}/edit?section=contacts`)}
                    className="text-base font-medium text-[#2563eb] hover:underline"
                  >
                    + Add Contact Person
                  </button>
                </div>

                {/* Bank Account Details */}
                <div>
                  <h4 className="text-base font-semibold text-[#1f2937] mb-3">BANK ACCOUNT DETAILS</h4>
                  {vendor.bankAccounts && vendor.bankAccounts.length > 0 ? (
                    <div className="space-y-4">
                      {vendor.bankAccounts.map((bank, idx) => (
                        <div key={idx} className="border border-[#e6eafb] rounded-lg p-4">
                          <div className="space-y-2 text-base">
                            <div>
                              <span className="text-[#64748b]">Account Holder Name: </span>
                              <span className="text-[#1f2937]">{bank.accountHolderName}</span>
                            </div>
                            <div>
                              <span className="text-[#64748b]">Bank Name: </span>
                              <span className="text-[#1f2937]">{bank.bankName}</span>
                            </div>
                            <div>
                              <span className="text-[#64748b]">Account Number: </span>
                              <span className="text-[#1f2937]">{bank.accountNumber}</span>
                            </div>
                            {bank.ifsc && (
                              <div>
                                <span className="text-[#64748b]">IFSC: </span>
                                <span className="text-[#1f2937]">{bank.ifsc}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-base text-[#64748b] mb-3">No bank account added yet</div>
                  )}
                  <button
                    onClick={() => navigate(`/purchase/vendors/${id}/edit?section=bank`)}
                    className="text-base font-medium text-[#2563eb] hover:underline"
                  >
                    + Add New Bank
                  </button>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="text-sm text-[#64748b]">
                  You can request your contact to directly update the GSTIN by sending an email.{" "}
                  <button
                    onClick={() => {
                      if (vendor.email) {
                        window.location.href = `mailto:${vendor.email}?subject=GSTIN Update Request&body=Dear ${vendor.displayName || 'Vendor'},%0D%0A%0D%0APlease update your GSTIN information.%0D%0A%0D%0AThank you.`;
                      } else {
                        alert('No email address found for this vendor.');
                      }
                    }}
                    className="text-[#2563eb] hover:underline"
                  >
                    Send email
                  </button>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-[#1f2937] mb-3">Payment Due Period</h4>
                  <p className="text-base text-[#475569]">{vendor.paymentTerms || "Due On Receipt"}</p>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-[#1f2937] mb-3">Payables</h4>
                  <div className="overflow-x-auto rounded-xl border border-[#e6eafb]">
                    <table className="min-w-full divide-y divide-[#e6eafb]">
                      <thead className="bg-[#f5f6ff]">
                        <tr className="text-left text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                          <th className="px-4 py-2">CURRENCY</th>
                          <th className="px-4 py-2 text-right">OUTSTANDING PAYABLES</th>
                          <th className="px-4 py-2 text-right">UNUSED CREDITS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef2ff] text-base">
                        <tr>
                          <td className="px-4 py-2">{vendor.currency || "INR"} Indian Rupee</td>
                          <td className="px-4 py-2 text-right font-semibold">{currency(vendor.payables || 0)}</td>
                          <td className="px-4 py-2 text-right">{currency(vendor.credits || 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-sm text-[#64748b]">
                    <p>Items to be received: {vendor.itemsToReceive || 0}</p>
                    <p>Total items ordered: {vendor.totalItemsOrdered || 0}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-[#1f2937] mb-4">Activity</h4>
                  <div className="relative">
                    {loadingHistory ? (
                      <div className="text-sm text-[#64748b] py-4">Loading activity...</div>
                    ) : vendorHistory.length > 0 ? (
                      <div className="relative">
                        {/* Vertical timeline line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#2563eb]"></div>

                        {/* Activity items */}
                        <div className="space-y-0">
                          {vendorHistory.map((activity, idx) => {
                            const formatDate = (dateString) => {
                              if (!dateString) return "";
                              const date = new Date(dateString);
                              const day = String(date.getDate()).padStart(2, "0");
                              const month = String(date.getMonth() + 1).padStart(2, "0");
                              const year = date.getFullYear();
                              return `${day}/${month}/${year}`;
                            };

                            const formatTime = (dateString) => {
                              if (!dateString) return "";
                              const date = new Date(dateString);
                              const hours = date.getHours();
                              const minutes = String(date.getMinutes()).padStart(2, "0");
                              const ampm = hours >= 12 ? "PM" : "AM";
                              const displayHours = hours % 12 || 12;
                              return `${displayHours}:${minutes} ${ampm}`;
                            };

                            const formatDateTime = (dateString) => {
                              return `${formatDate(dateString)} ${formatTime(dateString)}`;
                            };

                            const currentDate = formatDate(activity.changedAt);
                            const prevDate = idx > 0 ? formatDate(vendorHistory[idx - 1].changedAt) : null;
                            const showDate = currentDate !== prevDate;

                            return (
                              <div key={activity.id || activity._id || idx} className="relative flex gap-4 mb-4">
                                {/* Date/Time column on the left */}
                                <div className="flex-shrink-0 w-32 pt-1">
                                  <div className="relative">
                                    {/* Timeline circle */}
                                    <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-white border-2 border-[#2563eb] z-10"></div>
                                    {/* Date and time */}
                                    <div className="ml-8 text-right">
                                      {showDate && (
                                        <div className="text-sm font-medium text-[#64748b]">
                                          {formatDate(activity.changedAt)}
                                        </div>
                                      )}
                                      <div className="text-sm font-medium text-[#64748b]">
                                        {formatTime(activity.changedAt)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Event card on the right */}
                                <div className="flex-1 pb-4 min-w-0">
                                  <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Title */}
                                    <h5 className="text-base font-semibold text-[#1f2937] mb-1">
                                      {activity.title}
                                    </h5>

                                    {/* Description */}
                                    <p className="text-sm text-[#64748b] mb-2">
                                      {activity.description || ""}
                                      {activity.relatedEntityType === "bill" && activity.relatedEntityId && (
                                        <span>
                                          {" - "}
                                          <button
                                            onClick={() => navigate(`/purchase/bills/${activity.relatedEntityId}`)}
                                            className="text-sm font-medium text-[#2563eb] hover:underline"
                                          >
                                            View Details
                                          </button>
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-[#64748b] py-4">No recent activity</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Comments" && (
          <div className="px-8 py-6">
            {/* Comment Input Section */}
            <div className="mb-8">
              {/* Formatting Buttons */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => applyFormatting("bold")}
                  className="px-3 py-1.5 rounded border border-[#d7dcf5] bg-white text-sm font-bold text-[#1f2937] hover:bg-[#f8f9ff] transition"
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => applyFormatting("italic")}
                  className="px-3 py-1.5 rounded border border-[#d7dcf5] bg-white text-sm italic text-[#1f2937] hover:bg-[#f8f9ff] transition"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => applyFormatting("underline")}
                  className="px-3 py-1.5 rounded border border-[#d7dcf5] bg-white text-sm underline text-[#1f2937] hover:bg-[#f8f9ff] transition"
                  title="Underline"
                >
                  U
                </button>
              </div>

              {/* Text Area */}
              <textarea
                id="comment-textarea"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full min-h-[120px] rounded-lg border border-[#d7dcf5] px-3 py-2.5 text-base text-[#1f2937] focus:border-[#4285f4] focus:outline-none resize-y"
              />

              {/* Add Comment Button */}
              <div className="mt-3">
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 rounded-md bg-[#e5e7eb] text-base font-medium text-[#6b7280] hover:bg-[#d1d5db] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Comment
                </button>
              </div>
            </div>

            {/* All Comments Section */}
            <div>
              <h3 className="text-base font-semibold text-[#1f2937] mb-4">ALL COMMENTS</h3>
              {comments.length === 0 ? (
                <div className="text-base text-[#64748b] py-8">
                  No comments yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border-b border-[#e7ebf8] pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-base text-[#1f2937] whitespace-pre-wrap">{comment.text}</p>
                        </div>
                      </div>
                      <div className="text-sm text-[#64748b]">
                        {comment.createdBy} • {new Date(comment.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "Transactions" && (
          <div className="px-8 py-6">
            {/* Bills Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1f2937] flex items-center gap-2">
                  <span className="cursor-pointer">Bills</span>
                </h3>
                <div className="flex items-center gap-3">
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] focus:border-[#2563eb] focus:outline-none"
                  >
                    <option value="All">Status: All</option>
                    <option value="OPEN">Open</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="PAID">Paid</option>
                  </select>
                  <button
                    onClick={() => navigate("/purchase/bills/new")}
                    className="px-4 py-1.5 rounded-md bg-[#2563eb] text-sm font-medium text-white hover:bg-[#1d4ed8] transition"
                  >
                    + New
                  </button>
                </div>
              </div>

              {loadingBills ? (
                <div className="text-center py-8 text-[#64748b]">Loading bills...</div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8 text-[#64748b]">No bills found for this vendor</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e6eafb]">
                  <table className="min-w-full divide-y divide-[#e6eafb]">
                    <thead className="bg-[#f5f6ff]">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                        <th className="px-4 py-3">DATE</th>
                        <th className="px-4 py-3">BRANCH</th>
                        <th className="px-4 py-3">BILL#</th>
                        <th className="px-4 py-3">ORDER...</th>
                        <th className="px-4 py-3">VENDOR...</th>
                        <th className="px-4 py-3 text-right">AMOUNT</th>
                        <th className="px-4 py-3 text-right">BALANCE...</th>
                        <th className="px-4 py-3">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2ff] bg-white">
                      {bills
                        .filter(bill => {
                          if (billStatusFilter === "All") return true;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                          if (dueDate) dueDate.setHours(0, 0, 0, 0);

                          if (billStatusFilter === "OVERDUE") {
                            return dueDate && dueDate < today && parseFloat(bill.finalTotal || 0) > 0;
                          }
                          if (billStatusFilter === "PAID") {
                            return parseFloat(bill.finalTotal || 0) === 0;
                          }
                          if (billStatusFilter === "OPEN") {
                            return !dueDate || dueDate >= today;
                          }
                          return true;
                        })
                        .map((bill) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                          if (dueDate) dueDate.setHours(0, 0, 0, 0);

                          const isOverdue = dueDate && dueDate < today && parseFloat(bill.finalTotal || 0) > 0;
                          const formatDate = (date) => {
                            if (!date) return "-";
                            const d = new Date(date);
                            const day = String(d.getDate()).padStart(2, "0");
                            const month = String(d.getMonth() + 1).padStart(2, "0");
                            const year = d.getFullYear();
                            return `${day}/${month}/${year}`;
                          };

                          return (
                            <tr
                              key={bill._id || bill.id}
                              onClick={() => navigate(`/purchase/bills/${bill._id || bill.id}`)}
                              className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-[#1f2937]">{formatDate(bill.billDate)}</td>
                              <td className="px-4 py-3 text-sm text-[#1f2937]">{bill.branch || "Warehouse"}</td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-[#2563eb] hover:underline">
                                  {bill.billNumber || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-[#64748b]">{bill.orderNumber || "-"}</td>
                              <td className="px-4 py-3 text-sm text-[#1f2937]">{bill.vendorName || "-"}</td>
                              <td className="px-4 py-3 text-sm text-[#1f2937] text-right">
                                {currency(parseFloat(bill.finalTotal || 0))}
                              </td>
                              <td className="px-4 py-3 text-sm text-[#1f2937] text-right">
                                {currency(parseFloat(bill.finalTotal || 0))}
                              </td>
                              <td className="px-4 py-3">
                                {isOverdue ? (
                                  <span className="text-sm font-medium text-[#f97316]">Overdue</span>
                                ) : parseFloat(bill.finalTotal || 0) === 0 ? (
                                  <span className="text-sm font-medium text-[#10b981]">Paid</span>
                                ) : (
                                  <span className="text-sm font-medium text-[#3b82f6]">Open</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bill Payments Section (placeholder for future) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1f2937] flex items-center gap-2">
                  <span className="cursor-pointer">Bill Payments</span>
                </h3>
                <button
                  onClick={() => navigate("/purchase/bills/new")}
                  className="px-4 py-1.5 rounded-md bg-[#2563eb] text-sm font-medium text-white hover:bg-[#1d4ed8] transition"
                >
                  + New
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#e6eafb]">
                <table className="min-w-full divide-y divide-[#e6eafb]">
                  <thead className="bg-[#f5f6ff]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                      <th className="px-4 py-3">DATE</th>
                      <th className="px-4 py-3">BRANCH</th>
                      <th className="px-4 py-3">PAYMENT...</th>
                      <th className="px-4 py-3">REFERENCE...</th>
                      <th className="px-4 py-3">PAYMENT...</th>
                      <th className="px-4 py-3 text-right">AMOUNT...</th>
                      <th className="px-4 py-3 text-right">UNUSED...</th>
                      <th className="px-4 py-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef2ff] bg-white">
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-sm text-[#64748b]">
                        No payments found
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "Overview" && activeTab !== "Comments" && activeTab !== "Transactions" && (
          <div className="px-8 py-6">
            <div className="text-center text-base text-[#64748b] py-12">
              {activeTab} content coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseVendorDetail;

