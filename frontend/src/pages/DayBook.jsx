import { useRef, useState, useEffect } from 'react';
import Header from '../components/Header.jsx';
import { Helmet } from "react-helmet";
import dataCache from '../utils/cache.js';
import { useSidebar } from '../hooks/useSidebar.js';
import { ArrowLeft, Calendar, Download, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import html2pdf from 'html2pdf.js';

const DayBook = () => {
    const navigate = useNavigate();
    const isSidebarOpen = useSidebar();
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [allTransactions, setAllTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [data1, setData1] = useState(null);
    const currentusers = JSON.parse(localStorage.getItem("rootfinuser"));
    const abortControllerRef = useRef(null);

    const processData = (rentoutData) => {
        const rentoutList = (rentoutData?.dataSet?.data || []).map(item => {
            const advance = Number(item.advanceAmount || 0);
            const billVal = Number(item.invoiceAmount || 0);
            const balPayable = Math.max(0, billVal - advance);

            return {
                ...item,
                date: (item.rentOutDate || "").split("T")[0],
                invoiceNo: item.invoiceNo,
                customerName: item.customerName,
                quantity: item.quantity || 1,
                Category: "RentOut",
                SubCategory: "Balance Payable",
                billValue: billVal,
                balancePayable: balPayable,
                cash: Number(item.rentoutCashAmount || 0),
                rbl: Number(item.rblRazorPay || 0),
                bank: Number(item.rentoutBankAmount || 0),
                upi: Number(item.rentoutUPIAmount || 0),
                amount: Number(item.rentoutCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.rentoutBankAmount || 0) + Number(item.rentoutUPIAmount || 0),
                totalTransaction: Number(item.rentoutCashAmount || 0) + Number(item.rblRazorPay || 0) + Number(item.rentoutBankAmount || 0) + Number(item.rentoutUPIAmount || 0),
                source: "rentout"
            };
        });

        const sortedRentoutList = rentoutList.sort((a, b) => new Date(a.date) - new Date(b.date));
        setAllTransactions(sortedRentoutList);
    };

    const handleFetch = async () => {
        const twsBase = "https://rentalapi.rootments.live/api/GetBooking";
        if (!fromDate || !toDate) {
            return alert("select date ");
        }

        const rentoutU = `${twsBase}/GetRentoutList?LocCode=${currentusers?.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

        dataCache.delete?.(rentoutU);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setIsLoading(true);

        try {
            const rentoutRes = await fetch(rentoutU, { signal });
            const rentoutData = await rentoutRes.json();

            dataCache.set(rentoutU, rentoutData);
            setData1(rentoutData);
            processData(rentoutData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Fetch error:', err);
                alert('Error fetching data. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        if (data1) {
            processData(data1);
        }
    }, [data1]);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const formatNumber = (num) => {
        if (!num && num !== 0) return "0";
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const calculateTotal = (key) => {
        if (!allTransactions) return 0;
        return allTransactions.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
    };

    const handleExportCSV = () => {
        if (!allTransactions || allTransactions.length === 0) return;
        
        const csvRows = [];
        csvRows.push(['Date', 'Invoice No.', 'Customer Name', 'Quantity', 'Bill Value', 'Cash', 'Razorpay', 'Card/Bank', 'UPI', 'Total Amount']);
        
        allTransactions.forEach(item => {
            csvRows.push([
                formatDate(item.date),
                item.invoiceNo || "-",
                item.customerName || "-",
                item.quantity || 1,
                item.billValue || 0,
                item.cash || 0,
                item.rbl || 0,
                item.bank || 0,
                item.upi || 0,
                item.amount || 0
            ]);
        });
        
        csvRows.push([
            'TOTAL',
            '-',
            '-',
            '-',
            '-',
            calculateTotal('cash'),
            calculateTotal('rbl'),
            calculateTotal('bank'),
            calculateTotal('upi'),
            calculateTotal('amount')
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const storeName = (currentusers.locName || currentusers.locCode || "Store").replace(/[^a-zA-Z0-9]/g, "_");
        const dateRange = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
        link.setAttribute("download", `Rentout_Report_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPDF = () => {
        const element = document.getElementById('report-table-container');
        const storeName = (currentusers.locName || currentusers.locCode || "Store").replace(/[^a-zA-Z0-9]/g, "_");
        const dateRange = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`;
        const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `daybook_${storeName}_${dateRange}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 1.5, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
        };
        html2pdf().set(opt).from(element).save();
    };

    return (
        <>
            <Helmet>
                <title>Rentout | RootFin</title>
            </Helmet>
            
            <Header title="Rent Out Report" />
            <div className={`transition-all duration-300 min-h-screen bg-white ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>
                
                {/* Filters Section */}
                <div className="pt-6 px-8 flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="flex flex-col gap-1.5 w-[160px]">
                            <label className="text-[12px] font-medium text-gray-400">From Date</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md h-[38px] pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 transition-colors z-10 bg-transparent"
                                />
                                
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-[160px]">
                            <label className="text-[12px] font-medium text-gray-400">To Date</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md h-[38px] pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 transition-colors z-10 bg-transparent"
                                />
                                
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleFetch}
                            disabled={isLoading}
                            className="h-[38px] px-6 bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center disabled:opacity-70"
                        >
                            {isLoading ? (
                                <><svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                </svg>Fetching...</>
                            ) : 'Fetch Data'}
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleExportCSV} className="h-[38px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center gap-2">
                            Export CSV <Download size={16} />
                        </button>
                        <button onClick={handlePrintPDF} className="h-[38px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center gap-2">
                            Print PDF <Printer size={16} />
                        </button>
                    </div>
                </div>

                <div className="px-4 pb-8" id="report-table-container">
                    <div className="border border-gray-200 rounded-md overflow-x-auto bg-white">
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                            <thead className="bg-[#1f2937]">
                                <tr>
                                    <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Date</th>
                                    <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Invoice No.</th>
                                    <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Customer Name</th>
                                    <th style={{ padding: "8px 6px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Qty</th>
                                    <th style={{ padding: "8px 6px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Bill Value</th>
                                    <th style={{ padding: "8px 6px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Cash</th>
                                    <th style={{ padding: "8px 6px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Razorpay</th>
                                    <th style={{ padding: "8px 6px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Card/Bank</th>
                                    <th style={{ padding: "8px 6px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>UPI</th>
                                    <th style={{ padding: "8px 6px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allTransactions.length > 0 ? (
                                    allTransactions.map((transaction, index) => (
                                        <tr key={index} style={{ borderBottom: "1px solid #f1f3f4" }}>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151" }}>
                                                {formatDate(transaction.date)}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151" }}>
                                                {transaction.invoiceNo || transaction._id || transaction.locCode || "-"}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151" }}>
                                                {transaction.customerName || "-"}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151", textAlign: "center" }}>
                                                {transaction.quantity || 1}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151", textAlign: "center" }}>
                                                {formatNumber(transaction.billValue)}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151", textAlign: "center" }}>
                                                {formatNumber(transaction.cash)}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151", textAlign: "center" }}>
                                                {formatNumber(transaction.rbl)}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151", textAlign: "center" }}>
                                                {formatNumber(transaction.bank)}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151", textAlign: "center" }}>
                                                {formatNumber(transaction.upi)}
                                            </td>
                                            <td style={{ padding: "6px 6px", whiteSpace: "nowrap", fontSize: "11px", color: "#374151", textAlign: "center" }}>
                                                {formatNumber(transaction.amount)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-12 text-center text-gray-500 text-sm">
                                            {!toDate || !fromDate
                                                ? "Select a date range and click Fetch Data"
                                                : "No transactions found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {allTransactions.length > 0 && (
                                <tfoot style={{ backgroundColor: "#e5e7eb" }}>
                                    <tr>
                                        <td colSpan="5" style={{ padding: "8px 6px", fontSize: "11px", fontWeight: 700, color: "#1f2937", textTransform: "uppercase" }}>
                                            Total
                                        </td>
                                        <td style={{ padding: "8px 6px", fontSize: "11px", fontWeight: 700, color: "#1f2937", textAlign: "center" }}>
                                            {formatNumber(calculateTotal('cash'))}
                                        </td>
                                        <td style={{ padding: "8px 6px", fontSize: "11px", fontWeight: 700, color: "#1f2937", textAlign: "center" }}>
                                            {formatNumber(calculateTotal('rbl'))}
                                        </td>
                                        <td style={{ padding: "8px 6px", fontSize: "11px", fontWeight: 700, color: "#1f2937", textAlign: "center" }}>
                                            {formatNumber(calculateTotal('bank'))}
                                        </td>
                                        <td style={{ padding: "8px 6px", fontSize: "11px", fontWeight: 700, color: "#1f2937", textAlign: "center" }}>
                                            {formatNumber(calculateTotal('upi'))}
                                        </td>
                                        <td style={{ padding: "8px 6px", fontSize: "11px", fontWeight: 700, color: "#1f2937", textAlign: "center" }}>
                                            {formatNumber(calculateTotal('amount'))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DayBook;