import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Trash2, AlertTriangle } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse } from "../utils/warehouseMapping";

const TransferOrders = () => {
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
  
  // Get location name - prioritize locCode lookup over username
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
  
  const [transferOrders, setTransferOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const location = useLocation();
  
  
  // Get user's warehouse name
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  const isWarehouseSelection = (userWarehouse || "").toString().toLowerCase().trim() === "warehouse" ||
    userLocCode === '858' || userLocCode === '103';
  const shouldFilterByWarehouse = !isWarehouseUser && !(isAdmin && isWarehouseSelection);
  
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
  
  // Fetch transfer orders
  useEffect(() => {
    const fetchTransferOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (userId) params.append("userId", userId);
        if (statusFilter !== "all") params.append("status", statusFilter);
        
        // Filter by selected store warehouse (source OR destination), except:
        // - Warehouse-power users: can see all
        // - Admin users when 'Warehouse' is selected: show all stores
        // IMPORTANT: Only append warehouse params if userWarehouse is valid (not undefined/null/empty)
        if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== 'undefined' && userWarehouse !== 'null') {
          // Filter by both source and destination - backend will show orders matching either
          params.append("destinationWarehouse", userWarehouse);
          params.append("sourceWarehouse", userWarehouse);
          console.log(`🔍 Transfer Orders: Filtering by warehouse (source OR destination): "${userWarehouse}"`);
        } else {
          console.log(`🔍 Transfer Orders: No warehouse filter (admin or warehouse user)`);
        }
        if (user?.power) params.append("userPower", user.power);
        if (user?.locCode) params.append("locCode", user.locCode);
        
        const fullUrl = `${API_URL}/api/inventory/transfer-orders?${params}`;
        console.log(`📡 Transfer Orders: Fetching from: ${fullUrl}`);
        
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error("Failed to fetch transfer orders");
        const data = await response.json();
        let orders = Array.isArray(data) ? data : [];
        
        // Additional client-side filtering for non-warehouse users (in case backend doesn't filter)
        // This is a backup filter - backend should handle it, but this ensures it works
        // Show orders where user's warehouse is source OR destination
        if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== 'undefined' && userWarehouse !== 'null') {
          const userWarehouseLower = userWarehouse.toLowerCase().trim();
          const userBase = userWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
          
          console.log(`🔍 Filtering for user warehouse: "${userWarehouse}" (base: "${userBase}")`);
          
          const matchesWarehouse = (orderWarehouse) => {
            if (!orderWarehouse) return false;
            const orderWarehouseLower = orderWarehouse.toString().toLowerCase().trim();
            const orderBase = orderWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            
            // Exact match
            if (orderWarehouseLower === userWarehouseLower) {
              console.log(`✅ Exact match: "${orderWarehouse}" === "${userWarehouse}"`);
              return true;
            }
            
            // Base name match (e.g., "Kottayam" matches "Kottayam Branch")
            if (orderBase && userBase && orderBase === userBase) {
              console.log(`✅ Base match: "${orderWarehouse}" (base: "${orderBase}") === "${userWarehouse}" (base: "${userBase}")`);
              return true;
            }
            
            // Partial match (contains)
            if (orderWarehouseLower.includes(userWarehouseLower) || userWarehouseLower.includes(orderWarehouseLower)) {
              console.log(`✅ Partial match: "${orderWarehouse}" <-> "${userWarehouse}"`);
              return true;
            }
            
            // Try removing common prefixes (G., Z., SG-)
            const orderNormalized = orderWarehouseLower.replace(/^[a-z]{1,2}[.\-]\s*/i, "").trim();
            const userNormalized = userWarehouseLower.replace(/^[a-z]{1,2}[.\-]\s*/i, "").trim();
            if (orderNormalized && userNormalized && orderNormalized === userNormalized) {
              console.log(`✅ Normalized match: "${orderWarehouse}" (normalized: "${orderNormalized}") === "${userWarehouse}" (normalized: "${userNormalized}")`);
              return true;
            }
            
            console.log(`❌ No match: "${orderWarehouse}" vs "${userWarehouse}"`);
            return false;
          };
          
          orders = orders.filter(order => {
            const matchesDest = matchesWarehouse(order.destinationWarehouse);
            const matchesSource = matchesWarehouse(order.sourceWarehouse);
            
            console.log(`Order ${order.transferOrderNumber}: Source="${order.sourceWarehouse}" Dest="${order.destinationWarehouse}" Status="${order.status}" MatchesDest=${matchesDest} MatchesSource=${matchesSource}`);
            
            // Draft orders should only show at source warehouse, not destination
            // This allows source to edit/send draft orders before destination sees them
            if (order.status === 'draft' && matchesDest && !matchesSource) {
              console.log(`⚠️ Hiding draft order at destination`);
              return false;
            }
            
            // Show if user's warehouse is source OR destination (but drafts only at source)
            return matchesDest || matchesSource;
          });
          
          console.log(`Transfer Orders: Client-side filtered to ${orders.length} orders for warehouse: "${userWarehouse}" (source OR destination)`);
        }
        
        setTransferOrders(orders);
      } catch (error) {
        console.error("Error fetching transfer orders:", error);
        setTransferOrders([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransferOrders();
  }, [API_URL, userId, statusFilter, isWarehouseUser, isAdmin, isWarehouseSelection, userWarehouse, refreshTrigger]);
  
  // Refresh data when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("🔄 Page visible - refreshing transfer orders");
        setRefreshTrigger(prev => prev + 1);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Also refresh when navigating back from detail page
  useEffect(() => {
    if (location.state?.refresh) {
      console.log("🔄 Refresh requested from navigation state");
      setRefreshTrigger(prev => prev + 1);
      // Clear the state so it doesn't refresh again
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);
  
  // Filter transfer orders by search term
  const filteredOrders = transferOrders.filter(order => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.transferOrderNumber || "").toLowerCase().includes(searchLower) ||
      (order.reason || "").toLowerCase().includes(searchLower) ||
      (order.sourceWarehouse || "").toLowerCase().includes(searchLower) ||
      (order.destinationWarehouse || "").toLowerCase().includes(searchLower)
    );
  });
  
  const getStatusBadge = (status) => {
    const statusMap = {
      transferred: { label: "Transferred", className: "bg-[#ecfdf5] text-[#047857]" },
      in_transit: { label: "In Transit", className: "bg-[#fef3c7] text-[#92400e]" },
      draft: { label: "Draft", className: "bg-[#f3f4f6] text-[#6b7280]" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-[#f3f4f6] text-[#6b7280]" };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
        <span className="h-2 w-2 rounded-full bg-current" />
        {statusInfo.label}
      </span>
    );
  };
  
  const transferredCount = transferOrders.filter(o => o.status === "transferred").length;
  const inTransitCount = transferOrders.filter(o => o.status === "in_transit").length;
  const draftCount = transferOrders.filter(o => o.status === "draft").length;

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

  // Handle single delete from checkbox
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
        
        const response = await fetch(`${API_URL}/api/inventory/transfer-orders/${orderId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete transfer order");
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
      
      if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== 'undefined' && userWarehouse !== 'null') {
        params.append("destinationWarehouse", userWarehouse);
        params.append("sourceWarehouse", userWarehouse);
      }
      
      const response = await fetch(`${API_URL}/api/inventory/transfer-orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        let orders = Array.isArray(data) ? data : [];
        
        if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== 'undefined' && userWarehouse !== 'null') {
          const userWarehouseLower = userWarehouse.toLowerCase().trim();
          const userBase = userWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
          
          const matchesWarehouse = (orderWarehouse) => {
            if (!orderWarehouse) return false;
            const orderWarehouseLower = orderWarehouse.toString().toLowerCase().trim();
            const orderBase = orderWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            
            if (orderWarehouseLower === userWarehouseLower) return true;
            if (orderBase && userBase && orderBase === userBase) return true;
            if (orderWarehouseLower.includes(userWarehouseLower) || userWarehouseLower.includes(orderWarehouseLower)) {
              return true;
            }
            return false;
          };
          
          orders = orders.filter(order => {
            const matchesDest = matchesWarehouse(order.destinationWarehouse);
            const matchesSource = matchesWarehouse(order.sourceWarehouse);
            return matchesDest || matchesSource;
          });
        }
        
        setTransferOrders(orders);
      }
      
      setShowDeleteModal(false);
      setDeleteStep(1);
      setOrdersToDelete([]);
      alert(`Successfully deleted ${ordersToDelete.length} transfer order(s)`);
    } catch (error) {
      console.error("Error deleting transfer orders:", error);
      alert(`Error deleting transfer orders: ${error.message}`);
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

  // Handle status change
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus(prev => new Set(prev).add(orderId));
    try {
      const response = await fetch(`${API_URL}/api/inventory/transfer-orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }

      // Refresh the list
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== 'undefined' && userWarehouse !== 'null') {
        params.append("destinationWarehouse", userWarehouse);
        params.append("sourceWarehouse", userWarehouse);
      }
      
      const refreshResponse = await fetch(`${API_URL}/api/inventory/transfer-orders?${params}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        let orders = Array.isArray(data) ? data : [];
        
        if (shouldFilterByWarehouse && userWarehouse && userWarehouse !== 'undefined' && userWarehouse !== 'null') {
          const userWarehouseLower = userWarehouse.toLowerCase().trim();
          const userBase = userWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
          
          const matchesWarehouse = (orderWarehouse) => {
            if (!orderWarehouse) return false;
            const orderWarehouseLower = orderWarehouse.toString().toLowerCase().trim();
            const orderBase = orderWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
            
            if (orderWarehouseLower === userWarehouseLower) return true;
            if (orderBase && userBase && orderBase === userBase) return true;
            if (orderWarehouseLower.includes(userWarehouseLower) || userWarehouseLower.includes(orderWarehouseLower)) {
              return true;
            }
            return false;
          };
          
          orders = orders.filter(order => {
            const matchesDest = matchesWarehouse(order.destinationWarehouse);
            const matchesSource = matchesWarehouse(order.sourceWarehouse);
            
            // Draft orders should only show at source warehouse, not destination
            if (order.status === 'draft' && matchesDest && !matchesSource) {
              return false;
            }
            
            return matchesDest || matchesSource;
          });
        }
        
        setTransferOrders(orders);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert(`Error updating status: ${error.message}`);
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };
  
  return (
    <>
      <Header title="Transfer Orders" />
      <div className="ml-64 min-h-screen bg-[#f8fafc] p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[#1e293b]">
                Transfer Orders
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
              to="/inventory/transfer-orders/new"
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
            placeholder="Search by order number, reason, or warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Transfer Orders Table */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e5e7eb] px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[#4b5563]">
            <span className="font-medium text-[#111827]">Transfer period:</span>
            Last 90 days
          </div>
          <div className="flex items-center gap-3 text-sm text-[#6b7280]">
            <button
              onClick={() => setStatusFilter("transferred")}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                statusFilter === "transferred"
                  ? "bg-[#eef2ff] text-[#4338ca]"
                  : "border border-transparent hover:bg-[#f3f4f6]"
              }`}
            >
              Transferred
              <span className={`rounded-full px-2 py-0.5 shadow-sm ${
                statusFilter === "transferred" ? "bg-white text-[#4338ca]" : "bg-[#e5e7eb] text-[#6b7280]"
              }`}>
                {transferredCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("in_transit")}
              className={`rounded-full border border-transparent px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === "in_transit" ? "bg-[#fef3c7] text-[#92400e]" : "hover:bg-[#f3f4f6]"
              }`}
            >
              In Transit ({inTransitCount})
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`rounded-full border border-transparent px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === "draft" ? "bg-[#f3f4f6] text-[#6b7280]" : "hover:bg-[#f3f4f6]"
              }`}
            >
              Drafts ({draftCount})
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
              <p className="mt-4 text-sm text-[#64748b]">Loading transfer orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#f1f5f9] flex items-center justify-center mb-4">
                <Search className="text-[#94a3b8]" size={24} />
              </div>
              <p className="text-sm font-medium text-[#1e293b] mb-1">
                {searchTerm ? "No transfer orders found" : "No transfer orders yet"}
              </p>
              <p className="text-sm text-[#64748b] mb-4">
                {searchTerm ? "Try adjusting your search" : "Create your first transfer order to get started"}
              </p>
              {!searchTerm && (
                <Link
                  to="/inventory/transfer-orders/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
                >
                  <span>+</span>
                  Create Transfer Order
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
                    Transfer Order #
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Reason
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Status
                    {isAdmin && <span className="ml-1 text-[#94a3b8] text-[10px] normal-case">(Admin)</span>}
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Source Warehouse
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b] border-r border-[#e2e8f0]">
                    Destination Warehouse
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
                    onClick={() => navigate(`/inventory/transfer-orders/${order._id || order.id}`)}
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
                            title="Delete this transfer order"
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
                          navigate(`/inventory/transfer-orders/${order._id || order.id}`);
                        }}
                      >
                        {order.transferOrderNumber || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {order.reason || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-[#e2e8f0]">
                      {isAdmin ? (
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order._id || order.id, e.target.value)}
                          disabled={updatingStatus.has(order._id || order.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={`rounded-full border-0 px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                            order.status === 'draft' 
                              ? 'bg-[#f3f4f6] text-[#6b7280]' 
                              : order.status === 'in_transit'
                              ? 'bg-[#fef3c7] text-[#92400e]'
                              : 'bg-[#ecfdf5] text-[#047857]'
                          }`}
                          style={{
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${order.status === 'draft' ? '%236b7280' : order.status === 'in_transit' ? '%2392400e' : '%23047857'}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            paddingRight: '2rem',
                          }}
                        >
                          <option value="draft" className="bg-white text-[#6b7280]">Draft</option>
                          <option value="in_transit" className="bg-[#fef3c7] text-[#92400e]">In Transit</option>
                          <option value="transferred" className="bg-[#ecfdf5] text-[#047857]">Transferred</option>
                        </select>
                      ) : (
                        getStatusBadge(order.status)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold border-r border-[#e2e8f0]">
                      {parseFloat(order.totalQuantityTransferred || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {order.sourceWarehouse || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#475569] border-r border-[#e2e8f0]">
                      {order.destinationWarehouse || "-"}
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
                      Delete {ordersToDelete.length === 1 ? 'Transfer Order' : `${ordersToDelete.length} Transfer Orders`}?
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748b] mb-6">
                    Are you sure you want to delete {ordersToDelete.length === 1 ? 'this transfer order' : `these ${ordersToDelete.length} transfer orders`}? 
                    {ordersToDelete.some(order => order.status === 'transferred') && (
                      <span className="block mt-2 text-red-600 font-medium">
                        ⚠️ Some orders are already transferred. Stock will be reversed before deletion.
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
                    This action cannot be undone. Are you absolutely sure you want to delete {ordersToDelete.length === 1 ? 'this transfer order' : `these ${ordersToDelete.length} transfer orders`}?
                  </p>
                  {ordersToDelete.length > 0 && (
                    <div className="mb-4 p-3 bg-[#f8fafc] rounded-lg max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-[#64748b] mb-2">Transfer orders to be deleted:</p>
                      <ul className="text-xs text-[#475569] space-y-1">
                        {ordersToDelete.map((order, idx) => (
                          <li key={order._id || order.id || idx}>
                            • {order.transferOrderNumber || `Order-${String(order._id || order.id).slice(-8)}`} - {order.reason || 'No reason'} ({order.status})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="px-4 py-2 text-sm font-medium text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
                      disabled={deleting}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmDeleteStep2}
                      disabled={deleting}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Deleting...
                        </>
                      ) : (
                        'Confirm Delete'
                      )}
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

export default TransferOrders;
