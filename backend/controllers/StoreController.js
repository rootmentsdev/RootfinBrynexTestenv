import Store from "../model/Store.js";
// Import PostgreSQL model for dual-save
import { Store as PgStore } from "../models/sequelize/index.js";
import mongoose from "mongoose";

// Create a new store
export const createStore = async (req, res) => {
  try {
    const storeData = req.body;
    
    // Validate required fields
    if (!storeData.name || !storeData.locCode) {
      return res.status(400).json({ 
        message: "Store name and location code (locCode) are required" 
      });
    }
    
    // Remove empty email if provided to avoid validation issues
    if (storeData.email === '' || !storeData.email) {
      delete storeData.email; // Let it use the default empty string
    }
    
    const store = await Store.create(storeData);
    
    // DUAL-SAVE: Also save to PostgreSQL for safety/redundancy
    try {
      console.log(`💾 Dual-saving store to PostgreSQL for safety...`);
      
      const pgStoreData = {
        name: storeData.name,
        locCode: storeData.locCode,
        address: storeData.address || "",
        city: storeData.city || "",
        state: storeData.state || "",
        pincode: storeData.pincode || "",
        phone: storeData.phone || "",
        email: storeData.email || "",
        isActive: storeData.isActive !== false,
        userId: storeData.userId || "",
        mongoId: store._id.toString(),
      };
      
      await PgStore.create(pgStoreData);
      console.log(`✅ Successfully saved store to PostgreSQL`);
    } catch (pgError) {
      console.error(`⚠️  Failed to save store to PostgreSQL (MongoDB save was successful):`, pgError);
      // Don't fail the entire operation if PostgreSQL save fails
    }
    
    // Convert to object and ensure id field is available
    const storeObj = store.toObject();
    storeObj.id = storeObj._id.toString();
    
    res.status(201).json({
      message: "Store created successfully",
      store: storeObj,
    });
  } catch (error) {
    console.error("Create store error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Store with this location code already exists" 
      });
    }
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ 
        message: "Validation error", 
        errors: validationErrors 
      });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all stores
export const getStores = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    const stores = await Store.find(filter).sort({ name: 1 });
    
    res.status(200).json({
      message: "Stores retrieved successfully",
      stores: stores.map(store => store.toObject()),
    });
  } catch (error) {
    console.error("Get stores error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get store by ID
export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }
    
    const store = await Store.findById(id);
    
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    
    res.status(200).json({
      message: "Store retrieved successfully",
      store: store.toObject(),
    });
  } catch (error) {
    console.error("Get store by ID error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get store by location code
export const getStoreByLocCode = async (req, res) => {
  try {
    const { locCode } = req.params;
    
    const store = await Store.findOne({ locCode });
    
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    
    // Convert to object and ensure id field is available
    const storeObj = store.toObject();
    storeObj.id = storeObj._id.toString();
    
    res.status(200).json({
      message: "Store retrieved successfully",
      store: storeObj,
    });
  } catch (error) {
    console.error("Get store by locCode error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update store
export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }
    
    const store = await Store.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    });
    
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    
    // DUAL-SAVE: Also update in PostgreSQL for safety/redundancy
    try {
      console.log(`💾 Dual-updating store in PostgreSQL for safety...`);
      
      // Find PostgreSQL record by mongoId
      const pgStore = await PgStore.findOne({
        where: { mongoId: store._id.toString() }
      });
      
      if (pgStore) {
        // Prepare update data for PostgreSQL
        const pgUpdateData = {
          name: updateData.name || store.name,
          locCode: updateData.locCode || store.locCode,
          address: updateData.address || store.address,
          city: updateData.city || store.city,
          state: updateData.state || store.state,
          pincode: updateData.pincode || store.pincode,
          phone: updateData.phone || store.phone,
          email: updateData.email || store.email,
          isActive: updateData.isActive !== undefined ? updateData.isActive : store.isActive,
          userId: updateData.userId || store.userId,
        };
        
        await pgStore.update(pgUpdateData);
        console.log(`✅ Successfully updated store in PostgreSQL`);
      } else {
        console.log(`⚠️  PostgreSQL record not found for mongoId: ${store._id}`);
      }
    } catch (pgError) {
      console.error(`⚠️  Failed to update store in PostgreSQL (MongoDB update was successful):`, pgError);
      // Don't fail the entire operation if PostgreSQL update fails
    }
    
    res.status(200).json({
      message: "Store updated successfully",
      store: store.toObject(),
    });
  } catch (error) {
    console.error("Update store error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Store with this location code already exists" 
      });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete store (soft delete by setting isActive to false)
export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }
    
    const store = await Store.findByIdAndUpdate(id, { isActive: false }, { new: true });
    
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    
    // DUAL-SAVE: Also update in PostgreSQL for safety/redundancy
    try {
      console.log(`💾 Dual-updating store (soft delete) in PostgreSQL for safety...`);
      
      // Find PostgreSQL record by mongoId
      const pgStore = await PgStore.findOne({
        where: { mongoId: store._id.toString() }
      });
      
      if (pgStore) {
        await pgStore.update({ isActive: false });
        console.log(`✅ Successfully soft deleted store in PostgreSQL`);
      } else {
        console.log(`⚠️  PostgreSQL record not found for mongoId: ${store._id}`);
      }
    } catch (pgError) {
      console.error(`⚠️  Failed to soft delete store in PostgreSQL (MongoDB update was successful):`, pgError);
      // Don't fail the entire operation if PostgreSQL update fails
    }
    
    res.status(200).json({
      message: "Store deleted successfully",
    });
  } catch (error) {
    console.error("Delete store error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
