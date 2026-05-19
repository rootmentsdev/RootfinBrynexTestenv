import mongoose from "mongoose";

const dsrSaleRowSchema = new mongoose.Schema(
    {
        employeeName:  { type: String, required: true, trim: true },
        shoe_bill_ftd: { type: Number, default: 0 },
        shoe_qty_ftd:  { type: Number, default: 0 },
        shirt_bill_ftd:{ type: Number, default: 0 },
        shirt_qty_ftd: { type: Number, default: 0 },
    },
    { _id: false }
);

const dsrSaleSchema = new mongoose.Schema(
    {
        date:      { type: String, required: true, trim: true }, // "YYYY-MM-DD"
        locCode:   { type: String, required: true, trim: true },
        storeName: { type: String, required: true, trim: true },
        createdBy: { type: String, default: "" },   // email of the user who saved
        rows:      { type: [dsrSaleRowSchema], default: [] },
    },
    { timestamps: true }
);

// Index for fast lookup by store + date
dsrSaleSchema.index({ locCode: 1, date: -1 });
dsrSaleSchema.index({ date: -1 });

const DsrSale = mongoose.model("DsrSale", dsrSaleSchema);
export default DsrSale;
