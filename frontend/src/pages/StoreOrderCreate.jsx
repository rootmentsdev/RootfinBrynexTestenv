import { useState, useEffect, useRef, useMemo } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, X, Plus, Trash2 } from "lucide-react";
import Head from "../components/Head";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";

const Label = ({ children, required = false }) => (
  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${required ? "text-[#ef4444]" : "text-[#64748b]"}`}>
    {children}
    {required && <span className="ml-0.5">*</span>}
  </span>
);

const Input = ({ placeholder = "", className = "", ...props }) => {
  const baseClasses = "w-full rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors";
  const tableInputClasses = "h-[36px] px-[10px] py-[6px]";
  const defaultClasses = "px-3 py-2.5";
  
  const isTableInput = className.includes("table-input");
  const finalClasses = `${baseClasses} ${isTableInput ? tableInputClasses : defaultClasses} ${className}`;
  
  return (
    <input
      {...props}
      className={finalClasses}
      placeholder={placeholder}
    />
  );
};

// Warehouse Dropdown Component for Store Warehouse selection
const WarehouseDropdown = ({ value, onChange, options, placeholder = "Select warehouse...", required = false, disabled = false }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  const toggleDropdown = (e) => {
    if (disabled) return;
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabel = value || placeholder;

  const dropdownPortal = isOpen && !disabled ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 999999,
      }}
    >
      <div className="rounded-lg border border-[#d7dcf5] bg-white shadow-lg max-h-60 overflow-y-auto">
        <div className="flex items-center gap-2 p-2 border-b border-[#e2e8f0]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search warehouses..."
            className="flex-1 rounded-md border border-[#d7dcf5] px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#64748b]">No warehouses found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-[#f1f5f9] ${
                  value === option ? "bg-[#eef2ff] text-[#2563eb]" : "text-[#1f2937]"
                }`}
              >
                {option}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full">
        <input
          ref={buttonRef}
          onClick={toggleDropdown}
          type="text"
          readOnly
          value={selectedLabel}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full h-10 rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer px-3 py-2.5 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat ${
            disabled ? "cursor-not-allowed bg-[#f3f4f6] opacity-60" : ""
          }`}
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// ItemDropdown Component for Store Orders - shows items available in store warehouse
const ItemDropdown = ({ rowId, value, onChange, storeWarehouse, onStockFetched, isStoreUser = false, userWarehouse = "" }) => {
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [displayedCount, setDisplayedCount] = useState(20);
  const ITEMS_PER_PAGE = 20;

  // Filter items by warehouse - show ONLY items that have stock in the selected store warehouse
  const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
    if (!targetWarehouse) return [];
    
    // Normalize target warehouse using mapping utility
    const normalizedTarget = mapWarehouse(targetWarehouse);
    const targetWarehouseLower = (normalizedTarget || targetWarehouse).toLowerCase().trim();
    const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
    
    return itemsList.filter(item => {
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return false;
      
      // Find matching warehouse stock
      const matchingStock = item.warehouseStocks.find(ws => {
        if (!ws.warehouse) return false;
        const stockWarehouseRaw = ws.warehouse.toString().trim();
        const normalizedStock = mapWarehouse(stockWarehouseRaw);
        const stockWarehouse = (normalizedStock || stockWarehouseRaw).toLowerCase().trim();
        
        // For store users - NEVER show warehouse stock (confidential)
        if (isStoreUser && (stockWarehouse === "warehouse" || stockWarehouse.includes("warehouse"))) {
          return false;
        }
        
        // Check exact match after normalization
        if (stockWarehouse === targetWarehouseLower) return true;
        
        // Check base name match (e.g., "edappally" matches "edapally branch")
        const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        if (stockBase && targetBase && stockBase === targetBase) return true;
        
        // Partial match - check if warehouse name contains target or vice versa
        if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
          return true;
        }
        
        return false;
      });
      
      // Only return items that have stock in the selected warehouse (stock > 0)
      if (matchingStock) {
        const stockOnHand = parseFloat(matchingStock.stockOnHand) || 0;
        return stockOnHand > 0; // Only show items with available stock
      }
      
      return false;
    });
  };

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      if (!storeWarehouse) {
        setItems([]);
        return;
      }
      
      setLoading(true);
      try {
        const itemsResponse = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
        let itemsList = [];
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          itemsList = Array.isArray(itemsData) ? itemsData : (itemsData.items || itemsData.data || []);
        }
        
        // Fetch item groups
        const groupsResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups?page=1&limit=10000`);
        let groupsList = [];
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          groupsList = Array.isArray(groupsData) ? groupsData : (groupsData.groups || groupsData.data || []);
        }
        
        // Flatten items from groups
        const groupItems = groupsList.flatMap(group => {
          if (!group.items || !Array.isArray(group.items)) return [];
          return group.items.map(item => ({
            ...item,
            isFromGroup: true,
            itemGroupId: group._id || group.id,
            groupName: group.name,
          }));
        });
        
        // Combine standalone items and group items
        const allItems = [...itemsList.filter(i => i?.isActive !== false), ...groupItems];
        
        // Filter active items and by warehouse (only items with stock in selected store)
        const activeItems = allItems.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
        const filteredItems = filterItemsByWarehouse(activeItems, storeWarehouse);
        
        console.log(`🏪 Filtered items for "${storeWarehouse}": ${filteredItems.length} items with available stock`);
        setItems(filteredItems);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [storeWarehouse, API_URL, isStoreUser]);

  useEffect(() => {
    if (value) {
      if (typeof value === 'object' && value !== null) {
        setSelectedItem(value);
      } else if (items.length > 0) {
        const item = items.find((i) => i._id === value || i.itemName === value);
        setSelectedItem(item || null);
      }
    } else {
      setSelectedItem(null);
    }
  }, [value, items]);

  // Fetch stock when item is selected
  const onStockFetchedRef = useRef(onStockFetched);
  useEffect(() => {
    onStockFetchedRef.current = onStockFetched;
  }, [onStockFetched]);

  const prevItemRef = useRef(null);
  const prevWarehouseRef = useRef(null);

  useEffect(() => {
    const itemKey = selectedItem 
      ? (selectedItem.isFromGroup 
          ? `${selectedItem.itemGroupId}-${selectedItem.itemName}-${selectedItem.sku || ''}`
          : selectedItem._id)
      : null;
    
    if (!selectedItem || !storeWarehouse) {
      prevItemRef.current = itemKey;
      prevWarehouseRef.current = storeWarehouse;
      return;
    }
    
    if (itemKey === prevItemRef.current && storeWarehouse === prevWarehouseRef.current) {
      return;
    }
    
    prevItemRef.current = itemKey;
    prevWarehouseRef.current = storeWarehouse;
    
    const fetchStock = async () => {
      try {
        const params = new URLSearchParams({ warehouse: storeWarehouse });
        
        if (selectedItem.isFromGroup) {
          params.append('itemGroupId', selectedItem.itemGroupId);
          params.append('itemName', selectedItem.itemName);
          if (selectedItem.sku) params.append('itemSku', selectedItem.sku);
        } else {
          params.append('itemId', selectedItem._id);
        }
        
        console.log(`🔍 Fetching stock for: ${selectedItem.itemName} in warehouse: ${storeWarehouse}`);
        const response = await fetch(`${API_URL}/api/inventory/store-orders/stock/item?${params}`);
        if (response.ok) {
          const stockData = await response.json();
          const quantity = stockData.currentQuantity ?? stockData.stockOnHand ?? 0;
          console.log(`✅ Stock fetched: ${quantity} units for ${selectedItem.itemName}`);
          if (onStockFetchedRef.current) {
            onStockFetchedRef.current(quantity);
          }
        } else {
          console.warn(`⚠️ Failed to fetch stock for ${selectedItem.itemName}:`, response.status);
          if (onStockFetchedRef.current) {
            onStockFetchedRef.current(0);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching stock:", error);
        if (onStockFetchedRef.current) {
          onStockFetchedRef.current(0);
        }
      }
    };
    
    fetchStock();
  }, [selectedItem, storeWarehouse, API_URL]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 500),
    });
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") return items;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return items.filter((item) => {
      const itemName = (item?.itemName || "").toLowerCase();
      const sku = (item?.sku || "").toLowerCase();
      const groupName = (item?.groupName || "").toLowerCase();
      return itemName.includes(searchLower) || sku.includes(searchLower) || groupName.includes(searchLower);
    });
  }, [items, searchTerm]);

  const handleSelectItem = (item) => {
    onChange(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  const getStockOnHand = (item, warehouse) => {
    if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || !warehouse) return 0;
    
    // Normalize warehouse using mapping utility
    const normalizedWarehouse = mapWarehouse(warehouse);
    const warehouseLower = (normalizedWarehouse || warehouse).toLowerCase().trim();
    const warehouseBase = warehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
    
    const warehouseStock = item.warehouseStocks.find(ws => {
      if (!ws.warehouse) return false;
      const wsWarehouseRaw = ws.warehouse.toString().trim();
      const normalizedWs = mapWarehouse(wsWarehouseRaw);
      const wsWarehouse = (normalizedWs || wsWarehouseRaw).toLowerCase().trim();
      const wsBase = wsWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
      
      // Exact match after normalization
      if (wsWarehouse === warehouseLower) return true;
      
      // Base name match
      if (wsBase && warehouseBase && wsBase === warehouseBase) return true;
      
      // Partial match
      if (wsWarehouse.includes(warehouseLower) || warehouseLower.includes(wsWarehouse)) return true;
      return false;
    });
    
    return warehouseStock?.stockOnHand || 0;
  };

  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 999999,
      }}
    >
      <div className="rounded-xl shadow-xl bg-white border border-[#d7dcf5] flex flex-col" style={{ width: '500px', maxWidth: '90vw', maxHeight: '70vh' }}>
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2.5 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="h-8 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-2 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">
              {searchTerm ? "No items found" : "No items available in this warehouse"}
            </div>
          ) : (
            <>
              {filteredItems.slice(0, displayedCount).map((item) => {
                const isSelected = selectedItem && (
                  (selectedItem._id && selectedItem._id === item._id) ||
                  (selectedItem.itemName && selectedItem.itemName === item.itemName)
                );
                const stockOnHand = getStockOnHand(item, storeWarehouse);
                
                return (
                  <div
                    key={item._id || item.itemName || Math.random()}
                    onClick={() => handleSelectItem(item)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#2563eb] text-white" : "hover:bg-[#f1f5f9]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                          {item.itemName || "Unnamed Item"}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                          {item.isFromGroup && `Group: ${item.groupName || "N/A"} • `}
                          SKU: {item.sku || "N/A"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <div className={`text-xs ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                          Current Stock
                        </div>
                        <div className={`text-sm font-medium mt-0.5 ${isSelected ? "text-white" : Number(stockOnHand) > 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                          {Number(stockOnHand) > 0 ? `${Number(stockOnHand).toFixed(2)} pcs` : "Out of Stock"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredItems.length > displayedCount && (
                <div className="px-4 py-3 border-t border-[#e2e8f0] text-center bg-[#f9faff]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
                    }}
                    className="w-full px-4 py-2.5 text-sm font-medium text-[#2563eb] hover:bg-[#eef2ff] rounded-lg transition-colors"
                  >
                    Load More ({displayedCount} of {filteredItems.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full overflow-visible">
        <input
          ref={buttonRef}
          onClick={toggleDropdown}
          type="text"
          readOnly
          placeholder="Type or click to select an item."
          value={selectedItem ? selectedItem.itemName : ""}
          className="w-full h-[36px] rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer px-[10px] py-[6px]"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const StoreOrderCreate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const isEditMode = !!id;
  
  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const isAdmin = user?.power === "admin";
  const isWarehouseUser = user?.power === "warehouse";
  const isStoreUser = !isAdmin && !isWarehouseUser;
  const userLocCode = user?.locCode || "";
  
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
  
  // Get user's location name and warehouse
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
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderNumberLoading, setOrderNumberLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [storeWarehouse, setStoreWarehouse] = useState("");
  const [tableRows, setTableRows] = useState([{ 
    id: 1, 
    item: null, 
    itemId: null, 
    itemGroupId: null, 
    itemName: "", 
    itemSku: "", 
    currentStock: 0, 
    quantity: "" 
  }]);
  
  // Warehouse options for admin (stores/branches only, exclude Warehouse)
  const storeWarehouseOptions = [
    "Calicut",
    "Chavakkad Branch",
    "Edapally Branch",
    "Edappal Branch",
    "Grooms Trivandrum",
    "Head Office",
    "Kalpetta Branch",
    "Kannur Branch",
    "Kottakkal Branch",
    "Kottayam Branch",
    "Manjery Branch",
    "Palakkad Branch",
    "Perinthalmanna Branch",
    "Perumbavoor Branch",
    "SuitorGuy MG Road",
    "Thrissur Branch",
    "Vadakara Branch",
  ];
  
  // For store users, only show their own warehouse as option
  const availableWarehouseOptions = isStoreUser && userWarehouse 
    ? [userWarehouse] 
    : storeWarehouseOptions;
  
  // Fetch next order number when creating a new order (not in edit mode)
  useEffect(() => {
    const fetchNextOrderNumber = async () => {
      // Only fetch if not in edit mode and order number is not set
      if (isEditMode || orderNumber) return;
      
      try {
        setOrderNumberLoading(true);
        const response = await fetch(`${API_URL}/api/inventory/store-orders/next-number`);
        if (!response.ok) {
          throw new Error("Failed to fetch next order number");
        }
        const data = await response.json();
        if (data.orderNumber) {
          setOrderNumber(data.orderNumber);
        }
      } catch (error) {
        console.error("Error fetching next order number:", error);
        // Fallback to default format if API fails
        setOrderNumber("SO-00001");
      } finally {
        setOrderNumberLoading(false);
      }
    };

    fetchNextOrderNumber();
  }, [isEditMode, API_URL, orderNumber]);

  // Set default store warehouse for store users (read-only for them)
  useEffect(() => {
    if (!isEditMode && !isAdmin && !isWarehouseUser && userWarehouse && !storeWarehouse) {
      setStoreWarehouse(userWarehouse);
      console.log(`📍 Auto-setting store warehouse to user's warehouse: "${userWarehouse}"`);
    }
  }, [isEditMode, isAdmin, isWarehouseUser, userWarehouse, storeWarehouse]);
  
  // Clear selected items when store warehouse changes (only in create mode)
  useEffect(() => {
    if (!isEditMode && storeWarehouse) {
      // Reset all table rows to clear selected items when warehouse changes
      setTableRows([{ 
        id: 1, 
        item: null, 
        itemId: null, 
        itemGroupId: null, 
        itemName: "", 
        itemSku: "", 
        currentStock: 0, 
        quantity: "" 
      }]);
    }
  }, [storeWarehouse, isEditMode]);
  
  // Load store order data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadStoreOrder = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/inventory/store-orders/${id}`);
          if (!response.ok) throw new Error("Failed to load store order");
          const data = await response.json();
          
          setOrderNumber(data.orderNumber || "");
          setDate(data.date ? new Date(data.date).toISOString().split('T')[0] : date);
          setReason(data.reason || "");
          setStoreWarehouse(data.storeWarehouse || "");
          
          if (data.items && Array.isArray(data.items)) {
            const rows = data.items.map((item, index) => ({
              id: index + 1,
              item: { _id: item.itemId, itemName: item.itemName },
              itemId: item.itemId,
              itemGroupId: item.itemGroupId,
              itemName: item.itemName,
              itemSku: item.itemSku || "",
              currentStock: item.currentStock || 0,
              quantity: item.quantity?.toString() || "",
            }));
            setTableRows(rows.length > 0 ? rows : [{ id: 1, item: null, itemId: null, itemGroupId: null, itemName: "", itemSku: "", currentStock: 0, quantity: "" }]);
          }
        } catch (error) {
          console.error("Error loading store order:", error);
          alert("Failed to load store order");
          navigate("/inventory/store-orders");
        } finally {
          setLoading(false);
        }
      };
      loadStoreOrder();
    }
  }, [isEditMode, id, API_URL, navigate, date]);
  
  // Handle item selection
  const handleItemSelect = (rowId, item) => {
    setTableRows(rows => {
      return rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            item: item,
            itemId: item.isFromGroup ? null : item._id,
            itemGroupId: item.itemGroupId || null,
            itemName: item.itemName || "",
            itemSku: item.sku || "",
          };
        }
        return row;
      });
    });
  };
  
  // Handle stock fetched (current stock in store warehouse)
  const handleStockFetched = (rowId) => (currentQuantity) => {
    console.log(`📦 Stock fetched for row ${rowId}: ${currentQuantity} units`);
    setTableRows(rows => {
      return rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            currentStock: currentQuantity,
          };
        }
        return row;
      });
    });
  };
  
  // Handle quantity change
  const handleQuantityChange = (rowId, value) => {
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          return { ...row, quantity: value };
        }
        return row;
      })
    );
  };
  
  // Handle add row
  const handleAddRow = () => {
    const newId = Math.max(...tableRows.map(r => r.id), 0) + 1;
    setTableRows([...tableRows, { 
      id: newId, 
      item: null, 
      itemId: null, 
      itemGroupId: null, 
      itemName: "", 
      itemSku: "", 
      currentStock: 0, 
      quantity: "" 
    }]);
  };
  
  // Handle remove row
  const handleRemoveRow = (rowId) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter(row => row.id !== rowId));
    }
  };
  
  // Handle save - always saves as "pending"
  const handleSave = async () => {
    if (!date || !storeWarehouse) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (tableRows.length === 0 || !tableRows.some(row => row.itemName && parseFloat(row.quantity) > 0)) {
      alert("Please add at least one item with quantity");
      return;
    }
    
    setSaving(true);
    try {
      const items = tableRows
        .filter(row => row.itemName && parseFloat(row.quantity) > 0)
        .map(row => ({
          itemId: row.itemId,
          itemGroupId: row.itemGroupId,
          itemName: row.itemName,
          itemSku: row.itemSku,
          quantity: parseFloat(row.quantity) || 0,
        }));
      
      const orderData = {
        orderNumber: orderNumber || undefined, // Backend will auto-generate if not provided
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reason,
        storeWarehouse,
        items,
        userId,
        locCode: userLocCode || "",
      };
      
      const url = isEditMode 
        ? `${API_URL}/api/inventory/store-orders/${id}`
        : `${API_URL}/api/inventory/store-orders`;
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save store order");
      }
      
      const savedOrder = await response.json();
      alert(`Store order ${isEditMode ? "updated" : "created"} successfully`);
      navigate("/inventory/store-orders");
    } catch (error) {
      console.error("Error saving store order:", error);
      alert(error.message || "Failed to save store order. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  
  // Enter key to save store order
  useEnterToSave(() => handleSave(), saving);
  
  if (loading) {
    return (
      <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen flex items-center justify-center">
        <div className="text-[#64748b]">Loading store order...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#f7f9ff]">
      <Head
        title={isEditMode ? "Edit Store Order" : "New Store Order"}
        description="Request items from warehouse to your store."
        actions={
          <Link
            to="/inventory/store-orders"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5f5] px-4 text-sm font-medium text-[#1f2937] transition hover:bg-white"
          >
            Back to Store Orders
          </Link>
        }
      />

      <div className="ml-64 px-10 pb-16 pt-8">
        <div className="rounded-3xl border border-[#e6ebfa] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1ff] px-10 py-6">
            <div className="space-y-1">
              <h1 className="text-[20px] font-semibold text-[#101828]">
                {isEditMode ? "Edit Store Order" : "New Store Order"}
              </h1>
              <p className="text-sm text-[#6c728a]">
                Add items and quantities to request stock from the warehouse.
              </p>
            </div>
          </div>

          <div className="space-y-12 px-10 py-12">
            <section className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Order Number</Label>
                <div className="flex items-center gap-3 rounded-lg border border-[#d9def1] bg-[#fcfdff] px-4 py-2.5">
                  <input
                    value={orderNumberLoading ? "Generating..." : orderNumber}
                    onChange={(e) => {
                      // Only allow editing if in edit mode, otherwise it's auto-generated
                      if (!isEditMode) return;
                      setOrderNumber(e.target.value);
                    }}
                    placeholder={orderNumberLoading ? "Generating..." : "Auto-generated"}
                    readOnly={!isEditMode}
                    disabled={orderNumberLoading}
                    className={`w-full border-0 bg-transparent text-sm text-[#101828] placeholder:text-[#b0b8d9] focus:ring-0 ${
                      !isEditMode ? "cursor-default" : ""
                    } ${orderNumberLoading ? "opacity-50" : ""}`}
                  />
                  <span className="text-xs text-[#94a3b8] whitespace-nowrap">Auto</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label required>Date</Label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-[#d9def1] bg-[#fcfdff] px-4 py-2.5 text-sm text-[#101828] focus:border-[#94a3b8] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <Label required>Store Warehouse</Label>
                <WarehouseDropdown
                  value={storeWarehouse}
                  onChange={(value) => setStoreWarehouse(value)}
                  options={availableWarehouseOptions}
                  placeholder="Select store warehouse"
                  required
                  disabled={isStoreUser}
                />
                {isStoreUser && (
                  <p className="text-xs text-[#64748b]">This is your store warehouse (read-only)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Destination Warehouse</Label>
                <input
                  type="text"
                  value="Warehouse"
                  readOnly
                  className="w-full rounded-lg border border-[#d9def1] bg-[#f3f4f6] px-4 py-2.5 text-sm text-[#6b7280] cursor-not-allowed"
                />
                <p className="text-xs text-[#64748b]">Orders are always sent to the main Warehouse</p>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Reason</Label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the reason for this order"
                  className="w-full rounded-lg border border-[#d9def1] bg-[#fcfdff] px-4 py-3 text-sm text-[#101828] focus:border-[#94a3b8] focus:outline-none"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#edf1ff] bg-[#fcfdff]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ff] px-8 py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8a94b0]">Items</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse text-sm text-[#111827]">
                  <thead className="bg-white text-[11px] uppercase tracking-[0.28em] text-[#9aa2bd]">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Item Details</th>
                      <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Current Stock (Read-only)</th>
                      <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Quantity Requested</th>
                      <th className="w-12 px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr key={row.id} className="border-t border-[#f0f3ff]">
                        <td className="px-6 py-4">
                          <ItemDropdown
                            rowId={row.id}
                            value={row.item}
                            onChange={(item) => handleItemSelect(row.id, item)}
                            storeWarehouse={storeWarehouse}
                            onStockFetched={handleStockFetched(row.id)}
                            isStoreUser={isStoreUser}
                            userWarehouse={userWarehouse}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="rounded-lg border border-[#edf1ff] bg-[#f9faff] px-4 py-3">
                            <span className="block text-[10px] uppercase tracking-[0.28em] text-[#9ca3af]">
                              Current Stock
                            </span>
                            <span className="mt-1 block text-sm font-semibold text-[#101828]">
                              {Math.round(row.currentStock)} Units
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 rounded-lg border border-[#d9def1] bg-white px-4 py-2.5">
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                              placeholder="0"
                              min="0"
                              step="1"
                              className="w-full border-0 text-right text-sm text-[#101828] focus:ring-0"
                            />
                            <span className="text-xs text-[#98a2b3]">Units</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="text-[#ef4444] transition hover:text-[#dc2626]"
                            onClick={() => handleRemoveRow(row.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-[#edf1ff] px-8 py-4 text-sm">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#cbd5f5] px-4 py-2 text-[#4662ff] hover:bg-[#eef2ff] transition-colors"
                >
                  <Plus size={16} />
                  Add Row
                </button>
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#edf1ff] bg-[#fbfcff] px-10 py-6">
            <button
              onClick={handleSave}
              disabled={saving || !date || !storeWarehouse}
              className="rounded-lg bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#b8ccff]"
            >
              {saving ? "Saving..." : isEditMode ? "Update Order" : "Submit Order"}
            </button>
            <button
              onClick={() => navigate("/inventory/store-orders")}
              disabled={saving}
              className="rounded-lg border border-[#d4dcf4] px-4 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreOrderCreate;
