// Updated to use PostgreSQL (Sequelize) instead of MongoDB
import { Op } from "sequelize";
import { InventoryAdjustment } from "../models/sequelize/index.js";
// Also import MongoDB model for dual-save
import MongoInventoryAdjustment from "../model/InventoryAdjustment.js";
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";
import { nextInventoryAdjustment } from "../utils/nextInventoryAdjustment.js";

// Helper function to update warehouse stock for inventory adjustment
const adjustItemStock = async (itemIdValue, quantityAdjustment, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  const targetWarehouse = warehouseName?.trim() || "Warehouse";
  
  console.log(`\n🔧 adjustItemStock called:`);
  console.log(`   itemIdValue: ${itemIdValue}`);
  console.log(`   quantityAdjustment: ${quantityAdjustment}`);
  console.log(`   targetWarehouse: ${targetWarehouse}`);
  console.log(`   itemName: ${itemName}`);
  console.log(`   itemGroupId: ${itemGroupId}`);
  console.log(`   itemSku: ${itemSku}`);
  
  // Helper function to update warehouse stock
  const updateWarehouseStock = (warehouseStocks, qtyAdjustment, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      // Create new warehouse entry
      return [{
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: qtyAdjustment,
        committedStock: 0,
        availableForSale: qtyAdjustment,
        physicalOpeningStock: 0,
        physicalStockOnHand: qtyAdjustment,
        physicalCommittedStock: 0,
        physicalAvailableForSale: qtyAdjustment,
      }];
    }
    
    // Find the specific warehouse (case-insensitive match)
    let warehouseStock = warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!warehouseStock) {
      // Create new warehouse entry if it doesn't exist
      warehouseStock = {
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: qtyAdjustment,
        committedStock: 0,
        availableForSale: qtyAdjustment,
        physicalOpeningStock: 0,
        physicalStockOnHand: qtyAdjustment,
        physicalCommittedStock: 0,
        physicalAvailableForSale: qtyAdjustment,
      };
      warehouseStocks.push(warehouseStock);
      return warehouseStocks;
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    // Apply adjustment (can be positive or negative)
    warehouseStock.stockOnHand = Math.max(0, currentStockOnHand + qtyAdjustment);
    warehouseStock.availableForSale = Math.max(0, currentAvailableForSale + qtyAdjustment);
    warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand + qtyAdjustment);
    warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale + qtyAdjustment);
    
    return warehouseStocks;
  };
  
  // If itemId is null but we have itemGroupId and itemName, use name-based search
  if ((!itemIdValue || itemIdValue === null || itemIdValue === "null") && itemGroupId && itemName) {
    return await adjustItemStockByName(itemGroupId, itemName, quantityAdjustment, targetWarehouse, itemSku);
  }
  
  // First, try to find as standalone item
  let shoeItem = null;
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    shoeItem = await ShoeItem.findById(itemIdValue);
  }
  
  if (shoeItem) {
    // Convert to plain object, modify, then update using $set (same fix as PurchaseReceiveController)
    const itemPlain = shoeItem.toObject();
    const oldStock = itemPlain.warehouseStocks?.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    )?.stockOnHand || 0;
    
    if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
      itemPlain.warehouseStocks = [];
    }
    
    // Find or create warehouse stock entry
    let wsEntry = itemPlain.warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!wsEntry) {
      wsEntry = {
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: 0,
        committedStock: 0,
        availableForSale: 0,
        physicalOpeningStock: 0,
        physicalStockOnHand: 0,
        physicalCommittedStock: 0,
        physicalAvailableForSale: 0,
      };
      itemPlain.warehouseStocks.push(wsEntry);
    }
    
    // Update stock values
    const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
    const newStock = Math.max(0, currentStock + quantityAdjustment);
    wsEntry.stockOnHand = newStock;
    wsEntry.availableForSale = Math.max(0, (parseFloat(wsEntry.availableForSale) || 0) + quantityAdjustment);
    wsEntry.physicalStockOnHand = Math.max(0, (parseFloat(wsEntry.physicalStockOnHand) || 0) + quantityAdjustment);
    wsEntry.physicalAvailableForSale = Math.max(0, (parseFloat(wsEntry.physicalAvailableForSale) || 0) + quantityAdjustment);
    wsEntry.warehouse = targetWarehouse;
    
    console.log(`   📊 Inventory adjustment: ${currentStock} ${quantityAdjustment >= 0 ? '+' : ''}${quantityAdjustment} = ${newStock}`);
    
    // Update using $set to replace entire warehouseStocks array
    const updatedItem = await ShoeItem.findByIdAndUpdate(
      itemIdValue,
      {
        $set: {
          warehouseStocks: itemPlain.warehouseStocks
        }
      },
      { new: true }
    );
    
    if (!updatedItem) {
      console.error(`❌ Failed to update standalone item stock`);
      return { success: false, message: "Failed to update stock" };
    }
    
    const updatedStock = updatedItem.warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    ) || updatedItem.warehouseStocks[0];
    
    return { 
      success: true, 
      type: 'standalone', 
      stock: updatedStock,
      newQuantity: updatedStock?.stockOnHand || 0
    };
  }
  
  // Item not found in standalone items, try to find in item groups
  if (itemGroupId && itemName) {
    const nameBasedResult = await adjustItemStockByName(itemGroupId, itemName, quantityAdjustment, targetWarehouse, itemSku);
    if (nameBasedResult.success) {
      return nameBasedResult;
    }
  }
  
  // Search all item groups if itemGroupId not provided
  let itemGroups = [];
  if (itemGroupId) {
    const group = await ItemGroup.findById(itemGroupId);
    if (group) itemGroups = [group];
  } else {
    itemGroups = await ItemGroup.find({});
  }
  
  for (const group of itemGroups) {
    const itemIndex = group.items.findIndex(item => {
      if (itemSku && item.sku) {
        return item.sku.toLowerCase() === itemSku.toLowerCase();
      }
      return item.name.toLowerCase() === itemName.toLowerCase();
    });
    
    if (itemIndex !== -1) {
      // Use the same fix - convert to plain object, modify, then update using $set
      const groupPlain = group.toObject();
      const itemPlain = groupPlain.items[itemIndex];
      
      if (!itemPlain.warehouseStocks) {
        itemPlain.warehouseStocks = [];
      }
      
      let wsEntry = itemPlain.warehouseStocks.find(ws => 
        ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
      );
      
      if (!wsEntry) {
        wsEntry = {
          warehouse: targetWarehouse,
          openingStock: 0,
          openingStockValue: 0,
          stockOnHand: 0,
          committedStock: 0,
          availableForSale: 0,
          physicalOpeningStock: 0,
          physicalStockOnHand: 0,
          physicalCommittedStock: 0,
          physicalAvailableForSale: 0,
        };
        itemPlain.warehouseStocks.push(wsEntry);
      }
      
      // Update stock values
      const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
      const newStock = Math.max(0, currentStock + quantityAdjustment);
      wsEntry.stockOnHand = newStock;
      wsEntry.availableForSale = Math.max(0, (parseFloat(wsEntry.availableForSale) || 0) + quantityAdjustment);
      wsEntry.physicalStockOnHand = Math.max(0, (parseFloat(wsEntry.physicalStockOnHand) || 0) + quantityAdjustment);
      wsEntry.physicalAvailableForSale = Math.max(0, (parseFloat(wsEntry.physicalAvailableForSale) || 0) + quantityAdjustment);
      wsEntry.warehouse = targetWarehouse;
      
      // Update using $set
      const updateResult = await ItemGroup.findByIdAndUpdate(
        group._id,
        {
          $set: {
            [`items.${itemIndex}`]: itemPlain
          }
        },
        { new: true }
      );
      
      if (updateResult) {
        // Reload to get actual saved values
        const savedGroup = await ItemGroup.findById(group._id);
        const savedItem = savedGroup.items[itemIndex];
        const savedStock = savedItem.warehouseStocks.find(ws => 
          ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
        ) || savedItem.warehouseStocks[0];
        
        return { 
          success: true, 
          type: 'group', 
          stock: savedStock,
          groupName: group.name,
          itemName: itemPlain.name,
          newQuantity: savedStock?.stockOnHand || 0
        };
      }
    }
  }
  
  return { success: false, message: `Item "${itemName || itemIdValue}" not found` };
};

