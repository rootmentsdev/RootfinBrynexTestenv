// Updated to use PostgreSQL (Sequelize) instead of MongoDB
import { Vendor, VendorHistory } from "../models/sequelize/index.js";
// Import MongoDB model for dual-save
import MongoVendor from "../model/Vendor.js";
import { randomUUID } from 'crypto';
import { logVendorActivity, getOriginatorName } from "../utils/vendorHistoryLogger.js";

// Create a new vendor
export const createVendor = async (req, res) => {
  try {
    const vendorData = req.body;

    // Validate required fields
    if (!vendorData.displayName || !vendorData.userId) {
      return res.status(400).json({ message: "Display name and userId are required" });
    }

    // Ensure contacts and bankAccounts are arrays
    if (vendorData.contacts && !Array.isArray(vendorData.contacts)) {
      vendorData.contacts = [];
    }
    if (vendorData.bankAccounts && !Array.isArray(vendorData.bankAccounts)) {
      vendorData.bankAccounts = [];
    }

    // Generate UUID for new vendors if id not provided
    if (!vendorData.id) {
      vendorData.id = randomUUID();
    }

    const vendor = await Vendor.create(vendorData);
    const vendorJson = vendor.toJSON();

    // DUAL-SAVE: Also save to MongoDB for safety/redundancy
    try {
      console.log(`💾 Dual-saving vendor to MongoDB for safety...`);
      
      const mongoVendorData = {
        salutation: vendorData.salutation,
        firstName: vendorData.firstName,
        lastName: vendorData.lastName,
        companyName: vendorData.companyName,
        displayName: vendorData.displayName,
        email: vendorData.email,
        phone: vendorData.phone,
        mobile: vendorData.mobile,
        website: vendorData.website,
        gstTreatment: vendorData.gstTreatment,
        gstin: vendorData.gstin,
        panNumber: vendorData.panNumber,
        paymentTerms: vendorData.paymentTerms,
        currency: vendorData.currency,
        openingBalance: vendorData.openingBalance || 0,
        isActive: vendorData.isActive !== false,
        userId: vendorData.userId,
        postgresqlId: vendor.id,
        // Add other fields as needed
        contacts: vendorData.contacts || [],
        bankAccounts: vendorData.bankAccounts || [],
      };
      
      await MongoVendor.create(mongoVendorData);
      console.log(`✅ Successfully saved vendor to MongoDB`);
    } catch (mongoError) {
      console.error(`⚠️  Failed to save vendor to MongoDB (PostgreSQL save was successful):`, mongoError);
      // Don't fail the entire operation if MongoDB save fails
    }

    // Log vendor creation activity
    if (vendorJson.id) {
      const originator = getOriginatorName(
        null,
        null,
        { locName: vendorData.locCode || "" }
      );

      let description = "Contact created";
      if (vendorData.gstTreatment || vendorData.gstin) {
        const gstTreatment = vendorData.gstTreatment || "";
        const gstin = vendorData.gstin || "";
        const state = vendorData.sourceOfSupply || "";
        description = `Contact created with GST Treatment '${gstTreatment}'${gstin ? ` & GSTIN '${gstin}'` : ""}${state ? `. State updated to ${state}.` : "."} by ${originator}`;
      } else {
        description = `Contact created by ${originator}`;
      }

      await logVendorActivity({
        vendorId: vendorJson.id,
        eventType: "CONTACT_ADDED",
        title: "Contact added",
        description: description,
        originator: originator,
        relatedEntityId: vendorJson.id,
        relatedEntityType: "vendor",
        metadata: {
          gstTreatment: vendorData.gstTreatment,
          gstin: vendorData.gstin,
          sourceOfSupply: vendorData.sourceOfSupply,
        },
        changedBy: vendorData.userId || "",
      });

      // Log contact person addition if contacts exist
      if (vendorData.contacts && Array.isArray(vendorData.contacts) && vendorData.contacts.length > 0) {
        for (const contact of vendorData.contacts) {
          if (contact.email) {
            await logVendorActivity({
              vendorId: vendorJson.id,
              eventType: "CONTACT_PERSON_ADDED",
              title: "Contact person added",
              description: `Contact person ${contact.email} has been created by ${originator}`,
              originator: originator,
              relatedEntityId: vendorJson.id,
              relatedEntityType: "contact_person",
              metadata: {
                email: contact.email,
                firstName: contact.firstName,
                lastName: contact.lastName,
              },
              changedBy: vendorData.userId || "",
            });
          }
        }
      }
    }

    res.status(201).json(vendorJson);
  } catch (error) {
    console.error("Create vendor error:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: "Vendor already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all vendors for a user
export const getVendors = async (req, res) => {
  try {
    const { userId, userPower } = req.query;

    const whereClause = {};

    // Filter by user email only - admin users see all data
    const isAdmin = userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin');

    if (!isAdmin && userId) {
      whereClause.userId = userId;
    }
    // If admin, no userId filter - show all vendors

    const vendors = await Vendor.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(vendors.map(vendor => vendor.toJSON()));
  } catch (error) {
    console.error("Get vendors error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single vendor by ID
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json(vendor.toJSON());
  } catch (error) {
    console.error("Get vendor error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a vendor
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorData = req.body;
    console.log(`Updating vendor ${id}:`, JSON.stringify(vendorData, null, 2));

    // Get existing vendor BEFORE update to compare changes
    const existingVendor = await Vendor.findByPk(id);
    if (!existingVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    const existingVendorJson = existingVendor.toJSON();

    // Ensure contacts and bankAccounts are arrays if provided
    if (vendorData.contacts && !Array.isArray(vendorData.contacts)) {
      vendorData.contacts = [];
    }
    if (vendorData.bankAccounts && !Array.isArray(vendorData.bankAccounts)) {
      vendorData.bankAccounts = [];
    }

    // Update the vendor
    const [updatedRows] = await Vendor.update(vendorData, {
      where: { id },
      returning: true,
    });

    if (updatedRows === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Fetch updated vendor to get new values
    const vendor = await Vendor.findByPk(id);
    const vendorJson = vendor.toJSON();

    const originator = getOriginatorName(
      null,
      null,
      { locName: vendorData.locCode || existingVendorJson.locCode || "" }
    );

    // Helper function to detect changes
    const detectChanges = (oldData, newData, vendorData) => {
      const changes = [];
      const fieldsToTrack = [
        { key: 'displayName', label: 'Display Name' },
        { key: 'companyName', label: 'Company Name' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'gstTreatment', label: 'GST Treatment' },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'pan', label: 'PAN' },
        { key: 'sourceOfSupply', label: 'Source of Supply' },
        { key: 'currency', label: 'Currency' },
        { key: 'paymentTerms', label: 'Payment Terms' },
        { key: 'billingAddress', label: 'Billing Address' },
        { key: 'billingCity', label: 'Billing City' },
        { key: 'billingState', label: 'Billing State' },
        { key: 'billingPinCode', label: 'Billing Pin Code' },
        { key: 'shippingAddress', label: 'Shipping Address' },
        { key: 'shippingCity', label: 'Shipping City' },
        { key: 'shippingState', label: 'Shipping State' },
        { key: 'shippingPinCode', label: 'Shipping Pin Code' },
        { key: 'isActive', label: 'Is Active' },
        { key: 'status', label: 'Status' },
      ];

      // Check only fields that were actually provided in the update
      const updatedFields = Object.keys(vendorData).filter(key =>
        key !== 'contacts' &&
        key !== 'bankAccounts' &&
        key !== 'id' &&
        key !== 'userId' &&
        key !== 'createdAt' &&
        key !== 'updatedAt'
      );

      fieldsToTrack.forEach(field => {
        // Only check if this field was in the update request
        if (updatedFields.includes(field.key)) {
          const oldVal = String(oldData[field.key] || '').trim();
          const newVal = String(vendorData[field.key] || '').trim();

          if (oldVal !== newVal) {
            if (newVal) {
              changes.push(`${field.label} updated to '${newVal}'`);
            } else if (oldVal) {
              changes.push(`${field.label} removed`);
            }
          }
        }
      });

      return changes;
    };

    // Detect changes (only check fields that were actually updated)
    const changes = detectChanges(existingVendorJson, vendorJson, vendorData);

    // Log vendor update activity if there are changes
    if (changes.length > 0) {
      const description = changes.length > 3
        ? `Contact updated (${changes.length} changes) by ${originator}`
        : `Contact updated: ${changes.slice(0, 3).join(', ')}${changes.length > 3 ? ` and ${changes.length - 3} more` : ''} by ${originator}`;

      await logVendorActivity({
        vendorId: id,
        eventType: "VENDOR_UPDATED",
        title: "Contact updated",
        description: description,
        originator: originator,
        relatedEntityId: id,
        relatedEntityType: "vendor",
        metadata: {
          changes: changes,
          updatedFields: Object.keys(vendorData),
        },
        changedBy: vendorData.userId || existingVendorJson.userId || "",
      });
    }

    // Log contact person additions
    if (vendorData.contacts && Array.isArray(vendorData.contacts)) {
      const existingContacts = existingVendorJson?.contacts || [];
      const existingEmails = new Set(existingContacts.map(c => c.email).filter(Boolean));

      // Log new contact persons
      for (const contact of vendorData.contacts) {
        if (contact.email && !existingEmails.has(contact.email)) {
          await logVendorActivity({
            vendorId: id,
            eventType: "CONTACT_PERSON_ADDED",
            title: "Contact person added",
            description: `Contact person ${contact.email} has been created by ${originator}`,
            originator: originator,
            relatedEntityId: id,
            relatedEntityType: "contact_person",
            metadata: {
              email: contact.email,
              firstName: contact.firstName,
              lastName: contact.lastName,
            },
            changedBy: vendorData.userId || existingVendorJson.userId || "",
          });
        }
      }
    }

    res.status(200).json(vendorJson);
    
    // DUAL-SAVE: Also update in MongoDB for safety/redundancy
    try {
      console.log(`💾 Dual-updating vendor in MongoDB for safety...`);
      
      // Find MongoDB record by PostgreSQL ID
      const mongoVendor = await MongoVendor.findOne({
        postgresqlId: id
      });
      
      if (mongoVendor) {
        // Prepare update data for MongoDB
        const mongoUpdateData = {
          displayName: vendorData.displayName || vendorJson.displayName,
          companyName: vendorData.companyName || vendorJson.companyName,
          firstName: vendorData.firstName || vendorJson.firstName,
          lastName: vendorData.lastName || vendorJson.lastName,
          email: vendorData.email || vendorJson.email,
          phone: vendorData.phone || vendorJson.phone,
          mobile: vendorData.mobile || vendorJson.mobile,
          gstTreatment: vendorData.gstTreatment || vendorJson.gstTreatment,
          gstin: vendorData.gstin || vendorJson.gstin,
          pan: vendorData.pan || vendorJson.pan,
          sourceOfSupply: vendorData.sourceOfSupply || vendorJson.sourceOfSupply,
          currency: vendorData.currency || vendorJson.currency,
          paymentTerms: vendorData.paymentTerms || vendorJson.paymentTerms,
          billingAddress: vendorData.billingAddress || vendorJson.billingAddress,
          billingCity: vendorData.billingCity || vendorJson.billingCity,
          billingState: vendorData.billingState || vendorJson.billingState,
          billingPinCode: vendorData.billingPinCode || vendorJson.billingPinCode,
          shippingAddress: vendorData.shippingAddress || vendorJson.shippingAddress,
          shippingCity: vendorData.shippingCity || vendorJson.shippingCity,
          shippingState: vendorData.shippingState || vendorJson.shippingState,
          shippingPinCode: vendorData.shippingPinCode || vendorJson.shippingPinCode,
          isActive: vendorData.isActive !== undefined ? vendorData.isActive : vendorJson.isActive,
          status: vendorData.status || vendorJson.status,
          contacts: vendorData.contacts || vendorJson.contacts || [],
          bankAccounts: vendorData.bankAccounts || vendorJson.bankAccounts || [],
          userId: vendorData.userId || vendorJson.userId,
        };
        
        await mongoVendor.updateOne(mongoUpdateData);
        console.log(`✅ Successfully updated vendor in MongoDB`);
      } else {
        console.log(`⚠️  MongoDB record not found for PostgreSQL ID: ${id}`);
      }
    } catch (mongoError) {
      console.error(`⚠️  Failed to update vendor in MongoDB (PostgreSQL update was successful):`, mongoError);
      // Don't fail the entire operation if MongoDB update fails
    }
  } catch (error) {
    console.error("Update vendor error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a vendor
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete associated VendorHistory records first (required due to foreign key constraint)
    await VendorHistory.destroy({
      where: { vendorId: id }
    });

    // 2. Delete the vendor
    const deletedRows = await Vendor.destroy({
      where: { id },
    });

    if (deletedRows === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // DUAL-DELETE: Also delete from MongoDB for consistency
    try {
      console.log(`💾 Dual-deleting vendor from MongoDB for consistency...`);
      
      // Delete vendor history records from MongoDB
      const mongoHistoryResult = await MongoVendorHistory.deleteMany({
        vendorId: id
      });
      console.log(`✅ Deleted ${mongoHistoryResult.deletedCount} vendor history records from MongoDB`);
      
      // Delete vendor from MongoDB
      const mongoVendorResult = await MongoVendor.deleteOne({
        postgresqlId: id
      });
      
      if (mongoVendorResult.deletedCount > 0) {
        console.log(`✅ Successfully deleted vendor from MongoDB`);
      } else {
        console.log(`⚠️  No matching vendor found in MongoDB to delete`);
      }
    } catch (mongoError) {
      console.error(`⚠️  Failed to delete vendor from MongoDB (PostgreSQL delete was successful):`, mongoError);
      // Don't fail the entire operation if MongoDB delete fails
    }

    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

