import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Edit, X, Building2, Info, Camera, Settings, Star, Warehouse, ChevronDown, Plus, Copy, Pause, Trash2, ArrowUpRight, XCircle } from "lucide-react";
import Head from "../components/Head";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";
import AttachmentDisplay from "../components/AttachmentDisplay";
import baseUrl from "../api/api";

// Warehouse name mapping: actual names from API -> display names for Stocks page
const WAREHOUSE_NAME_MAPPING = {
  // Actual API names -> Display names
  "G.Palakkad": "Palakkad Branch",
  "G-Palakkad": "Palakkad Branch",
  "G.Palakkad ": "Palakkad Branch",
  "GPalakkad": "Palakkad Branch",
  "Palakkad Branch": "Palakkad Branch",
  "Warehouse": "Warehouse",
  "G.Calicut": "Calicut",
  "G-Calicut": "Calicut",
  "G.Calicut ": "Calicut",
  "GCalicut": "Calicut",
  "Calicut": "Calicut",
  "G.Manjeri": "Manjery Branch",
  "G-Manjeri": "Manjery Branch",
  "G.Manjery": "Manjery Branch",
  "G-Manjery": "Manjery Branch",
  "GManjeri": "Manjery Branch",
  "GManjery": "Manjery Branch",
  "Manjery Branch": "Manjery Branch",
  "G.Kannur": "Kannur Branch",
  "G-Kannur": "Kannur Branch",
  "GKannur": "Kannur Branch",
  "Kannur Branch": "Kannur Branch",
  "G.Edappal": "Edappal Branch",
  "G-Edappal": "Edappal Branch",
  "GEdappal": "Edappal Branch",
  "Edappal Branch": "Edappal Branch",
  "G.Kalpetta": "Kalpetta Branch",
  "G-Kalpetta": "Kalpetta Branch",
  "GKalpetta": "Kalpetta Branch",
  "Kalpetta Branch": "Kalpetta Branch",
  "G.Kottakkal": "Kottakkal Branch",
  "G-Kottakkal": "Kottakkal Branch",
  "GKottakkal": "Kottakkal Branch",
  "Kottakkal Branch": "Kottakkal Branch",
  "Z.Kottakkal": "Kottakkal Branch",
  "Z-Kottakkal": "Kottakkal Branch",
  "G.Perinthalmanna": "Perinthalmanna Branch",
  "G-Perinthalmanna": "Perinthalmanna Branch",
  "GPerinthalmanna": "Perinthalmanna Branch",
  "Perinthalmanna Branch": "Perinthalmanna Branch",
  "Z.Perinthalmanna": "Perinthalmanna Branch",
  "Z-Perinthalmanna": "Perinthalmanna Branch",
  // Trivandrum variations - fix typo and add correct mapping
  "Grooms Trivandum": "Grooms Trivandrum",
  "Grooms Trivandrum": "Grooms Trivandrum",
  "SG-Trivandrum": "Grooms Trivandrum",
  "SG.Trivandrum": "Grooms Trivandrum",
  "G.Chavakkad": "Chavakkad Branch",
  "G-Chavakkad": "Chavakkad Branch",
  "GChavakkad": "Chavakkad Branch",
  "Chavakkad Branch": "Chavakkad Branch",
  "G.Thrissur": "Thrissur Branch",
  "G-Thrissur": "Thrissur Branch",
  "GThrissur": "Thrissur Branch",
  "Thrissur Branch": "Thrissur Branch",
  "G.Perumbavoor": "Perumbavoor Branch",
  "G-Perumbavoor": "Perumbavoor Branch",
  "GPerumbavoor": "Perumbavoor Branch",
  "Perumbavoor Branch": "Perumbavoor Branch",
  "G.Kottayam": "Kottayam Branch",
  "G-Kottayam": "Kottayam Branch",
  "GKottayam": "Kottayam Branch",
  "Kottayam Branch": "Kottayam Branch",
  "G.Edappally": "Edapally Branch",
  "G-Edappally": "Edapally Branch",
  "GEdappally": "Edapally Branch",
  "Edapally Branch": "Edapally Branch",
  "Edapallyadmin Branch": "Edapally Branch",
  "Edapallyadmin": "Edapally Branch",
  "Z-Edapally1": "Edapally Branch",
  "Z-Edapally1 Branch": "Edapally Branch",
  "-Edapally1 Branch": "Edapally Branch",
  "-Edapally1": "Edapally Branch",
  "G.MG Road": "MG Road",
  "G-MG Road": "MG Road",
  "G.Mg Road": "MG Road",
  "G-Mg Road": "MG Road",
  "GMG Road": "MG Road",
  "GMg Road": "MG Road",
  "MG Road": "MG Road",
  "SuitorGuy MG Road": "MG Road",
  // Vadakara variations
  "G.Vadakara": "Vadakara Branch",
  "GVadakara": "Vadakara Branch",
  "Vadakara Branch": "Vadakara Branch"
};

// Display names for the Stocks page (what users see) - Updated with Vadakara Branch
const ALLOWED_WAREHOUSES_DISPLAY = [
  "Palakkad Branch",
  "Warehouse",
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
  "Vadakara Branch",
  "Perumbavoor Branch",
  "Kottayam Branch",
  "Edapally Branch",
  "MG Road"
];

// Get all possible actual warehouse names that map to allowed warehouses
const getAllowedActualNames = () => {
  const actualNames = new Set();
  Object.keys(WAREHOUSE_NAME_MAPPING).forEach(actualName => {
    if (ALLOWED_WAREHOUSES_DISPLAY.includes(WAREHOUSE_NAME_MAPPING[actualName])) {
      actualNames.add(actualName);
    }
  });
  return Array.from(actualNames);
};