// Helper function to adjust stock by name (for items in groups)
const adjustItemStockByName = async (itemGroupId, itemName, quantityAdjustment, warehouseName, itemSku = null) => {
  if (!itemGroupId || !itemName) {
    return { success: false, message: "ItemGroupId and itemName are required" };
  }
  
  const targetWarehouse = warehouseName?.trim() || "Warehouse";
  const group = await ItemGroup.findById(itemGroupId);
  
  if (!group) {
    return { success: false, message: `Item group not found: ${itemGroupId}` };
  }
  
  const itemIndex = group.items.findIndex(item => {
    if (itemSku && item.sku) {
      return item.sku.toLowerCase() === itemSku.toLowerCase();
    }
    return item.name.toLowerCase() === itemName.toLowerCase();
  });
  
  if (itemIndex === -1) {
    return { success: false, message: `Item "${itemName}" not found in group "${group.name}"` };
  }
  
  const groupItem = group.items[itemIndex];
  
  const updateWarehouseStock = (warehouseStocks, qtyAdjustment, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return [{
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: qtyAdjustment,
        committedStock: 0,
        availableForSale: qtyAdjustment,
        physicalOpeningStock: 0,
        physicalStockOnHand: qtyAdjustment,
        physicalCommittedStock: 0,
        physicalAvailableForSale: qtyAdjustment,
      }];
    }
    
    let warehouseStock = warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!warehouseStock) {
      warehouseStock = {
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: qtyAdjustment,
        committedStock: 0,
        availableForSale: qtyAdjustment,
        physicalOpeningStock: 0,
        physicalStockOnHand: qtyAdjustment,
        physicalCommittedStock: 0,
        physicalAvailableForSale: qtyAdjustment,
      };
      warehouseStocks.push(warehouseStock);
      return warehouseStocks;
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    warehouseStock.stockOnHand = Math.max(0, currentStockOnHand + qtyAdjustment);
    warehouseStock.availableForSale = Math.max(0, currentAvailableForSale + qtyAdjustment);
    warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand + qtyAdjustment);
    warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale + qtyAdjustment);
    
    return warehouseStocks;
  };
  
  // Convert group to plain object, modify, then update using $set (same fix as PurchaseReceiveController)
  const groupPlain = group.toObject();
  const itemPlain = groupPlain.items[itemIndex];
  const oldStock = itemPlain.warehouseStocks?.find(ws => 
    ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
  )?.stockOnHand || 0;
  
  // Find or create warehouse stock entry
  if (!itemPlain.warehouseStocks) {
    itemPlain.warehouseStocks = [];
  }
  
  let wsEntry = itemPlain.warehouseStocks.find(ws => 
    ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
  );
  
  if (!wsEntry) {
    wsEntry = {
      warehouse: targetWarehouse,
      openingStock: 0,
      openingStockValue: 0,
      stockOnHand: 0,
      committedStock: 0,
      availableForSale: 0,
      physicalOpeningStock: 0,
      physicalStockOnHand: 0,
      physicalCommittedStock: 0,
      physicalAvailableForSale: 0,
    };
    itemPlain.warehouseStocks.push(wsEntry);
  }
  
  // Update stock values
  const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
  const newStock = Math.max(0, currentStock + quantityAdjustment);
  wsEntry.stockOnHand = newStock;
  wsEntry.availableForSale = Math.max(0, (parseFloat(wsEntry.availableForSale) || 0) + quantityAdjustment);
  wsEntry.physicalStockOnHand = Math.max(0, (parseFloat(wsEntry.physicalStockOnHand) || 0) + quantityAdjustment);
  wsEntry.physicalAvailableForSale = Math.max(0, (parseFloat(wsEntry.physicalAvailableForSale) || 0) + quantityAdjustment);
  wsEntry.warehouse = targetWarehouse;
  
  console.log(`   📊 Inventory adjustment: ${currentStock} ${quantityAdjustment >= 0 ? '+' : ''}${quantityAdjustment} = ${newStock}`);
  
  // Update the entire items array using $set
  const updateResult = await ItemGroup.findByIdAndUpdate(
    itemGroupId,
    {
      $set: {
        [`items.${itemIndex}`]: itemPlain
      }
    },
    { new: true }
  );
  
  if (!updateResult) {
    console.error(`❌ Failed to update stock using findByIdAndUpdate`);
    return { success: false, message: "Failed to update stock" };
  }
  
  // Reload to get actual saved values
  const savedGroup = await ItemGroup.findById(itemGroupId);
  const savedItem = savedGroup.items[itemIndex];
  const savedStock = savedItem.warehouseStocks.find(ws => 
    ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
  ) || savedItem.warehouseStocks[0];
  
  console.log(`   ✅ Stock updated successfully: ${savedStock?.stockOnHand || 0}`);
  
  return { 
    success: true, 
    type: 'group', 
    stock: savedStock,
    groupName: group.name,
    itemName: groupItem.name,
    newQuantity: savedStock?.stockOnHand || 0
  };
};

