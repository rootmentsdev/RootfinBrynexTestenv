// Updated to use PostgreSQL (Sequelize) instead of MongoDB
import { VendorCredit, Vendor, sequelize } from "../models/sequelize/index.js";
import { Op } from 'sequelize';
import { nextCreditNote } from "../utils/nextCreditNote.js";
import Counter from "../model/Counter.js";
import mongoose from "mongoose";
import ShoeItem from "../model/ShoeItem.js";
import ItemGroup from "../model/ItemGroup.js";

// Helper function to add stock (for reversing vendor credits) - adds back to specific warehouse
const addItemStock = async (itemIdValue, quantity, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  // Helper function to update warehouse stock (add) - only to specified warehouse
  const updateWarehouseStock = (warehouseStocks, qty, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      // Create new warehouse entry if it doesn't exist
      return [{
        warehouse: targetWarehouse,
        openingStock: 0,
        openingStockValue: 0,
        stockOnHand: qty,
        committedStock: 0,
        availableForSale: qty,
        physicalOpeningStock: 0,
        physicalStockOnHand: qty,
        physicalCommittedStock: 0,
        physicalAvailableForSale: qty,
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
        stockOnHand: 0,
        committedStock: 0,
        availableForSale: 0,
        physicalOpeningStock: 0,
        physicalStockOnHand: 0,
        physicalCommittedStock: 0,
        physicalAvailableForSale: 0,
      };
      warehouseStocks.push(warehouseStock);
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    warehouseStock.warehouse = targetWarehouse;
    
    // Add stock back to this warehouse
    warehouseStock.stockOnHand = currentStockOnHand + qty;
    warehouseStock.availableForSale = currentAvailableForSale + qty;
    warehouseStock.physicalStockOnHand = currentPhysicalStockOnHand + qty;
    warehouseStock.physicalAvailableForSale = currentPhysicalAvailableForSale + qty;
    
    return { success: true, warehouseStocks };
  };
  
  // First, try to find as standalone item
  let shoeItem = await ShoeItem.findById(itemIdValue);
  if (shoeItem) {
    const result = updateWarehouseStock(shoeItem.warehouseStocks, quantity, warehouseName);
    if (!result.success) {
      return result;
    }
    shoeItem.warehouseStocks = result.warehouseStocks;
    await shoeItem.save();
    console.log(`✅ Added stock back for standalone item: ${itemName || itemIdValue}, Quantity: ${quantity}, Warehouse: ${warehouseName}`);
    return { success: true, type: 'standalone', warehouse: warehouseName };
  }
  
  // Item not found in standalone items, try to find in item groups
  let itemGroups = [];
  if (itemGroupId) {
    const specificGroup = await ItemGroup.findById(itemGroupId);
    if (specificGroup && specificGroup.isActive !== false) {
      itemGroups = [specificGroup];
    }
  }
  
  if (itemGroups.length === 0) {
    itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
  }
  
  // Search through groups
  for (const group of itemGroups) {
    for (let i = 0; i < group.items.length; i++) {
      const groupItem = group.items[i];
      const groupItemId = groupItem._id?.toString() || groupItem.id?.toString();
      const compositeId = `${group._id}_${i}`;
      
      // Try multiple ID matching strategies
      const itemIdStr = itemIdValue?.toString() || "";
      const idMatches = 
        itemIdStr === groupItemId ||
        itemIdStr === compositeId ||
        itemIdStr.includes(groupItemId) ||
        groupItemId?.includes(itemIdStr) ||
        (itemIdStr.length >= 8 && groupItemId?.includes(itemIdStr.substring(0, 8))) ||
        (groupItemId && itemIdStr.includes(groupItemId.substring(0, 8)));
      
      // Name-based matching
      const nameMatches = itemName && groupItem.name && 
        groupItem.name.toLowerCase().trim() === itemName.toLowerCase().trim();
      
      // SKU-based matching
      const skuMatches = itemSku && groupItem.sku && 
        groupItem.sku.toLowerCase().trim() === itemSku.toLowerCase().trim();
      
      if (idMatches || nameMatches || skuMatches) {
        // Update warehouse stocks for this item (add stock back) - only to specified warehouse
        const result = updateWarehouseStock(groupItem.warehouseStocks || [], quantity, warehouseName);
        if (!result.success) {
          return result;
        }
        groupItem.warehouseStocks = result.warehouseStocks;
        group.items[i] = groupItem;
        group.markModified('items');
        await group.save();
        console.log(`✅ Added stock back for item in group: ${groupItem.name} (Group: ${group.name}), Quantity: ${quantity}, Warehouse: ${warehouseName}`);
        return { success: true, type: 'group', groupName: group.name, itemName: groupItem.name, warehouse: warehouseName };
      }
    }
  }
  
  console.warn(`⚠️ Item with ID ${itemIdValue} not found for stock addition`);
  return { success: false, message: `Item with ID ${itemIdValue} not found` };
};

// Helper function to reduce stock for items in vendor credit by name and SKU (when itemId is null)
const reduceItemStockByName = async (itemGroupId, itemName, quantity, warehouseName, itemSku = null) => {
  if (!itemGroupId || !itemName) {
    return { success: false, message: "itemGroupId and itemName are required when itemId is null" };
  }
  
  console.log(`   🔍 Searching for item by name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''} in group ${itemGroupId}...`);
  
  const group = await ItemGroup.findById(itemGroupId);
  if (!group || group.isActive === false) {
    return { success: false, message: `Item group ${itemGroupId} not found or inactive` };
  }
  
  if (!group.items || !Array.isArray(group.items)) {
    return { success: false, message: `Item group ${itemGroupId} has no items` };
  }
  
  // Find item by name and SKU (if SKU is provided, match both; otherwise match by name only)
  let itemIndex = -1;
  if (itemSku) {
    // Match by both name AND SKU for better accuracy
    itemIndex = group.items.findIndex(gi => {
      const nameMatch = gi.name && gi.name.trim() === itemName.trim();
      const skuMatch = gi.sku && gi.sku.trim() === itemSku.trim();
      return nameMatch && skuMatch;
    });
    
    if (itemIndex === -1) {
      console.warn(`   ⚠️ Item with name "${itemName}" and SKU "${itemSku}" not found, trying name only...`);
      // Fallback to name only if SKU match fails
      itemIndex = group.items.findIndex(gi => gi.name && gi.name.trim() === itemName.trim());
    }
  } else {
    // Match by name only if SKU is not provided
    itemIndex = group.items.findIndex(gi => gi.name && gi.name.trim() === itemName.trim());
  }
  
  if (itemIndex === -1) {
    console.warn(`   ⚠️ Item with name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''} not found in group "${group.name}"`);
    return { success: false, message: `Item with name "${itemName}"${itemSku ? ` and SKU "${itemSku}"` : ''} not found in group` };
  }
  
  const groupItem = group.items[itemIndex];
  console.log(`   ✅ Found item "${groupItem.name}" in group "${group.name}" at index ${itemIndex}`);
  
  // Helper function to update warehouse stock (subtract) - only from specified warehouse
  const updateWarehouseStock = (warehouseStocks, qty, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      return { success: false, message: `No stock found in warehouse "${targetWarehouse}"` };
    }
    
    // Find the specific warehouse (case-insensitive match)
    let warehouseStock = warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!warehouseStock) {
      return { success: false, message: `Warehouse "${targetWarehouse}" not found for this item` };
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    // Check if warehouse has enough stock
    if (currentStockOnHand < qty) {
      return { 
        success: false, 
        message: `Insufficient stock in warehouse "${targetWarehouse}". Available: ${currentStockOnHand}, Required: ${qty}` 
      };
    }
    
    // Subtract stock (vendor credit reduces inventory) - only from this warehouse
    warehouseStock.stockOnHand = Math.max(0, currentStockOnHand - qty);
    warehouseStock.availableForSale = Math.max(0, currentAvailableForSale - qty);
    warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand - qty);
    warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale - qty);
    
    return { success: true, warehouseStocks };
  };
  
  // Update warehouse stocks for this item
  const result = updateWarehouseStock(groupItem.warehouseStocks || [], quantity, warehouseName);
  if (!result.success) {
    return result;
  }
  
  groupItem.warehouseStocks = result.warehouseStocks;
  group.items[itemIndex] = groupItem;
  group.markModified('items');
  await group.save();
  
  console.log(`   ✅ Successfully reduced stock for item "${groupItem.name}" in group "${group.name}"`);
  return { success: true, type: 'group', stock: groupItem.warehouseStocks, groupName: group.name, itemName: groupItem.name, warehouse: warehouseName };
};

