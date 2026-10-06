import SalesInvoice from "../model/SalesInvoice.js";
import User from "../model/UserModel.js";

// Helper to check if an invoice is a return/refund/cancel document
const isReturnInvoiceDoc = (invoice) => {
  if (!invoice) return true;
  const category = (invoice.category || "").toLowerCase().trim();
  if (["return", "refund", "cancel"].includes(category)) return true;
  const num = (invoice.invoiceNumber || "").toUpperCase().trim();
  if (num.startsWith("RTN-") || num.startsWith("RET-") || num.startsWith("REFUND-") || num.startsWith("CANCEL-")) return true;
  return false;
};

// Helper to check if an invoice is fully returned (no sold items remaining)
const isFullyReturnedInvoice = (invoice) => {
  if (!invoice) return true;
  if (isReturnInvoiceDoc(invoice)) return true;
  if (invoice.returnStatus === "full") return true;
  if (!invoice.lineItems || !Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) return true;
  const totalQty = (invoice.lineItems || []).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  if (totalQty <= 0) return true;
  return false;
};

// Helper to compute effective active invoice sales amount
const getEffectiveInvoiceSalesAmount = (invoice) => {
  if (isFullyReturnedInvoice(invoice)) return 0;
  const finalTotal = parseFloat(invoice.finalTotal) || 0;
  if (finalTotal > 0) return finalTotal;
  // Fallback if finalTotal is <= 0 but lineItems exist
  const computed = (invoice.lineItems || []).reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.price || item.rate || 0);
    const amt = parseFloat(item.amount) || (qty * rate);
    return sum + (amt > 0 ? amt : 0);
  }, 0);
  return computed > 0 ? computed : 0;
};

