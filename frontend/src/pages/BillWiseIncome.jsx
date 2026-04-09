import { CSVLink } from "react-csv";
import Headers from '../components/Header.jsx';
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Select from "react-select";
import useFetch from '../hooks/useFetch.jsx';
import baseUrl from '../api/api.js';
import { FiRefreshCw } from "react-icons/fi";
import { useEnterToSave } from "../hooks/useEnterToSave";




const headers = [
    { label: "Date", key: "date", },
    { label: "Invoice No", key: "invoiceNo" },
    { label: "Customer Name", key: "customerName" },
    { label: "Category", key: "Category" },
    { label: "Sub Category", key: "SubCategory" },
    { label: "Balance Payable", key: "SubCategory1" },
    { label: "Remarks", key: "remarks" },
    { label: "Amount", key: "amount" },
    { label: "Total Transaction", key: "totalTransaction" },
    { label: "Discount", key: "discountAmount" },
    { label: "Bill Value", key: "billValue" },
    { label: "security", key: "securityAmount" },
    { label: "Balance Payable", key: "Balance" },
    { label: "Remark", key: "remark" },
    { label: "Cash", key: "cash" },
    { label: "RBL", key: "rbl" },
    { label: "Bank", key: "bank" },
    { label: "UPI", key: "upi" },
];

const categories = [
    { value: "all", label: "All" },
    { value: "booking", label: "Booking" },
    { value: "RentOut", label: "Rent Out" },
    { value: "Refund", label: "Refund" },
    { value: "Return", label: "Return" },
    { value: "Cancel", label: "Cancel" },

    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
    { value: "money transfer", label: "Cash to Bank" },
];

const subCategories = [
    { value: "all", label: "All" },
    { value: "advance", label: "Advance" },
    { value: "Balance Payable", label: "Balance Payable" },
    { value: "security", label: "Security" },
    { value: "cancellation Refund", label: "Cancellation Refund" },
    { value: "security Refund", label: "Security Refund" },
    { value: "compensation", label: "Compensation" },
    { value: "petty expenses", label: "Petty Expenses" },
    { value: "shoe sales", label: "Shoe Sales" },
    { value: "shirt sales", label: "Shirt Sales" },
    { value: "mixed sales", label: "Mixed Sales (Shoes & Shirts)" },
    { value: "bulk amount transfer", label: "Bulk Amount Transfer" }
];



const denominations = [
    { label: "500", value: 500 },
    { label: "200", value: 200 },
    { label: "100", value: 100 },
    { label: "50", value: 50 },
    { label: "20", value: 20 },
    { label: "10", value: 10 },
    { label: "Coins", value: 1 },
];

// const opening = [{ cash: "60000", bank: "54000" }];

