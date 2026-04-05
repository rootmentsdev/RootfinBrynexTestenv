import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";

const SalesInvoiceReturns = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Get user info from localStorage
  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem("rootfinuser");
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
    }
    return null;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get category badge color
  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case "return":
        return "bg-[#fef3c7] text-[#92400e]";
      case "refund":
        return "bg-[#fee2e2] text-[#991b1b]";
      case "cancel":
        return "bg-[#f3f4f6] text-[#374151]";
      default:
        return "bg-[#f3f4f6] text-[#374151]";
    }
  };

  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);

      try {
        const user = getUserInfo();
        if (!user || !user.email) {
          setError("User information not found. Please log in again.");
          setLoading(false);
          return;
        }

        const params = new URLSearchParams({
          userId: user.email,
        });

        // Add userPower and locCode if available
        if (user.power) params.append("userPower", user.power);
        if (user.locCode) params.append("locCode", user.locCode);
        
        // Add warehouse parameter for filtering
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
        
        let userLocName = "";
        if (user?.locCode) {
          const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
          if (location) {
            userLocName = location.locName;
          }
        }
        if (!userLocName) {
          userLocName = user?.username || user?.locName || "";
        }
        
        const userWarehouse = mapWarehouse(userLocName);
        if (userWarehouse) {
          params.append("warehouse", userWarehouse);
        }
        // Also pass the locCode for filtering by location code
        if (user?.locCode) {
          params.append("filterLocCode", user.locCode);
        }

        const response = await fetch(`${API_URL}/api/sales/invoices?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch invoices: ${response.statusText}`);
        }

        const data = await response.json();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError(err.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [API_URL]);

  // Filter invoices to show ONLY Return/Refund/Cancel categories
  const filteredInvoices = invoices.filter(invoice => {
    // Only show Return/Refund/Cancel invoices on this page
    const categoryLower = (invoice.category || "").toLowerCase().trim();
    const isReturnRefundCancel = ["return", "refund", "cancel"].includes(categoryLower);
    
    if (!isReturnRefundCancel) {
      return false; // Don't show non-return invoices on this page
    }
    
    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
      invoice.customer?.toLowerCase().includes(searchLower) ||
      invoice.orderNumber?.toLowerCase().includes(searchLower) ||
      invoice.branch?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Header title="Invoice Returns" />
      <div className="min-h-screen bg-[#f6f9ff]">
        <Head
          title="Invoice Returns"
          description="View and manage return, refund, and cancellation invoices."
        />

        <div className="ml-64 px-10 pb-16 pt-8">
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold text-[#111827]">Invoice Returns</h1>
                <p className="text-sm text-[#6b7280]">View all return, refund, and cancellation invoices.</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/sales/invoices"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7def4] bg-white px-4 text-sm font-semibold text-[#4b5563] shadow-sm transition hover:bg-[#f1f3fd]"
                >
                  View Sales Invoices
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by invoice #, customer name, or order #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 rounded-lg border border-[#d7def4] bg-white px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#3366ff] focus:outline-none focus:ring-2 focus:ring-[#3366ff]/20"
              />
            </div>
          </header>

          <section className="rounded-3xl border border-[#dfe5f5] bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-[#e7ecf8] px-8 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-xl bg-[#fff7ed] px-4 py-3 text-sm font-medium text-[#9a3412]">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#9a3412] shadow-sm">
                    🔄
                  </span>
                  Return & Refund Transactions
                </div>
              </div>
            </div>

            {loading ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#6b7280]">Loading return invoices...</p>
              </div>
            ) : error ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#6b7280]">No return invoices found.</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#6b7280]">No return invoices match your search. Try a different search term.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#eef1fb] bg-[#f9fbff] text-xs font-semibold uppercase tracking-[0.24em] text-[#8a94b0]">
                      <th className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
                        />
                      </th>
                      <th className="px-4 py-4 text-left">DATE</th>
                      <th className="px-4 py-4 text-left">INVOICE#</th>
                      <th className="px-4 py-4 text-left">ORDER NUMBER</th>
                      <th className="px-4 py-4 text-left">CUSTOMER NAME</th>
                      <th className="px-4 py-4 text-left">CATEGORY</th>
                      <th className="px-4 py-4 text-left">RETURN STATUS</th>
                      <th className="px-4 py-4 text-right">INVOICE AMOUNT</th>
                      <th className="px-4 py-4 text-left">BRANCH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1fb] text-sm text-[#1f2937]">
                    {filteredInvoices.map((invoice, index) => (
                      <tr
                        key={invoice._id || invoice.id}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-[#f7f9ff]"} hover:bg-[#f2f5ff]`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca]"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-[#4b5563]">
                          {formatDate(invoice.invoiceDate)}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            to={`/sales/invoices/${invoice._id || invoice.id}`}
                            className="font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-[#4b5563]">{invoice.orderNumber || ""}</td>
                        <td className="px-4 py-4 text-[#1f2937]">{invoice.customer}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${getCategoryColor(invoice.category)}`}>
                            {(invoice.category || "").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {invoice.returnStatus === "full" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              FULLY RETURNED
                            </span>
                          )}
                          {invoice.returnStatus === "partial" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                              PARTIALLY RETURNED
                            </span>
                          )}
                          {!invoice.returnStatus || invoice.returnStatus === "none" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              NOT RETURNED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-[#1f2937]">
                          {formatCurrency(invoice.finalTotal)}
                        </td>
                        <td className="px-4 py-4 text-[#4b5563]">{invoice.branch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
    </>
  );
};

export default SalesInvoiceReturns;
