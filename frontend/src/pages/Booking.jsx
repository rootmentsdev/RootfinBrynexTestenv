import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import useFetch from '../hooks/useFetch.jsx';
import { Helmet } from "react-helmet";
import { useSidebar } from '../hooks/useSidebar.js';
import { ArrowLeft, Calendar, Download, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import html2pdf from 'html2pdf.js';

const Booking = () => {
    const navigate = useNavigate();
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [apiUrl, setApiUrl] = useState("");
    const isSidebarOpen = useSidebar();
    const currentusers = JSON.parse(localStorage.getItem("rootfinuser"));

    const handleFetch = () => {
        const baseUrl = "https://rentalapi.brynex.live/api/GetBooking";
        if (!fromDate || !toDate) {
            return alert("select date ");
        } else {
            const updatedApiUrl = `${baseUrl}/GetBookingListDateWise?LocCode=${currentusers.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
            setApiUrl(updatedApiUrl);
            console.log("API URLs Updated:", updatedApiUrl);
        }
    };

    const fetchOptions = useMemo(() => ({}), []);
    const { data, loading } = useFetch(apiUrl, fetchOptions);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const formatNumber = (num) => {
        if (!num) return "0";
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const calculateTotal = (key) => {
        if (!data?.dataSet?.data) return 0;
        return data.dataSet.data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
    };

    const handleExportCSV = () => {
        if (!data?.dataSet?.data || data.dataSet.data.length === 0) return;
        
        const csvRows = [];
        // Header
        csvRows.push(['Date', 'No. of Bills', 'Quantity', 'Advance', 'Bill Value']);
        
        // Data
        data.dataSet.data.forEach(item => {
            csvRows.push([
                formatDate(item.bookingDate),
                item.noofbills || 0,
                item.quantity || 0,
                item.advanceAmount || 0,
                item.billValue || 0
            ]);
        });
        
        // Total
        csvRows.push([
            'TOTAL',
            calculateTotal('noofbills'),
            calculateTotal('quantity'),
            calculateTotal('advanceAmount'),
            calculateTotal('billValue')
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Booking_Report_${fromDate}_to_${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPDF = () => {
        const element = document.getElementById('report-table-container');
        const opt = {
            margin: 0.5,
            filename: `Booking_Report_${fromDate}_to_${toDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        html2pdf().set(opt).from(element).save();
    };

    return (
        <>
            <Helmet>
                <title>Booking | RootFin</title>
            </Helmet>

            <Header title="Booking Report" />
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
                                    <th className="px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-white uppercase">No. of Bills</th>
                                    <th className="px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-white uppercase">Quantity</th>
                                    <th className="px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-white uppercase">Advance</th>
                                    <th className="px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-white uppercase">Bill Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data?.dataSet?.data?.length > 0 ? (
                                    data.dataSet.data.map((transaction, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatDate(transaction.bookingDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                                {transaction.noofbills || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                                {transaction.quantity || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                                {formatNumber(transaction.advanceAmount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                                {formatNumber(transaction.billValue)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">
                                            {!toDate || !fromDate
                                                ? "Select a date range and click Fetch Data"
                                                : "No transactions found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {data?.dataSet?.data?.length > 0 && (
                                <tfoot className="bg-[#e5e7eb]">
                                    <tr>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 uppercase">
                                            Total
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-center">
                                            {calculateTotal('noofbills')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-center">
                                            {calculateTotal('quantity')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-center">
                                            {formatNumber(calculateTotal('advanceAmount'))}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-center">
                                            {formatNumber(calculateTotal('billValue'))}
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

export default Booking;
