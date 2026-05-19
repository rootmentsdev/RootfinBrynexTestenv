import mongoose from "mongoose";

const dsrRentalRowSchema = new mongoose.Schema(
    {
        employeeName:       { type: String, required: true, trim: true },
        // Bill
        bill_ftd:           { type: Number, default: 0 },
        bill_mtd:           { type: Number, default: 0 },
        bill_ly_mtd:        { type: Number, default: 0 },
        bill_l2l:           { type: Number, default: 0 },
        // Qty
        qty_ftd:            { type: Number, default: 0 },
        qty_mtd:            { type: Number, default: 0 },
        qty_ly_mtd:         { type: Number, default: 0 },
        qty_l2l:            { type: Number, default: 0 },
        // Value
        value_ftd:          { type: Number, default: 0 },
        value_mtd:          { type: Number, default: 0 },
        value_ly_mtd:       { type: Number, default: 0 },
        value_l2l:          { type: Number, default: 0 },
        // ABS / ABV
        abs:                { type: Number, default: 0 },
        abv:                { type: Number, default: 0 },
        // Value target & achievement
        value_tgt:          { type: Number, default: 0 },
        value_ach:          { type: Number, default: 0 },
        // Walkin qty
        walkin_ftd:         { type: Number, default: 0 },
        walkin_mtd:         { type: Number, default: 0 },
        walkin_ly_mtd:      { type: Number, default: 0 },
        walkin_l2l:         { type: Number, default: 0 },
        // Loss of sales
        loss_ftd:           { type: Number, default: 0 },
        loss_mtd:           { type: Number, default: 0 },
        // Conversion
        conversion:         { type: Number, default: 0 },
    },
    { _id: false }
);

const dsrRentalSchema = new mongoose.Schema(
    {
        date:      { type: String, required: true, trim: true }, // "YYYY-MM-DD"
        locCode:   { type: String, required: true, trim: true },
        storeName: { type: String, required: true, trim: true },
        createdBy: { type: String, default: "" },
        rows:      { type: [dsrRentalRowSchema], default: [] },
    },
    { timestamps: true }
);

dsrRentalSchema.index({ locCode: 1, date: -1 });
dsrRentalSchema.index({ date: -1 });

const DsrRental = mongoose.model("DsrRental", dsrRentalSchema);
export default DsrRental;
