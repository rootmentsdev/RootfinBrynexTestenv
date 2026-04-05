import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, X, Building2, ChevronDown, Package } from "lucide-react";
import Head from "../components/Head";
import ImageUpload from "../components/ImageUpload";
import AttachmentDisplay from "../components/AttachmentDisplay";
import baseUrl from "../api/api";

// All warehouses/stores in the system
const ALL_WAREHOUSES = [
  "Warehouse",
  "Palakkad Branch",
  "Calicut",
  "Manjery Branch",
  "Kannur Branch",
  "Edappal Branch",
  "Kalpetta Branch",
  "Kottakkal Branch",
  "Perinthalmanna Branch",
  "Grooms Trivandrum",
  "Chavakkad Branch",
  "Thrissur Branch",
  "Perumbavoor Branch",
  "Kottayam Branch",
  "Edapally Branch",
  "MG Road",
  "Head Office",
  "Production",
  "Office",
  "Z-Edapally Branch",
  "Z-Edappal Branch",
  "Vadakara Branch",
];

const ShoeSalesItemGroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [itemGroup, setItemGroup] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupImages, setGroupImages] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingStock, setEditingStock] = useState({});
  const [savingStock, setSavingStock] = useState(false);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const moreMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get user info for warehouse filtering
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com'];
  const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
  const isAdmin = isAdminEmail ||
                  user?.power === "admin" || 
                  (user?.locCode && (user.locCode === '858' || user.locCode === '103'));
  
  // Fallback locations mapping
  const fallbackLocations = [
    { "locName": "Warehouse", "locCode": "858" },
    { "locName": "G.Kottayam", "locCode": "701" },
    { "locName": "G.Kannur", "locCode": "716" },
    { "locName": "G.Calicut ", "locCode": "712" },
    { "locName": "G.Manjeri", "locCode": "710" },
    { "locName": "G.Thrissur", "locCode": "704" },
    { "locName": "G.Perumbavoor", "locCode": "703" },
    { "locName": "G.Palakkad ", "locCode": "705" },
    { "locName": "G.Edappal", "locCode": "707" },
    { "locName": "G-Edappally", "locCode": "702" },
    { "locName": "SG-Trivandrum", "locCode": "700" },
    { "locName": "G.Kalpetta", "locCode": "717" },
    { "locName": "G.Chavakkad", "locCode": "706" },
    { "locName": "G.Perinthalmanna", "locCode": "709" },
    { "locName": "G.Kottakkal", "locCode": "711" },
    { "locName": "G.Mg Road", "locCode": "718" },
    { "locName": "WAREHOUSE", "locCode": "103" }
  ];
  
  // Get user's warehouse name
  const getUserWarehouse = () => {
    if (!user?.locCode) return "Warehouse";
    const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
    if (!location) return "Warehouse";
    
    // Map locName to warehouse name
    const locName = location.locName;
    if (!locName) return "Warehouse";
    
    // Remove prefixes like "G.", "Z.", "SG-" (single/double letter followed by dot or dash)
    // Use more specific regex to avoid removing first letter of actual warehouse names
    let warehouse = locName.replace(/^[A-Z]{1,2}[.\-]\s*/i, "").trim();
    
    // Add "Branch" if not already present and not "Warehouse"
    if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
      warehouse = `${warehouse} Branch`;
    }
    return warehouse || "Warehouse";
  };
  
  const userWarehouse = getUserWarehouse();
  // Filter by warehouse only for non-admin users OR when admin is viewing a specific store
  const shouldFilterByWarehouse = !isAdmin || (isAdmin && userWarehouse !== "Warehouse");

  // Initialize all warehouses list
  useEffect(() => {
    // Sort warehouses: "Warehouse" first, then alphabetically
    const sortedWarehouses = [...ALL_WAREHOUSES].sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    setAllWarehouses(sortedWarehouses);
  }, []);

  useEffect(() => {
    const fetchItemGroup = async () => {
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
        
        // Build query params - filter by warehouse for branch users
        const queryParams = new URLSearchParams();
        if (userWarehouse) queryParams.append('warehouse', userWarehouse);
        queryParams.append('isAdmin', isAdmin.toString());
        // Filter by warehouse for:
        // 1. Non-admin users viewing a specific branch
        // 2. Admin users who have switched to a specific store (not Warehouse)
        if (userWarehouse && userWarehouse !== "Warehouse") {
          queryParams.append('filterByWarehouse', 'true');
        }
        
        const url = `${API_URL}/api/shoe-sales/item-groups/${id}?${queryParams.toString()}`;
        console.log(`📡 Fetching item group: ${url}`);
        console.log(`📡 User locCode: ${user?.locCode}, userWarehouse: ${userWarehouse}, isAdmin: ${isAdmin}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch item group");
        }
        
        const data = await response.json();
        setItemGroup(data);
      } catch (error) {
        console.error("Error fetching item group:", error);
        setItemGroup(null);
      }
    };

    if (id) {
      fetchItemGroup();
    }
  }, [id, userWarehouse, isAdmin]);

  const handleMarkAsInactive = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Prepare update payload with all fields preserved
      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        category: itemGroup.category || "other",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: itemGroup.items || [],
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: false, // Set to inactive
      };
      
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || payload?.errors?.join(", ") || "Failed to mark group as inactive");
      }

      const updatedGroup = await response.json();
      setItemGroup(updatedGroup);
      setShowInactiveModal(false);
      setShowMoreMenu(false);
      alert("Item group has been marked as inactive.");
    } catch (error) {
      console.error("Error marking group as inactive:", error);
      alert(error.message || "Failed to mark group as inactive. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item group");
      }

      setShowDeleteModal(false);
      setShowMoreMenu(false);
      alert("Item group has been deleted successfully.");
      navigate("/shoe-sales/item-groups");
    } catch (error) {
      console.error("Error deleting item group:", error);
      alert("Failed to delete item group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!itemGroup) {
    return (
      <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
        <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-lg p-8 text-center">
          <p className="text-lg font-medium text-[#475569]">Item Group not found</p>
          <Link
            to="/shoe-sales/item-groups"
            className="mt-4 inline-block text-sm font-medium text-[#475569] hover:text-[#1f2937]"
          >
            Back to Item Groups
          </Link>
        </div>
      </div>
    );
  }

  // Get items from the item group (saved items from database) - filter out inactive items
  const allItems = itemGroup.items && Array.isArray(itemGroup.items) ? itemGroup.items : [];
  const items = allItems.filter(item => item.isActive !== false);

  // Calculate stock totals from items - sum of all item stocks
  // Example: If 9 items each have 10 stock, total = 90
  const calculateStock = () => {
    // Sum up all stock values from items in the group
    const totalStock = items.reduce((sum, item) => {
      // Handle both number and string stock values
      let itemStock = 0;
      
      // First try direct stock property
      if (typeof item.stock === 'number') {
        itemStock = item.stock;
      } else if (typeof item.stock === 'string') {
        itemStock = parseFloat(item.stock) || 0;
      } else if (item.stock !== null && item.stock !== undefined) {
        itemStock = Number(item.stock) || 0;
      }
      
      // If stock is 0 or not available, check warehouseStocks
      if (itemStock === 0 && item.warehouseStocks && Array.isArray(item.warehouseStocks) && item.warehouseStocks.length > 0) {
        // Sum up stock from all warehouses
        const warehouseTotal = item.warehouseStocks.reduce((warehouseSum, warehouse) => {
          const openingStock = typeof warehouse.openingStock === 'number' ? warehouse.openingStock : (parseFloat(warehouse.openingStock) || 0);
          const stockOnHand = typeof warehouse.stockOnHand === 'number' ? warehouse.stockOnHand : (parseFloat(warehouse.stockOnHand) || 0);
          // Use stockOnHand if available, otherwise openingStock
          return warehouseSum + (stockOnHand > 0 ? stockOnHand : openingStock);
        }, 0);
        if (warehouseTotal > 0) {
          itemStock = warehouseTotal;
        }
      }
      
      console.log(`Item: ${item.name}, Stock: ${itemStock}, Direct stock: ${item.stock}, Warehouse stocks:`, item.warehouseStocks);
      
      return sum + itemStock;
    }, 0);
    
    console.log(`Total stock calculated: ${totalStock} from ${items.length} items`);
    
    return {
      openingStock: totalStock, // Sum of all item stocks (e.g., 9 items × 10 stock = 90)
      stockOnHand: totalStock, // Sum of all item stocks
      committedStock: 0, // This would come from pending orders/transactions
      totalStock: totalStock
    };
  };

  const stockInfo = calculateStock();

  // Prepare opening stock distribution data for modal
  const getOpeningStockDistribution = () => {
    const distribution = [];
    
    // Get warehouses that have stock data from items
    const warehousesWithStock = new Set();
    items.forEach(item => {
      if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
        item.warehouseStocks.forEach(ws => {
          if (ws.warehouse) {
            // Filter out corrupted warehouse names
            const warehouseName = ws.warehouse.toString().trim();
            if (warehouseName !== "arehouse Branch" && warehouseName !== "arehouse") {
              warehousesWithStock.add(ws.warehouse);
            }
          }
        });
      }
    });
    
    // Combine all warehouses from the system with warehouses that have stock
    // This ensures we show all stores, even if they don't have stock yet
    const warehousesToShow = allWarehouses.length > 0 ? allWarehouses : ALL_WAREHOUSES;
    const allWarehousesSet = new Set([
      ...warehousesToShow,
      ...warehousesWithStock
    ]);
    // Sort: "Warehouse" first, then alphabetically
    const sortedWarehouses = Array.from(allWarehousesSet).sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    
    // Process each item
    items.forEach(item => {
      const itemName = item.name || "Unnamed Item";
      // For group items, create a SKU from the item name or use existing SKU
      let itemSku = "N/A";
      
      if (item.sku) {
        itemSku = item.sku;
      } else if (item.itemSku) {
        itemSku = item.itemSku;
      } else if (item.code) {
        itemSku = item.code;
      } else if (itemName && itemName.includes(' - ')) {
        // Extract SKU-like info from name: "Aurora test - green/30" -> "green/30"
        const parts = itemName.split(' - ');
        if (parts.length > 1) {
          itemSku = parts[parts.length - 1]; // Get the last part (color/size)
        }
      } else if (item.attributeCombination && Array.isArray(item.attributeCombination)) {
        itemSku = item.attributeCombination.join('-');
      }
      
      const itemId = item._id || item.id;
      const itemWarehouseStocks = item.warehouseStocks || [];
      const itemSellingPrice = parseFloat(item.sellingPrice) || 0;
      
      // Calculate totals for this item
      let totalOpeningStock = 0;
      let totalOpeningStockValue = 0;
      
      // Create warehouse entries for this item
      const warehouseEntries = sortedWarehouses
        .filter(warehouse => {
          // Filter out corrupted warehouse names
          const warehouseName = warehouse.toString().trim();
          return warehouseName !== "arehouse Branch" && warehouseName !== "arehouse";
        })
        .map(warehouse => {
        const ws = itemWarehouseStocks.find(ws => 
          ws.warehouse && ws.warehouse.toString().trim() === warehouse.toString().trim()
        );
        
        // Get monthly opening stock if available
        const monthlyEntry = ws?.monthlyOpeningStock?.find(m => m.month === selectedMonth);
        
        // Get current month for comparison
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const isCurrentMonth = selectedMonth === currentMonth;
        
        // For current month, show closing stock (actual current stock after sales)
        // For past/future months, show opening stock (historical value)
        let openingStock = 0;
        let openingStockValue = 0;
        
        if (monthlyEntry) {
          if (isCurrentMonth) {
            // Current month: use actual stockOnHand (source of truth) instead of closingStock
            // This ensures we always show the real current stock, even if monthly entry is out of sync
            const actualStock = ws ? (parseFloat(ws.stockOnHand) || 0) : 0;
            const monthlyClosingStock = parseFloat(monthlyEntry.closingStock) || 0;
            
            // Use actual stock if it differs from monthly closing stock (monthly entry might be outdated)
            openingStock = actualStock > 0 ? actualStock : monthlyClosingStock;
            
            // Calculate value as quantity × selling price
            openingStockValue = openingStock * itemSellingPrice;
          } else {
            // Past/future month: show opening stock (historical value)
            openingStock = parseFloat(monthlyEntry.openingStock) || 0;
            // Calculate value as quantity × selling price
            openingStockValue = openingStock * itemSellingPrice;
          }
        } else {
          // No monthly entry: use current stockOnHand (actual stock)
          if (ws) {
            // Don't fallback to openingStock if stockOnHand is 0 - 0 is a valid value!
            openingStock = ws.stockOnHand !== undefined && ws.stockOnHand !== null
              ? parseFloat(ws.stockOnHand)
              : parseFloat(ws.openingStock || 0);
            // Calculate value as quantity × selling price
            openingStockValue = openingStock * itemSellingPrice;
          }
        }
        
        // Get editing values if in edit mode
        const editKey = `${itemId}-${warehouse}`;
        const editValue = editingStock[editKey];
        
        // If editing, recalculate value based on edited quantity
        const finalOpeningStock = editValue ? parseFloat(editValue.openingStock) || 0 : openingStock;
        const finalOpeningStockValue = finalOpeningStock * itemSellingPrice;
        
        totalOpeningStock += finalOpeningStock;
        totalOpeningStockValue += finalOpeningStockValue;
        
        return {
          warehouse,
          openingStock: finalOpeningStock,
          openingStockValue: finalOpeningStockValue,
          hasStock: finalOpeningStock > 0 || finalOpeningStockValue > 0,
          itemId,
          itemSellingPrice,
        };
      });
      
      // Add total row
      distribution.push({
        itemName,
        itemSku,
        itemId,
        isTotal: false,
        warehouse: null,
        openingStock: totalOpeningStock,
        openingStockValue: totalOpeningStockValue,
        warehouseEntries
      });
    });
    
    return distribution;
  };

  const openingStockData = getOpeningStockDistribution();

  // Handle stock input change
  const handleStockChange = (itemId, warehouse, field, value, itemSellingPrice) => {
    const key = `${itemId}-${warehouse}`;
    
    if (field === 'openingStock') {
      // When quantity changes, recalculate the value
      const quantity = parseFloat(value) || 0;
      const calculatedValue = quantity * (itemSellingPrice || 0);
      
      setEditingStock(prev => ({
        ...prev,
        [key]: {
          openingStock: value,
          openingStockValue: calculatedValue,
        }
      }));
    }
  };

  // Save monthly opening stock
  const handleSaveMonthlyStock = async () => {
    try {
      setSavingStock(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Prepare data for saving - include all items with their current or edited values
      const itemsToSave = [];
      openingStockData.forEach(itemData => {
        itemData.warehouseEntries.forEach(whEntry => {
          const editKey = `${whEntry.itemId}-${whEntry.warehouse}`;
          const editValue = editingStock[editKey];
          
          // Include item if it has been edited OR if it has existing stock
          if (editValue || whEntry.openingStock > 0 || whEntry.openingStockValue > 0) {
            // Ensure itemId is a string
            const itemIdStr = whEntry.itemId?.toString ? whEntry.itemId.toString() : String(whEntry.itemId || '');
            
            itemsToSave.push({
              itemId: itemIdStr,
              warehouse: whEntry.warehouse,
              openingStock: editValue ? (parseFloat(editValue.openingStock) || 0) : whEntry.openingStock,
              openingStockValue: editValue ? (parseFloat(editValue.openingStockValue) || 0) : whEntry.openingStockValue,
            });
          }
        });
      });

      if (itemsToSave.length === 0) {
        alert("No changes to save. Please edit at least one opening stock value.");
        setSavingStock(false);
        return;
      }

      console.log(`Saving ${itemsToSave.length} item updates for month ${selectedMonth}`);

      console.log("Saving monthly opening stock:", {
        month: selectedMonth,
        itemsCount: itemsToSave.length,
        items: itemsToSave
      });

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}/monthly-opening-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          items: itemsToSave,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("Error response:", errorData);
        throw new Error(errorData.message || errorData.error || "Failed to save monthly opening stock");
      }

      // Refresh item group data
      const fetchItemGroup = async () => {
        const queryParams = new URLSearchParams();
        if (userWarehouse) queryParams.append('warehouse', userWarehouse);
        queryParams.append('isAdmin', isAdmin.toString());
        if (userWarehouse && userWarehouse !== "Warehouse") {
          queryParams.append('filterByWarehouse', 'true');
        }
        
        const url = `${API_URL}/api/shoe-sales/item-groups/${id}?${queryParams.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setItemGroup(data);
        }
      };

      await fetchItemGroup();
      setEditingStock({});
      alert("Monthly opening stock saved successfully!");
    } catch (error) {
      console.error("Error saving monthly opening stock:", error);
      alert(error.message || "Failed to save monthly opening stock. Please try again.");
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="p-8 ml-64 bg-[#f5f7fb] min-h-screen">
      <Head
        title={
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-[#1f2937]">{itemGroup.name}</span>
            {itemGroup.isActive === false && (
              <span className="inline-flex items-center rounded-md bg-gray-100 border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Inactive
              </span>
            )}
          </div>
        }
        description={`${Array.isArray(itemGroup.items) ? itemGroup.items.length : 0} Item(s)`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={`/shoe-sales/item-groups/${id}/edit`}
              className="no-blue-button inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d7dcf5] bg-white px-4 text-sm font-medium text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
            >
              <Edit size={16} className="text-[#64748b]" />
              <span>Edit</span>
            </Link>
            <div className="relative" ref={moreMenuRef}>
              <button 
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="no-blue-button inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d7dcf5] bg-white px-4 text-sm font-medium text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
              >
                <span>More</span>
               
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[#d7dcf5] bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowInactiveModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="no-blue-button w-full px-4 py-2.5 text-left text-sm font-medium text-[#475569] bg-white hover:bg-[#f8fafc] active:bg-[#f1f5f9] transition-colors duration-150"
                  >
                    Mark as Inactive
                  </button>
                  <div className="h-px bg-[#e7ebf8]"></div>
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="no-blue-button w-full px-4 py-2.5 text-left text-sm font-medium text-[#475569] bg-white hover:bg-[#f8fafc] active:bg-[#f1f5f9] transition-colors duration-150"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div className="h-6 w-px bg-[#e7ebf8] mx-2"></div>
            <Link
              to="/shoe-sales/item-groups"
              className="no-blue-button inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7dcf5] bg-white text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
            >
              <X size={16} className="text-[#64748b]" />
            </Link>
          </div>
        }
      />

      <div className="mt-6 rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] overflow-hidden">
        {/* Content */}
        <div className="p-8">
          {itemGroup.isActive === false && (
            <div className="mb-6 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                <p className="text-sm font-medium text-gray-700">
                  This item group is currently inactive and will not appear in active lists.
                </p>
              </div>
            </div>
          )}
          
          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            {/* Left Column - Primary Details */}
            <div className="space-y-8">
              {/* Primary Details Card */}
              <div className="rounded-xl border border-[#e4e6f2] bg-[#fafbff] p-6">
                <h3 className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b] border-b border-[#e7ebf8] pb-3">
                  Primary Details
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                      Item Group Name
                    </label>
                    <p className="mt-1.5 text-base font-semibold text-[#1f2937]">{itemGroup.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                      Item Type
                    </label>
                    <p className="mt-1.5 text-sm font-medium text-[#1f2937]">
                      {itemGroup.itemType === "goods" ? "Inventory Items" : "Service Items"}
                    </p>
                  </div>
                  {Array.isArray(itemGroup.attributeRows) && itemGroup.attributeRows.length > 0 && (
                    <div className="md:col-span-2 space-y-4">
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                        Attributes
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {itemGroup.attributeRows
                          .filter((row) => row?.attribute)
                          .map((row, idx) => (
                            <div
                              key={`${row.attribute}-${idx}`}
                              className="rounded-lg border border-[#e4e6f2] bg-white px-4 py-3 shadow-sm"
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#94a3b8] mb-2">
                                {row.attribute}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(row.options || []).map((opt, optIdx) => (
                                  <span
                                    key={`${row.attribute}-${opt}-${optIdx}`}
                                    className="inline-flex items-center rounded-md border border-[#d7dcf5] bg-[#f8fafc] px-3 py-1 text-sm font-medium text-[#475569]"
                                  >
                                    {opt}
                                  </span>
                                ))}
                                {(!row.options || row.options.length === 0) && (
                                  <span className="text-xs text-[#94a3b8]">No options added</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                      Unit
                    </label>
                    <p className="mt-1.5 text-sm font-medium text-[#1f2937]">{itemGroup.unit || "PCS"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                      Tax Preference
                    </label>
                    <p className="mt-1.5 text-sm font-medium text-[#1f2937]">Taxable</p>
                  </div>
                  {itemGroup.inventoryValuation && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                        Inventory Valuation Method
                      </label>
                      <p className="mt-1.5 text-sm font-medium text-[#1f2937]">{itemGroup.inventoryValuation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Images Section */}
              {itemGroup.groupImages && itemGroup.groupImages.length > 0 && (
                <div className="rounded-xl border border-[#e4e6f2] bg-white p-6">
                  <AttachmentDisplay attachments={itemGroup.groupImages} />
                </div>
              )}

              {/* Items Table Card */}
              {items.length > 0 && (
                <div className="rounded-xl border border-[#e4e6f2] bg-white overflow-hidden">
                  <div className="px-6 py-4 bg-[#fafbff] border-b border-[#e7ebf8] flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                      Items in Group
                    </h3>
                    <button
                      onClick={() => setShowOpeningStockModal(true)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition"
                    >
                      <Building2 size={16} className="text-[#2563eb]" />
                      Opening Stock
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#e6eafb]">
                      <thead className="bg-[#f8fafc]">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                            Item Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                            Cost Price
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                            Selling Price
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                            Stock on Hand
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                            Reorder Point
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9] bg-white">
                        {items.map((item, idx) => {
                          // Calculate total stock from all warehouses
                          let itemStock = 0;
                          
                          if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
                            itemStock = item.warehouseStocks.reduce((total, ws) => {
                              const stockOnHand = parseFloat(ws.stockOnHand) || 0;
                              return total + stockOnHand;
                            }, 0);
                          } else if (typeof item.stock === 'number') {
                            // Fallback to direct stock property if warehouseStocks not available
                            itemStock = item.stock;
                          } else if (item.stock) {
                            itemStock = parseFloat(item.stock) || 0;
                          }
                          
                          return (
                            <tr 
                              key={item._id || item.id || idx} 
                              className="hover:bg-[#f8fafc] cursor-pointer transition-colors duration-150"
                              onClick={() => navigate(`/shoe-sales/item-groups/${id}/items/${item._id || item.id}`)}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d7dcf5] bg-[#f8fafc]">
                                    <Package size={20} className="text-[#64748b]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[#1f2937]">{item.name || "Unnamed Item"}</p>
                                    <p className="text-xs text-[#64748b] mt-0.5">[{item.sku || "N/A"}]</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-[#1f2937]">
                                ₹{typeof item.costPrice === 'number' ? item.costPrice.toFixed(2) : (item.costPrice || "0.00")}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-[#1f2937]">
                                ₹{typeof item.sellingPrice === 'number' ? item.sellingPrice.toFixed(2) : (item.sellingPrice || "0.00")}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-[#1f2937]">{Math.round(itemStock)}</td>
                              <td className="px-6 py-4 text-sm text-[#64748b]">{item.reorderPoint || "—"}</td>
                              <td className="px-6 py-4">
                                <Link
                                  to={`/shoe-sales/item-groups/${id}/items/${item._id || item.id}/edit`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="no-blue-button inline-flex items-center gap-2 rounded-md border border-[#d7dcf5] bg-white px-3 py-1.5 text-sm font-medium text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
                                  title="Edit Variant"
                                >
                                  Edit Variant
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Image Upload & Stock Info */}
            <div className="space-y-6">
              {/* Image Upload Card */}
              <ImageUpload
                onImagesSelect={(images) => setGroupImages(images)}
                existingImages={groupImages}
                onRemoveImage={(index) => {
                  setGroupImages(groupImages.filter((_, i) => i !== index));
                }}
                multiple={true}
              />

              {/* Opening Stock Card */}
              <div className="rounded-xl border border-[#e4e6f2] bg-white shadow-sm overflow-hidden">
                {/* Opening Stock Section */}
                <div className="bg-gradient-to-br from-[#f0f4ff] to-[#f8fafc] px-6 py-6 border-b border-[#e7ebf8]">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-xl bg-white border border-[#d7dcf5] shadow-sm">
                      <Building2 size={20} className="text-[#2563eb]" />
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#475569]">Opening Stock</h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-[#1f2937] leading-none">
                      {Math.round(stockInfo.openingStock)}
                    </p>
                    <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide ml-1">Units</span>
                  </div>
                </div>
                
                {/* Accounting Stock Section */}
                <div className="px-6 py-5 bg-white">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748b] mb-4">Accounting Stock</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm"></div>
                        <span className="text-sm font-medium text-[#64748b]">Stock on Hand</span>
                      </div>
                      <span className="text-base font-bold text-[#1f2937]">
                        {Math.round(stockInfo.stockOnHand)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-sm"></div>
                        <span className="text-sm font-medium text-[#64748b]">Committed Stock</span>
                      </div>
                      <span className="text-base font-bold text-[#1f2937]">
                        {Math.round(stockInfo.committedStock)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
            <div className="px-6 py-4 border-b border-[#e7ebf8]">
              <h2 className="text-lg font-semibold text-[#1f2937]">Delete Item Group</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-[#64748b]">
                Are you sure you want to delete "{itemGroup?.name}"? This action cannot be undone and will delete all items in this group.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#e7ebf8] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="no-blue-button rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-[#f1f5f9] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="no-blue-button rounded-md bg-[#ef4444] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#dc2626] disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Inactive Confirmation Modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
            <div className="px-6 py-4 border-b border-[#e7ebf8]">
              <h2 className="text-lg font-semibold text-[#1f2937]">Mark as Inactive</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-[#64748b]">
                Are you sure you want to mark "{itemGroup?.name}" as inactive? This will hide the group from active lists.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#e7ebf8] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowInactiveModal(false)}
                disabled={loading}
                className="no-blue-button rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-[#f1f5f9] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsInactive}
                disabled={loading}
                className="no-blue-button rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-[#f8fafc] hover:border-[#cbd5f5] disabled:opacity-50"
              >
                {loading ? "Updating..." : "Mark as Inactive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Stock Distribution Modal */}
      {showOpeningStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-2xl my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Distribution of Opening Stock</h2>
                {/* Month Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Month:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setEditingStock({}); // Clear edits when month changes
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOpeningStockModal(false);
                  setEditingStock({});
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                        ITEM NAME
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                        WAREHOUSE
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                        OPENING STOCK
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        OPENING STOCK VALUE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {openingStockData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                          No opening stock data available
                        </td>
                      </tr>
                    ) : (
                      openingStockData.flatMap((itemData, itemIdx) => {
                        const rows = [];
                        
                        // First row: Item name with total
                        rows.push(
                          <tr key={`${itemData.itemId}-total`} className="bg-blue-50">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">
                              <div>
                                <div className="font-semibold">{itemData.itemName}</div>
                                <div className="text-xs text-gray-500 mt-0.5">SKU: {itemData.itemSku || "No SKU"}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">
                              Warehouse (total)
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right border-r border-gray-200">
                              {Math.round(itemData.openingStock)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                              ₹{itemData.openingStockValue.toFixed(2)}
                            </td>
                          </tr>
                        );
                        
                        // Add warehouse rows for this item
                        itemData.warehouseEntries.forEach((warehouseEntry, whIdx) => {
                          // Show all warehouses (matching Zoho Books behavior)
                          const isInactive = warehouseEntry.warehouse.toLowerCase().includes('inactive');
                          const editKey = `${warehouseEntry.itemId}-${warehouseEntry.warehouse}`;
                          const isEditing = editingStock[editKey];
                          
                          rows.push(
                            <tr key={`${itemData.itemId}-${warehouseEntry.warehouse}-${whIdx}`} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-500 border-r border-gray-200"></td>
                              <td className={`px-4 py-2 text-sm border-r border-gray-200 ${isInactive ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                                {warehouseEntry.warehouse}
                                {isInactive && <span className="ml-2 text-xs">(INACTIVE)</span>}
                              </td>
                              <td className="px-4 py-2 text-sm text-right border-r border-gray-200">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={isEditing ? (isEditing.openingStock || '') : Math.round(warehouseEntry.openingStock)}
                                  onChange={(e) => handleStockChange(warehouseEntry.itemId, warehouseEntry.warehouse, 'openingStock', e.target.value, warehouseEntry.itemSellingPrice)}
                                  className="w-24 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-right">
                                <div className="flex items-center justify-end gap-1 px-2 py-1 bg-gray-50 rounded border border-gray-200">
                                  <span className="text-gray-700">₹</span>
                                  <span className="text-gray-900 font-medium">
                                    {(isEditing ? (isEditing.openingStockValue || 0) : warehouseEntry.openingStockValue).toFixed(2)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                        
                        return rows;
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowOpeningStockModal(false);
                  setEditingStock({});
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveMonthlyStock}
                disabled={savingStock || Object.keys(editingStock).length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingStock ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Opening Stock'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoeSalesItemGroupDetail;

