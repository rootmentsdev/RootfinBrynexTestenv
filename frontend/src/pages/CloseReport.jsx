import { useRef, useState, useMemo } from 'react';
import Headers from '../components/Header';
import baseUrl from '../api/api';

const CloseReport = () => {
  const AllLoation = [
    { "locName": "Z-Edapally1", "locCode": "144" },
    // { "locName": "Warehouse", "locCode": "858" },
    { "locName": "G-Edappally", "locCode": "702" },
    // { "locName": "HEAD OFFICE01", "locCode": "759" },
    { "locName": "SG-Trivandrum", "locCode": "700" },
    { "locName": "Z- Edappal", "locCode": "100" },
    { "locName": "Z.Perinthalmanna", "locCode": "133" },
    { "locName": "Z.Kottakkal", "locCode": "122" },
    { "locName": "G.Kottayam", "locCode": "701" },
    { "locName": "G.Perumbavoor", "locCode": "703" },
    { "locName": "G.Thrissur", "locCode": "704" },
    { "locName": "G.Chavakkad", "locCode": "706" },
    { "locName": "G.Calicut ", "locCode": "712" },
    { "locName": "G.Vadakara", "locCode": "708" },
    { "locName": "G.Edappal", "locCode": "707" },
    { "locName": "G.Perinthalmanna", "locCode": "709" },
    { "locName": "G.Kottakkal", "locCode": "711" },
    { "locName": "G.Manjeri", "locCode": "710" },
    { "locName": "G.Palakkad ", "locCode": "705" },
    { "locName": "G.Kalpetta", "locCode": "717" },
    { "locName": "G.Kannur", "locCode": "716" },
    { "locName": "G.MG Road", "locCode": "718" }
  ];

  const [fromDate, setFromDate] = useState("");
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const printRef = useRef(null);

  const currentuser = JSON.parse(localStorage.getItem("rootfinuser"));

  const formatDate = (inputDate) => {
    const [year, month, day] = inputDate.split("-");
    return `${year}-${month}-${day}`;
  };

  const handleFetch = async () => {
    if (!fromDate) return alert("Please select a date first.");

    setIsLoading(true);
    const formattedDate = formatDate(fromDate);
    const updatedApiUrl = `${baseUrl?.baseUrl}user/AdminColseView?date=${formattedDate}&role=${currentuser?.power}`;

    try {
      const response = await fetch(updatedApiUrl);
      if (response.status === 401) {
        setIsLoading(false);
        return alert("Error: Data already saved for today.");
      } else if (!response.ok) {
        setIsLoading(false);
        return alert("Error: Failed to fetch data.");
      }

      const result = await response.json();
      
      console.log('🔍 CloseReport - Raw API response:', result);
      console.log('🔍 CloseReport - Data array:', result?.data);

      // Process data in chunks for better performance
      const processDataInChunks = (data, chunkSize = 50) => {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
      };

      const rawData = result?.data || [];
      const dataChunks = processDataInChunks(rawData);
      
      let mappedData = [];
      
      // Process chunks to avoid blocking UI
      for (const chunk of dataChunks) {
        const processedChunk = chunk.map((transaction) => {
          const foundLoc = AllLoation.find(item => item.locCode === transaction.locCode);
          const storeName = foundLoc ? foundLoc.locName : "Unknown";

          console.log(`🔍 Transaction for ${storeName} (${transaction.locCode}):`, {
            cash: transaction.cash,
            Closecash: transaction.Closecash,
            bank: transaction.bank,
            rawTransaction: transaction
          });

          const calculatedClosingCash = Number(transaction.cash || 0);
          const physicalCash = Number(transaction.Closecash || 0);
          const difference = calculatedClosingCash - physicalCash;
          const match = difference === 0 ? 'Match' : 'Mismatch';

          const bankAmount = parseInt(transaction.bank || 0);
          const upiAmount = parseInt(transaction.upi || 0);
          const bankPlusUpi = bankAmount + upiAmount;

          return { 
            ...transaction,
            cash: calculatedClosingCash,
            Closecash: physicalCash,
            difference,
            match,
            storeName,
            bankPlusUpi
          };
        });
        
        mappedData = [...mappedData, ...processedChunk];
        
        // Yield control to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setData({ ...result, data: mappedData });
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
      alert("An unexpected error occurred.");
    }
  };

  // Memoized filtered transactions for better performance
  const filteredTransactions = useMemo(() => {
    const transactions = data?.data || [];
    if (filter === "All") return transactions;
    return transactions.filter(transaction => transaction.match === filter);
  }, [data?.data, filter]);

  // Memoized not closing branches calculation
  const NotClosingBranch = useMemo(() => {
    const transactions = filteredTransactions;
    return AllLoation.filter((loc) => {
      return !transactions.some((txn) => txn.storeName === loc.locName);
    });
  }, [filteredTransactions, AllLoation]);



  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <style>{`
        @media print {
          @page { size: tabloid; margin: 10mm; }
          body { font-family: Arial, sans-serif; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; white-space: nowrap; }
          tr { break-inside: avoid; }
          .print-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center; }
        }
      `}</style>
      <Headers title={'Close Report'} />
      <div className='ml-[240px]'>
        <div className="p-6 bg-gray-100 min-h-screen">
          {/* Date Input */}
          <div className="flex gap-4 mb-6 w-[600px] no-print">
            <div className='w-full flex flex-col'>
              <label htmlFor="from">From *</label>
              <input
                type="date"
                id="from"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className='border border-gray-300 py-[6px]'
              />
            </div>

            <button
              disabled={!fromDate || isLoading}
              className={`w-[400px] h-[40px] mt-[20px] rounded-md text-white flex items-center justify-center gap-2 ${
                !fromDate || isLoading 
                  ? 'bg-blue-300 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              onClick={handleFetch}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                'Fetch'
              )}
            </button>
          </div>

          {/* Match Filter Buttons */}
          <div className="mb-4 flex gap-4 no-print">
            <button onClick={() => setFilter("All")} className={`px-4 py-2 rounded ${filter === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>All</button>
            <button onClick={() => setFilter("Match")} className={`px-4 py-2 rounded ${filter === 'Match' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>Match</button>
            <button onClick={() => setFilter("Mismatch")} className={`px-4 py-2 rounded ${filter === 'Mismatch' ? 'bg-red-600 text-white' : 'bg-gray-300'}`}>Mismatch</button>
          </div>

          {/* Table */}
          <div ref={printRef}>
            <h2 className="print-title" style={{display: 'none'}}>Financial Summary Report - {fromDate}</h2>
            <div className="bg-white p-4 shadow-md rounded-lg">
              <table className="w-full border-collapse border rounded-md border-gray-300">
                <thead>
                  <tr className="bg-[#7C7C7C] text-white">
                    <th className="border p-2">No.of</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Store</th>
                    <th className="border p-2">locCode</th>
                    <th className="border p-2">Bank</th>
                    <th className="border p-2">Cash</th>
                    <th className="border p-2">Close Cash</th>
                    <th className="border p-2">difference</th>
                    <th className="border p-2">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="9" className="text-center border p-8">
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="text-gray-600">Loading data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction, index) => (

                      <tr key={index}>
                        <td className="border p-2">{index + 1}</td>

                        <td className="border p-2">{transaction.date.split('T')[0]}</td>
                        <td className="border p-2">{transaction.storeName}</td>
                        <td className="border p-2">{transaction.locCode}</td>
                        <td className="border p-2">{transaction.bankPlusUpi}</td>
                        <td className="border p-2">{transaction.cash}</td>
                        <td className="border p-2">{transaction.Closecash}</td>
                        <td className='border p-2'>{transaction.difference}</td>
                        <td className={`border p-2 ${transaction.match === 'Match' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}`}>
                          {transaction.match}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center border p-4">
                        {!fromDate ? "Select date first" : "No transactions found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          <h1 className='mt-10 mb-10 ml-10 text-xl font-bold text-red-500'>
            They haven’t closed their store balance          </h1>

          <table className="w-full border-collapse border rounded-md border-red-400">
            <thead>
              <tr className="bg-[#7C7C7C] text-white">
                <th className="border border-red-400 p-2">No.of</th>
                <th className="border border-red-400 p-2">Date</th>
                <th className="border border-red-400 p-2">Store</th>
                <th className="border border-red-400 p-2">locCode</th>

              </tr>
            </thead>
            <tbody>
              {NotClosingBranch.length > 0 ? (
                NotClosingBranch.map((transaction, index) => (

                  <tr key={index}>
                    <td className="border border-red-400 p-2">{index + 1}</td>

                    <td className="border border-red-400 p-2">{fromDate}</td>
                    <td className="border border-red-400 p-2">{transaction.locName}</td>
                    <td className="border border-red-400 p-2">{transaction.locCode}</td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center border border-red-400 p-4">
                    {!fromDate ? "Select date first" : "No transactions found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="mt-6 w-[200px] float-right bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 no-print"
          >
            📥 Take PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseReport;
