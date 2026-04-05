import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Send } from "lucide-react";
import Head from "../components/Head";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const Pill = ({ children }) => (
  <div className="inline-flex items-center gap-2 rounded-xl border border-[#93c5fd] bg-white px-4 py-2 text-xs font-semibold text-[#1e3a8a] shadow-sm">
    {children}
  </div>
);

const PurchaseOrders = () => {
  const location = useLocation();
  const isNewOrder = location.pathname === "/purchase/orders/new";
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Fetch purchase orders from MongoDB
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOrderNumber, setSearchOrderNumber] = useState("");
  const [sending, setSending] = useState({}); // Track sending state for each order

  useEffect(() => {
    if (isNewOrder) return; // Don't fetch if we're on the new order page

    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Get user info - use email as the primary identifier
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        // Use email as primary identifier
        const userId = user?.email || null;
        const userPower = user?.power || "";

        // If searching by orderNumber, use that query param instead (no userId filter)
        let searchParam;
        if (searchOrderNumber) {
          searchParam = `orderNumber=${encodeURIComponent(searchOrderNumber)}`;
        } else if (userId) {
          // Build query with userId (email) and userPower (for admin check)
          const params = new URLSearchParams({
            userId: userId,
          });
          if (userPower) params.append("userPower", userPower);
          if (user?.locCode) params.append("locCode", user.locCode);
          
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
          
          searchParam = params.toString();
        } else {
          // If no userId, still try to fetch (backend will handle it)
          searchParam = "";
        }
        
        const url = `${API_URL}/api/purchase/orders${searchParam ? `?${searchParam}` : ""}`;
        console.log("Fetching purchase orders from:", url);
        
        const response = await fetch(url);
        if (!response.ok) {
          console.error("API response not OK:", response.status, response.statusText);
          throw new Error("Failed to fetch purchase orders");
        }
        const data = await response.json();
        console.log("Fetched purchase orders from MongoDB:", data.length, "orders", searchOrderNumber ? `(searching for: ${searchOrderNumber})` : `(userId: ${userId})`);
        
        // If no results and we have userId, log for debugging
        if (data.length === 0 && !searchOrderNumber && userId) {
          console.warn(`No orders found for userId (email): ${userId}`);
        }
        
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading purchase orders:", error);
        console.error("userId (email) used:", userId);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Listen for custom event when order is saved
    const handleOrderSaved = () => {
      fetchOrders();
    };

    window.addEventListener("orderSaved", handleOrderSaved);

    return () => {
      window.removeEventListener("orderSaved", handleOrderSaved);
    };
  }, [isNewOrder, API_URL, searchOrderNumber]);

  // Send purchase order function
  const handleSendOrder = async (orderId) => {
    setSending(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await fetch(`${API_URL}/api/purchase/orders/${orderId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send purchase order");
      }
      
      const data = await response.json();
      console.log("Purchase order sent successfully:", data);
      
      // Update the order status in the local state
      setOrders(prev => prev.map(order => 
        order._id === orderId ? { ...order, status: "sent" } : order
      ));
      
      // Show success message
      alert("Purchase order sent successfully!");
      
    } catch (error) {
      console.error("Error sending purchase order:", error);
      alert("Failed to send purchase order: " + error.message);
    } finally {
      setSending(prev => ({ ...prev, [orderId]: false }));
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
      sent: { label: "Sent", className: "bg-[#dbeafe] text-[#1e40af]" },
      received: { label: "Received", className: "bg-[#dcfce7] text-[#166534]" },
      cancelled: { label: "Cancelled", className: "bg-[#fee2e2] text-[#991b1b]" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-[#f3f4f6] text-[#6b7280]" };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
      <Head
        title="All Purchase Orders"
        description=""
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-[#d7dcf5] bg-white px-3 py-1.5 text-sm font-medium text-[#2563eb] hover:bg-[#eef2ff]">
              In Transit Receives
            </button>
            <Link
              to="/purchase/orders/new"
              className="rounded-md bg-[#3762f9] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2748c9]"
            >
              New
            </Link>
          </div>
        }
      />

      {/* Search bar for finding orders by orderNumber */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          placeholder="Search by Order Number (e.g., P0001, PO-00001)"
          value={searchOrderNumber}
          onChange={(e) => setSearchOrderNumber(e.target.value)}
          className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm focus:border-[#3762f9] focus:outline-none focus:ring-2 focus:ring-[#3762f9]"
        />
        {searchOrderNumber && (
          <button
            onClick={() => setSearchOrderNumber("")}
            className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#64748b] hover:bg-[#f3f4f6]"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)] p-12">
          <div className="text-center text-[#64748b]">Loading purchase orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <>
          <div className="mx-auto mt-16 max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-[#0f172a]">
              Start Managing Your Purchase Activities!
            </h2>
            <p className="mt-3 text-[#64748b]">
              Create, customize, and send professional Purchase Orders to your vendors.
            </p>
            <Link
              to="/purchase/orders/new"
              className="mt-6 inline-block rounded-md bg-[#3b82f6] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#2563eb]"
            >
              CREATE NEW PURCHASE ORDER
            </Link>
          </div>

          <div className="mx-auto mt-16 max-w-5xl text-center">
            <h3 className="text-lg font-semibold text-[#0f172a]">
              Life cycle of a Purchase Order
            </h3>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <Pill>
                <span>RAISE PURCHASE ORDER</span>
              </Pill>
              <span className="text-[#94a3b8] text-xs">CONVERT TO OPEN</span>
              <Pill>
                <span>RECEIVE GOODS</span>
              </Pill>
              <Pill>
                <span>CONVERT TO BILL</span>
              </Pill>
              <Pill>
                <span>RECORD PAYMENT</span>
              </Pill>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e6eafb]">
              <thead className="bg-[#f5f6ff]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                  <th className="px-6 py-3 w-10 border-r border-[#e2e8f0] text-center">
                    #
                  </th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Date</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Purchase Order#</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Vendor</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Reference#</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Delivery Date</th>
                  <th className="px-6 py-3 text-right border-r border-[#e2e8f0]">Total</th>
                  <th className="px-6 py-3 border-r border-[#e2e8f0]">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6eafb] bg-white">
                {orders.map((order, index) => (
                  <tr
                    key={order._id || order.id}
                    className="hover:bg-[#f9fafb] transition-colors"
                  >
                    <td className="px-6 py-4 border-r border-[#e2e8f0] text-center text-sm text-[#64748b]">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {formatDate(order.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-[#e2e8f0]">
                      <Link
                        to={`/purchase/orders/${order._id || order.id}`}
                        className="font-medium text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {order.vendorName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {order.referenceNumber || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {formatDate(order.deliveryDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#0f172a] text-right border-r border-[#e2e8f0]">
                      {currency(order.finalTotal || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-[#e2e8f0]">
                      {getStatusBadge(order.status || "draft")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.status === "draft" && (
                        <button
                          onClick={() => handleSendOrder(order._id || order.id)}
                          disabled={sending[order._id || order.id]}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#3762f9] rounded hover:bg-[#2748c9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={12} />
                          {sending[order._id || order.id] ? "..." : "Send"}
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

export default PurchaseOrders;


