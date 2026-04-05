// Use PostgreSQL VendorHistory model
import { VendorHistory } from "../models/sequelize/index.js";
// Also import MongoDB model for dual-save
import MongoVendorHistory from "../model/VendorHistory.js";

/**
 * Log vendor activity to history
 * @param {Object} params - History parameters
 * @param {String} params.vendorId - Vendor ID (UUID)
 * @param {String} params.eventType - Type of event (BILL_ADDED, BILL_UPDATED, etc.)
 * @param {String} params.title - Event title
 * @param {String} params.description - Event description
 * @param {String} params.originator - Who performed the action (warehouse/branch name or user)
 * @param {String} params.relatedEntityId - Related entity ID (bill ID, etc.)
 * @param {String} params.relatedEntityType - Type of related entity (bill, contact_person, etc.)
 * @param {Object} params.metadata - Additional metadata
 * @param {String} params.changedBy - User who made the change
 */
export const logVendorActivity = async ({
  vendorId,
  eventType,
  title,
  description,
  originator = "System",
  relatedEntityId = null,
  relatedEntityType = null,
  metadata = {},
  changedBy = "",
}) => {
  try {
    if (!vendorId) {
      console.warn("Cannot log vendor activity: vendorId is required");
      return;
    }

    const historyEntry = {
      vendorId,
      eventType,
      title,
      description,
      originator,
      relatedEntityId,
      relatedEntityType,
      metadata,
      changedBy,
      changedAt: new Date(),
    };

    const pgHistory = await VendorHistory.create(historyEntry);
    console.log(`✅ Logged vendor activity: ${eventType} for vendor ${vendorId}`);
    
    // DUAL-SAVE: Also save to MongoDB for safety/redundancy
    try {
      console.log(`💾 Dual-saving vendor history to MongoDB for safety...`);
      
      const mongoHistoryEntry = {
        vendorId,
        eventType,
        title,
        description,
        originator,
        relatedEntityId,
        relatedEntityType,
        metadata,
        changedBy,
        changedAt: historyEntry.changedAt,
        // Add PostgreSQL ID as reference
        postgresqlId: pgHistory.id,
      };
      
      await MongoVendorHistory.create(mongoHistoryEntry);
      console.log(`✅ Successfully saved vendor history to MongoDB`);
    } catch (mongoError) {
      console.error(`⚠️  Failed to save vendor history to MongoDB (PostgreSQL save was successful):`, mongoError);
      // Don't fail the entire operation if MongoDB save fails
    }
  } catch (error) {
    console.error("Error logging vendor activity:", error);
    // Don't throw - history logging should not break the main operation
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  if (!value && value !== 0) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace("₹", "₹")
    .replace(/\s/g, "");
};

/**
 * Helper to get originator name from bill or user
 */
export const getOriginatorName = (warehouse, branch, user) => {
  // Try warehouse first, then branch, then user location, then default
  if (warehouse && warehouse.trim()) {
    return warehouse.trim();
  }
  if (branch && branch.trim()) {
    return branch.trim();
  }
  if (user?.locName) {
    return user.locName;
  }
  return "Warehouse";
};
