import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import dataCache from "../utils/cache";

const SalesReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

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

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Delete return invoice
  const handleDeleteReturn = async () => {
    if (!returnToDelete) return;
    
    setDeleting(true);
    try {
      const user = getUserInfo();
      const returnId = returnToDelete._id || returnToDelete.id;
      
      console.log(`Deleting return invoice: ${returnId}`);
      
      const response = await fetch(
        `${API_URL}/api/sales/invoices/${returnId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.email }),
        }
      );

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("Delete response error:", responseData);
        throw new Error(responseData.message || "Failed to delete return");
      }

      // Remove from list
      setReturns(returns.filter(ret => (ret._id || ret.id) !== returnId));
      setShowDeleteModal(false);
      setReturnToDelete(null);
      
      // Clear cache so Financial Summary Report fetches fresh data
      dataCache.clear();
      
      // Set flag to trigger refresh in Financial Summary Report
      sessionStorage.setItem('invoiceDeleted', 'true');
      
      alert("Return invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting return:", error);
      alert(`Failed to delete return: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchReturns = async () => {
      setLoading(true);
      setError(null);

      try {
        const user = getUserInfo();
        if (!user || !user.email) {
          setError("User information not found. Please log in again.");
          setLoading(false);
          return;
        }

        // Check if user is admin
        const adminEmails = ['officerootments@gmail.com'];
        const isAdminEmail = user.email && adminEmails.some(email => user.email.toLowerCase() === email.toLowerCase());
        const userIsAdmin = isAdminEmail || user.power === "admin" || (user.locCode && (user.locCode === '858' || user.locCode === '103'));
        setIsAdmin(userIsAdmin);

        const params = new URLSearchParams({
          userId: user.email,
          category: "Return",
        });

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
          throw new Error(`Failed to fetch returns: ${response.statusText}`);
        }

        const data = await response.json();
        const returnInvoices = Array.isArray(data) ? data.filter(inv => inv.category === "Return") : [];
        setReturns(returnInvoices);
      } catch (err) {
        console.error("Error fetching returns:", err);
        setError(err.message || "Failed to load returns");
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, [API_URL]);

  const filteredReturns = returns.filter(ret => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ret.invoiceNumber?.toLowerCase().includes(searchLower) ||
      ret.customer?.toLowerCase().includes(searchLower) ||
      ret.originalInvoiceNumber?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Header title="Invoice Returns" />
      <div className="min-h-screen bg-[#f6f9ff]">
        <Head title="Invoice Return" description="Manage your invoice returns" />

        <div className="ml-64 px-10 pb-16 pt-8">
          <div className="flex flex-col gap-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-[#111827]">Invoice Returns</h1>
                <p className="text-sm text-[#6b7280]">Manage and track all returned invoices.</p>
              </div>
              <Link
                to="/sales/invoices"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-transparent bg-[#3366ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244fd6]"
              >
                ← Back to Invoices
              </Link>
            </header>

          <div className="rounded-lg border border-[#dfe5f5] bg-white shadow-sm">
            <div className="border-b border-[#e7ecf8] px-8 py-5">
              <input
                type="text"
                placeholder="Search by return #, customer name, or original invoice #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[#d7def4] bg-white px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#3366ff] focus:outline-none focus:ring-2 focus:ring-[#3366ff]/20"
              />
            </div>

            {loading ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#6b7280]">Loading returns...</p>
              </div>
            ) : error ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            ) : returns.length === 0 ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#6b7280]">No returns found. Create your first return from invoices!</p>
              </div>
            ) : filteredReturns.length === 0 ? (
              <div className="px-8 py-12 text-center">
                <p className="text-sm text-[#6b7280]">No returns match your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#eef1fb] bg-[#f9fbff] text-xs font-semibold uppercase tracking-[0.24em] text-[#8a94b0]">
                      <th className="px-4 py-4 text-left">DATE</th>
                      <th className="px-4 py-4 text-left">RETURN #</th>
                      <th className="px-4 py-4 text-left">ORIGINAL INVOICE</th>
                      <th className="px-4 py-4 text-left">CUSTOMER NAME</th>
                      <th className="px-4 py-4 text-left">REASON</th>
                      <th className="px-4 py-4 text-left">SUB CATEGORY</th>
                      <th className="px-4 py-4 text-right">RETURN AMOUNT</th>
                      <th className="px-4 py-4 text-left">BRANCH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1fb] text-sm text-[#1f2937]">
                    {filteredReturns.map((ret, index) => (
                      <tr
                        key={ret._id || index}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-[#f7f9ff]"} hover:bg-[#f2f5ff]`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-[#4b5563]">
                          {formatDate(ret.invoiceDate)}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            to={`/sales/invoices/${ret._id}`}
                            className="font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline"
                          >
                            {ret.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-[#4b5563]">
                          {ret.originalInvoiceNumber || "-"}
                        </td>
                        <td className="px-4 py-4 text-[#1f2937]">{ret.customer}</td>
                        <td className="px-4 py-4 text-[#4b5563]">
                          <span className="inline-block max-w-xs truncate" title={ret.remark}>
                            {ret.remark?.replace("Return for: ", "") || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[#4b5563]">{ret.subCategory}</td>
                        <td className="px-4 py-4 text-right font-semibold text-[#ef4444]">
                          {formatCurrency(Math.abs(ret.finalTotal))}
                        </td>
                        <td className="px-4 py-4 text-[#4b5563]">{ret.branch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SalesReturns;

