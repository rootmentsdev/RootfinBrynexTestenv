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
    const [fetched, setFetched] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState("All");

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
        setFetched(true);
    };

    const fetchOptions = useMemo(() => ({}), []);
    const { data, loading: loadingBooking } = useFetch(apiUrl, fetchOptions);
    const { data: data1, loading: loadingRentout } = useFetch(apiUrl1, fetchOptions);
    const loading = loadingBooking || loadingRentout;

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
        return list.sort((a, b) => {
            const dateA = new Date(a.date).getTime() || 0;
            const dateB = new Date(b.date).getTime() || 0;
            return dateA - dateB;
        });
    }, [rentOutTransactions, bookingTransactions]);

    const filteredTransactions = useMemo(() => {
        if (categoryFilter === "All") return allTransactions;
        return allTransactions.filter(t => t.Category === categoryFilter);
    }, [allTransactions, categoryFilter]);

    const filteredTotal = useMemo(() => {
        return filteredTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
    }, [filteredTransactions]);

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
            <div className="flex flex-col leading-tight">
                <span>{datePart}</span>
                <span className="text-[11px] text-gray-400 mt-0.5">{timePart}</span>
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
        if (filteredTransactions.length === 0) return;
        const csvRows = [['Date', 'Invoice No.', 'Customer Name', 'Category', 'Subcategory', 'Income']];
        filteredTransactions.forEach(item => {
            csvRows.push([formatDateCSV(item.date), item.invoiceNo || "-", item.customerName || "-", item.Category, item.SubCategory, item.amount || 0]);
        });
        csvRows.push(['TOTAL', '', '', '', '', filteredTotal]);
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

                {/* Filter Bar */}
                <div className="flex items-end justify-between px-6 py-5 border-b border-gray-100">
                    <div className="flex items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[12px] font-medium text-gray-500">From Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-[155px] h-[40px] border border-gray-300 rounded-md pl-3 pr-10 text-sm text-gray-700 focus:outline-none focus:border-purple-500 transition-colors bg-white z-10"
                                />
                                
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[12px] font-medium text-gray-500">To Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-[155px] h-[40px] border border-gray-300 rounded-md pl-3 pr-10 text-sm text-gray-700 focus:outline-none focus:border-purple-500 transition-colors bg-white z-10"
                                />
                                
                            </div>
                        </div>

                        <button
                            onClick={handleFetch}
                            disabled={loading}
                            className="h-[40px] px-7 bg-[#a855f7] hover:bg-[#9333ea] active:bg-[#7e22ce] text-white text-sm font-semibold rounded-md transition-colors flex items-center justify-center disabled:opacity-60 shadow-sm"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Fetching...
                                </>
                            ) : 'Fetch Data'}
                        </button>

                        <div className="flex flex-col gap-1">
                            <label className="text-[12px] font-medium text-gray-500">Category</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-[155px] h-[40px] border border-gray-300 rounded-md px-3 text-sm text-gray-700 focus:outline-none focus:border-purple-500 transition-colors bg-white cursor-pointer"
                            >
                                <option value="All">All</option>
                                <option value="Booking">Booking</option>
                                <option value="Rent Out">Rent Out</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredTransactions.length === 0}
                            className="h-[38px] px-5 border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40 shadow-sm"
                        >
                            Export CSV <Download size={14} strokeWidth={2} />
                        </button>
                        <button
                            onClick={handlePrintPDF}
                            disabled={filteredTransactions.length === 0}
                            className="h-[38px] px-5 border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40 shadow-sm"
                        >
                            Print PDF <Printer size={14} strokeWidth={2} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div id="report-table-container" className="px-6 pb-12 mt-5">
                    <div className="border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#1a1f2e]">
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase">Date</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase">Invoice No.</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase">Customer Name</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase">Category</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-white uppercase">Subcategory</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold tracking-widest text-white uppercase">Income</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-5 py-14 text-center text-gray-400 text-sm">
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="animate-spin h-6 w-6 text-purple-500" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                </svg>
                                                <span>Fetching data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((transaction, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-white">
                                            <td className="px-5 py-[14px] text-gray-700 whitespace-nowrap align-top">
                                                {formatDate(transaction.date)}
                                            </td>
                                            <td className="px-5 py-[14px] text-gray-700 whitespace-nowrap">
                                                {transaction.invoiceNo}
                                            </td>
                                            <td className="px-5 py-[14px] text-gray-700 whitespace-nowrap">
                                                {transaction.customerName}
                                            </td>
                                            <td className="px-5 py-[14px] text-gray-700 whitespace-nowrap">
                                                {transaction.Category}
                                            </td>
                                            <td className="px-5 py-[14px] text-gray-700 whitespace-nowrap">
                                                {transaction.SubCategory}
                                            </td>
                                            <td className="px-5 py-[14px] text-gray-700 whitespace-nowrap text-right">
                                                {formatNumber(transaction.amount)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-5 py-14 text-center text-gray-400 text-sm">
                                            {!fetched
                                                ? "Select a date range and click Fetch Data"
                                                : "No transactions found for the selected range"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredTransactions.length > 0 && (
                                <tfoot>
                                    <tr className="bg-[#f3f4f6] border-t border-gray-200">
                                        <td colSpan="5" className="px-5 py-4 text-sm font-bold text-gray-800">
                                            Total
                                        </td>
                                        <td className="px-5 py-4 text-sm font-bold text-gray-800 text-right">
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