// Helper function to reduce stock for items in vendor credit (opposite of purchase receive)
// Only reduces stock from the specified warehouse
const reduceItemStock = async (itemIdValue, quantity, warehouseName, itemName = null, itemGroupId = null, itemSku = null) => {
  // Validate warehouse name
  if (!warehouseName || warehouseName.trim() === "") {
    return { success: false, message: "Warehouse name is required for vendor credit" };
  }
  
  // Helper function to update warehouse stock (subtract) - only from specified warehouse
  const updateWarehouseStock = (warehouseStocks, qty, targetWarehouse) => {
    if (!warehouseStocks || warehouseStocks.length === 0) {
      // If no warehouse stocks exist, we cannot reduce from a non-existent warehouse
      return { success: false, message: `No stock found in warehouse "${targetWarehouse}"` };
    }
    
    // Find the specific warehouse (case-insensitive match)
    let warehouseStock = warehouseStocks.find(ws => 
      ws.warehouse && ws.warehouse.toString().trim().toLowerCase() === targetWarehouse.trim().toLowerCase()
    );
    
    if (!warehouseStock) {
      // Warehouse not found in item's warehouse stocks
      return { success: false, message: `Warehouse "${targetWarehouse}" not found for this item` };
    }
    
    const currentStockOnHand = parseFloat(warehouseStock.stockOnHand) || 0;
    const currentAvailableForSale = parseFloat(warehouseStock.availableForSale) || 0;
    const currentPhysicalStockOnHand = parseFloat(warehouseStock.physicalStockOnHand) || 0;
    const currentPhysicalAvailableForSale = parseFloat(warehouseStock.physicalAvailableForSale) || 0;
    
    // Check if warehouse has enough stock
    if (currentStockOnHand < qty) {
      return { 
        success: false, 
        message: `Insufficient stock in warehouse "${targetWarehouse}". Available: ${currentStockOnHand}, Required: ${qty}` 
      };
    }
    
    // Subtract stock (vendor credit reduces inventory) - only from this warehouse
    warehouseStock.stockOnHand = Math.max(0, currentStockOnHand - qty);
    warehouseStock.availableForSale = Math.max(0, currentAvailableForSale - qty);
    warehouseStock.physicalStockOnHand = Math.max(0, currentPhysicalStockOnHand - qty);
    warehouseStock.physicalAvailableForSale = Math.max(0, currentPhysicalAvailableForSale - qty);
    
    return { success: true, warehouseStocks };
  };
  
  // If itemId is null but we have itemGroupId and itemName, use the name-based search
  if ((!itemIdValue || itemIdValue === null || itemIdValue === "null") && itemGroupId && itemName) {
    console.log(`   🔍 ItemId is null, using name-based search in group ${itemGroupId}`);
    return await reduceItemStockByName(itemGroupId, itemName, quantity, warehouseName, itemSku);
  }
  
  // First, try to find as standalone item
  let shoeItem = null;
  if (itemIdValue && itemIdValue !== null && itemIdValue !== "null") {
    shoeItem = await ShoeItem.findById(itemIdValue);
  }
  
  if (shoeItem) {
    const result = updateWarehouseStock(shoeItem.warehouseStocks, quantity, warehouseName);
    if (!result.success) {
      return result;
    }
    shoeItem.warehouseStocks = result.warehouseStocks;
    await shoeItem.save();
    console.log(`✅ Reduced stock for standalone item: ${itemName || itemIdValue}, Quantity: ${quantity}, Warehouse: ${warehouseName}`);
    return { success: true, type: 'standalone', warehouse: warehouseName };
  }
  
  // Item not found in standalone items, try to find in item groups
  console.log(`   🔍 Item not found as standalone, searching in item groups...`);
  console.log(`      - itemGroupId provided: ${itemGroupId || 'none'}`);
  console.log(`      - itemName: ${itemName || 'none'}`);
  console.log(`      - itemSku: ${itemSku || 'none'}`);
  
  // If we have itemGroupId and itemName but itemId was null or not found, try name-based search
  if (itemGroupId && itemName) {
    console.log(`   🔍 Trying name-based search in group ${itemGroupId}`);
    const nameBasedResult = await reduceItemStockByName(itemGroupId, itemName, quantity, warehouseName, itemSku);
    if (nameBasedResult.success) {
      return nameBasedResult;
    }
    console.log(`   ⚠️ Name-based search failed: ${nameBasedResult.message}`);
  }
  
  let itemGroups = [];
  if (itemGroupId) {
    console.log(`   🔍 Searching in specific group: ${itemGroupId}`);
    const specificGroup = await ItemGroup.findById(itemGroupId);
    if (specificGroup && specificGroup.isActive !== false) {
      itemGroups = [specificGroup];
      console.log(`   ✅ Found specific group: ${specificGroup.name} with ${specificGroup.items?.length || 0} items`);
    } else {
      console.log(`   ⚠️ Specific group not found or inactive`);
    }
  }
  
  if (itemGroups.length === 0) {
    console.log(`   🔍 Searching in all active groups...`);
    itemGroups = await ItemGroup.find({ isActive: { $ne: false } });
    console.log(`   ✅ Found ${itemGroups.length} active groups to search`);
  }
  
  // Search through groups
  for (const group of itemGroups) {
    console.log(`   🔍 Searching in group: ${group.name} (${group._id})`);
    if (!group.items || !Array.isArray(group.items)) {
      console.log(`      ⚠️ Group has no items array`);
      continue;
    }
    
    for (let i = 0; i < group.items.length; i++) {
      const groupItem = group.items[i];
      const groupItemId = groupItem._id?.toString() || groupItem.id?.toString();
      const compositeId = `${group._id}_${i}`;
      
      // Try multiple ID matching strategies
      const itemIdStr = itemIdValue?.toString() || "";
      const idMatches = 
        itemIdStr === groupItemId ||
        itemIdStr === compositeId ||
        itemIdStr.includes(groupItemId) ||
        groupItemId?.includes(itemIdStr) ||
        (itemIdStr.length >= 8 && groupItemId?.includes(itemIdStr.substring(0, 8))) ||
        (groupItemId && itemIdStr.includes(groupItemId.substring(0, 8)));
      
      // Name-based matching
      const nameMatches = itemName && groupItem.name && 
        groupItem.name.toLowerCase().trim() === itemName.toLowerCase().trim();
      
      // SKU-based matching
      const skuMatches = itemSku && groupItem.sku && 
        groupItem.sku.toLowerCase().trim() === itemSku.toLowerCase().trim();
      
      if (idMatches || nameMatches || skuMatches) {
        console.log(`   ✅ Found matching item in group:`);
        console.log(`      - Item Name: ${groupItem.name}`);
        console.log(`      - Matched by: ${idMatches ? 'ID' : nameMatches ? 'Name' : 'SKU'}`);
        console.log(`      - Current warehouse stocks:`, JSON.stringify(groupItem.warehouseStocks || []));
        
        // Update warehouse stocks for this item (reduce stock) - only from specified warehouse
        const result = updateWarehouseStock(groupItem.warehouseStocks || [], quantity, warehouseName);
        if (!result.success) {
          console.log(`   ❌ Failed to update warehouse stock: ${result.message}`);
          return result;
        }
        groupItem.warehouseStocks = result.warehouseStocks;
        group.items[i] = groupItem;
        group.markModified('items');
        await group.save();
        console.log(`   ✅ Reduced stock for item in group: ${groupItem.name} (Group: ${group.name}), Quantity: ${quantity}, Warehouse: ${warehouseName}`);
        console.log(`      - Updated warehouse stocks:`, JSON.stringify(groupItem.warehouseStocks));
        return { success: true, type: 'group', groupName: group.name, itemName: groupItem.name, warehouse: warehouseName };
      }
    }
  }
  
  console.warn(`   ⚠️ Item with ID ${itemIdValue} not found for stock reduction`);
  console.warn(`      - Searched ${itemGroups.length} groups`);
  console.warn(`      - itemName: ${itemName || 'not provided'}`);
  console.warn(`      - itemSku: ${itemSku || 'not provided'}`);
  console.warn(`      - itemGroupId: ${itemGroupId || 'not provided'}`);
  return { success: false, message: `Item with ID ${itemIdValue} not found in any item groups` };
};

