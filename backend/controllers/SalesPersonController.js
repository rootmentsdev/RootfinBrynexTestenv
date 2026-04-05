import SalesPerson from "../model/SalesPerson.js";
import Store from "../model/Store.js";
// Import PostgreSQL models for dual-save
import { SalesPerson as PgSalesPerson, Store as PgStore } from "../models/sequelize/index.js";
import mongoose from "mongoose";

// Create a new sales person
export const createSalesPerson = async (req, res) => {
  try {
    const salesPersonData = req.body;
    
    // Validate required fields - only firstName, employeeId, and storeId
    if (!salesPersonData.firstName || !salesPersonData.employeeId || !salesPersonData.storeId) {
      return res.status(400).json({ 
        message: "First name, employee ID, and store ID are required" 
      });
    }
    
    // Set default values for optional fields
    if (!salesPersonData.lastName) {
      salesPersonData.lastName = "-";
    }
    if (!salesPersonData.phone) {
      salesPersonData.phone = "0000000000";
    }
    if (!salesPersonData.email) {
      salesPersonData.email = `${salesPersonData.employeeId}@placeholder.com`;
    }
    
    // Verify store exists and get locCode
    if (!mongoose.Types.ObjectId.isValid(salesPersonData.storeId)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }
    
    const store = await Store.findById(salesPersonData.storeId);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    
    // Set locCode from store
    salesPersonData.locCode = store.locCode;
    
    const salesPerson = await SalesPerson.create(salesPersonData);
    
    // DUAL-SAVE: Also save to PostgreSQL for safety/redundancy
    try {
      console.log(`💾 Dual-saving sales person to PostgreSQL for safety...`);
      
      // Find corresponding PostgreSQL store by locCode
      const pgStore = await PgStore.findOne({
        where: { locCode: store.locCode }
      });
      
      const pgSalesPersonData = {
        firstName: salesPersonData.firstName,
        lastName: salesPersonData.lastName || "-",
        employeeId: salesPersonData.employeeId,
        email: salesPersonData.email,
        phone: salesPersonData.phone || "0000000000",
        storeId: pgStore ? pgStore.id : null,
        isActive: salesPersonData.isActive !== false,
        userId: salesPersonData.userId || "",
        createdBy: salesPersonData.createdBy || "",
        mongoId: salesPerson._id.toString(),
      };
      
      await PgSalesPerson.create(pgSalesPersonData);
      console.log(`✅ Successfully saved sales person to PostgreSQL`);
    } catch (mongoError) {
      console.error(`⚠️  Failed to save sales person to PostgreSQL (MongoDB save was successful):`, mongoError);
      // Don't fail the entire operation if PostgreSQL save fails
    }
    
    // Populate store information in response
    const salesPersonWithStore = await SalesPerson.findById(salesPerson._id).populate('storeId');
    
    res.status(201).json({
      message: "Sales person created successfully",
      salesPerson: salesPersonWithStore.toObject(),
    });
  } catch (error) {
    console.error("Create sales person error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Sales person with this employee ID already exists" 
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

// Get all sales persons (optionally filtered by store)
export const getSalesPersons = async (req, res) => {
  try {
    const { storeId, locCode, isActive } = req.query;
    
    const filter = {};
    
    // Filter by storeId if provided
    if (storeId) {
      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({ message: "Invalid store ID" });
      }
      filter.storeId = storeId;
    }
    
    // Filter by location code if provided
    if (locCode) {
      filter.locCode = locCode;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    const salesPersons = await SalesPerson.find(filter)
      .populate('storeId')
      .sort({ firstName: 1, lastName: 1 });
    
    res.status(200).json({
      message: "Sales persons retrieved successfully",
      salesPersons: salesPersons.map(sp => sp.toObject()),
    });
  } catch (error) {
    console.error("Get sales persons error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get sales persons by location code (e.g., Edapally)
export const getSalesPersonsByLocCode = async (req, res) => {
  try {
    const { locCode } = req.params;
    const { isActive } = req.query;
    
    // First, find the store by location code
    const store = await Store.findOne({ locCode });
    
    if (!store) {
      return res.status(404).json({ 
        message: `Store with location code "${locCode}" not found` 
      });
    }
    
    const filter = { storeId: store._id };
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    const salesPersons = await SalesPerson.find(filter)
      .populate('storeId')
      .sort({ firstName: 1, lastName: 1 });
    
    res.status(200).json({
      message: `Sales persons for ${store.name} (${locCode}) retrieved successfully`,
      store: {
        id: store._id,
        name: store.name,
        locCode: store.locCode,
      },
      salesPersons: salesPersons.map(sp => sp.toObject()),
    });
  } catch (error) {
    console.error("Get sales persons by locCode error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get sales person by ID
export const getSalesPersonById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid sales person ID" });
    }
    
    const salesPerson = await SalesPerson.findById(id).populate('storeId');
    
    if (!salesPerson) {
      return res.status(404).json({ message: "Sales person not found" });
    }
    
    res.status(200).json({
      message: "Sales person retrieved successfully",
      salesPerson: salesPerson.toObject(),
    });
  } catch (error) {
    console.error("Get sales person by ID error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update sales person
export const updateSalesPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid sales person ID" });
    }
    
    // If storeId is being updated, verify the store exists and update locCode
    if (updateData.storeId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.storeId)) {
        return res.status(400).json({ message: "Invalid store ID" });
      }
      
      const store = await Store.findById(updateData.storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      // Update locCode when store changes
      updateData.locCode = store.locCode;
    }
    
    const salesPerson = await SalesPerson.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    }).populate('storeId');
    
    if (!salesPerson) {
      return res.status(404).json({ message: "Sales person not found" });
    }
    
    // DUAL-SAVE: Also update in PostgreSQL for safety/redundancy
    try {
      console.log(`💾 Dual-updating sales person in PostgreSQL for safety...`);
      
      // Find PostgreSQL record by mongoId
      const pgSalesPerson = await PgSalesPerson.findOne({
        where: { mongoId: salesPerson._id.toString() }
      });
      
      if (pgSalesPerson) {
        // Prepare update data for PostgreSQL
        const pgUpdateData = {
          firstName: updateData.firstName || salesPerson.firstName,
          lastName: updateData.lastName || salesPerson.lastName,
          employeeId: updateData.employeeId || salesPerson.employeeId,
          email: updateData.email || salesPerson.email,
          phone: updateData.phone || salesPerson.phone,
          isActive: updateData.isActive !== undefined ? updateData.isActive : salesPerson.isActive,
          userId: updateData.userId || salesPerson.userId,
        };
        
        // If storeId changed, find corresponding PostgreSQL store
        if (updateData.storeId && salesPerson.storeId) {
          const pgStore = await PgStore.findOne({
            where: { locCode: salesPerson.storeId.locCode }
          });
          if (pgStore) {
            pgUpdateData.storeId = pgStore.id;
          }
        }
        
        await pgSalesPerson.update(pgUpdateData);
        console.log(`✅ Successfully updated sales person in PostgreSQL`);
      } else {
        console.log(`⚠️  PostgreSQL record not found for mongoId: ${salesPerson._id}`);
      }
    } catch (pgError) {
      console.error(`⚠️  Failed to update sales person in PostgreSQL (MongoDB update was successful):`, pgError);
      // Don't fail the entire operation if PostgreSQL update fails
    }
    
    res.status(200).json({
      message: "Sales person updated successfully",
      salesPerson: salesPerson.toObject(),
    });
  } catch (error) {
    console.error("Update sales person error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Sales person with this employee ID already exists" 
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

// Delete sales person (soft delete by setting isActive to false)
export const deleteSalesPerson = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid sales person ID" });
    }
    
    const salesPerson = await SalesPerson.findByIdAndUpdate(id, { isActive: false }, { new: true });
    
    if (!salesPerson) {
      return res.status(404).json({ message: "Sales person not found" });
    }
    
    // DUAL-SAVE: Also update in PostgreSQL for safety/redundancy
    try {
      console.log(`💾 Dual-updating sales person (soft delete) in PostgreSQL for safety...`);
      
      // Find PostgreSQL record by mongoId
      const pgSalesPerson = await PgSalesPerson.findOne({
        where: { mongoId: salesPerson._id.toString() }
      });
      
      if (pgSalesPerson) {
        await pgSalesPerson.update({ isActive: false });
        console.log(`✅ Successfully soft deleted sales person in PostgreSQL`);
      } else {
        console.log(`⚠️  PostgreSQL record not found for mongoId: ${salesPerson._id}`);
      }
    } catch (pgError) {
      console.error(`⚠️  Failed to soft delete sales person in PostgreSQL (MongoDB update was successful):`, pgError);
      // Don't fail the entire operation if PostgreSQL update fails
    }
    
    res.status(200).json({
      message: "Sales person deleted successfully",
    });
  } catch (error) {
    console.error("Delete sales person error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
