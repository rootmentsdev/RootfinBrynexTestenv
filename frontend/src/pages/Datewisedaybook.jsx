import Headers from '../components/Header.jsx';
import { useEffect, useRef, useState } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import Select from "react-select";
import baseUrl from '../api/api.js';
import { CSVLink } from 'react-csv';
import { Helmet } from "react-helmet";
import { FiDownload } from "react-icons/fi";

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

const headers = [
  { label: "Date", key: "date" },
  { label: "Invoice No", key: "invoiceNo" },
  { label: "Customer Name", key: "customerName" },
  { label: "Quantity", key: "quantity" },
  { label: "Category", key: "Category" },
  { label: "Sub Category", key: "SubCategory" },
  { label: "Balance Payable", key: "SubCategory1" },
  { label: "Amount", key: "amount" },
  { label: "Total Transaction", key: "totalTransaction" },
  { label: "security", key: "securityAmount" },
  { label: "Balance Payable", key: "Balance" },
  { label: "Remark", key: "remark" },
  { label: "Discount", key: "discountAmount" },
  { label: "Bill Value", key: "billValue" },
  { label: "Cash", key: "cash" },
  { label: "RBL", key: "rbl" }, // ✅ Added RBL to headers
  { label: "Bank", key: "bank" },
  { label: "UPI", key: "upi" },
  { label: "Attachment", key: "attachment" },
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

const AllLoation = [
  { locName: "Z-Edapally1", locCode: "144" },
  { locName: "Warehouse", locCode: "858" },
  { locName: "G-Edappally", locCode: "702" },
  { locName: "HEAD OFFICE01", locCode: "759" },
  { locName: "SG-Trivandrum", locCode: "700" },
  { locName: "Z- Edappal", locCode: "100" },
  { locName: "Z.Perinthalmanna", locCode: "133" },
  { locName: "Z.Kottakkal", locCode: "122" },
  { locName: "G.Kottayam", locCode: "701" },
  { locName: "G.Perumbavoor", locCode: "703" },
  { locName: "G.Thrissur", locCode: "704" },
  { locName: "G.Chavakkad", locCode: "706" },
  { locName: "G.Calicut ", locCode: "712" },
  { locName: "G.Vadakara", locCode: "708" },
  { locName: "G.Edappal", locCode: "707" },
  { locName: "G.Perinthalmanna", locCode: "709" },
  { locName: "G.Kottakkal", locCode: "711" },
  { locName: "G.Manjeri", locCode: "710" },
  { locName: "G.Palakkad ", locCode: "705" },
  { locName: "G.Kalpetta", locCode: "717" },
  { locName: "G.Kannur", locCode: "716" },
  { locName: "G.MG Road", locCode: "718" },
  { locName: "WAREHOUSE", locCode: "103" }
];

const allStoresCsvHeaders = [
  { label: "Store", key: "store" },
  { label: "LocCode", key: "locCode" },
  { label: "Cash", key: "cash" },
  { label: "RBL", key: "rbl" }, // ✅ Added RBL to all stores CSV headers
  { label: "Bank", key: "bank" },
  { label: "UPI", key: "upi" },
  { label: "Total Amount", key: "amount" },
];

const Datewisedaybook = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [apiUrl5, setApiUrl5] = useState("");
  const [preOpen, setPreOpen] = useState([])

  const currentusers = JSON.parse(localStorage.getItem("rootfinuser"));

  const showAction = (currentusers.power || "").toLowerCase() === "admin";
  const isClusterManager = (currentusers.role || "").toLowerCase() === "cluster_manager";
  const clusterAllowedLocCodes = currentusers.allowedLocCodes || [];

  // For cluster managers, filter AllLoation to only their allowed stores
  const visibleLocations = isClusterManager
    ? AllLoation.filter(s => clusterAllowedLocCodes.includes(s.locCode))
    : AllLoation;

  const [selectedStore, setSelectedStore] = useState("current");
  const [allStoresSummary, setAllStoresSummary] = useState([]);
  const [allStoresTotals, setAllStoresTotals] = useState({ cash: 0, rbl: 0, bank: 0, upi: 0, amount: 0 }); // ✅ Added rbl

  const handleFetch = async () => {
    setIsFetching(true);
    setPreOpen([]);

    const prev = new Date(new Date(fromDate));
    prev.setDate(prev.getDate() - 1);

    const prevDayStr = new Date(fromDate) < new Date("2025-01-01")
      ? "2025-01-01"
      : new Date(new Date(fromDate).setDate(new Date(fromDate).getDate() - 1)).toISOString().split("T")[0];

    const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
    const bookingU = `${twsBase}/GetBookingList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const rentoutU = `${twsBase}/GetRentoutList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const returnU = `${twsBase}/GetReturnList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const deleteU = `${twsBase}/GetDeleteList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const mongoU = `${baseUrl.baseUrl}user/Getpayment?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
    const openingU = `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${currentusers.locCode}&date=${prevDayStr}`;

    setApiUrl5(openingU);
    GetCreateCashBank(openingU);

    // Helper to get store footer totals with RBL support and refund bank/UPI prevention
    async function getStoreFooterTotals(locCode, fromDate, toDate) {
      const prev = new Date(new Date(fromDate));
      prev.setDate(prev.getDate() - 1);
      const prevDayStr = new Date(fromDate) < new Date("2025-01-01")
        ? "2025-01-01"
        : new Date(new Date(fromDate).setDate(new Date(fromDate).getDate() - 1)).toISOString().split("T")[0];

      let openingCash = 0, openingRbl = 0; // ✅ Added openingRbl
      try {
        const openRes = await fetch(`${baseUrl.baseUrl}user/getsaveCashBank?locCode=${locCode}&date=${prevDayStr}`);
        const openData = await openRes.json();
        // ✅ CRITICAL FIX: Use 'cash' field (calculated closing cash) for opening balance, not 'Closecash' (physical cash)
        // The 'cash' field contains the previous day's total closing cash, which should be today's opening
        openingCash = Number(openData?.data?.cash ?? openData?.data?.Closecash ?? 0);
        openingRbl = Number(openData?.data?.rbl ?? 0); // ✅ Added RBL opening
      } catch {}

      const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
      const bookingU = `${twsBase}/GetBookingList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const rentoutU = `${twsBase}/GetRentoutList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const returnU = `${twsBase}/GetReturnList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const deleteU = `${twsBase}/GetDeleteList?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const mongoU = `${baseUrl.baseUrl}user/Getpayment?LocCode=${locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

      let overrideRowsStore = [];
      try {
        const res = await fetch(
          `${baseUrl.baseUrl}api/tws/getEditedTransactions?fromDate=${fromDate}&toDate=${toDate}&locCode=${locCode}`
        );
        const json = await res.json();
        overrideRowsStore = json?.data || [];
      } catch {}

      let bookingData = {}, rentoutData = {}, returnData = {}, deleteData = {}, mongoData = {};
      try {
        const [bookingRes, rentoutRes, returnRes, deleteRes, mongoRes] = await Promise.all([
          fetch(bookingU), fetch(rentoutU), fetch(returnU), fetch(deleteU), fetch(mongoU)
        ]);
        [bookingData, rentoutData, returnData, deleteData, mongoData] = await Promise.all([
          bookingRes.json(), rentoutRes.json(), returnRes.json(), deleteRes.json(), mongoRes.json()
        ]);
      } catch {}

      const bookingList = (bookingData?.dataSet?.data || []).map(item => ({
        ...item,
        date: item.bookingDate?.split("T")[0],
        invoiceNo: item.invoiceNo,
        customerName: item.customerName,
        quantity: item.quantity || 1,
        Category: "Booking",
        SubCategory: "Advance",
        billValue: Number(item.invoiceAmount || 0),
        cash: Number(item.bookingCashAmount || 0),
        rbl: Number(item.rblRazorPay || 0), // ✅ Added RBL mapping
        bank: Number(item.bookingBankAmount || 0),
        upi: Number(item.bookingUPIAmount || 0),
        amount: Number(item.bookingCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.bookingBankAmount || 0) + Number(item.bookingUPIAmount || 0),
        totalTransaction: Number(item.bookingCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.bookingBankAmount || 0) + Number(item.bookingUPIAmount || 0),
        remark: "",
        source: "booking"
      }));

      const rentoutList = (rentoutData?.dataSet?.data || []).map(item => {
        const advance = Number(item.advanceAmount || 0);
        const security = Number(item.securityAmount || 0);
        const balancePayable = Number(item.invoiceAmount || 0) - advance;
        const totalSplit = security + balancePayable;
        return {
          ...item,
          date: (item.rentOutDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName,
          quantity: item.quantity || 1,
          Category: "RentOut",
          SubCategory: "Security",
          SubCategory1: "Balance Payable",
          securityAmount: security,
          Balance: balancePayable,
          billValue: Number(item.invoiceAmount || 0),
          cash: Number(item.rentoutCashAmount || 0),
          rbl: Number(item.rblRazorPay || 0), // ✅ Added RBL mapping
          bank: Number(item.rentoutBankAmount || 0),
          upi: Number(item.rentoutUPIAmount || 0),
          amount: totalSplit,
          totalTransaction: totalSplit,
          remark: "",
          source: "rentout"
        };
      });

      // ✅ Updated return list with RBL prevention logic
      const returnList = (returnData?.dataSet?.data || []).map(item => {
        const returnCashAmount = -Math.abs(Number(item.returnCashAmount || 0));
        const returnRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
       
        // ✅ Only process bank/UPI if no RBL value
        const returnBankAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnBankAmount || 0));
        const returnUPIAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnUPIAmount || 0));

        return {
          ...item,
          date: (item.returnedDate || item.returnDate || item.createdDate || "").split("T")[0],
          customerName: item.customerName || item.custName || item.customer || "",
          invoiceNo: item.invoiceNo,
          Category: "Return",
          SubCategory: "Security Refund",
          billValue: Number(item.invoiceAmount || 0),
          cash: returnCashAmount,
          rbl: returnRblAmount,
          bank: returnBankAmount,
          upi: returnUPIAmount,
          amount: returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount,
          totalTransaction: returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount,
          remark: "",
          source: "return"
        };
      });

      // ✅ Updated delete list with RBL prevention logic
      const deleteList = (deleteData?.dataSet?.data || []).map(item => {
        const deleteCashAmount = -Math.abs(Number(item.deleteCashAmount || 0));
        const deleteRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
       
        // ✅ Only process bank/UPI if no RBL value
        const deleteBankAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteBankAmount || 0));
        const deleteUPIAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteUPIAmount || 0));

        return {
          ...item,
          date: item.cancelDate?.split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName,
          Category: "Cancel",
          SubCategory: "Cancellation Refund",
          billValue: Number(item.invoiceAmount || 0),
          cash: deleteCashAmount,
          rbl: deleteRblAmount,
          bank: deleteBankAmount,
          upi: deleteUPIAmount,
          amount: deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount,
          totalTransaction: deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount,
          remark: "",
          source: "deleted"
        };
      });

      const mongoList = (mongoData?.data || []).map(tx => {
        const cash = Number(tx.cash || 0);
        const rbl = Number(tx.rbl || tx.rblRazorPay || 0); // ✅ Added RBL mapping
        const bank = Number(tx.bank || 0);
        const upi = Number(tx.upi || 0);
        const isReturn = (tx.type || "").toLowerCase() === "return";
        const rawSubCat = tx.subCategory || tx.category || "";
        const subCatLabel = isReturn && rawSubCat && !rawSubCat.toLowerCase().endsWith("return")
          ? `${rawSubCat} Return`
          : rawSubCat;
        return {
          ...tx,
          date: tx.date?.split("T")[0] || "",
          Category: tx.type,
          SubCategory: subCatLabel,
          SubCategory1: tx.subCategory1 || tx.SubCategory1 || "",
          customerName: tx.customerName || "",
          remark: subCatLabel || tx.remark || tx.remarks || "",
          billValue: Number(tx.billValue || tx.invoiceAmount || Math.abs(Number(tx.amount) || 0)),
          cash: Number(tx.cash),
          rbl: rbl, // ✅ Added RBL
          bank: Number(tx.bank),
          upi: Number(tx.upi),
          amount: Number(tx.cash) + rbl + Number(tx.bank) + Number(tx.upi),
          totalTransaction: Number(tx.cash) + rbl + Number(tx.bank) + Number(tx.upi),
          source: "mongo"
        };
      });

      const editedMapStore = new Map();
      overrideRowsStore.forEach(row => {
        const key = String(row.invoiceNo || row.invoice).trim();
        const category = (row.type || row.Category || '').toLowerCase();
        // Create a unique key that includes both invoice number AND category
        const uniqueKey = `${key}-${category}`;
        const cash = Number(row.cash || 0);
        const rbl = Number(row.rbl || 0); // ✅ Added RBL support in overrides
        const bank = Number(row.bank || 0);
        const upi = Number(row.upi || 0);
        const total = cash + rbl + bank + upi;
        editedMapStore.set(uniqueKey, {
          ...row,
          invoiceNo: key,
          Category: row.type,
          SubCategory: row.category,
          SubCategory1: row.subCategory1 || row.SubCategory1 || "Balance Payable",
          billValue: Number(row.billValue ?? row.invoiceAmount ?? 0),
          cash, rbl, bank, upi, // ✅ Added rbl
          amount: total,
          totalTransaction: total,
          source: "edited"
        });
      });

      const allTws = [...bookingList, ...rentoutList, ...returnList, ...deleteList];
      const finalTws = allTws.map(t => {
        const key = String(t.invoiceNo).trim();
        const category = (t.Category || t.category || '').toLowerCase();
        // Match using both invoice number AND category
        const uniqueKey = `${key}-${category}`;
        const override = editedMapStore.get(uniqueKey);
        const isRentOutStore = category === 'rentout';
        return override
          ? {
            ...t,
            ...override,
            Category: override.Category || t.Category || "",
            SubCategory: override.SubCategory || override.category || t.SubCategory || t.category || "",
            SubCategory1: override.SubCategory1 || override.subCategory1 || t.SubCategory1 || t.subCategory1 || "",
            customerName: override.customerName || t.customerName || "",
            date: override.date || t.date || "",
            securityAmount: isRentOutStore
              ? Number(override.securityAmount ?? t.securityAmount ?? 0)
              : 0,
            Balance: isRentOutStore
              ? Number(override.Balance ?? t.Balance ?? 0)
              : 0,
            amount: Number(override.amount ?? t.amount),
            totalTransaction: isRentOutStore
              ? Number(override.securityAmount ?? t.securityAmount ?? 0) + Number(override.Balance ?? t.Balance ?? 0)
              : Number(override.totalTransaction ?? t.totalTransaction ?? override.cash + override.rbl + override.bank + override.upi) // ✅ Added rbl
          }
          : t;
      });

      const allTransactions = [...finalTws, ...mongoList];
      const deduped = Array.from(
        new Map(
          allTransactions.map((tx) => {
            const dateKey = new Date(tx.date).toISOString().split("T")[0];
            // Use _id as primary key if available (for mongo transactions), otherwise use invoiceNo + category + date + source
            const key = tx._id 
              ? tx._id 
              : `${tx.invoiceNo || tx.locCode}-${dateKey}-${tx.Category || tx.type || ""}-${tx.source || ""}`;
            return [key, tx];
          })
        ).values()
      );

      let cash = openingCash, rbl = openingRbl, bank = 0, upi = 0; // ✅ Added rbl
      deduped.forEach(r => {
        cash += isNaN(+r.cash) ? 0 : +r.cash;
        rbl += isNaN(+r.rbl) ? 0 : +r.rbl; // ✅ Added RBL calculation
        bank += isNaN(+r.bank) ? 0 : +r.bank;
        upi += isNaN(+r.upi) ? 0 : +r.upi;
      });
      return { cash, rbl, bank, upi, amount: cash + rbl + bank + upi }; // ✅ Added rbl
    }

    if (selectedStore === "all") {
      const results = await Promise.all(
        visibleLocations.map(async ({ locCode, locName }) => {
          const summary = await getStoreFooterTotals(locCode, fromDate, toDate);
          return { store: locName, locCode, ...summary };
        })
      );
      const totals = results.reduce(
        (acc, s) => ({
          cash: acc.cash + s.cash,
          rbl: acc.rbl + s.rbl,
          bank: acc.bank + s.bank,
          upi: acc.upi + s.upi,
          amount: acc.amount + s.amount,
        }),
        { cash: 0, rbl: 0, bank: 0, upi: 0, amount: 0 }
      );
      setAllStoresSummary(results);
      setAllStoresTotals(totals);
      setIsFetching(false);
      return;
    }

    try {
      const [bookingRes, rentoutRes, returnRes, deleteRes, mongoRes] = await Promise.all([
        fetch(bookingU), fetch(rentoutU), fetch(returnU), fetch(deleteU), fetch(mongoU)
      ]);
      if (!mongoRes.ok) {
        const errorText = await mongoRes.text();
        throw new Error(`mongoRes failed: ${mongoRes.status} ${errorText}`);
      }
      const [bookingData, rentoutData, returnData, deleteData, mongoData] = await Promise.all([
        bookingRes.json(), rentoutRes.json(), returnRes.json(), deleteRes.json(), mongoRes.json()
      ]);

      const bookingList = (bookingData?.dataSet?.data || []).map(item => ({
        ...item,
        date: item.bookingDate?.split("T")[0],
        invoiceNo: item.invoiceNo,
        customerName: item.customerName,
        quantity: item.quantity || 1,
        Category: "Booking",
        SubCategory: "Advance",
        discountAmount: Number(item.discountAmount || 0),
        billValue: Number(item.invoiceAmount || 0),
        cash: Number(item.bookingCashAmount || 0),
        rbl: Number(item.rblRazorPay || 0), // ✅ Added RBL mapping
        bank: Number(item.bookingBankAmount || 0),
        upi: Number(item.bookingUPIAmount || 0),
        amount: Number(item.bookingCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.bookingBankAmount || 0) + Number(item.bookingUPIAmount || 0), // ✅ Added rbl
        totalTransaction: Number(item.bookingCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.bookingBankAmount || 0) + Number(item.bookingUPIAmount || 0), // ✅ Added rbl
        remark: "",
        source: "booking"
      }));

      const rentoutList = (rentoutData?.dataSet?.data || []).map(item => {
        const advance = Number(item.advanceAmount || 0);
        const security = Number(item.securityAmount || 0);
        const balancePayable = Number(item.invoiceAmount || 0) - advance;
        const totalSplit = security + balancePayable;

        return {
          ...item,
          date: (item.rentOutDate || "").split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName,
          quantity: item.quantity || 1,
          Category: "RentOut",
          SubCategory: "Security",
          SubCategory1: "Balance Payable",
          securityAmount: security,
          Balance: balancePayable,
          discountAmount: Number(item.discountAmount || 0),
          billValue: Number(item.invoiceAmount || 0),
          cash: Number(item.rentoutCashAmount || 0),
          rbl: Number(item.rblRazorPay || 0), // ✅ Added RBL mapping
          bank: Number(item.rentoutBankAmount || 0),
          upi: Number(item.rentoutUPIAmount || 0),
          totalTransaction: totalSplit,
          amount: totalSplit,
          remark: "",
          source: "rentout"
        };
      });

      // ✅ Updated return list with RBL prevention logic
      const returnList = (returnData?.dataSet?.data || []).map(item => {
        const returnCashAmount = -Math.abs(Number(item.returnCashAmount || 0));
        const returnRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
       
        // ✅ Only process bank/UPI if no RBL value
        const returnBankAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnBankAmount || 0));
        const returnUPIAmount = returnRblAmount !== 0 ? 0 : -Math.abs(Number(item.returnUPIAmount || 0));

        return {
          ...item,
          date: (item.returnedDate || item.returnDate || item.createdDate || "").split("T")[0],
          customerName: item.customerName || item.custName || item.customer || "",
          invoiceNo: item.invoiceNo,
          Category: "Return",
          SubCategory: "Security Refund",
          discountAmount: Number(item.discountAmount || 0),
          billValue: Number(item.invoiceAmount || 0),
          cash: returnCashAmount,
          rbl: returnRblAmount,
          bank: returnBankAmount,
          upi: returnUPIAmount,
          amount: returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount, // ✅ Added rbl
          totalTransaction: returnCashAmount + returnRblAmount + returnBankAmount + returnUPIAmount, // ✅ Added rbl
          remark: "",
          source: "return"
        };
      });

      // ✅ Updated delete list with RBL prevention logic
      const deleteList = (deleteData?.dataSet?.data || []).map(item => {
        const deleteCashAmount = -Math.abs(Number(item.deleteCashAmount || 0));
        const deleteRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
       
        // ✅ Only process bank/UPI if no RBL value
        const deleteBankAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteBankAmount || 0));
        const deleteUPIAmount = deleteRblAmount !== 0 ? 0 : -Math.abs(Number(item.deleteUPIAmount || 0));

        return {
          ...item,
          date: item.cancelDate?.split("T")[0],
          invoiceNo: item.invoiceNo,
          customerName: item.customerName,
          Category: "Cancel",
          SubCategory: "Cancellation Refund",
          discountAmount: Number(item.discountAmount || 0),
          billValue: Number(item.invoiceAmount || 0),
          cash: deleteCashAmount,
          rbl: deleteRblAmount,
          bank: deleteBankAmount,
          upi: deleteUPIAmount,
          amount: deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount, // ✅ Added rbl
          totalTransaction: deleteCashAmount + deleteRblAmount + deleteBankAmount + deleteUPIAmount, // ✅ Added rbl
          remark: "",
          source: "deleted"
        };
      });

      const mongoList = (mongoData?.data || []).map(tx => {
        const cash = Number(tx.cash || 0);
        const rbl = Number(tx.rbl || tx.rblRazorPay || 0); // ✅ Added RBL mapping
        const bank = Number(tx.bank || 0);
        const upi = Number(tx.upi || 0);
        const total = cash + rbl + bank + upi; // ✅ Added rbl
        const isReturn = (tx.type || "").toLowerCase() === "return";
        const rawSubCat = tx.subCategory || tx.category || "";
        const subCatLabel = isReturn && rawSubCat && !rawSubCat.toLowerCase().endsWith("return")
          ? `${rawSubCat} Return`
          : rawSubCat;
        return {
          ...tx,
          date: tx.date?.split("T")[0] || "",
          Category: tx.type,
          SubCategory: subCatLabel,
          SubCategory1: tx.subCategory1 || tx.SubCategory1 || "",
          customerName: tx.customerName || "",
          remark: subCatLabel || tx.remark || tx.remarks || "",
          discountAmount: Number(tx.discountAmount || 0),
          billValue: Number(tx.billValue || tx.invoiceAmount || Math.abs(Number(tx.amount) || 0)),
          cash: Number(tx.cash),
          rbl: rbl, // ✅ Added RBL
          bank: Number(tx.bank),
          upi: Number(tx.upi),
          amount: total, // ✅ Added rbl
          totalTransaction: total, // ✅ Added rbl
          source: "mongo"
        };
      });

      let overrideRows = [];
      try {
        const res = await fetch(
          `${baseUrl.baseUrl}api/tws/getEditedTransactions?fromDate=${fromDate}&toDate=${toDate}&locCode=${currentusers.locCode}`
        );
        const json = await res.json();
        overrideRows = json?.data || [];
      } catch (err) {
        console.warn("⚠️ Override fetch failed:", err.message);
      }

      const editedMap = new Map();
      overrideRows.forEach(row => {
        const key = String(row.invoiceNo || row.invoice).trim();
        const category = (row.type || row.Category || '').toLowerCase();
        // Create a unique key that includes both invoice number AND category
        // This prevents edits to RentOut from affecting Booking for the same invoice
        const uniqueKey = `${key}-${category}`;
        const cash = Number(row.cash || 0);
        const rbl = Number(row.rbl || 0); // ✅ Added RBL support in overrides
        const bank = Number(row.bank || 0);
        const upi = Number(row.upi || 0);
        const total = cash + rbl + bank + upi; // ✅ Added rbl

        editedMap.set(uniqueKey, {
          ...row,
          invoiceNo: key,
          Category: row.type,
          SubCategory: row.category,
          SubCategory1: row.subCategory1 || row.SubCategory1 || "Balance Payable",
          billValue: Number(row.billValue ?? row.invoiceAmount ?? 0),
          cash, rbl, bank, upi, // ✅ Added rbl
          amount: total,
          totalTransaction: total,
          source: "edited"
        });
      });

      const allTws = [...bookingList, ...rentoutList, ...returnList, ...deleteList];
      const finalTws = allTws.map(t => {
        const key = String(t.invoiceNo).trim();
        const category = (t.Category || t.category || '').toLowerCase();
        // Match using both invoice number AND category
        const uniqueKey = `${key}-${category}`;
        const override = editedMap.get(uniqueKey);
        const isRentOut = category === 'rentout';

        return override
          ? {
            ...t,
            ...override,
            Category: override.Category || t.Category || "",
            SubCategory: override.SubCategory || override.category || t.SubCategory || t.category || "",
            SubCategory1: override.SubCategory1 || override.subCategory1 || t.SubCategory1 || t.subCategory1 || "",
            customerName: override.customerName || t.customerName || "",
            date: override.date || t.date || "",
            securityAmount: isRentOut
              ? Number(override.securityAmount ?? t.securityAmount ?? 0)
              : 0,
            Balance: isRentOut
              ? Number(override.Balance ?? t.Balance ?? 0)
              : 0,
            amount: Number(override.amount ?? t.amount),
            totalTransaction: isRentOut
              ? Number(override.securityAmount ?? t.securityAmount ?? 0) + Number(override.Balance ?? t.Balance ?? 0)
              : Number(override.totalTransaction ?? t.totalTransaction ?? override.cash + override.rbl + override.bank + override.upi) // ✅ Added rbl
          }
          : t;
      });

      const allTransactions = [...finalTws, ...mongoList];
      
      const deduped = Array.from(
        new Map(
          allTransactions.map((tx) => {
            const dateKey = new Date(tx.date).toISOString().split("T")[0];
            const key = tx._id 
              ? tx._id 
              : `${tx.invoiceNo || tx.locCode}-${dateKey}-${tx.Category || tx.type || ""}-${tx.source || ""}`;
            return [key, tx];
          })
        ).values()
      );

      setMergedTransactions(deduped);
      setMongoTransactions(mongoList);
    } catch (err) {
      console.error("❌ Error fetching transactions", err);
      console.error('[handleFetch] Error details:', err && err.stack ? err.stack : err);
    } finally {
      setIsFetching(false);
    }
  };

  const GetCreateCashBank = async (api) => {
    try {
      const response = await fetch(api, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error saving data');
      }

      const data = await response.json();
      console.log("Data saved successfully:", data);
      setPreOpen(data?.data)
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  useEffect(() => {
  }, [])
  const printRef = useRef(null);

  useEffect(() => {
    const skipBack = () => setTimeout(() => window.history.forward(), 0);
    window.addEventListener("afterprint", skipBack);
    return () => window.removeEventListener("afterprint", skipBack);
  }, []);

  const handlePrint = () => {
    if (!printRef.current) return;

    const tableHtml = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=600");

    w.document.write(`
    <html>
      <head>
        <title>Financial Summary</title>
        <style>
          @page { margin: 10mm; }
          body  { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th,td { border: 1px solid #000; padding: 4px; white-space: nowrap; }
          tr    { break-inside: avoid; }
        </style>
      </head>
      <body>${tableHtml}</body>
    </html>
  `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const [mongoTransactions, setMongoTransactions] = useState([]);
  const [mergedTransactions, setMergedTransactions] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(subCategories[0]);

  const selectedCategoryValue = selectedCategory?.value?.toLowerCase() || "all";
  const selectedSubCategoryValue = selectedSubCategory?.value?.toLowerCase() || "all";

  const toNumber = (v) => (isNaN(+v) ? 0 : +v);

  const displayedRows = mergedTransactions.filter((t) => {
    const category = (t.Category ?? t.type ?? "").toLowerCase();
    const subCategory = (t.SubCategory ?? "").toLowerCase();
    const subCategory1 = (t.SubCategory1 ?? "").toLowerCase();
    const isRentOut = category === "rentout";

    const matchesCategory =
      selectedCategoryValue === "all" || category === selectedCategoryValue;

    const matchesSubCategory =
      selectedSubCategoryValue === "all" ||
      subCategory === selectedSubCategoryValue ||
      (isRentOut && subCategory1 === selectedSubCategoryValue);

    return matchesCategory && matchesSubCategory;
  });

  // ✅ CRITICAL FIX: Use 'cash' field (calculated closing cash) for opening balance, not 'Closecash' (physical cash)
  // The 'cash' field contains the previous day's total closing cash, which should be today's opening
  const openingCash = toNumber(
    preOpen?.cash ?? preOpen?.Closecash ??  // Calculated closing cash from previous day (fallback to physical for backward compatibility)
    0
  );

  const openingRbl = toNumber(preOpen?.rbl ?? 0); // ✅ Added opening RBL

  // ✅ Updated totals calculation with RBL
  const totals = displayedRows.reduce(
    (acc, r) => ({
      cash: acc.cash + toNumber(r.cash),
      rbl: acc.rbl + toNumber(r.rbl), // ✅ Added RBL calculation
      bank: acc.bank + toNumber(r.bank),
      upi: acc.upi + toNumber(r.upi),
    }),
    { cash: openingCash, rbl: openingRbl, bank: 0, upi: 0 } // ✅ Added rbl with opening
  );

  const totalCash = totals.cash;
  const totalRblAmount = totals.rbl; // ✅ Added RBL total
  const totalBankAmount = totals.bank;
  const totalUpiAmount = totals.upi;

  const num = (v) => {
    if (v === null || v === undefined) return 0;
    const cleaned = String(v).replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // ✅ Updated export data with RBL
  const exportData = [
    {
      date: "OPENING BALANCE",
      invoiceNo: "",
      customerName: "",
      quantity: "",
      Category: "",
      SubCategory: "",
      SubCategory1: "",
      amount: openingCash + openingRbl,
      totalTransaction: openingCash + openingRbl,
      securityAmount: "",
      Balance: "",
      remark: "",
      billValue: "",
      cash: openingCash,
      rbl: openingRbl, // ✅ Added RBL to export
      bank: 0,
      upi: 0,
      attachment: "",
    },

    ...(mergedTransactions)
      .filter(
        (t) =>
          (selectedCategoryValue === "all" ||
            (t.Category ?? t.type ?? "").toLowerCase() === selectedCategoryValue) &&
          (selectedSubCategoryValue === "all" ||
            (t.SubCategory ?? "").toLowerCase() === selectedSubCategoryValue ||
            (t.SubCategory1 ?? "").toLowerCase() === selectedSubCategoryValue)
      )
      .map((t) => {
        const isReturn = t.Category === "Return";
        const isCancel = t.Category === "Cancel";
        const isRent = t.Category === "RentOut";

        let cash = num(t.cash);
        let rbl = num(t.rbl); // ✅ Added RBL to export mapping
        let bank = num(t.bank);
        let upi = num(t.upi);

        if (isReturn || isCancel) {
          cash = -Math.abs(cash);
          rbl = -Math.abs(rbl); // ✅ Added RBL negative handling
          bank = -Math.abs(bank);
          upi = -Math.abs(upi);
        }

        const securityAmount = num(t.securityAmount);
        const balance = num(t.Balance);
        const amount = isRent ? securityAmount + balance
          : cash + rbl + bank + upi; // ✅ Added rbl

        return {
          date: t.date,
          invoiceNo: t.invoiceNo || t.locCode || "",
          customerName: t.customerName || "",
          quantity: t.quantity || 1,
          Category: t.Category || t.type || "",
          SubCategory: t.SubCategory || t.category || "",
          SubCategory1: t.SubCategory1 || t.subCategory1 || "",
          amount,
          totalTransaction: t.totalTransaction ?? amount,
          securityAmount: isRent ? securityAmount : "",
          Balance: isRent ? balance : "",
          remark: t.remark || "",
          discountAmount: num(t.discountAmount || 0),
          billValue: num(t.billValue || t.invoiceAmount || t.amount || amount),
          cash,
          rbl, // ✅ Added RBL to export
          bank,
          upi,
          attachment: t.hasAttachment ? "Yes" : "No",
        };
      }),
  ];

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedTransaction, setEditedTransaction] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const handleEditClick = async (transaction, index) => {
    setIsSyncing(true);

    if (!transaction._id) {
      const patchedTransaction = {
        ...transaction,
        customerName: transaction.customerName || "",
        locCode: transaction.locCode || currentusers.locCode,
        type: transaction.Category || transaction.type || 'income',
        category: transaction.SubCategory || transaction.category || 'General',
        paymentMethod: 'cash',
        date: transaction.date || new Date().toISOString().split('T')[0],
        cash: transaction.cash || 0,
        rbl: transaction.rbl || 0, // ✅ Added RBL to sync
        bank: transaction.bank || 0,
        upi: transaction.upi || 0,
      };

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
      } catch (err) {
        alert("❌ Sync error: " + err.message);
        setIsSyncing(false);
        return;
      }
    }

    setEditedTransaction({
      _id: transaction._id,
      cash: transaction.cash || 0,
      rbl: transaction.rbl || 0, // ✅ Added RBL to edit
      bank: transaction.bank || 0,
      upi: transaction.upi || 0,
      securityAmount: transaction.securityAmount || 0,
      Balance: transaction.Balance || 0,
      date: transaction.date || "",
      customerName: transaction.customerName || "",
      invoiceNo: transaction.invoiceNo || transaction.locCode || "",
      Category: transaction.Category || transaction.type || "",
      SubCategory: transaction.SubCategory || transaction.category || "",
      SubCategory1: transaction.SubCategory1 || transaction.subCategory1 || "",
      remark: transaction.remark || "",
      billValue: transaction.billValue || 0,
      totalTransaction:
        (transaction.Category === "RentOut")
          ? (Number(transaction.securityAmount || 0) +
            Number(transaction.Balance || 0))
          : (Number(transaction.totalTransaction) ||
            Number(transaction.amount) ||
            (Number(transaction.cash || 0) +
              Number(transaction.rbl || 0) + // ✅ Added rbl
              Number(transaction.bank || 0) +
              Number(transaction.upi || 0))),
      amount:
        (transaction.Category === "RentOut")
          ? (Number(transaction.securityAmount || 0) +
            Number(transaction.Balance || 0))
          : (transaction.amount || 0)
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
      const rbl = field === 'rbl' ? numericValue : Number(prev.rbl) || 0; // ✅ Added RBL handling
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
      const payTotal = cash + rbl + bank + upi; // ✅ Added rbl

      return {
        ...prev,
        [field]: numericValue,
        cash, rbl, bank, upi, // ✅ Added rbl
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
      cash, rbl, bank, upi, // ✅ Added rbl
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
      let adjRbl = Number(rbl) || 0; // ✅ Added RBL adjustment
      let adjBank = Number(bank) || 0;
      let adjUpi = Number(upi) || 0;

      const negRow = ["return", "cancel"].includes(
        (editedTransaction.Category || "").toLowerCase()
      );
      if (negRow) {
        adjCash = -Math.abs(adjCash);
        adjRbl = -Math.abs(adjRbl); // ✅ Added RBL negative handling
        adjBank = -Math.abs(adjBank);
        adjUpi = -Math.abs(adjUpi);
      }

      const isRentOut = editedTransaction.Category === "RentOut";
      const originalBillValue = editedTransaction.billValue;
      const computedTotal = isRentOut
        ? numSec + numBal
        : adjCash + adjRbl + adjBank + adjUpi; // ✅ Added rbl

      const paySum = adjCash + adjRbl + adjBank + adjUpi; // ✅ Added rbl
      if (!isRentOut && paySum !== computedTotal) {
        if (adjCash !== 0) { adjCash = computedTotal; adjRbl = adjBank = adjUpi = 0; }
        else if (adjRbl !== 0) { adjRbl = computedTotal; adjCash = adjBank = adjUpi = 0; } // ✅ Added RBL priority
        else if (adjBank !== 0) { adjBank = computedTotal; adjCash = adjRbl = adjUpi = 0; }
        else { adjUpi = computedTotal; adjCash = adjRbl = adjBank = 0; }
      }

      const payload = {
        cash: adjCash,
        rbl: adjRbl, // ✅ Added RBL to payload
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

      const updatedRow = {
        ...editedTransaction,
        cash: adjCash,
        rbl: adjRbl, // ✅ Added RBL to updated row
        bank: adjBank,
        upi: adjUpi,
        securityAmount: numSec,
        Balance: numBal,
        amount: computedTotal,
        totalTransaction: computedTotal,
        billValue: originalBillValue,
        date,
        invoiceNo: invoiceNo || invoice,
      };

      setMongoTransactions(prev =>
        prev.map(tx => (tx._id === _id ? updatedRow : tx))
      );
      setMergedTransactions(prev =>
        prev.map(t => (t._id === _id ? updatedRow : t))
      );
      setEditingIndex(null);
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

  return (
    <>
      <Helmet>
        <title> Financial Summary | RootFin</title>
      </Helmet>

      <div>
        <Headers title={"Financial Summary Report"} />
        <div className='ml-[240px]'>
          <div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex gap-4 mb-6 w-[800px]">
              <div className='w-full flex flex-col'>
                <label htmlFor="">From *</label>
                <input
                  type="date"
                  id="fromDate"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max="2099-12-31"
                  min="2000-01-01"
                  className="border border-gray-300 py-2 px-3"
                />
              </div>
              <div className='w-full flex flex-col'>
                <label htmlFor="">To *</label>
                <input
                  type="date"
                  id="toDate"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  max="2099-12-31"
                  min="2000-01-01"
                  className="border border-gray-300 py-2 px-3"
                />
              </div>
              <button
                onClick={handleFetch}
                disabled={isFetching}
                className={`h-[40px] mt-6 rounded-md text-white px-10 transition duration-150 ${
                  isFetching
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:scale-95 active:bg-blue-700 hover:shadow-lg cursor-pointer'
                }`}
              >
                {isFetching ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Fetching...</span>
                  </div>
                ) : (
                  'Fetch'
                )}
              </button>

              <div className='w-full flex flex-col'>
                <label htmlFor="">Category</label>
                <Select
                  options={categories}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  menuPortalTarget={document.body}
                  styles={{
                    control: base => ({
                      ...base,
                      minHeight: '40px',
                      height: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      boxShadow: 'none',
                      '&:hover': {
                        border: '1px solid #d1d5db'
                      }
                    }),
                    valueContainer: base => ({
                      ...base,
                      height: '38px',
                      padding: '0 8px'
                    }),
                    input: base => ({
                      ...base,
                      margin: '0px',
                      padding: '0px'
                    }),
                    indicatorSeparator: base => ({
                      ...base,
                      display: 'none'
                    }),
                    dropdownIndicator: base => ({
                      ...base,
                      padding: '0 8px'
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    menu: base => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
              <div className='w-full flex flex-col'>
                <label htmlFor="">Sub Category</label>
                <Select
                  options={subCategories}
                  value={selectedSubCategory}
                  onChange={setSelectedSubCategory}
                  menuPortalTarget={document.body}
                  styles={{
                    control: base => ({
                      ...base,
                      minHeight: '40px',
                      height: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      boxShadow: 'none',
                      '&:hover': {
                        border: '1px solid #d1d5db'
                      }
                    }),
                    valueContainer: base => ({
                      ...base,
                      height: '38px',
                      padding: '0 8px'
                    }),
                    input: base => ({
                      ...base,
                      margin: '0px',
                      padding: '0px'
                    }),
                    indicatorSeparator: base => ({
                      ...base,
                      display: 'none'
                    }),
                    dropdownIndicator: base => ({
                      ...base,
                      padding: '0 8px'
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    menu: base => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
            </div>
           
            <div className="flex justify-end mb-6 w-[800px]">
              <div className='w-48 flex flex-col'>
                <label>Store</label>
                <select
                  value={selectedStore}
                  onChange={e => setSelectedStore(e.target.value)}
                  className="border border-gray-300 py-2 px-3"
                >
                  <option value="current">Current Store ({currentusers.locCode})</option>
                  {((currentusers.power || '').toLowerCase() === 'admin' || isClusterManager) && (
                    <option value="all">All Stores (Totals)</option>
                  )}
                </select>
              </div>
            </div>

            <div ref={printRef}>
              {selectedStore === "all" ? (
                <div className="bg-white p-4 shadow-md rounded-lg">
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table className="w-full border-collapse border rounded-md border-gray-300">
                      <thead style={{ position: "sticky", top: 0, background: "#7C7C7C", color: "white", zIndex: 2 }}>
                        <tr>
                          <th className="border p-2 align-middle">Store</th>
                          <th className="border p-2 align-middle">LocCode</th>
                          <th className="border p-2 text-right align-middle">Cash</th>
                          <th className="border p-2 text-right align-middle">RBL</th> {/* ✅ Added RBL column */}
                          <th className="border p-2 text-right align-middle">Bank</th>
                          <th className="border p-2 text-right align-middle">UPI</th>
                          <th className="border p-2 text-right align-middle">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStoresSummary.map((s, idx) => (
                          <tr key={s.locCode}>
                            <td className="border p-2 align-middle">{s.store}</td>
                            <td className="border p-2 align-middle">{s.locCode}</td>
                            <td className="border p-2 text-right align-middle">{Number(s.cash).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="border p-2 text-right align-middle">{Number(s.rbl).toLocaleString(undefined, {maximumFractionDigits: 0})}</td> {/* ✅ Added RBL cell */}
                            <td className="border p-2 text-right align-middle">{Number(s.bank).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="border p-2 text-right align-middle">{Number(s.upi).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="border p-2 text-right align-middle">{Number(s.amount).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-gray-100">
                          <td className="border p-2 align-middle" colSpan={2}>Totals</td>
                          <td className="border p-2 text-right align-middle">{Number(allStoresTotals.cash).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                          <td className="border p-2 text-right align-middle">{Number(allStoresTotals.rbl).toLocaleString(undefined, {maximumFractionDigits: 0})}</td> {/* ✅ Added RBL total */}
                          <td className="border p-2 text-right align-middle">{Number(allStoresTotals.bank).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                          <td className="border p-2 text-right align-middle">{Number(allStoresTotals.upi).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                          <td className="border p-2 text-right align-middle">{Number(allStoresTotals.amount).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 shadow-md rounded-lg">
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table className="w-full border-collapse border rounded-md border-gray-300">
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "#7C7C7C",
                          color: "white",
                          zIndex: 2,
                        }}
                      >
                        <tr>
                          <th className="border p-2">Date</th>
                          <th className="border p-2">Invoice No.</th>
                          <th className="border p-2">Customer Name</th>
                          <th className="border p-2">Quantity</th>
                          <th className="border p-2">Category</th>
                          <th className="border p-2">Sub Category</th>
                          <th className="border p-2">Remarks</th>
                          <th className="border p-2">Amount</th>
                          <th className="border p-2">Total Transaction</th>
                          <th className="border p-2">Discount</th>
                          <th className="border p-2">Bill Value</th>
                          <th className="border p-2">Cash</th>
                          <th className="border p-2">RBL</th> {/* ✅ Added RBL header */}
                          <th className="border p-2">Bank</th>
                          <th className="border p-2">UPI</th>
                          <th className="border p-2">Attachment</th>
                          {showAction && <th className="border p-2">Action</th>}
                        </tr>
                      </thead>

                      <tbody>
                        <tr className="font-bold bg-gray-100">
                          <td colSpan="10" className="border p-2">
                            OPENING BALANCE
                          </td>
                          <td className="border p-2"></td> {/* Bill Value - empty */}
                          <td className="border p-2">{preOpen.cash || 0}</td> {/* Cash */}
                          <td className="border p-2">{preOpen.rbl ?? 0}</td> {/* RBL */}
                          <td className="border p-2">0</td> {/* Bank */}
                          <td className="border p-2">0</td> {/* UPI */}
                          <td className="border p-2"></td> {/* Attachment */}
                          {showAction && <td className="border p-2"></td>}
                        </tr>

                        {mergedTransactions
                          .filter(
                            (t) =>
                              (selectedCategoryValue === "all" ||
                                t.category?.toLowerCase() === selectedCategoryValue ||
                                t.Category?.toLowerCase() === selectedCategoryValue ||
                                t.type?.toLowerCase() === selectedCategoryValue) &&
                              (selectedSubCategoryValue === "all" ||
                                t.subCategory?.toLowerCase() === selectedSubCategoryValue ||
                                t.SubCategory?.toLowerCase() === selectedSubCategoryValue ||
                                t.type?.toLowerCase() === selectedSubCategoryValue ||
                                t.subCategory1?.toLowerCase() === selectedSubCategoryValue ||
                                t.SubCategory1?.toLowerCase() === selectedSubCategoryValue ||
                                t.category?.toLowerCase() === selectedSubCategoryValue)
                          )
                          .map((transaction, index) => {
                            const isEditing = editingIndex === index;
                            const t = isEditing ? editedTransaction : transaction;

                            if (t.Category === "RentOut") {
                              return (
                                <>
                                  <tr key={`${index}-sec`}>
                                    <td className="border p-2">{t.date}</td>
                                    <td className="border p-2">{t.invoiceNo || t.locCode}</td>
                                    <td className="border p-2">
                                      {t.customerName || t.customer || t.name || "-"}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editedTransaction.quantity}
                                          onChange={(e) =>
                                            handleInputChange("quantity", e.target.value)
                                          }
                                          className="w-full"
                                        />
                                      ) : (
                                        t.quantity
                                      )}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {t.Category}
                                    </td>
                                    <td className="border p-2">{t.SubCategory}</td>
                                    <td className="border p-2">{t.remark}</td>
                                    <td className="border p-2">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editedTransaction.securityAmount}
                                          onChange={(e) =>
                                            handleInputChange("securityAmount", e.target.value)
                                          }
                                          className="w-full"
                                        />
                                      ) : (
                                        t.securityAmount
                                      )}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {t.totalTransaction}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {t.discountAmount || 0}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {t.billValue}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {isEditing && editedTransaction._id ? (
                                        <input
                                          type="number"
                                          step="any"
                                          value={editedTransaction.cash}
                                          onChange={(e) =>
                                            handleInputChange("cash", e.target.value)
                                          }
                                          className="w-full"
                                        />
                                      ) : (
                                        t.cash
                                      )}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {isEditing && editedTransaction._id ? (
                                        <input
                                          type="number"
                                          value={editedTransaction.rbl}
                                          onChange={(e) =>
                                            handleInputChange("rbl", e.target.value)
                                          }
                                          className="w-full"
                                        />
                                      ) : (
                                        t.rbl ?? 0
                                      )}
                                    </td> {/* ✅ Added RBL edit cell */}
                                    <td rowSpan="2" className="border p-2">
                                      {isEditing && editedTransaction._id ? (
                                        <input
                                          type="number"
                                          step="any"
                                          value={editedTransaction.bank}
                                          onChange={(e) =>
                                            handleInputChange("bank", e.target.value)
                                          }
                                          className="w-full"
                                        />
                                      ) : (
                                        t.bank
                                      )}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {isEditing && editedTransaction._id ? (
                                        <input
                                          type="number"
                                          step="any"
                                          value={editedTransaction.upi}
                                          onChange={(e) =>
                                            handleInputChange("upi", e.target.value)
                                          }
                                          className="w-full"
                                        />
                                      ) : (
                                        t.upi
                                      )}
                                    </td>
                                    <td rowSpan="2" className="border p-2">
                                      {t.hasAttachment && t._id ? (
                                        <a
                                          href={`${baseUrl.baseUrl}user/transaction/${t._id}/attachment`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          View
                                        </a>
                                      ) : (
                                        "-"
                                      )}
                                    </td>

                                    {showAction && (
                                      <td rowSpan="2" className="border p-2">
                                        {isSyncing && editingIndex === index ? (
                                          <span className="text-gray-400">Syncing…</span>
                                        ) : isEditing ? (
                                          <button
                                            onClick={handleSave}
                                            className="bg-green-600 text-white px-3 py-1 rounded"
                                          >
                                            Save
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleEditClick(transaction, index)}
                                            className="bg-blue-500 text-white px-3 py-1 rounded"
                                          >
                                            Edit
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>

                                  <tr key={`${index}-bal`}>
                                    <td className="border p-2">{t.date}</td>
                                    <td className="border p-2">{t.invoiceNo || t.locCode}</td>
                                    <td className="border p-2">
                                      {t.customerName || t.customer || t.name || "-"}
                                    </td>
                                    <td className="border p-2">{t.SubCategory1}</td>
                                    <td className="border p-2">{t.remark}</td>
                                    <td className="border p-2">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editedTransaction.Balance}
                                          onChange={(e) =>
                                            handleInputChange("Balance", e.target.value)
                                          }
                                          className="w-full"
                                        />
                                      ) : (
                                        t.Balance
                                      )}
                                    </td>
                                  </tr>
                                </>
                              );
                            }

                            return (
                              <tr
                                key={`${t.invoiceNo || t._id || t.locCode}-${new Date(
                                  t.date
                                ).toISOString().split("T")[0]}-${index}`}
                              >
                                <td className="border p-2">{t.date}</td>
                                <td className="border p-2">{t.invoiceNo || t.locCode}</td>
                                <td className="border p-2">
                                  {t.customerName || t.customer || t.name || "-"}
                                </td>
                                <td className="border p-2">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editedTransaction.quantity}
                                      onChange={(e) =>
                                        handleInputChange("quantity", e.target.value)
                                      }
                                      className="w-full"
                                    />
                                  ) : (
                                    t.quantity
                                  )}
                                </td>
                                <td className="border p-2">{t.Category || t.type}</td>
                                <td className="border p-2">
                                  {[t.SubCategory]
                                    .concat(
                                      t.Category === "RentOut" ? [t.SubCategory1 || t.subCategory1] : []
                                    )
                                    .filter(Boolean)
                                    .join(" + ") || "-"}
                                </td>
                                <td className="border p-2">{t.remark}</td>
                                <td className="border p-2">{Math.round(Number(t.amount)).toLocaleString()}</td>
                                <td className="border p-2">{Math.round(Number(t.totalTransaction)).toLocaleString()}</td>
                                <td className="border p-2">{Math.round(Number(t.discountAmount || 0)).toLocaleString()}</td>
                                <td className="border p-2">{Math.round(Number(t.billValue)).toLocaleString()}</td>
                                <td className="border p-2">
                                  {isEditing && editedTransaction._id ? (
                                    <input
                                      type="number"
                                      value={editedTransaction.cash}
                                      onChange={(e) => handleInputChange("cash", e.target.value)}
                                      className="w-full"
                                    />
                                  ) : (
                                    t.cash
                                  )}
                                </td>
                                <td className="border p-2">
                                  {isEditing &&
                                    editedTransaction._id &&
                                    t.SubCategory !== "Cash to Bank" ? (
                                    <input
                                      type="number"
                                      value={editedTransaction.rbl}
                                      onChange={(e) => handleInputChange("rbl", e.target.value)}
                                      className="w-full"
                                    />
                                  ) : (
                                    t.rbl ?? 0
                                  )}
                                </td> {/* ✅ Added RBL edit for regular rows */}
                                <td className="border p-2">
                                  {isEditing && editedTransaction._id ? (
                                    <input
                                      type="number"
                                      value={editedTransaction.bank}
                                      onChange={(e) => handleInputChange("bank", e.target.value)}
                                      className="w-full"
                                    />
                                  ) : (
                                    t.bank
                                  )}
                                </td>
                                <td className="border p-2">
                                  {isEditing && editedTransaction._id ? (
                                    <input
                                      type="number"
                                      value={editedTransaction.upi}
                                      onChange={(e) => handleInputChange("upi", e.target.value)}
                                      className="w-full"
                                    />
                                  ) : (
                                    t.upi
                                  )}
                                </td>
                                <td className="border p-2">
                                  {t.hasAttachment && t._id ? (
                                    <a
                                      href={`${baseUrl.baseUrl}user/transaction/${t._id}/attachment`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                      <FiDownload size={18} />
                                      Download
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>

                                {showAction && (
                                  <td className="border p-2">
                                    {isSyncing && editingIndex === index ? (
                                      <span className="text-gray-400">Syncing…</span>
                                    ) : isEditing ? (
                                      <button
                                        onClick={handleSave}
                                        className="bg-green-600 text-white px-3 py-1 rounded"
                                      >
                                        Save
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleEditClick(transaction, index)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded"
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}

                        {mergedTransactions.length === 0 && (
                          <tr>
                            <td colSpan={showAction ? 17 : 16} className="text-center border p-4"> {/* ✅ Updated colspan for RBL */}
                              No transactions found
                            </td>
                          </tr>
                        )}
                      </tbody>

                      <tfoot>
                        <tr
                          className="bg-white text-center font-semibold"
                          style={{ position: "sticky", bottom: 0, background: "#ffffff", zIndex: 2 }}
                        >
                          <td colSpan="10" className="border px-4 py-2 text-left">
                            Total:
                          </td>
                          <td className="border px-4 py-2"></td> {/* Empty Discount column */}
                          <td className="border px-4 py-2 text-right align-middle">{Math.round(Number(totalCash)).toLocaleString()}</td>
                          <td className="border px-4 py-2 text-right align-middle">{Math.round(Number(totalRblAmount)).toLocaleString()}</td> {/* ✅ Added RBL total */}
                          <td className="border px-4 py-2 text-right align-middle">{Math.round(Number(totalBankAmount)).toLocaleString()}</td>
                          <td className="border px-4 py-2 text-right align-middle">{Math.round(Number(totalUpiAmount)).toLocaleString()}</td>
                          <td className="border px-4 py-2"></td>
                          {showAction && <td className="border px-4 py-2"></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <button type='button' onClick={handlePrint} className="mt-6 w-[200px] float-right cursor-pointer bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
              <span>📥 Take pdf</span>
            </button>

            <CSVLink
              data={selectedStore === "all" ? allStoresSummary : exportData}
              headers={selectedStore === "all" ? allStoresCsvHeaders : headers}
              filename={`${fromDate} to ${toDate} report.csv`}
            >
              <button className="mt-6 w-[200px] float-right cursor-pointer bg-blue-600 text-white py-2 rounded-lg mr-[30px] flex items-center justify-center gap-2">Export CSV</button>
            </CSVLink>
          </div>
        </div>
      </div>
    </>
  )
}

export default Datewisedaybook;