// Get current stock for an item
const getCurrentStock = async (itemIdValue, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  const targetWarehouse = warehouseName?.trim() || "Warehouse";
  
  // Try standalone item first
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      // Use flexible matching for warehouse
      const targetWarehouseLower = targetWarehouse.trim().toLowerCase();
      let warehouseStock = shoeItem.warehouseStocks?.find(ws => {
        if (!ws.warehouse) return false;
        const wsLower = ws.warehouse.toString().trim().toLowerCase();
        return wsLower === targetWarehouseLower || wsLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(wsLower);
      });
      
      // If no match found, use first warehouse with stock
      if (!warehouseStock && shoeItem.warehouseStocks && shoeItem.warehouseStocks.length > 0) {
        warehouseStock = shoeItem.warehouseStocks[0];
      }
      
      return {
        success: true,
        currentQuantity: warehouseStock?.stockOnHand || 0,
        currentValue: (warehouseStock?.stockOnHand || 0) * (shoeItem.costPrice || 0),
        warehouseStocks: shoeItem.warehouseStocks || [], // Include full warehouse stocks array
      };
    }
  }
  
  // Try item groups
  if (itemGroupId && itemName) {
    const group = await ItemGroup.findById(itemGroupId);
    if (group) {
      const item = group.items.find(item => {
        if (itemSku && item.sku) {
          return item.sku.toLowerCase() === itemSku.toLowerCase();
        }
        return item.name.toLowerCase() === itemName.toLowerCase();
      });
      
      if (item) {
        // Use flexible matching for warehouse
        const targetWarehouseLower = targetWarehouse.trim().toLowerCase();
        let warehouseStock = item.warehouseStocks?.find(ws => {
          if (!ws.warehouse) return false;
          const wsLower = ws.warehouse.toString().trim().toLowerCase();
          return wsLower === targetWarehouseLower || wsLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(wsLower);
        });
        
        // If no match found, use first warehouse with stock
        if (!warehouseStock && item.warehouseStocks && item.warehouseStocks.length > 0) {
          warehouseStock = item.warehouseStocks[0];
        }
        
        return {
          success: true,
          currentQuantity: warehouseStock?.stockOnHand || 0,
          currentValue: (warehouseStock?.stockOnHand || 0) * (item.costPrice || 0),
          warehouseStocks: item.warehouseStocks || [], // Include full warehouse stocks array
        };
      }
    }
  }
  
  return { success: false, currentQuantity: 0, currentValue: 0, warehouseStocks: [] };
};

