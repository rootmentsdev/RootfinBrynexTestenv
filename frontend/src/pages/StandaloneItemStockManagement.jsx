import { useState, useEffect } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import usePreventNumberInputScroll from "../hooks/usePreventNumberInputScroll";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { X, Trash2, Plus } from "lucide-react";
import baseUrl from "../api/api";

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");

// Warehouse names for the dropdown
const WAREHOUSES = [
  "Palakkad Branch",
  "Warehouse",
  "Calicut",
  "Manjery Branch",
  "Kannur Branch",
  "Edappal Branch",
  "Kalpetta Branch",
  "Kottakkal Branch",
  "Perinthalmanna Branch",
  "Grooms Trivandum",
  "Chavakkad Branch",
  "Thrissur Branch",
  "Perumbavoor Branch",
  "Kottayam Branch",
  "Edapally Branch",
  "MG Road",
  "Vadakara Branch"
];

const StandaloneItemStockManagement = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stockType = (searchParams.get("type") || "accounting").toLowerCase();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stockRows, setStockRows] = useState([
    { warehouse: "", openingStock: "0", openingStockValue: "0", physicalOpeningStock: "0" }
  ]);
  const [warehouses, setWarehouses] = useState([]);
  
  // Prevent mouse wheel from changing number input values
  usePreventNumberInputScroll();
  
  // Set warehouses to the specified list
  useEffect(() => {
    // Sort warehouses: "Warehouse" first, then alphabetically
    const sortedWarehouses = [...WAREHOUSES].sort((a, b) => {
      if (a === "Warehouse") return -1;
      if (b === "Warehouse") return 1;
      return a.localeCompare(b);
    });
    setWarehouses(sortedWarehouses);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add cache-busting parameter to ensure fresh data
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}?_=${timestamp}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch item");
        }
        
        const data = await response.json();
        console.log("📦 StandaloneItemStockManagement: Fetched item data", {
          itemId,
          itemName: data.itemName,
          warehouseStocks: data.warehouseStocks
        });
        setItem(data);
        
        // Load existing warehouse stocks if available
        if (data.warehouseStocks && Array.isArray(data.warehouseStocks) && data.warehouseStocks.length > 0) {
          const existingRows = data.warehouseStocks
            .filter(stock => {
              // Only include warehouses that are in the allowed list
              if (!stock.warehouse || !WAREHOUSES.includes(stock.warehouse)) {
                return false;
              }
              // Only include warehouses with actual stock (> 0)
              const stockOnHand = parseFloat(stock.stockOnHand) || 0;
              const openingStock = parseFloat(stock.openingStock) || 0;
              const physicalStockOnHand = parseFloat(stock.physicalStockOnHand) || 0;
              const physicalOpeningStock = parseFloat(stock.physicalOpeningStock) || 0;
              
              // Include if any stock value is > 0
              return stockOnHand > 0 || openingStock > 0 || physicalStockOnHand > 0 || physicalOpeningStock > 0;
            })
            .map(stock => {
              // ALWAYS use stockOnHand for current stock display
              // openingStock is historical data, stockOnHand is the current actual stock
              const stockOnHandValue = parseFloat(stock.stockOnHand) || 0;
              const openingStockValue = parseFloat(stock.openingStock) || 0;
              
              console.log(`📊 Processing warehouse "${stock.warehouse}":`, {
                openingStock: openingStockValue,
                stockOnHand: stockOnHandValue,
                displayValue: stockOnHandValue  // Always use stockOnHand
              });
              
              // Same for physical stock - always use current values
              const physicalStockOnHandValue = parseFloat(stock.physicalStockOnHand) || 0;
              const physicalOpeningStockValue = parseFloat(stock.physicalOpeningStock) || 0;
              
              return {
                warehouse: stock.warehouse || "",
                openingStock: stockOnHandValue.toString(),  // Display current stock
                openingStockValue: stock.openingStockValue?.toString() || "0",
                physicalOpeningStock: physicalStockOnHandValue.toString()  // Display current physical stock
              };
            });
          
          if (existingRows.length > 0) {
            setStockRows(existingRows);
          }
        }
      } catch (error) {
        console.error("Error fetching item:", error);
        setItem(null);
      }
    };

    if (itemId) {
      fetchData();
    }
  }, [itemId]);

  // Listen for stock update events (from inventory adjustments, purchase receives, etc.)
  useEffect(() => {
    const handleStockUpdate = (event) => {
      console.log("📦 Stock update event received in StandaloneItemStockManagement", event.detail);
      
      // Check if this item was affected
      const itemIds = event.detail?.itemIds || [];
      const itemNames = event.detail?.items || [];
      
      const currentItemId = (item?._id || item?.id)?.toString();
      const currentItemName = item?.itemName;
      
      const isAffected = itemIds.some(id => id?.toString() === currentItemId) ||
                        itemNames.some(name => name === currentItemName);
      
      if (isAffected) {
        console.log("🔄 This item was affected, refreshing stock data...");
        
        // Refetch the item data
        fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`)
          .then(res => res.json())
          .then(data => {
            setItem(data);
            
            // Update stock rows with new data
            if (data.warehouseStocks && Array.isArray(data.warehouseStocks) && data.warehouseStocks.length > 0) {
              const existingRows = data.warehouseStocks
                .filter(stock => {
                  // Only include warehouses that are in the allowed list
                  if (!stock.warehouse || !WAREHOUSES.includes(stock.warehouse)) {
                    return false;
                  }
                  // Only include warehouses with actual stock (> 0)
                  const stockOnHand = parseFloat(stock.stockOnHand) || 0;
                  const openingStock = parseFloat(stock.openingStock) || 0;
                  const physicalStockOnHand = parseFloat(stock.physicalStockOnHand) || 0;
                  const physicalOpeningStock = parseFloat(stock.physicalOpeningStock) || 0;
                  
                  // Include if any stock value is > 0
                  return stockOnHand > 0 || openingStock > 0 || physicalStockOnHand > 0 || physicalOpeningStock > 0;
                })
                .map(stock => {
                  // ALWAYS use stockOnHand for current stock display
                  const stockOnHandValue = parseFloat(stock.stockOnHand) || 0;
                  const physicalStockOnHandValue = parseFloat(stock.physicalStockOnHand) || 0;
                  
                  return {
                    warehouse: stock.warehouse || "",
                    openingStock: stockOnHandValue.toString(),
                    openingStockValue: stock.openingStockValue?.toString() || "0",
                    physicalOpeningStock: physicalStockOnHandValue.toString()
                  };
                });
              
              if (existingRows.length > 0) {
                setStockRows(existingRows);
                console.log("✅ Stock rows updated with new data");
              }
            }
          })
          .catch(err => console.error("Error refreshing item after stock update:", err));
      }
    };

    window.addEventListener("stockUpdated", handleStockUpdate);
    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdate);
    };
  }, [itemId, item]);

  const handleAddRow = () => {
    setStockRows([...stockRows, { warehouse: "", openingStock: "0", openingStockValue: "0", physicalOpeningStock: "0" }]);
  };

  const handleDeleteRow = (index) => {
    if (stockRows.length > 1) {
      const newRows = stockRows.filter((_, i) => i !== index);
      setStockRows(newRows);
    }
  };

  const handleInputChange = (index, field, value) => {
    const newRows = [...stockRows];
    newRows[index][field] = value;
    setStockRows(newRows);
  };

  const handleCopyToAll = (field) => {
    if (stockRows.length > 0) {
      const value = stockRows[0][field];
      const newRows = stockRows.map(row => ({ ...row, [field]: value }));
      setStockRows(newRows);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Calculate total available stock from all warehouses (especially from "Warehouse" where purchase receives add stock)
      const existingStocks = Array.isArray(item.warehouseStocks) ? item.warehouseStocks : [];
      const totalAvailableStock = existingStocks.reduce((sum, stock) => {
        // Don't fallback to openingStock if stockOnHand is 0 - 0 is a valid value!
        const stockOnHand = stock.stockOnHand !== undefined && stock.stockOnHand !== null
          ? parseFloat(stock.stockOnHand)
          : parseFloat(stock.openingStock || 0);
        return sum + stockOnHand;
      }, 0);
      
      console.log(`Total available stock to redistribute: ${totalAvailableStock}`);
      
      // Calculate total stock being assigned in the form
      const totalAssignedStock = stockRows
        .filter(row => row.warehouse && row.warehouse.trim() !== "")
        .reduce((sum, row) => {
          const opening = parseFloat(row.openingStock) || 0;
          return sum + opening;
        }, 0);
      
      console.log(`Total stock being assigned: ${totalAssignedStock}`);
      
      // Start fresh - only use what's in the form
      const byWarehouse = new Map();
      
      // Clear all existing warehouse stocks - we'll only keep what's in the form
      console.log(`Clearing all existing stocks, will only use form values`);

      // Now assign stock to the warehouses specified in the form
      stockRows
        .filter(row => row.warehouse && row.warehouse.trim() !== "")
        .forEach(row => {
          const opening = parseFloat(row.openingStock) || 0;
          const openingValue = parseFloat(row.openingStockValue) || 0;
          const pOpening = parseFloat(row.physicalOpeningStock) || 0;
          
          // Only add if there's actual stock
          if (opening > 0 || pOpening > 0) {
            const current = { warehouse: row.warehouse };

            current.openingStock = opening;
            current.openingStockValue = openingValue;
            current.stockOnHand = opening;
            current.availableForSale = opening;
            current.physicalOpeningStock = pOpening;
            current.physicalStockOnHand = pOpening;
            current.physicalAvailableForSale = pOpening;

            byWarehouse.set(row.warehouse, current);
          }
        });

      // Don't redistribute remaining stock - user explicitly set the stock values
      console.log(`Total assigned stock (${totalAssignedStock}) will be used as-is, no redistribution`);

      const stockData = Array.from(byWarehouse.values());
      console.log(`Final stock data to save:`, stockData.map(s => `${s.warehouse}: ${s.stockOnHand}`).join(", ") || "empty");

      // Get current user for history tracking
      const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
      const changedBy = currentUser.username || currentUser.locName || "System";

      // Update the item with warehouse stocks - construct payload with only necessary fields
      const updatePayload = {
        itemName: item.itemName || "",
        sku: item.sku || "",
        type: item.type || "goods",
        unit: item.unit || "",
        hsnCode: item.hsnCode || "",
        manufacturer: item.manufacturer || "",
        brand: item.brand || "",
        taxPreference: item.taxPreference || "taxable",
        taxRateInter: item.taxRateInter || "",
        taxRateIntra: item.taxRateIntra || "",
        inventoryAccount: item.inventoryAccount || "",
        inventoryValuation: item.inventoryValuation || item.inventoryValuationMethod || "",
        costPrice: item.costPrice || 0,
        costAccount: item.costAccount || "",
        preferredVendor: item.preferredVendor || "",
        purchaseDescription: item.purchaseDescription || "",
        sellingPrice: item.sellingPrice || 0,
        salesAccount: item.salesAccount || "",
        salesDescription: item.salesDescription || "",
        dimensions: item.dimensions || "",
        weight: item.weight || "",
        reorderPoint: item.reorderPoint || "",
        trackingMethod: item.trackingMethod || "none",
        trackInventory: item.trackInventory !== undefined ? item.trackInventory : true,
        trackBin: item.trackBin !== undefined ? item.trackBin : false,
        returnable: item.returnable !== undefined ? item.returnable : true,
        sellable: item.sellable !== undefined ? item.sellable : true,
        purchasable: item.purchasable !== undefined ? item.purchasable : true,
        warehouseStocks: stockData,
        changedBy: changedBy,
      };

      const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to save stock data";
        try {
          const payload = JSON.parse(errorText);
          errorMessage = payload?.message || payload?.errors?.join(", ") || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error("API Error Response:", response.status, errorText);
        throw new Error(errorMessage);
      }
      
      // Show success message
      const successMsg = "Stock data saved successfully!";
      
      // Navigate back with a flag to indicate data was saved
      navigate(`/shoe-sales/items/${itemId}?stocksUpdated=true&message=${encodeURIComponent(successMsg)}`, { replace: true });
    } catch (error) {
      console.error("Error saving stock:", error);
      alert(error.message || "Failed to save stock data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Enter key to save stock
  useEnterToSave(() => handleSave(), loading);

  if (!item) {
    return (
      <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
        <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-lg p-8 text-center">
          <p className="text-lg font-medium text-[#475569]">Item not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
      <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e4e6f2] px-8 py-6">
          <h1 className="text-2xl font-bold text-[#1f2937]">{item.itemName || "Item Stock Management"}</h1>
          <button
            onClick={() => navigate(`/shoe-sales/items/${itemId}`)}
            className="no-blue-button inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7dcf5] bg-white text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
          >
            <X size={18} className="text-[#64748b]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="overflow-x-auto rounded-lg border border-[#e4e6f2]">
            <table className="min-w-full">
              <thead className="bg-[#f1f4ff]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#4a5b8b]">
                    Warehouse
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#4a5b8b]">
                    <div className="flex items-center justify-between">
                      <span>Opening Stock (Accounting)</span>
                      <button
                        onClick={() => handleCopyToAll("openingStock")}
                        className="ml-4 text-xs font-medium text-[#475569] hover:text-[#1f2937] transition-colors"
                      >
                        COPY TO ALL
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#4a5b8b]">
                    <div className="flex items-center justify-between">
                      <span>Physical Stock</span>
                      <button
                        onClick={() => handleCopyToAll("physicalOpeningStock")}
                        className="ml-4 text-xs font-medium text-[#475569] hover:text-[#1f2937] transition-colors"
                      >
                        COPY TO ALL
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#4a5b8b]">
                    <div className="flex items-center justify-between">
                      <span>Opening Stock Value Per Unit</span>
                      <button
                        onClick={() => handleCopyToAll("openingStockValue")}
                        className="ml-4 text-xs font-medium text-[#475569] hover:text-[#1f2937] transition-colors"
                      >
                        COPY TO ALL
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#4a5b8b] w-20">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2ff] bg-white">
                {stockRows.map((row, index) => (
                  <tr key={index} className="hover:bg-[#f7f9ff]">
                    <td className="px-6 py-4">
                      <select
                        value={row.warehouse}
                        onChange={(e) => handleInputChange(index, "warehouse", e.target.value)}
                        className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-sm text-[#1f2937] focus:border-[#cbd5f5] focus:outline-none focus:ring-2 focus:ring-[#e0e7ff] transition-all"
                      >
                        <option value="" className="bg-blue-500 text-white font-semibold">Select Store</option>
                        {warehouses.map((wh, idx) => (
                          <option key={idx} value={wh}>{wh}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={row.openingStock}
                        onChange={(e) => handleInputChange(index, "openingStock", e.target.value)}
                        className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-sm text-[#1f2937] focus:border-[#cbd5f5] focus:outline-none focus:ring-2 focus:ring-[#e0e7ff] transition-all"
                        placeholder="0"
                        step="1"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={row.physicalOpeningStock}
                        onChange={(e) => handleInputChange(index, "physicalOpeningStock", e.target.value)}
                        className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-sm text-[#1f2937] focus:border-[#cbd5f5] focus:outline-none focus:ring-2 focus:ring-[#e0e7ff] transition-all"
                        placeholder="0"
                        step="1"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={row.openingStockValue}
                        onChange={(e) => handleInputChange(index, "openingStockValue", e.target.value)}
                        className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-sm text-[#1f2937] focus:border-[#cbd5f5] focus:outline-none focus:ring-2 focus:ring-[#e0e7ff] transition-all"
                        placeholder="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {stockRows.length > 1 && (
                        <button
                          onClick={() => handleDeleteRow(index)}
                          className="no-blue-button flex h-9 w-9 items-center justify-center rounded-lg text-[#ef4444] transition-colors hover:bg-[#fef2f2] mx-auto"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New Row Button */}
          <div className="mt-6">
            <button
              onClick={handleAddRow}
              className="no-blue-button inline-flex items-center gap-2 rounded-lg border border-[#d7dcf5] bg-white px-4 py-2 text-sm font-medium text-[#475569] shadow-sm transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#cbd5f5] hover:shadow-md"
            >
              <Plus size={16} className="text-[#64748b]" />
              <span>+ New Row</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex items-center justify-start gap-3 border-t border-[#e4e6f2] pt-6">
            <button
              onClick={handleSave}
              disabled={loading}
              className="no-blue-button rounded-lg bg-[#475569] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#334155] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => navigate(`/shoe-sales/items/${itemId}`)}
              disabled={loading}
              className="no-blue-button rounded-lg border border-[#d7dcf5] bg-white px-6 py-2.5 text-sm font-medium text-[#475569] transition hover:bg-[#f1f5f9] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandaloneItemStockManagement;

