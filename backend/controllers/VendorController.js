// Pure MongoDB Vendor Controller
import Vendor from "../model/Vendor.js";
import VendorHistory from "../model/VendorHistory.js";
import mongoose from "mongoose";
import { logVendorActivity, getOriginatorName } from "../utils/vendorHistoryLogger.js";

const isValidObjectId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

// Helper to format vendor document for frontend
const formatVendor = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id ? obj._id.toString() : obj.id;
  return obj;
};

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

    const mongoVendorData = {
      salutation: vendorData.salutation || "",
      firstName: vendorData.firstName || "",
      lastName: vendorData.lastName || "",
      companyName: vendorData.companyName || "",
      displayName: vendorData.displayName,
      email: vendorData.email || "",
      phone: vendorData.phone || "",
      mobile: vendorData.mobile || "",
      vendorLanguage: vendorData.vendorLanguage || "",
      gstTreatment: vendorData.gstTreatment || "",
      sourceOfSupply: vendorData.sourceOfSupply || "",
      pan: vendorData.pan || vendorData.panNumber || "",
      gstin: vendorData.gstin || "",
      currency: vendorData.currency || "INR",
      paymentTerms: vendorData.paymentTerms || "",
      tds: vendorData.tds || "",
      enablePortal: vendorData.enablePortal === true,
      contacts: vendorData.contacts || [],
      billingAttention: vendorData.billingAttention || "",
      billingAddress: vendorData.billingAddress || "",
      billingAddress2: vendorData.billingAddress2 || "",
      billingCity: vendorData.billingCity || "",
      billingState: vendorData.billingState || "",
      billingPinCode: vendorData.billingPinCode || "",
      billingCountry: vendorData.billingCountry || "",
      billingPhone: vendorData.billingPhone || "",
      billingFax: vendorData.billingFax || "",
      shippingAttention: vendorData.shippingAttention || "",
      shippingAddress: vendorData.shippingAddress || "",
      shippingAddress2: vendorData.shippingAddress2 || "",
      shippingCity: vendorData.shippingCity || "",
      shippingState: vendorData.shippingState || "",
      shippingPinCode: vendorData.shippingPinCode || "",
      shippingCountry: vendorData.shippingCountry || "",
      shippingPhone: vendorData.shippingPhone || "",
      shippingFax: vendorData.shippingFax || "",
      bankAccounts: vendorData.bankAccounts || [],
      payables: parseFloat(vendorData.payables) || 0,
      credits: parseFloat(vendorData.credits) || 0,
      itemsToReceive: parseInt(vendorData.itemsToReceive) || 0,
      totalItemsOrdered: parseInt(vendorData.totalItemsOrdered) || 0,
      remarks: vendorData.remarks || "",
      userId: vendorData.userId,
      locCode: vendorData.locCode || "",
      isActive: vendorData.isActive !== false,
      status: vendorData.status || "active",
    };

    const vendor = await Vendor.create(mongoVendorData);
    const vendorObj = formatVendor(vendor);

    // Log vendor creation activity
    try {
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
        vendorId: vendorObj.id,
        eventType: "CONTACT_ADDED",
        title: "Contact added",
        description: description,
        originator: originator,
        relatedEntityId: vendorObj.id,
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
              vendorId: vendorObj.id,
              eventType: "CONTACT_PERSON_ADDED",
              title: "Contact person added",
              description: `Contact person ${contact.email} has been created by ${originator}`,
              originator: originator,
              relatedEntityId: vendorObj.id,
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
    } catch (logErr) {
      console.warn("Could not log vendor creation activity:", logErr.message);
    }

    res.status(201).json(vendorObj);
  } catch (error) {
    console.error("Create vendor error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Vendor already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all vendors for a user
export const getVendors = async (req, res) => {
  try {
    const { userId, userPower } = req.query;
    const isAdmin = userPower && (userPower.toLowerCase() === 'admin' || userPower.toLowerCase() === 'super_admin');

    const query = {};
    if (!isAdmin && userId) {
      query.userId = userId;
    }

    const vendors = await Vendor.find(query).sort({ createdAt: -1 });
    const formatted = vendors.map(formatVendor);

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Get vendors error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single vendor by ID
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    let vendor = null;
    if (isValidObjectId(id)) {
      vendor = await Vendor.findById(id);
    }
    if (!vendor) {
      vendor = await Vendor.findOne({ id: id });
    }

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json(formatVendor(vendor));
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

    if (vendorData.contacts && !Array.isArray(vendorData.contacts)) {
      vendorData.contacts = [];
    }
    if (vendorData.bankAccounts && !Array.isArray(vendorData.bankAccounts)) {
      vendorData.bankAccounts = [];
    }

    let existingVendor = null;
    if (isValidObjectId(id)) {
      existingVendor = await Vendor.findById(id);
    }
    if (!existingVendor) {
      existingVendor = await Vendor.findOne({ id: id });
    }

    if (!existingVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const existingVendorJson = formatVendor(existingVendor);

    const updatedVendor = await Vendor.findByIdAndUpdate(
      existingVendor._id,
      { $set: vendorData },
      { new: true, runValidators: true }
    );

    const vendorJson = formatVendor(updatedVendor);

    const originator = getOriginatorName(
      null,
      null,
      { locName: vendorData.locCode || existingVendorJson.locCode || "" }
    );

    // Helper to detect changes
    const detectChanges = (oldData, newData, incoming) => {
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

      const updatedFields = Object.keys(incoming).filter(key =>
        key !== 'contacts' &&
        key !== 'bankAccounts' &&
        key !== 'id' &&
        key !== '_id' &&
        key !== 'userId' &&
        key !== 'createdAt' &&
        key !== 'updatedAt'
      );

      fieldsToTrack.forEach(field => {
        if (updatedFields.includes(field.key)) {
          const oldVal = String(oldData[field.key] || '').trim();
          const newVal = String(incoming[field.key] || '').trim();

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

    try {
      const changes = detectChanges(existingVendorJson, vendorJson, vendorData);

      if (changes.length > 0) {
        const description = changes.length > 3
          ? `Contact updated (${changes.length} changes) by ${originator}`
          : `Contact updated: ${changes.slice(0, 3).join(', ')}${changes.length > 3 ? ` and ${changes.length - 3} more` : ''} by ${originator}`;

        await logVendorActivity({
          vendorId: vendorJson.id,
          eventType: "VENDOR_UPDATED",
          title: "Contact updated",
          description: description,
          originator: originator,
          relatedEntityId: vendorJson.id,
          relatedEntityType: "vendor",
          metadata: {
            changes: changes,
            updatedFields: Object.keys(vendorData),
          },
          changedBy: vendorData.userId || existingVendorJson.userId || "",
        });
      }

      if (vendorData.contacts && Array.isArray(vendorData.contacts)) {
        const existingContacts = existingVendorJson?.contacts || [];
        const existingEmails = new Set(existingContacts.map(c => c.email).filter(Boolean));

        for (const contact of vendorData.contacts) {
          if (contact.email && !existingEmails.has(contact.email)) {
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
              changedBy: vendorData.userId || existingVendorJson.userId || "",
            });
          }
        }
      }
    } catch (logErr) {
      console.warn("Could not log vendor update activity:", logErr.message);
    }

    res.status(200).json(vendorJson);
  } catch (error) {
    console.error("Update vendor error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a vendor
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    let targetId = id;
    if (!isValidObjectId(id)) {
      const v = await Vendor.findOne({ id: id });
      if (v) targetId = v._id;
    }

    // Delete associated VendorHistory records
    await VendorHistory.deleteMany({
      $or: [{ vendorId: id }, { vendorId: targetId.toString() }]
    });

    const deleted = await Vendor.findByIdAndDelete(targetId);

    if (!deleted) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
