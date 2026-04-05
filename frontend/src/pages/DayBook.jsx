import { useRef, useState, useEffect } from 'react';
import Headers from '../components/Header.jsx';
import { Helmet } from "react-helmet";
import baseUrl from '../api/api.js';
import dataCache from '../utils/cache.js';

const DayBook = () => {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [allTransactions, setAllTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState(null);
    const [data1, setData1] = useState(null);
    const [data2, setData2] = useState(null);
    const [data3, setData3] = useState(null);
    const [mongoTransactions, setMongoTransactions] = useState([]);
    const currentusers = JSON.parse(localStorage.getItem("rootfinuser"));
    const abortControllerRef = useRef(null);

    const handleFetch = async () => {
        const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
        if (!fromDate || !toDate) {
            return alert("select date ");
        }

        const bookingU = `${twsBase}/GetBookingList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
        const rentoutU = `${twsBase}/GetRentoutList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
        const returnU = `${twsBase}/GetReturnList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
        const deleteU = `${twsBase}/GetDeleteList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
        const mongoU = `${baseUrl.baseUrl}user/Getpayment?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

        // Check cache for all URLs
        const cachedBooking = dataCache.get(bookingU);
        const cachedRentout = dataCache.get(rentoutU);
        const cachedReturn = dataCache.get(returnU);
        const cachedDelete = dataCache.get(deleteU);
        const cachedMongo = dataCache.get(mongoU);

        if (cachedBooking && cachedRentout && cachedReturn && cachedDelete && cachedMongo) {
            setData(cachedBooking);
            setData1(cachedRentout);
            setData2(cachedReturn);
            setData3(cachedDelete);
            setMongoTransactions(cachedMongo.data || []);
            console.log("Data loaded from cache");
            return;
        }

        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setIsLoading(true);

        try {
            // Fetch all APIs in parallel
            const [bookingRes, rentoutRes, returnRes, deleteRes, mongoRes] = await Promise.all([
                fetch(bookingU, { signal }),
                fetch(rentoutU, { signal }),
                fetch(returnU, { signal }),
                fetch(deleteU, { signal }),
                fetch(mongoU, { signal })
            ]);

            // Parse all responses in parallel
            const [bookingData, rentoutData, returnData, deleteData, mongoData] = await Promise.all([
                bookingRes.json(),
                rentoutRes.json(),
                returnRes.json(),
                deleteRes.json(),
                mongoRes.json()
            ]);

            // Cache all results (5 minutes TTL)
            dataCache.set(bookingU, bookingData);
            dataCache.set(rentoutU, rentoutData);
            dataCache.set(returnU, returnData);
            dataCache.set(deleteU, deleteData);
            dataCache.set(mongoU, mongoData);

            setData(bookingData);
            setData1(rentoutData);
            setData2(returnData);
            setData3(deleteData);
            setMongoTransactions(mongoData.data || []);

            console.log("All data fetched successfully");
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
                alert('Error fetching data. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Process and merge all transaction data
    useEffect(() => {
        const bookingList = (data?.dataSet?.data || []).map(item => ({
            ...item,
            date: item.bookingDate?.split("T")[0],
            invoiceNo: item.invoiceNo,
            customerName: item.customerName,
            quantity: item.quantity || 1,
            Category: "Booking",
            SubCategory: "Advance",
            billValue: Number(item.invoiceAmount || 0),
            cash: Number(item.bookingCashAmount || 0),
            rbl: Number(item.rblRazorPay || 0),
            bank: Number(item.bookingBankAmount || 0),
            upi: Number(item.bookingUPIAmount || 0),
            amount: Number(item.bookingCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.bookingBankAmount || 0) + Number(item.bookingUPIAmount || 0),
            totalTransaction: Number(item.bookingCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.bookingBankAmount || 0) + Number(item.bookingUPIAmount || 0),
            source: "booking"
        }));

        const rentoutList = (data1?.dataSet?.data || []).map(item => ({
            ...item,
            date: (item.rentOutDate || "").split("T")[0],
            invoiceNo: item.invoiceNo,
            customerName: item.customerName,
            quantity: item.quantity || 1,
            Category: "RentOut",
            SubCategory: "Security",
            billValue: Number(item.invoiceAmount || 0),
            cash: Number(item.rentoutCashAmount || 0),
            rbl: Number(item.rblRazorPay || 0),
            bank: Number(item.rentoutBankAmount || 0),
            upi: Number(item.rentoutUPIAmount || 0),
            amount: Number(item.rentoutCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.rentoutBankAmount || 0) + Number(item.rentoutUPIAmount || 0),
            totalTransaction: Number(item.rentoutCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.rentoutBankAmount || 0) + Number(item.rentoutUPIAmount || 0),
            source: "rentout"
        }));

        const returnList = (data2?.dataSet?.data || []).map(item => {
            const returnCashAmount = -Math.abs(Number(item.returnCashAmount || 0));
            const returnRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
            
            // Only process bank/UPI if no RBL value
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
                source: "return"
            };
        });

        const deleteList = (data3?.dataSet?.data || []).map(item => {
            const deleteCashAmount = -Math.abs(Number(item.deleteCashAmount || 0));
            const deleteRblAmount = -Math.abs(Number(item.rblRazorPay || 0));
            
            // Only process bank/UPI if no RBL value
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
                source: "deleted"
            };
        });

        const mongoList = (mongoTransactions || []).map(tx => ({
            ...tx,
            date: tx.date?.split("T")[0] || "",
            Category: tx.type,
            SubCategory: tx.category,
            customerName: tx.customerName || "",
            billValue: Number(tx.billValue ?? tx.invoiceAmount ?? tx.amount),
            cash: Number(tx.cash),
            rbl: Number(tx.rbl || tx.rblRazorPay || 0),
            bank: Number(tx.bank),
            upi: Number(tx.upi),
            amount: Number(tx.cash) + Number(tx.rbl || 0) + Number(tx.bank) + Number(tx.upi),
            totalTransaction: Number(tx.cash) + Number(tx.rbl || 0) + Number(tx.bank) + Number(tx.upi),
            source: "mongo"
        }));

        const allTws = [...bookingList, ...rentoutList, ...returnList, ...deleteList];
        const allData = [...allTws, ...mongoList];
        
        // Remove duplicates
        const deduped = Array.from(
            new Map(
                allData.map((tx) => {
                    const dateKey = new Date(tx.date).toISOString().split("T")[0];
                    const key = `${tx.invoiceNo || tx._id || tx.locCode}-${dateKey}-${tx.Category || ""}`;
                    return [key, tx];
                })
            ).values()
        );

        setAllTransactions(deduped);
    }, [data, data1, data2, data3, mongoTransactions]);

    console.log("All transactions:", allTransactions);
    const printRef = useRef(null);

    const handlePrint = () => {
        const printContent = printRef.current.innerHTML;
        const originalContent = document.body.innerHTML;
        console.log(originalContent);


        document.body.innerHTML = `<html><head><title>Dummy Report</title>
                <style>
                    @page { size: tabloid; margin: 10mm; }
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid black; padding: 8px; text-align: left; white-space: nowrap; }
                    tr { break-inside: avoid; }
                </style>
            </head><body>${printContent}</body></html>`;

        window.print();
        window.location.reload(); // Reload to restore content
    };



    return (
        <>
          {/* ✅ Page title in browser tab */}
            <Helmet>
                <title>Rentout | RootFin</title>
            </Helmet>
            <div>
      <Headers title={'Rent out Report'} />
      <div className='ml-[240px]'>
        <div className="p-6 bg-gray-100 min-h-screen">
          {/* Date Inputs */}
          <div className="flex gap-4 mb-6 w-[600px]">
            <div className='w-full flex flex-col '>
              <label htmlFor="from">From *</label>
              <input
                type="date"
                id="from"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className='border border-gray-300 py-[6px]'
              />
            </div>
            <div className='w-full flex flex-col '>
              <label htmlFor="to">To *</label>
              <input
                type="date"
                id="to"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className='border border-gray-300 py-[6px]'
              />
            </div>
    
            <button
              className='bg-blue-500 w-[400px] h-[40px] mt-[20px] rounded-md text-white flex items-center justify-center gap-2'
              onClick={handleFetch}
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading && (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isLoading ? 'Loading...' : 'Fetch'}
            </button>
          </div>
    
          {/* Table */}
          <div ref={printRef}>
            <div className="bg-white p-4 shadow-md rounded-lg">
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table className="w-full border-collapse border rounded-md border-gray-300">
                  <thead
                    className="rounded-md"
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#7C7C7C",
                      color: "white",
                      zIndex: 2
                    }}
                  >
                    <tr className="rounded-md">
                      <th className="border p-2">Date</th>
                      <th className="border p-2">Invoice No</th>
                      <th className="border p-2">Customer Name</th>
                      <th className="border p-2">Quantity</th>
                      <th className="border p-2">Bill Value</th>
                      <th className="border p-2">Cash</th>
                      <th className="border p-2">RBL</th>
                      <th className="border p-2">Bank</th>
                      <th className="border p-2">UPI</th>
                      <th className="border p-2">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTransactions.length > 0 ? (
                      allTransactions.map((transaction, index) => (
                        <tr key={index}>
                          <td className="border p-2">{transaction.date}</td>
                          <td className="border p-2">{transaction.invoiceNo || transaction._id || transaction.locCode}</td>
                          <td className="border p-2">{transaction.customerName || "-"}</td>
                          <td className="border p-2">{transaction.quantity || 1}</td>
                          <td className="border p-2">{transaction.billValue}</td>
                          <td className="border p-2">{transaction.cash}</td>
                          <td className="border p-2">{transaction.rbl}</td>
                          <td className="border p-2">{transaction.bank}</td>
                          <td className="border p-2">{transaction.upi}</td>
                          <td className="border p-2">{transaction.amount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="text-center border p-4">
                          {!toDate || !fromDate
                            ? "Select Data range first"
                            : "No transactions found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
    
                  {/* Footer Totals */}
                  <tfoot>
                    <tr
                      className="bg-white text-center font-semibold"
                      style={{
                        position: "sticky",
                        bottom: 0,
                        background: "#ffffff",
                        zIndex: 1
                      }}
                    >
                      <td className="border border-gray-300 px-4 py-2 text-left" colSpan="5">
                        Total:
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {allTransactions.reduce((sum, item) => sum + Number(item.cash || 0), 0)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {allTransactions.reduce((sum, item) => sum + Number(item.rbl || 0), 0)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {allTransactions.reduce((sum, item) => sum + Number(item.bank || 0), 0)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {allTransactions.reduce((sum, item) => sum + Number(item.upi || 0), 0)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {allTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
    
          <button
            onClick={handlePrint}
            className="mt-6 w-[200px] float-right cursor-pointer bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <span>📥 Take pdf</span>
          </button>
        </div>
      </div>
    </div>
        </>

    )
}

export default DayBook