// Create a new inventory adjustment
export const createInventoryAdjustment = async (req, res) => {
  try {
    const adjustmentData = req.body;
    
    // Safely parse user info
    let userId = "";
    let createdBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        // Check if it's already an object
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || adjustmentData.userId || "";
          createdBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          // Check if it's a JSON string (starts with { or [)
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || adjustmentData.userId || "";
              createdBy = user?.name || user?.displayName || userId;
            } catch (e) {
              // If JSON parse fails, treat as plain string (email)
              userId = userStr || adjustmentData.userId || "";
              createdBy = userId;
            }
          } else {
            // It's a plain string (like an email), use it directly
            userId = userStr || adjustmentData.userId || "";
            createdBy = userId;
          }
        } else {
          userId = adjustmentData.userId || "";
          createdBy = userId;
        }
      } else {
        userId = adjustmentData.userId || "";
        createdBy = userId;
      }
    } catch (parseError) {
      console.warn("Error parsing user info, using fallback:", parseError);
      userId = adjustmentData.userId || "";
      createdBy = userId;
    }
    
    // Validate required fields
    if (!adjustmentData.date || !adjustmentData.warehouse || !adjustmentData.account || !adjustmentData.reason) {
      return res.status(400).json({ 
        message: "Missing required fields: date, warehouse, account, and reason are required" 
      });
    }
    
    // Validate adjustmentType
    if (adjustmentData.adjustmentType && !["quantity", "value"].includes(adjustmentData.adjustmentType)) {
      return res.status(400).json({ 
        message: "Invalid adjustmentType. Must be 'quantity' or 'value'" 
      });
    }
    
    // Validate status
    if (adjustmentData.status && !["draft", "adjusted"].includes(adjustmentData.status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be 'draft' or 'adjusted'" 
      });
    }
    
    // Validate userId
    if (!userId || userId === "") {
      return res.status(400).json({ 
        message: "User ID is required. Please ensure you are logged in." 
      });
    }
    
    // Parse date safely
    let adjustmentDate;
    try {
      if (adjustmentData.date instanceof Date) {
        adjustmentDate = adjustmentData.date;
      } else if (typeof adjustmentData.date === 'string') {
        adjustmentDate = new Date(adjustmentData.date);
        if (isNaN(adjustmentDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        return res.status(400).json({ message: "Date is required and must be a valid date" });
      }
    } catch (dateError) {
      console.error("Error parsing date:", dateError);
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    // Process items and calculate totals
    let totalQuantityAdjusted = 0;
    let totalValueAdjusted = 0;
    const processedItems = [];
    
    // Validate items array
    if (!Array.isArray(adjustmentData.items) || adjustmentData.items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }
    
    for (const item of adjustmentData.items) {
      if (!item.itemName) continue;
      
      try {
        // Get current stock
        const stockInfo = await getCurrentStock(
          item.itemId || null,
          adjustmentData.warehouse,
          item.itemName,
          item.itemGroupId || null,
          item.itemSku || null
        );
        
        const currentQuantity = stockInfo.currentQuantity || 0;
        const currentValue = stockInfo.currentValue || 0;
        
        let newQuantity = currentQuantity;
        let newValue = currentValue;
        let quantityAdjusted = 0;
        let valueAdjusted = 0;
        
        if (adjustmentData.adjustmentType === "quantity") {
          quantityAdjusted = parseFloat(item.quantityAdjusted) || 0;
          newQuantity = Math.max(0, currentQuantity + quantityAdjusted);
          // For quantity adjustment, use current item cost if available
          const itemCost = parseFloat(item.unitCost) || 0;
          newValue = newQuantity * itemCost;
          totalQuantityAdjusted += Math.abs(quantityAdjusted);
        } else {
          // Value adjustment
          const unitCost = parseFloat(item.unitCost) || 0;
          const newQty = parseFloat(item.newQuantity) || currentQuantity;
          newQuantity = newQty;
          newValue = newQty * unitCost;
          valueAdjusted = newValue - currentValue;
          totalValueAdjusted += Math.abs(valueAdjusted);
        }
        
        // Store itemId and itemGroupId as strings (PostgreSQL doesn't use ObjectId)
        processedItems.push({
          itemId: item.itemId ? String(item.itemId) : null,
          itemGroupId: item.itemGroupId ? String(item.itemGroupId) : null,
          itemName: item.itemName,
          itemSku: item.itemSku || "",
          currentQuantity,
          currentValue,
          quantityAdjusted,
          newQuantity,
          unitCost: parseFloat(item.unitCost) || 0,
          valueAdjusted,
          newValue,
        });
      } catch (itemError) {
        console.error(`Error processing item ${item.itemName}:`, itemError);
        // Continue with other items, but log the error
      }
    }
    
    if (processedItems.length === 0) {
      return res.status(400).json({ message: "No valid items to process" });
    }
    
    // Auto-generate reference number if not provided
    let referenceNumber = adjustmentData.referenceNumber || "";
    if (!referenceNumber || referenceNumber.trim() === "") {
      referenceNumber = await nextInventoryAdjustment("IA-");
    }
    
    // Create adjustment record in PostgreSQL
    const adjustment = await InventoryAdjustment.create({
      adjustmentType: adjustmentData.adjustmentType || "quantity",
      referenceNumber: referenceNumber,
      date: adjustmentDate,
      account: adjustmentData.account,
      reason: adjustmentData.reason,
      branch: adjustmentData.branch || "Head Office",
      warehouse: adjustmentData.warehouse,
      description: adjustmentData.description || "",
      items: processedItems,
      totalQuantityAdjusted,
      totalValueAdjusted,
      userId, // Store the email/userId
      createdBy: userId || createdBy, // Store email/userId as createdBy
      status: adjustmentData.status || "draft",
      locCode: adjustmentData.locCode || "",
    });
    
    // DUAL-SAVE: Also save to MongoDB for safety/redundancy
    try {
      console.log(`💾 Dual-saving inventory adjustment to MongoDB for safety...`);
      
      // Convert PostgreSQL items to MongoDB format
      const mongoItems = processedItems.map(item => ({
        itemId: item.itemId ? item.itemId : null,
        itemGroupId: item.itemGroupId ? item.itemGroupId : null,
        itemName: item.itemName,
        itemSku: item.itemSku,
        currentQuantity: item.currentQuantity,
        currentValue: item.currentValue,
        quantityAdjusted: item.quantityAdjusted,
        newQuantity: item.newQuantity,
        unitCost: item.unitCost,
        valueAdjusted: item.valueAdjusted,
        newValue: item.newValue,
      }));
      
      const mongoAdjustment = await MongoInventoryAdjustment.create({
        adjustmentType: adjustmentData.adjustmentType || "quantity",
        referenceNumber: referenceNumber,
        date: adjustmentDate,
        account: adjustmentData.account,
        reason: adjustmentData.reason,
        branch: adjustmentData.branch || "Head Office",
        warehouse: adjustmentData.warehouse,
        description: adjustmentData.description || "",
        items: mongoItems,
        totalQuantityAdjusted,
        totalValueAdjusted,
        userId,
        createdBy: userId || createdBy,
        status: adjustmentData.status || "draft",
        locCode: adjustmentData.locCode || "",
        // Add PostgreSQL ID as reference
        postgresqlId: adjustment.id,
      });
      
      console.log(`✅ Successfully saved to MongoDB with ID: ${mongoAdjustment._id}`);
    } catch (mongoError) {
      console.error(`⚠️  Failed to save to MongoDB (PostgreSQL save was successful):`, mongoError);
      // Don't fail the entire operation if MongoDB save fails
    }
    
    // If status is "adjusted", apply the adjustments to stock
    if (adjustment.status === "adjusted") {
      console.log(`\n=== APPLYING STOCK ADJUSTMENTS ===`);
      console.log(`Adjustment ID: ${adjustment.id}`);
      console.log(`Warehouse: ${adjustmentData.warehouse}`);
      console.log(`Items to adjust: ${processedItems.length}`);
      
      for (const item of processedItems) {
        if (adjustmentData.adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          console.log(`\n📦 Adjusting item: ${item.itemName}`);
          console.log(`   Item ID: ${item.itemId}`);
          console.log(`   Item Group ID: ${item.itemGroupId}`);
          console.log(`   SKU: ${item.itemSku}`);
          console.log(`   Quantity Adjustment: ${item.quantityAdjusted}`);
          console.log(`   Warehouse: ${adjustmentData.warehouse}`);
          
          try {
            const result = await adjustItemStock(
              item.itemId,
              item.quantityAdjusted,
              adjustmentData.warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            
            if (!result.success) {
              console.error(`   ❌ Failed to adjust stock: ${result.message}`);
            } else {
              console.log(`   ✅ Stock adjusted successfully`);
              console.log(`   New quantity: ${result.newQuantity}`);
              console.log(`   Type: ${result.type}`);
            }
          } catch (stockError) {
            console.error(`   ❌ Error adjusting stock:`, stockError);
            console.error(`   Stack:`, stockError.stack);
            // Continue with other items
          }
        } else {
          console.log(`\n⏭️  Skipping item: ${item.itemName} (no quantity adjustment or value adjustment type)`);
        }
      }
      
      console.log(`\n=== STOCK ADJUSTMENTS COMPLETE ===\n`);
    } else {
      console.log(`\n⏭️  Stock adjustments skipped - status is "${adjustment.status}" (not "adjusted")\n`);
    }
    
    res.status(201).json(adjustment);
  } catch (error) {
    console.error("Error creating inventory adjustment:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all inventory adjustments
export const getInventoryAdjustments = async (req, res) => {
  try {
    const { userId, userPower, warehouse, status, adjustmentType, startDate, endDate, locCode } = req.query;
    
    const where = {};
    
    // User is admin if: power === 'admin' OR locCode === '858' (Warehouse) OR email === 'officerootments@gmail.com'
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail ||
                    (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                    (locCode && (locCode === '858' || locCode === '103'));
    
    // If admin has switched to a specific store (not Warehouse), filter by that store
    const isAdminViewingSpecificStore = isAdmin && warehouse && warehouse !== "All Stores";
    
    if ((!isAdmin || isAdminViewingSpecificStore) && warehouse) {
      where.warehouse = warehouse;
      console.log(`📊 Filtering inventory adjustments for warehouse: ${warehouse}`);
    } else if (!isAdmin && userId) {
      where.userId = userId;
    }
    
    if (warehouse && isAdmin && !isAdminViewingSpecificStore) {
      where.warehouse = warehouse;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (adjustmentType) {
      where.adjustmentType = adjustmentType;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate);
      if (endDate) where.date[Op.lte] = new Date(endDate);
    }
    
    const adjustments = await InventoryAdjustment.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: 1000,
    });
    
    // Transform to include both id and _id for compatibility
    const transformedAdjustments = adjustments.map(adj => {
      const adjData = adj.toJSON();
      return {
        ...adjData,
        _id: adjData.id, // Add _id for compatibility with frontend
      };
    });
    
    res.status(200).json(transformedAdjustments);
  } catch (error) {
    console.error("Error fetching inventory adjustments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single inventory adjustment by ID
export const getInventoryAdjustmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const adjustment = await InventoryAdjustment.findByPk(id);
    
    if (!adjustment) {
      return res.status(404).json({ message: "Inventory adjustment not found" });
    }
    
    // Transform to include both id and _id for compatibility
    const adjData = adjustment.toJSON();
    const transformedAdjustment = {
      ...adjData,
      _id: adjData.id, // Add _id for compatibility with frontend
    };
    
    res.status(200).json(transformedAdjustment);
  } catch (error) {
    console.error("Error fetching inventory adjustment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update an inventory adjustment
export const updateInventoryAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const adjustmentData = req.body;
    
    // Safely parse user info (same logic as createInventoryAdjustment)
    let userId = "";
    let modifiedBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        // Check if it's already an object
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || adjustmentData.userId || "";
          modifiedBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          // Check if it's a JSON string (starts with { or [)
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || adjustmentData.userId || "";
              modifiedBy = user?.name || user?.displayName || userId;
            } catch (e) {
              // If JSON parse fails, treat as plain string (email)
              userId = userStr || adjustmentData.userId || "";
              modifiedBy = userId;
            }
          } else {
            // It's a plain string (like an email), use it directly
            userId = userStr || adjustmentData.userId || "";
            modifiedBy = userId;
          }
        } else {
          userId = adjustmentData.userId || "";
          modifiedBy = userId;
        }
      } else {
        userId = adjustmentData.userId || "";
        modifiedBy = userId;
      }
    } catch (parseError) {
      console.warn("Error parsing user info, using fallback:", parseError);
      userId = adjustmentData.userId || "";
      modifiedBy = userId;
    }
    
    const existingAdjustment = await InventoryAdjustment.findByPk(id);
    if (!existingAdjustment) {
      return res.status(404).json({ message: "Inventory adjustment not found" });
    }
    
    const oldStatus = existingAdjustment.status;
    const newStatus = adjustmentData.status || oldStatus;
    const oldItems = existingAdjustment.items || [];
    const newItems = adjustmentData.items || oldItems;
    const warehouse = adjustmentData.warehouse || existingAdjustment.warehouse;
    const adjustmentType = adjustmentData.adjustmentType || existingAdjustment.adjustmentType;
    
    console.log(`\n=== UPDATE INVENTORY ADJUSTMENT ===`);
    console.log(`Adjustment ID: ${id}`);
    console.log(`Old Status: ${oldStatus}, New Status: ${newStatus}`);
    console.log(`Old Items Count: ${oldItems.length}, New Items Count: ${newItems.length}`);
    console.log(`Adjustment Type: ${adjustmentType}`);
    
    // Helper function to create a comparison key for an item
    const getItemKey = (item) => {
      const itemId = item.itemId ? String(item.itemId) : 'null';
      const itemGroupId = item.itemGroupId ? String(item.itemGroupId) : 'null';
      const itemName = item.itemName || '';
      return `${itemId}_${itemGroupId}_${itemName}`;
    };
    
    // Check if quantities have changed (for adjusted adjustments)
    // Compare old and new items by creating maps and comparing quantities
    let quantitiesChanged = false;
    if (oldStatus === "adjusted" && newStatus === "adjusted") {
      // Create maps for easy lookup
      const oldItemsMap = new Map();
      oldItems.forEach(item => {
        const key = getItemKey(item);
        oldItemsMap.set(key, item);
        console.log(`  Old Item: ${key}, qtyAdjusted: ${item.quantityAdjusted}`);
      });
      
      const newItemsMap = new Map();
      newItems.forEach(item => {
        const key = getItemKey(item);
        newItemsMap.set(key, item);
        console.log(`  New Item: ${key}, qtyAdjusted: ${item.quantityAdjusted}`);
      });
      
      // Check if any quantities changed or items were added/removed
      if (oldItemsMap.size !== newItemsMap.size) {
        quantitiesChanged = true;
        console.log(`  Quantities changed: Item count changed (${oldItemsMap.size} -> ${newItemsMap.size})`);
      } else {
        for (const [key, oldItem] of oldItemsMap) {
          const newItem = newItemsMap.get(key);
          const oldQty = parseFloat(oldItem.quantityAdjusted) || 0;
          const newQty = parseFloat(newItem?.quantityAdjusted) || 0;
          const diff = Math.abs(oldQty - newQty);
          
          if (!newItem) {
            quantitiesChanged = true;
            console.log(`  Quantities changed: Item removed: ${key}`);
            break;
          } else if (diff > 0.01) {
            quantitiesChanged = true;
            console.log(`  Quantities changed: ${key}, old: ${oldQty}, new: ${newQty}, diff: ${diff}`);
            break;
          }
        }
      }
    }
    
    console.log(`Quantities Changed: ${quantitiesChanged}`);
    
    // If changing from draft to adjusted, apply stock changes
    if (oldStatus === "draft" && newStatus === "adjusted") {
      console.log(`📊 Updating adjustment: Applying stock changes (draft -> adjusted)`);
      for (const item of newItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToApply = parseFloat(item.quantityAdjusted) || 0;
          console.log(`   Applying adjustment: ${item.itemName || 'Unknown'}, qty: ${qtyToApply}`);
          try {
            await adjustItemStock(
              item.itemId,
              qtyToApply,
              warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            console.log(`   ✅ Applied: ${item.itemName}`);
          } catch (error) {
            console.error(`   ❌ Error applying: ${item.itemName}`, error);
          }
        }
      }
    }
    
    // If changing from adjusted to draft, reverse stock changes
    if (oldStatus === "adjusted" && newStatus === "draft") {
      console.log(`📊 Updating adjustment: Reversing stock changes (adjusted -> draft)`);
      for (const item of oldItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToReverse = parseFloat(item.quantityAdjusted) || 0;
          console.log(`   Reversing adjustment: ${item.itemName || 'Unknown'}, qty: ${qtyToReverse}`);
          try {
            // Reverse the adjustment
            await adjustItemStock(
              item.itemId,
              -qtyToReverse,
              existingAdjustment.warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            console.log(`   ✅ Reversed: ${item.itemName}`);
          } catch (error) {
            console.error(`   ❌ Error reversing: ${item.itemName}`, error);
          }
        }
      }
    }
    
    // If status is "adjusted" and we're updating, always reverse old and apply new
    // This ensures stock is correct even if comparison logic misses changes
    if (oldStatus === "adjusted" && newStatus === "adjusted") {
      if (quantitiesChanged) {
        console.log(`📊 Updating adjustment: Quantities changed, reversing old and applying new`);
      } else {
        console.log(`📊 Updating adjustment: Status remains "adjusted" - reversing old and applying new to ensure accuracy`);
      }
      
      // First, reverse all old adjustments
      for (const item of oldItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToReverse = parseFloat(item.quantityAdjusted) || 0;
          console.log(`   Reversing old adjustment: ${item.itemName || 'Unknown'}, qty: ${qtyToReverse}`);
          try {
            await adjustItemStock(
              item.itemId,
              -qtyToReverse,
              existingAdjustment.warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            console.log(`   ✅ Reversed: ${item.itemName}`);
          } catch (error) {
            console.error(`   ❌ Error reversing: ${item.itemName}`, error);
          }
        }
      }
      
      // Then, apply all new adjustments
      for (const item of newItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToApply = parseFloat(item.quantityAdjusted) || 0;
          console.log(`   Applying new adjustment: ${item.itemName || 'Unknown'}, qty: ${qtyToApply}`);
          try {
            await adjustItemStock(
              item.itemId,
              qtyToApply,
              warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
            console.log(`   ✅ Applied: ${item.itemName}`);
          } catch (error) {
            console.error(`   ❌ Error applying: ${item.itemName}`, error);
          }
        }
      }
      console.log(`✅ Stock update completed`);
    }
    
    // Update the adjustment - ensure modifiedBy is set to the email/userId
    const updateData = {
      ...adjustmentData,
      modifiedBy: userId || modifiedBy, // Use userId (email) as modifiedBy
    };
    
    await existingAdjustment.update(updateData);
    
    // Reload to get updated data
    await existingAdjustment.reload();
    
    // DUAL-SAVE: Also update in MongoDB for safety/redundancy
    try {
      console.log(`💾 Dual-updating inventory adjustment in MongoDB for safety...`);
      
      // Find the MongoDB record by PostgreSQL ID or reference number
      const mongoAdjustment = await MongoInventoryAdjustment.findOne({
        $or: [
          { postgresqlId: id },
          { referenceNumber: existingAdjustment.referenceNumber }
        ]
      });
      
      if (mongoAdjustment) {
        // Convert PostgreSQL items to MongoDB format
        const mongoItems = (adjustmentData.items || existingAdjustment.items || []).map(item => ({
          itemId: item.itemId ? item.itemId : null,
          itemGroupId: item.itemGroupId ? item.itemGroupId : null,
          itemName: item.itemName,
          itemSku: item.itemSku,
          currentQuantity: item.currentQuantity,
          currentValue: item.currentValue,
          quantityAdjusted: item.quantityAdjusted,
          newQuantity: item.newQuantity,
          unitCost: item.unitCost,
          valueAdjusted: item.valueAdjusted,
          newValue: item.newValue,
        }));
        
        await mongoAdjustment.updateOne({
          ...updateData,
          items: mongoItems,
          postgresqlId: id, // Maintain reference
        });
        
        console.log(`✅ Successfully updated in MongoDB`);
      } else {
        console.log(`⚠️  MongoDB record not found, creating new one...`);
        
        // Create new MongoDB record if not found
        const mongoItems = (adjustmentData.items || existingAdjustment.items || []).map(item => ({
          itemId: item.itemId ? item.itemId : null,
          itemGroupId: item.itemGroupId ? item.itemGroupId : null,
          itemName: item.itemName,
          itemSku: item.itemSku,
          currentQuantity: item.currentQuantity,
          currentValue: item.currentValue,
          quantityAdjusted: item.quantityAdjusted,
          newQuantity: item.newQuantity,
          unitCost: item.unitCost,
          valueAdjusted: item.valueAdjusted,
          newValue: item.newValue,
        }));
        
        await MongoInventoryAdjustment.create({
          adjustmentType: existingAdjustment.adjustmentType,
          referenceNumber: existingAdjustment.referenceNumber,
          date: existingAdjustment.date,
          account: existingAdjustment.account,
          reason: existingAdjustment.reason,
          branch: existingAdjustment.branch,
          warehouse: existingAdjustment.warehouse,
          description: existingAdjustment.description,
          items: mongoItems,
          totalQuantityAdjusted: existingAdjustment.totalQuantityAdjusted,
          totalValueAdjusted: existingAdjustment.totalValueAdjusted,
          userId: existingAdjustment.userId,
          createdBy: existingAdjustment.createdBy,
          modifiedBy: userId || modifiedBy,
          status: existingAdjustment.status,
          locCode: existingAdjustment.locCode,
          postgresqlId: id,
        });
        
        console.log(`✅ Successfully created new record in MongoDB`);
      }
    } catch (mongoError) {
      console.error(`⚠️  Failed to update MongoDB (PostgreSQL update was successful):`, mongoError);
      // Don't fail the entire operation if MongoDB update fails
    }
    
    res.status(200).json(existingAdjustment);
  } catch (error) {
    console.error("Error updating inventory adjustment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete an inventory adjustment
export const deleteInventoryAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const adjustment = await InventoryAdjustment.findByPk(id);
    
    if (!adjustment) {
      return res.status(404).json({ message: "Inventory adjustment not found" });
    }
    
    // If status is "adjusted", reverse the stock changes before deleting
    if (adjustment.status === "adjusted") {
      const items = adjustment.items || [];
      for (const item of items) {
        if (adjustment.adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          // Reverse the adjustment
          await adjustItemStock(
            item.itemId,
            -item.quantityAdjusted,
            adjustment.warehouse,
            item.itemName,
            item.itemGroupId,
            item.itemSku
          );
        }
      }
    }
    
    await adjustment.destroy();
    
    // DUAL-DELETE: Also delete from MongoDB for consistency
    try {
      console.log(`💾 Dual-deleting inventory adjustment from MongoDB for consistency...`);
      
      const mongoResult = await MongoInventoryAdjustment.deleteOne({
        $or: [
          { postgresqlId: id },
          { referenceNumber: adjustment.referenceNumber }
        ]
      });
      
      if (mongoResult.deletedCount > 0) {
        console.log(`✅ Successfully deleted from MongoDB`);
      } else {
        console.log(`⚠️  No matching record found in MongoDB to delete`);
      }
    } catch (mongoError) {
      console.error(`⚠️  Failed to delete from MongoDB (PostgreSQL delete was successful):`, mongoError);
      // Don't fail the entire operation if MongoDB delete fails
    }
    
    res.status(200).json({ message: "Inventory adjustment deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory adjustment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get current stock for an item (helper endpoint)
export const getItemStock = async (req, res) => {
  try {
    const { itemId, itemGroupId, itemName, itemSku, warehouse } = req.query;
    
    if (!warehouse) {
      return res.status(400).json({ message: "Warehouse is required" });
    }
    
    const stockInfo = await getCurrentStock(itemId, warehouse, itemName, itemGroupId, itemSku);
    
    res.status(200).json(stockInfo);
  } catch (error) {
    console.error("Error fetching item stock:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get next reference number for inventory adjustment
export const getNextReferenceNumber = async (req, res) => {
  try {
    const prefix = req.query.prefix || "IA-";
    const referenceNumber = await nextInventoryAdjustment(prefix);
    res.status(200).json({ referenceNumber });
  } catch (error) {
    console.error("Error generating reference number:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
