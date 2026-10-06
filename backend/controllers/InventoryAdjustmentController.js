import mongoose from "mongoose";
import InventoryAdjustment from "../model/InventoryAdjustment.js";
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

  // If itemId is null but we have itemGroupId and itemName, use name-based search
  if ((!itemIdValue || itemIdValue === null || itemIdValue === "null") && itemGroupId && itemName) {
    return await adjustItemStockByName(itemGroupId, itemName, quantityAdjustment, targetWarehouse, itemSku);
  }

  // First, try to find as standalone item
  let shoeItem = null;
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null" && mongoose.isValidObjectId(itemIdValue)) {
    shoeItem = await ShoeItem.findById(itemIdValue);
  }

  if (shoeItem) {
    const itemPlain = shoeItem.toObject();
    if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
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

    const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
    const newStock = Math.max(0, currentStock + quantityAdjustment);
    wsEntry.stockOnHand = newStock;
    wsEntry.availableForSale = Math.max(0, (parseFloat(wsEntry.availableForSale) || 0) + quantityAdjustment);
    wsEntry.physicalStockOnHand = Math.max(0, (parseFloat(wsEntry.physicalStockOnHand) || 0) + quantityAdjustment);
    wsEntry.physicalAvailableForSale = Math.max(0, (parseFloat(wsEntry.physicalAvailableForSale) || 0) + quantityAdjustment);
    wsEntry.warehouse = targetWarehouse;

    console.log(`   📊 Inventory adjustment: ${currentStock} ${quantityAdjustment >= 0 ? '+' : ''}${quantityAdjustment} = ${newStock}`);

    const updatedItem = await ShoeItem.findByIdAndUpdate(
      itemIdValue,
      { $set: { warehouseStocks: itemPlain.warehouseStocks } },
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
      itemName: shoeItem.name,
      newQuantity: updatedStock?.stockOnHand || 0
    };
  }

  // If not standalone, try item group
  if (itemGroupId && mongoose.isValidObjectId(itemGroupId)) {
    const group = await ItemGroup.findById(itemGroupId);
    if (!group) {
      return { success: false, message: `Item group ${itemGroupId} not found` };
    }

    let itemIndex = -1;
    if (itemIdValue) {
      itemIndex = group.items.findIndex(item => item._id && item._id.toString() === itemIdValue.toString());
    }

    if (itemIndex === -1 && itemSku) {
      itemIndex = group.items.findIndex(item => item.sku && item.sku.toLowerCase() === itemSku.toLowerCase());
    }

    if (itemIndex === -1 && itemName) {
      itemIndex = group.items.findIndex(item => item.name && item.name.toLowerCase() === itemName.toLowerCase());
    }

    if (itemIndex === -1) {
      return { success: false, message: `Item not found in group ${group.name}` };
    }

    const groupPlain = group.toObject();
    const itemPlain = groupPlain.items[itemIndex];

    if (!itemPlain.warehouseStocks || !Array.isArray(itemPlain.warehouseStocks)) {
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

    const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
    const newStock = Math.max(0, currentStock + quantityAdjustment);
    wsEntry.stockOnHand = newStock;
    wsEntry.availableForSale = Math.max(0, (parseFloat(wsEntry.availableForSale) || 0) + quantityAdjustment);
    wsEntry.physicalStockOnHand = Math.max(0, (parseFloat(wsEntry.physicalStockOnHand) || 0) + quantityAdjustment);
    wsEntry.physicalAvailableForSale = Math.max(0, (parseFloat(wsEntry.physicalAvailableForSale) || 0) + quantityAdjustment);
    wsEntry.warehouse = targetWarehouse;

    const updateResult = await ItemGroup.findByIdAndUpdate(
      group._id,
      { $set: { [`items.${itemIndex}`]: itemPlain } },
      { new: true }
    );

    if (updateResult) {
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

  return { success: false, message: `Item ${itemIdValue || itemName} not found in inventory` };
};

// Helper function to adjust stock by name
const adjustItemStockByName = async (itemGroupId, itemName, quantityAdjustment, targetWarehouse, itemSku = null) => {
  if (!mongoose.isValidObjectId(itemGroupId)) {
    return { success: false, message: "Invalid item group ID" };
  }
  const group = await ItemGroup.findById(itemGroupId);
  if (!group) {
    return { success: false, message: `Item group ${itemGroupId} not found` };
  }

  let itemIndex = -1;
  if (itemSku) {
    itemIndex = group.items.findIndex(item => item.sku && item.sku.toLowerCase() === itemSku.toLowerCase());
  }

  if (itemIndex === -1 && itemName) {
    itemIndex = group.items.findIndex(item => item.name && item.name.toLowerCase() === itemName.toLowerCase());
  }

  if (itemIndex === -1) {
    return { success: false, message: `Item ${itemName} not found in group ${group.name}` };
  }

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

  const currentStock = parseFloat(wsEntry.stockOnHand) || 0;
  const newStock = Math.max(0, currentStock + quantityAdjustment);
  wsEntry.stockOnHand = newStock;
  wsEntry.availableForSale = Math.max(0, (parseFloat(wsEntry.availableForSale) || 0) + quantityAdjustment);
  wsEntry.physicalStockOnHand = Math.max(0, (parseFloat(wsEntry.physicalStockOnHand) || 0) + quantityAdjustment);
  wsEntry.physicalAvailableForSale = Math.max(0, (parseFloat(wsEntry.physicalAvailableForSale) || 0) + quantityAdjustment);
  wsEntry.warehouse = targetWarehouse;

  console.log(`   📊 Inventory adjustment: ${currentStock} ${quantityAdjustment >= 0 ? '+' : ''}${quantityAdjustment} = ${newStock}`);

  const updateResult = await ItemGroup.findByIdAndUpdate(
    itemGroupId,
    { $set: { [`items.${itemIndex}`]: itemPlain } },
    { new: true }
  );

  if (!updateResult) {
    return { success: false, message: "Failed to update stock" };
  }

  const savedGroup = await ItemGroup.findById(itemGroupId);
  const savedItem = savedGroup.items[itemIndex];
  const savedStock = savedItem.warehouseStocks.find(ws =>
    ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
  ) || savedItem.warehouseStocks[0];

  return {
    success: true,
    type: 'group',
    stock: savedStock,
    groupName: group.name,
    itemName: groupPlain.items[itemIndex].name,
    newQuantity: savedStock?.stockOnHand || 0
  };
};

// Get current stock for an item
const getCurrentStock = async (itemIdValue, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  const targetWarehouse = warehouseName?.trim() || "Warehouse";

  // Try standalone item first
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null" && mongoose.isValidObjectId(itemIdValue)) {
    const shoeItem = await ShoeItem.findById(itemIdValue);
    if (shoeItem) {
      const targetWarehouseLower = targetWarehouse.trim().toLowerCase();
      let warehouseStock = shoeItem.warehouseStocks?.find(ws => {
        if (!ws.warehouse) return false;
        const wsLower = ws.warehouse.toString().trim().toLowerCase();
        return wsLower === targetWarehouseLower || wsLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(wsLower);
      });

      if (!warehouseStock && shoeItem.warehouseStocks && shoeItem.warehouseStocks.length > 0) {
        warehouseStock = shoeItem.warehouseStocks[0];
      }

      return {
        success: true,
        currentQuantity: warehouseStock?.stockOnHand || 0,
        currentValue: (warehouseStock?.stockOnHand || 0) * (shoeItem.costPrice || 0),
        warehouseStocks: shoeItem.warehouseStocks || [],
      };
    }
  }

  // Try item groups
  if (itemGroupId && itemName && mongoose.isValidObjectId(itemGroupId)) {
    const group = await ItemGroup.findById(itemGroupId);
    if (group) {
      const item = group.items.find(item => {
        if (itemSku && item.sku) {
          return item.sku.toLowerCase() === itemSku.toLowerCase();
        }
        return item.name.toLowerCase() === itemName.toLowerCase();
      });

      if (item) {
        const targetWarehouseLower = targetWarehouse.trim().toLowerCase();
        let warehouseStock = item.warehouseStocks?.find(ws => {
          if (!ws.warehouse) return false;
          const wsLower = ws.warehouse.toString().trim().toLowerCase();
          return wsLower === targetWarehouseLower || wsLower.includes(targetWarehouseLower) || targetWarehouseLower.includes(wsLower);
        });

        if (!warehouseStock && item.warehouseStocks && item.warehouseStocks.length > 0) {
          warehouseStock = item.warehouseStocks[0];
        }

        return {
          success: true,
          currentQuantity: warehouseStock?.stockOnHand || 0,
          currentValue: (warehouseStock?.stockOnHand || 0) * (item.costPrice || 0),
          warehouseStocks: item.warehouseStocks || [],
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

    let userId = "";
    let createdBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || adjustmentData.userId || "";
          createdBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || adjustmentData.userId || "";
              createdBy = user?.name || user?.displayName || userId;
            } catch (e) {
              userId = userStr || adjustmentData.userId || "";
              createdBy = userId;
            }
          } else {
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

    if (!adjustmentData.date || !adjustmentData.warehouse || !adjustmentData.account || !adjustmentData.reason) {
      return res.status(400).json({
        message: "Missing required fields: date, warehouse, account, and reason are required"
      });
    }

    if (adjustmentData.adjustmentType && !["quantity", "value"].includes(adjustmentData.adjustmentType)) {
      return res.status(400).json({
        message: "Invalid adjustmentType. Must be 'quantity' or 'value'"
      });
    }

    if (adjustmentData.status && !["draft", "pending_approval", "adjusted"].includes(adjustmentData.status)) {
      return res.status(400).json({
        message: "Invalid status. Must be 'draft', 'pending_approval', or 'adjusted'"
      });
    }

    if (!userId || userId === "") {
      return res.status(400).json({
        message: "User ID is required. Please ensure you are logged in."
      });
    }

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
      return res.status(400).json({ message: "Invalid date format" });
    }

    let totalQuantityAdjusted = 0;
    let totalValueAdjusted = 0;
    const processedItems = [];

    if (!Array.isArray(adjustmentData.items) || adjustmentData.items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    for (const item of adjustmentData.items) {
      if (!item.itemName) continue;

      try {
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
          const itemCost = parseFloat(item.unitCost) || 0;
          newValue = newQuantity * itemCost;
          totalQuantityAdjusted += Math.abs(quantityAdjusted);
        } else {
          const unitCost = parseFloat(item.unitCost) || 0;
          const newQty = parseFloat(item.newQuantity) || currentQuantity;
          newQuantity = newQty;
          newValue = newQty * unitCost;
          valueAdjusted = newValue - currentValue;
          totalValueAdjusted += Math.abs(valueAdjusted);
        }

        processedItems.push({
          itemId: (item.itemId && mongoose.isValidObjectId(item.itemId)) ? item.itemId : null,
          itemGroupId: (item.itemGroupId && mongoose.isValidObjectId(item.itemGroupId)) ? item.itemGroupId : null,
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
      }
    }

    if (processedItems.length === 0) {
      return res.status(400).json({ message: "No valid items to process" });
    }

    let referenceNumber = adjustmentData.referenceNumber || "";
    if (!referenceNumber || referenceNumber.trim() === "") {
      referenceNumber = await nextInventoryAdjustment("IA-");
    }

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
      userId,
      createdBy: userId || createdBy,
      status: adjustmentData.status || "draft",
      locCode: adjustmentData.locCode || "",
    });

    // If status is "adjusted", apply adjustments to stock
    if (adjustment.status === "adjusted") {
      for (const item of processedItems) {
        if (adjustmentData.adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          try {
            await adjustItemStock(
              item.itemId,
              item.quantityAdjusted,
              adjustmentData.warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
          } catch (stockError) {
            console.error(`Error adjusting stock:`, stockError);
          }
        }
      }
    }

    const result = adjustment.toObject();
    result.id = result._id.toString();

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating inventory adjustment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all inventory adjustments
export const getInventoryAdjustments = async (req, res) => {
  try {
    const { userId, userPower, warehouse, status, adjustmentType, startDate, endDate, locCode } = req.query;

    const where = {};

    const adminEmails = ['officebrynex@gmail.com'];
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail ||
                    (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                    (locCode && (locCode === '858' || locCode === '103'));

    const isAdminViewingSpecificStore = isAdmin && warehouse && warehouse !== "All Stores";

    if ((!isAdmin || isAdminViewingSpecificStore) && warehouse) {
      where.warehouse = warehouse;
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
      if (startDate) where.date.$gte = new Date(startDate);
      if (endDate) where.date.$lte = new Date(endDate);
    }

    const adjustments = await InventoryAdjustment.find(where)
      .sort({ date: -1, createdAt: -1 })
      .limit(1000)
      .lean();

    const transformedAdjustments = adjustments.map(adj => ({
      ...adj,
      _id: adj._id.toString(),
      id: adj._id.toString(),
    }));

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
    let adjustment = null;

    if (mongoose.isValidObjectId(id)) {
      adjustment = await InventoryAdjustment.findById(id).lean();
    }
    if (!adjustment) {
      adjustment = await InventoryAdjustment.findOne({
        $or: [{ referenceNumber: id }, { locCode: id }]
      }).lean();
    }

    if (!adjustment) {
      return res.status(404).json({ message: "Inventory adjustment not found" });
    }

    const transformedAdjustment = {
      ...adjustment,
      _id: adjustment._id.toString(),
      id: adjustment._id.toString(),
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

    let userId = "";
    let modifiedBy = "";
    try {
      const userStr = req.headers['user'] || req.body.userId;
      if (userStr) {
        if (typeof userStr === 'object' && userStr !== null) {
          userId = userStr.email || userStr._id || userStr.id || adjustmentData.userId || "";
          modifiedBy = userStr.name || userStr.displayName || userId;
        } else if (typeof userStr === 'string') {
          if (userStr.trim().startsWith('{') || userStr.trim().startsWith('[')) {
            try {
              const user = JSON.parse(userStr);
              userId = user?.email || user?._id || user?.id || adjustmentData.userId || "";
              createdBy = user?.name || user?.displayName || userId;
            } catch (e) {
              userId = userStr || adjustmentData.userId || "";
              modifiedBy = userId;
            }
          } else {
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
      userId = adjustmentData.userId || "";
      modifiedBy = userId;
    }

    let existingAdjustment = null;
    if (mongoose.isValidObjectId(id)) {
      existingAdjustment = await InventoryAdjustment.findById(id);
    }
    if (!existingAdjustment) {
      existingAdjustment = await InventoryAdjustment.findOne({ referenceNumber: id });
    }

    if (!existingAdjustment) {
      return res.status(404).json({ message: "Inventory adjustment not found" });
    }

    const oldStatus = existingAdjustment.status;
    const newStatus = adjustmentData.status || oldStatus;
    const oldItems = existingAdjustment.items || [];
    const newItems = adjustmentData.items || oldItems;
    const warehouse = adjustmentData.warehouse || existingAdjustment.warehouse;
    const adjustmentType = adjustmentData.adjustmentType || existingAdjustment.adjustmentType;

    // If changing from draft or pending_approval to adjusted, apply stock changes
    if ((oldStatus === "draft" || oldStatus === "pending_approval") && newStatus === "adjusted") {
      for (const item of newItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToApply = parseFloat(item.quantityAdjusted) || 0;
          try {
            await adjustItemStock(
              item.itemId,
              qtyToApply,
              warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
          } catch (error) {
            console.error(`Error applying stock: ${item.itemName}`, error);
          }
        }
      }
    }

    // If changing from adjusted to draft or pending_approval, reverse stock changes
    if (oldStatus === "adjusted" && (newStatus === "draft" || newStatus === "pending_approval")) {
      for (const item of oldItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToReverse = parseFloat(item.quantityAdjusted) || 0;
          try {
            await adjustItemStock(
              item.itemId,
              -qtyToReverse,
              existingAdjustment.warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
          } catch (error) {
            console.error(`Error reversing stock: ${item.itemName}`, error);
          }
        }
      }
    }

    // If status remains adjusted and items/quantities change
    if (oldStatus === "adjusted" && newStatus === "adjusted") {
      for (const item of oldItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToReverse = parseFloat(item.quantityAdjusted) || 0;
          try {
            await adjustItemStock(
              item.itemId,
              -qtyToReverse,
              existingAdjustment.warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
          } catch (error) {
            console.error(`Error reversing old stock: ${item.itemName}`, error);
          }
        }
      }

      for (const item of newItems) {
        if (adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
          const qtyToApply = parseFloat(item.quantityAdjusted) || 0;
          try {
            await adjustItemStock(
              item.itemId,
              qtyToApply,
              warehouse,
              item.itemName,
              item.itemGroupId,
              item.itemSku
            );
          } catch (error) {
            console.error(`Error applying new stock: ${item.itemName}`, error);
          }
        }
      }
    }

    const updateData = {
      ...adjustmentData,
      modifiedBy: userId || modifiedBy,
    };

    Object.assign(existingAdjustment, updateData);
    await existingAdjustment.save();

    const result = existingAdjustment.toObject();
    result.id = result._id.toString();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating inventory adjustment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete an inventory adjustment
export const deleteInventoryAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    let adjustment = null;

    if (mongoose.isValidObjectId(id)) {
      adjustment = await InventoryAdjustment.findById(id);
    }
    if (!adjustment) {
      adjustment = await InventoryAdjustment.findOne({ referenceNumber: id });
    }

    if (!adjustment) {
      return res.status(404).json({ message: "Inventory adjustment not found" });
    }

    if (adjustment.status === "adjusted") {
      const items = adjustment.items || [];
      for (const item of items) {
        if (adjustment.adjustmentType === "quantity" && item.quantityAdjusted !== 0) {
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

    await adjustment.deleteOne();

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