// Helper function to normalize warehouse name to display name
const normalizeWarehouseName = (warehouseName) => {
  if (!warehouseName) return null;
  const trimmed = warehouseName.toString().trim();
  
  // Check exact match first
  if (WAREHOUSE_NAME_MAPPING[trimmed]) {
    return WAREHOUSE_NAME_MAPPING[trimmed];
  }
  
  // Check case-insensitive match
  const lowerName = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(WAREHOUSE_NAME_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // If it's already a display name, return it
  if (ALLOWED_WAREHOUSES_DISPLAY.includes(trimmed)) {
    return trimmed;
  }
  
  return null;
};

const ShoeSalesItemDetailFromGroup = () => {
  const { id, itemId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [itemGroup, setItemGroup] = useState(null);
  const [item, setItem] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [stockType, setStockType] = useState("accounting"); // "accounting" or "physical"
  const [showInactiveWarehouses, setShowInactiveWarehouses] = useState(false);
  const [warehouseStocks, setWarehouseStocks] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allItemGroups, setAllItemGroups] = useState([]);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const moreMenuRef = useRef(null);

  // Fetch all warehouses from account settings and filter to only allowed ones
  const fetchAllWarehouses = useCallback(async () => {
    // Always use the display names for the Stocks page
    const sortedWarehouses = [...ALLOWED_WAREHOUSES_DISPLAY].sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    setAllWarehouses(sortedWarehouses);
  }, []);

  const fetchData = useCallback(async () => {
    if (!id || !itemId) return;
    
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
        const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch item group");
        }
        
        const data = await response.json();
        setItemGroup(data);
        
        // Find the specific item
        if (data.items && Array.isArray(data.items)) {
          const foundItem = data.items.find(i => (i._id || i.id) === itemId);
          if (foundItem) {
            console.log("📦 Item detail: Found item:", foundItem.name);
            console.log("📦 Item detail: Item warehouseStocks:", foundItem.warehouseStocks);
            if (foundItem.warehouseStocks && Array.isArray(foundItem.warehouseStocks)) {
              foundItem.warehouseStocks.forEach(ws => {
                console.log(`   - Warehouse: "${ws.warehouse}", Stock: ${ws.stockOnHand || 0}`);
              });
            }
            setItem(foundItem);
          } else {
            console.warn("📦 Item detail: Item not found in group items");
          }
        }
      } catch (error) {
        console.error("Error fetching item:", error);
        setItemGroup(null);
        setItem(null);
      }
  }, [id, itemId]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!id || !itemId) {
      console.log("Missing id or itemId for history fetch:", { id, itemId });
      return;
    }
    
    try {
      setLoadingHistory(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const url = `${API_URL}/api/shoe-sales/item-groups/${id}/items/${itemId}/history`;
      console.log("Fetching history from:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch history:", response.status, errorText);
        throw new Error("Failed to fetch history");
      }
      
      let data = await response.json();
      console.log("History data received:", data);
      
      // Ensure we have an array
      const historyArray = Array.isArray(data) ? data : [];
      
      // Check if we have a CREATE entry, if not and item exists, add one
      const hasCreateEntry = historyArray.some(entry => entry.changeType === "CREATE");
      if (!hasCreateEntry && item && (item.createdAt || itemGroup?.createdAt)) {
        // Add creation entry from item's or group's createdAt
        const createdAt = item.createdAt ? new Date(item.createdAt) : (itemGroup?.createdAt ? new Date(itemGroup.createdAt) : new Date());
        // Try to get createdBy from item, itemGroup, or history entries, or get current user, or use "System"
        let createdBy = item.createdBy || itemGroup?.changedBy || itemGroup?.createdBy;
        if (!createdBy) {
          // Try to get from history entries if available
          const createHistoryEntry = historyArray.find(entry => entry.changeType === "CREATE");
          if (createHistoryEntry && createHistoryEntry.changedBy) {
            createdBy = createHistoryEntry.changedBy;
          } else {
            // Get current user as fallback
            const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
            createdBy = currentUser.username || currentUser.locName || "System";
          }
        }
        const createEntry = {
          itemId: itemId.toString(),
          itemGroupId: id,
          changeType: "CREATE",
          details: "created",
          changedBy: createdBy,
          changedAt: createdAt,
          createdAt: createdAt,
          oldData: null,
          newData: item,
        };
        // Add at the end (will be sorted by changedAt)
        historyArray.push(createEntry);
      }
      
      // Sort by changedAt descending (most recent first)
      historyArray.sort((a, b) => {
        const dateA = new Date(a.changedAt || a.createdAt || 0);
        const dateB = new Date(b.changedAt || b.createdAt || 0);
        return dateB - dateA;
      });
      
      setHistory(historyArray);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [id, itemId, item, itemGroup]);

  // Fetch all item groups for the move modal
  const fetchAllItemGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch item groups");
      }
      
      const data = await response.json();
      // Filter out the current group and only show active groups
      const filteredGroups = data.filter(group => {
        const groupIdStr = (group._id || group.id || "").toString();
        return groupIdStr !== id.toString() && (group.isActive !== false);
      });
      
      setAllItemGroups(filteredGroups);
    } catch (error) {
      console.error("Error fetching item groups:", error);
      alert("Failed to load item groups. Please try again.");
    } finally {
      setLoadingGroups(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    fetchAllWarehouses();
  }, [fetchData, fetchAllWarehouses]);

  useEffect(() => {
    if (activeTab === "History") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Fetch groups when move modal opens
  useEffect(() => {
    if (showMoveModal) {
      fetchAllItemGroups();
      setSelectedTargetGroupId("");
    }
  }, [showMoveModal, fetchAllItemGroups]);

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
  
  // Fallback locations mapping (same as other pages)
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
      console.log(`Item Detail: Found location by locCode ${user.locCode}: "${location.locName}"`);
    }
  }
  // Fallback to username/locName if locCode lookup didn't work
  if (!userLocName) {
    userLocName = user?.username || user?.locName || "";
    console.log(`Item Detail: Using username/locName fallback: "${userLocName}"`);
  }
  
  // Use the shared warehouse mapping utility
  const mapLocNameToWarehouse = (locName) => {
    if (!locName) return "";
    return mapWarehouse(locName);
  };
  
  const userWarehouse = mapLocNameToWarehouse(userLocName);
  console.log(`Item Detail: Mapped warehouse: "${userWarehouse}" (from locName: "${userLocName}")`);
  
  // Combine all warehouses with stock data
  useEffect(() => {
    console.log("📊 Stock Display: useEffect triggered");
    console.log("   allWarehouses.length:", allWarehouses.length);
    console.log("   item:", item ? { name: item.name, hasWarehouseStocks: !!item.warehouseStocks } : "null");
    console.log("   isAdmin:", isAdmin);
    console.log("   userWarehouse:", userWarehouse);
    
    if (allWarehouses.length > 0) {
      // Get item warehouse stocks if item exists
      const itemWarehouseStocks = item?.warehouseStocks || [];
      console.log("   itemWarehouseStocks:", itemWarehouseStocks);
      
      // Create a map of warehouse stocks by normalized display name
      const stockMap = new Map();
      itemWarehouseStocks.forEach(stock => {
        if (stock.warehouse) {
          // Normalize the warehouse name to display name
          const displayName = normalizeWarehouseName(stock.warehouse);
          console.log(`   Normalizing "${stock.warehouse}" -> "${displayName}"`);
          if (displayName && ALLOWED_WAREHOUSES_DISPLAY.includes(displayName)) {
            // Store with display name as key, but keep original stock data
            stockMap.set(displayName, {
              ...stock,
              warehouse: displayName // Use display name
            });
            console.log(`   ✅ Added to stockMap: "${displayName}" with stock: ${stock.stockOnHand || 0}`);
          } else {
            console.log(`   ❌ Skipped: displayName="${displayName}", in ALLOWED_WAREHOUSES_DISPLAY: ${displayName ? ALLOWED_WAREHOUSES_DISPLAY.includes(displayName) : false}`);
          }
        }
      });
      
      // Determine which warehouses to show
      let warehousesToShow = [...ALLOWED_WAREHOUSES_DISPLAY];
      
      // For non-admin users, filter to only show their warehouse
      if (!isAdmin && userWarehouse) {
        warehousesToShow = warehousesToShow.filter(wh => {
          const whLower = wh.toLowerCase();
          const userWhLower = userWarehouse.toLowerCase();
          return whLower === userWhLower || 
                 whLower.includes(userWhLower) ||
                 userWhLower.includes(whLower);
        });
      }
      
      // Sort warehouses: "Warehouse" first, then alphabetically
      const sortedWarehouses = warehousesToShow.sort((a, b) => {
        if (a === "Warehouse") return -1;
        if (b === "Warehouse") return 1;
        return a.localeCompare(b);
      });
      
      // Create combined list: ONLY warehouses that have actual stock entries (including 0 stock)
      // This shows only stores where stock was actually added at some point
      const combinedStocks = sortedWarehouses
        .map(displayName => {
          const existingStock = stockMap.get(displayName);
          
          if (existingStock) {
            return existingStock;
          }
          
          return null; // Don't create default entries for warehouses that never had stock
        })
        .filter(stock => stock !== null); // Remove null entries (warehouses that never had stock)
      
      console.log("   Final combinedStocks:", combinedStocks.map(s => `${s.warehouse}: ${s.stockOnHand || 0}`).join(", "));
      setWarehouseStocks(combinedStocks);
    } else if (item && item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
      console.log("   Using fallback: item has warehouseStocks but allWarehouses is empty");
      // If no warehouses from API but item has warehouse stocks, normalize and filter
      const stockMap = new Map();
      item.warehouseStocks.forEach(stock => {
        if (stock.warehouse) {
          const displayName = normalizeWarehouseName(stock.warehouse);
          if (displayName && ALLOWED_WAREHOUSES_DISPLAY.includes(displayName)) {
            stockMap.set(displayName, {
              ...stock,
              warehouse: displayName
            });
          }
        }
      });
      
      // Determine which warehouses to show
      let warehousesToShow = [...ALLOWED_WAREHOUSES_DISPLAY];
      
      // For non-admin users, filter to only show their warehouse
      if (!isAdmin && userWarehouse) {
        warehousesToShow = warehousesToShow.filter(wh => {
          const whLower = wh.toLowerCase();
          const userWhLower = userWarehouse.toLowerCase();
          return whLower === userWhLower || 
                 whLower.includes(userWhLower) ||
                 userWhLower.includes(whLower);
        });
      }
      
      const sortedWarehouses = warehousesToShow.sort((a, b) => {
        if (a === "Warehouse") return -1;
        if (b === "Warehouse") return 1;
        return a.localeCompare(b);
      });
      
      const combinedStocks = sortedWarehouses
        .map(displayName => {
          const existingStock = stockMap.get(displayName);
          if (existingStock) {
            return existingStock;
          }
          return null; // Don't create default entries for warehouses that never had stock
        })
        .filter(stock => stock !== null); // Remove null entries (warehouses that never had stock)
      
      setWarehouseStocks(combinedStocks);
    } else if (allWarehouses.length === 0 && !item) {
      // If no warehouses and no item, show empty array
      setWarehouseStocks([]);
    }
  }, [allWarehouses, item, isAdmin, userWarehouse]);

  // Check if returning from stock management page and refresh data
  useEffect(() => {
    const stocksUpdated = searchParams.get('stocksUpdated');
    const message = searchParams.get('message');
    
    if (stocksUpdated === 'true') {
      // Show success message if provided
      if (message) {
        alert(decodeURIComponent(message));
      }
      
      // Switch to Stocks tab
      setActiveTab("Stocks");
      // Refresh data
      fetchData();
      // Remove the query parameters after data is refreshed
      setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 100);
    }
  }, [searchParams, setSearchParams, fetchData]);

  // Listen for stock updates from purchase receive, bills, transfer orders, etc.
  useEffect(() => {
    const handleStockUpdated = (event) => {
      console.log("📦 Stock updated event received, refreshing item data...", event.detail);
      
      // Check if this item was affected by the stock update
      const updatedItems = event.detail?.items || event.detail?.updatedItems || [];
      const itemIds = event.detail?.itemIds || [];
      
      // Check if current item is in the updated items
      const isItemAffected = updatedItems.some(updatedItem => {
        const updatedItemId = updatedItem.itemId?._id || updatedItem.itemId || updatedItem.itemIdValue;
        const updatedItemGroupId = updatedItem.itemGroupId || updatedItem.itemGroupIdValue;
        const updatedItemName = updatedItem.itemName || updatedItem.name;
        const updatedItemSku = updatedItem.itemSku || updatedItem.sku;
        
        // Match by itemGroupId - if group ID matches, always refresh (any item in group might have been updated)
        if (id && updatedItemGroupId) {
          const groupIdMatch = id.toString() === updatedItemGroupId.toString();
          if (groupIdMatch) {
            // If we have a specific item, also check if name/SKU matches (more precise)
            if (item && item.name) {
              const nameMatch = item.name === updatedItemName || item.sku === updatedItemSku;
              if (nameMatch) {
                console.log(`✅ Group ID and item name match - refreshing`);
                return true;
              }
            } else {
              // Group ID matches but no specific item loaded - refresh anyway (group stock changed)
              console.log(`✅ Group ID matches - refreshing (group stock may have changed)`);
              return true;
            }
          }
        }
        
        // Match by itemId (for standalone items)
        if (itemId && updatedItemId) {
          if (itemId.toString() === updatedItemId.toString()) {
            console.log(`✅ Item ID matches - refreshing`);
            return true;
          }
        }
        
        // Match by itemIds array
        if (itemId && itemIds.includes(itemId.toString())) {
          console.log(`✅ Item ID in array matches - refreshing`);
          return true;
        }
        
        return false;
      });
      
      // If item is affected or no specific items specified (global update), refresh
      if (isItemAffected || updatedItems.length === 0) {
        console.log("✅ Item is affected by stock update, refreshing...");
        fetchData();
        fetchAllWarehouses(); // Also refresh warehouses to get latest stock
      } else {
        console.log("ℹ️ Stock updated but this item was not affected");
      }
    };
    
    // Listen for stockUpdated event
    window.addEventListener("stockUpdated", handleStockUpdated);
    
    // Also listen for receiveSaved event (purchase receive)
    // Always refresh when purchase receive is saved, as stock might have been updated
    const handleReceiveSaved = () => {
      console.log("📦 Purchase receive saved, refreshing item data...");
      // Small delay to ensure database has been updated
      setTimeout(() => {
        console.log("🔄 Refreshing after purchase receive saved...");
        fetchData();
        fetchAllWarehouses();
      }, 1000); // Increased delay to ensure backend has finished updating
    };
    window.addEventListener("receiveSaved", handleReceiveSaved);
    
    // Listen for transferOrderReceived event
    const handleTransferOrderReceived = (event) => {
      console.log("📦 Transfer order received, refreshing item data...", event.detail);
      // Check if this warehouse is affected
      const destinationWarehouse = event.detail?.destinationWarehouse;
      if (destinationWarehouse && userWarehouse) {
        const destLower = destinationWarehouse.toLowerCase();
        const userWhLower = userWarehouse.toLowerCase();
        if (destLower === userWhLower || destLower.includes(userWhLower) || userWhLower.includes(destLower)) {
          console.log("✅ Transfer order affects this warehouse, refreshing...");
          fetchData();
          fetchAllWarehouses();
        }
      } else {
        // If no specific warehouse, refresh anyway
        fetchData();
        fetchAllWarehouses();
      }
    };
    window.addEventListener("transferOrderReceived", handleTransferOrderReceived);
    
    // Also refresh when page becomes visible (user navigated back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("📦 Page became visible, refreshing item data...");
        // Small delay to ensure any pending updates are complete
        setTimeout(() => {
          fetchData();
          fetchAllWarehouses();
        }, 500);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdated);
      window.removeEventListener("receiveSaved", handleReceiveSaved);
      window.removeEventListener("transferOrderReceived", handleTransferOrderReceived);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, fetchAllWarehouses, id, itemId, item, userWarehouse]);

  // Calculate stock totals
  const stockTotals = useMemo(() => {
    console.log("📊 Calculating stock totals from warehouseStocks:", warehouseStocks);
    console.log("📊 Current item:", item ? { name: item.name, stock: item.stock } : null);
    console.log("📊 isAdmin:", isAdmin);
    
    const totals = {
      accounting: {
        openingStock: 0,
        stockOnHand: 0,
        availableForSale: 0,
      },
      physical: {
        openingStock: 0,
        stockOnHand: 0,
        availableForSale: 0,
      },
    };
    
    if (warehouseStocks && Array.isArray(warehouseStocks)) {
      warehouseStocks.forEach(stock => {
        console.log(`   Processing warehouse: "${stock.warehouse}", stockOnHand: ${stock.stockOnHand || 0}`);
        const opening = parseFloat(stock.openingStock || 0);
        // Don't fallback to opening if stockOnHand is 0 - 0 is a valid value!
        const onHand = stock.stockOnHand !== undefined && stock.stockOnHand !== null
          ? parseFloat(stock.stockOnHand)
          : parseFloat(stock.openingStock || 0);
        const available = stock.availableForSale !== undefined && stock.availableForSale !== null
          ? parseFloat(stock.availableForSale)
          : parseFloat(onHand);
        
        totals.accounting.openingStock += opening;
        totals.accounting.stockOnHand += onHand;
        totals.accounting.availableForSale += available;

        // Physical totals read from dedicated fields when present
        const pOpening = parseFloat(stock.physicalOpeningStock || 0);
        // Don't fallback to pOpening if physicalStockOnHand is 0 - 0 is a valid value!
        const pOnHand = stock.physicalStockOnHand !== undefined && stock.physicalStockOnHand !== null 
          ? parseFloat(stock.physicalStockOnHand) 
          : parseFloat(pOpening || 0);
        const pAvailable = stock.physicalAvailableForSale !== undefined && stock.physicalAvailableForSale !== null
          ? parseFloat(stock.physicalAvailableForSale)
          : parseFloat(pOnHand || 0);
        totals.physical.openingStock += isNaN(pOpening) ? 0 : pOpening;
        totals.physical.stockOnHand += isNaN(pOnHand) ? 0 : pOnHand;
        totals.physical.availableForSale += isNaN(pAvailable) ? 0 : pAvailable;
      });
    }
    
    console.log("📊 Calculated totals BEFORE fallback:", totals);
    
    // Fallback to item.stock if no warehouse stocks - but NOT for store users who should only see their warehouse
    if (totals.accounting.stockOnHand === 0 && typeof item?.stock === 'number' && isAdmin) {
      console.log("📊 Using fallback item.stock (admin only):", item.stock);
      totals.accounting.stockOnHand = item.stock;
      totals.accounting.openingStock = item.stock;
      totals.accounting.availableForSale = item.stock;
    } else if (!isAdmin) {
      console.log("📊 Store user - not using fallback item.stock, showing warehouse-specific totals");
    }
    
    console.log("📊 Final calculated totals:", totals);
    
    // Physical totals are independent; rely only on physical fields
    return totals;
  }, [warehouseStocks, item, isAdmin]);

  if (!itemGroup || !item) {
    return (
      <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
        <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-lg p-8 text-center">
          <p className="text-lg font-medium text-[#475569]">Item not found</p>
          <Link
            to={`/shoe-sales/item-groups/${id}`}
            className="mt-4 inline-block text-sm font-medium text-[#475569] hover:text-[#1f2937]"
          >
            Back to Item Group
          </Link>
        </div>
      </div>
    );
  }

  // Extract attribute values from item name or attributeCombination
  const getAttributeValue = (attributeName) => {
    if (item.attributeCombination && Array.isArray(item.attributeCombination)) {
      // Try to match attribute name with the combination
      if (itemGroup.attributeRows && Array.isArray(itemGroup.attributeRows)) {
        const attrRow = itemGroup.attributeRows.find(row => 
          row.attribute && row.attribute.toLowerCase() === attributeName.toLowerCase()
        );
        if (attrRow) {
          const index = itemGroup.attributeRows.indexOf(attrRow);
          return item.attributeCombination[index] || "";
        }
      }
    }
    return "";
  };

  // Handler functions for More menu options
  const handleCloneItem = async () => {
    try {
      setLoading(true);
      setShowMoreMenu(false);
      
      if (!itemGroup || !item) {
        alert("Item data not available.");
        return;
      }

      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Create a copy of the item with a new name
      const clonedItem = {
        ...item,
        name: `${item.name} (Copy)`,
        sku: item.sku ? `${item.sku}-COPY` : "",
        _id: undefined, // Remove _id so it creates a new item
        id: undefined,
      };

      // Add the cloned item to the group
      const updatedItems = [...(itemGroup.items || []), clonedItem];
      
      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to clone item");
      }

      alert("Item cloned successfully!");
      // Refresh the page to show the new item
      window.location.reload();
    } catch (error) {
      console.error("Error cloning item:", error);
      alert("Failed to clone item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsInactive = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      if (!itemGroup || !item) {
        alert("Item data not available.");
        return;
      }

      // Mark the item as inactive instead of removing it
      const updatedItems = itemGroup.items.map(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        if (itemIdStr === itemId.toString()) {
          return {
            ...i,
            isActive: false
          };
        }
        return i;
      });

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to mark item as inactive");
      }

      setShowInactiveModal(false);
      alert("Item has been marked as inactive.");
      navigate(`/shoe-sales/inactive-items`);
    } catch (error) {
      console.error("Error marking item as inactive:", error);
      alert("Failed to mark item as inactive. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      if (!itemGroup || !item) {
        alert("Item data not available.");
        return;
      }

      // Remove the item from the items array
      const updatedItems = itemGroup.items.filter(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        return itemIdStr !== itemId.toString();
      });

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      const updatePayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        itemId: itemId,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      setShowDeleteModal(false);
      alert("Item deleted successfully.");
      navigate(`/shoe-sales/item-groups/${id}`);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleMoveToGroup = async () => {
    if (!selectedTargetGroupId) {
      alert("Please select a target group.");
      return;
    }

    if (!itemGroup || !item) {
      alert("Item data not available.");
      return;
    }

    try {
      setLoading(true);
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      
      // Fetch the target group
      const targetGroupResponse = await fetch(`${API_URL}/api/shoe-sales/item-groups/${selectedTargetGroupId}`);
      if (!targetGroupResponse.ok) {
        throw new Error("Failed to fetch target group");
      }
      const targetGroup = await targetGroupResponse.json();

      // Prepare the item to move (preserve all properties)
      const itemToMove = {
        ...item,
        _id: undefined, // Remove _id so it gets a new one in the target group
        id: undefined,
      };

      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      // Remove item from current group
      const updatedCurrentGroupItems = itemGroup.items.filter(i => {
        const itemIdStr = (i._id?.toString() || i.id || "").toString();
        return itemIdStr !== itemId.toString();
      });

      const currentGroupPayload = {
        name: itemGroup.name,
        sku: itemGroup.sku || "",
        itemType: itemGroup.itemType || "goods",
        unit: itemGroup.unit || "",
        manufacturer: itemGroup.manufacturer || "",
        brand: itemGroup.brand || "",
        taxPreference: itemGroup.taxPreference || "taxable",
        intraStateTaxRate: itemGroup.intraStateTaxRate || "",
        interStateTaxRate: itemGroup.interStateTaxRate || "",
        inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
        createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
        attributeRows: itemGroup.attributeRows || [],
        sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
        purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
        trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
        items: updatedCurrentGroupItems,
        stock: itemGroup.stock || 0,
        reorder: itemGroup.reorder || "",
        isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
        itemId: itemId,
        changedBy: changedBy,
      };

      // Add item to target group
      const updatedTargetGroupItems = [...(targetGroup.items || []), itemToMove];

      const targetGroupPayload = {
        name: targetGroup.name,
        sku: targetGroup.sku || "",
        itemType: targetGroup.itemType || "goods",
        unit: targetGroup.unit || "",
        manufacturer: targetGroup.manufacturer || "",
        brand: targetGroup.brand || "",
        taxPreference: targetGroup.taxPreference || "taxable",
        intraStateTaxRate: targetGroup.intraStateTaxRate || "",
        interStateTaxRate: targetGroup.interStateTaxRate || "",
        inventoryValuationMethod: targetGroup.inventoryValuationMethod || "",
        createAttributes: targetGroup.createAttributes !== undefined ? targetGroup.createAttributes : true,
        attributeRows: targetGroup.attributeRows || [],
        sellable: targetGroup.sellable !== undefined ? targetGroup.sellable : true,
        purchasable: targetGroup.purchasable !== undefined ? targetGroup.purchasable : true,
        trackInventory: targetGroup.trackInventory !== undefined ? targetGroup.trackInventory : false,
        items: updatedTargetGroupItems,
        stock: targetGroup.stock || 0,
        reorder: targetGroup.reorder || "",
        isActive: targetGroup.isActive !== undefined ? targetGroup.isActive : true,
        changedBy: changedBy,
      };

      // Update both groups
      const [currentGroupResponse, targetGroupResponse2] = await Promise.all([
        fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentGroupPayload),
        }),
        fetch(`${API_URL}/api/shoe-sales/item-groups/${selectedTargetGroupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetGroupPayload),
        }),
      ]);

      if (!currentGroupResponse.ok || !targetGroupResponse2.ok) {
        throw new Error("Failed to move item");
      }

      setShowMoveModal(false);
      alert(`Item "${item.name}" has been moved successfully!`);
      navigate(`/shoe-sales/item-groups/${selectedTargetGroupId}`);
    } catch (error) {
      console.error("Error moving item:", error);
      alert("Failed to move item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
      <Head
        title={item.name || "Item Detail"}
        description={item.sku ? `SKU: ${item.sku}` : itemGroup.name}
        actions={
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <Link
                  to={`/shoe-sales/item-groups/${id}/items/${itemId}/edit`}
                  className="no-blue-button h-10 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-[#1a1a2e] rounded-lg hover:bg-[#2d2d44] transition-colors"
                >
                  <Edit size={16} />
                  Edit
                </Link>
                <div className="relative" ref={moreMenuRef}>
                  <button 
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`no-blue-button h-10 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium border rounded-lg transition-colors ${
                      showMoreMenu 
                        ? "bg-[#f3f4f6] border-[#d1d5db] text-[#1f2937]" 
                        : "bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] hover:border-[#d1d5db]"
                    }`}
                  >
                    More
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform ${showMoreMenu ? "rotate-180" : ""}`} 
                    />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[#e5e7eb] bg-white shadow-lg z-50 flex flex-col divide-y divide-[#e5e7eb]">
                      <button
                        onClick={handleCloneItem}
                        className="no-blue-button w-full px-4 py-3.5 text-left text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors flex items-center gap-3 bg-white"
                      >
                        <Copy size={16} className="text-[#6b7280]" />
                        <span>Clone Item</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowInactiveModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="no-blue-button w-full px-4 py-3.5 text-left text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors flex items-center gap-3 bg-white"
                      >
                        <Pause size={16} className="text-[#6b7280]" />
                        <span>Mark as Inactive</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowDeleteModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="no-blue-button w-full px-4 py-3.5 text-left text-sm text-[#dc2626] hover:bg-[#fef2f2] transition-colors flex items-center gap-3 bg-white"
                      >
                        <Trash2 size={16} className="text-[#dc2626]" />
                        <span>Delete</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowMoveModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="no-blue-button w-full px-4 py-3.5 text-left text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors flex items-center gap-3 bg-white"
                      >
                        <ArrowUpRight size={16} className="text-[#6b7280]" />
                    <span>Move to another group</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowRemoveModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="no-blue-button w-full px-4 py-3.5 text-left text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors flex items-center gap-3 bg-white"
                  >
                    <XCircle size={16} className="text-[#6b7280]" />
                    <span>Remove from Group</span>
                  </button>
                </div>
              )}
            </div>
                <Link
                  to={`/shoe-sales/item-groups/${id}`}
                  className="no-blue-button h-10 w-10 inline-flex items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-[#f9fafb] hover:border-[#d1d5db] transition-colors"
                >
                  <X size={18} />
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
        {/* Tabs */}
        <div className="flex items-center gap-6 px-6">
          {["Overview", "Stocks", ...(isAdmin || user?.power === 'warehouse' ? ["History"] : [])].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`no-blue-button py-4 text-sm font-medium transition ${
                activeTab === tab
                  ? "text-[#1f2937] font-semibold"
                  : "text-[#64748b] hover:text-[#1f2937]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === "Overview" && (
            <div className="space-y-8">
              {/* Stock Summary Cards */}
              <div className="grid grid-cols-3 gap-6" key={`stock-summary-${warehouseStocks.length}-${JSON.stringify(stockTotals)}`}>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5">
                  <p className="text-sm font-medium text-[#64748b] mb-2">Stock on Hand</p>
                  <p className="text-3xl font-bold text-[#1a1a2e]">{stockTotals.accounting.stockOnHand.toFixed(0)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-5">
                  <p className="text-sm font-medium text-[#64748b] mb-2">Available for Sale</p>
                  <p className="text-3xl font-bold text-[#1a1a2e]">{stockTotals.accounting.availableForSale.toFixed(0)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5">
                  <p className="text-sm font-medium text-[#64748b] mb-2">Reorder Point</p>
                  <p className="text-3xl font-bold text-[#1a1a2e]">{item.reorderPoint || "—"}</p>
                </div>
              </div>

              {/* Images Section */}
              {itemGroup.groupImages && itemGroup.groupImages.length > 0 && (
                <div>
                  <AttachmentDisplay attachments={itemGroup.groupImages} />
                </div>
              )}

              {/* Two Column Layout */}
              <div className="grid grid-cols-2 gap-x-16 gap-y-10">
                {/* Left Column */}
                <div className="space-y-10">
                  {/* Pricing */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Pricing</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Cost Price</span>
                        <span className="text-sm font-semibold text-[#1a1a2e]">₹{typeof item.costPrice === 'number' ? item.costPrice.toFixed(2) : (item.costPrice || "0.00")}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Selling Price</span>
                        <span className="text-sm font-semibold text-[#10b981]">₹{typeof item.sellingPrice === 'number' ? item.sellingPrice.toFixed(2) : (item.sellingPrice || "0.00")}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">HSN Code</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">{item.hsnCode || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tax */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Tax</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Tax Preference</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">{itemGroup.taxPreference === "taxable" ? "Taxable" : "Non-Taxable"}</span>
                      </div>
                      {itemGroup.intraStateTaxRate && (
                        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                          <span className="text-sm text-[#64748b]">Intra State Tax</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{itemGroup.intraStateTaxRate}</span>
                        </div>
                      )}
                      {itemGroup.interStateTaxRate && (
                        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                          <span className="text-sm text-[#64748b]">Inter State Tax</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{itemGroup.interStateTaxRate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Status</h3>
                    <div className="flex flex-wrap gap-3">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${itemGroup.sellable !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${itemGroup.sellable !== false ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        Sellable
                      </span>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${itemGroup.purchasable !== false ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${itemGroup.purchasable !== false ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                        Purchasable
                      </span>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${item.returnable === true ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${item.returnable === true ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
                        {item.returnable === true ? 'Returnable' : 'Non-Returnable'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-10">
                  {/* Details */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Details</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Item Group</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">{itemGroup.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Item Type</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">{itemGroup.itemType === "goods" ? "Inventory Item" : "Service"}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">SKU</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">{item.sku || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Unit</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">{itemGroup.unit || "pcs"}</span>
                      </div>
                      {itemGroup.attributeRows && itemGroup.attributeRows.map((attrRow, idx) => {
                        const attrValue = item.attributeCombination && item.attributeCombination[idx] 
                          ? item.attributeCombination[idx] 
                          : getAttributeValue(attrRow.attribute);
                        return attrRow.attribute ? (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                            <span className="text-sm text-[#64748b]">{attrRow.attribute}</span>
                            <span className="text-sm font-medium text-[#1a1a2e]">{attrValue || "—"}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Inventory */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Inventory</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Inventory Account</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">Inventory Asset</span>
                      </div>
                      {itemGroup.inventoryValuationMethod && (
                        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                          <span className="text-sm text-[#64748b]">Valuation Method</span>
                          <span className="text-sm font-medium text-[#1a1a2e]">{itemGroup.inventoryValuationMethod}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Track Inventory</span>
                        <span className={`text-sm font-medium ${itemGroup.trackInventory ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {itemGroup.trackInventory ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Accounts */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-5">Accounts</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Sales Account</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">Sales</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
                        <span className="text-sm text-[#64748b]">Purchase Account</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">Cost of Goods Sold</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Stocks" && (
            <div className="space-y-6">
              {/* Stock Location Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e4e6f2]">
                <button
                  onClick={() => {
                    navigate(`/shoe-sales/item-groups/${id}/items/${itemId}/stocks?type=${stockType}`);
                  }}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Settings size={16} className="text-[#64748b]" />
                  <span className="text-base font-semibold text-[#1f2937]">Stock Locations</span>
                  <ChevronDown size={16} className="text-[#64748b]" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStockType("accounting")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                      stockType === "accounting"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700"
                        : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    Accounting Stock
                  </button>
                  <button
                    onClick={() => setStockType("physical")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                      stockType === "physical"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700"
                        : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    Physical Stock
                  </button>
                </div>
              </div>

              {/* Warehouses Table - Matching Image Layout */}
              {allWarehouses.length > 0 || warehouseStocks.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Warehouse Name
                        </th>
                        <th colSpan={3} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200">
                          {stockType === "accounting" ? "Accounting Stock" : "Physical Stock"}
                        </th>
                      </tr>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 border-l border-gray-200">
                          Stock on Hand
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Committed Stock
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Available for Sale
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {warehouseStocks
                        .filter((stock) => {
                          // Always show warehouse stocks, including those with 0 stock
                          // This allows users to see which stores they've sent stock to, even if it's now 0
                          return true;
                        })
                        .map((stock, idx) => {
                        // Accounting values - don't fallback to opening if stockOnHand is 0
                        const accountingOnHand = stock.stockOnHand !== undefined && stock.stockOnHand !== null
                          ? parseFloat(stock.stockOnHand)
                          : parseFloat(stock.openingStock || 0);
                        const accountingCommitted = parseFloat(stock.committedStock || 0);
                        const accountingAvailable = stock.availableForSale !== undefined && stock.availableForSale !== null
                          ? parseFloat(stock.availableForSale)
                          : parseFloat(accountingOnHand - accountingCommitted);

                        // Physical values - don't fallback to opening if physicalStockOnHand is 0
                        const physicalOnHand = stock.physicalStockOnHand !== undefined && stock.physicalStockOnHand !== null
                          ? parseFloat(stock.physicalStockOnHand)
                          : parseFloat(stock.physicalOpeningStock || 0);
                        const physicalCommitted = parseFloat(stock.physicalCommittedStock || 0);
                        const physicalAvailable = stock.physicalAvailableForSale !== undefined && stock.physicalAvailableForSale !== null
                          ? parseFloat(stock.physicalAvailableForSale)
                          : parseFloat(physicalOnHand - physicalCommitted || 0);

                        // Display depends on selected stock type
                        const stockOnHandValue = stockType === "accounting" ? accountingOnHand : (isNaN(physicalOnHand) ? 0 : physicalOnHand);
                        const committedStockValue = stockType === "accounting" ? accountingCommitted : (isNaN(physicalCommitted) ? 0 : physicalCommitted);
                        const availableForSaleValue = stockType === "accounting" ? accountingAvailable : (isNaN(physicalAvailable) ? 0 : physicalAvailable);
                        const isMainWarehouse = stock.warehouse === "Warehouse";
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {isMainWarehouse && (
                                  <Star size={16} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-gray-900">
                                  {stock.warehouse}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-l border-gray-100">
                              {stockOnHandValue.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {availableForSaleValue.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-[#e4e6f2] bg-white p-12 text-center">
                  <Warehouse size={48} className="mx-auto mb-4 text-[#94a3b8]" />
                  <p className="text-sm font-medium text-[#475569] mb-2">No stock locations added yet</p>
                  <p className="text-xs text-[#64748b] mb-4">Click "Stock Locations" above to add stocks to warehouses</p>
                  <button
                    onClick={() => navigate(`/shoe-sales/item-groups/${id}/items/${itemId}/stocks?type=${stockType}`)}
                    className="no-blue-button inline-flex items-center gap-2 rounded-lg border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
                  >
                    <Plus size={16} className="text-[#64748b]" />
                    <span>Add Stock Locations</span>
                  </button>
                </div>
              )}

              {/* Show Inactive Warehouses Link - Only show if there are stocks */}
              {warehouseStocks.length > 0 && (
                <div className="flex items-center gap-2 pt-4">
                  <button
                    onClick={() => setShowInactiveWarehouses(!showInactiveWarehouses)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <span>Show Inactive Warehouses</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-gray-500 transition-transform duration-200 ${
                        showInactiveWarehouses ? "rotate-180" : "rotate-0"
                      }`} 
                    />
                  </button>
                </div>
              )}

              {/* Inactive Warehouses (if shown) */}
              {showInactiveWarehouses && warehouseStocks.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Warehouse Name
                        </th>
                        <th colSpan={3} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 border-l border-gray-200">
                          {stockType === "accounting" ? "Accounting Stock" : "Physical Stock"}
                        </th>
                      </tr>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 border-l border-gray-200">
                          Stock on Hand
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Committed Stock
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Available for Sale
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="opacity-60 hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Warehouse size={16} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-500">Inactive Warehouse</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-l border-gray-100">0.00</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">0.00</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "History" && (isAdmin || user?.power === 'warehouse') && (
            <div className="py-6">
              {loadingHistory ? (
                <div className="py-12 text-center text-sm text-[#64748b]">
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#64748b]">
                  No history available
                </div>
              ) : (
                <div className="rounded-lg border border-[#e4e6f2] bg-white overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          DATE
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                          DETAILS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {history.map((entry, idx) => {
                        // Use changedAt, createdAt, or current date as fallback
                        const dateValue = entry.changedAt || entry.createdAt || new Date();
                        const date = new Date(dateValue);
                        
                        // Check if date is valid
                        if (isNaN(date.getTime())) {
                          console.error("Invalid date for history entry:", entry);
                        }
                        
                        const formattedDate = date.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });
                        const formattedTime = date.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        });
                        let detailsText = entry.details || "updated";
                        // Format details to match expected format: "updated by - [Entity]" or "created by - [Entity]"
                        if (entry.changedBy) {
                          if (entry.changeType === "CREATE") {
                            detailsText = `created by - ${entry.changedBy}`;
                          } else {
                            detailsText = entry.details && entry.details !== "updated" 
                              ? `${entry.details} - ${entry.changedBy}`
                              : `updated by - ${entry.changedBy}`;
                          }
                        }
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formattedDate} {formattedTime}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {detailsText}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab !== "Overview" && activeTab !== "Stocks" && activeTab !== "History" && (
            <div className="py-12 text-center text-sm text-[#64748b]">
              {activeTab} content coming soon...
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
            <div className="px-6 py-4 border-b border-[#e7ebf8]">
              <h2 className="text-lg font-semibold text-[#1f2937]">Delete Item</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-[#64748b]">
                Are you sure you want to delete "{item?.name}"? This action cannot be undone.
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
                Are you sure you want to mark "{item?.name}" as inactive? This will remove the item from the group.
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

      {/* Move to Another Group Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
            <div className="px-6 py-4 border-b border-[#e7ebf8]">
              <h2 className="text-lg font-semibold text-[#1f2937]">Move to Another Group</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-[#64748b] mb-4">
                Select a target group to move "{item?.name}" to:
              </p>
              {loadingGroups ? (
                <div className="text-center py-4 text-sm text-[#64748b]">Loading groups...</div>
              ) : allItemGroups.length === 0 ? (
                <div className="text-center py-4 text-sm text-[#64748b]">
                  No other item groups available.
                </div>
              ) : (
                <select
                  value={selectedTargetGroupId}
                  onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                  className="w-full rounded-lg border border-[#d7dcf5] bg-white px-4 py-2.5 text-sm text-[#1f2937] focus:border-[#cbd5f5] focus:outline-none focus:ring-2 focus:ring-[#e7ebf8]"
                >
                  <option value="">Select a group...</option>
                  {allItemGroups.map((group) => (
                    <option key={group._id || group.id} value={group._id || group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#e7ebf8] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedTargetGroupId("");
                }}
                disabled={loading}
                className="no-blue-button rounded-md border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-[#f1f5f9] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveToGroup}
                disabled={loading || !selectedTargetGroupId || loadingGroups || allItemGroups.length === 0}
                className="no-blue-button rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove from Item Group Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
            <div className="px-6 py-4 border-b border-[#e7ebf8]">
              <h2 className="text-lg font-semibold text-[#1f2937]">Remove from Item Group</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-[#64748b]">
                Are you sure you want to remove "{item?.name}" from this item group? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#e7ebf8] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRemoveModal(false)}
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
                {loading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoeSalesItemDetailFromGroup;

