import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Trash2, AlertTriangle } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse } from "../utils/warehouseMapping";

const StoreOrders = () => {
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  
  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const userLocCode = user?.locCode || "";
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com'];
  const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
  const isAdmin = isAdminEmail || user?.power === "admin";
  const isWarehouseUser = user?.power === "warehouse";
  const isStoreUser = !isAdmin && !isWarehouseUser;
  
  // Fallback locations mapping
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
  
  // Get location name
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
  
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  
  const [storeOrders, setStoreOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(new Set());
  
  // Format date
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
  
  // Format datetime
  const formatDateTime = (date) => {
    if (!date) return "-";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = d.getHours() >= 12 ? "PM" : "AM";
      const displayHours = d.getHours() % 12 || 12;
      return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
    } catch {
      return "-";
    }
  };
  
  // Fetch store orders
  useEffect(() => {
    const fetchStoreOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.append("userId", userId);
        if (statusFilter !== "all") params.append("status", statusFilter);
        
        // Filter by store warehouse for store users
        if (isStoreUser && userWarehouse) {
          params.append("storeWarehouse", userWarehouse);
        }
        if (user?.power) params.append("userPower", user.power);
        if (user?.locCode) params.append("locCode", user.locCode);
        
        const response = await fetch(`${API_URL}/api/inventory/store-orders?${params}`);
        if (!response.ok) throw new Error("Failed to fetch store orders");
        const data = await response.json();
        let orders = Array.isArray(data) ? data : [];
        
        setStoreOrders(orders);
      } catch (error) {
        console.error("Error fetching store orders:", error);
        setStoreOrders([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoreOrders();
  }, [API_URL, userId, statusFilter, isStoreUser, userWarehouse, user?.power, user?.locCode]);
  
  // Listen for status changes from other pages (like StoreOrderView)
  useEffect(() => {
    const handleStatusChange = (event) => {
      console.log("📦 Store order status changed event received in StoreOrders list", event.detail);
      
      const { orderId, status } = event.detail;
      
      // Update the order in the list
      setStoreOrders(prevOrders => {
        return prevOrders.map(order => {
          const orderIdStr = (order._id || order.id)?.toString();
          if (orderIdStr === orderId?.toString()) {
            console.log(`🔄 Updating order ${order.orderNumber} status to ${status}`);
            return { ...order, status };
          }
          return order;
        });
      });
    };

    window.addEventListener("storeOrderStatusChanged", handleStatusChange);
    return () => {
      window.removeEventListener("storeOrderStatusChanged", handleStatusChange);
    };
  }, []);
  
  // Filter store orders by search term
  const filteredOrders = storeOrders.filter(order => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.orderNumber || "").toLowerCase().includes(searchLower) ||
      (order.reason || "").toLowerCase().includes(searchLower) ||
      (order.storeWarehouse || "").toLowerCase().includes(searchLower)
    );
  });
  
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "Pending", className: "bg-[#fef3c7] text-[#92400e]" },
      approved: { label: "Approved", className: "bg-[#ecfdf5] text-[#047857]" },
      rejected: { label: "Rejected", className: "bg-[#fee2e2] text-[#991b1b]" },
      transferred: { label: "Transferred", className: "bg-[#dbeafe] text-[#1e40af]" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-[#f3f4f6] text-[#6b7280]" };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
        <span className="h-2 w-2 rounded-full bg-current" />
        {statusInfo.label}
      </span>
    );
  };
  
  const pendingCount = storeOrders.filter(o => o.status === "pending").length;
  const approvedCount = storeOrders.filter(o => o.status === "approved").length;
  const rejectedCount = storeOrders.filter(o => o.status === "rejected").length;
  const transferredCount = storeOrders.filter(o => o.status === "transferred").length;
  
  // Handle checkbox change
  const handleCheckboxChange = (orderId, isChecked) => {
    const newSelected = new Set(selectedOrders);
    if (isChecked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };
  
  // Handle select all checkbox
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allIds = filteredOrders.map(order => order._id || order.id).filter(Boolean);
      setSelectedOrders(new Set(allIds));
    } else {
      setSelectedOrders(new Set());
    }
  };
  
  // Handle delete button click
  const handleDeleteClick = () => {
    const selectedIds = Array.from(selectedOrders);
    if (selectedIds.length === 0) return;
    
    const orders = filteredOrders.filter(order => {
      const id = order._id || order.id;
      return id && selectedIds.includes(id);
    });
    
    setOrdersToDelete(orders);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };
  
  // Handle single delete
  const handleSingleDelete = (order) => {
    const orderId = order._id || order.id;
    if (!orderId) return;
    
    setOrdersToDelete([order]);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };
  
  // Confirm delete (step 1)
  const handleConfirmDeleteStep1 = () => {
    setDeleteStep(2);
  };
  
  // Final delete confirmation (step 2)
  const handleConfirmDeleteStep2 = async () => {
    setDeleting(true);
    try {
      const deletePromises = ordersToDelete.map(async (order) => {
        const orderId = order._id || order.id;
        if (!orderId) return;
        
        const response = await fetch(`${API_URL}/api/inventory/store-orders/${orderId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete store order");
        }
        
        return orderId;
      });

      await Promise.all(deletePromises);
      
      // Remove deleted orders from selected set
      const deletedIds = ordersToDelete.map(order => order._id || order.id).filter(Boolean);
      const newSelected = new Set(selectedOrders);
      deletedIds.forEach(id => newSelected.delete(id));
      setSelectedOrders(newSelected);
      
      // Refresh the list
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      if (isStoreUser && userWarehouse) {
        params.append("storeWarehouse", userWarehouse);
      }
      
      const response = await fetch(`${API_URL}/api/inventory/store-orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStoreOrders(Array.isArray(data) ? data : []);
      }
      
      setShowDeleteModal(false);
      setDeleteStep(1);
      setOrdersToDelete([]);
      alert(`Successfully deleted ${ordersToDelete.length} store order(s)`);
    } catch (error) {
      console.error("Error deleting store orders:", error);
      alert(`Error deleting store orders: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };
  
  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setOrdersToDelete([]);
  };
  
  // Handle status change (approve/reject)
  const handleStatusChange = async (orderId, newStatus, rejectionReason = "") => {
    setUpdatingStatus(prev => new Set(prev).add(orderId));
    try {
      const updateData = { status: newStatus };
      if (newStatus === "rejected" && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      
      const response = await fetch(`${API_URL}/api/inventory/store-orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If there are stock issues, format them nicely
        if (errorData.stockIssues && Array.isArray(errorData.stockIssues)) {
          let errorMessage = errorData.message || "Cannot approve store order: Insufficient stock in Warehouse.\n\n";
          errorMessage += "Details:\n\n";
          errorData.stockIssues.forEach((issue, index) => {
            errorMessage += `${index + 1}. ${issue.itemName}${issue.itemSku && issue.itemSku !== "N/A" ? ` (SKU: ${issue.itemSku})` : ''}\n`;
            errorMessage += `   • Requested: ${issue.requested.toFixed(2)} units\n`;
            errorMessage += `   • Available in Warehouse: ${issue.available.toFixed(2)} units\n`;
            errorMessage += `   • Shortfall: ${issue.shortfall.toFixed(2)} units`;
            if (issue.error) {
              errorMessage += `\n   • Error: ${issue.error}`;
            }
            errorMessage += `\n\n`;
          });
          errorMessage += "Please ensure sufficient stock is available in Warehouse before approving this order.";
          alert(errorMessage);
          throw new Error("Insufficient stock - see details above");
        } else {
          throw new Error(errorData.message || "Failed to update status");
        }
      }

      // Refresh the list
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      if (isStoreUser && userWarehouse) {
        params.append("storeWarehouse", userWarehouse);
      }
      
      const refreshResponse = await fetch(`${API_URL}/api/inventory/store-orders?${params}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setStoreOrders(Array.isArray(data) ? data : []);
      }
      
      // Dispatch event to notify other pages (like StoreOrderView) that status changed
      console.log("📦 Dispatching storeOrderStatusChanged event", {
        orderId,
        newStatus
      });
      
      window.dispatchEvent(new CustomEvent("storeOrderStatusChanged", {
        detail: {
          orderId,
          status: newStatus,
          source: "store-orders-list"
        }
      }));
      
      // Show success message
      if (newStatus === "approved") {
        alert("Store order approved successfully! Transfer order created and set to 'In Transit'.");
      } else if (newStatus === "rejected") {
        alert("Store order rejected successfully.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      // Only show error alert if it's not already shown above
      if (!error.message.includes("Insufficient stock - see details above")) {
        alert(`Error updating status: ${error.message}`);
      }
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };
  
  // Calculate total quantity requested
  const getTotalQuantity = (order) => {
    if (!order.items || !Array.isArray(order.items)) return 0;
    return order.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  };
  
  return (
    <>
      <Header title="Store Orders" />
      <div className="ml-64 min-h-screen bg-[#f8fafc] p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[#1e293b]">
                Store Orders
              </h1>
              {!loading && (
                <span className="px-3 py-1 rounded-full bg-[#e2e8f0] text-sm font-medium text-[#475569]">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && selectedOrders.size > 0 && (
                <button
                  onClick={handleDeleteClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#dc2626] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#b91c1c] hover:shadow-md"
                >
                <Trash2 size={18} />
                <span>Delete ({selectedOrders.size})</span>
              </button>
            )}
            <Link
              to="/inventory/store-orders/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1d4ed8] hover:shadow-md"
            >
              <span>+</span>
              <span>New</span>
            </Link>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94a3b8]" size={18} />
          <input
            type="text"
            placeholder="Search by order number, reason, or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Store Orders Table */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5e7eb] px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[#4b5563]">
            <span className="font-medium text-[#111827]">Order period:</span>
            All orders
          </div>
          <div className="flex items-center gap-3 text-sm text-[#6b7280]">
            <button
              onClick={() => setStatusFilter("pending")}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                statusFilter === "pending"
                  ? "bg-[#fef3c7] text-[#92400e]"
                  : "border border-transparent hover:bg-[#f3f4f6]"
              }`}
            >
              Pending
              <span className={`rounded-full px-2 py-0.5 shadow-sm ${
                statusFilter === "pending" ? "bg-white text-[#92400e]" : "bg-[#e5e7eb] text-[#6b7280]"
              }`}>
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`rounded-full border border-transparent px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === "approved" ? "bg-[#ecfdf5] text-[#047857]" : "hover:bg-[#f3f4f6]"
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`rounded-full border border-transparent px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === "rejected" ? "bg-[#fee2e2] text-[#991b1b]" : "hover:bg-[#f3f4f6]"
              }`}
            >
              Rejected ({rejectedCount})
            </button>
            <button
              onClick={() => setStatusFilter("transferred")}
              className={`rounded-full border border-transparent px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === "transferred" ? "bg-[#dbeafe] text-[#1e40af]" : "hover:bg-[#f3f4f6]"
              }`}
            >
              Transferred ({transferredCount})
            </button>
            {statusFilter !== "all" && (
              <button
                onClick={() => setStatusFilter("all")}
                className="rounded-full border border-transparent px-3 py-1 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
              >
                All
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#2563eb] border-r-transparent"></div>
              <p className="mt-4 text-sm text-[#64748b]">Loading store orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mb-4">
                <Search className="text-[#94a3b8]" size={24} />
              </div>
              <p className="text-sm font-medium text-[#1e293b] mb-1">
                {searchTerm ? "No store orders found" : "No store orders yet"}
              </p>
              <p className="text-sm text-[#64748b] mb-4">
                {searchTerm ? "Try adjusting your search" : "Create your first store order to get started"}
              </p>
              {!searchTerm && (
                <Link
                  to="/inventory/store-orders/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
                >
                  <span>+</span>
                  Create Store Order
                </Link>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[#e2e8f0]">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th scope="col" className="px-6 py-4 text-center border-r border-[#e2e8f0] text-xs font-semibold uppercase tracking-wider text-[#64748b] w-12">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca] cursor-pointer" 
                      checked={filteredOrders.length > 0 && filteredOrders.every(order => {
                        const id = order._id || order.id;
                        return !id || selectedOrders.has(id);
                      })}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Order #
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Store Warehouse
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Reason
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Status
                    {(isAdmin || isWarehouseUser) && <span className="ml-1 text-[#94a3b8] text-[10px] normal-case">(Admin)</span>}
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Items
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Total Qty
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Created By
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Created Time
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Last Modified
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] bg-white">
                {filteredOrders.map((order) => (
                  <tr
                    key={order._id || order.id}
                    className="hover:bg-[#f8fafc] transition-colors cursor-pointer group"
                    onClick={() => navigate(`/inventory/store-orders/${order._id || order.id}`)}
                  >
                    <td className="px-6 py-4 text-center border-r border-[#e2e8f0]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-[#d1d9f2] text-[#4f46e5] focus:ring-[#4338ca] cursor-pointer" 
                          checked={selectedOrders.has(order._id || order.id)}
                          onChange={(e) => handleCheckboxChange(order._id || order.id, e.target.checked)}
                        />
                        {isAdmin && selectedOrders.has(order._id || order.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleDelete(order);
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                            title="Delete this store order"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {formatDate(order.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-[#e2e8f0]">
                      <span
                        className="font-semibold text-[#2563eb] group-hover:text-[#1d4ed8] group-hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/inventory/store-orders/${order._id || order.id}`);
                        }}
                      >
                        {order.orderNumber || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {order.storeWarehouse || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569] border-r border-[#e2e8f0] max-w-xs truncate">
                      {order.reason || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-[#e2e8f0]">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[#475569] border-r border-[#e2e8f0]">
                      {order.items && Array.isArray(order.items) ? order.items.length : 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold border-r border-[#e2e8f0]">
                      {getTotalQuantity(order).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {order.createdBy || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b] border-r border-[#e2e8f0]">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b]">
                      {formatDateTime(order.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2-Step Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {deleteStep === 1 ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1e293b]">
                      Delete {ordersToDelete.length === 1 ? 'Store Order' : `${ordersToDelete.length} Store Orders`}?
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748b] mb-6">
                    Are you sure you want to delete {ordersToDelete.length === 1 ? 'this store order' : `these ${ordersToDelete.length} store orders`}? 
                    {ordersToDelete.some(order => order.status === 'approved' || order.status === 'transferred') && (
                      <span className="block mt-2 text-red-600 font-medium">
                        ⚠️ Some orders are already approved or transferred. This action cannot be undone.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={handleCancelDelete}
                      className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDeleteStep1}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1e293b]">
                      Final Confirmation
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748b] mb-4">
                    This action cannot be undone. Are you absolutely sure you want to delete {ordersToDelete.length === 1 ? 'this store order' : `these ${ordersToDelete.length} store orders`}?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={handleCancelDelete}
                      disabled={deleting}
                      className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDeleteStep2}
                      disabled={deleting}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? "Deleting..." : "Delete Permanently"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default StoreOrders;
