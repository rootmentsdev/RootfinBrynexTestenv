import mongoose from "mongoose";

const ShoeItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["goods", "service"],
      default: "goods",
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["shirt", "shoe", "other"],
      default: "other",
      trim: true,
    },
    returnable: {
      type: Boolean,
      default: false,
    },
  sellable: {
    type: Boolean,
    default: true,
  },
  purchasable: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
    taxPreference: {
      type: String,
      enum: ["taxable", "non-taxable"],
      default: "taxable",
    },
    dimensions: {
      type: String,
      trim: true,
    },
    weight: {
      type: String,
      trim: true,
    },
    upc: {
      type: String,
      trim: true,
    },
    mpn: {
      type: String,
      trim: true,
    },
    ean: {
      type: String,
      trim: true,
    },
    isbn: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    inventoryValuationMethod: {
      type: String,
      trim: true,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    salesAccount: {
      type: String,
      trim: true,
    },
    salesDescription: {
      type: String,
      trim: true,
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    costAccount: {
      type: String,
      trim: true,
    },
    preferredVendor: {
      type: String,
      trim: true,
    },
    purchaseDescription: {
      type: String,
      trim: true,
    },
    taxRateIntra: {
      type: String,
      trim: true,
    },
    taxRateInter: {
      type: String,
      trim: true,
    },
    trackInventory: {
      type: Boolean,
      default: false,
    },
    trackBin: {
      type: Boolean,
      default: false,
    },
    trackingMethod: {
      type: String,
      enum: ["none", "serial", "batch"],
      default: "none",
    },
    inventoryAccount: {
      type: String,
      trim: true,
    },
    inventoryValuation: {
      type: String,
      trim: true,
    },
    reorderPoint: {
      type: String,
      trim: true,
    },
    warehouseStocks: [{
      warehouse: {
        type: String,
        trim: true,
      },
      openingStock: {
        type: Number,
        default: 0,
      },
      openingStockValue: {
        type: Number,
        default: 0,
      },
      stockOnHand: {
        type: Number,
        default: 0,
      },
      committedStock: {
        type: Number,
        default: 0,
      },
      availableForSale: {
        type: Number,
        default: 0,
      },
      // Physical stock fields - independent from accounting stock
      physicalOpeningStock: {
        type: Number,
        default: 0,
      },
      physicalStockOnHand: {
        type: Number,
        default: 0,
      },
      physicalCommittedStock: {
        type: Number,
        default: 0,
      },
      physicalAvailableForSale: {
        type: Number,
        default: 0,
      },
    }],
    images: [
      {
        filename: {
          type: String,
          default: "image",
        },
        contentType: {
          type: String,
          default: "image/jpeg",
        },
        data: String, // Base64 string
      },
    ],
    createdBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ShoeItem = mongoose.model("ShoeItem", ShoeItemSchema);

export default ShoeItem;