// Get Sales by Invoice Report (with advanced filtering and excluding returns)
export const getSalesByInvoice = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode, category, sku, size, customer } = req.query;
    const userId = req.query.userId || req.body.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    // Check if user is admin
    const adminEmails = ['officebrynex@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));
    const isClusterManager = req.query.isClusterManager === "true";
    const allowedLocCodes = req.query.allowedLocCodes ? req.query.allowedLocCodes.split(",") : [];

    let query = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: { $nin: ["Return", "return", "refund", "Refund", "cancel", "Cancel"] },
      invoiceNumber: { $not: /^(RTN-|RET-|REFUND-|CANCEL-)/i },
      returnStatus: { $ne: "full" }
    };

    // Store filtering logic
    if (isClusterManager) {
      if (locCode && locCode !== "all") {
        query.$or = [{ warehouse: locCode }, { branch: locCode }, { locCode: locCode }];
      } else if (allowedLocCodes.length > 0) {
        query.locCode = { $in: allowedLocCodes };
      }
    } else if (!isAdmin && locCode && locCode !== '858' && locCode !== '103' && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    } else if (isAdmin && locCode && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    }

    // Advanced filtering
    if (category) {
      query.category = { 
        $nin: ["Return", "return", "refund", "Refund", "cancel", "Cancel"],
        $regex: new RegExp(category, 'i')
      };
    }

    if (customer) {
      query.customer = new RegExp(customer, 'i');
    }

    let rawInvoices = await SalesInvoice.find(query).sort({ invoiceDate: -1 });

    // Exclude fully returned invoices and return invoice documents
    let invoices = rawInvoices.filter(inv => !isFullyReturnedInvoice(inv));

    // Filter by SKU or size if specified (requires checking line items)
    if (sku || size) {
      invoices = invoices.filter(invoice => {
        if (!invoice.lineItems || !Array.isArray(invoice.lineItems)) {
          return false;
        }
        
        const hasMatchingItem = invoice.lineItems.some(item => {
          let matchesSku = true;
          let matchesSize = true;
          
          if (sku) {
            const itemSku = item.sku || item.itemSku;
            const cleanSku = sku.trim();
            matchesSku = itemSku && itemSku.toLowerCase().includes(cleanSku.toLowerCase());
          }
          
          if (size) {
            let sizeFound = false;
            const cleanSize = size.trim();
            
            if (item.size && item.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            if (!sizeFound && item.itemData && item.itemData.size && item.itemData.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            if (!sizeFound && item.item) {
              const sizePattern = new RegExp(`[/\\-\\s]${cleanSize}(?:[/\\-\\s]|$)`, 'i');
              sizeFound = sizePattern.test(item.item);
              
              if (!sizeFound) {
                const endPattern = new RegExp(`${cleanSize}$`, 'i');
                sizeFound = endPattern.test(item.item);
              }
            }
            
            if (!sizeFound && item.itemData && item.itemData.attributeCombination) {
              sizeFound = item.itemData.attributeCombination.some(attr => 
                attr.toString().toLowerCase() === cleanSize.toLowerCase()
              );
            }
            
            matchesSize = sizeFound;
          }
          
          return matchesSku && matchesSize && (parseFloat(item.quantity) || 0) > 0;
        });
        
        return hasMatchingItem;
      });
    }

    // Calculate summary statistics
    let totalSales = 0;
    let totalItems = 0;
    let totalDiscount = 0;
    let totalPurchaseCost = 0;

    const processedInvoices = [];

    invoices.forEach(invoice => {
      let relevantItems = (invoice.lineItems || []).filter(item => (parseFloat(item.quantity) || 0) > 0);
      
      if (sku || size) {
        relevantItems = relevantItems.filter(item => {
          let matchesSku = true;
          let matchesSize = true;
          
          if (sku) {
            const itemSku = item.sku || item.itemSku;
            const cleanSku = sku.trim();
            matchesSku = itemSku && itemSku.toLowerCase().includes(cleanSku.toLowerCase());
          }
          
          if (size) {
            let sizeFound = false;
            const cleanSize = size.trim();
            
            if (item.size && item.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            if (!sizeFound && item.itemData && item.itemData.size && item.itemData.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            if (!sizeFound && item.item) {
              const sizePattern = new RegExp(`[/\\-\\s]${cleanSize}(?:[/\\-\\s]|$)`, 'i');
              sizeFound = sizePattern.test(item.item);
              
              if (!sizeFound) {
                const endPattern = new RegExp(`${cleanSize}$`, 'i');
                sizeFound = endPattern.test(item.item);
              }
            }
            
            if (!sizeFound && item.itemData && item.itemData.attributeCombination) {
              sizeFound = item.itemData.attributeCombination.some(attr => 
                attr.toString().toLowerCase() === cleanSize.toLowerCase()
              );
            }
            
            matchesSize = sizeFound;
          }
          
          return matchesSku && matchesSize;
        });
      }
      
      const itemCount = relevantItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      if (itemCount <= 0) return; // Skip if no sold items

      let itemAmount = 0;
      let itemDiscount = 0;
      let itemPurchaseCost = 0;
      let uniqueSkus = [];
      
      if (sku || size) {
        itemAmount = relevantItems.reduce((sum, item) => {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.price || item.rate || 0);
          return sum + (parseFloat(item.amount) || (qty * rate));
        }, 0);
        
        itemPurchaseCost = relevantItems.reduce((sum, item) => {
          const quantity = parseFloat(item.quantity) || 0;
          const purchasePrice = parseFloat(item.itemData?.costPrice || 0);
          return sum + (quantity * purchasePrice);
        }, 0);
        
        const totalInvoiceAmount = getEffectiveInvoiceSalesAmount(invoice);
        const totalInvoiceDiscount = parseFloat(invoice.discountAmount) || 0;
        
        if (totalInvoiceAmount > 0 && totalInvoiceDiscount > 0) {
          itemDiscount = (itemAmount / totalInvoiceAmount) * totalInvoiceDiscount;
        }
        
        const skus = relevantItems.map(item => item.sku || item.itemSku).filter(Boolean);
        uniqueSkus = [...new Set(skus)];
      } else {
        itemAmount = getEffectiveInvoiceSalesAmount(invoice);
        itemDiscount = parseFloat(invoice.discountAmount) || 0;
        
        itemPurchaseCost = relevantItems.reduce((sum, item) => {
          const quantity = parseFloat(item.quantity) || 0;
          const purchasePrice = parseFloat(item.itemData?.costPrice || 0);
          return sum + (quantity * purchasePrice);
        }, 0);
        
        const allSkus = relevantItems.map(item => item.sku || item.itemSku).filter(Boolean);
        uniqueSkus = [...new Set(allSkus)];
      }
      
      totalSales += itemAmount;
      totalDiscount += itemDiscount;
      totalItems += itemCount;
      totalPurchaseCost += itemPurchaseCost;

      processedInvoices.push({
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
        customer: invoice.customer || 'Unknown',
        category: invoice.category || 'General',
        skus: uniqueSkus.join(', ') || 'N/A',
        itemCount: itemCount,
        totalAmount: itemAmount,
        discount: itemDiscount,
        purchaseCost: itemPurchaseCost,
        netAmount: itemAmount - itemDiscount,
        profit: (itemAmount - itemDiscount) - itemPurchaseCost,
        paymentMethod: Array.isArray(invoice.paymentMethod) ? invoice.paymentMethod.join(', ') : (invoice.paymentMethod || 'Cash'),
        branch: invoice.branch || invoice.warehouse || invoice.locCode || 'Unknown',
        salesPerson: invoice.salesperson || 'N/A'
      });
    });

    const avgInvoiceValue = processedInvoices.length > 0 ? totalSales / processedInvoices.length : 0;
    const totalProfit = (totalSales - totalDiscount) - totalPurchaseCost;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          dateFrom,
          dateTo,
          totalInvoices: processedInvoices.length,
          totalSales,
          totalItems,
          totalDiscount,
          totalPurchaseCost,
          totalProfit,
          netSales: totalSales - totalDiscount,
          avgInvoiceValue,
          returnedCount: rawInvoices.length - processedInvoices.length
        },
        invoices: processedInvoices
      }
    });
  } catch (error) {
    console.error("Get sales by invoice error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Sales Summary Report (excluding returns and fully returned invoices)
export const getSalesSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode, warehouse } = req.query;
    const userId = req.query.userId || req.body.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    // Check if user is admin
    const adminEmails = ['officebrynex@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));
    const isClusterManager = req.query.isClusterManager === "true";
    const allowedLocCodes = req.query.allowedLocCodes ? req.query.allowedLocCodes.split(",") : [];

    let query = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: { $nin: ["Return", "return", "refund", "Refund", "cancel", "Cancel"] },
      invoiceNumber: { $not: /^(RTN-|RET-|REFUND-|CANCEL-)/i },
      returnStatus: { $ne: "full" }
    };

    // Store filtering logic
    if (isClusterManager) {
      if (locCode && locCode !== "all") {
        query.$or = [{ warehouse: locCode }, { branch: locCode }, { locCode: locCode }];
      } else if (allowedLocCodes.length > 0) {
        query.locCode = { $in: allowedLocCodes };
      }
    } else if (!isAdmin && locCode && locCode !== '858' && locCode !== '103' && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    } else if (isAdmin && locCode && locCode !== 'all' && locCode !== '858' && locCode !== '103') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    } else if (isAdmin && warehouse && warehouse !== "All Stores") {
      query.$or = [
        { warehouse: warehouse },
        { branch: warehouse },
        { locCode: warehouse }
      ];
    }

    const rawInvoices = await SalesInvoice.find(query).sort({ invoiceDate: -1 });

    // Filter out any returned invoices or invoices with 0 sold items
    const activeInvoices = rawInvoices.filter(inv => !isFullyReturnedInvoice(inv));

    // Calculate totals
    let totalSales = 0;
    let totalDiscount = 0;
    let totalCash = 0;
    let totalBank = 0;
    let totalUPI = 0;
    let totalRBL = 0;
    let invoiceCount = 0;

    const salesByCategory = {};
    const salesBySalesPerson = {};
    const activeInvoicesList = [];

    activeInvoices.forEach(invoice => {
      const amount = getEffectiveInvoiceSalesAmount(invoice);
      if (amount <= 0) return; // Skip zero/negative amount invoices

      const discount = parseFloat(invoice.discountAmount) || 0;
      
      // Handle payment breakdown
      const paymentMethods = Array.isArray(invoice.paymentMethod) 
        ? invoice.paymentMethod 
        : [invoice.paymentMethod];
      
      const amountPerMethod = amount / (paymentMethods.length || 1);
      
      paymentMethods.forEach(method => {
        const normalizedMethod = (method || "Cash").toString().trim().toLowerCase();
        
        if (normalizedMethod === "cash") {
          totalCash += amountPerMethod;
        } else if (normalizedMethod === "bank" || normalizedMethod.includes("card") || normalizedMethod.includes("bank")) {
          totalBank += amountPerMethod;
        } else if (normalizedMethod === "upi") {
          totalUPI += amountPerMethod;
        } else if (normalizedMethod === "rbl") {
          totalRBL += amountPerMethod;
        } else {
          totalCash += amountPerMethod;
        }
      });

      totalSales += amount;
      totalDiscount += discount;
      invoiceCount++;

      // Group by category
      const category = invoice.category || "General";
      if (!salesByCategory[category]) {
        salesByCategory[category] = { count: 0, amount: 0 };
      }
      salesByCategory[category].count++;
      salesByCategory[category].amount += amount;

      // Group by sales person AND store
      const salesPerson = invoice.salesperson || "Unknown";
      const branch = invoice.branch || invoice.warehouse || invoice.locCode || "Unknown";
      const salesPersonKey = `${salesPerson}_${branch}`;
      if (!salesBySalesPerson[salesPersonKey]) {
        salesBySalesPerson[salesPersonKey] = { 
          count: 0, 
          amount: 0, 
          branch: branch,
          name: salesPerson
        };
      }
      salesBySalesPerson[salesPersonKey].count++;
      salesBySalesPerson[salesPersonKey].amount += amount;

      activeInvoicesList.push({
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        customer: invoice.customer,
        category: invoice.category,
        amount: amount,
        discount: discount,
        paymentMethod: Array.isArray(invoice.paymentMethod) ? invoice.paymentMethod.join(', ') : invoice.paymentMethod,
        branch: invoice.branch || invoice.warehouse
      });
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          dateFrom,
          dateTo,
          totalInvoices: invoiceCount,
          totalSales,
          totalDiscount,
          netSales: totalSales - totalDiscount,
          paymentBreakdown: {
            cash: totalCash,
            bank: totalBank,
            upi: totalUPI,
            rbl: totalRBL
          }
        },
        salesByCategory: Object.entries(salesByCategory).map(([category, data]) => ({
          category,
          ...data
        })),
        topSalesPersons: Object.entries(salesBySalesPerson)
          .map(([salesPerson, data]) => ({ 
            name: data.name,
            count: data.count,
            amount: data.amount,
            store: data.branch
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
        invoices: activeInvoicesList
      }
    });
  } catch (error) {
    console.error("Get sales summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Sales by Item Report (Enhanced with filtering and excluding returns)
export const getSalesByItem = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode, category, sku, size, customer } = req.query;
    const userId = req.query.userId || req.body.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    // Check if user is admin
    const adminEmails = ['officebrynex@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));

    let query = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: { $nin: ["Return", "return", "refund", "Refund", "cancel", "Cancel"] },
      invoiceNumber: { $not: /^(RTN-|RET-|REFUND-|CANCEL-)/i },
      returnStatus: { $ne: "full" }
    };

    // Store filtering logic
    if (!isAdmin && locCode && locCode !== '858' && locCode !== '103' && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    } else if (isAdmin && locCode && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    }

    // Advanced filtering
    if (category) {
      query.category = {
        $nin: ["Return", "return", "refund", "Refund", "cancel", "Cancel"],
        $regex: new RegExp(category, 'i')
      };
    }

    if (customer) {
      query.customer = new RegExp(customer, 'i');
    }

    const rawInvoices = await SalesInvoice.find(query);
    const invoices = rawInvoices.filter(inv => !isFullyReturnedInvoice(inv));

    const itemSales = {};

    invoices.forEach(invoice => {
      if (invoice.lineItems && Array.isArray(invoice.lineItems)) {
        invoice.lineItems.forEach(item => {
          const quantity = parseFloat(item.quantity) || 0;
          if (quantity <= 0) return; // Skip returned/zero-quantity items

          // Apply SKU and size filters
          let includeItem = true;
          
          if (sku) {
            const itemSku = item.sku || item.itemSku;
            const cleanSku = sku.trim();
            if (!itemSku || !itemSku.toLowerCase().includes(cleanSku.toLowerCase())) {
              includeItem = false;
            }
          }
          
          if (size) {
            let sizeFound = false;
            const cleanSize = size.trim();
            
            if (item.size && item.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            if (!sizeFound && item.itemData && item.itemData.size && item.itemData.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            if (!sizeFound && item.item) {
              const sizePattern = new RegExp(`[/\\-\\s]${cleanSize}(?:[/\\-\\s]|$)`, 'i');
              sizeFound = sizePattern.test(item.item);
              
              if (!sizeFound) {
                const endPattern = new RegExp(`${cleanSize}$`, 'i');
                sizeFound = endPattern.test(item.item);
              }
            }
            
            if (!sizeFound && item.itemData && item.itemData.attributeCombination) {
              sizeFound = item.itemData.attributeCombination.some(attr => 
                attr.toString().toLowerCase() === cleanSize.toLowerCase()
              );
            }
            
            if (!sizeFound) {
              includeItem = false;
            }
          }
          
          if (!includeItem) return;

          const itemSku = item.sku || item.itemSku || "";
          const itemSize = item.size || item.itemData?.size || "";
          const isObjectId = (val) => typeof val === 'string' && /^[a-f0-9]{24}$/i.test(val);
          const rawName = item.name || item.itemName || item.item;
          const itemName = (rawName && !isObjectId(rawName))
            ? rawName
            : (item.itemData?.itemName || item.itemData?.name || "Unknown");
          const itemKey = `${itemName}_${itemSku}_${itemSize}`;
          const price = parseFloat(item.price || item.rate) || 0;
          const amount = parseFloat(item.amount) || (quantity * price);

          if (!itemSales[itemKey]) {
            itemSales[itemKey] = {
              name: itemName,
              sku: itemSku,
              category: item.category || invoice.category || "General",
              size: itemSize || "N/A",
              quantity: 0,
              unitPrice: price,
              totalAmount: 0,
              invoiceCount: 0
            };
          }
          itemSales[itemKey].quantity += quantity;
          itemSales[itemKey].totalAmount += amount;
          itemSales[itemKey].invoiceCount++;
        });
      }
    });

    const itemList = Object.values(itemSales)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    res.status(200).json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        items: itemList,
        totalItems: itemList.length,
        totalQuantity: itemList.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: itemList.reduce((sum, item) => sum + item.totalAmount, 0)
      }
    });
  } catch (error) {
    console.error("Get sales by item error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Sales Return Summary
export const getSalesReturnSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode } = req.query;
    const userId = req.query.userId || req.body.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    let query = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      $or: [
        { category: { $in: ["Return", "return", "Refund", "refund", "Cancel", "cancel"] } },
        { invoiceNumber: { $regex: /^(RTN-|RET-|REFUND-|CANCEL-)/i } }
      ]
    };
    
    // Filter by store if locCode is provided and not "all"
    if (locCode && locCode !== "all") {
      query.$and = [
        {
          $or: [
            { warehouse: locCode },
            { branch: locCode },
            { locCode: locCode },
            { branch: new RegExp(`^${locCode}$`, 'i') }
          ]
        }
      ];
    }
    
    const returns = await SalesInvoice.find(query).sort({ invoiceDate: -1 });

    let totalReturns = 0;
    let totalReturnAmount = 0;
    const returnsByReason = {};

    returns.forEach(ret => {
      const amount = Math.abs(parseFloat(ret.finalTotal || ret.subTotal || 0)) || 0;
      totalReturns++;
      totalReturnAmount += amount;

      const reason = ret.remark || ret.notes || ret.customerNotes || "No reason provided";
      if (!returnsByReason[reason]) {
        returnsByReason[reason] = { count: 0, amount: 0 };
      }
      returnsByReason[reason].count++;
      returnsByReason[reason].amount += amount;
    });

    res.status(200).json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        summary: {
          totalReturns,
          totalReturnAmount,
          averageReturnAmount: totalReturns > 0 ? totalReturnAmount / totalReturns : 0
        },
        returnsByReason: Object.entries(returnsByReason).map(([reason, data]) => ({
          reason,
          ...data
        })),
        returns: returns.map(ret => ({
          invoiceNumber: ret.invoiceNumber,
          date: ret.invoiceDate,
          customer: ret.customer,
          amount: Math.abs(parseFloat(ret.finalTotal || ret.subTotal || 0)),
          reason: ret.remark || ret.notes || ret.customerNotes || "Return",
          branch: ret.branch || ret.warehouse,
          warehouse: ret.warehouse,
          locCode: ret.locCode
        }))
      }
    });
  } catch (error) {
    console.error("❌ Get sales return summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