// Helper function to update vendor balance (reduce payables, increase unused credits)
const updateVendorBalance = async (vendorId, creditAmount, operation = 'add') => {
  try {
    if (!vendorId) return { success: false, message: "Vendor ID is required" };
    
    // Find vendor in PostgreSQL
    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      // Try MongoDB as fallback
      const mongoose = (await import("mongoose")).default;
      const VendorMongo = mongoose.model("Vendor", new mongoose.Schema({}, { strict: false }));
      const vendorMongo = await VendorMongo.findById(vendorId);
      if (!vendorMongo) {
        return { success: false, message: "Vendor not found" };
      }
      
      // Update MongoDB vendor
      const currentPayables = parseFloat(vendorMongo.payables) || 0;
      const currentCredits = parseFloat(vendorMongo.credits) || 0;
      
      if (operation === 'add') {
        vendorMongo.payables = Math.max(0, currentPayables - creditAmount);
        vendorMongo.credits = currentCredits + creditAmount;
      } else if (operation === 'subtract') {
        vendorMongo.payables = currentPayables + creditAmount;
        vendorMongo.credits = Math.max(0, currentCredits - creditAmount);
      }
      
      await vendorMongo.save();
      return { success: true, type: 'mongodb' };
    }
    
    // Update PostgreSQL vendor
    const currentPayables = parseFloat(vendor.payables) || 0;
    const currentCredits = parseFloat(vendor.credits) || 0;
    
    if (operation === 'add') {
      vendor.payables = Math.max(0, currentPayables - creditAmount);
      vendor.credits = currentCredits + creditAmount;
    } else if (operation === 'subtract') {
      vendor.payables = currentPayables + creditAmount;
      vendor.credits = Math.max(0, currentCredits - creditAmount);
    }
    
    await vendor.save();
    return { success: true, type: 'postgresql' };
  } catch (error) {
    console.error("Error updating vendor balance:", error);
    return { success: false, message: error.message };
  }
};

