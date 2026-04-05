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

// Warehouse Dropdown Component
const WarehouseDropdown = ({ value, onChange, options, placeholder = "Select warehouse...", required = false }) => {
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

// ItemDropdown Component - filters items by warehouse (same logic as SalesInvoiceCreate)
const ItemDropdown = ({ rowId, value, onChange, sourceWarehouse, destinationWarehouse, onSourceStockFetched, onDestStockFetched, isStoreUser = false, userWarehouse = "", onFocusChange, isEditMode = false, orderId = null }) => {
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [displayedCount, setDisplayedCount] = useState(20); // Show 20 items initially
  const ITEMS_PER_PAGE = 20;
  
  // Barcode scanning state
  const [inputValue, setInputValue] = useState("");
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const autoSelectTimerRef = useRef(null);

  // Filter items by warehouse (for transfer orders, show ALL items regardless of stock)
  const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
    if (!targetWarehouse) return itemsList;
    
    const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
    
    // If "Warehouse" is selected (main warehouse view), show ALL items - NO FILTERING
    // This shows combined stock from all warehouses
    if (targetWarehouseLower === "warehouse") {
      console.log("🏢 Warehouse selected - showing ALL items without filtering (combined stock)");
      console.log(`   Total items to show: ${itemsList.length}`);
      return itemsList; // Return all items without any filtering
    }
    
    // For specific branches/stores, show ALL items that exist in that warehouse
    // (regardless of stock availability - users might want to transfer zero-stock items)
    const filtered = itemsList.filter(item => {
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
        return false;
      }
      
      return item.warehouseStocks.some(ws => {
        if (!ws.warehouse) return false;
        const stockWarehouseRaw = (ws.warehouse || "").toString().trim();
        const stockWarehouse = stockWarehouseRaw.toLowerCase().trim();
        
        // For store users - NEVER show warehouse stock (confidential)
        if (isStoreUser && (stockWarehouse === "warehouse" || stockWarehouse.includes("warehouse"))) {
          return false;
        }
        
        // For specific branches, show ALL items from that branch (regardless of stock)
        // Check exact match first
        if (stockWarehouse === targetWarehouseLower) {
          return true;
        }
        
        // Check base name match (e.g., "kannur" matches "kannur branch")
        const stockBase = stockWarehouse.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        const targetBase = targetWarehouseLower.replace(/\s*(branch|warehouse|sg|g|z)\s*$/i, "").trim();
        
        if (stockBase && targetBase && stockBase === targetBase) {
          return true;
        }
        
        // Partial match - check if warehouse name contains target or vice versa
        if (stockWarehouse.includes(targetWarehouseLower) || targetWarehouseLower.includes(stockWarehouse)) {
          return true;
        }
        
        return false;
      });
    });
    
    console.log(`🔍 Filtered items for "${targetWarehouse}": ${filtered.length} items`);
    if (filtered.length < 10) {
      console.log(`   Sample warehouse names in data:`, itemsList.slice(0, 5).map(i => i.warehouseStocks?.map(ws => ws.warehouse)));
    }
    
    return filtered;
  };

  // Fetch items (fetch all items and filter client-side like SalesInvoiceCreate)
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        // Fetch all items (no server-side filtering)
        const itemsResponse = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
        let itemsList = [];
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          console.log(`📡 Raw API response:`, itemsData);
          itemsList = Array.isArray(itemsData) ? itemsData : (itemsData.items || itemsData.data || []);
        }
        
        console.log(`📦 Fetched ${itemsList.length} items from API`);
        
        // Filter active items
        const activeItems = itemsList.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
        console.log(`✅ Active items: ${activeItems.length}`);
        
        // Filter by warehouse if source warehouse is selected
        // If no warehouse selected, show no items (user must select warehouse first)
        const filteredItems = sourceWarehouse ? filterItemsByWarehouse(activeItems, sourceWarehouse) : [];
        console.log(`🏢 Items after warehouse filter (${sourceWarehouse || 'none'}): ${filteredItems.length}`);
        
        setItems(filteredItems);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [sourceWarehouse, API_URL]);



  useEffect(() => {
    console.log(`🔄 ItemDropdown: value changed:`, value);
    if (value) {
      if (typeof value === 'object' && value !== null) {
        console.log(`   Setting selectedItem to object:`, value);
        setSelectedItem(value);
      } else if (items.length > 0) {
        const item = items.find((i) => i._id === value || i.itemName === value);
        console.log(`   Found item by ID/name:`, item);
        setSelectedItem(item || null);
      } else {
        console.log(`   Items not loaded yet, clearing selectedItem`);
        setSelectedItem(null);
      }
    } else {
      console.log(`   Value is empty, clearing selectedItem`);
      setSelectedItem(null);
    }
  }, [value, items]);

  // Store callbacks in refs to avoid infinite loops
  const onSourceStockFetchedRef = useRef(onSourceStockFetched);
  const onDestStockFetchedRef = useRef(onDestStockFetched);
  useEffect(() => {
    onSourceStockFetchedRef.current = onSourceStockFetched;
    onDestStockFetchedRef.current = onDestStockFetched;
  }, [onSourceStockFetched, onDestStockFetched]);

  // Track previous values to prevent duplicate fetches
  const prevItemRef = useRef(null);
  const prevSourceWarehouseRef = useRef(null);
  const prevDestWarehouseRef = useRef(null);

  // Fetch stock for both warehouses when item or warehouses change
  useEffect(() => {
    const itemKey = selectedItem 
      ? (selectedItem.isFromGroup 
          ? `${selectedItem.itemGroupId}-${selectedItem.itemName}-${selectedItem.sku || ''}`
          : selectedItem._id)
      : null;
    
    if (!selectedItem) {
      console.log(`⚠️ No item selected, skipping stock fetch`);
      prevItemRef.current = itemKey;
      prevSourceWarehouseRef.current = sourceWarehouse;
      prevDestWarehouseRef.current = destinationWarehouse;
      return;
    }
    
    if (!sourceWarehouse || !destinationWarehouse) {
      console.log(`⚠️ Warehouses not selected (source: "${sourceWarehouse}", dest: "${destinationWarehouse}"), skipping stock fetch`);
      prevItemRef.current = itemKey;
      prevSourceWarehouseRef.current = sourceWarehouse;
      prevDestWarehouseRef.current = destinationWarehouse;
      return;
    }
    
    console.log(`🔄 Triggering stock fetch for item "${selectedItem.itemName}" (source: "${sourceWarehouse}", dest: "${destinationWarehouse}")`);
    
    // Skip if nothing changed
    if (itemKey === prevItemRef.current && 
        sourceWarehouse === prevSourceWarehouseRef.current && 
        destinationWarehouse === prevDestWarehouseRef.current) {
      return;
    }
    
    prevItemRef.current = itemKey;
    prevSourceWarehouseRef.current = sourceWarehouse;
    prevDestWarehouseRef.current = destinationWarehouse;
    
    const fetchStock = async (warehouse, callback) => {
      if (!warehouse) {
        console.warn(`⚠️ No warehouse provided for stock fetch`);
        if (callback) callback(0);
        return;
      }
      
      try {
        const params = new URLSearchParams({ warehouse });
        
        if (selectedItem.isFromGroup) {
          params.append('itemGroupId', selectedItem.itemGroupId);
          params.append('itemName', selectedItem.itemName);
          if (selectedItem.sku) params.append('itemSku', selectedItem.sku);
        } else {
          params.append('itemId', selectedItem._id);
        }
        
        // Exclude current order ID when in edit mode to avoid counting its own draft quantity
        if (isEditMode && orderId) {
          params.append('excludeOrderId', orderId);
        }
        
        const fullUrl = `${API_URL}/api/inventory/transfer-orders/stock/item?${params}`;
        console.log(`\n📡 Fetching stock for "${selectedItem.itemName}" in warehouse "${warehouse}"`);
        console.log(`   URL: ${fullUrl}`);
        console.log(`   Item details:`, {
          isFromGroup: selectedItem.isFromGroup,
          itemId: selectedItem._id,
          itemGroupId: selectedItem.itemGroupId,
          itemName: selectedItem.itemName,
          itemSku: selectedItem.sku
        });
        
        const response = await fetch(fullUrl);
        console.log(`   Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const stockData = await response.json();
          console.log(`✅ Stock data received:`, stockData);
          console.log(`   Current Quantity: ${stockData.currentQuantity || 0}`);
          console.log(`   Stock On Hand: ${stockData.stockOnHand || 0}`);
          console.log(`   In Transit: ${stockData.inTransit || 0}`);
          console.log(`   Available Stock: ${stockData.availableStock || 0}`);
          console.log(`   Success: ${stockData.success}`);
          
          // Pass the full stock data object to callback
          if (callback) {
            console.log(`   ✅ Callback exists, calling it with stock data`);
            callback(stockData);
            console.log(`   ✅ Callback called successfully`);
          } else {
            console.error(`   ❌ No callback provided! Callback is:`, callback);
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to fetch stock (${response.status}):`, errorText);
          try {
            const errorData = JSON.parse(errorText);
            console.error(`   Error details:`, errorData);
          } catch (e) {
            console.error(`   Error is not JSON:`, errorText);
          }
          if (callback) {
            console.log(`   📊 Calling callback with empty stock data due to error`);
            callback({ currentQuantity: 0, stockOnHand: 0, inTransit: 0, draft: 0, availableStock: 0 });
          }
        }
      } catch (error) {
        console.error("❌ Error fetching stock:", error);
        if (callback) callback({ currentQuantity: 0, stockOnHand: 0, inTransit: 0, draft: 0, availableStock: 0 });
      }
    };
    
    // Fetch stock for both warehouses
    console.log(`🚀 About to fetch stock - callbacks:`, {
      onSourceStockFetched: !!onSourceStockFetchedRef.current,
      onDestStockFetched: !!onDestStockFetchedRef.current
    });
    
    fetchStock(sourceWarehouse, onSourceStockFetchedRef.current);
    fetchStock(destinationWarehouse, onDestStockFetchedRef.current);
  }, [selectedItem, sourceWarehouse, destinationWarehouse, API_URL, isEditMode, orderId]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownMaxHeight = 400; // Fixed max height
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    console.log('📍 Dropdown position calculation:', {
      inputTop: rect.top,
      inputBottom: rect.bottom,
      inputLeft: rect.left,
      inputWidth: rect.width,
      viewportHeight,
      spaceBelow,
      spaceAbove
    });
    
    // Always position below the input (Zoho Books style)
    let top = rect.bottom + 4;
    
    // Only position above if there's really not enough space below
    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      top = rect.top - Math.min(dropdownMaxHeight, spaceAbove - 10);
      console.log('⬆️ Positioning above input');
    } else {
      console.log('⬇️ Positioning below input');
    }
    
    setDropdownPos({
      top: top,
      left: rect.left,
      width: rect.width, // Match input field width exactly
    });
    
    console.log('✅ Final dropdown position:', { top, left: rect.left, width: rect.width });
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
    // If no search term, return all items
    if (!searchTerm || searchTerm.trim() === "") {
      console.log(`🔎 No search term → showing all ${items.length} items`);
      return items;
    }
    
    const filtered = items.filter((item) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const itemName = (item?.itemName || "").toLowerCase();
      const sku = (item?.sku || "").toLowerCase();
      const groupName = (item?.groupName || "").toLowerCase();
      
      return itemName.includes(searchLower) || 
             sku.includes(searchLower) || 
             groupName.includes(searchLower);
    });
    console.log(`🔎 Search filter: "${searchTerm}" → ${filtered.length} items (from ${items.length} total)`);
    return filtered;
  }, [items, searchTerm]);

  const handleSelectItem = (item) => {
    console.log(`🎯 handleSelectItem called with:`, item);
    setSelectedItem(item);
    onChange(item);
    setIsOpen(false);
    setSearchTerm("");
    setInputValue("");
  };

  // Auto-select when only one item matches (for barcode scanning)
  useEffect(() => {
    // Only auto-select if:
    // 1. Dropdown is open
    // 2. There's a search term (user typed/scanned something)
    // 3. Exactly 1 filtered item
    // 4. Not already processing
    if (isOpen && searchTerm && searchTerm.length >= 3 && filteredItems.length === 1 && !isProcessingBarcode) {
      console.log(`🎯 AUTO-SELECT: Only 1 item matches "${searchTerm}"`);
      console.log(`   Item:`, filteredItems[0]);
      
      // Auto-select after 300ms to ensure user finished typing
      const timer = setTimeout(() => {
        console.log(`✅ AUTO-SELECTING single match:`, filteredItems[0]);
        setIsProcessingBarcode(true);
        handleSelectItem(filteredItems[0]);
        setTimeout(() => setIsProcessingBarcode(false), 300);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchTerm, filteredItems, isProcessingBarcode]);

  // Reset pagination when search term changes
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    console.log(`🔍 Search term changed: "${searchTerm}", resetting displayedCount to ${ITEMS_PER_PAGE}`);
  }, [searchTerm]);

  // Debug: Log when filteredItems or displayedCount changes
  useEffect(() => {
    console.log(`📊 Dropdown state: displayedCount=${displayedCount}, filteredItems=${filteredItems.length}, showLoadMore=${displayedCount < filteredItems.length}`);
  }, [displayedCount, filteredItems.length]);

  const getStockOnHand = (item, warehouse) => {
    if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks)) return 0;
    if (!warehouse) return 0;
    
    // Normalize warehouse names for matching
    const normalizedWarehouse = mapWarehouse(warehouse);
    const warehouseLower = (normalizedWarehouse || warehouse || "").toLowerCase().trim();
    const warehouseBase = warehouseLower.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
    
    const warehouseStock = item.warehouseStocks.find(ws => {
      if (!ws.warehouse) return false;
      const wsWarehouseRaw = ws.warehouse.toString().trim();
      const normalizedWs = mapWarehouse(wsWarehouseRaw);
      const wsWarehouse = (normalizedWs || wsWarehouseRaw || "").toLowerCase().trim();
      const wsBase = wsWarehouse.replace(/\s*(branch|warehouse)\s*$/i, "").trim();
      
      // Exact match after normalization
      if (wsWarehouse === warehouseLower) return true;
      
      // Base name match
      if (wsBase && warehouseBase && wsBase === warehouseBase) return true;
      
      // Special handling for Trivandrum variations
      const trivandrumVariations = ["trivandrum", "grooms trivandrum", "sg-trivandrum"];
      const wsIsTrivandrum = trivandrumVariations.some(v => wsWarehouse.includes(v));
      const targetIsTrivandrum = trivandrumVariations.some(v => warehouseLower.includes(v));
      if (wsIsTrivandrum && targetIsTrivandrum) return true;
      
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
      <div className="rounded-lg shadow-2xl bg-white border border-[#e5e7eb] flex flex-col" style={{ maxWidth: '100%', maxHeight: '400px' }}>
        <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2 bg-white">
          <Search size={16} className="text-[#9ca3af]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="h-8 w-full border-none bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div 
          className="py-1 overflow-y-auto overflow-x-hidden flex-1" 
          style={{ 
            scrollbarWidth: 'thin', 
            scrollbarColor: '#d1d5db #f9fafb' 
          }}
        >
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-[#6b7280]">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[#6b7280]">
              {searchTerm ? "No items found" : "No items available"}
            </div>
          ) : (
            <>
              {/* Render paginated items */}
              {filteredItems.slice(0, displayedCount).map((item) => {
                try {
                  const isSelected = selectedItem && (
                    (selectedItem._id && selectedItem._id === item._id) ||
                    (selectedItem.itemName && selectedItem.itemName === item.itemName)
                  );
                  // For store users, show stock from their warehouse (or source warehouse if selected)
                  // For admin, show stock from source warehouse
                  const displayWarehouse = (isStoreUser && userWarehouse) ? userWarehouse : (sourceWarehouse || "");
                  const stockOnHand = getStockOnHand(item, displayWarehouse);
                  
                  return (
                    <div
                      key={item._id || item.itemName || Math.random()}
                      onClick={() => handleSelectItem(item)}
                      className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-[#f3f4f6] last:border-b-0 ${
                        isSelected
                          ? "bg-[#eff6ff] text-[#1e40af]"
                          : "hover:bg-[#f9fafb]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${isSelected ? "text-[#1e40af]" : "text-[#111827]"}`}>
                            {item.itemName || "Unnamed Item"}
                          </div>
                          <div className={`text-xs mt-0.5 ${isSelected ? "text-[#3b82f6]" : "text-[#6b7280]"}`}>
                            {item.isFromGroup && `Group: ${item.groupName || "N/A"} • `}
                            SKU: {item.sku || "N/A"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <div className={`text-[10px] uppercase tracking-wider ${isSelected ? "text-[#3b82f6]" : "text-[#9ca3af]"}`}>
                            Current Stock
                          </div>
                          {Number(stockOnHand) > 0 ? (
                            <div className={`text-sm font-semibold mt-0.5 ${isSelected ? "text-[#1e40af]" : "text-[#059669]"}`}>
                              {(Number(stockOnHand) || 0).toFixed(2)} pcs
                            </div>
                          ) : (
                            <div className={`text-sm font-semibold mt-0.5 ${isSelected ? "text-[#dc2626]" : "text-[#dc2626]"}`}>
                              0.00 pcs
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error("Error rendering item:", error, item);
                  return (
                    <div
                      key={item._id || item.itemName || Math.random()}
                      className="px-3 py-2.5 text-red-500 text-sm"
                    >
                      Error loading item: {item.itemName || "Unknown"}
                    </div>
                  );
                }
              })}
              
            </>
          )}
        </div>
        
        {/* Sticky Load More Button - Always visible at bottom */}
        {!loading && filteredItems.length > 0 && displayedCount < filteredItems.length && (
          <div className="sticky bottom-0 px-3 py-2 border-t border-[#e5e7eb] text-center bg-white">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log(`📄 Load More clicked: ${displayedCount} → ${displayedCount + ITEMS_PER_PAGE} of ${filteredItems.length}`);
                setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
              }}
              className="w-full px-3 py-2 text-xs font-medium text-[#2563eb] hover:bg-[#f3f4f6] rounded transition-colors"
            >
              Load More ({displayedCount} of {filteredItems.length})
            </button>
          </div>
        )}
        
        {/* Items count info - Sticky at bottom when all loaded */}
        {!loading && displayedCount >= filteredItems.length && filteredItems.length > 0 && (
          <div className="sticky bottom-0 px-3 py-1.5 border-t border-[#e5e7eb] text-center text-[10px] text-[#6b7280] bg-white">
            Showing all {filteredItems.length} items
          </div>
        )}
      </div>
    </div>
  ) : null;

  // Handle barcode input in the text field
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Clear any existing auto-select timer
    if (autoSelectTimerRef.current) {
      clearTimeout(autoSelectTimerRef.current);
    }
    
    // If user is typing normally, show dropdown with search
    if (value.length > 0) {
      setSearchTerm(value);
      setIsOpen(true);
      
      // Auto-select after 500ms of no input (barcode scanner finishes typing)
      // Increased to 500ms to ensure scanner has finished
      if (value.length >= 3) { // Reduced minimum length to 3
        autoSelectTimerRef.current = setTimeout(() => {
          console.log(`⏱️ ========== AUTO-SELECT TIMER FIRED ==========`);
          console.log(`   Input value: "${value}"`);
          console.log(`   Available items count:`, items.length);
          console.log(`   Items sample:`, items.slice(0, 3).map(i => ({ sku: i.sku, name: i.itemName })));
          
          // Try exact SKU match first
          const exactMatch = items.find(item => 
            item.sku && item.sku.toLowerCase() === value.toLowerCase()
          );
          
          if (exactMatch) {
            console.log(`✅ ========== EXACT SKU MATCH FOUND ==========`);
            console.log(`   Item:`, exactMatch);
            setIsProcessingBarcode(true);
            // Use handleSelectItem for consistent behavior
            handleSelectItem(exactMatch);
            setTimeout(() => setIsProcessingBarcode(false), 300);
            return;
          }
          
          console.log(`   No exact SKU match, trying filtered search...`);
          
          // If no exact match, try first filtered item
          const filtered = items.filter((item) => {
            const searchLower = value.toLowerCase().trim();
            const itemName = (item?.itemName || "").toLowerCase();
            const sku = (item?.sku || "").toLowerCase();
            const groupName = (item?.groupName || "").toLowerCase();
            
            return itemName.includes(searchLower) || 
                   sku.includes(searchLower) || 
                   groupName.includes(searchLower);
          });
          
          console.log(`   Filtered items count:`, filtered.length);
          
          if (filtered.length > 0) {
            console.log(`✅ ========== FIRST FILTERED MATCH FOUND ==========`);
            console.log(`   Item:`, filtered[0]);
            setIsProcessingBarcode(true);
            // Use handleSelectItem for consistent behavior
            handleSelectItem(filtered[0]);
            setTimeout(() => setIsProcessingBarcode(false), 300);
          } else {
            console.log(`❌ ========== NO MATCHES FOUND ==========`);
            console.log(`   Search value: "${value}"`);
          }
        }, 500); // Increased to 500ms
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleKeyDown = async (e) => {
    // Handle Enter key - select first item from filtered results
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      console.log(`🔑 ENTER KEY PRESSED`);
      console.log(`   Input value: "${inputValue}"`);
      console.log(`   Is processing barcode: ${isProcessingBarcode}`);
      
      // If we're already processing a barcode, ignore this Enter
      if (isProcessingBarcode) {
        console.log(`⏳ Already processing barcode, ignoring Enter`);
        return;
      }
      
      const scannedCode = inputValue.trim();
      console.log(`📱 Enter pressed with value: "${scannedCode}"`);
      
      // If input is empty, don't do anything
      if (!scannedCode || scannedCode.length < 3) {
        console.log(`⚠️ Input too short, ignoring Enter`);
        return;
      }
      
      setIsProcessingBarcode(true);
      
      console.log(`🔍 Searching for item with code: "${scannedCode}"`);
      console.log(`   Available items: ${items.length}`);
      
      // First, try to find exact SKU match
      const exactMatch = items.find(item => 
        item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase()
      );
      
      if (exactMatch) {
        console.log(`✅ ENTER - Exact SKU match found:`, exactMatch);
        handleSelectItem(exactMatch);
        setTimeout(() => setIsProcessingBarcode(false), 300);
        return;
      }
      
      console.log(`   No exact match, trying filtered items...`);
      
      // Then try first item in filtered results
      if (filteredItems && filteredItems.length > 0) {
        const firstMatch = filteredItems[0];
        console.log(`✅ ENTER - Selecting first match from dropdown:`, firstMatch);
        
        // Call the item select handler
        handleSelectItem(firstMatch);
        setTimeout(() => setIsProcessingBarcode(false), 300);
        return;
      }
      
      console.log(`   No filtered items, searching via API...`);
      
      // If no dropdown results, search via API
      console.log(`🔍 No dropdown results, searching via API: ${scannedCode}`);
      await handleBarcodeScanned(scannedCode);
      setTimeout(() => setIsProcessingBarcode(false), 300);
      
      return;
    }
  };

  // Handle barcode scanning for this specific row
  const handleBarcodeScanned = async (scannedSku) => {
    console.log(`🔍 Processing scanned SKU in row ${rowId}: "${scannedSku}"`);
    
    try {
      // Search in standalone items first
      const itemsResponse = await fetch(`${API_URL}/api/shoe-sales/items`);
      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        const foundItem = items.find(item => 
          item.sku === scannedSku || 
          item.sku?.toLowerCase() === scannedSku.toLowerCase() ||
          item.itemName?.toLowerCase().includes(scannedSku.toLowerCase())
        );
        if (foundItem) {
          // Create item object matching the expected structure
          const itemObj = {
            _id: foundItem._id || foundItem.id,
            id: foundItem._id || foundItem.id,
            itemName: foundItem.itemName,
            sku: foundItem.sku || "",
            itemGroupId: null,
            isFromGroup: false,
            warehouseStocks: foundItem.warehouseStocks || [],
          };
          
          console.log(`✅ Found standalone item, calling onChange with:`, itemObj);
          
          // Call onChange to populate the row - this triggers handleItemSelect
          onChange(itemObj);
          
          // Close dropdown and clear input
          setIsOpen(false);
          setInputValue("");
          setSearchTerm("");
          setSelectedItem(itemObj);
          
          return;
        }
      }
      
      // Search in item groups
      const groupsResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups`);
      if (groupsResponse.ok) {
        const groups = await groupsResponse.json();
        for (const group of groups) {
          if (group.items && Array.isArray(group.items)) {
            const foundItem = group.items.find(item => 
              item.sku === scannedSku || 
              item.sku?.toLowerCase() === scannedSku.toLowerCase() ||
              item.name?.toLowerCase().includes(scannedSku.toLowerCase())
            );
            if (foundItem) {
              // Create item object matching the expected structure
              const itemObj = {
                _id: foundItem._id || foundItem.id || `${group._id}-${foundItem.name}`,
                id: foundItem._id || foundItem.id || `${group._id}-${foundItem.name}`,
                itemName: foundItem.name,
                sku: foundItem.sku || "",
                itemGroupId: group._id || group.id,
                isFromGroup: true,
                warehouseStocks: foundItem.warehouseStocks || [],
              };
              
              console.log(`✅ Found group item, calling onChange with:`, itemObj);
              
              // Call onChange to populate the row - this triggers handleItemSelect
              onChange(itemObj);
              
              // Close dropdown and clear input
              setIsOpen(false);
              setInputValue("");
              setSearchTerm("");
              setSelectedItem(itemObj);
              
              return;
            }
          }
        }
      }
      
      // Item not found
      console.log(`❌ Item not found for SKU: "${scannedSku}"`);
      alert(`Item with SKU "${scannedSku}" not found`);
      setInputValue("");
      setSearchTerm("");
    } catch (error) {
      console.error("Error searching for item:", error);
      alert("Error searching for item. Please try again.");
      setInputValue("");
      setSearchTerm("");
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSelectTimerRef.current) {
        clearTimeout(autoSelectTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="relative w-full overflow-visible m-0 p-0">
        <input
          ref={buttonRef}
          onClick={toggleDropdown}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            console.log(`🎯 Input FOCUSED`);
            onFocusChange && onFocusChange(true);
          }}
          onBlur={(e) => {
            console.log(`👋 Input BLURRED, value: "${inputValue}"`);
            
            // Small delay to allow click events to fire first
            setTimeout(() => {
              // If there's a value and dropdown is open, try to auto-select
              if (inputValue && inputValue.length >= 3 && isOpen) {
                console.log(`🔍 Blur auto-select triggered for: "${inputValue}"`);
                
                // Try exact SKU match
                const exactMatch = items.find(item => 
                  item.sku && item.sku.toLowerCase() === inputValue.toLowerCase()
                );
                
                if (exactMatch) {
                  console.log(`✅ BLUR - Exact match found:`, exactMatch);
                  handleSelectItem(exactMatch);
                } else if (filteredItems && filteredItems.length > 0) {
                  console.log(`✅ BLUR - First filtered match:`, filteredItems[0]);
                  handleSelectItem(filteredItems[0]);
                }
              }
              
              onFocusChange && onFocusChange(false);
            }, 150);
          }}
          type="text"
          placeholder="Type or scan barcode to select item..."
          value={selectedItem ? selectedItem.itemName : inputValue}
          data-handle-enter="true"
          className="w-full h-[36px] rounded-md border border-[#d7dcf5] bg-white text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] transition-colors cursor-text px-[10px] py-[6px]"
        />
      </div>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const TransferOrderCreate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
  const isEditMode = !!id;
  
  // Get user info
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.email || user?._id || user?.id || "";
  const isAdmin = user?.power === "admin";
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
  const [transferOrderNumber, setTransferOrderNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [sourceWarehouse, setSourceWarehouse] = useState("");
  const [destinationWarehouse, setDestinationWarehouse] = useState("");
  const [tableRows, setTableRows] = useState([{ 
    id: 1, 
    item: null, 
    itemId: null, 
    itemGroupId: null, 
    itemName: "", 
    itemSku: "", 
    sourceQuantity: 0,
    sourceInTransit: 0,
    sourceDraft: 0,
    sourceTotal: 0,
    destQuantity: 0, 
    quantity: "" 
  }]);
  const [isItemInputFocused, setIsItemInputFocused] = useState(false);
  
  // Bulk Add Items states
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkScanInput, setBulkScanInput] = useState("");
  const [bulkScannedItems, setBulkScannedItems] = useState([]); // Array of {item, quantity, sku}
  const [bulkItems, setBulkItems] = useState([]); // All items for bulk add modal
  const [bulkItemsLoading, setBulkItemsLoading] = useState(false);
  const bulkScanInputRef = useRef(null);
  const bulkScanBufferRef = useRef("");
  const bulkScanTimeoutRef = useRef(null);
  
  // Warehouse options (same as branch options)
  const warehouseOptions = [
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
  
  // Set default source warehouse for store users
  useEffect(() => {
    if (!isEditMode && !isAdmin && userWarehouse) {
      setSourceWarehouse(userWarehouse);
      console.log(`📍 Auto-setting source warehouse to user's warehouse: "${userWarehouse}"`);
    }
  }, [isEditMode, isAdmin, userWarehouse]);
  
  // Check for pre-filled data from Store Order (Accept button)
  useEffect(() => {
    if (!isEditMode) {
      const prefillData = sessionStorage.getItem('transferOrderPrefill');
      if (prefillData) {
        try {
          const data = JSON.parse(prefillData);
          console.log('📋 Pre-filling transfer order from store order:', data);
          
          // Set warehouses first
          const srcWarehouse = data.sourceWarehouse || "Warehouse";
          const destWarehouse = data.destinationWarehouse || "";
          
          setSourceWarehouse(srcWarehouse);
          setDestinationWarehouse(destWarehouse);
          setReason(data.reason || "");
          
          // Set items after warehouses are set (use setTimeout to ensure warehouses are set first)
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            setTimeout(() => {
              const rows = data.items.map((item, index) => {
                // Create a complete item object that matches what ItemDropdown expects
                const itemObj = {
                  _id: item.itemId,
                  itemName: item.itemName,
                  sku: item.itemSku || "",
                  itemGroupId: item.itemGroupId,
                  isFromGroup: !!item.itemGroupId,
                };
                
                return {
                  id: index + 1,
                  item: itemObj, // Complete item object
                  itemId: item.itemId,
                  itemGroupId: item.itemGroupId,
                  itemName: item.itemName,
                  itemSku: item.itemSku || "",
                  sourceQuantity: 0, // Will be fetched by ItemDropdown
                  destQuantity: 0, // Will be fetched by ItemDropdown
                  quantity: item.quantity?.toString() || "", // Pre-filled from store order, admin can change
                };
              });
              
              console.log('📦 Setting pre-filled rows with warehouses:', { srcWarehouse, destWarehouse, rows });
              setTableRows(rows);
            }, 100); // Small delay to ensure warehouses are set
          }
          
          // Clear the session storage after using it
          sessionStorage.removeItem('transferOrderPrefill');
        } catch (error) {
          console.error('Error parsing prefill data:', error);
          sessionStorage.removeItem('transferOrderPrefill');
        }
      }
    }
  }, [isEditMode]);
  
  // Load transfer order data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadTransferOrder = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}/api/inventory/transfer-orders/${id}`);
          if (!response.ok) throw new Error("Failed to load transfer order");
          const data = await response.json();
          
          setTransferOrderNumber(data.transferOrderNumber || "");
          setDate(data.date ? new Date(data.date).toISOString().split('T')[0] : date);
          setReason(data.reason || "");
          setSourceWarehouse(data.sourceWarehouse || "");
          setDestinationWarehouse(data.destinationWarehouse || "");
          
          if (data.items && Array.isArray(data.items)) {
            const rows = data.items.map((item, index) => ({
              id: index + 1,
              item: { _id: item.itemId, itemName: item.itemName },
              itemId: item.itemId,
              itemGroupId: item.itemGroupId,
              itemName: item.itemName,
              itemSku: item.itemSku || "",
              sourceQuantity: item.sourceQuantity || 0,
              destQuantity: item.destQuantity || 0,
              quantity: item.quantity?.toString() || "",
            }));
            setTableRows(rows.length > 0 ? rows : [{ id: 1, item: null, itemId: null, itemGroupId: null, itemName: "", itemSku: "", sourceQuantity: 0, destQuantity: 0, quantity: "" }]);
          }
        } catch (error) {
          console.error("Error loading transfer order:", error);
          alert("Failed to load transfer order");
          navigate("/inventory/transfer-orders");
        } finally {
          setLoading(false);
        }
      };
      loadTransferOrder();
    }
  }, [isEditMode, id, API_URL, navigate, date]);
  
  // Clear selected items when source warehouse changes (only in create mode)
  useEffect(() => {
    if (!isEditMode && sourceWarehouse) {
      // Reset all table rows to clear selected items
      setTableRows([{ 
        id: 1, 
        item: null, 
        itemId: null, 
        itemGroupId: null, 
        itemName: "", 
        itemSku: "", 
        sourceQuantity: 0, 
        destQuantity: 0, 
        quantity: "" 
      }]);
    }
  }, [sourceWarehouse, isEditMode]);
  
  // Handle item selection
  const handleItemSelect = (rowId, item) => {
    console.log(`🎯 handleItemSelect called for row ${rowId} with item:`, item);
    setTableRows(rows => {
      const updated = rows.map(row => {
        if (row.id === rowId) {
          console.log(`   ✅ Updating row ${rowId} with item:`, item);
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
      console.log(`   📊 Updated rows after item select:`, updated.map(r => ({ id: r.id, itemName: r.itemName, item: r.item })));
      return updated;
    });
  };
  
  // Handle source stock fetched
  const handleSourceStockFetched = (rowId) => (stockData) => {
    const availableQty = stockData.stockOnHand ?? stockData.currentQuantity ?? 0;
    
    console.log(`📦 Source stock fetched for row ${rowId}: ${availableQty}`);
    
    setTableRows(rows => {
      const updated = rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            sourceQuantity: availableQty,
            sourceInTransit: 0,
            sourceDraft: 0,
            sourceTotal: availableQty,
          };
        }
        return row;
      });
      return updated;
    });
  };
  
  // Handle destination stock fetched
  const handleDestStockFetched = (rowId) => (stockData) => {
    const availableQty = stockData.currentQuantity ?? stockData.availableStock ?? 0;
    console.log(`📦 Destination stock fetched for row ${rowId}: ${availableQty}`);
    setTableRows(rows => {
      const updated = rows.map(row => {
        if (row.id === rowId) {
          console.log(`   ✅ Updating row ${rowId} destQuantity from ${row.destQuantity} to ${availableQty}`);
          return {
            ...row,
            destQuantity: availableQty,
          };
        }
        return row;
      });
      console.log(`   📊 Updated table rows:`, updated.map(r => ({ id: r.id, itemName: r.itemName, sourceQty: r.sourceQuantity, destQty: r.destQuantity })));
      return updated;
    });
  };
  
  // Handle quantity change
  const handleQuantityChange = (rowId, value) => {
    const numValue = parseFloat(value) || 0;
    setTableRows(rows =>
      rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            quantity: value,
          };
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
      sourceQuantity: 0, 
      destQuantity: 0, 
      quantity: "" 
    }]);
  };
  
  // Handle remove row
  const handleRemoveRow = (rowId) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter(row => row.id !== rowId));
    }
  };
  
  // Bulk Add Items functions
  const fetchBulkItems = async () => {
    setBulkItemsLoading(true);
    try {
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/shoe-sales/items?page=1&limit=10000`);
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      
      let itemsList = [];
      if (Array.isArray(data)) {
        itemsList = data;
      } else if (data.items && Array.isArray(data.items)) {
        itemsList = data.items;
      }
      
      // Filter active items
      const activeItems = itemsList.filter((i) => i?.isActive !== false && String(i?.isActive).toLowerCase() !== "false");
      
      // Filter by source warehouse if selected
      const filteredItems = sourceWarehouse ? filterItemsByWarehouse(activeItems, sourceWarehouse) : activeItems;
      
      setBulkItems(filteredItems);
    } catch (error) {
      console.error("Error fetching bulk items:", error);
      setBulkItems([]);
    } finally {
      setBulkItemsLoading(false);
    }
  };
  
  const filterItemsByWarehouse = (itemsList, targetWarehouse) => {
    if (!targetWarehouse) return itemsList;
    
    const targetWarehouseLower = targetWarehouse.toLowerCase().trim();
    
    // Show all items if no specific warehouse selected
    if (targetWarehouseLower === "warehouse") {
      return itemsList;
    }
    
    // For specific warehouses, show items from that warehouse (including out of stock)
    return itemsList.filter(item => {
      if (!item.warehouseStocks || !Array.isArray(item.warehouseStocks) || item.warehouseStocks.length === 0) {
        return false;
      }
      
      return item.warehouseStocks.some(ws => {
        if (!ws.warehouse) return false;
        const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
        const targetLower = targetWarehouseLower.toLowerCase().trim();
        
        return stockWarehouse === targetLower || 
               stockWarehouse.includes(targetLower) ||
               targetLower.includes(stockWarehouse);
      });
    });
  };
  
  const handleBulkAddClose = () => {
    setShowBulkAddModal(false);
    setBulkScannedItems([]);
    setBulkScanInput("");
    bulkScanBufferRef.current = "";
  };
  
  const handleBulkScanKeyDown = async (e) => {
    if (bulkScanTimeoutRef.current) {
      clearTimeout(bulkScanTimeoutRef.current);
    }
    
    const char = e.key;
    
    if (char === "Enter") {
      e.preventDefault();
      const scannedCode = bulkScanBufferRef.current.trim();
      
      if (scannedCode.length > 0) {
        await processBulkScan(scannedCode);
        bulkScanBufferRef.current = "";
        setBulkScanInput("");
      }
      return;
    }
    
    if (char.length > 1) {
      return;
    }
    
    bulkScanBufferRef.current += char;
    setBulkScanInput(bulkScanBufferRef.current);
    
    bulkScanTimeoutRef.current = setTimeout(() => {
      bulkScanBufferRef.current = "";
    }, 100);
  };
  
  const processBulkScan = async (scannedCode) => {
    console.log(`📱 Bulk scan: "${scannedCode}"`);
    
    try {
      if (bulkItems.length === 0) {
        console.log("⚠️ No items loaded yet");
        alert("Items are still loading. Please wait.");
        return;
      }
      
      const foundItem = bulkItems.find(item => 
        item.sku && item.sku.toLowerCase() === scannedCode.toLowerCase()
      );
      
      if (foundItem) {
        console.log(`✅ Found item:`, foundItem);
        
        // Get available stock for this item
        let availableStock = 0;
        if (sourceWarehouse && foundItem.warehouseStocks && Array.isArray(foundItem.warehouseStocks)) {
          const targetWarehouseLower = sourceWarehouse.toLowerCase().trim();
          const matchingStock = foundItem.warehouseStocks.find(ws => {
            if (!ws.warehouse) return false;
            const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
            return stockWarehouse === targetWarehouseLower || 
                   stockWarehouse.includes(targetWarehouseLower) ||
                   targetWarehouseLower.includes(stockWarehouse);
          });
          
          if (matchingStock) {
            availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
          }
        }
        
        console.log(`📊 Available stock for ${foundItem.itemName}: ${availableStock}`);
        
        setBulkScannedItems(prev => {
          const existingIndex = prev.findIndex(i => i.item._id === foundItem._id);
          
          if (existingIndex >= 0) {
            const currentQuantity = prev[existingIndex].quantity;
            if (currentQuantity >= availableStock) {
              alert(`❌ Cannot add more. Only ${availableStock} pcs available for ${foundItem.itemName}`);
              return prev;
            }
            
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1
            };
            console.log(`📈 Incremented quantity for ${foundItem.itemName} to ${updated[existingIndex].quantity}`);
            return updated;
          } else {
            if (availableStock <= 0) {
              alert(`❌ No stock available for ${foundItem.itemName}`);
              return prev;
            }
            
            console.log(`➕ Added new item ${foundItem.itemName}`);
            return [...prev, {
              item: foundItem,
              quantity: 1,
              sku: foundItem.sku
            }];
          }
        });
      } else {
        console.log(`❌ Item not found for SKU: "${scannedCode}"`);
        alert(`Item with SKU "${scannedCode}" not found`);
      }
    } catch (error) {
      console.error("Error processing bulk scan:", error);
      alert("Error finding item. Please try again.");
    }
  };
  
  const handleBulkAddItems = () => {
    if (bulkScannedItems.length === 0) {
      alert("Please scan at least one item");
      return;
    }
    
    // Remove blank row if exists
    const filtered = tableRows.filter(row => row.itemName && row.itemName.trim() !== "");
    
    // Add scanned items to table
    const newRows = bulkScannedItems.map((scanned, idx) => {
      const newId = Math.max(...filtered.map(r => r.id), 0) + idx + 1;
      return {
        id: newId,
        item: scanned.item,
        itemId: scanned.item._id,
        itemGroupId: scanned.item.itemGroupId || null,
        itemName: scanned.item.itemName,
        itemSku: scanned.item.sku,
        sourceQuantity: 0,
        destQuantity: 0,
        quantity: scanned.quantity.toString()
      };
    });
    
    setTableRows([...filtered, ...newRows]);
    handleBulkAddClose();
  };
  
  // Barcode scanning functions
  
  // Check if any item has transfer quantity exceeding source stock
  const hasInsufficientStock = () => {
    return tableRows.some(row => {
      if (!row.itemName || !row.quantity) return false;
      const transferQty = parseFloat(row.quantity) || 0;
      const sourceStock = parseFloat(row.sourceQuantity) || 0;
      return transferQty > sourceStock;
    });
  };
  
  // Handle save
  const handleSave = async (status = "draft") => {
    if (!transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (sourceWarehouse === destinationWarehouse) {
      alert("Source and destination warehouses cannot be the same");
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
          sourceQuantity: row.sourceQuantity || 0,
          destQuantity: row.destQuantity || 0,
        }));
      
      const transferData = {
        transferOrderNumber,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reason,
        sourceWarehouse,
        destinationWarehouse,
        items,
        status,
        userId,
      };
      
      const url = isEditMode 
        ? `${API_URL}/api/inventory/transfer-orders/${id}`
        : `${API_URL}/api/inventory/transfer-orders`;
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save transfer order");
      }
      
      const statusLabel = status === "draft" ? "Draft" : status === "in_transit" ? "In Transit" : "Transferred";
      alert(`Transfer order ${isEditMode ? "updated" : "saved"} successfully as ${statusLabel}`);
      navigate("/inventory/transfer-orders");
    } catch (error) {
      console.error("Error saving transfer order:", error);
      alert(error.message || "Failed to save transfer order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Enter key to save transfer order - DISABLED to allow barcode scanning
  // Users can click the save buttons instead
  // useEnterToSave(() => handleSave("transferred"), saving, { disabled: isItemInputFocused });
  
  if (loading) {
    return (
      <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen flex items-center justify-center">
        <div className="text-[#64748b]">Loading transfer order...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#f7f9ff]">
      <Head
        title={isEditMode ? "Edit Transfer Order" : "New Transfer Order"}
        description="Register a stock transfer between warehouses."
        actions={
          <Link
            to="/inventory/transfer-orders"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5f5] px-4 text-sm font-medium text-[#1f2937] transition hover:bg-white"
          >
            Back to Transfer Orders
          </Link>
        }
      />

      <div className="ml-64 px-10 pb-16 pt-8">
        <div className="rounded-3xl border border-[#e6ebfa] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1ff] px-10 py-6">
            <div className="space-y-1">
              <h1 className="text-[20px] font-semibold text-[#101828]">
                {isEditMode ? "Edit Transfer Order" : "New Transfer Order"}
              </h1>
              <p className="text-sm text-[#6c728a]">
                Populate the required fields to initiate a warehouse transfer.
              </p>
              {/* Barcode Scanning Indicator */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700">
                    📱 Click item field and scan barcode to add items automatically
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12 px-10 py-12">
            <section className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-2">
                <Label required>Transfer Order #</Label>
                <div className="flex items-center gap-3 rounded-lg border border-[#d9def1] bg-[#fcfdff] px-4 py-2.5">
                  <input
                    value={transferOrderNumber}
                    onChange={(e) => setTransferOrderNumber(e.target.value)}
                    placeholder="Enter order reference"
                    className="w-full border-0 bg-transparent text-sm text-[#101828] placeholder:text-[#b0b8d9] focus:ring-0"
                  />
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]"
                    onClick={() => setTransferOrderNumber(`TO-${Math.floor(Math.random() * 9000 + 1000)}`)}
                  >
                    Auto
                  </button>
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
              <div className="space-y-2 lg:col-span-2">
                <Label>Reason</Label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the transfer reason"
                  className="w-full rounded-lg border border-[#d9def1] bg-[#fcfdff] px-4 py-3 text-sm text-[#101828] focus:border-[#94a3b8] focus:outline-none"
                />
              </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[1fr_auto_1fr]">
              <div className="space-y-2">
                <Label required>Source Warehouse</Label>
                {!isAdmin ? (
                  // For store users: read-only field showing their warehouse
                  <div className="w-full rounded-md border border-[#d7dcf5] bg-[#f5f7fb] text-sm text-[#1f2937] px-3 py-2.5 flex items-center">
                    {sourceWarehouse || "—"}
                  </div>
                ) : (
                  // For admin: editable dropdown
                  <WarehouseDropdown
                    value={sourceWarehouse}
                    onChange={(e) => setSourceWarehouse(e.target.value)}
                    options={warehouseOptions}
                    placeholder="Select source warehouse"
                    required
                  />
                )}
              </div>
              <div className="flex items-end justify-center pb-1">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d5dcf4] text-[#4b5563] hover:bg-[#eef2ff] transition-colors"
                  onClick={() => {
                    setSourceWarehouse(destinationWarehouse);
                    setDestinationWarehouse(sourceWarehouse);
                  }}
                  title="Swap warehouses"
                >
                  ⇄
                </button>
              </div>
              <div className="space-y-2">
                <Label required>Destination Warehouse</Label>
                <WarehouseDropdown
                  value={destinationWarehouse}
                  onChange={(e) => setDestinationWarehouse(e.target.value)}
                  options={warehouseOptions}
                  placeholder="Select destination warehouse"
                  required
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#edf1ff] bg-[#fcfdff]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ff] px-8 py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8a94b0]">Item Table</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse text-sm text-[#111827]">
                  <thead className="bg-white text-[11px] uppercase tracking-[0.28em] text-[#9aa2bd]">
                    <tr>
                      <th className="w-12 px-6 py-3 text-left font-semibold">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[#d0d6ee] text-[#4f46e5] focus:ring-[#4338ca]"
                        />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Item Details</th>
                      <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Current Availability</th>
                      <th className="px-6 py-3 text-left font-semibold text-[#6b7280]">Transfer Quantity</th>
                      <th className="w-12 px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr key={row.id} className="border-t border-[#f0f3ff]">
                        <td className="px-6 py-4 align-top">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#d0d6ee] text-[#4f46e5] focus:ring-[#4338ca]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <ItemDropdown
                            rowId={row.id}
                            value={row.item}
                            onChange={(item) => handleItemSelect(row.id, item)}
                            sourceWarehouse={sourceWarehouse}
                            destinationWarehouse={destinationWarehouse}
                            onSourceStockFetched={handleSourceStockFetched(row.id)}
                            onDestStockFetched={handleDestStockFetched(row.id)}
                            isStoreUser={!isAdmin}
                            userWarehouse={userWarehouse}
                            onFocusChange={setIsItemInputFocused}
                            isEditMode={isEditMode}
                            orderId={id}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="grid gap-3 text-xs text-[#6b7280] sm:grid-cols-2">
                            <div className={`rounded-lg border px-4 py-3 ${row.sourceQuantity === 0 ? 'border-[#fecaca] bg-[#fef2f2]' : 'border-[#edf1ff] bg-[#f9faff]'}`}>
                              <span className="block text-[10px] uppercase tracking-[0.28em] text-[#9ca3af]">
                                Source Stock
                              </span>
                              <span className={`mt-1 block text-sm font-semibold ${row.sourceQuantity === 0 ? 'text-[#ef4444]' : 'text-[#101828]'}`}>
                                {Math.round(row.sourceQuantity)} Units
                              </span>
                            </div>
                            <div className="rounded-lg border border-[#edf1ff] bg-[#f9faff] px-4 py-3">
                              <span className="block text-[10px] uppercase tracking-[0.28em] text-[#9ca3af]">
                                Destination Stock
                              </span>
                              <span className="mt-1 block text-sm font-semibold text-[#101828]">
                                {Math.round(row.destQuantity)} Units
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const transferQty = parseFloat(row.quantity) || 0;
                            const sourceStock = parseFloat(row.sourceQuantity) || 0;
                            const exceedsStock = transferQty > sourceStock;
                            
                            return (
                              <div>
                                <div className={`flex items-center gap-2 rounded-lg border ${exceedsStock ? 'border-[#ef4444] bg-[#fef2f2]' : 'border-[#d9def1] bg-white'} px-4 py-2.5`}>
                                  <input
                                    type="number"
                                    value={row.quantity}
                                    onChange={(e) => handleQuantityChange(row.id, e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="1"
                                    className={`w-full border-0 text-right text-sm ${exceedsStock ? 'text-[#ef4444] bg-transparent' : 'text-[#101828]'} focus:ring-0`}
                                  />
                                  <span className={`text-xs ${exceedsStock ? 'text-[#ef4444]' : 'text-[#98a2b3]'}`}>Units</span>
                                </div>
                                {exceedsStock && (
                                  <p className="mt-1 text-xs text-[#ef4444]">
                                    Exceeds source stock ({Math.round(sourceStock)} available)
                                  </p>
                                )}
                              </div>
                            );
                          })()}
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
                <button
                  type="button"
                  onClick={() => {
                    if (!sourceWarehouse) {
                      alert("Please select a source warehouse first");
                      return;
                    }
                    setShowBulkAddModal(true);
                    fetchBulkItems();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#10b981] px-4 py-2 text-[#10b981] hover:bg-[#ecfdf5] transition-colors"
                >
                  <Plus size={16} />
                  Bulk Add Items
                </button>
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#edf1ff] bg-[#fbfcff] px-10 py-6">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="rounded-lg border border-[#d4dcf4] px-4 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("in_transit")}
              disabled={saving || !transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse || hasInsufficientStock()}
              className="rounded-lg bg-[#2f6bff] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2757d6] disabled:cursor-not-allowed disabled:bg-[#b8ccff]"
              title={hasInsufficientStock() ? "Transfer quantity exceeds source stock for one or more items" : ""}
            >
              Initiate Transfer
            </button>
            {isAdmin && (
              <button
                onClick={() => handleSave("transferred")}
                disabled={saving || !transferOrderNumber || !date || !sourceWarehouse || !destinationWarehouse || hasInsufficientStock()}
                className="rounded-lg bg-[#10b981] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-[#86efac]"
                title={hasInsufficientStock() ? "Transfer quantity exceeds source stock for one or more items" : ""}
              >
                Complete Transfer
              </button>
            )}
            <button
              onClick={() => navigate("/inventory/transfer-orders")}
              disabled={saving}
              className="rounded-lg border border-[#d4dcf4] px-4 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkAddModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-[#e5e7eb] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4 bg-white">
              <h2 className="text-lg font-semibold text-[#1f2937]">Add Items in Bulk</h2>
              <button
                onClick={handleBulkAddClose}
                className="text-[#6b7280] hover:text-[#1f2937] hover:bg-[#f3f4f6] p-1 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Two Column Layout */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Column - Items List */}
              <div className="flex-1 flex flex-col border-r border-[#e5e7eb]">
                {/* Search/Scan Input */}
                <div className="border-b border-[#e5e7eb] p-4 bg-[#f9fafb]">
                  <input
                    ref={bulkScanInputRef}
                    type="text"
                    value={bulkScanInput}
                    onKeyDown={handleBulkScanKeyDown}
                    placeholder="Type to search or scan the barcode of the item"
                    className="w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                    autoFocus
                  />
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto">
                  {bulkItemsLoading ? (
                    <div className="text-center py-8 text-[#6b7280]">Loading items...</div>
                  ) : bulkItems.length === 0 ? (
                    <div className="text-center py-8 text-[#6b7280]">No items available in {sourceWarehouse}</div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {bulkItems.map((item) => {
                        const isSelected = bulkScannedItems.some(s => s.item._id === item._id);
                        
                        // Calculate available stock
                        let availableStock = 0;
                        if (sourceWarehouse && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
                          const targetWarehouseLower = sourceWarehouse.toLowerCase().trim();
                          const matchingStock = item.warehouseStocks.find(ws => {
                            if (!ws.warehouse) return false;
                            const stockWarehouse = (ws.warehouse || "").toString().toLowerCase().trim();
                            return stockWarehouse === targetWarehouseLower || 
                                   stockWarehouse.includes(targetWarehouseLower) ||
                                   targetWarehouseLower.includes(stockWarehouse);
                          });
                          
                          if (matchingStock) {
                            availableStock = parseFloat(matchingStock.availableForSale) || parseFloat(matchingStock.stockOnHand) || 0;
                          }
                        }
                        
                        const isOutOfStock = availableStock <= 0;
                        
                        return (
                          <div
                            key={item._id}
                            onClick={() => !isOutOfStock && processBulkScan(item.sku)}
                            className={`p-3 rounded-lg border transition-all ${
                              isOutOfStock
                                ? 'border-[#fecaca] bg-[#fef2f2] cursor-not-allowed opacity-75'
                                : isSelected
                                ? 'border-[#2563eb] bg-[#eff6ff] cursor-pointer'
                                : 'border-[#e5e7eb] bg-white hover:border-[#2563eb] hover:bg-[#f0f9ff] cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm ${
                                  isOutOfStock 
                                    ? 'text-[#991b1b]' 
                                    : isSelected 
                                    ? 'text-[#1e40af]' 
                                    : 'text-[#1f2937]'
                                }`}>
                                  {item.itemName}
                                </div>
                                <div className="text-xs text-[#6b7280] mt-0.5">
                                  SKU: {item.sku || 'N/A'}
                                </div>
                              </div>
                              <div className="text-right ml-2 flex-shrink-0">
                                <div className="text-xs text-[#6b7280]">Stock on Hand</div>
                                {isOutOfStock ? (
                                  <div className="text-sm font-semibold text-[#ef4444]">
                                    No Stock
                                  </div>
                                ) : (
                                  <div className="text-sm font-semibold text-[#10b981]">
                                    {availableStock.toFixed(2)} pcs
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Selected Items */}
              <div className="w-80 flex flex-col bg-[#f9fafb]">
                {/* Header */}
                <div className="border-b border-[#e5e7eb] px-4 py-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#1f2937]">Selected Items</span>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#e5e7eb] text-xs font-semibold text-[#374151] rounded-full">
                      {bulkScannedItems.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6b7280]">Total Quantity</span>
                    <span className="text-sm font-semibold text-[#1f2937]">{bulkScannedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>

                {/* Selected Items List */}
                <div className="flex-1 overflow-y-auto p-3">
                  {bulkScannedItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <div className="text-4xl mb-2">📋</div>
                        <div className="text-sm text-[#6b7280]">No items selected yet</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bulkScannedItems.map((scanned, idx) => (
                        <div key={idx} className="bg-white border border-[#e5e7eb] rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-[#1f2937] truncate">
                                {scanned.item.itemName}
                              </div>
                              <div className="text-xs text-[#6b7280] mt-0.5">
                                SKU: {scanned.item.sku || 'N/A'}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setBulkScannedItems(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded transition-colors flex-shrink-0"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (scanned.quantity > 1) {
                                  setBulkScannedItems(prev => {
                                    const updated = [...prev];
                                    updated[idx].quantity -= 1;
                                    return updated;
                                  });
                                }
                              }}
                              className="w-6 h-6 rounded border border-[#d1d5db] flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] transition-colors text-sm"
                              disabled={scanned.quantity <= 1}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={scanned.quantity}
                              onChange={(e) => {
                                const qty = Math.max(1, parseInt(e.target.value) || 1);
                                setBulkScannedItems(prev => {
                                  const updated = [...prev];
                                  updated[idx].quantity = qty;
                                  return updated;
                                });
                              }}
                              className="w-12 h-6 text-center text-sm border border-[#d1d5db] rounded focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]/20"
                              min="1"
                            />
                            <button
                              onClick={() => {
                                setBulkScannedItems(prev => {
                                  const updated = [...prev];
                                  updated[idx].quantity += 1;
                                  return updated;
                                });
                              }}
                              className="w-6 h-6 rounded border border-[#d1d5db] flex items-center justify-center text-[#6b7280] hover:bg-[#f3f4f6] transition-colors text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#e5e7eb] bg-white px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={handleBulkAddClose}
                className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAddItems}
                disabled={bulkScannedItems.length === 0}
                className="rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-6 py-2 text-sm font-medium text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Items
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransferOrderCreate;
