import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Folder, Plus, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Search } from "lucide-react";
import Head from "../components/Head";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import baseUrl from "../api/api";

const columns = [
  { key: "select", label: "" },
  { key: "name", label: "NAME" },
  { key: "sku", label: "SKU" },
  { key: "stock", label: "STOCK ON HAND" },
  { key: "reorder", label: "REORDER POINT" }
];

// Generate skeleton rows for loading state (no mock data)
const generateSkeletonRows = (count = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `skeleton-${i}`,
    name: "",
    items: 0,
    sku: "",
    stock: "",
    reorder: "",
    isSkeleton: true
  }));
};

const ShoeSalesItemGroups = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]); // Start with empty array
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = first confirmation, 2 = second confirmation
  const [deleting, setDeleting] = useState(false);
  const [groupsToDelete, setGroupsToDelete] = useState([]);
  const [accessMessage, setAccessMessage] = useState(""); // Message for non-admin users
  const [searchTerm, setSearchTerm] = useState("");
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  const fetchItemGroups = async () => {
      try {
        setLoading(true);
        // Show skeleton rows while loading
        setRows(generateSkeletonRows(5));
        
        // Get user info for filtering
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
        const userPower = user?.power || "";
        // User is admin if: power === 'admin' OR locCode === '858' (Warehouse) OR locCode === '103' (WAREHOUSE) OR email === 'officerootments@gmail.com'
        const userEmail = user?.email || user?.username || "";
        const adminEmails = ['officerootments@gmail.com'];
        const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
        const isAdmin = isAdminEmail ||
                        user?.power === "admin" || 
                        (user?.locCode && (user.locCode === '858' || user.locCode === '103'));
        
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
            console.log(`Item Groups: Found location by locCode ${user.locCode}: "${location.locName}"`);
          }
        }
        if (!userLocName) {
          userLocName = user?.username || user?.locName || "";
          console.log(`Item Groups: Using username/locName fallback: "${userLocName}"`);
        }
        
        // Use the shared warehouse mapping utility
        const mapLocNameToWarehouse = (locName) => {
          if (!locName) return "";
          return mapWarehouse(locName);
        };
        
        const userWarehouse = mapLocNameToWarehouse(userLocName);
        
        console.log(`Item Groups: Filtering by warehouse: "${userWarehouse}" (isAdmin: ${isAdmin})`);
        
        // Build query string with pagination and user filtering
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });
        
        // Add search term if provided
        if (searchTerm && searchTerm.trim()) {
          queryParams.append('search', searchTerm.trim());
        }
        
        if (userId) queryParams.append('userId', userId);
        if (userPower) queryParams.append('userPower', userPower);
        if (user?.locCode) queryParams.append('locCode', user.locCode);
        // For Warehouse, show all item groups without warehouse filter (main warehouse sees everything)
        // For other users, add warehouse filter
        if (userWarehouse && userWarehouse !== "Warehouse") {
          queryParams.append('warehouse', userWarehouse);
          console.log(`🔍 Item Groups: Sending warehouse filter: "${userWarehouse}"`);
        } else if (userWarehouse === "Warehouse") {
          console.log(`🏢 Item Groups: Warehouse user - showing all item groups without warehouse filter`);
        }
        queryParams.append('isAdmin', isAdmin.toString());
        
        const fullUrl = `${API_URL}/api/shoe-sales/item-groups?${queryParams.toString()}`;
        console.log(`📡 Item Groups: Fetching from: ${fullUrl}`);
        
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
          throw new Error("Failed to fetch item groups");
        }
        
        const data = await response.json();
        
        // Check if there's an access restriction message
        if (data.message) {
          setAccessMessage(data.message);
        } else {
          setAccessMessage("");
        }
        
        // Handle both old format (array) and new format (object with groups and pagination)
        let activeGroups = [];
        if (Array.isArray(data)) {
          activeGroups = data.filter(g => g?.isActive !== false && String(g?.isActive).toLowerCase() !== "false");
          setTotalItems(activeGroups.length);
          setTotalPages(1);
        } else if (data.groups) {
          // New paginated format
          activeGroups = data.groups.filter(g => g?.isActive !== false && String(g?.isActive).toLowerCase() !== "false");
          if (data.pagination) {
            setTotalItems(data.pagination.totalItems || 0);
            setTotalPages(data.pagination.totalPages || 1);
          }
        }
        
        // Transform data to match table format
        const formattedRows = activeGroups.map((group) => {
          // Backend returns items as a number (count), not an array
          const itemCount = typeof group.items === 'number' 
            ? group.items 
            : (Array.isArray(group.items) ? group.items.length : 0);
          
          return {
            id: group._id || group.id,
            name: group.name,
            items: itemCount,
            sku: group.sku || "",
            stock: typeof group.stock === "number" ? group.stock.toFixed(2) : (group.stock || "0.00"),
            reorder: group.reorder || "",
          };
        });
        
        // Show actual data (even if empty array) - don't show skeleton rows when we have a response
        setRows(formattedRows);
        
        console.log(`Item Groups: Received ${activeGroups.length} groups, showing ${formattedRows.length} rows`);
      } catch (error) {
        console.error("Error fetching item groups:", error);
        // On error, show empty array instead of skeleton rows
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchItemGroups();
  }, [currentPage, itemsPerPage, searchTerm]);

  // Handle checkbox change
  const handleCheckboxChange = (groupId, isChecked) => {
    const newSelected = new Set(selectedGroups);
    if (isChecked) {
      newSelected.add(groupId);
    } else {
      newSelected.delete(groupId);
    }
    setSelectedGroups(newSelected);
  };

  // Handle select all checkbox
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allIds = rows.filter(row => row.id && !row.id.startsWith('skeleton-')).map(row => row.id);
      setSelectedGroups(new Set(allIds));
    } else {
      setSelectedGroups(new Set());
    }
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    const selectedIds = Array.from(selectedGroups);
    if (selectedIds.length === 0) return;
    
    const groups = rows.filter(row => {
      const id = row.id;
      return id && selectedIds.includes(id);
    });
    
    setGroupsToDelete(groups);
    setDeleteStep(1);
    setShowDeleteModal(true);
  };

  // Handle single delete from checkbox
  const handleSingleDelete = (group) => {
    const groupId = group.id;
    if (!groupId) return;
    
    setGroupsToDelete([group]);
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
      const deletePromises = groupsToDelete.map(async (group) => {
        const groupId = group.id;
        if (!groupId) return;
        
        const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${groupId}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete item group");
        }
        
        return groupId;
      });

      await Promise.all(deletePromises);
      
      // Remove deleted groups from selected set
      const deletedIds = groupsToDelete.map(g => g.id).filter(Boolean);
      const newSelected = new Set(selectedGroups);
      deletedIds.forEach(id => newSelected.delete(id));
      setSelectedGroups(newSelected);
      
      // Refresh the list
      await fetchItemGroups();
      
      setShowDeleteModal(false);
      setDeleteStep(1);
      setGroupsToDelete([]);
      alert(`Successfully deleted ${groupsToDelete.length} item group(s)`);
    } catch (error) {
      console.error("Error deleting item groups:", error);
      alert(`Error deleting item groups: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setGroupsToDelete([]);
  };

  return (
    <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
      <Head
        title="All Item Groups"
        description="Organize shoe products into logical collections for pricing and reporting."
        actions={
          <div className="flex items-center gap-3">
            {selectedGroups.size > 0 && (
              <button
                onClick={handleDeleteClick}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#dc2626] px-4 text-sm font-medium text-white transition hover:bg-[#b91c1c]"
              >
                <Trash2 size={16} />
                <span>Delete ({selectedGroups.size})</span>
              </button>
            )}
            <PrimaryButton to="/shoe-sales/item-groups/new">
              <Plus size={16} />
              <span>New</span>
            </PrimaryButton>
          </div>
        }
      />

      {loading && (
        <div className="mb-4 text-center text-sm text-[#64748b]">Loading item groups...</div>
      )}

      <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
        {/* View title */}
        <div className="flex items-center justify-between gap-3 border-b border-[#e4e6f2] bg-[#f2f5fb] px-6 py-4">
          <button className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#1f2533]">
            All Item Groups
            <ChevronDown size={14} className="text-[#336ad6]" />
          </button>
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#475569] h-4 w-4" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-10 pr-4 py-2 w-64 rounded-lg border border-[#cbd5f5] text-sm text-[#1f2937] placeholder:text-[#94a3b8] focus:border-[#4285f4] focus:outline-none focus:ring-2 focus:ring-[#4285f4]/10 transition-colors"
              />
            </div>
            <div className="text-sm text-[#475569]">
              {searchTerm ? `${totalItems} matching groups` : `${totalItems} groups`} · Showing newest first
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e6eafb]">
            <thead className="bg-[#f1f4ff]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-6 py-4 text-left text-xs font-semibold tracking-[0.14em] text-[#4a5b8b] uppercase ${column.key === "select" ? "w-14" : ""}`}
                  >
                    {column.key === "select" ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#d7dcf5] text-[#3762f9] focus:ring-[#3762f9] cursor-pointer"
                        checked={rows.length > 0 && rows.filter(row => row.id && !row.id.startsWith('skeleton-')).every(row => selectedGroups.has(row.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#eef2ff] text-sm text-[#1f2937]">
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Folder size={48} className="text-[#cbd5f5]" />
                      {accessMessage ? (
                        <>
                          <p className="text-sm font-medium text-[#64748b]">Access Restricted</p>
                          <p className="text-xs text-[#94a3b8] max-w-md">{accessMessage}</p>
                          <button
                            onClick={() => navigate("/shoe-sales/items")}
                            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#4285f4] rounded-lg hover:bg-[#3367d6] transition-colors"
                          >
                            Go to Items Page
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-[#64748b]">
                            {searchTerm ? "No item groups found" : "No item groups found"}
                          </p>
                          <p className="text-xs text-[#94a3b8]">
                            {searchTerm ? "Try a different search term" : "Create your first item group to get started"}
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id || row.name} className="transition-colors hover:bg-[#f7f9ff]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {row.id && !row.id.startsWith('skeleton-') ? (
                          <>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-[#d7dcf5] text-[#3762f9] focus:ring-[#3762f9] cursor-pointer"
                              checked={selectedGroups.has(row.id)}
                              onChange={(e) => handleCheckboxChange(row.id, e.target.checked)}
                            />
                            {selectedGroups.has(row.id) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleDelete(row);
                                }}
                                className="p-1 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                                title="Delete this item group"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#cbd5f5]" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {row.isSkeleton ? (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e7ebff] animate-pulse">
                            <Folder size={20} className="text-[#cbd5f5]" />
                          </span>
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-[#e7ebff] rounded animate-pulse" />
                            <div className="h-3 w-20 bg-[#f1f4ff] rounded animate-pulse" />
                          </div>
                        </div>
                      ) : row.id && !row.id.startsWith('skeleton-') ? (
                        <Link
                          to={`/shoe-sales/item-groups/${row.id}`}
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e7ebff] text-[#3a50a0]">
                            <Folder size={20} />
                          </span>
                          <div>
                            <p className="font-semibold text-[#1e293b]">{row.name}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#64748b]">
                              {row.items} Items
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e7ebff] text-[#3a50a0]">
                            <Folder size={20} />
                          </span>
                          <div>
                            <p className="font-semibold text-[#1e293b]">{row.name}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#64748b]">
                              {row.items} Items
                            </p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-[#3b4b7a] font-medium">
                      {row.isSkeleton ? (
                        <div className="h-4 w-16 bg-[#e7ebff] rounded animate-pulse" />
                      ) : (
                        row.sku || "—"
                      )}
                    </td>
                    <td className="px-6 py-5 text-[#1f2937] font-semibold">
                      {row.isSkeleton ? (
                        <div className="h-4 w-12 bg-[#e7ebff] rounded animate-pulse" />
                      ) : (
                        row.stock
                      )}
                    </td>
                    <td className="px-6 py-5 text-[#3b4b7a] font-medium">
                      {row.isSkeleton ? (
                        <div className="h-4 w-16 bg-[#e7ebff] rounded animate-pulse" />
                      ) : (
                        row.reorder || "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div className="flex flex-col gap-3 border-t border-[#e4e6f2] bg-[#f7f9ff] px-6 py-4 text-sm text-[#4b5563] md:flex-row md:items-center md:justify-between">
          <div className="font-medium text-[#1f2937]">
            Showing {rows.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} groups
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
                className="rounded-lg border border-[#cbd5f5] px-3 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#cbd5f5] bg-white text-[#1f2937] transition hover:bg-[#f4f4f5] disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`h-8 w-8 rounded-md border text-sm font-medium transition ${
                        currentPage === pageNum
                          ? "border-[#4285f4] bg-[#4285f4] text-white"
                          : "border-[#cbd5f5] bg-white text-[#1f2937] hover:bg-[#f4f4f5]"
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#cbd5f5] bg-white text-[#1f2937] transition hover:bg-[#f4f4f5] disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Delete {groupsToDelete.length === 1 ? 'Item Group' : `${groupsToDelete.length} Item Groups`}?
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748b] mb-6">
                    Are you sure you want to delete {groupsToDelete.length === 1 ? 'this item group' : `these ${groupsToDelete.length} item groups`}? 
                    This action cannot be undone and will also delete all items within {groupsToDelete.length === 1 ? 'this group' : 'these groups'}.
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
                    This action cannot be undone. Are you absolutely sure you want to delete {groupsToDelete.length === 1 ? 'this item group' : `these ${groupsToDelete.length} item groups`}?
                  </p>
                  {groupsToDelete.length > 0 && (
                    <div className="mb-4 p-3 bg-[#f8fafc] rounded-lg max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-[#64748b] mb-2">Item groups to be deleted:</p>
                      <ul className="text-xs text-[#475569] space-y-1">
                        {groupsToDelete.map((group, idx) => (
                          <li key={group.id || idx}>
                            • {group.name} {group.sku ? `(${group.sku})` : ''} - {group.items} items
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
  );
};

export default ShoeSalesItemGroups;

const PrimaryButton = ({ children, to, onClick }) => {
  const Component = to ? Link : "button";
  return (
    <Component
      to={to}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#4285f4] px-4 text-sm font-medium text-white transition hover:bg-[#3367d6] active:bg-[#2851a3]"
    >
      {children}
    </Component>
  );
};

const MutedButton = ({ children }) => (
  <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d2d8e4] bg-white text-[#2f3445] transition hover:bg-[#eef1f7] active:bg-[#e2e6f0]">
    {children}
  </button>
);