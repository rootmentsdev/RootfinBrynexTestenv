import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Printer, Download, Mail, Share2, Edit, MoreHorizontal, ArrowLeft } from "lucide-react";
import Head from "../components/Head";
import baseUrl from "../api/api";

const SalesInvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [returnInvoiceItems, setReturnInvoiceItems] = useState(null); // ✅ Store return invoice items
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);

  // NEW STATE (dropdown toggle)
  const [showSendMenu, setShowSendMenu] = useState(false);
  
  // Return Invoice States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnPaymentMethod, setReturnPaymentMethod] = useState("Cash"); // ✅ NEW: Payment method for return
  const [returningInvoice, setReturningInvoice] = useState(false);

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem("rootfinuser") || "{}");
  const isAdminOrWarehouse = currentUser.power === 'admin' || currentUser.power === 'warehouse';

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Branch to location code mapping
  const branchToLocCodeMap = {
    // Main office and special locations
    "Head Office": "759",
    "Warehouse": "858",
    "WAREHOUSE": "103",
    "Production": "101",
    "Office": "102",
    
    // G. prefix stores (main branches)
    "Calicut": "712",
    "Chavakkad Branch": "706",
    "Edapally Branch": "702",
    "Edappal Branch": "707",
    "Grooms Trivandrum": "700",
    "Kalpetta Branch": "717",
    "Kannur Branch": "716",
    "Kottakkal Branch": "711",
    "Kottayam Branch": "701",
    "Manjery Branch": "710",
    "Palakkad Branch": "705",
    "Perinthalmanna Branch": "709",
    "Perumbavoor Branch": "703",
    "GPerumbavoor": "703",
    "GPerumbavoorStore": "703",
    "SuitorGuy MG Road": "718",
    "Thrissur Branch": "704",
    "Vadakara Branch": "708",
    
    // Z. prefix stores (franchise/other branches)
    "Z-Edapally1 Branch": "144",
    "Z-Edappal Branch": "100",
    "Z-Perinthalmanna Branch": "133",
    "Z-Kottakkal Branch": "122",
  };

  // Get location code for branch
  const getLocCodeForBranch = (branchName) => {
    return branchToLocCodeMap[branchName] || null;
  };

  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem("rootfinuser");
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoadingList(true);
      try {
        const user = getUserInfo();
        if (!user || !user.email) return;
        const params = new URLSearchParams({
          userId: user.email,
        });
        if (user.power) params.append("userPower", user.power);
        if (user.locCode) params.append("locCode", user.locCode);

        const response = await fetch(`${API_URL}/api/sales/invoices?${params.toString()}`);

        if (response.ok) {
          const data = await response.json();
          setInvoices(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching invoices list:", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchInvoices();
  }, [API_URL]);

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/sales/invoices/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch invoice: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("API Response:", data);
        setInvoice(data);

        // ✅ If invoice is fully returned and has no line items, fetch the return invoice
        if (data.returnStatus === "full" && (!data.lineItems || data.lineItems.length === 0)) {
          console.log("Fetching return invoice items for:", data.invoiceNumber);
          try {
            const user = getUserInfo();
            const params = new URLSearchParams({
              userId: user.email,
            });
            if (user.power) params.append("userPower", user.power);
            if (user.locCode) params.append("locCode", user.locCode);

            const allInvoicesResponse = await fetch(`${API_URL}/api/sales/invoices?${params.toString()}`);
            if (allInvoicesResponse.ok) {
              const allInvoices = await allInvoicesResponse.json();
              // Find return invoice that references this invoice
              const returnInvoice = allInvoices.find(inv => 
                inv.category === "Return" && 
                inv.remark && 
                inv.remark.includes(data.invoiceNumber)
              );
              
              if (returnInvoice && returnInvoice.lineItems && returnInvoice.lineItems.length > 0) {
                console.log("Found return invoice with items:", returnInvoice.invoiceNumber);
                // Convert negative quantities back to positive for display
                const itemsWithPositiveQty = returnInvoice.lineItems.map(item => ({
                  ...item,
                  quantity: Math.abs(parseFloat(item.quantity || 0)),
                  amount: Math.abs(parseFloat(item.amount || 0)),
                  cgstAmount: Math.abs(parseFloat(item.cgstAmount || 0)),
                  sgstAmount: Math.abs(parseFloat(item.sgstAmount || 0)),
                  igstAmount: Math.abs(parseFloat(item.igstAmount || 0)),
                }));
                setReturnInvoiceItems(itemsWithPositiveQty);
              }
            }
          } catch (err) {
            console.error("Error fetching return invoice:", err);
          }
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchInvoice();
    }
  }, [id, API_URL]);

  // Fetch store information when invoice is loaded
  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (!invoice || !invoice.branch) return;
      
      const branchLocCode = getLocCodeForBranch(invoice.branch);
      if (!branchLocCode) {
        console.log(`No location code found for branch: ${invoice.branch}`);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/stores/loc/${branchLocCode}`);
        if (response.ok) {
          const data = await response.json();
          if (data.store) {
            setStoreInfo(data.store);
            console.log("Store info fetched:", data.store);
          }
        } else if (response.status === 404) {
          console.log(`Store not found for branch: ${invoice.branch} (locCode: ${branchLocCode})`);
        }
      } catch (err) {
        console.error("Error fetching store info:", err);
      }
    };

    fetchStoreInfo();
  }, [invoice, API_URL]);

  const handlePrint = () => {
    window.print();
  };

  // OLD email handler remains
  const handleEmail = () => {
    alert("Email functionality will be implemented");
  };

  // NEW — Send SMS handler
  const handleSMS = () => {
    alert("SMS functionality will be implemented");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice?.invoiceNumber}`,
        text: `Invoice for ${invoice?.customer}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Invoice link copied to clipboard");
    }
  };


  // Whatsapp

  // Check if invoice has any returnable items
  const hasReturnableItems = invoice?.lineItems?.some(
    (item) => item.itemData?.returnable === true
  ) || false;

  // Initialize return items when modal opens
  const handleOpenReturnModal = async () => {
    // Check if invoice is already fully returned
    if (invoice?.returnStatus === "full") {
      alert("This invoice has already been fully returned and cannot be returned again.");
      return;
    }

    // Fetch fresh item data to get latest returnable status
    try {
      const itemsWithFreshData = await Promise.all(
        (invoice.lineItems || []).map(async (item) => {
          try {
            // Try to fetch fresh item data from database
            let freshItemData = item.itemData;
            
            // If item is from a group, fetch from group items
            if (item.itemGroupId) {
              const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${item.itemGroupId}`);
              if (response.ok) {
                const group = await response.json();
                const groupItem = group.items?.find(i => (i._id || i.id) === (item.itemData?._id || item.itemData?.id));
                if (groupItem) {
                  freshItemData = { ...item.itemData, returnable: groupItem.returnable };
                }
              }
            } else {
              // Fetch standalone item
              const response = await fetch(`${API_URL}/api/shoe-sales/items/${item.itemData?._id || item.itemData?.id}`);
              if (response.ok) {
                freshItemData = await response.json();
              }
            }
            
            return {
              ...item,
              itemData: freshItemData,
              returnQuantity: 0,
              isReturnable: freshItemData?.returnable === true,
            };
          } catch (error) {
            console.error("Error fetching fresh item data:", error);
            // Fallback to cached data if fetch fails
            return {
              ...item,
              returnQuantity: 0,
              isReturnable: item.itemData?.returnable === true,
            };
          }
        })
      );
      
      // Check if there are any returnable items after fetching fresh data
      const hasReturnable = itemsWithFreshData.some(item => item.isReturnable);
      if (!hasReturnable) {
        alert("This invoice has no returnable items. Items must be marked as 'Returnable Item' in the product settings to be eligible for return.");
        return;
      }
      
      setReturnItems(itemsWithFreshData);
    } catch (error) {
      console.error("Error preparing return items:", error);
      // Fallback to using cached data
      setReturnItems(
        invoice.lineItems?.map((item) => ({
          ...item,
          returnQuantity: 0,
          isReturnable: item.itemData?.returnable === true,
        })) || []
      );
    }
    
    setReturnReason("");
    setReturnPaymentMethod("Cash"); // ✅ Reset payment method to Cash
    setShowReturnModal(true);
  };

  // Handle return item quantity change
  const handleReturnQuantityChange = (index, quantity) => {
    const item = returnItems[index];
    // Prevent changes for non-returnable items
    if (item.itemData?.returnable !== true) {
      alert(`Item "${item.item || item.itemData?.itemName || 'Unknown'}" cannot be returned as it is not marked as returnable.`);
      // Reset the quantity to 0 if they somehow managed to change it
      const updated = [...returnItems];
      updated[index].returnQuantity = 0;
      setReturnItems(updated);
      return;
    }
    
    const updated = [...returnItems];
    updated[index].returnQuantity = Math.min(
      parseFloat(quantity) || 0,
      parseFloat(updated[index].quantity || 0)
    );
    setReturnItems(updated);
  };

  // Calculate return amount with taxes for a single item
  // Use proportional calculation from invoice's finalTotal (which includes all taxes, discounts, adjustments)
  const calculateReturnAmountWithTax = (item) => {
    if (!item.returnQuantity || item.returnQuantity <= 0) return 0;
    if (!invoice) return 0;
    
    const originalQuantity = parseFloat(item.quantity || 0);
    if (originalQuantity <= 0) return 0;
    
    // ✅ Use rate directly since it's GST inclusive
    // Rate already includes GST, so rate × quantity = total amount for this item
    const originalItemSubTotal = parseFloat((item.rate * originalQuantity) || 0);
    const originalInvoiceSubTotal = parseFloat(invoice.subTotal || 0);
    
    // Calculate return quantity ratio
    const returnQuantityRatio = item.returnQuantity / originalQuantity;
    const returnSubTotal = originalItemSubTotal * returnQuantityRatio;
    
    // If invoice has subTotal and finalTotal, use finalTotal proportionally (most accurate)
    if (originalInvoiceSubTotal > 0) {
      const returnSubTotalRatio = returnSubTotal / originalInvoiceSubTotal;
      const invoiceFinalTotal = parseFloat(invoice.finalTotal || 0);
      
      // Use finalTotal proportionally if available (this matches exactly what invoice shows as Balance Due)
      // Note: finalTotal can be less than subTotal when TDS/discounts are applied
      if (invoiceFinalTotal > 0) {
        const proportionalFinalTotal = invoiceFinalTotal * returnSubTotalRatio;
        return Math.max(0, proportionalFinalTotal);
      }
      
      // If finalTotal not available, calculate using invoice tax structure
      // Invoice display shows: CGST @ 2.5% and SGST @ 2.5% calculated from subTotal
      const invoiceTotalTax = parseFloat(invoice.totalTax || 0);
      const invoiceDiscountAmount = parseFloat(invoice.discountAmount || 0);
      const invoiceTdsAmount = parseFloat(invoice.tdsTcsAmount || 0);
      const invoiceAdjustmentAmount = parseFloat(invoice.adjustmentAmount || 0);
      
      // Calculate proportional amounts for the return
      const proportionalSubTotal = originalInvoiceSubTotal * returnSubTotalRatio;
      
      // Calculate tax proportionally, or use 5% (2.5% CGST + 2.5% SGST) if not available
      let proportionalTax = 0;
      if (invoiceTotalTax > 0) {
        proportionalTax = invoiceTotalTax * returnSubTotalRatio;
      } else {
        // Default: 5% tax (2.5% CGST + 2.5% SGST)
        proportionalTax = proportionalSubTotal * 0.05;
      }
      
      const proportionalDiscount = invoiceDiscountAmount * returnSubTotalRatio;
      const proportionalTds = invoiceTdsAmount * returnSubTotalRatio;
      const proportionalAdjustment = invoiceAdjustmentAmount * returnSubTotalRatio;
      
      // Calculate return amount: subTotal + tax - discount - TDS + adjustment
      const returnAmountWithTax = proportionalSubTotal + proportionalTax - proportionalDiscount - proportionalTds + proportionalAdjustment;
      
      return Math.max(0, returnAmountWithTax);
    }
    
    // Fallback: use rate directly (GST inclusive)
    const returnAmount = item.returnQuantity * parseFloat(item.rate || 0);
    return returnAmount;
  };

  // Calculate total return amount with taxes
  const calculateTotalReturnAmountWithTax = () => {
    return returnItems.reduce((sum, item) => {
      return sum + calculateReturnAmountWithTax(item);
    }, 0);
  };

  // Submit return invoice
  const handleSubmitReturn = async () => {
    const itemsToReturn = returnItems.filter((item) => item.returnQuantity > 0);

    if (itemsToReturn.length === 0) {
      alert("Please select at least one item to return");
      return;
    }

    // Check if any non-returnable items are being returned
    const nonReturnableItems = itemsToReturn.filter((item) => item.itemData?.returnable !== true);
    if (nonReturnableItems.length > 0) {
      const itemNames = nonReturnableItems.map((item) => item.item || item.itemData?.itemName || "Unknown").join(", ");
      alert(`Item cannot be returned!\n\nThe following items are not marked as returnable: ${itemNames}\n\nPlease enable the "Returnable Item" option in the product settings to return these items.`);
      return;
    }

    if (!returnReason.trim()) {
      alert("Please provide a reason for return");
      return;
    }

    setReturningInvoice(true);

    try {
      const user = getUserInfo();
      
      // Calculate totals for return invoice (use NEGATIVE values to show as refund)
      const returnLineItems = itemsToReturn.map((item) => ({
        item: item.item,
        itemData: item.itemData,
        quantity: item.returnQuantity,
        rate: item.rate * -1, // Negative rate for return
        amount: item.returnQuantity * item.rate * -1, // Negative amount
        baseAmount: item.returnQuantity * item.rate * -1,
        cgstPercent: item.cgstPercent || 0,
        sgstPercent: item.sgstPercent || 0,
        igstPercent: item.igstPercent || 0,
        cgstAmount: (item.returnQuantity * item.rate * parseFloat(item.cgstPercent || 0)) / 100 * -1,
        sgstAmount: (item.returnQuantity * item.rate * parseFloat(item.sgstPercent || 0)) / 100 * -1,
        igstAmount: (item.returnQuantity * item.rate * parseFloat(item.igstPercent || 0)) / 100 * -1,
      }));

      const totalReturnAmount = returnLineItems.reduce((sum, item) => sum + item.amount, 0); // Will be negative
      const totalTax = returnLineItems.reduce((sum, item) => sum + (item.cgstAmount + item.sgstAmount + item.igstAmount), 0); // Will be negative

      // Calculate TDS for return invoice (proportionate to return amount)
      const originalTdsAmount = parseFloat(invoice.tdsTcsAmount) || 0;
      const originalSubTotal = parseFloat(invoice.subTotal) || 0;
      
      // Calculate proportionate TDS for the return amount
      let returnTdsAmount = 0;
      if (originalTdsAmount > 0 && originalSubTotal > 0) {
        const returnRatio = Math.abs(totalReturnAmount) / originalSubTotal;
        returnTdsAmount = originalTdsAmount * returnRatio;
      }

      // Calculate Adjustment for return invoice (proportionate + sign reversed)
      const originalAdjustmentAmount = parseFloat(invoice.adjustmentAmount) || 0;
      let returnAdjustmentAmount = 0;
      if (originalAdjustmentAmount !== 0 && originalSubTotal > 0) {
        const returnRatio = Math.abs(totalReturnAmount) / originalSubTotal;
        returnAdjustmentAmount = (originalAdjustmentAmount * returnRatio) * -1;
      }

      const returnInvoiceData = {
        invoiceNumber: `RTN-${invoice.invoiceNumber}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        customer: invoice.customer,
        customerPhone: invoice.customerPhone,
        branch: invoice.branch,
        category: "Return",
        subCategory: invoice.subCategory,
        paymentMethod: returnPaymentMethod, // ✅ Use selected payment method (Cash or RBL)
        remark: `Return for: ${returnReason}`,
        lineItems: returnLineItems,
        subTotal: totalReturnAmount, // Negative
        discount: { value: "0", type: "%" },
        discountAmount: 0,
        totalTax: totalTax, // Negative
        tdsTcsType: invoice.tdsTcsType || "TDS",
        tdsTcsTax: invoice.tdsTcsTax || "",
        tdsTcsAmount: returnTdsAmount * -1, // Negative TDS amount for return
        adjustment: returnAdjustmentAmount.toFixed(2),
        adjustmentAmount: returnAdjustmentAmount,
        finalTotal: totalReturnAmount + totalTax - (returnTdsAmount * -1) + returnAdjustmentAmount, // Include TDS + adjustment
        userId: user?.email,
        warehouse: invoice.warehouse || invoice.locCode,
        locCode: invoice.locCode || user?.locCode,
        originalInvoiceId: invoice._id,
        originalInvoiceNumber: invoice.invoiceNumber,
      };

      // Step 1: Create return invoice
      const response = await fetch(`${API_URL}/api/sales/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnInvoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create return invoice");
      }

      const result = await response.json();
      
      // Step 2: Update original invoice - reduce quantities or remove returned items
      const updatedLineItems = invoice.lineItems
        .map((item) => {
          const returnedItem = itemsToReturn.find(
            (ri) => ri.item === item.item && ri.itemData?._id === item.itemData?._id
          );
          
          if (returnedItem) {
            const remainingQty = (parseFloat(item.quantity) || 0) - (parseFloat(returnedItem.returnQuantity) || 0);
            if (remainingQty <= 0) {
              return null; // Remove item completely
            }
            // For inclusive GST: lineTotal = qty × rate (rate already includes tax)
            const lineTotal = remainingQty * (parseFloat(item.rate) || 0);
            const cgstPct = parseFloat(item.cgstPercent || 0);
            const sgstPct = parseFloat(item.sgstPercent || 0);
            const igstPct = parseFloat(item.igstPercent || 0);
            const totalTaxPct = cgstPct + sgstPct + igstPct;
            // Back-calculate base from inclusive total
            const baseAmount = totalTaxPct > 0 ? lineTotal / (1 + totalTaxPct / 100) : lineTotal;
            const cgstAmount = (baseAmount * cgstPct) / 100;
            const sgstAmount = (baseAmount * sgstPct) / 100;
            const igstAmount = (baseAmount * igstPct) / 100;
            const lineTaxTotal = cgstAmount + sgstAmount + igstAmount;
            
            return {
              ...item,
              quantity: remainingQty,
              amount: baseAmount,
              baseAmount: baseAmount,
              cgstAmount: cgstAmount,
              sgstAmount: sgstAmount,
              igstAmount: igstAmount,
              lineTaxTotal: lineTaxTotal,
              lineTotal: lineTotal,
            };
          }
          return item;
        })
        .filter(Boolean); // Remove null items

      // Step 2: Update original invoice with reduced quantities (if items remain)
      if (updatedLineItems.length > 0) {
        // For inclusive GST: subTotal = sum of lineTotals (inclusive amounts)
        const newSubTotal = updatedLineItems.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || 0), 0);
        const newTotalTax = updatedLineItems.reduce(
          (sum, item) => sum + (parseFloat(item.cgstAmount) || 0) + (parseFloat(item.sgstAmount) || 0) + (parseFloat(item.igstAmount) || 0),
          0
        );

        // Recalculate discount, TDS, and adjustment proportionally based on new subtotal
        const originalSubTotal = parseFloat(invoice.subTotal || 0);
        const newSubTotalRatio = originalSubTotal > 0 ? newSubTotal / originalSubTotal : 1;
        
        const originalDiscountAmount = parseFloat(invoice.discountAmount || 0);
        const newDiscountAmount = originalDiscountAmount * newSubTotalRatio;
        
        const originalTdsAmount = parseFloat(invoice.tdsTcsAmount || 0);
        const newTdsAmount = originalTdsAmount * newSubTotalRatio;
        
        const originalAdjustmentAmount = parseFloat(invoice.adjustmentAmount || 0);
        const newAdjustmentAmount = originalAdjustmentAmount * newSubTotalRatio;
        
        // For inclusive GST: finalTotal = subTotal (tax already included) - discount - TDS + adjustment
        const newFinalTotal = newSubTotal - newDiscountAmount - newTdsAmount + newAdjustmentAmount;

        // Update the original invoice with reduced quantities and partial return status
        const updateResponse = await fetch(`${API_URL}/api/sales/invoices/${invoice._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: updatedLineItems,
            subTotal: newSubTotal,
            totalTax: newTotalTax,
            discountAmount: newDiscountAmount,
            tdsTcsAmount: newTdsAmount,
            adjustmentAmount: newAdjustmentAmount,
            finalTotal: newFinalTotal,
            returnStatus: "partial", // Mark as partially returned
            userId: user?.email,
          }),
        });

        if (!updateResponse.ok) {
          console.error("Failed to update original invoice, but return invoice was created");
          // Continue anyway - return invoice is created successfully
        } else {
          console.log("✅ Original invoice updated with reduced quantities and marked as partially returned");
        }
      } else {
        // All items have been returned - mark invoice as fully returned
        const updateResponse = await fetch(`${API_URL}/api/sales/invoices/${invoice._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: [],
            returnStatus: "full", // Mark as fully returned
            userId: user?.email,
          }),
        });

        if (!updateResponse.ok) {
          console.error("Failed to update original invoice, but return invoice was created");
        } else {
          console.log("✅ Original invoice marked as fully returned");
        }
      }

      // Step 3: Return invoice created and original invoice updated (if items remain)
      console.log("✅ Return invoice created. Original invoice updated with remaining quantities.");
      
      alert(
        `Return invoice created: ${result.invoiceNumber}\n\n` +
        (updatedLineItems.length > 0 
          ? `Original invoice ${invoice.invoiceNumber} has been updated to show remaining quantities.\n`
          : `All items have been returned.\n`) +
        `Both invoices will appear in Financial Summary and Day Book reports.\n\n` +
        `View return invoices at: Sales > Invoice Returns`
      );
      
      setShowReturnModal(false);
      // Reload to show updated invoice
      window.location.reload();
    } catch (error) {
      console.error("Return error:", error);
      alert("Could not create return invoice: " + error.message);
    } finally {
      setReturningInvoice(false);
    }
  };

  const handleWhatsApp = () => {
    console.log("Invoice data:", invoice);
    console.log("Customer phone:", invoice?.customerPhone);
    
    const phone = invoice?.customerPhone || "";
    
    if (!phone) {
      alert("Customer phone number not available.");
      return;
    }
  
    // Clean and format phone number - remove all non-digit characters
    const cleanedPhone = phone.replace(/\D/g, '');
    
    // Ensure phone number has country code (India: 91)
    let formattedPhone = cleanedPhone;
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // Add India country code
    }
  
    const message =
      `Hello,\n\n` +
      `Here is your invoice from ${invoice.branch || "Grooms Wedding Hub"}.\n` +
      `Invoice No: ${invoice.invoiceNumber}\n` +
      `Invoice Date: ${formatDate(invoice.invoiceDate)}\n` +
      `Customer: ${invoice.customer}\n` +
      `Phone: ${invoice.customerPhone || 'Not provided'}\n` +
      `Branch: ${invoice.branch}\n\n` +
      `--- ITEMS ---\n` +
      `${invoice.lineItems?.map((item, index) => 
        `${index + 1}. ${item.item || 'Item'} - Qty: ${item.quantity || 0} - Rate: ₹${parseFloat(item.rate || 0).toLocaleString('en-IN')} - Amount: ₹${parseFloat(item.amount || 0).toLocaleString('en-IN')}`
      ).join('\n') || 'No items'}\n\n` +
      `Sub Total: ₹${parseFloat(invoice.subTotal || 0).toLocaleString('en-IN')}\n` +
      `Discount: ${invoice.discount?.value || '0'}${invoice.discount?.type || '%'}\n` +
      `Discount Amount: ₹${parseFloat(invoice.discountAmount || 0).toLocaleString('en-IN')}\n` +
      `Tax: ₹${parseFloat(invoice.totalTax || 0).toLocaleString('en-IN')}\n` +
      `Adjustment: ₹${parseFloat(invoice.adjustmentAmount || 0).toLocaleString('en-IN')}\n` +
      `Total Amount: ₹${parseFloat(invoice.finalTotal || 0).toLocaleString('en-IN')}\n\n` +
      `Status: ${invoice.status?.toUpperCase() || 'SENT'}\n` +
      `Terms: ${invoice.terms || 'Due on Receipt'}\n\n` +
      `Thank you for your business!`;
  
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  
    window.open(url, "_blank");
  };
  


  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f9ff] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-[#6b7280]">Loading invoice...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f9ff] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#ef4444] mb-4">{error}</p>
          <button
            onClick={() => navigate("/sales/invoices")}
            className="text-[#2563eb] hover:text-[#1d4ed8] text-sm"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#f6f9ff] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#6b7280]">Invoice not found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#f6f9ff]">
      <Head title={`Invoice ${invoice.invoiceNumber}`} description={`Invoice details for ${invoice.customer}`} />
      
      {/* Print Styles - Hide everything except invoice when printing */}
      <style>
        {`
          @media print {
            /* Hide the entire page background */
            html, body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            /* Hide sidebar navigation */
            nav, aside, header, footer,
            .ml-64, .w-80, 
            [class*="sidebar"],
            [class*="nav-"],
            .flex-1.px-10 > div:first-child,
            .flex > div:first-child {
              display: none !important;
              visibility: hidden !important;
              width: 0 !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* Hide all buttons */
            button, a.flex.items-center {
              display: none !important;
            }
            
            /* Show and position the invoice */
            #printable-invoice {
              display: block !important;
              visibility: visible !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 210mm !important;
              margin: 0 auto !important;
              padding: 10mm !important;
              background: white !important;
              box-shadow: none !important;
              border: 2px solid #000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            #printable-invoice * {
              visibility: visible !important;
            }
            
            /* Page settings */
            @page {
              size: A4;
              margin: 5mm;
            }
          }
        `}
      </style>

      <div className="flex">
  
        {/* LEFT SIDEBAR — unchanged */}
        <div className="w-80 bg-white border-r border-[#e5e7eb] h-screen overflow-y-auto ml-64">
  <div className="p-4 border-b border-[#e5e7eb]">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-[#1f2937]">All Invoices</h2>
      <Link
        to="/sales/invoices/new"
        className="bg-[#2563eb] text-white px-3 py-1 rounded-md text-sm hover:bg-[#1d4ed8] transition-colors"
      >
        + New
      </Link>
    </div>
  </div>

  <div className="p-2">
    {loadingList ? (
      <div className="text-center py-8">
        <div className="text-sm text-[#6b7280]">Loading invoices...</div>
      </div>
    ) : (
      <div className="space-y-1">
        {invoices.map((inv) => (
          <Link
            key={inv._id}
            to={`/sales/invoices/${inv._id}`}
            className={`block p-3 rounded-lg border transition-colors ${
              inv._id === id
                ? 'bg-[#eff6ff] border-[#2563eb] text-[#2563eb]'
                : 'bg-white border-[#e5e7eb] hover:bg-[#f9fafb] text-[#1f2937]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{inv.customer}</div>
                <div className="text-xs text-[#6b7280]">{inv.invoiceNumber}</div>
                <div className="text-xs text-[#6b7280]">{formatDate(inv.invoiceDate)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-semibold text-sm">{formatCurrency(inv.finalTotal)}</div>
                <div
                  className={`text-xs px-2 py-1 rounded-full ${
                    inv.status?.toLowerCase() === 'paid'
                      ? 'bg-[#d1fae5] text-[#065f46]'
                      : inv.status?.toLowerCase() === 'draft'
                      ? 'bg-[#f3f4f6] text-[#374151]'
                      : 'bg-[#dbeafe] text-[#1e40af]'
                  }`}
                >
                  {(inv.status || 'SENT').toUpperCase()}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    )}
  </div>
</div>

  
        {/* MAIN CONTENT */}
        <div className="flex-1 px-10 pb-16 pt-6">
  
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/sales/invoices")} className="flex items-center gap-2 text-[#6b7280] hover:text-[#1f2937]">
                <ArrowLeft size={20} />
                <span className="text-sm">All Invoices</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-semibold text-[#1f2937]">
                  {invoice.invoiceNumber}
                </div>
                {invoice?.returnStatus === "full" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    FULLY RETURNED
                  </span>
                )}
                {invoice?.returnStatus === "partial" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    PARTIALLY RETURNED
                  </span>
                )}
              </div>
            </div>
  
            <div className="flex items-center gap-2">
  
              {/* PRINT BUTTON — Only for admin/warehouse */}
              {isAdminOrWarehouse && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md hover:bg-[#f9fafb]"
                >
                  <Printer size={16} />
                  Print
                </button>
              )}
  
              {/* SEND DROPDOWN — Only for admin/warehouse */}
              {isAdminOrWarehouse && (
                <div className="relative">
                  <button
                    onClick={() => setShowSendMenu((prev) => !prev)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md hover:bg-[#f9fafb]"
                  >
                    <Mail size={16} />
                    Send
                  </button>
  
                  {showSendMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <button onClick={handleEmail} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        Send Email
                      </button>
  
                      <button onClick={handleSMS} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        Send SMS
                      </button>
                      <button
                        onClick={handleWhatsApp}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Send via WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              )}
  
              {/* SHARE — Only for admin/warehouse */}
              {isAdminOrWarehouse && (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md hover:bg-[#f9fafb]"
                >
                  <Share2 size={16} />
                  Share
                </button>
              )}
  
              {/* RETURN INVOICE — Available for all users, but NOT for return/refund/cancel invoices */}
              {!["return", "refund", "cancel"].includes((invoice?.category || "").toLowerCase()) && (
                <button
                  onClick={handleOpenReturnModal}
                  disabled={invoice?.returnStatus === "full"}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white border rounded-md ${
                    invoice?.returnStatus === "full"
                      ? "bg-gray-400 border-gray-400 cursor-not-allowed opacity-60"
                      : "bg-[#ef4444] border-[#ef4444] hover:bg-[#dc2626]"
                  }`}
                  title={invoice?.returnStatus === "full" ? "This invoice has been fully returned and cannot be returned again" : ""}
                >
                  ↩ Return
                </button>
              )}

              {/* EDIT — Only for admin/warehouse */}
              {isAdminOrWarehouse && (
                <Link
                  to={`/sales/invoices/${id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563eb] border border-[#2563eb] rounded-md hover:bg-[#1d4ed8]"
                >
                  <Edit size={16} />
                  Edit
                </Link>
              )}
  
              {/* MORE OPTIONS — Only for admin/warehouse */}
              {isAdminOrWarehouse && (
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md hover:bg-[#f9fafb]">
                  <MoreHorizontal size={16} />
                </button>
              )}
            </div>
          </div>
  

        {/* Invoice Document - Zoho Template Style */}
        <div id="printable-invoice" className="bg-white shadow-lg border-2 border-[#000] max-w-4xl mx-auto">
          {/* Green PAID Banner */}
          <div className="relative">
            <div className="absolute top-4 left-4 bg-[#10b981] text-white px-3 py-1 text-sm font-bold transform -rotate-45 origin-top-left">
              PAID
            </div>
          </div>

          {/* Invoice Content */}
          <div className="p-8">
            {/* Header Section */}
            <div className="border-2 border-[#000]">
              <div className="grid grid-cols-2">
                {/* Left - Company Info */}
                <div className="border-r-2 border-[#000] p-4">
                  <h1 className="text-xl font-bold text-[#000] mb-3">
                    {storeInfo?.name || invoice.branch || "Grooms Wedding Hub"}
                  </h1>
                  <div className="text-sm text-[#000] space-y-1">
                    {storeInfo?.address && <div>{storeInfo.address}</div>}
                    {storeInfo?.city && <div>{storeInfo.city}</div>}
                    {storeInfo?.state && <div>{storeInfo.state}</div>}
                    {!storeInfo?.address && !storeInfo?.city && <div>Kerala</div>}
                    {!storeInfo?.state && <div>INDIA</div>}
                    <div>GSTIN: 32AEHCR4208L1ZS</div>
                  </div>
                </div>

                {/* Right - Invoice Details */}
                <div className="p-4">
                  <div className="text-right mb-4">
                    <h2 className="text-2xl font-bold text-[#000]">TAX INVOICE</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-[#000]">Invoice Date</div>
                    <div className="font-medium">: {formatDate(invoice.invoiceDate)}</div>
                    <div className="text-[#000]">Terms</div>
                    <div className="font-medium">: {invoice.terms}</div>
                  </div>
                </div>
              </div>

              {/* Invoice Number Section */}
              <div className="border-t-2 border-[#000] grid grid-cols-2">
                <div className="border-r-2 border-[#000] p-3">
                  <div className="text-sm text-[#000]">
                    <div>Invoice Date: {formatDate(invoice.invoiceDate)}</div>
                    <div>Place Of Supply: Kerala (32)</div>
                    <div>Sales person: {invoice.salesperson || "NIYAS"}</div>
                  </div>
                </div>
                <div className="p-3 text-right">
                  <div className="text-lg font-bold text-[#000]">{invoice.invoiceNumber}</div>
                </div>
              </div>

              {/* Bill To Section */}
              <div className="border-t-2 border-[#000] p-4">
                <div className="text-sm font-semibold text-[#000] mb-2">Bill To</div>
                <div className="text-base font-bold text-[#000]">{invoice.customer}</div>
                {invoice.customerPhone && (
                  <div className="text-sm text-[#000] mt-1">Phone: {invoice.customerPhone}</div>
                )}
              </div>

               {/* Items Table */}
               <div className="border-t-2 border-[#000]">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="border-b-2 border-[#000]">
                       <th className="border-r border-[#000] px-2 py-2 text-center font-semibold text-[#000]">#</th>
                       <th className="border-r border-[#000] px-2 py-2 text-left font-semibold text-[#000]">Item & Description</th>
                       <th className="border-r border-[#000] px-2 py-2 text-center font-semibold text-[#000]">Size</th>
                       <th className="border-r border-[#000] px-2 py-2 text-center font-semibold text-[#000]">HSN/SAC</th>
                       <th className="border-r border-[#000] px-2 py-2 text-center font-semibold text-[#000]">Qty</th>
                       <th className="border-r border-[#000] px-2 py-2 text-center font-semibold text-[#000]">Rate</th>
                       <th className="border-r border-[#000] px-2 py-2 text-center font-semibold text-[#000]">CGST</th>
                       <th className="border-r border-[#000] px-2 py-2 text-center font-semibold text-[#000]">SGST</th>
                       <th className="px-2 py-2 text-center font-semibold text-[#000]">Amount</th>
                     </tr>
                   </thead>
                   <tbody>
                     {(() => {
                       // Use return invoice items if available, otherwise use invoice line items
                       const itemsToDisplay = (invoice.lineItems && invoice.lineItems.length > 0) 
                         ? invoice.lineItems 
                         : returnInvoiceItems;

                       if (!itemsToDisplay || itemsToDisplay.length === 0) {
                         return (
                           <tr>
                             <td colSpan="9" className="px-4 py-8 text-center text-[#666]">
                               <div className="text-sm">
                                 This invoice has been fully returned. Line items were cleared.
                               </div>
                               <div className="text-xs mt-2">
                                 Unable to retrieve item details from return invoice.
                               </div>
                             </td>
                           </tr>
                         );
                       }

                       return itemsToDisplay.map((item, index) => {
                       // Get real data from itemData or use defaults
                       const itemData = item.itemData || {};
                       const hsnCode = itemData.hsnCode || itemData.hsn || "61051010";
                       const cgstPercent = parseFloat(item.cgstPercent || 0);
                       const sgstPercent = parseFloat(item.sgstPercent || 0);
                       const cgstAmount = parseFloat(item.cgstAmount || 0);
                       const sgstAmount = parseFloat(item.sgstAmount || 0);
                       const baseAmount = parseFloat(item.baseAmount || item.amount || 0);
                       
                       return (
                         <tr key={index} className="border-b border-[#000]">
                           <td className="border-r border-[#000] px-2 py-2 text-center text-[#000]">{index + 1}</td>
                           <td className="border-r border-[#000] px-2 py-2 text-[#000]">
                             <div className="font-medium">{item.item || itemData.itemName}</div>
                             {itemData.description && (
                               <div className="text-xs text-[#666] mt-1">{itemData.description}</div>
                             )}
                           </td>
                           <td className="border-r border-[#000] px-2 py-2 text-center text-[#000]">
                             {item.size || itemData.size || "42"}
                           </td>
                           <td className="border-r border-[#000] px-2 py-2 text-center text-[#000]">
                             {hsnCode}
                           </td>
                           <td className="border-r border-[#000] px-2 py-2 text-center font-medium text-[#000]">
                             {parseFloat(item.quantity || 0).toFixed(2)}<br/>
                             <span className="text-xs">pcs</span>
                           </td>
                           <td className="border-r border-[#000] px-2 py-2 text-right font-medium text-[#000]">
                             {parseFloat(item.rate || 0).toLocaleString('en-IN', {
                               minimumFractionDigits: 2,
                               maximumFractionDigits: 2
                             })}
                           </td>
                           <td className="border-r border-[#000] px-2 py-2 text-center text-[#000]">
                             <div>{cgstPercent > 0 ? cgstPercent.toFixed(1) : '2.5'}%</div>
                             <div className="font-medium">{cgstAmount > 0 ? cgstAmount.toFixed(2) : (baseAmount * 0.025).toFixed(2)}</div>
                           </td>
                           <td className="border-r border-[#000] px-2 py-2 text-center text-[#000]">
                             <div>{sgstPercent > 0 ? sgstPercent.toFixed(1) : '2.5'}%</div>
                             <div className="font-medium">{sgstAmount > 0 ? sgstAmount.toFixed(2) : (baseAmount * 0.025).toFixed(2)}</div>
                           </td>
                           <td className="px-2 py-2 text-right font-bold text-[#000]">
                             {parseFloat(item.rate || 0).toLocaleString('en-IN', {
                               minimumFractionDigits: 2,
                               maximumFractionDigits: 2
                             })}
                           </td>
                         </tr>
                       );
                     })})()}
                   </tbody>
                 </table>
               </div>

              {/* Totals Section */}
              <div className="border-t-2 border-[#000] grid grid-cols-2">
                {/* Left - Notes */}
                <div className="border-r-2 border-[#000] p-4">
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-[#000] mb-2">Total in Words</div>
                    <div className="text-sm text-[#000] italic">
                      Rupees One Thousand One Hundred Only
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-semibold text-[#000] mb-2">Notes</div>
                    <div className="text-sm text-[#000]">
                      {invoice.customerNotes || "Thanks for your business."}
                    </div>
                  </div>
                </div>

                {/* Right - Calculations */}
                <div className="p-4">
                  {(() => {
                    // Compute from lineItems as fallback when stored totals are 0/missing
                    const storedSubTotal = parseFloat(invoice.subTotal || 0);
                    const storedTotalTax = parseFloat(invoice.totalTax || 0);
                    const storedFinalTotal = parseFloat(invoice.finalTotal || 0);

                    const lineItems = invoice.lineItems || [];
                    const computedSubTotal = lineItems.reduce((s, i) => s + (parseFloat(i.lineTotal) || (parseFloat(i.quantity || 0) * parseFloat(i.rate || 0))), 0);
                    const computedTotalTax = lineItems.reduce((s, i) => s + (parseFloat(i.cgstAmount || 0)) + (parseFloat(i.sgstAmount || 0)) + (parseFloat(i.igstAmount || 0)), 0);

                    const displaySubTotal = storedSubTotal > 0 ? storedSubTotal : computedSubTotal;
                    const displayTotalTax = storedTotalTax > 0 ? storedTotalTax : computedTotalTax;
                    const displayFinalTotal = storedFinalTotal > 0 ? storedFinalTotal : (computedSubTotal - parseFloat(invoice.discountAmount || 0) - parseFloat(invoice.tdsTcsAmount || 0) + parseFloat(invoice.adjustmentAmount || 0));

                    return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#000]">Sub Total</span>
                      <span className="font-medium text-[#000]">{displaySubTotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-[#000]">CGST @ 2.5%</span>
                      <span className="font-medium text-[#000]">{(displayTotalTax / 2).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-[#000]">SGST @ 2.5%</span>
                      <span className="font-medium text-[#000]">{(displayTotalTax / 2).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between font-bold border-t border-[#000] pt-2">
                      <span className="text-[#000]">Total</span>
                      <span className="text-[#000]">₹{displayFinalTotal.toFixed(2)}</span>
                    </div>
                    
                    {invoice.tdsTcsAmount > 0 && (
                      <div className="flex justify-between text-[#ef4444]">
                        <span>Payment Made</span>
                        <span>(-) ₹{parseFloat(invoice.tdsTcsAmount || 0).toFixed(2)}</span>
                      </div>
                    )}

                    {parseFloat(invoice.adjustmentAmount || 0) !== 0 && (
                      <div className="flex justify-between text-[#000]">
                        <span>Adjustment</span>
                        <span>
                          {parseFloat(invoice.adjustmentAmount || 0) > 0 ? "(+)" : "(-)"} ₹{Math.abs(parseFloat(invoice.adjustmentAmount || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold">
                      <span className="text-[#000]">Balance Due</span>
                      <span className="text-[#000]">₹{displayFinalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                    );
                  })()}
                </div>
              </div>

              {/* Signature Section */}
              <div className="border-t-2 border-[#000] col-span-2 p-4 text-right">
                <div className="text-sm font-semibold text-[#000] mb-8">Authorised Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* RETURN INVOICE MODAL */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1f2937]">Return Invoice</h2>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-[#6b7280] hover:text-[#1f2937]"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Original Invoice Info */}
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4">
                <p className="text-sm text-[#6b7280] mb-2">Original Invoice</p>
                <p className="text-lg font-semibold text-[#1f2937]">{invoice.invoiceNumber}</p>
                <p className="text-sm text-[#6b7280] mt-1">{invoice.customer}</p>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-sm font-semibold text-[#6b7280] mb-2">
                  Reason for Return <span className="text-[#ef4444]">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g., Damaged product, Wrong item, Customer request..."
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded-lg text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  rows="3"
                />
              </div>

              {/* ✅ NEW: Payment Method Selection */}
              <div>
                <label className="block text-sm font-semibold text-[#6b7280] mb-2">
                  Refund Payment Method <span className="text-[#ef4444]">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="returnPaymentMethod"
                      value="Cash"
                      checked={returnPaymentMethod === "Cash"}
                      onChange={(e) => setReturnPaymentMethod(e.target.value)}
                      className="w-4 h-4 text-[#2563eb] border-[#d1d5db] focus:ring-2 focus:ring-[#2563eb]/20"
                    />
                    <span className="text-sm text-[#1f2937]">Cash</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="returnPaymentMethod"
                      value="RBL"
                      checked={returnPaymentMethod === "RBL"}
                      onChange={(e) => setReturnPaymentMethod(e.target.value)}
                      className="w-4 h-4 text-[#2563eb] border-[#d1d5db] focus:ring-2 focus:ring-[#2563eb]/20"
                    />
                    <span className="text-sm text-[#1f2937]">RBL</span>
                  </label>
                </div>
                <p className="text-xs text-[#6b7280] mt-2">
                  Select how the refund amount will be returned to the customer
                </p>
              </div>

              {/* Items to Return */}
              <div>
                <label className="block text-sm font-semibold text-[#6b7280] mb-3">
                  Select Items to Return
                </label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {returnItems.map((item, index) => {
                    const isReturnable = item.itemData?.returnable === true; // Only true if explicitly returnable
                    return (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-4 ${
                          isReturnable 
                            ? "border-[#e5e7eb]" 
                            : "border-[#fecaca] bg-[#fef2f2] opacity-75"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#1f2937]">{item.item}</p>
                              {!isReturnable && (
                                <span className="text-xs px-2 py-1 bg-[#fee2e2] text-[#991b1b] rounded-md font-medium">
                                  Not Returnable
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#6b7280] mt-1">
                              Original Qty: {parseFloat(item.quantity || 0).toFixed(2)} pcs
                            </p>
                          </div>
                          <p className="text-sm font-medium text-[#1f2937]">
                            ₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-[#6b7280]">Return Qty:</label>
                          <input
                            type="number"
                            min="0"
                            max={parseFloat(item.quantity || 0)}
                            step="0.01"
                            value={item.returnQuantity || 0}
                            onChange={(e) => handleReturnQuantityChange(index, e.target.value)}
                            onFocus={(e) => {
                              if (!isReturnable) {
                                e.target.blur();
                                alert(`Item "${item.item || item.itemData?.itemName || 'Unknown'}" cannot be returned as it is not marked as returnable. Please enable the "Returnable Item" option in the product settings to return this item.`);
                              }
                            }}
                            disabled={!isReturnable}
                            className={`w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                              isReturnable
                                ? "border-[#d1d5db] text-[#1f2937] focus:border-[#2563eb] focus:ring-[#2563eb]/20"
                                : "border-[#fecaca] bg-[#fee2e2] text-[#991b1b] cursor-not-allowed opacity-60"
                            }`}
                            title={!isReturnable ? `Item "${item.item || item.itemData?.itemName || 'Unknown'}" cannot be returned. Enable "Returnable Item" in product settings.` : ""}
                          />
                          <span className="text-sm text-[#6b7280]">pcs</span>
                          {item.returnQuantity > 0 && isReturnable && (
                            <span className="text-sm font-medium text-[#ef4444]">
                              - ₹{calculateReturnAmountWithTax(item).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </div>
                        {!isReturnable && (
                          <p className="text-xs text-[#991b1b] mt-2 italic">
                            This item cannot be returned as it is not marked as returnable.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Summary */}
              {returnItems.some((item) => item.returnQuantity > 0) && (
                <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-lg p-4">
                  <p className="text-sm text-[#6b7280] mb-2">Return Summary</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6b7280]">Items to Return:</span>
                      <span className="font-medium text-[#1f2937]">
                        {returnItems.reduce((sum, item) => sum + (item.returnQuantity || 0), 0).toFixed(2)} pcs
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-[#fee2e2] pt-2 mt-2">
                      <span className="text-[#1f2937]">Return Amount:</span>
                      <span className="text-[#ef4444]">
                        - ₹{calculateTotalReturnAmountWithTax().toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-[#e5e7eb] px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-md hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={returningInvoice}
                className="px-4 py-2 text-sm font-medium text-white bg-[#ef4444] rounded-md hover:bg-[#dc2626] disabled:opacity-50"
              >
                {returningInvoice ? "Creating..." : "Create Return Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoiceDetail;