// Get next credit note number
export const getNextCreditNoteNumber = async (req, res) => {
  try {
    const prefix = req.query.prefix || "CN-";
    const counterId = prefix.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "CN";
    const cleanPrefix = prefix.endsWith("-") ? prefix.slice(0, -1) : prefix;
    
    // Get current counter value without incrementing
    const currentDoc = await Counter.findOne({ _id: counterId });
    const currentSeq = currentDoc ? currentDoc.seq : 0;
    const nextSeq = currentSeq + 1;
    
    // Generate the next number (this will increment the counter)
    const nextNumber = await nextCreditNote(prefix);
    
    // Return both the next number and next sequence for display
    res.status(200).json({ 
      creditNoteNumber: nextNumber,
      currentNumber: String(currentSeq).padStart(5, "0"),
      nextNumber: String(nextSeq).padStart(5, "0")
    });
  } catch (error) {
    console.error("Get next credit note number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new vendor credit
export const createVendorCredit = async (req, res) => {
  try {
    const creditData = req.body;
    
    // Auto-generate credit note number if not provided
    if (!creditData.creditNoteNumber) {
      const prefix = creditData.prefix || "CN-";
      creditData.creditNoteNumber = await nextCreditNote(prefix);
    }
    
    // Validate required fields
    if (!creditData.vendorName || !creditData.userId) {
      return res.status(400).json({ message: "Vendor name and userId are required" });
    }
    
    // vendorId is now a UUID string from PostgreSQL Vendor (optional field)
    if (!creditData.vendorId) {
      creditData.vendorId = null;
    }
    
    // Ensure items is an array
    if (creditData.items && !Array.isArray(creditData.items)) {
      creditData.items = [];
    }
    
    // Ensure discount is an object
    if (creditData.discount && typeof creditData.discount !== 'object') {
      creditData.discount = { value: '0', type: '%' };
    }
    
    // UUID will be auto-generated by the model if not provided
    // Make creditNoteNumber unique per user (email) instead of globally unique
    const existingCredit = await VendorCredit.findOne({ 
      where: {
        creditNoteNumber: creditData.creditNoteNumber,
        userId: creditData.userId
      }
    });
    
    if (existingCredit) {
      return res.status(409).json({ message: "Credit note number already exists for this user" });
    }
    
    // Initialize credit tracking
    const finalTotal = parseFloat(creditData.finalTotal) || 0;
    creditData.unusedCredit = finalTotal; // All credit is unused initially
    creditData.appliedCredit = 0;
    creditData.appliedToBills = [];
    
    const vendorCredit = await VendorCredit.create(creditData);
    
    // Helper function to check if there are items with quantities > 0
    const hasItemsWithQuantity = (items) => {
      if (!items || !Array.isArray(items) || items.length === 0) return false;
      return items.some(item => item.quantity && parseFloat(item.quantity) > 0);
    };
    
    // If status is "open", process the credit (reduce stock and update vendor balance)
    if (creditData.status === "open") {
      // Use default warehouse if not provided
      const warehouseName = creditData.warehouse?.trim() || "Warehouse";
      
      console.log(`📦 Processing vendor credit with status "open" - reducing stock for items from warehouse: ${warehouseName}`);
      // Reduce stock for items (if any) - only from the selected warehouse
      // Stock reduction should happen if there are items with quantities > 0, regardless of finalTotal
      if (hasItemsWithQuantity(creditData.items)) {
        console.log(`   Found ${creditData.items.length} items to process`);
        const stockReductionErrors = [];
        
        for (const item of creditData.items) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              console.log(`   🔍 Processing item for stock reduction:`);
              console.log(`      - Item ID: ${item.itemId}`);
              console.log(`      - Item Name: ${item.itemName}`);
              console.log(`      - Item Group ID: ${item.itemGroupId || 'none'}`);
              console.log(`      - Item SKU: ${item.itemSku || 'none'}`);
              console.log(`      - Quantity: ${item.quantity}`);
              console.log(`      - Warehouse: ${warehouseName}`);
              
              const result = await reduceItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName, // Pass the warehouse name
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
              if (result.success) {
                console.log(`   ✅ Successfully reduced stock for ${item.itemName || item.itemId} from ${warehouseName}`);
                console.log(`      - Type: ${result.type}`);
                if (result.type === 'group') {
                  console.log(`      - Group: ${result.groupName}`);
                }
              } else {
                const errorMsg = `Item ${item.itemName || item.itemId}: ${result.message}`;
                console.warn(`   ⚠️ Stock reduction skipped (non-blocking): ${errorMsg}`);
                stockReductionErrors.push(errorMsg);
              }
            } catch (error) {
              const errorMsg = `Item ${item.itemName || item.itemId}: ${error.message}`;
              console.error(`   ❌ Error reducing stock for item ${item.itemName} (non-blocking):`, error.message);
              stockReductionErrors.push(errorMsg);
            }
          }
        }
        
        // Log warnings but do NOT block saving - vendor credit is a financial document
        if (stockReductionErrors.length > 0) {
          console.warn(`   ⚠️ Some stock reductions failed (vendor credit still saved):`, stockReductionErrors);
        }
      } else {
        console.log(`   No items with quantities found in vendor credit - skipping stock reduction`);
      }
      
      // Update vendor balance (reduce payables, increase unused credits)
      // Only update vendor balance if finalTotal > 0
      if (creditData.vendorId && finalTotal > 0) {
        await updateVendorBalance(creditData.vendorId, finalTotal, 'add');
      }
    }
    
    res.status(201).json(vendorCredit.toJSON());
  } catch (error) {
    console.error("Create vendor credit error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      errors: error.errors
    });
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: "Credit note number already exists" });
    }
    
    // Handle validation errors
    if (error.name === "SequelizeValidationError") {
      const errors = error.errors.map(e => e.message).join(", ");
      return res.status(400).json({ message: "Validation error", error: errors });
    }
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all vendor credits for a user
export const getVendorCredits = async (req, res) => {
  try {
    const { userId, userPower, status, warehouse, locCode } = req.query;
    const whereClause = {};
    
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && typeof userId === 'string' && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail ||
                    (userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin')) ||
                    (locCode && (locCode === '858' || locCode === '103'));
    
    // If admin has switched to a specific store (not Warehouse), filter by that store
    const isAdminViewingSpecificStore = isAdmin && warehouse && warehouse !== "All Stores";
    
    if ((!isAdmin || isAdminViewingSpecificStore) && warehouse) {
      // Include records matching the warehouse OR records with no warehouse set (backward compat)
      whereClause[Op.or] = [
        { warehouse: warehouse },
        { warehouse: null },
        { warehouse: '' },
      ];
      console.log(`💰 Filtering vendor credits for warehouse: ${warehouse} (including unset)`);
    } else if (!isAdmin && userId) {
      whereClause.userId = userId;
    }
    // If admin viewing all warehouses, no warehouse filter - show all credits
    
    if (status) whereClause.status = status;
    
    const vendorCredits = await VendorCredit.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(vendorCredits.map(credit => credit.toJSON()));
  } catch (error) {
    console.error("Get vendor credits error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single vendor credit by ID
export const getVendorCreditById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorCredit = await VendorCredit.findByPk(id);
    
    if (!vendorCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    res.status(200).json(vendorCredit.toJSON());
  } catch (error) {
    console.error("Get vendor credit error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a vendor credit
export const updateVendorCredit = async (req, res) => {
  try {
    const { id } = req.params;
    const creditData = req.body;
    
    // Get existing credit to check status changes
    const existingCredit = await VendorCredit.findByPk(id);
    if (!existingCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    const oldStatus = existingCredit.status;
    const newStatus = creditData.status || oldStatus;
    const oldFinalTotal = parseFloat(existingCredit.finalTotal) || 0;
    const newFinalTotal = parseFloat(creditData.finalTotal) || oldFinalTotal;
    
    // Ensure items is an array
    if (creditData.items && !Array.isArray(creditData.items)) {
      creditData.items = [];
    }
    
    // Ensure discount is an object
    if (creditData.discount && typeof creditData.discount !== 'object') {
      creditData.discount = { value: '0', type: '%' };
    }
    
    // Check if creditNoteNumber is being changed and if it already exists
    if (creditData.creditNoteNumber) {
      const existingCreditByNumber = await VendorCredit.findOne({ 
        where: {
          creditNoteNumber: creditData.creditNoteNumber,
          userId: creditData.userId || req.body.userId || existingCredit.userId,
          id: { [Op.ne]: id } // Exclude current credit
        }
      });
      
      if (existingCreditByNumber) {
        return res.status(409).json({ 
          message: "Credit note number already exists",
          existingCredit: existingCreditByNumber.toJSON()
        });
      }
    }
    
    // Handle status changes and reversals
    // If changing from "open" to "draft", reverse stock and vendor balance
    if (oldStatus === "open" && newStatus === "draft") {
      const warehouseName = existingCredit.warehouse || "";
      // Reverse stock reduction (add stock back) - use addItemStock helper, add back to same warehouse
      if (existingCredit.items && Array.isArray(existingCredit.items)) {
        for (const item of existingCredit.items) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              // Add stock back to the same warehouse it was reduced from
              await addItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName, // Add back to the same warehouse
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
            } catch (error) {
              console.error(`Error reversing stock for item ${item.itemName}:`, error);
            }
          }
        }
      }
      
      // Reverse vendor balance (add payables back, reduce credits)
      if (existingCredit.vendorId) {
        await updateVendorBalance(existingCredit.vendorId, oldFinalTotal, 'subtract');
      }
    }
    
    // Helper function to check if there are items with quantities > 0
    const hasItemsWithQuantity = (items) => {
      if (!items || !Array.isArray(items) || items.length === 0) return false;
      return items.some(item => item.quantity && parseFloat(item.quantity) > 0);
    };
    
    // If changing from "draft" to "open", process the credit
    if (oldStatus === "draft" && newStatus === "open") {
      // Use default warehouse if not provided
      const warehouseName = creditData.warehouse?.trim() || existingCredit.warehouse?.trim() || "Warehouse";
      
      // Reduce stock for items - only from the selected warehouse
      // Stock reduction should happen if there are items with quantities > 0, regardless of finalTotal
      const itemsToProcess = creditData.items || existingCredit.items || [];
      if (hasItemsWithQuantity(itemsToProcess)) {
        const stockReductionErrors = [];
        
        for (const item of itemsToProcess) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              const result = await reduceItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName, // Pass the warehouse name
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
              if (!result.success) {
                stockReductionErrors.push(`Item ${item.itemName || item.itemId}: ${result.message}`);
              }
            } catch (error) {
              console.error(`Error reducing stock for item ${item.itemName}:`, error);
              stockReductionErrors.push(`Item ${item.itemName || item.itemId}: ${error.message}`);
            }
          }
        }
        
        // Log warnings but do NOT block saving - vendor credit is a financial document
        if (stockReductionErrors.length > 0) {
          console.warn(`   ⚠️ Some stock reductions failed when changing to open (non-blocking):`, stockReductionErrors);
        }
      } else {
        console.log(`   No items with quantities found - skipping stock reduction`);
      }
      
      // Update vendor balance
      // Only update vendor balance if finalTotal > 0
      const vendorId = creditData.vendorId || existingCredit.vendorId;
      if (vendorId && newFinalTotal > 0) {
        await updateVendorBalance(vendorId, newFinalTotal, 'add');
      }
      
      // Initialize unused credit if not already set
      if (!creditData.unusedCredit && !existingCredit.unusedCredit) {
        creditData.unusedCredit = newFinalTotal;
        creditData.appliedCredit = 0;
      }
    }
    
    // If status remains "open" but finalTotal changed, adjust vendor balance
    if (oldStatus === "open" && newStatus === "open" && oldFinalTotal !== newFinalTotal) {
      const difference = newFinalTotal - oldFinalTotal;
      const vendorId = creditData.vendorId || existingCredit.vendorId;
      if (vendorId) {
        if (difference > 0) {
          // Credit increased
          await updateVendorBalance(vendorId, difference, 'add');
        } else {
          // Credit decreased
          await updateVendorBalance(vendorId, Math.abs(difference), 'subtract');
        }
      }
      
      // Update unused credit proportionally
      const oldUnused = parseFloat(existingCredit.unusedCredit) || 0;
      if (oldUnused > 0) {
        const ratio = newFinalTotal / oldFinalTotal;
        creditData.unusedCredit = oldUnused * ratio;
        creditData.appliedCredit = newFinalTotal - (oldUnused * ratio);
      }
    }
    
    // Update the credit
    const [updatedRows] = await VendorCredit.update(creditData, {
      where: { id },
      returning: true,
    });
    
    if (updatedRows === 0) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    const vendorCredit = await VendorCredit.findByPk(id);
    console.log(`Vendor credit ${vendorCredit.creditNoteNumber} updated in PostgreSQL with ID: ${vendorCredit.id}`);
    res.status(200).json(vendorCredit.toJSON());
  } catch (error) {
    console.error("Update vendor credit error:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: "Credit note number already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a vendor credit
export const deleteVendorCredit = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the credit before deleting to reverse operations
    const vendorCredit = await VendorCredit.findByPk(id);
    if (!vendorCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    // If credit was "open", reverse stock and vendor balance
    if (vendorCredit.status === "open") {
      const finalTotal = parseFloat(vendorCredit.finalTotal) || 0;
      const warehouseName = vendorCredit.warehouse || "";
      
      // Reverse stock reduction (add stock back) - add back to same warehouse
      if (vendorCredit.items && Array.isArray(vendorCredit.items)) {
        for (const item of vendorCredit.items) {
          if (item.quantity && parseFloat(item.quantity) > 0) {
            try {
              // Add stock back to the same warehouse it was reduced from
              await addItemStock(
                item.itemId,
                parseFloat(item.quantity),
                warehouseName, // Add back to the same warehouse
                item.itemName,
                item.itemGroupId,
                item.itemSku
              );
            } catch (error) {
              console.error(`Error reversing stock for item ${item.itemName}:`, error);
            }
          }
        }
      }
      
      // Reverse vendor balance (add payables back, reduce credits)
      if (vendorCredit.vendorId) {
        await updateVendorBalance(vendorCredit.vendorId, finalTotal, 'subtract');
      }
    }
    
    const deletedRows = await VendorCredit.destroy({
      where: { id },
    });
    
    if (deletedRows === 0) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    res.status(200).json({ message: "Vendor credit deleted successfully" });
  } catch (error) {
    console.error("Delete vendor credit error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available unused vendor credits for a vendor
export const getAvailableVendorCredits = async (req, res) => {
  try {
    const { vendorId, userId } = req.query;
    
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    
    const whereClause = {
      vendorId: vendorId,
      status: "open",
    };
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    const credits = await VendorCredit.findAll({
      where: whereClause,
      order: [['creditDate', 'ASC']],
    });
    
    // Filter credits with unused amount > 0
    const availableCredits = credits
      .map(credit => credit.toJSON())
      .filter(credit => {
        const unused = parseFloat(credit.unusedCredit) || 0;
        return unused > 0;
      })
      .map(credit => ({
        id: credit.id,
        creditNoteNumber: credit.creditNoteNumber,
        creditDate: credit.creditDate,
        finalTotal: parseFloat(credit.finalTotal) || 0,
        unusedCredit: parseFloat(credit.unusedCredit) || 0,
        appliedCredit: parseFloat(credit.appliedCredit) || 0,
      }));
    
    res.status(200).json(availableCredits);
  } catch (error) {
    console.error("Get available vendor credits error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Apply vendor credit to a bill
export const applyCreditToBill = async (req, res) => {
  try {
    const { creditId, billId, appliedAmount } = req.body;
    
    if (!creditId || !billId || !appliedAmount) {
      return res.status(400).json({ message: "Credit ID, Bill ID, and applied amount are required" });
    }
    
    const amount = parseFloat(appliedAmount);
    if (amount <= 0) {
      return res.status(400).json({ message: "Applied amount must be greater than 0" });
    }
    
    // Get the vendor credit
    const vendorCredit = await VendorCredit.findByPk(creditId);
    if (!vendorCredit) {
      return res.status(404).json({ message: "Vendor credit not found" });
    }
    
    if (vendorCredit.status !== "open") {
      return res.status(400).json({ message: "Only open vendor credits can be applied to bills" });
    }
    
    const unusedCredit = parseFloat(vendorCredit.unusedCredit) || 0;
    if (amount > unusedCredit) {
      return res.status(400).json({ 
        message: `Applied amount (${amount}) exceeds unused credit (${unusedCredit})` 
      });
    }
    
    // Get the bill (MongoDB)
    const Bill = (await import("../model/Bill.js")).default;
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    // Update vendor credit
    const newUnusedCredit = unusedCredit - amount;
    const newAppliedCredit = (parseFloat(vendorCredit.appliedCredit) || 0) + amount;
    
    const appliedToBills = vendorCredit.appliedToBills || [];
    appliedToBills.push({
      billId: billId,
      billNumber: bill.billNumber,
      appliedAmount: amount,
      appliedDate: new Date(),
    });
    
    await VendorCredit.update({
      unusedCredit: newUnusedCredit,
      appliedCredit: newAppliedCredit,
      appliedToBills: appliedToBills,
    }, {
      where: { id: creditId },
    });
    
    // Update bill (reduce finalTotal by applied amount)
    const billFinalTotal = parseFloat(bill.finalTotal) || 0;
    const newBillTotal = Math.max(0, billFinalTotal - amount);
    bill.finalTotal = newBillTotal;
    
    // Store applied credits in bill (if field exists, or add to notes)
    if (!bill.appliedCredits) {
      bill.appliedCredits = [];
    }
    if (!Array.isArray(bill.appliedCredits)) {
      bill.appliedCredits = [];
    }
    bill.appliedCredits.push({
      creditId: creditId,
      creditNoteNumber: vendorCredit.creditNoteNumber,
      appliedAmount: amount,
      appliedDate: new Date(),
    });
    
    await bill.save();
    
    // Update vendor balance (reduce unused credits)
    if (vendorCredit.vendorId) {
      await updateVendorBalance(vendorCredit.vendorId, amount, 'subtract');
    }
    
    const updatedCredit = await VendorCredit.findByPk(creditId);
    res.status(200).json({
      message: "Credit applied to bill successfully",
      vendorCredit: updatedCredit.toJSON(),
      bill: bill,
    });
  } catch (error) {
    console.error("Apply credit to bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


