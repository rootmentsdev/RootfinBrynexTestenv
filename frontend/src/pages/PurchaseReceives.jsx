import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, MoreHorizontal, Send } from "lucide-react";
import Head from "../components/Head";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const PurchaseReceives = () => {
  const location = useLocation();
  const isNewReceive = location.pathname === "/purchase/receives/new";
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Fetch purchase receives from MongoDB
  const [receives, setReceives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({}); // Track sending state for each receive

  useEffect(() => {
    if (isNewReceive) return; // Don't fetch if we're on the new receive page

    const fetchReceives = async () => {
      setLoading(true);
      try {
        // Get user info - use email as primary identifier
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
        const userPower = user?.power || "";

        if (!userId) {
          setReceives([]);
          setLoading(false);
          return;
        }

        const adminEmails = ['officerootments@gmail.com'];
        const isAdminEmail = adminEmails.some(e => userId.toLowerCase() === e.toLowerCase());
        const isAdmin = isAdminEmail ||
          (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
          (user?.locCode && (String(user.locCode) === '858' || String(user.locCode) === '103'));

        const params = new URLSearchParams({ userId });
        if (userPower) params.append("userPower", userPower);
        if (user?.locCode) params.append("locCode", user.locCode);

        // Only send warehouse filter for non-admin users
        if (!isAdmin) {
          const fallbackLocations = [
            { locName: "Warehouse", locCode: "858" },
            { locName: "G-Edappally", locCode: "702" },
            { locName: "HEAD OFFICE01", locCode: "759" },
            { locName: "SG-Trivandrum", locCode: "700" },
            { locName: "Z-Edapally", locCode: "144" },
            { locName: "Z-Edappal", locCode: "100" },
            { locName: "Z-Perinthalmanna", locCode: "133" },
            { locName: "Z-Kottakkal", locCode: "122" },
            { locName: "G-Kottayam", locCode: "701" },
            { locName: "G-Perumbavoor", locCode: "703" },
            { locName: "G-Thrissur", locCode: "704" },
            { locName: "G-Chavakkad", locCode: "706" },
            { locName: "G-Calicut", locCode: "712" },
            { locName: "G-Vadakara", locCode: "708" },
            { locName: "G-Edappal", locCode: "707" },
            { locName: "G-Perinthalmanna", locCode: "709" },
            { locName: "G-Kottakkal", locCode: "711" },
            { locName: "G-Manjeri", locCode: "710" },
            { locName: "G-Palakkad", locCode: "705" },
            { locName: "G-Kalpetta", locCode: "717" },
            { locName: "G-Kannur", locCode: "716" },
            { locName: "G-Mg Road", locCode: "718" },
            { locName: "Production", locCode: "101" },
            { locName: "Office", locCode: "102" },
          ];
          const loc = fallbackLocations.find(l => l.locCode === String(user?.locCode));
          const userWarehouse = mapWarehouse(loc?.locName || user?.locName || "");
          if (userWarehouse) params.append("warehouse", userWarehouse);
        }
        
        const response = await fetch(`${API_URL}/api/purchase/receives?${params.toString()}`);
        if (!response.ok) {
          console.error("API response not OK:", response.status, response.statusText);
          throw new Error("Failed to fetch purchase receives");
        }
        const data = await response.json();
        console.log("Fetched purchase receives from MongoDB:", data.length, "receives");
        setReceives(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading purchase receives from MongoDB:", error);
        setReceives([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReceives();

    // Listen for custom event when receive is saved
    const handleReceiveSaved = () => {
      fetchReceives();
    };

    window.addEventListener("receiveSaved", handleReceiveSaved);

    return () => {
      window.removeEventListener("receiveSaved", handleReceiveSaved);
    };
  }, [isNewReceive, API_URL]);

  // Send purchase receive function
  const handleSendReceive = async (receiveId) => {
    setSending(prev => ({ ...prev, [receiveId]: true }));
    
    try {
      const response = await fetch(`${API_URL}/api/purchase/receives/${receiveId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send purchase receive");
      }
      
      const data = await response.json();
      console.log("Purchase receive sent successfully:", data);
      
      // Update the receive status in the local state
      setReceives(prev => prev.map(receive => 
        receive._id === receiveId ? { ...receive, status: "received" } : receive
      ));
      
      // Show success message
      alert("Purchase receive sent successfully!");
      
    } catch (error) {
      console.error("Error sending purchase receive:", error);
      alert("Failed to send purchase receive: " + error.message);
    } finally {
      setSending(prev => ({ ...prev, [receiveId]: false }));
    }
  };

  // Format date from Date object or string to dd/MM/yyyy
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "-";
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-[#f3f4f6] text-[#6b7280]" },
      in_transit: { label: "In Transit", className: "bg-[#fef3c7] text-[#92400e]" },
      partially_received: { label: "Partially Received", className: "bg-[#fef3c7] text-[#92400e]" },
      received: { label: "Received", className: "bg-[#dcfce7] text-[#166534]" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-[#f3f4f6] text-[#6b7280]" };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Calculate total received quantity
  const getTotalReceived = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (parseFloat(item.received) || 0), 0);
  };

  return (
    <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
      <Head
        title="All Purchase Receives"
        description=""
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/purchase/receives/new"
              className="rounded-md bg-[#3762f9] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2748c9]"
            >
              + New
            </Link>
            <button className="rounded-md border border-[#d7dcf5] bg-white px-3 py-1.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)] p-12">
          <div className="text-center text-[#64748b]">Loading purchase receives...</div>
        </div>
      ) : receives.length === 0 ? (
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <div className="mx-auto max-w-md text-center">
            <h2 className="text-2xl font-semibold text-[#0f172a]">
              Record Received Purchases Accurately
            </h2>
            <p className="mt-3 text-sm text-[#64748b]">
              Log items received from your vendors.
            </p>
            <Link
              to="/purchase/receives/new"
              className="mt-6 inline-block rounded-md bg-[#3b82f6] px-6 py-3 text-sm font-semibold uppercase text-white shadow hover:bg-[#2563eb] transition-colors"
            >
              RECEIVE ITEMS
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e6eafb]">
              <thead className="bg-[#f5f6ff]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                  <th className="px-6 py-3 w-10 border-r border-[#e2e8f0] text-center">
                    #
                  </th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Received Date</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Receive#</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Purchase Order#</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Vendor</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Items Received</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6eafb] bg-white">
                {receives.map((receive, index) => (
                  <tr
                    key={receive._id || receive.id}
                    className="hover:bg-[#f9fafb] transition-colors"
                  >
                    <td className="px-6 py-4 border-r border-[#e2e8f0] text-center text-sm text-[#64748b]">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {formatDate(receive.receivedDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-[#e2e8f0]">
                      <Link
                        to={`/purchase/receives/${receive._id || receive.id}`}
                        className="font-medium text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
                      >
                        {receive.receiveNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {receive.purchaseOrderNumber || (receive.purchaseOrderId?.orderNumber) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {receive.vendorName || (receive.vendorId?.displayName || receive.vendorId?.companyName) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {getTotalReceived(receive.items)} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-[#e2e8f0]">
                      {getStatusBadge(receive.status || "received")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {receive.status === "draft" && (
                        <button
                          onClick={() => handleSendReceive(receive._id || receive.id)}
                          disabled={sending[receive._id || receive.id]}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#3762f9] rounded hover:bg-[#2748c9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={12} />
                          {sending[receive._id || receive.id] ? "..." : "Send"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReceives;

