import { useMemo, useState } from "react";
import Header from '../components/Header.jsx';
import useFetch from '../hooks/useFetch.jsx';
import { Helmet } from "react-helmet";
import { useSidebar } from '../hooks/useSidebar.js';
import { Calendar, Download, Printer } from "lucide-react";
import html2pdf from 'html2pdf.js';

const Revenuereport = () => {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [apiUrl, setApiUrl] = useState("");
    const [apiUrl1, setApiUrl1] = useState("");

    const isSidebarOpen = useSidebar();
    const currentusers = JSON.parse(localStorage.getItem("rootfinuser")) || {};

    const handleFetch = () => {
        if (!fromDate || !toDate) {
            alert("Please select both From and To dates.");
            return;
        }
        const baseUrl1 = "https://rentalapi.brynex.live/api/GetBooking";
        const updatedApiUrl = `${baseUrl1}/GetBookingList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
        const updatedApiUrl1 = `${baseUrl1}/GetRentoutList?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

        setApiUrl(updatedApiUrl);
        setApiUrl1(updatedApiUrl1);
    };

    const fetchOptions = useMemo(() => ({}), []);
    const { data, loading: loadingBooking } = useFetch(apiUrl, fetchOptions);
    const { data: data1, loading: loadingRentout } = useFetch(apiUrl1, fetchOptions);
    const loading = loadingBooking || loadingRentout;

    // Process Booking transactions
    const bookingTransactions = useMemo(() => {
        return (data?.dataSet?.data || []).map(transaction => ({
            ...transaction,
            date: transaction.bookingDate || transaction.date || "",
            invoiceNo: transaction.invoiceNo || transaction.locCode || "-",
            customerName: transaction.customerName || "-",
            Category: "Booking",
            SubCategory: "Advance",
            amount: parseInt(transaction.bookingBankAmount || 0, 10) + parseInt(transaction.bookingUPIAmount || 0, 10) + parseInt(transaction.bookingCashAmount || 0, 10),
        }));
    }, [data]);

    // Process RentOut transactions
    const rentOutTransactions = useMemo(() => {
        return (data1?.dataSet?.data || []).map(transaction => {
            const upi = parseInt(transaction.rentoutUPIAmount || 0, 10);
            const bank = parseInt(transaction.rentoutBankAmount || 0, 10);
            const cash = parseInt(transaction.rentoutCashAmount || 0, 10);
            const sec = parseInt(transaction.securityAmount || 0, 10);
            const netRentout = (upi + bank + cash) - sec;
            return {
                ...transaction,
                date: transaction.rentOutDate || transaction.date || "",
                invoiceNo: transaction.invoiceNo || transaction.locCode || "-",
                customerName: transaction.customerName || "-",
                Category: "Rent Out",
                SubCategory: "Balance Payable",
                amount: netRentout >= 0 ? netRentout : 0,
            };
        });
    }, [data1]);

    const allTransactions = useMemo(() => {
        const list = [...rentOutTransactions, ...bookingTransactions];
        // Sort newest first
        return list.sort((a, b) => {
            const dateA = new Date(a.date).getTime() || 0;
            const dateB = new Date(b.date).getTime() || 0;
            return dateB - dateA;
        });
    }, [rentOutTransactions, bookingTransactions]);

    const filteredTotal = useMemo(() => {
        return allTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
    }, [allTransactions]);

    const formatNumber = (num) => {
        if (!num) return "0";
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const d = new Date(dateString);
        if (isNaN(d)) return dateString;
        
        const datePart = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
        const timePart = d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        
        return (
            <div className="flex flex-col">
                <span>{datePart}</span>
                <span className="text-[10px] text-gray-400">{timePart}</span>
            </div>
        );
    };

    const formatDateCSV = (dateString) => {
        if (!dateString) return "-";
        const d = new Date(dateString);
        if (isNaN(d)) return dateString;
        return d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleExportCSV = () => {
        if (allTransactions.length === 0) return;
        
        const csvRows = [];
        // Header
        csvRows.push(['Date', 'Invoice No.', 'Customer Name', 'Category', 'Subcategory', 'Difference']);
        
        // Data
        allTransactions.forEach(item => {
            csvRows.push([
                formatDateCSV(item.date),
                item.invoiceNo || "-",
                item.customerName || "-",
                item.Category,
                item.SubCategory,
                item.amount || 0
            ]);
        });
        
        // Total
        csvRows.push([
            'TOTAL',
            '',
            '',
            '',
            '',
            filteredTotal
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Revenue_Report_${fromDate}_to_${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPDF = () => {
        const element = document.getElementById('report-table-container');
        const opt = {
            margin: 0.5,
            filename: `Revenue_Report_${fromDate}_to_${toDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        html2pdf().set(opt).from(element).save();
    };

    return (
        <>
            <Helmet>
                <title>Revenue Report | RootFin</title>
            </Helmet>

            <Header title="Revenue Report" />
            <div className={`transition-all duration-300 min-h-screen bg-white ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>
                
                {/* Filters Section */}
                <div className="px-8 flex flex-col md:flex-row md:items-end justify-between py-8 gap-4">
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="flex flex-col gap-1.5 w-[160px]">
                            <label className="text-[12px] font-medium text-gray-400">From Date</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md h-[38px] pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10 bg-transparent"
                                />
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-0" size={16} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-[160px]">
                            <label className="text-[12px] font-medium text-gray-400">To Date</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md h-[38px] pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10 bg-transparent"
                                />
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-0" size={16} />
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleFetch}
                            disabled={loading}
                            className="h-[38px] px-6 bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center disabled:opacity-70"
                        >
                            {loading ? (
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

                {/* Table Section */}
                <div className="px-8 pb-12" id="report-table-container">
                    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                        <table className="w-full">
                            <thead className="bg-[#1f2937]">
                                <tr>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-white uppercase">Date</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-white uppercase">Invoice No.</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-white uppercase">Customer Name</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-white uppercase">Category</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-white uppercase">Subcategory</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-wider text-white uppercase">Difference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allTransactions.length > 0 ? (
                                    allTransactions.map((transaction, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatDate(transaction.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {transaction.invoiceNo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {transaction.customerName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {transaction.Category}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {transaction.SubCategory}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatNumber(transaction.amount)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500 text-sm">
                                            {!toDate || !fromDate
                                                ? "Select a date range and click Fetch Data"
                                                : "No transactions found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {allTransactions.length > 0 && (
                                <tfoot className="bg-[#e5e7eb]">
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 uppercase text-left">
                                            Total
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                            {formatNumber(filteredTotal)}
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

export default Revenuereport;