const DayBookInc = () => {

    const [preOpen, setPreOpen] = useState([])
    const [preOpen1, setPreOpen1] = useState(null)
    const [loading, setLoading] = useState(false)
    
    // Edit functionality states
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedTransaction, setEditedTransaction] = useState({});
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Store for edited transactions to override TWS data (using object for proper React re-renders)
    const [editedTransactionsMap, setEditedTransactionsMap] = useState({});

    // Filter states - moved up to fix initialization order
    const [selectedCategory, setSelectedCategory] = useState(categories[0]);
    const [selectedSubCategory, setSelectedSubCategory] = useState(subCategories[0]);
    const [quantities, setQuantities] = useState(() => {
        // On load, restore saved denomination quantities if day is already closed
        const saved = localStorage.getItem(`denominations_${new Date().toISOString().split("T")[0]}_${JSON.parse(localStorage.getItem("rootfinuser"))?.locCode}`);
        return saved ? JSON.parse(saved) : Array(denominations.length).fill("");
    });

    const currentusers = JSON.parse(localStorage.getItem("rootfinuser"));
    const showAction = (currentusers?.power || "").toLowerCase() === "admin";


    const date1 = new Date();
    const previousDate = new Date(date1);
    previousDate.setDate(date1.getDate() - 1);
    const TodayDate = `${String(date1.getDate()).padStart(2, '0')}-${String(date1.getMonth() + 1).padStart(2, '0')}-${date1.getFullYear()}`;
    const previousDate1 = `${String(previousDate.getDate()).padStart(2, '0')}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${previousDate.getFullYear()}`;
    const date = TodayDate;

    // alert(TodayDate);
    // console.log(currentusers);
    const currentDate = new Date().toISOString().split("T")[0];
    // Convert "04-04-2025" to "2025-04-04"
    const formatDate = (inputDate) => {
        const [day, month, year] = inputDate.split("-");
        return `${year}-${month}-${day}`;
    };

    // Example usage:

    const formattedDate = formatDate(previousDate1); // "2025-04-04"
    console.log(formattedDate);


    const apiUrl = `https://rentalapi.rootments.live/api/GetBooking/GetBookingList?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiurl1 = `https://rentalapi.rootments.live/api/GetBooking/GetRentoutList?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiUrl2 = `https://rentalapi.rootments.live/api/GetBooking/GetReturnList?LocCode=${currentusers?.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`
    const apiUrl3 = `https://rentalapi.rootments.live/api/GetBooking/GetDeleteList?LocCode=${currentusers.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`
    // Use the new Day Book API that includes invoice transactions
    const apiUrl4 = `${baseUrl.baseUrl}api/daybook?locCode=${currentusers.locCode}&date=${currentDate}`;
    const apiUrl4_fallback = `${baseUrl.baseUrl}user/Getpayment?LocCode=${currentusers.locCode}&DateFrom=${currentDate}&DateTo=${currentDate}`;
    const apiUrl5 = `${baseUrl.baseUrl}user/saveCashBank`
    const apiUrl6 = `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${currentusers.locCode}&date=${formattedDate}`
    const apiUrl7 = `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${currentusers.locCode}&date=${currentDate}`

    // alert(apiurl1)

    const locCode = currentusers?.locCode
    const email = currentusers?.email

    // alert(apiurl1)

    const printRef = useRef(null);

    const handlePrint = () => {
        window.print();
    };


    // alert(previousDate1)


    const fetchOptions = useMemo(() => ({}), []);

    const { data } = useFetch(apiUrl, fetchOptions);
    const { data: data1 } = useFetch(apiurl1, fetchOptions);
    const { data: data2 } = useFetch(apiUrl2, fetchOptions);
    // alert(apiUrl2)
    const { data: data3 } = useFetch(apiUrl3, fetchOptions);

    const [dayBookData, setDayBookData] = useState([]);

    // Fetch mongo transactions once on mount
    useEffect(() => {
        fetch(apiUrl4_fallback)
            .then(r => r.ok ? r.json() : null)
            .then(json => setDayBookData(json?.data || []))
            .catch(() => setDayBookData([]));
    }, []);

    // Show table as soon as any data is available
    const isDataReady = true;

    // Memoized constants for better performance - MOVED UP to fix initialization order
    const allowedMongoCategories = useMemo(() => [
        // Original categories
        "petty expenses",
        "staff reimbursement", 
        "maintenance expenses",
        "telephone internet",
        "utility bill",
        "salary",
        "rent",
        "courier charges",
        "asset purchase",
        "promotion_services",
        "spot incentive",
        "bulk amount transfer",
        "other expenses",
        "shoe sales return",
        "shirt sales return",
        "cash to bank",
        "bank to cash",
        "compensation",
        "shoe sales",
        "shirt sales",
        "write off",
        "booking",
        "receivable",
        "sales",
        "income",
        "expense",
        "money transfer",
        "return",
        "refund",
        "cancel",
        "rentout",
        "rent out",
        // New expense categories from updated Expenses.jsx
        "dry cleaning",
        "altration",
        "material",
        "travel exp",
        "fuel exp",
        "waste management",
        "water charges",
        "printing stationary",
        "staff welfare",
        "staff accommodation",
        "incentive",
        // Income categories
        "advance",
        "balance payable",
        "compensation from cancellation",
        "compensation from product damage",
    ], []);

    // Process all transactions only when everything is loaded
    // Memoized transaction processing for better performance
    const processedTransactions = useMemo(() => {
        if (!isDataReady) return { booking: [], rentOut: [], return: [], cancel: [], mongo: [] };

        const bookingTransactions = (data?.dataSet?.data || []).map(transaction => {
            const bookingCashAmount = parseInt(transaction?.bookingCashAmount || 0, 10);
            const bookingBankAmount = parseInt(transaction?.bookingBankAmount || 0, 10);
            const bookingUPIAmount = parseInt(transaction?.bookingUPIAmount || 0, 10);
            const rblAmount = parseInt(transaction?.rblRazorPay || 0, 10);
            const invoiceAmount = parseInt(transaction?.invoiceAmount || 0, 10);
            const discountAmount = parseInt(transaction?.discountAmount || 0, 10);

            const totalAmount = bookingCashAmount + bookingBankAmount + bookingUPIAmount + rblAmount;

            return {
                ...transaction,
                date: transaction?.bookingDate || null,
                bookingCashAmount,
                bookingBankAmount,
                billValue: transaction.invoiceAmount,
                discountAmount: discountAmount,
                invoiceAmount,
                bookingBank1: bookingBankAmount,
                TotaltransactionBooking: totalAmount,
                Category: "Booking",
                SubCategory: "Advance",
                totalTransaction: totalAmount,
                cash: bookingCashAmount,
                rbl: rblAmount,
                bank: bookingBankAmount,
                upi: bookingUPIAmount,
                amount: totalAmount,
            };
        });

        const rentOutTransactions = (data1?.dataSet?.data || []).map(transaction => {
            const rentoutCashAmount = parseInt(transaction?.rentoutCashAmount ?? 0, 10);
            const rentoutBankAmount = parseInt(transaction?.rentoutBankAmount ?? 0, 10);
            const invoiceAmount = parseInt(transaction?.invoiceAmount ?? 0, 10);
            const advanceAmount = parseInt(transaction?.advanceAmount ?? 0, 10);
            const rentoutUPIAmount = parseInt(transaction?.rentoutUPIAmount ?? 0, 10);
            const rblAmount = parseInt(transaction?.rblRazorPay ?? 0, 10);
            const securityAmount = parseInt(transaction?.securityAmount ?? 0, 10);

            return {
                ...transaction,
                date: transaction?.rentOutDate ?? "",
                rentoutCashAmount,
                rentoutBankAmount,
                invoiceAmount,
                discountAmount: parseInt(transaction.discountAmount || 0),
                billValue: transaction.invoiceAmount,
                securityAmount,
                advanceAmount,
                Balance: invoiceAmount - advanceAmount,
                rentoutUPIAmount,
                Category: "RentOut",
                SubCategory: "Security",
                SubCategory1: "Balance Payable",
                totalTransaction: rentoutCashAmount + rentoutBankAmount + rentoutUPIAmount + rblAmount,
                cash: rentoutCashAmount,
                rbl: rblAmount,
                bank: rentoutBankAmount,
                upi: rentoutUPIAmount,
                amount: rentoutCashAmount + rentoutBankAmount + rentoutUPIAmount + rblAmount,
            };
        });

        const returnOutTransactions = (data2?.dataSet?.data || []).map(transaction => {
            const returnCashAmount = -(parseInt(transaction?.returnCashAmount || 0, 10));
            const returnRblAmount = -(parseInt(transaction?.rblRazorPay || 0, 10));
            const returnBankAmount = returnRblAmount !== 0 ? 0 : -(parseInt(transaction?.returnBankAmount || 0, 10));
            const returnUPIAmount = returnRblAmount !== 0 ? 0 : -(parseInt(transaction?.returnUPIAmount || 0, 10));
            const invoiceAmount = parseInt(transaction?.invoiceAmount || 0, 10);
            const advanceAmount = parseInt(transaction?.advanceAmount || 0, 10);
            const RsecurityAmount = -(parseInt(transaction?.securityAmount || 0, 10));

            const totalAmount = returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount;

            return {
                ...transaction,
                date: transaction?.returnedDate || null,
                returnBankAmount,
                returnCashAmount,
                returnUPIAmount,
                invoiceAmount,
                advanceAmount,
                discountAmount: parseInt(transaction.discountAmount || 0),
                billValue: invoiceAmount,
                amount: totalAmount,
                totalTransaction: totalAmount,
                RsecurityAmount,
                Category: "Return",
                SubCategory: "Security Refund",
                cash: returnCashAmount,
                rbl: returnRblAmount,
                bank: returnBankAmount,
                upi: returnUPIAmount,
            };
        });

        const canCelTransactions = (data3?.dataSet?.data || []).map(transaction => {
            const deleteCashAmount = -Math.abs(parseInt(transaction.deleteCashAmount || 0));
            const deleteRblAmount = -Math.abs(parseInt(transaction.rblRazorPay || 0));
            const originalRblAmount = parseInt(transaction.rblRazorPay || 0);
            const deleteBankAmount = originalRblAmount !== 0 ? 0 : -Math.abs(parseInt(transaction.deleteBankAmount || 0));
            const deleteUPIAmount = originalRblAmount !== 0 ? 0 : -Math.abs(parseInt(transaction.deleteUPIAmount || 0));

            const totalAmount = deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount;

            return {
                ...transaction,
                date: transaction.cancelDate,
                Category: "Cancel",
                SubCategory: "cancellation Refund",
                discountAmount: parseInt(transaction.discountAmount || 0),
                billValue: transaction.invoiceAmount,
                amount: totalAmount,
                totalTransaction: totalAmount,
                cash: deleteCashAmount,
                rbl: deleteRblAmount,
                bank: deleteBankAmount,
                upi: deleteUPIAmount,
            };
        });

        const expenseCategoryValues = new Set([
            "petty expenses","staff reimbursement","maintenance expenses","telephone internet",
            "utility bill","salary","rent","courier charges","asset purchase","promotion_services",
            "spot incentive","bulk amount transfer","other expenses","shoe sales return",
            "shirt sales return","dry cleaning","altration","material","travel exp","fuel exp",
            "waste management","water charges","printing stationary","staff welfare",
            "staff accommodation","incentive","write off",
        ]);
        const incomeCategoryValues = new Set([
            "shoe sales","shirt sales","mixed sales","compensation","advance","balance payable",
            "compensation from cancellation","compensation from product damage",
        ]);
        const inferType = (tx) => {
            const t = (tx.type || "").toLowerCase();
            if (t) return tx.type;
            const c = (tx.category || tx.Category || "").toLowerCase();
            if (expenseCategoryValues.has(c)) return "expense";
            if (incomeCategoryValues.has(c)) return "income";
            return tx.Category || tx.category || "";
        };

        const mongoTransactions = (dayBookData || []).filter(transaction => {
            const cat = (transaction.category || transaction.Category || "").toLowerCase();
            return allowedMongoCategories.includes(cat);
        }).map(transaction => {
            const isReturn = (transaction.type || "").toLowerCase() === "return";
            const rawSubCat = transaction.subCategory || transaction.SubCategory || transaction.category || "";
            const subCatLabel = isReturn && rawSubCat && !rawSubCat.toLowerCase().endsWith("return")
                ? `${rawSubCat} Return`
                : rawSubCat;
            return {
            ...transaction,
            locCode: currentusers.locCode,
            date: transaction.date ? transaction.date.split("T")[0] : transaction.date,
            Category: inferType(transaction),
            SubCategory: subCatLabel,
            invoiceNo: transaction.invoiceNo || transaction.invoiceNumber || transaction.invoiceId || transaction.locCode,
            customerName: transaction.customerName || transaction.customer || transaction.custName || "",
            cash1: transaction.cash,
            bank1: transaction.bank,
            discountAmount: parseInt(transaction.discountAmount || 0),
            billValue: transaction.billValue || transaction.invoiceAmount || transaction.amount || 0,
            Tupi: transaction.upi,
            rbl: transaction.rbl || transaction.rblRazorPay || 0,
            cash: transaction.cash !== undefined ? transaction.cash : transaction.cash1,
            bank: transaction.bank !== undefined ? transaction.bank : transaction.bank1,
            upi: transaction.upi !== undefined ? transaction.upi : transaction.Tupi,
            amount: transaction.amount || 0,
            totalTransaction: transaction.totalTransaction || (parseInt(transaction.cash || 0) + parseInt(transaction.bank || 0) + parseInt(transaction.upi || 0) + parseInt(transaction.rbl || transaction.rblRazorPay || 0)),
            remark: subCatLabel || transaction.remark || transaction.remarks || ""
        };});

        return {
            booking: bookingTransactions,
            rentOut: rentOutTransactions,
            return: returnOutTransactions,
            cancel: canCelTransactions,
            mongo: mongoTransactions
        };
    }, [data, data1, data2, data3, dayBookData, isDataReady, currentusers.locCode, allowedMongoCategories]);

    // Memoized combined transactions with edit overrides
    const allTransactions = useMemo(() => {
        const { booking, rentOut, return: returnTx, cancel, mongo } = processedTransactions;
        
        return [
            ...booking,
            ...rentOut,
            ...returnTx,
            ...cancel,
            ...mongo
        ].map(t => {
            // Check if this transaction has been edited
            const key = String(t.invoiceNo).trim();
            const override = editedTransactionsMap[key];
            
            if (override) {
                const isRentOut = (t.Category || '').toLowerCase() === 'rentout';
                const isBooking = (t.Category || '').toLowerCase() === 'booking';
                const isReturn = (t.Category || '').toLowerCase() === 'return';
                const isCancel = (t.Category || '').toLowerCase() === 'cancel';
                
                const editedTotal = override.cash + override.rbl + override.bank + override.upi;
                
                return {
                    ...t,
                    _id: override._id,
                    cash: override.cash,
                    rbl: override.rbl,
                    bank: override.bank,
                    upi: override.upi,
                    cash1: override.cash,
                    bank1: override.bank,
                    Tupi: override.upi,
                    rblRazorPay: override.rbl,
                    securityAmount: isRentOut ? override.securityAmount : t.securityAmount,
                    Balance: isRentOut ? override.Balance : t.Balance,
                    rentoutCashAmount: isRentOut ? override.cash : t.rentoutCashAmount,
                    rentoutBankAmount: isRentOut ? override.bank : t.rentoutBankAmount,
                    rentoutUPIAmount: isRentOut ? override.upi : t.rentoutUPIAmount,
                    bookingCashAmount: isBooking ? override.cash : t.bookingCashAmount,
                    bookingBankAmount: isBooking ? override.bank : t.bookingBankAmount,
                    bookingBank1: isBooking ? override.bank : t.bookingBank1,
                    bookingUPIAmount: isBooking ? override.upi : t.bookingUPIAmount,
                    TotaltransactionBooking: isBooking ? editedTotal : t.TotaltransactionBooking,
                    returnCashAmount: isReturn ? override.cash : t.returnCashAmount,
                    returnBankAmount: isReturn ? override.bank : t.returnBankAmount,
                    returnUPIAmount: isReturn ? override.upi : t.returnUPIAmount,
                    returnRblAmount: isReturn ? override.rbl : t.returnRblAmount,
                    deleteCashAmount: isCancel ? -Math.abs(override.cash) : t.deleteCashAmount,
                    deleteBankAmount: isCancel ? -Math.abs(override.bank) : t.deleteBankAmount,
                    deleteUPIAmount: isCancel ? -Math.abs(override.upi) : t.deleteUPIAmount,
                    amount: override.amount || editedTotal,
                    totalTransaction: override.totalTransaction || editedTotal,
                };
            }
            return t;
        });
    }, [processedTransactions, editedTransactionsMap]);

    // Memoized deduplication for better performance
    const dedupedTransactions = useMemo(() => {
        return Array.from(
            new Map(
                allTransactions.map((tx) => {
                    const dateKey = tx.date ? new Date(tx.date).toISOString().split("T")[0] : "";
                    const invoiceKey = tx.invoiceNo || tx._id || tx.locCode || "";
                    const categoryKey = tx.Category || tx.category || "";
                    const key = `${invoiceKey}-${dateKey}-${categoryKey}`;
                    return [key, tx];
                })
            ).values()
        );
    }, [allTransactions]);

    // Memoized filtered transactions
    const filteredTransactions = useMemo(() => {
        const selectedCategoryValue = selectedCategory?.value?.toLowerCase() || "all";
        const selectedSubCategoryValue = selectedSubCategory?.value?.toLowerCase() || "all";

        return dedupedTransactions.filter((t) =>
            (selectedCategoryValue === "all" || (t.category?.toLowerCase() === selectedCategoryValue || t.Category?.toLowerCase() === selectedCategoryValue || t.type?.toLowerCase() === selectedCategoryValue)) &&
            (selectedSubCategoryValue === "all" || (t.subCategory?.toLowerCase() === selectedSubCategoryValue || t.SubCategory?.toLowerCase() === selectedSubCategoryValue || t.type?.toLowerCase() === selectedSubCategoryValue || t.subCategory1?.toLowerCase() === selectedSubCategoryValue || t.SubCategory1?.toLowerCase() === selectedSubCategoryValue || t.category?.toLowerCase() === selectedSubCategoryValue))
        );
    }, [dedupedTransactions, selectedCategory?.value, selectedSubCategory?.value]);

    // ✅ CRITICAL FIX: Use 'cash' field (calculated closing cash) for opening balance, not 'Closecash' (physical cash)
    const openingCash = parseInt(preOpen?.cash ?? preOpen?.Closecash ?? 0, 10);

    // Memoized totals calculation
    const calculatedTotals = useMemo(() => {
        const bankAmount = filteredTransactions?.reduce((sum, item) =>
            sum +
            (parseInt(item.bookingBankAmount, 10) || 0) +
            (parseInt(item.rentoutBankAmount, 10) || 0) +
            (parseInt(item.rentoutUPIAmount, 10) || 0) +
            (parseInt(item.bookingUPIAmount, 10) || 0) +
            (parseInt(item.deleteBankAmount, 10) || 0) * -1 +
            (parseInt(item.deleteUPIAmount, 10) || 0) * -1 +
            (parseInt(item.returnBankAmount, 10) || 0),
            0
        ) || 0;

        const bankAmount1 = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.bank, 10) || 0),
            0
        ) || 0;

        const bankAmountupi = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.upi, 10) || 0),
            0
        ) || 0;

        const rblAmount = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.rbl, 10) || 0),
            0
        ) || 0;

        const dayCashTransactions = filteredTransactions?.reduce((sum, item) =>
            sum + (parseInt(item.cash, 10) || 0),
            0
        ) || 0;

        const totalCash = dayCashTransactions + openingCash;

        return {
            totalBankAmount: bankAmount,
            totalBankAmount1: bankAmount1,
            totalBankAmountupi: bankAmountupi,
            totalRblAmount: rblAmount,
            dayCashTransactions,
            totalCash
        };
    }, [filteredTransactions, openingCash]);

    const handleChange = useCallback((index, value) => {
        const newQuantities = [...quantities];
        newQuantities[index] = value === "" ? "" : parseInt(value, 10);
        setQuantities(newQuantities);
    }, [quantities]);

    const totalAmount = useMemo(() => {
        return denominations.reduce(
            (sum, denom, index) => sum + (quantities[index] || 0) * denom.value,
            0
        );
    }, [quantities]);
    // Memoized saved data calculation
    const savedData = useMemo(() => ({
        date,
        locCode,
        email,
        totalCash: calculatedTotals.totalCash,
        totalAmount,
        totalBankAmount: calculatedTotals.totalBankAmount
    }), [date, locCode, email, calculatedTotals.totalCash, totalAmount, calculatedTotals.totalBankAmount]);
    // console.log(savedData);

    const CreateCashBank = async () => {
        if (savedData.totalAmount === 0) {
            const confirmed = window.confirm(
                'Physical cash count is 0. Are you sure you want to close the day with zero cash? Click OK to proceed or Cancel to go back and enter the denomination count.'
            );
            if (!confirmed) return;
        }
        setLoading(true)
        try {
            const response = await fetch(apiUrl5, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(savedData),
            });

            if (response.status === 401) {
                setLoading(false)
                return alert("Error: Data already saved for today.");
            } else if (!response.ok) {
                setLoading(false)
                return alert(JSON.stringify(response), null, 2);
            }

            const data = await response.json();
            console.log("Data saved successfully:", data);

            // Save denomination quantities to localStorage so they show in print
            localStorage.setItem(`denominations_${currentDate}_${locCode}`, JSON.stringify(quantities));

            alert("Data saved successfully");
            setLoading(false)
            window.location.reload();

        } catch (error) {
            console.error("Error saving data:", error);
            alert("An unexpected error occurred.");
            setLoading(false)
        }
    };


    const GetCreateCashBank = async () => {
        try {
            console.log("🔍 Fetching opening balance from:", apiUrl6);
            const response = await fetch(apiUrl6, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log("⚠️  No previous day closing data found - using 0 as opening balance");
                    setPreOpen(null);
                    return;
                }
                throw new Error(`Error fetching opening balance: ${response.status}`);
            }

            const data = await response.json();
            console.log("📊 Opening Balance Fetched:", {
                cash: data?.data?.cash,
                Closecash: data?.data?.Closecash,
                fullData: data?.data,
                note: "cash field will be used as opening balance for calculations"
            });
            setPreOpen(data?.data);
        } catch (error) {
            console.error("❌ Error fetching opening balance:", error);
            // Set to null so opening balance defaults to 0
            setPreOpen(null);
        }
    };

    // const takeCreateCashBank = async () => {
    //     try {
    //         const response = await fetch(apiUrl7, {
    //             method: 'GET',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //         });
    //         // alert(apiUrl6)

    //         if (!response.ok) {
    //             throw new Error('Error saving data');
    //         }

    //         const data = await response.json();
    //         console.log("Data saved successfully:", data);
    //         setPreOpen1(data?.data)
    //     } catch (error) {
    //         console.error("Error saving data:", error);
    //     }
    // };

    const takeCreateCashBank = async () => {
        try {
            const response = await fetch(apiUrl7, { method: 'GET' });
            if (response.status === 404) {
                console.log("No closing data yet for today.");
                return;    // silently ignore and continue
            }
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API ${response.status}: ${text}`);
            }
            const json = await response.json();
            setPreOpen1(json.data);
        } catch (err) {
            console.error("Error fetching closing data:", err);
        }
    };

    useEffect(() => {
        GetCreateCashBank()
        takeCreateCashBank()
        
        // Fetch edited transactions from MongoDB to override TWS data
        const fetchEditedTransactions = async () => {
            try {
                const apiUrl = `${baseUrl.baseUrl}api/tws/getEditedTransactions?fromDate=${currentDate}&toDate=${currentDate}&locCode=${currentusers.locCode}`;
                console.log("Fetching edited transactions from:", apiUrl);
                
                const res = await fetch(apiUrl);
                const json = await res.json();
                const overrideRows = json?.data || [];
                
                console.log("Edited transactions fetched:", overrideRows.length, overrideRows);
                
                const editedObj = {};
                overrideRows.forEach(row => {
                    const key = String(row.invoiceNo || row.invoice).trim();
                    if (key) {
                        editedObj[key] = {
                            ...row,
                            _id: row._id,
                            invoiceNo: key,
                            cash: Number(row.cash || 0),
                            rbl: Number(row.rbl || 0),
                            bank: Number(row.bank || 0),
                            upi: Number(row.upi || 0),
                            securityAmount: Number(row.securityAmount || 0),
                            Balance: Number(row.Balance || 0),
                            billValue: Number(row.billValue || row.invoiceAmount || 0),
                            amount: Number(row.amount || 0),
                            totalTransaction: Number(row.totalTransaction || 0),
                        };
                        console.log("Added to editedObj:", key, editedObj[key]);
                    }
                });
                setEditedTransactionsMap(editedObj);
            } catch (err) {
                console.warn("⚠️ Failed to fetch edited transactions:", err.message);
            }
        };
        
        fetchEditedTransactions();
    }, [])

    // Edit functionality handlers
    const handleEditClick = async (transaction, index) => {
        setIsSyncing(true);

        if (!transaction._id) {
            // Calculate amount for the transaction
            const cashVal = transaction.cash || transaction.bookingCashAmount || transaction.rentoutCashAmount || 0;
            const rblVal = transaction.rbl || 0;
            const bankVal = transaction.bank || transaction.bookingBankAmount || transaction.rentoutBankAmount || 0;
            const upiVal = transaction.upi || transaction.bookingUPIAmount || transaction.rentoutUPIAmount || 0;
            const totalAmount = Number(cashVal) + Number(rblVal) + Number(bankVal) + Number(upiVal);
            
            const patchedTransaction = {
                invoiceNo: transaction.invoiceNo || transaction.locCode || "",
                customerName: transaction.customerName || "",
                locCode: currentusers.locCode,
                type: transaction.Category || transaction.type || 'income',
                category: transaction.SubCategory || transaction.category || 'General',
                subCategory: transaction.SubCategory || transaction.category || '',
                paymentMethod: 'cash',
                date: new Date(transaction.date || currentDate),
                cash: String(cashVal),
                rbl: String(rblVal),
                bank: String(bankVal),
                upi: String(upiVal),
                amount: String(totalAmount),
                securityAmount: Number(transaction.securityAmount || 0),
                Balance: Number(transaction.Balance || 0),
                billValue: Number(transaction.billValue || transaction.invoiceAmount || 0),
                totalTransaction: totalAmount,
                // Mark as edited so it shows up in getEditedTransactions
                editedBy: "000000000000000000000000",
                editedAt: new Date(),
            };
            
            console.log("Syncing transaction:", patchedTransaction);

            try {
                const response = await fetch(`${baseUrl.baseUrl}user/syncTransaction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchedTransaction),
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error("❌ Sync failed:", result);
                    alert("❌ Failed to sync transaction.\n" + (result?.error || 'Unknown error'));
                    setIsSyncing(false);
                    return;
                }

                transaction._id = result.data._id;
                filteredTransactions[index]._id = result.data._id;
            } catch (err) {
                alert("❌ Sync error: " + err.message);
                setIsSyncing(false);
                return;
            }
        }

        setEditedTransaction({
            _id: transaction._id,
            cash: transaction.cash || transaction.bookingCashAmount || transaction.rentoutCashAmount || transaction.returnCashAmount || -(transaction.deleteCashAmount) || 0,
            rbl: transaction.rbl || 0,
            bank: transaction.bank || transaction.bookingBankAmount || transaction.rentoutBankAmount || transaction.returnBankAmount || -(transaction.deleteBankAmount) || 0,
            upi: transaction.upi || transaction.bookingUPIAmount || transaction.rentoutUPIAmount || transaction.returnUPIAmount || -(transaction.deleteUPIAmount) || 0,
            securityAmount: transaction.securityAmount || 0,
            Balance: transaction.Balance || 0,
            date: transaction.date || "",
            customerName: transaction.customerName || "",
            invoiceNo: transaction.invoiceNo || transaction.locCode || "",
            Category: transaction.Category || transaction.type || "",
            SubCategory: transaction.SubCategory || transaction.category || "",
            SubCategory1: transaction.SubCategory1 || transaction.subCategory1 || "",
            remark: transaction.remark || "",
            billValue: transaction.billValue || transaction.invoiceAmount || 0,
            totalTransaction: transaction.totalTransaction || transaction.amount || 0,
            amount: transaction.amount || 0
        });

        setEditingIndex(index);
        setIsSyncing(false);
    };

    const handleInputChange = (field, raw) => {
        if (raw === '' || raw === '-') {
            setEditedTransaction(prev => ({ ...prev, [field]: raw }));
            return;
        }

        const numericValue = Number(raw);
        if (isNaN(numericValue)) return;

        setEditedTransaction(prev => {
            const cash = field === 'cash' ? numericValue : Number(prev.cash) || 0;
            const rbl = field === 'rbl' ? numericValue : Number(prev.rbl) || 0;
            const bank = field === 'bank' ? numericValue : Number(prev.bank) || 0;
            const upi = field === 'upi' ? numericValue : Number(prev.upi) || 0;

            const security = field === 'securityAmount'
                ? numericValue
                : Number(prev.securityAmount) || 0;

            const balance = field === 'Balance'
                ? numericValue
                : Number(prev.Balance) || 0;

            const isRentOut = (prev.Category || '').toLowerCase() === 'rentout';
            const splitTotal = security + balance;
            const payTotal = cash + rbl + bank + upi;

            return {
                ...prev,
                [field]: numericValue,
                cash, rbl, bank, upi,
                securityAmount: security,
                Balance: balance,
                amount: isRentOut ? splitTotal : payTotal,
                totalTransaction: isRentOut ? splitTotal : payTotal,
            };
        });
    };

    const handleSave = async () => {
        const {
            _id,
            cash, rbl, bank, upi,
            date,
            invoiceNo = "",
            invoice = "",
            customerName,
            securityAmount,
            Balance,
            paymentMethod,
        } = editedTransaction;

        if (!_id) {
            alert("❌ Cannot update: missing transaction ID.");
            return;
        }

        try {
            const numSec = Number(securityAmount) || 0;
            const numBal = Number(Balance) || 0;

            let adjCash = Number(cash) || 0;
            let adjRbl = Number(rbl) || 0;
            let adjBank = Number(bank) || 0;
            let adjUpi = Number(upi) || 0;

            const negRow = ["return", "cancel"].includes(
                (editedTransaction.Category || "").toLowerCase()
            );
            if (negRow) {
                adjCash = -Math.abs(adjCash);
                adjRbl = -Math.abs(adjRbl);
                adjBank = -Math.abs(adjBank);
                adjUpi = -Math.abs(adjUpi);
            }

            const isRentOut = editedTransaction.Category === "RentOut";
            const originalBillValue = editedTransaction.billValue;
            const computedTotal = isRentOut
                ? numSec + numBal
                : adjCash + adjRbl + adjBank + adjUpi;

            const paySum = adjCash + adjRbl + adjBank + adjUpi;
            if (!isRentOut && paySum !== computedTotal) {
                if (adjCash !== 0) { adjCash = computedTotal; adjRbl = adjBank = adjUpi = 0; }
                else if (adjRbl !== 0) { adjRbl = computedTotal; adjCash = adjBank = adjUpi = 0; }
                else if (adjBank !== 0) { adjBank = computedTotal; adjCash = adjRbl = adjUpi = 0; }
                else { adjUpi = computedTotal; adjCash = adjRbl = adjBank = 0; }
            }

            const payload = {
                cash: adjCash,
                rbl: adjRbl,
                bank: adjBank,
                upi: adjUpi,
                date,
                invoiceNo: invoiceNo || invoice,
                customerName: customerName || "",
                paymentMethod,
                securityAmount: numSec,
                Balance: numBal,
                billValue: originalBillValue,
                amount: computedTotal,
                totalTransaction: computedTotal,
                type: editedTransaction.Category || "RentOut",
                category: editedTransaction.SubCategory || "Security",
                subCategory1: editedTransaction.SubCategory1 || "Balance Payable",
            };

            const res = await fetch(`${baseUrl.baseUrl}user/editTransaction/${_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok) {
                alert("❌ Update failed: " + (json?.message || "Unknown error"));
                return;
            }
            alert("✅ Transaction updated.");
            
            // Update local state instead of reloading
            const updatedRow = {
                _id,
                invoiceNo: invoiceNo || invoice,
                cash: adjCash,
                rbl: adjRbl,
                bank: adjBank,
                upi: adjUpi,
                securityAmount: numSec,
                Balance: numBal,
                billValue: originalBillValue,
                amount: computedTotal,
                totalTransaction: computedTotal,
            };
            
            const key = String(invoiceNo || invoice).trim();
            setEditedTransactionsMap(prev => ({
                ...prev,
                [key]: updatedRow
            }));
            
            setEditingIndex(null);
            setEditedTransaction({});

        } catch (err) {
            console.error("Update error:", err);
            alert("❌ Update failed: " + err.message);
        }
    };

    // Enter key to save transaction (only when editing)
    useEnterToSave(() => {
        if (editingIndex !== null) {
            handleSave();
        }
    }, editingIndex === null);

    // Prepare CSV data to match table logic
    const csvData = filteredTransactions.map(transaction => ({
      ...transaction,
      cash:
        -(parseInt(transaction.deleteCashAmount)) ||
        parseInt(transaction.rentoutCashAmount) ||
        parseInt(transaction.bookingCashAmount) ||
        parseInt(transaction.returnCashAmount) ||
        parseInt(transaction.cash1) || 0,
      rbl: parseInt(transaction.rbl) || 0,
      bank:
        parseInt(transaction.rentoutBankAmount) ||
        parseInt(transaction.bookingBank1) ||
        parseInt(transaction.returnBankAmount) ||
        parseInt(transaction.deleteBankAmount) * -1 ||
        parseInt(transaction.bank1) || 0,
      upi:
        parseInt(transaction.rentoutUPIAmount) ||
        parseInt(transaction.bookingUPIAmount) ||
        parseInt(transaction.returnUPIAmount) ||
        parseInt(transaction.deleteUPIAmount) * -1 ||
        parseInt(transaction.Tupi) || 0,
    }));

    return (
        <>
            <div>
                <style>{`
                    @media print {
                        @page {
                            size: tabloid landscape;
                            margin: 5mm;
                        }
                        
                        * {
                            box-sizing: border-box !important;
                        }
                        
                        body { 
                            font-family: Arial, sans-serif !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                        }
                        
                        .no-print { display: none !important; }
                        
                        /* Hide sidebar and navigation elements */
                        nav { display: none !important; }
                        header { display: none !important; }
                        aside { display: none !important; }
                        .sidebar { display: none !important; }
                        
                        /* Hide any element with dark background (likely sidebar) */
                        [class*="bg-gray-800"], [class*="bg-gray-900"], [class*="bg-black"] {
                            display: none !important;
                        }
                        
                        /* Hide fixed positioned elements (usually navigation) */
                        .fixed { display: none !important; }
                        .sticky { display: none !important; }
                        
                        /* Force full width for all containers */
                        .ml-\\[240px\\] {
                            margin-left: 0 !important;
                            width: 100% !important;
                        }
                        
                        .p-6 {
                            padding: 0 !important;
                            width: 100% !important;
                        }
                        
                        .bg-gray-100 {
                            background: white !important;
                            width: 100% !important;
                        }
                        
                        .bg-white {
                            background: white !important;
                            width: 100% !important;
                        }
                        
                        .shadow-md, .rounded-sm {
                            box-shadow: none !important;
                            border-radius: 0 !important;
                        }
                        
                        .overflow-x-auto {
                            overflow: visible !important;
                            width: 100% !important;
                        }
                        
                        /* Table full width */
                        table { 
                            width: 100% !important; 
                            border-collapse: collapse !important; 
                            font-size: 8px !important;
                            margin: 0 !important;
                            table-layout: fixed !important;
                        }
                        
                        th, td { 
                            border: 1px solid black !important; 
                            padding: 3px 2px !important; 
                            text-align: left !important; 
                            white-space: nowrap !important;
                            font-size: 8px !important;
                            overflow: hidden !important;
                        }
                        
                        th { 
                            background-color: #7C7C7C !important; 
                            color: white !important;
                            font-weight: bold !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .text-right { 
                            text-align: right !important; 
                        }
                        
                        .print-title { 
                            font-size: 16px !important; 
                            font-weight: bold !important; 
                            margin: 0 0 10px 0 !important; 
                            text-align: center !important; 
                            width: 100% !important;
                        }
                        
                        /* Ensure row backgrounds print */
                        .bg-gray-100 { 
                            background-color: #f5f5f5 !important; 
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .bg-gray-50 { 
                            background-color: #f9f9f9 !important; 
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Column width distribution for better fit */
                        th:nth-child(1), td:nth-child(1) { width: 8% !important; } /* Date */
                        th:nth-child(2), td:nth-child(2) { width: 8% !important; } /* Invoice No */
                        th:nth-child(3), td:nth-child(3) { width: 12% !important; } /* Customer */
                        th:nth-child(4), td:nth-child(4) { width: 8% !important; } /* Category */
                        th:nth-child(5), td:nth-child(5) { width: 8% !important; } /* Sub Category */
                        th:nth-child(6), td:nth-child(6) { width: 8% !important; } /* Remarks */
                        th:nth-child(7), td:nth-child(7) { width: 7% !important; } /* Amount */
                        th:nth-child(8), td:nth-child(8) { width: 7% !important; } /* Total Transaction */
                        th:nth-child(9), td:nth-child(9) { width: 6% !important; } /* Discount */
                        th:nth-child(10), td:nth-child(10) { width: 7% !important; } /* Bill Value */
                        th:nth-child(11), td:nth-child(11) { width: 6% !important; } /* Cash */
                        th:nth-child(12), td:nth-child(12) { width: 6% !important; } /* RBL */
                        th:nth-child(13), td:nth-child(13) { width: 6% !important; } /* Bank */
                        th:nth-child(14), td:nth-child(14) { width: 6% !important; } /* UPI */
                        th:nth-child(15), td:nth-child(15) { width: 7% !important; } /* Action */
                        
                        /* Bottom section styling */
                        .mt-8 {
                            margin-top: 20px !important;
                            page-break-before: auto !important;
                        }
                        
                        .grid {
                            display: grid !important;
                            grid-template-columns: 1fr 1fr !important;
                            gap: 20px !important;
                        }
                        
                        .grid-cols-3 {
                            display: grid !important;
                            grid-template-columns: 1fr 1fr 1fr !important;
                            gap: 5px !important;
                        }
                        
                        .text-lg {
                            font-size: 12px !important;
                        }
                        
                        .text-sm {
                            font-size: 10px !important;
                        }
                        
                        .font-semibold, .font-bold {
                            font-weight: bold !important;
                        }
                        
                        .border {
                            border: 1px solid #ccc !important;
                        }
                        
                        .border-t {
                            border-top: 1px solid #ccc !important;
                        }
                        
                        .border-b {
                            border-bottom: 1px solid #ccc !important;
                        }
                        
                        .p-2, .p-4 {
                            padding: 8px !important;
                        }
                        
                        .mb-4 {
                            margin-bottom: 10px !important;
                        }
                        
                        .mt-4 {
                            margin-top: 10px !important;
                        }
                        
                        .pt-4 {
                            padding-top: 10px !important;
                        }
                        
                        .pb-4 {
                            padding-bottom: 10px !important;
                        }
                        
                        .space-y-3 > * + * {
                            margin-top: 8px !important;
                        }
                        
                        .text-red-600 {
                            color: #dc2626 !important;
                        }
                        
                        .text-gray-700 {
                            color: #374151 !important;
                        }
                        
                        .text-center {
                            text-align: center !important;
                        }
                        
                        .text-right {
                            text-align: right !important;
                        }
                        
                        .justify-between {
                            display: flex !important;
                            justify-content: space-between !important;
                        }
                        
                        .items-center {
                            display: flex !important;
                            align-items: center !important;
                        }
                        
                        input[type="number"] {
                            border: 1px solid #ccc !important;
                            padding: 4px !important;
                            text-align: center !important;
                            font-size: 10px !important;
                        }
                    }
                `}</style>
                <Headers title={"Day Book"} />
                <div className='ml-[240px]'>
                    <div className="p-6 bg-slate-50 min-h-screen">

                        {/* Filter Bar */}
                        <div className="flex flex-wrap gap-4 mb-5 p-4 bg-white rounded border border-slate-200 shadow-sm no-print">
                            <div className='w-full sm:w-[220px]'>
                                <label htmlFor="category" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category</label>
                                <Select
                                    options={categories}
                                    value={selectedCategory}
                                    onChange={setSelectedCategory}
                                    className="w-full text-sm"
                                />
                            </div>
                            <div className='w-full sm:w-[220px]'>
                                <label htmlFor="subcategory" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sub Category</label>
                                <Select
                                    options={subCategories}
                                    value={selectedSubCategory}
                                    onChange={setSelectedSubCategory}
                                    className="w-full text-sm"
                                />
                            </div>
                        </div>

                        <div ref={printRef}>
                            <h2 className="print-title" style={{display: 'none'}}>Day Book Report - {currentDate}</h2>

                            {/* Main Table Card */}
                            <div className="bg-white shadow-sm rounded border border-slate-200 overflow-x-auto">
                                {!data && !data1 && !data2 && !data3 ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="flex items-center gap-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <span className="text-slate-500 text-sm">Loading transactions...</span>
                                        </div>
                                    </div>
                                ) : (
                                <table className="w-full border-collapse min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-700 text-white text-xs uppercase tracking-wide">
                                                <th className="px-2 py-1 text-left whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Date</th>
                                                <th className="px-2 py-1 text-left whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Invoice No.</th>
                                                <th className="px-2 py-1 text-left whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Customer Name</th>
                                                <th className="px-2 py-1 text-left whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Category</th>
                                                <th className="px-2 py-1 text-left whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Sub Category</th>
                                                <th className="px-2 py-1 text-left whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Remarks</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Amount</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Total Txn</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Discount</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Bill Value</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Cash</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">RBL</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Bank</th>
                                                <th className="px-2 py-1 text-right whitespace-nowrap font-semibold border-r border-slate-600 text-xs">UPI</th>
                                                {showAction && <th className="px-2 py-1 text-center whitespace-nowrap font-semibold border-r border-slate-600 text-xs">Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Opening Balance Row */}
                                            <tr className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                                                <td colSpan="10" className="px-3 py-2 text-left text-xs uppercase tracking-wide">Opening Balance</td>
                                                <td className="px-3 py-2 text-right">{preOpen?.cash ?? preOpen?.Closecash ?? 0}</td>
                                                <td className="px-3 py-2 text-right">{preOpen?.rbl ?? 0}</td>
                                                <td className="px-3 py-2 text-right">0</td>
                                                <td className="px-3 py-2 text-right">0</td>
                                                {showAction && <td className="px-3 py-2"></td>}
                                            </tr>

                                            {/* Transaction Rows */}
                                            {filteredTransactions.length > 0 ? (
                                                filteredTransactions.map((transaction, index) => {
                                                    const isEditing = editingIndex === index;
                                                    const t = isEditing ? editedTransaction : transaction;
                                                    
                                                    return (
                                                    <>
                                                        {transaction.Category === 'RentOut' ? (
                                                            <>
                                                                <tr key={`${index}-1`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.date}</td>
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.invoiceNo}</td>
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.customerName}</td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.Category}</td>
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.SubCategory}</td>
                                                                    <td className="px-3 py-2 text-left"></td>
                                                                    <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="number"
                                                                                value={editedTransaction.securityAmount}
                                                                                onChange={(e) => handleInputChange("securityAmount", e.target.value)}
                                                                                className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                            />
                                                                        ) : (transaction.securityAmount || 0)}
                                                                    </td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                        {isEditing ? (editedTransaction.securityAmount + editedTransaction.Balance) : (transaction.securityAmount + transaction.Balance)}
                                                                    </td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">{transaction.discountAmount || 0}</td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">{transaction.invoiceAmount}</td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="number"
                                                                                value={editedTransaction.cash}
                                                                                onChange={(e) => handleInputChange("cash", e.target.value)}
                                                                                className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                            />
                                                                        ) : (transaction.rentoutCashAmount || 0)}
                                                                    </td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="number"
                                                                                value={editedTransaction.rbl}
                                                                                onChange={(e) => handleInputChange("rbl", e.target.value)}
                                                                                className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                            />
                                                                        ) : (transaction.rbl ?? 0)}
                                                                    </td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="number"
                                                                                value={editedTransaction.bank}
                                                                                onChange={(e) => handleInputChange("bank", e.target.value)}
                                                                                className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                            />
                                                                        ) : (parseInt(transaction.rentoutBankAmount) || 0)}
                                                                    </td>
                                                                    <td rowSpan="2" className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="number"
                                                                                value={editedTransaction.upi}
                                                                                onChange={(e) => handleInputChange("upi", e.target.value)}
                                                                                className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                            />
                                                                        ) : (parseInt(transaction.rentoutUPIAmount) || 0)}
                                                                    </td>
                                                                    {showAction && (
                                                                        <td rowSpan="2" className="px-3 py-2 text-center border-r border-slate-100">
                                                                            {isSyncing && editingIndex === index ? (
                                                                                <span className="text-slate-400 text-xs">Syncing…</span>
                                                                            ) : isEditing ? (
                                                                                <button
                                                                                    onClick={handleSave}
                                                                                    className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-emerald-700"
                                                                                >
                                                                                    Save
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleEditClick(transaction, index)}
                                                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700"
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                                <tr key={`${index}-2`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.rentOutDate || transaction.bookingDate}</td>
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.invoiceNo}</td>
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.customerName}</td>
                                                                    <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.SubCategory1}</td>
                                                                    <td className="px-3 py-2 text-left"></td>
                                                                    <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="number"
                                                                                value={editedTransaction.Balance}
                                                                                onChange={(e) => handleInputChange("Balance", e.target.value)}
                                                                                className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                            />
                                                                        ) : transaction.Balance}
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        ) : (
                                                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                                <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.date}</td>
                                                                <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.invoiceNo || transaction.locCode}</td>
                                                                <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.customerName}</td>
                                                                <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.Category || transaction.type || transaction.category}</td>
                                                                <td className="px-3 py-2 text-left whitespace-nowrap text-slate-700 border-r border-slate-100">{transaction.SubCategory || transaction.subCategory}</td>
                                                                <td className="px-3 py-2 text-left text-slate-600 border-r border-slate-100">{transaction.remark}</td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {transaction.Category === 'Return' && transaction.returnCashAmount !== undefined ?
                                                                        (parseInt(transaction.returnCashAmount || 0) + parseInt(transaction.returnBankAmount || 0) + parseInt(transaction.returnUPIAmount || 0)) :
                                                                        transaction.Category === 'Return' ?
                                                                        (parseInt(transaction.amount || 0) || parseInt(transaction.totalTransaction || 0) || 
                                                                         (parseInt(transaction.cash || 0) + parseInt(transaction.bank || 0) + parseInt(transaction.upi || 0) + parseInt(transaction.rbl || 0))) :
                                                                        parseInt(transaction.returnCashAmount || 0) + parseInt(transaction.returnBankAmount || 0) ||
                                                                        parseInt(transaction.rentoutCashAmount || 0) + parseInt(transaction.rentoutBankAmount || 0) ||
                                                                        parseInt(transaction.bookingCashAmount || 0) + parseInt(transaction.bookingBankAmount || 0) + parseInt(transaction.bookingUPIAmount || 0) ||
                                                                        parseInt(transaction.amount || -(parseInt(transaction.advanceAmount || 0)) || 0)}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {transaction.Category === 'Return' && transaction.returnCashAmount !== undefined ?
                                                                        (parseInt(transaction.returnCashAmount || 0) + parseInt(transaction.returnBankAmount || 0) + parseInt(transaction.returnUPIAmount || 0) + parseInt(transaction.rblRazorPay || 0)) :
                                                                        transaction.Category === 'Return' ?
                                                                        (parseInt(transaction.totalTransaction || 0) || parseInt(transaction.amount || 0) || 
                                                                         (parseInt(transaction.cash || 0) + parseInt(transaction.bank || 0) + parseInt(transaction.upi || 0) + parseInt(transaction.rbl || 0))) :
                                                                        parseInt(transaction.returnCashAmount || 0) + parseInt(transaction.returnBankAmount || 0) ||
                                                                        parseInt(transaction.rentoutCashAmount || 0) + parseInt(transaction.rentoutBankAmount || 0) ||
                                                                        transaction.TotaltransactionBooking ||
                                                                        parseInt(transaction.totalTransaction || 0) ||
                                                                        parseInt(transaction.amount || -(parseInt(transaction.deleteBankAmount || 0) + parseInt(transaction.deleteCashAmount || 0)) || 0)}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {transaction.discountAmount || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {parseInt(transaction.billValue) || parseInt(transaction.invoiceAmount) || parseInt(transaction.amount) || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="number"
                                                                            value={editedTransaction.cash}
                                                                            onChange={(e) => handleInputChange("cash", e.target.value)}
                                                                            className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                        />
                                                                    ) : (
                                                                        transaction.Category === 'Cancel' ? 
                                                                            (parseInt(transaction.cash) || 0) :
                                                                            transaction.Category === 'Return' && transaction.returnCashAmount !== undefined ?
                                                                            (parseInt(transaction.returnCashAmount) || 0) :
                                                                            transaction.Category === 'Return' ?
                                                                            (parseInt(transaction.cash) || parseInt(transaction.cash1) || 0) :
                                                                            -(parseInt(transaction.deleteCashAmount)) ||
                                                                         parseInt(transaction.rentoutCashAmount) ||
                                                                         parseInt(transaction.bookingCashAmount) ||
                                                                         parseInt(transaction.returnCashAmount) ||
                                                                         parseInt(transaction.cash) ||
                                                                         parseInt(transaction.cash1) || 0
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="number"
                                                                            value={editedTransaction.rbl}
                                                                            onChange={(e) => handleInputChange("rbl", e.target.value)}
                                                                            className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                        />
                                                                    ) : (
                                                                        transaction.Category === 'Return' && transaction.returnRblAmount !== undefined ?
                                                                            (parseInt(transaction.returnRblAmount) || 0) :
                                                                            (transaction.rbl ?? transaction.rblRazorPay ?? 0)
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="number"
                                                                            value={editedTransaction.bank}
                                                                            onChange={(e) => handleInputChange("bank", e.target.value)}
                                                                            className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                        />
                                                                    ) : (
                                                                        transaction.Category === 'Return' && transaction.returnBankAmount !== undefined ? 
                                                                            (parseInt(transaction.returnBankAmount) || 0) :
                                                                            transaction.Category === 'Return' ?
                                                                            (parseInt(transaction.bank) || parseInt(transaction.bank1) || 0) :
                                                                            transaction.Category === 'Cancel' ?
                                                                            (parseInt(transaction.bank) || 0) :
                                                                            transaction.Category === 'RentOut' ?
                                                                            (parseInt(transaction.rentoutBankAmount) || 0) :
                                                                            transaction.Category === 'Booking' ?
                                                                            (parseInt(transaction.bookingBank1) || 0) :
                                                                            (parseInt(transaction.bank) || parseInt(transaction.bank1) || 0)
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="number"
                                                                            value={editedTransaction.upi}
                                                                            onChange={(e) => handleInputChange("upi", e.target.value)}
                                                                            className="w-20 p-1 border border-slate-300 rounded text-sm"
                                                                        />
                                                                    ) : (
                                                                        transaction.Category === 'Return' && transaction.returnUPIAmount !== undefined ? 
                                                                            (parseInt(transaction.returnUPIAmount) || 0) :
                                                                            transaction.Category === 'Return' ?
                                                                            (parseInt(transaction.upi) || parseInt(transaction.Tupi) || 0) :
                                                                            transaction.Category === 'Cancel' ?
                                                                            (parseInt(transaction.upi) || 0) :
                                                                            transaction.Category === 'RentOut' ?
                                                                            (parseInt(transaction.rentoutUPIAmount) || 0) :
                                                                            transaction.Category === 'Booking' ?
                                                                            (parseInt(transaction.bookingUPIAmount) || 0) :
                                                                            (parseInt(transaction.upi) || parseInt(transaction.Tupi) || 0)
                                                                    )}
                                                                </td>
                                                                {showAction && (
                                                                    <td className="px-3 py-2 text-center border-r border-slate-100">
                                                                        {isSyncing && editingIndex === index ? (
                                                                            <span className="text-slate-400 text-xs">Syncing…</span>
                                                                        ) : isEditing ? (
                                                                            <button
                                                                                onClick={handleSave}
                                                                                className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-emerald-700"
                                                                            >
                                                                                Save
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleEditClick(transaction, index)}
                                                                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        )}
                                                    </>
                                                )})
                                            ) : (
                                                <tr>
                                                    <td colSpan={showAction ? "15" : "14"} className="text-center py-8 text-slate-400 text-sm">No transactions found</td>
                                                </tr>
                                            )}
                                        </tbody>

                                        <tfoot>
                                            <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                                                <td colSpan="10" className="px-4 py-2.5 text-left text-slate-700 text-sm">Total</td>
                                                <td className="px-4 py-2.5 text-right text-slate-800">
                                                    {(() => {
                                                        console.log('🔍 Total Row - Displaying totalCash:', {
                                                            totalCash: calculatedTotals.totalCash,
                                                            totalAmount,
                                                            dayCashTransactions: calculatedTotals.dayCashTransactions,
                                                            openingCash,
                                                            note: 'This should be calculated closing cash (opening + day transactions)'
                                                        });
                                                        return calculatedTotals.totalCash;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-slate-800">{calculatedTotals.totalRblAmount}</td>
                                                <td className="px-4 py-2.5 text-right text-slate-800">{calculatedTotals.totalBankAmount1}</td>
                                                <td className="px-4 py-2.5 text-right text-slate-800">{calculatedTotals.totalBankAmountupi}</td>
                                                {showAction && <td className="px-4 py-2.5"></td>}
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>

                            {/* Bottom Section: Denomination + Cash Summary */}
                            <div className="mt-6">
                                <div className="p-6 bg-white relative shadow-sm rounded border border-slate-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
                                        {/* Denomination Section */}
                                        <div className='w-full'>
                                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Physical Cash Count</h3>
                                            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-4 mb-4">
                                                <div className="font-semibold text-xs text-slate-500 uppercase tracking-wide">Denomination</div>
                                                <div className="font-semibold text-xs text-slate-500 uppercase tracking-wide">Quantity</div>
                                                <div className="font-semibold text-xs text-slate-500 uppercase tracking-wide">Amount</div>
                                                {denominations.map((denom, index) => (
                                                    <React.Fragment key={index}>
                                                        <div className="px-2 py-1.5 bg-slate-50 rounded text-sm text-slate-700 font-medium">{denom.label}</div>
                                                        <input
                                                            type="number"
                                                            value={quantities[index]}
                                                            onChange={(e) => handleChange(index, e.target.value)}
                                                            className="px-2 py-1.5 border border-slate-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            min="0"
                                                            readOnly={preOpen1 != null}
                                                        />
                                                        <div className="px-2 py-1.5 bg-slate-50 rounded text-sm text-right text-slate-700">
                                                            {quantities[index] ? (quantities[index] * denom.value).toLocaleString() : "-"}
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            <div className="flex justify-between mt-3 text-sm font-semibold text-slate-800 border-t border-slate-200 pt-3">
                                                <span>Total</span>
                                                <span>{preOpen1?.Closecash ? preOpen1?.Closecash.toLocaleString() : totalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Closing Cash Section */}
                                        <div className='w-full'>
                                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Cash Summary</h3>
                                            <div className="border border-slate-200 rounded-sm p-4 space-y-3 bg-slate-50">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-600">Closing Cash</span>
                                                    <span className="font-semibold text-slate-800">{calculatedTotals.totalCash.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-600">Physical Cash</span>
                                                    <span className="font-semibold text-slate-800">{preOpen1?.Closecash ? preOpen1?.Closecash?.toLocaleString() : totalAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                                    <span className="text-sm font-semibold text-red-600">Difference</span>
                                                    <span className="font-semibold text-red-600">
                                                        {preOpen1?.Closecash ? ((calculatedTotals.totalCash - preOpen1?.Closecash) * -1).toLocaleString() : ((calculatedTotals.totalCash - totalAmount) * -1).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className='flex flex-wrap gap-2 mt-4 no-print'>
                                                {loading ? (
                                                    preOpen1 == null && (
                                                        <button className="flex-1 cursor-pointer bg-amber-500 text-white py-2 px-4 rounded-sm text-sm font-medium flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors">
                                                            <span>Loading...</span>
                                                        </button>
                                                    )
                                                ) : (
                                                    preOpen1 == null && (
                                                        <button
                                                            onClick={CreateCashBank}
                                                            className="flex-1 cursor-pointer bg-amber-500 text-white py-2 px-4 rounded-sm text-sm font-medium flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                                                        >
                                                            <span>Save Day</span>
                                                        </button>
                                                    )
                                                )}
                                                {!loading && preOpen1 != null && (
                                                    <button
                                                        onClick={handlePrint}
                                                        className="flex-1 cursor-pointer bg-blue-600 text-white py-2 px-4 rounded-sm text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                                                    >
                                                        <span>Print PDF</span>
                                                    </button>
                                                )}
                                                <CSVLink
                                                    data={csvData}
                                                    headers={headers}
                                                    filename={`${currentDate} DayBook report.csv`}
                                                    className="flex-1"
                                                >
                                                    <button className="w-full border border-blue-600 text-blue-600 py-2 px-4 rounded-sm text-sm font-medium hover:bg-blue-50 transition-colors">
                                                        Export CSV
                                                    </button>
                                                </CSVLink>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default DayBookInc;
