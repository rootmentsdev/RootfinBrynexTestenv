import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal, Plus, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Search } from "lucide-react";
import Head from "../components/Head";
import Header from "../components/Header";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";

const columns = [
  { key: "select", label: "" },
  { key: "name", label: "NAME" },
  { key: "sku", label: "SKU" },
  { key: "reorder", label: "REORDER LEVEL" }
];

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");

const ShoeSalesItems = () => {
  const skeletonRows = useMemo(() => Array.from({ length: 6 }), []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Get user info for filtering
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  // User is admin if: power === 'admin' OR locCode === '858' (Warehouse) OR locCode === '103' (WAREHOUSE) OR email === 'officerootments@gmail.com'
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com'];
  const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
  const isAdmin = isAdminEmail ||
                  user?.power === "admin" || 
                  (user?.locCode && (user.locCode === '858' || user.locCode === '103'));
  
  // Fallback locations mapping (from Header.jsx)
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
    // Lookup location name by locCode (this is the most reliable)
    const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
    if (location) {
      userLocName = location.locName;
      console.log(`Found location by locCode ${user.locCode}: "${location.locName}"`);
    }
  }
  // Fallback to username/locName if locCode lookup didn't work
  if (!userLocName) {
    userLocName = user?.username || user?.locName || "";
    console.log(`Using username/locName fallback: "${userLocName}"`);
  }
  
  // Helper function to map locName to warehouse name
  // Use the shared warehouse mapping utility
  const mapLocNameToWarehouse = (locName) => {
    if (!locName) {
      console.log("No locName provided, defaulting to empty warehouse");
      return "";
    }
    const warehouse = mapWarehouse(locName);
    console.log(`Mapped locName "${locName}" to warehouse "${warehouse}"`);
    return warehouse;
  };
  
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  
  // Debug logging
  console.log("=== ITEM FILTERING DEBUG ===");
  console.log("User object:", user);
  console.log("Is Admin:", isAdmin);
  console.log("User locCode:", user?.locCode);
  console.log("User locName (from user object):", user?.username || user?.locName);
  console.log("User locName (resolved):", userLocName);
  console.log("Mapped warehouse:", userWarehouse);
  console.log("Will filter by warehouse:", !isAdmin && userWarehouse ? userWarehouse : "NO FILTER (admin or no warehouse)");
  console.log("============================");

  useEffect(() => {
    let ignore = false;

    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build query params
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });
        
        // Add search term if provided
        if (searchTerm && searchTerm.trim()) {
          params.append("search", searchTerm.trim());
        }
        
        // For Warehouse, show all items without warehouse filter (main warehouse sees everything)
        // For other users, add warehouse filter
        if (userWarehouse && userWarehouse !== "Warehouse") {
          params.append("warehouse", userWarehouse);
          console.log(`🔍 Sending warehouse filter: "${userWarehouse}"`);
        } else if (userWarehouse === "Warehouse") {
          console.log(`🏢 Warehouse user - showing all items without warehouse filter`);
        }
        params.append("isAdmin", isAdmin.toString());
        if (user?.power) params.append("userPower", user.power);
        if (user?.locCode) params.append("locCode", user.locCode);
        
        const fullUrl = `${API_ROOT}/api/shoe-sales/items?${params}`;
        console.log(`📡 Fetching items from: ${fullUrl}`);
        
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error("Unable to load items.");
        }
        const data = await response.json();
        if (!ignore) {
          // Handle both old format (array) and new format (object with items and pagination)
          if (Array.isArray(data)) {
            const activeOnly = data.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
            setItems(activeOnly);
            setTotalItems(activeOnly.length);
            setTotalPages(1);
          } else {
            // New paginated format
            const list = Array.isArray(data.items) ? data.items : [];
            console.log("📦 Raw items from API:", list.map(i => ({ name: i.itemName || i.name, _id: i._id, isActive: i.isActive })));
            const activeOnly = list.filter((i) => {
              const isActive = i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false";
              if (!isActive) {
                console.log(`❌ Filtering out "${i.itemName || i.name}" - isActive: ${i?.isActive}`);
              }
              return isActive;
            });
            console.log("✅ Active items after filter:", activeOnly.map(i => ({ name: i.itemName || i.name, _id: i._id })));
            setItems(activeOnly);
            if (data.pagination) {
              setTotalItems(data.pagination.totalItems || 0);
              setTotalPages(data.pagination.totalPages || 1);
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to fetch items.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchItems();

    return () => {
      ignore = true;
    };
  }, [currentPage, itemsPerPage, isAdmin, userWarehouse, searchTerm]);

  // Handle checkbox change
  const handleCheckboxChange = (itemId, isChecked) => {
    const newSelected = new Set(selectedItems);
    if (isChecked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Handle select all checkbox
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allIds = items.filter(item => item._id).map(item => item._id);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;
    
    const itemsToDeleteList = items.filter(item => {
      const id = item._id;
      return id && selectedIds.includes(id);
    });
    
    setItemsToDelete(itemsToDeleteList);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  // Handle single delete from checkbox
  const handleSingleDelete = (item) => {
    const itemId = item._id;
    if (!itemId) return;
    
    setItemsToDelete([item]);
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
      const deletePromises = itemsToDelete.map(async (item) => {
        const itemId = item._id;
        if (!itemId) {
          console.warn("Item missing _id:", item);
          return;
        }
        
        // Check if item is from a group
        const isFromGroup = item.isFromGroup || item.itemGroupId;
        const itemGroupId = item.itemGroupId;
        
        console.log(`Deleting item:`, {
          itemId: itemId,
          itemName: item.itemName || item.name,
          isFromGroup: isFromGroup,
          itemGroupId: itemGroupId
        });
        
        const requestBody = {};
        if (isFromGroup && itemGroupId) {
          // Ensure itemGroupId is a string (handle ObjectId types)
          requestBody.itemGroupId = itemGroupId.toString ? itemGroupId.toString() : String(itemGroupId);
        }
        
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Failed to delete item ${itemId}:`, errorData);
          throw new Error(errorData.message || "Failed to delete item");
        }
        
        return itemId;
      });

      await Promise.all(deletePromises);
      
      // Remove deleted items from selected set
      const deletedIds = itemsToDelete.map(item => item._id).filter(Boolean);
      const newSelected = new Set(selectedItems);
      deletedIds.forEach(id => newSelected.delete(id));
      setSelectedItems(newSelected);
      
      // Refresh the list
      setCurrentPage(1);
      window.location.reload(); // Simple refresh
      
      setShowDeleteModal(false);
      setDeleteStep(1);
      setItemsToDelete([]);
      alert(`Successfully deleted ${itemsToDelete.length} item(s)`);
    } catch (error) {
      console.error("Error deleting items:", error);
      alert(`Error deleting items: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setItemsToDelete([]);
  };

  return (
    <>
      <Header title="Items" />
      <div className="p-8 ml-64 bg-gradient-to-br from-[#f8f9fc] to-[#f0f3f8] min-h-screen">
        <Head
          title="All Items"
          description="Plan and manage your entire shoe catalog."
          actions={
            <div className="flex items-center gap-3">
              {isAdmin && selectedItems.size > 0 && (
                <button
                  onClick={handleDeleteClick}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Trash2 size={16} />
                  <span>Delete ({selectedItems.size})</span>
                </button>
              )}
              {isAdmin && (
              <ActionButton to="/shoe-sales/items/new">
                <Plus size={16} />
                <span>New Item</span>
              </ActionButton>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-lg overflow-hidden">
        {/* Header with filters */}
        <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] bg-gradient-to-r from-[#f9fafb] to-[#f3f4f6] px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#1f2937] to-[#111827]">
              <span className="text-white font-bold text-lg">📦</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Items Catalog</h2>
              <p className="text-xs text-[#6b7280]">
                {searchTerm ? `${totalItems} matching items` : `${totalItems} total items`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6b7280] h-4 w-4" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-10 pr-4 py-2 w-64 rounded-lg border border-[#d1d5db] text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#1f2937] focus:outline-none focus:ring-2 focus:ring-[#1f2937]/10 transition-colors"
              />
          </div>
          <span className="text-sm text-[#6b7280]">Showing newest first</span>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-8 py-4 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-8 py-4 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider ${column.key === "select" ? "w-16" : ""}`}
                  >
                    {column.key === "select" ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[#d1d5db] text-[#1f2937] focus:ring-[#1f2937] cursor-pointer"
                          checked={items.length > 0 && items.every(item => !item._id || selectedItems.has(item._id))}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </div>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {loading
                ? skeletonRows.map((_, idx) => (
                    <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                      <td className="px-8 py-4">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e7eb] bg-[#f3f4f6]" />
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <span className="h-10 w-10 rounded-lg border border-[#e5e7eb] bg-[#f3f4f6]" />
                          <div className="space-y-2">
                            <div className="h-4 w-48 animate-pulse rounded bg-[#e5e7eb]" />
                            <div className="h-3 w-32 animate-pulse rounded bg-[#f3f4f6]" />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-[#e5e7eb]" />
                      </td>
                      <td className="px-8 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-[#e5e7eb]" />
                      </td>
                    </tr>
                  ))
                : items.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-8 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-4xl">📦</div>
                          <p className="text-sm font-medium text-[#6b7280]">
                            {searchTerm ? "No items found" : "No items yet"}
                          </p>
                          <p className="text-xs text-[#9ca3af]">
                            {searchTerm ? "Try a different search term" : "Create a new item to get started"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      // Determine navigation path based on whether item is from a group
                      const itemPath = item.isFromGroup && item.itemGroupId
                        ? `/shoe-sales/item-groups/${item.itemGroupId}/items/${item._id}`
                        : `/shoe-sales/items/${item._id}`;
                      
                      return (
                        <tr key={item._id} className="hover:bg-[#f9fafb] transition-colors border-b border-[#f3f4f6] last:border-b-0">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-[#d1d5db] text-[#1f2937] focus:ring-[#1f2937] cursor-pointer"
                                checked={selectedItems.has(item._id)}
                                onChange={(e) => handleCheckboxChange(item._id, e.target.checked)}
                              />
                              {isAdmin && selectedItems.has(item._id) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSingleDelete(item);
                                  }}
                                  className="p-1 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                                  title="Delete this item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <Link
                              to={itemPath}
                              className="flex items-center gap-3 group"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0f4ff] to-[#e5ebff] border border-[#e5e7eb] group-hover:from-[#e5ebff] group-hover:to-[#dce4ff] transition-colors">
                                <span className="text-[#6366f1] font-semibold text-sm">{(item.itemName || item.name || "?")[0].toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-[#111827] group-hover:text-[#1f2937] truncate">
                                    {item.itemName || item.name}
                                  </p>
                                  {item.isFromGroup && (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex-shrink-0">
                                      Group
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#6b7280] mt-0.5">
                                  {item.brand || item.itemGroupName || "Unbranded"}
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-8 py-4 text-sm font-medium text-[#374151]">{item.sku || "—"}</td>
                          <td className="px-8 py-4 text-sm text-[#6b7280]">{item.reorderPoint || "—"}</td>
                        </tr>
                      );
                    })
                  )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div className="flex flex-col gap-4 border-t border-[#e5e7eb] bg-gradient-to-r from-[#f9fafb] to-[#f3f4f6] px-8 py-5 text-sm md:flex-row md:items-center md:justify-between">
          <div className="text-[#6b7280]">
            Showing <span className="font-semibold text-[#111827]">{items.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0}</span> to <span className="font-semibold text-[#111827]">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-semibold text-[#111827]">{totalItems}</span> items
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[#6b7280]">Per page:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] bg-white hover:border-[#9ca3af] focus:border-[#1f2937] focus:outline-none focus:ring-2 focus:ring-[#1f2937]/10 transition-colors"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:border-[#9ca3af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={loading}
                      className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#1f2937] text-white border border-[#1f2937]"
                          : "border border-[#d1d5db] bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:border-[#9ca3af]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-white text-[#6b7280] hover:bg-[#f3f4f6] hover:border-[#9ca3af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              
              <span className="text-[#6b7280] ml-2">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
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
                      Delete {itemsToDelete.length === 1 ? 'Item' : `${itemsToDelete.length} Items`}?
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748b] mb-6">
                    Are you sure you want to delete {itemsToDelete.length === 1 ? 'this item' : `these ${itemsToDelete.length} items`}? 
                    This action cannot be undone.
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
                    This action cannot be undone. Are you absolutely sure you want to delete {itemsToDelete.length === 1 ? 'this item' : `these ${itemsToDelete.length} items`}?
                  </p>
                  {itemsToDelete.length > 0 && (
                    <div className="mb-4 p-3 bg-[#f8fafc] rounded-lg max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-[#64748b] mb-2">Items to be deleted:</p>
                      <ul className="text-xs text-[#475569] space-y-1">
                        {itemsToDelete.map((item, idx) => (
                          <li key={item._id || idx}>
                            • {item.itemName || item.name} {item.sku ? `(${item.sku})` : ''}
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

export default ShoeSalesItems;

const FloatingField = ({ label, placeholder, inputType = "input", hint, prefix }) => (
  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
    <span className="font-medium">{label}</span>
    {inputType === "textarea" ? (
      <textarea
        placeholder={placeholder}
        rows={3}
        className="rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] placeholder:text-[#94a3b8] focus:border-[#3762f9] focus:outline-none"
      />
    ) : inputType === "select" ? (
      <select className="rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#3762f9] focus:outline-none">
        <option>{placeholder}</option>
      </select>
    ) : (
      <div className="flex items-center rounded-lg border border-[#d7dcf5] focus-within:border-[#3762f9]">
        {prefix && <span className="pl-3 text-xs font-semibold uppercase text-[#64748b]">{prefix}</span>}
        <input
          type="text"
          placeholder={placeholder}
          className="w-full rounded-lg px-3 py-2 text-sm text-[#1f2937] placeholder:text-[#94a3b8] focus:outline-none"
        />
        {hint && <span className="pr-3 text-xs text-[#94a3b8]">{hint}</span>}
      </div>
    )}
  </label>
);

const FloatingCheckbox = ({ label, defaultChecked = false }) => (
  <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm">
    <input
      type="checkbox"
      defaultChecked={defaultChecked}
      className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
    />
    {label}
  </label>
);

const ImagePlaceholder = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M7 15.5L10 12l3 3 4-4 3 3.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
    <circle cx="9" cy="8" r="1.3" fill="currentColor" opacity="0.5" />
  </svg>
);

const FloatingSelect = ({ label, options = [], placeholder }) => (
  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
    <span className="font-medium">{label}</span>
    <select className="rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none">
      {placeholder && <option>{placeholder}</option>}
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
);

const FloatingRadio = ({ name, label, defaultChecked = false }) => (
  <label className="inline-flex items-center gap-2 rounded-full border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm">
    <input
      type="radio"
      name={name}
      defaultChecked={defaultChecked}
      className="text-[#4285f4] focus:ring-[#4285f4]"
    />
    {label}
  </label>
);

const ActionButton = ({ children, to, onClick }) => {
  const Component = to ? Link : "button";
  return (
    <Component
      to={to}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white transition hover:bg-[#1d4ed8] active:bg-[#1e40af]"
    >
      {children}
    </Component>
  );
};
