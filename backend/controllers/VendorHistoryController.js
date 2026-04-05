import { VendorHistory } from "../models/sequelize/index.js";

// Get vendor history by vendor ID
export const getVendorHistory = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { limit = 100 } = req.query;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const history = await VendorHistory.findAll({
      where: { vendorId },
      order: [['changedAt', 'DESC']],
      limit: parseInt(limit),
    });

    // Convert Sequelize instances to plain objects
    const historyData = history.map(item => item.toJSON());

    res.status(200).json(historyData);
  } catch (error) {
    console.error("Get vendor history error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
