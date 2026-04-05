import { useState, useEffect, useRef } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, X, Plus, ChevronDown, Trash2, RefreshCw } from "lucide-react";
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

const Select = ({ className = "", ...props }) => {
  const baseClasses = "w-full rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat pr-8";
  const tableInputClasses = "h-[36px] px-[10px] py-[6px]";
  const defaultClasses = "px-3 py-2.5 h-10";
  
  const isTableInput = className.includes("table-input");
  const finalClasses = `${baseClasses} ${isTableInput ? tableInputClasses : defaultClasses} ${className}`;
  
  return (
    <select
      {...props}
      className={finalClasses}
      style={{
        maxHeight: '40px',
      }}
    />
  );
};

// Compact Dropdown Component for Branch/Reason/Account
const CompactDropdown = ({ value, onChange, options, placeholder = "Select...", required = false }) => {
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
      <div className="rounded-lg shadow-lg bg-white border border-[#d7dcf5] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-2 py-1.5 bg-[#fafbff]">
          <Search size={12} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="h-7 w-full border-none bg-transparent text-xs text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="py-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d3d3d3 #f5f5f5' }}>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#64748b] text-center">No options found</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option === value;
              return (
                <div
                  key={option}
                  onClick={() => {
                    onChange({ target: { value: option } });
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "text-[#1f2937] hover:bg-[#f1f5f9]"
                  }`}
                >
                  {option}
                </div>
              );
            })
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
          className="w-full h-10 rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-pointer px-3 py-2.5 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// ItemDropdown Component
const ItemDropdown = ({ rowId, value, onChange, warehouse, onStockFetched, userWarehouse, isAdmin, selectedWarehouse }) => {
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Fetch items and item groups
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        // Use selectedWarehouse (from branch/warehouse selection) if provided, otherwise fall back to warehouse
        const targetWarehouse = selectedWarehouse || warehouse || (isAdmin ? null : userWarehouse);
        console.log(`📦 ItemDropdown: Fetching items for warehouse: ${targetWarehouse}`, {
          selectedWarehouse,
          warehouse,
          userWarehouse,
          isAdmin
        });
        
        // Build query params for items - filter by warehouse
        const itemsParams = new URLSearchParams({
          page: "1",
          limit: "100"
        });
        if (targetWarehouse) {
          itemsParams.append("warehouse", targetWarehouse);
          itemsParams.append("isAdmin", isAdmin ? "true" : "false");
        }
        
        // Fetch standalone items
        const itemsResponse = await fetch(`${API_URL}/api/shoe-sales/items?${itemsParams}`);
        let itemsList = [];
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          itemsList = Array.isArray(itemsData) ? itemsData : (itemsData.items || []);
        }
        
        // Build query params for item groups - filter by warehouse
        const groupsParams = new URLSearchParams({
          page: "1",
          limit: "100"
        });
        if (targetWarehouse) {
          groupsParams.append("warehouse", targetWarehouse);
          groupsParams.append("isAdmin", isAdmin ? "true" : "false");
        }
        
        // Fetch item groups
        const groupsResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups?${groupsParams}`);
        let groupsList = [];
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          groupsList = Array.isArray(groupsData) ? groupsData : (groupsData.groups || []);
        }
        
        // Flatten items from groups and filter by stock in target warehouse
        const groupItems = [];
        groupsList.forEach(group => {
          if (group.items && Array.isArray(group.items)) {
            group.items.forEach(item => {
              // For inventory adjustments, show ALL items that have the warehouse in their warehouseStocks array
              // (even if stock is 0), OR show all items if no warehouse filter
              const hasWarehouseEntry = (item) => {
                if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) {
                  // If item has no warehouse stocks at all, still show it (we can add stock via adjustment)
                  return true;
                }
                if (!targetWarehouse) return true; // If no warehouse filter, show all
                
                const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
                return item.warehouseStocks.some(ws => {
                  if (!ws.warehouse) return false;
                  const wsWarehouse = ws.warehouse.toString().toLowerCase().trim();
                  
                  // Exact match
                  if (wsWarehouse === targetWarehouseLower) return true;
                  
                  // Base name match (e.g., "vadakara" matches "vadakara branch")
                  const wsBase = wsWarehouse.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
                  const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
                  if (wsBase && targetBase && wsBase === targetBase) return true;
                  
                  // Partial match
                  if (wsWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(wsWarehouse)) {
                    return true;
                  }
                  
                  return false;
                });
              };
              
              // Include items that have the warehouse entry (regardless of stock level)
              if (hasWarehouseEntry(item)) {
                groupItems.push({
                  ...item,
                  _id: item._id || `${group._id}-${item.name}`,
                  itemName: item.name,
                  itemGroupId: group._id,
                  groupName: group.name,
                  isFromGroup: true,
                });
              }
            });
          }
        });
        
        // Filter standalone items - show items that have the warehouse entry (regardless of stock level)
        const filterItemsByWarehouse = (items) => {
          if (!targetWarehouse) return items;
          
          return items.filter(item => {
            // If item has no warehouse stocks, still show it (we can add stock via adjustment)
            if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) {
              return true;
            }
            
            const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
            return item.warehouseStocks.some(ws => {
              if (!ws.warehouse) return false;
              const wsWarehouse = ws.warehouse.toString().toLowerCase().trim();
              
              // Exact match
              if (wsWarehouse === targetWarehouseLower) return true;
              
              // Base name match
              const wsBase = wsWarehouse.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
              const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
              if (wsBase && targetBase && wsBase === targetBase) return true;
              
              // Partial match
              if (wsWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(wsWarehouse)) {
                return true;
              }
              
              return false;
            });
          });
        };
        
        const filteredItemsList = filterItemsByWarehouse(itemsList);
        console.log(`✅ Filtered items: ${filteredItemsList.length} standalone items, ${groupItems.length} group items for warehouse: ${targetWarehouse}`);
        
        setItems([...filteredItemsList, ...groupItems]);
        setItemGroups(groupsList);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [API_URL, userWarehouse, isAdmin, selectedWarehouse, warehouse]);

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

  // Store callback in ref to avoid infinite loops
  const onStockFetchedRef = useRef(onStockFetched);
  useEffect(() => {
    onStockFetchedRef.current = onStockFetched;
  }, [onStockFetched]);

  // Track previous values to prevent duplicate fetches
  const prevItemRef = useRef(null);
  const prevWarehouseRef = useRef(null);

  // Fetch stock when item and warehouse are selected
  useEffect(() => {
    // Check if item or warehouse actually changed
    const itemKey = selectedItem 
      ? (selectedItem.isFromGroup 
          ? `${selectedItem.itemGroupId}-${selectedItem.itemName}-${selectedItem.sku || ''}`
          : selectedItem._id)
      : null;
    
    if (!selectedItem || !warehouse) {
      prevItemRef.current = itemKey;
      prevWarehouseRef.current = warehouse;
      return;
    }
    
    // Skip if nothing changed
    if (itemKey === prevItemRef.current && warehouse === prevWarehouseRef.current) {
      return;
    }
    
    // Update refs
    prevItemRef.current = itemKey;
    prevWarehouseRef.current = warehouse;
    
    const fetchStock = async () => {
      try {
        const params = new URLSearchParams({
          warehouse: warehouse,
        });
        
        if (selectedItem.isFromGroup) {
          params.append('itemGroupId', selectedItem.itemGroupId);
          params.append('itemName', selectedItem.itemName);
          if (selectedItem.sku) params.append('itemSku', selectedItem.sku);
        } else {
          params.append('itemId', selectedItem._id);
        }
        
        const response = await fetch(`${API_URL}/api/inventory/adjustments/stock/item?${params}`);
        if (response.ok) {
          const stockData = await response.json();
          
          console.log("📦 Stock data from API:", stockData);
          console.log("📦 Selected item:", selectedItem);
          console.log("📦 Warehouse:", warehouse);
          
          // Get available stock from the API response (which should include warehouseStocks)
          let availableStock = 0;
          
          if (stockData.warehouseStocks && Array.isArray(stockData.warehouseStocks)) {
            // Use warehouse mapping to normalize warehouse name
            const normalizedWarehouse = mapWarehouse(warehouse || "");
            const warehouseLower = normalizedWarehouse.toLowerCase().trim();
            console.log("🔍 Looking for warehouse:", warehouseLower);
            console.log("📍 Available warehouses:", stockData.warehouseStocks.map(ws => ws.warehouse));
            
            const matchingStock = stockData.warehouseStocks.find(ws => {
              if (!ws.warehouse) return false;
              
              // Normalize the stock warehouse name using the same mapping
              const normalizedStockWarehouse = mapWarehouse(ws.warehouse.toString());
              const wsLower = normalizedStockWarehouse.toLowerCase().trim();
              
              const isMatch = wsLower === warehouseLower || wsLower.includes(warehouseLower) || warehouseLower.includes(wsLower);
              console.log(`   Checking warehouse: "${ws.warehouse}" (${wsLower}) vs target: "${warehouse}" (${warehouseLower}) - Match: ${isMatch}`);
              return isMatch;
            });
            
            if (matchingStock) {
              const stockOnHand = parseFloat(matchingStock.stockOnHand) || 0;
              availableStock = stockOnHand;
              console.log(`✅ Found matching warehouse: ${matchingStock.warehouse}, Stock on Hand: ${availableStock}`);
            } else {
              console.log("❌ No matching warehouse found");
              // If no match, try to use the first warehouse with stock
              if (stockData.warehouseStocks.length > 0) {
                const firstWarehouse = stockData.warehouseStocks[0];
                const stockOnHand = parseFloat(firstWarehouse.stockOnHand) || 0;
                if (stockOnHand > 0) {
                  availableStock = stockOnHand;
                  console.log(`⚠️ Using first warehouse with stock: ${firstWarehouse.warehouse}, Stock: ${availableStock}`);
                }
              }
            }
          } else if (selectedItem.warehouseStocks && Array.isArray(selectedItem.warehouseStocks)) {
            // Fallback to selectedItem if API response doesn't have warehouseStocks
            // Use warehouse mapping to normalize warehouse name
            const normalizedWarehouse = mapWarehouse(warehouse || "");
            const warehouseLower = normalizedWarehouse.toLowerCase().trim();
            
            const matchingStock = selectedItem.warehouseStocks.find(ws => {
              if (!ws.warehouse) return false;
              
              // Normalize the stock warehouse name using the same mapping
              const normalizedStockWarehouse = mapWarehouse(ws.warehouse.toString());
              const wsLower = normalizedStockWarehouse.toLowerCase().trim();
              
              return wsLower === warehouseLower || wsLower.includes(warehouseLower) || warehouseLower.includes(wsLower);
            });
            if (matchingStock) {
              const stockOnHand = parseFloat(matchingStock.stockOnHand) || 0;
              availableStock = stockOnHand;
            }
          }
          
          console.log(`📊 Final available stock: ${availableStock}`);
          
          if (onStockFetchedRef.current) {
            // Use availableStock if found, otherwise fall back to API response
            onStockFetchedRef.current(availableStock || stockData.currentQuantity || 0, stockData.currentValue || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching stock:", error);
      }
    };
    
    fetchStock();
  }, [selectedItem, warehouse, API_URL]); // Removed onStockFetched from dependencies

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

  const filteredItems = items.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const itemName = (item.itemName || "").toLowerCase();
    const sku = (item.sku || "").toLowerCase();
    return itemName.includes(searchLower) || sku.includes(searchLower);
  });

  const handleSelectItem = (item) => {
    onChange(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  const getStockOnHand = (item) => {
    if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return 0;
    
    // Use selectedWarehouse (from branch/warehouse selection) if provided, otherwise fall back to warehouse
    const targetWarehouse = selectedWarehouse || warehouse;
    
    if (!targetWarehouse) {
      // If no target warehouse, sum all (fallback)
    return item.warehouseStocks.reduce((sum, ws) => {
      const stock = typeof ws.stockOnHand === 'number' ? ws.stockOnHand : 0;
      return sum + stock;
    }, 0);
    }
    
    // Find stock for the specific warehouse using warehouse mapping
    // Use warehouse mapping to normalize target warehouse name
    const normalizedTargetWarehouse = mapWarehouse(targetWarehouse);
    const targetWarehouseLower = normalizedTargetWarehouse.toLowerCase().trim();
    
    const warehouseStock = item.warehouseStocks.find(ws => {
      if (!ws.warehouse) return false;
      
      // Normalize the stock warehouse name using the same mapping
      const normalizedStockWarehouse = mapWarehouse(ws.warehouse.toString());
      const wsWarehouse = normalizedStockWarehouse.toLowerCase().trim();
      
      // Exact match
      if (wsWarehouse === targetWarehouseLower) return true;
      
      // Base name match (e.g., "kannur" matches "kannur branch")
      const wsBase = wsWarehouse.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
      const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
      if (wsBase && targetBase && wsBase === targetBase) return true;
      
      // Partial match
      if (wsWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(wsWarehouse)) {
        return true;
      }
      
      return false;
    });
    
    if (warehouseStock) {
      return typeof warehouseStock.stockOnHand === 'number' ? warehouseStock.stockOnHand : 0;
    }
    
    return 0;
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
      <div className="rounded-xl shadow-xl bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: '500px', maxWidth: '90vw' }}>
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
        <div className="py-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#64748b]">
              {searchTerm ? "No items found" : "No items available"}
            </div>
          ) : (
            filteredItems.map((item) => {
              const stockOnHand = getStockOnHand(item);
              const isSelected = (typeof value === 'object' && value?._id === item._id) || 
                                 (typeof value === 'string' && value === (item.itemName || item._id));
              
              return (
                <div
                  key={item._id}
                  onClick={() => handleSelectItem(item)}
                  className={`px-4 py-3 cursor-pointer transition-colors border-b border-[#f1f5f9] ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "text-[#1f2937] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                        {item.itemName || "Unnamed Item"}
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                        {item.isFromGroup && `Group: ${item.groupName} • `}
                        SKU: {item.sku || "N/A"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <div className={`text-xs ${isSelected ? "text-white/80" : "text-[#64748b]"}`}>
                        Stock on Hand
                      </div>
                      <div className={`text-sm font-medium mt-0.5 ${isSelected ? "text-white" : "text-[#10b981]"}`}>
                        {stockOnHand.toFixed(2)} pcs
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative w-full overflow-visible m-0 p-0">
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

const InventoryAdjustmentCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  
  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const isAdmin = user?.power === "admin";
  
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
  
  // Helper function to map locName to warehouse name
  // Use the shared warehouse mapping utility
  const mapLocNameToWarehouse = (locName) => {
    if (!locName) return "";
    return mapWarehouse(locName);
  };
  
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  
  // Form state
  const [adjustmentType, setAdjustmentType] = useState("quantity");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceNumberLoading, setReferenceNumberLoading] = useState(false);
  const [date, setDate] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
  });
  const [account, setAccount] = useState("Cost of Goods Sold");
  const [reason, setReason] = useState("");
  const [branch, setBranch] = useState("Head Office");
  // Set warehouse to user's warehouse if not admin, otherwise default to "Warehouse"
  const [warehouse, setWarehouse] = useState(() => {
    if (!isAdmin && userWarehouse) {
      return userWarehouse;
    }
    return "Warehouse";
  });
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  
  // Table rows
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      item: null,
      itemId: null,
      itemGroupId: null,
      itemName: "",
      itemSku: "",
      currentQuantity: 0,
      currentValue: 0,
      quantityAdjusted: "",
      newQuantity: "",
      unitCost: "",
      valueAdjusted: "",
      newValue: "",
    },
  ]);
  
  // Account options
  const accountOptions = [
    "Cost of Goods Sold",
    "Inventory Write-Offs",
    "Inventory Adjustments",
    "Expense",
    "Other Expenses",
  ];
  
  // Reason options
  const reasonOptions = [
    "Stock Taking",
    "Damage",
    "Loss",
    "Theft",
    "Sales Return",
    "Inventory Revaluation",
    "Other",
  ];
  
  // Warehouse options
  const warehouseOptions = [
    "Warehouse",
    "Main Warehouse",
    "Head Office",
  ];
  
  // Branch options
  const branchOptions = [
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
    "Warehouse",
  ];
  
  // Refetch stock when warehouse changes (only for existing items, NOT in edit mode)
  const prevWarehouseRef = useRef(warehouse);
  useEffect(() => {
    // Don't refetch stock when editing - use the stored original quantity from the adjustment
    if (isEditMode) {
      prevWarehouseRef.current = warehouse;
      return;
    }
    
    if (!warehouse || prevWarehouseRef.current === warehouse) {
      prevWarehouseRef.current = warehouse;
      return;
    }
    
    const refetchAllStock = async () => {
      const rowsWithItems = tableRows.filter(row => row.itemName);
      if (rowsWithItems.length === 0) {
        prevWarehouseRef.current = warehouse;
        return;
      }
      
      for (const row of rowsWithItems) {
        try {
          const params = new URLSearchParams({
            warehouse: warehouse,
          });
          
          if (row.itemGroupId) {
            params.append('itemGroupId', row.itemGroupId);
            params.append('itemName', row.itemName);
            if (row.itemSku) params.append('itemSku', row.itemSku);
          } else if (row.itemId) {
            params.append('itemId', row.itemId);
          }
          
          const response = await fetch(`${API_URL}/api/inventory/adjustments/stock/item?${params}`);
          if (response.ok) {
            const stockData = await response.json();
            
            // Get stock using the same logic as ItemDropdown
            let availableStock = 0;
            
            if (stockData.warehouseStocks && Array.isArray(stockData.warehouseStocks)) {
              // Use warehouse mapping to normalize warehouse name
              const normalizedWarehouse = mapWarehouse(warehouse || "");
              const warehouseLower = normalizedWarehouse.toLowerCase().trim();
              
              const matchingStock = stockData.warehouseStocks.find(ws => {
                if (!ws.warehouse) return false;
                
                // Normalize the stock warehouse name using the same mapping
                const normalizedStockWarehouse = mapWarehouse(ws.warehouse.toString());
                const wsLower = normalizedStockWarehouse.toLowerCase().trim();
                
                return wsLower === warehouseLower || wsLower.includes(warehouseLower) || warehouseLower.includes(wsLower);
              });
              
              if (matchingStock) {
                availableStock = parseFloat(matchingStock.stockOnHand) || 0;
              } else {
                // Fallback: use first warehouse with stock
                if (stockData.warehouseStocks.length > 0) {
                  const firstWarehouse = stockData.warehouseStocks[0];
                  availableStock = parseFloat(firstWarehouse.stockOnHand) || 0;
                }
              }
            }
            
            setTableRows(prevRows =>
              prevRows.map(r => {
                if (r.id === row.id) {
                  return {
                    ...r,
                    currentQuantity: availableStock,
                    currentValue: stockData.currentValue || 0,
                    newQuantity: (availableStock).toString(),
                  };
                }
                return r;
              })
            );
          }
        } catch (error) {
          console.error(`Error fetching stock for row ${row.id}:`, error);
        }
      }
      
      prevWarehouseRef.current = warehouse;
    };
    
    refetchAllStock();
  }, [warehouse, API_URL, tableRows.length, isEditMode]); // Added isEditMode dependency
  
  // Auto-generate reference number on mount (if not in edit mode)
  useEffect(() => {
    if (!isEditMode) {
      const generateReferenceNumber = async () => {
        console.log("🔄 Auto-generating reference number...");
        setReferenceNumberLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/inventory/adjustments/next-reference`);
          console.log("📡 Reference number API response:", response.status);
          if (response.ok) {
            const data = await response.json();
            console.log("✅ Generated reference number:", data.referenceNumber);
            if (data.referenceNumber) {
              setReferenceNumber(data.referenceNumber);
            }
          } else {
            const errorText = await response.text();
            console.error("❌ Failed to generate reference number:", response.status, errorText);
          }
        } catch (error) {
          console.error("❌ Error generating reference number:", error);
        } finally {
          setReferenceNumberLoading(false);
        }
      };
      // Only generate if reference number is empty
      if (!referenceNumber || referenceNumber.trim() === "") {
        generateReferenceNumber();
      }
    }
  }, [isEditMode]); // Only run once on mount when not in edit mode

  // Map branch to warehouse when branch changes
  useEffect(() => {
    if (branch) {
      // Use the warehouse mapping utility to convert branch name to warehouse name
      let mappedWarehouse = mapLocNameToWarehouse(branch);
      
      // Special handling: Head Office should map to Warehouse for inventory adjustments
      if (branch === "Head Office" || mappedWarehouse === "Head Office") {
        mappedWarehouse = "Warehouse";
      }
      
      // If mapping doesn't work, use branch name as-is
      if (!mappedWarehouse) {
        mappedWarehouse = branch;
      }
      
      // Only update if different to avoid infinite loops
      if (mappedWarehouse && mappedWarehouse.trim() !== (warehouse || "").trim()) {
        console.log(`🔄 Branch changed: ${branch} → Warehouse: ${mappedWarehouse}`);
        setWarehouse(mappedWarehouse);
      }
    }
  }, [branch]); // Only depend on branch, not warehouse to avoid loops

  // Load adjustment data if in edit mode
  useEffect(() => {
    if (isEditMode && id && id !== "undefined") {
      const loadAdjustment = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/inventory/adjustments/${id}`);
          if (!response.ok) throw new Error("Failed to load adjustment");
          const data = await response.json();
          
          setAdjustmentType(data.adjustmentType || "quantity");
          setReferenceNumber(data.referenceNumber || "");
          setDate(data.date ? new Date(data.date).toISOString().split('T')[0] : date);
          setAccount(data.account || "Cost of Goods Sold");
          setReason(data.reason || "");
          setBranch(data.branch || "Head Office");
          setWarehouse(data.warehouse || "Warehouse");
          setDescription(data.description || "");
          
          if (data.items && Array.isArray(data.items)) {
            const rows = data.items.map((item, index) => {
              // When editing, we need to show the ORIGINAL quantity before the adjustment
              // The stored currentQuantity is the original quantity BEFORE adjustment
              // So we use it directly - no need to reverse
              const originalQuantity = item.currentQuantity || 0;
              const quantityAdjusted = parseFloat(item.quantityAdjusted) || 0;
              
              // Calculate what the new quantity should be based on original + adjustment
              // This ensures the display matches what was saved
              const calculatedNewQuantity = originalQuantity + quantityAdjusted;
              
              return {
                id: index + 1,
                item: { _id: item.itemId, itemName: item.itemName },
                itemId: item.itemId,
                itemGroupId: item.itemGroupId,
                itemName: item.itemName,
                itemSku: item.itemSku || "",
                // Use the ORIGINAL quantity (before adjustment) as currentQuantity
                currentQuantity: originalQuantity,
                currentValue: item.currentValue || 0,
                quantityAdjusted: item.quantityAdjusted?.toString() || "",
                // Use the calculated new quantity to match what was saved
                newQuantity: calculatedNewQuantity.toString(),
                unitCost: item.unitCost?.toString() || "",
                valueAdjusted: item.valueAdjusted?.toString() || "",
                newValue: item.newValue?.toString() || "",
              };
            });
            setTableRows(rows.length > 0 ? rows : [{ id: 1, item: null, itemId: null, itemGroupId: null, itemName: "", itemSku: "", currentQuantity: 0, currentValue: 0, quantityAdjusted: "", newQuantity: "", unitCost: "", valueAdjusted: "", newValue: "" }]);
          }
        } catch (error) {
          console.error("Error loading adjustment:", error);
          alert("Failed to load adjustment");
          navigate("/inventory/adjustments");
        } finally {
          setLoading(false);
        }
      };
      loadAdjustment();
    } else if (isEditMode && (!id || id === "undefined")) {
      console.error("Invalid adjustment ID:", id);
      alert("Invalid adjustment ID");
      navigate("/inventory/adjustments");
    }
  }, [isEditMode, id, API_URL, navigate, date]);
  
  // Handle regenerate reference number
  const handleRegenerateReferenceNumber = async () => {
    setReferenceNumberLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/inventory/adjustments/next-reference`);
      if (response.ok) {
        const data = await response.json();
        setReferenceNumber(data.referenceNumber || "");
      }
    } catch (error) {
      console.error("Error generating reference number:", error);
      alert("Failed to generate reference number");
    } finally {
      setReferenceNumberLoading(false);
    }
  };

  // Handle item selection
  const handleItemSelect = (rowId, item) => {
    setTableRows(rows =>
      rows.map(row => {
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
      })
    );
  };
  
  // Listen for stock updates from purchase receive, bills, transfer orders, etc.
  useEffect(() => {
    const handleStockUpdated = (event) => {
      console.log("📦 Stock updated event received in inventory adjustment, refreshing stock data...", event.detail);
      console.log("📦 Current warehouse in adjustment:", warehouse);
      
      // Refresh stock for all items in the table
      const rowsWithItems = tableRows.filter(row => row.itemName);
      if (rowsWithItems.length === 0) {
        console.log("📦 No items with names in table, skipping refresh");
        return;
      }
      
      for (const row of rowsWithItems) {
        try {
          const params = new URLSearchParams({
            warehouse: warehouse,
          });
          
          if (row.itemGroupId) {
            params.append('itemGroupId', row.itemGroupId);
            params.append('itemName', row.itemName);
            if (row.itemSku) params.append('itemSku', row.itemSku);
          } else if (row.itemId) {
            params.append('itemId', row.itemId);
          }
          
          console.log(`📦 Fetching stock for ${row.itemName} with params:`, Object.fromEntries(params));
          
          fetch(`${API_URL}/api/inventory/adjustments/stock/item?${params}`)
            .then(res => res.json())
            .then(stockData => {
              console.log(`✅ Refreshed stock for ${row.itemName}:`, stockData);
              console.log(`📍 Available warehouses in response:`, stockData.warehouseStocks?.map(ws => ws.warehouse));
              
              // Update the row with new stock data
              setTableRows(rows =>
                rows.map(r => {
                  if (r.id === row.id) {
                    let availableStock = 0;
                    let matchedWarehouse = null;
                    
                    if (stockData.warehouseStocks && Array.isArray(stockData.warehouseStocks)) {
                      // Use warehouse mapping to normalize warehouse name
                      const normalizedWarehouse = mapWarehouse(warehouse || "");
                      const warehouseLower = normalizedWarehouse.toLowerCase().trim();
                      console.log(`🔍 Looking for warehouse: "${warehouse}" (normalized: "${warehouseLower}")`);
                      
                      const matchingStock = stockData.warehouseStocks.find(ws => {
                        if (!ws.warehouse) return false;
                        
                        // Normalize the stock warehouse name using the same mapping
                        const normalizedStockWarehouse = mapWarehouse(ws.warehouse.toString());
                        const wsLower = normalizedStockWarehouse.toLowerCase().trim();
                        
                        const matches = wsLower === warehouseLower || wsLower.includes(warehouseLower) || warehouseLower.includes(wsLower);
                        console.log(`   Checking "${ws.warehouse}" (normalized: "${wsLower}") - matches: ${matches}`);
                        return matches;
                      });
                      
                      if (matchingStock) {
                        availableStock = parseFloat(matchingStock.stockOnHand) || 0;
                        matchedWarehouse = matchingStock.warehouse;
                        console.log(`✅ Found matching warehouse: "${matchedWarehouse}", Stock: ${availableStock}`);
                      } else {
                        console.log(`❌ No matching warehouse found for "${warehouse}"`);
                        // If no match, try to use the first warehouse with stock
                        if (stockData.warehouseStocks.length > 0) {
                          const firstWarehouse = stockData.warehouseStocks[0];
                          const stockOnHand = parseFloat(firstWarehouse.stockOnHand) || 0;
                          if (stockOnHand > 0) {
                            availableStock = stockOnHand;
                            matchedWarehouse = firstWarehouse.warehouse;
                            console.log(`⚠️ Using first warehouse with stock: "${matchedWarehouse}", Stock: ${availableStock}`);
                          }
                        }
                      }
                    }
                    
                    return {
                      ...r,
                      currentQuantity: availableStock,
                      currentValue: stockData.currentValue || 0,
                      newQuantity: (availableStock + (parseFloat(r.quantityAdjusted) || 0)).toString(),
                    };
                  }
                  return r;
                })
              );
            })
            .catch(err => console.error(`Error refreshing stock for ${row.itemName}:`, err));
        } catch (error) {
          console.error("Error refreshing stock:", error);
        }
      }
    };
    
    window.addEventListener("stockUpdated", handleStockUpdated);
    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdated);
    };
  }, [tableRows, warehouse, API_URL]);

  // Handle stock fetched
  const handleStockFetched = (rowId) => (currentQuantity, currentValue) => {
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          // In edit mode, don't overwrite currentQuantity if it's already set from the adjustment record
          // This preserves the original quantity before the adjustment
          const shouldPreserveQuantity = isEditMode && row.currentQuantity !== undefined && row.currentQuantity !== 0;
          
          return {
            ...row,
            // Only update currentQuantity if not in edit mode or if it's not already set
            currentQuantity: shouldPreserveQuantity ? row.currentQuantity : currentQuantity,
            currentValue: shouldPreserveQuantity ? row.currentValue : currentValue,
            // Calculate newQuantity based on preserved currentQuantity + adjustment
            newQuantity: shouldPreserveQuantity 
              ? (row.currentQuantity + (parseFloat(row.quantityAdjusted) || 0)).toString()
              : currentQuantity.toString(),
          };
        }
        return row;
      })
    );
  };
  
  // Handle quantity adjusted change
  const handleQuantityAdjustedChange = (rowId, value) => {
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          const adjusted = parseFloat(value) || 0;
          const newQty = Math.max(0, row.currentQuantity + adjusted);
          return {
            ...row,
            quantityAdjusted: value,
            newQuantity: newQty.toString(),
          };
        }
        return row;
      })
    );
  };
  
  // Handle new quantity change (for value adjustment)
  const handleNewQuantityChange = (rowId, value) => {
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          const newQty = parseFloat(value) || 0;
          const unitCost = parseFloat(row.unitCost) || 0;
          const newVal = newQty * unitCost;
          const adjusted = newVal - row.currentValue;
          return {
            ...row,
            newQuantity: value,
            newValue: newVal.toFixed(2),
            valueAdjusted: adjusted.toFixed(2),
          };
        }
        return row;
      })
    );
  };
  
  // Handle unit cost change
  const handleUnitCostChange = (rowId, value) => {
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          const unitCost = parseFloat(value) || 0;
          const newQty = parseFloat(row.newQuantity) || row.currentQuantity;
          const newVal = newQty * unitCost;
          const adjusted = newVal - row.currentValue;
          return {
            ...row,
            unitCost: value,
            newValue: newVal.toFixed(2),
            valueAdjusted: adjusted.toFixed(2),
          };
        }
        return row;
      })
    );
  };
  
  // Add new row
  const handleAddRow = () => {
    setTableRows(rows => [
      ...rows,
      {
        id: Date.now(),
        item: null,
        itemId: null,
        itemGroupId: null,
        itemName: "",
        itemSku: "",
        currentQuantity: 0,
        currentValue: 0,
        quantityAdjusted: "",
        newQuantity: "",
        unitCost: "",
        valueAdjusted: "",
        newValue: "",
      },
    ]);
  };
  
  // Delete row
  const handleDeleteRow = (rowId) => {
    setTableRows(rows => rows.filter(row => row.id !== rowId));
  };
  
  // Save adjustment
  const handleSave = async (status = "draft") => {
    // Validate
    if (!date || !warehouse || !account || !reason) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (tableRows.length === 0 || !tableRows.some(row => row.itemName)) {
      alert("Please add at least one item");
      return;
    }
    
    setSaving(true);
    try {
      const items = tableRows
        .filter(row => row.itemName)
        .map(row => ({
          itemId: row.itemId,
          itemGroupId: row.itemGroupId,
          itemName: row.itemName,
          itemSku: row.itemSku,
          currentQuantity: row.currentQuantity,
          currentValue: row.currentValue,
          quantityAdjusted: adjustmentType === "quantity" ? parseFloat(row.quantityAdjusted) || 0 : 0,
          newQuantity: parseFloat(row.newQuantity) || row.currentQuantity,
          unitCost: adjustmentType === "value" ? parseFloat(row.unitCost) || 0 : 0,
          valueAdjusted: adjustmentType === "value" ? parseFloat(row.valueAdjusted) || 0 : 0,
          newValue: adjustmentType === "value" ? parseFloat(row.newValue) || 0 : row.currentValue,
        }));
      
      const adjustmentData = {
        adjustmentType,
        referenceNumber,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        account,
        reason,
        branch,
        warehouse,
        description,
        items: items.filter(item => item.itemName), // Only include items with names
        status,
        userId,
      };
      
      const url = isEditMode 
        ? `${API_URL}/api/inventory/adjustments/${id}`
        : `${API_URL}/api/inventory/adjustments`;
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adjustmentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save adjustment");
      }
      
      const savedAdjustment = await response.json();
      
      // Dispatch stock update event if status is "adjusted"
      if (status === "adjusted") {
        const itemIds = items
          .filter(item => item.itemId)
          .map(item => item.itemId);
        
        const itemNames = items
          .filter(item => item.itemName)
          .map(item => item.itemName);
        
        console.log("📦 Dispatching stockUpdated event for inventory adjustment", {
          itemIds,
          itemNames,
          warehouse,
          adjustmentId: savedAdjustment.id || savedAdjustment._id
        });
        
        window.dispatchEvent(new CustomEvent("stockUpdated", {
          detail: {
            itemIds,
            items: itemNames,
            warehouse,
            source: "inventory-adjustment",
            adjustmentId: savedAdjustment.id || savedAdjustment._id
          }
        }));
      }
      
      alert(`Adjustment ${isEditMode ? "updated" : "saved"} successfully as ${status === "draft" ? "Draft" : "Adjusted"}`);
      navigate("/inventory/adjustments");
    } catch (error) {
      console.error("Error saving adjustment:", error);
      alert(error.message || "Failed to save adjustment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Enter key to save adjustment
  useEnterToSave(() => handleSave("adjusted"), saving);
  
  if (loading) {
    return (
      <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen flex items-center justify-center">
        <div className="text-[#64748b]">Loading adjustment...</div>
      </div>
    );
  }
  
  return (
    <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
      <Head
        title={isEditMode ? "Edit Adjustment" : "New Adjustment"}
        description=""
        actions={
          <Link
            to="/inventory/adjustments"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5f5] px-4 text-sm font-medium text-[#1f2937] transition hover:bg-white"
          >
            Back to list
          </Link>
        }
      />

      <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_18px_60px_-28px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-[#e6e9f4] px-8 py-5 text-sm text-[#475569]">
          <div className="font-semibold text-lg text-[#1f2937]">
            {isEditMode ? "Edit Adjustment" : "New Adjustment"}
          </div>
        </div>

        <div className="px-8 py-8 space-y-8">
          {/* Mode of adjustment */}
          <section className="grid gap-3 md:grid-cols-[220px_1fr] items-center text-sm text-[#475569]">
            <label className="font-medium text-[#1f2937]">Mode of adjustment</label>
            <div className="flex items-center gap-6 text-sm text-[#1f2937]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="adjustmentType"
                  value="quantity"
                  checked={adjustmentType === "quantity"}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="text-[#3762f9]"
                />
                Quantity Adjustment
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="adjustmentType"
                  value="value"
                  checked={adjustmentType === "value"}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="text-[#3762f9]"
                />
                Value Adjustment
              </label>
            </div>
          </section>

          {/* Form fields */}
          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={referenceNumberLoading ? "Generating..." : (referenceNumber || "")}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={referenceNumberLoading ? "Generating..." : "Enter reference number"}
                  disabled={referenceNumberLoading}
                  className={referenceNumberLoading ? "opacity-50 cursor-not-allowed" : ""}
                />
                <button
                  type="button"
                  onClick={handleRegenerateReferenceNumber}
                  disabled={referenceNumberLoading}
                  className="p-2 text-[#64748b] hover:text-[#1f2937] hover:bg-[#f1f5f9] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate new reference number"
                >
                  <RefreshCw size={18} className={referenceNumberLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label required>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label required>Account</Label>
              <CompactDropdown
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                options={accountOptions}
                placeholder="Select an account"
                required
              />
            </div>
            <div className="space-y-2">
              <Label required>Reason</Label>
              <CompactDropdown
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                options={reasonOptions}
                placeholder="Select a reason"
                required
              />
            </div>
            <div className="space-y-2">
              <Label required>Branch</Label>
              <CompactDropdown
                value={branch}
                onChange={(e) => {
                  const newBranch = e.target.value;
                  console.log(`📍 Branch selected: ${newBranch}`);
                  setBranch(newBranch);
                }}
                options={branchOptions}
                placeholder="Select a branch"
                required
              />
            </div>
            <div className="space-y-2">
              <Label required>Warehouse Name</Label>
              <Select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                required
              >
                {warehouseOptions.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </Select>
            </div>
          </section>

          {/* Description */}
          <section className="space-y-3">
            <Label>Description</Label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#94a3b8] focus:outline-none"
              placeholder="Max. 500 characters"
              maxLength={500}
            />
          </section>

          {/* Items table */}
          <section className="rounded-2xl border border-[#e4e7f1] bg-[#f9fafc]">
            <table className="w-full border-collapse text-sm text-[#1f2937]">
              <thead className="border-b border-[#e2e8f0] text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280] bg-[#f8f9fc]">
                <tr>
                  <th className="px-4 py-3 text-left">Item Details</th>
                  <th className="px-4 py-3 text-left">Quantity Available</th>
                  {adjustmentType === "quantity" ? (
                    <>
                      <th className="px-4 py-3 text-left">New Quantity on Hand</th>
                      <th className="px-4 py-3 text-left">Quantity Adjusted</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left">New Quantity on Hand</th>
                      <th className="px-4 py-3 text-left">Unit Cost</th>
                      <th className="px-4 py-3 text-left">New Value</th>
                      <th className="px-4 py-3 text-left">Value Adjusted</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left w-12"></th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#eef0f8]">
                    <td className="px-4 py-4">
                      <ItemDropdown
                        rowId={row.id}
                        value={row.item}
                        onChange={(item) => handleItemSelect(row.id, item)}
                        warehouse={warehouse}
                        onStockFetched={handleStockFetched(row.id)}
                        userWarehouse={userWarehouse}
                        isAdmin={isAdmin}
                        selectedWarehouse={warehouse}
                      />
                    </td>
                    <td className="px-4 py-4 text-[#64748b]">
                      {row.currentQuantity.toFixed(2)}
                    </td>
                    {adjustmentType === "quantity" ? (
                      <>
                        <td className="px-4 py-4">
                          <Input
                            type="number"
                            className="table-input w-32"
                            value={row.newQuantity}
                            readOnly
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            type="number"
                            className="table-input w-32"
                            value={row.quantityAdjusted}
                            onChange={(e) => handleQuantityAdjustedChange(row.id, e.target.value)}
                            placeholder="Eg. +10, -10"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4">
                          <Input
                            type="number"
                            className="table-input w-32"
                            value={row.newQuantity}
                            onChange={(e) => handleNewQuantityChange(row.id, e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            type="number"
                            className="table-input w-32"
                            value={row.unitCost}
                            onChange={(e) => handleUnitCostChange(row.id, e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-4 text-[#64748b]">
                          {row.newValue || "0.00"}
                        </td>
                        <td className="px-4 py-4 text-[#64748b]">
                          {row.valueAdjusted || "0.00"}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-[#ef4444] hover:text-[#dc2626] transition-colors"
                        title="Delete row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm border-t border-[#e2e8f0]">
              <button
                onClick={handleAddRow}
                className="rounded-md border border-[#d7dcf5] px-3 py-2 text-sm font-medium text-[#475569] transition hover:bg-white flex items-center gap-2"
              >
                <Plus size={16} />
                Add New Row
              </button>
            </div>
          </section>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 border-t border-[#e6e9f4] bg-[#f9fafc] px-8 py-4 text-sm">
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSave("adjusted")}
            disabled={saving}
            className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Convert to Adjusted"}
          </button>
          <Link
            to="/inventory/adjustments"
            className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-white"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InventoryAdjustmentCreate;
