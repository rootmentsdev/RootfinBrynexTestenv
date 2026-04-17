import Headers from '../components/Header.jsx';
import { useEffect, useState } from "react";
import Select from "react-select";
import baseUrl from '../api/api.js';
import { CSVLink } from 'react-csv';
import { Helmet } from "react-helmet";
import { FiDownload, FiSearch, FiPackage, FiBarChart2 } from "react-icons/fi";

// Add CSS animations
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const InventoryReport = () => {
  const [selectedStore, setSelectedStore] = useState("All Stores");
  const [reportType, setReportType] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("all");
  const [agingBucketPages, setAgingBucketPages] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(() => {
    // Default to today for stock-on-hand report
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedCategory, setSelectedCategory] = useState("all");

  const currentUser = JSON.parse(localStorage.getItem("rootfinuser"));
  const isAdmin = (currentUser?.power || "").toLowerCase() === "admin";
  const adminEmails = ['officerootments@gmail.com'];
  const isMainAdmin =
    adminEmails.some(email => (currentUser?.email || "").toLowerCase() === email.toLowerCase()) ||
    ['858', '103'].includes(currentUser?.locCode);
  const canChooseStore = isAdmin && isMainAdmin;
  
  // For store users, set their store as default and disable selection
  useEffect(() => {
    if (!canChooseStore && currentUser?.locCode) {
      setSelectedStore(currentUser.locCode);
    }
  }, [canChooseStore, currentUser?.locCode]);

  // Reset pagination when report type changes
  useEffect(() => {
    setCurrentPage(1);
    setAgingBucketPages({});
    setReportData(null);
    setCsvData([]);
    // Reset category filter when changing away from stock-summary
    if (reportType !== "stock-summary") {
      setSelectedCategory("all");
    }
  }, [reportType]);

  const storeOptions = [
    { value: "All Stores", label: "All Stores" },
    { value: "858", label: "Warehouse" },
    { value: "702", label: "G-Edappally" },
    { value: "759", label: "HEAD OFFICE01" },
    { value: "700", label: "SG-Trivandrum" },
    { value: "701", label: "G.Kottayam" },
    { value: "703", label: "G.Perumbavoor" },
    { value: "704", label: "G.Thrissur" },
    { value: "706", label: "G.Chavakkad" },
    { value: "712", label: "G.Calicut" },
    { value: "708", label: "G.Vadakara" },
    { value: "707", label: "G.Edappal" },
    { value: "709", label: "G.Perinthalmanna" },
    { value: "711", label: "G.Kottakkal" },
    { value: "710", label: "G.Manjeri" },
    { value: "705", label: "G.Palakkad" },
    { value: "717", label: "G.Kalpetta" },
    { value: "716", label: "G.Kannur" },
    { value: "718", label: "G.Mg Road" },
    { value: "101", label: "Production" },
    { value: "102", label: "Office" }
  ];

  const reportTypeOptions = [
    { value: "summary", label: "Inventory Summary" },
    { value: "stock-summary", label: "Stock Summary" },
    { value: "opening-stock", label: "Opening Stock Report" },
    { value: "stock-on-hand", label: "Stock On Hand Report" }
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "shirt", label: "Shirt Sales" },
    { value: "shoe", label: "Shoe Sales" }
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const endpoint = `api/reports/inventory/${reportType}`;
      const selectedStoreLabel = storeOptions.find(s => s.value === selectedStore)?.label;
      const currentUserStoreLabel = storeOptions.find(s => s.value === currentUser?.locCode)?.label;
      const warehouseParam = canChooseStore
        ? (selectedStoreLabel || selectedStore)
        : (currentUserStoreLabel || selectedStoreLabel || currentUser?.locCode || selectedStore);
      
      const params = new URLSearchParams({
        warehouse: warehouseParam,
        userId: currentUser?.email || currentUser?.userId,
        locCode: currentUser?.locCode
      });

      // Add month parameter if it exists (for opening-stock report)
      if (selectedMonth && reportType === "opening-stock") {
        params.append('month', selectedMonth);
      }

      // Add date range parameters for stock-on-hand report
      if (reportType === "stock-on-hand") {
        if (startDate) {
          params.append('startDate', startDate);
        }
        if (endDate) {
          params.append('endDate', endDate);
        }
      }

      // Add category parameter for stock-summary report
      if (reportType === "stock-summary" && selectedCategory !== "all") {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`${baseUrl.baseUrl}${endpoint}?${params}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error:", response.status, text);
        alert(`API Error: ${response.status} - ${text.substring(0, 100)}`);
        return;
      }
      
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
        prepareCsvData(result.data, reportType);
        setCurrentPage(1);
        setAgingBucketPages({});
      } else {
        alert("Failed to fetch report: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Error fetching report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const prepareCsvData = (data, type) => {
    let csv = [];
    if (type === "summary") {
      csv = data.items?.map(item => ({
        "Item Name": item.itemName,
        SKU: item.sku,
        Category: item.category,
        "Cost": item.cost,
        "Total Stock": item.totalStock,
        "Total Value": item.totalValue
      })) || [];
    } else if (type === "stock-summary") {
      // Filter out corrupted warehouse names (these shouldn't appear after backend normalization fix)
      const corruptedStores = ["arehouse Branch", "Grooms Trivandum"];
      const filteredWarehouses = data.warehouses?.filter(wh => 
        !corruptedStores.includes(wh.warehouse)
      ) || [];
      
      csv = filteredWarehouses.map(wh => ({
        Warehouse: wh.warehouse,
        "Total Quantity": wh.totalQuantity,
        "Total Value": wh.totalValue,
        "Item Count": wh.itemCount
      }));
    } else if (type === "opening-stock") {
      // CSV for opening stock report - item details
      csv = data.itemDetails?.map(item => ({
        "Item Name": item.itemName,
        SKU: item.sku || '',
        Store: item.store,
        "Opening Stock": item.openingStock,
        "Opening Value": item.openingValue,
        "Date Added": new Date(item.createdAt).toLocaleDateString('en-IN'),
        Type: item.type,
        "Group Name": item.groupName || ''
      })) || [];
    } else if (type === "stock-on-hand") {
      // CSV for stock on hand report - item details
      csv = data.itemDetails?.map(item => ({
        "Item Name": item.itemName,
        SKU: item.sku || '',
        Category: item.category,
        Warehouse: item.warehouse,
        "Opening Stock": item.openingStock,
        "Stock In": item.stockIn,
        "Stock Out": item.stockOut,
        "Closing Stock": item.closingStock,
        "Cost Price": item.costPrice,
        "Stock Value": item.stockValue,
        "Group Name": item.itemGroupName || ''
      })) || [];
    }
    setCsvData(csv);
  };

  // Sort items to keep group items together with proper size ordering
  const sortItemsByGroup = (items) => {
    if (!items || !Array.isArray(items)) return [];
    
    // Create a copy to avoid mutating the original
    const sortedItems = [...items];
    
    // Helper function to extract size number from item name or SKU
    const extractSizeFromName = (itemName, sku) => {
      // Try to extract size from SKU first (e.g., BLF6-1010 -> 6)
      if (sku) {
        const skuSizeMatch = sku.match(/([A-Z]+)(\d+)-/);
        if (skuSizeMatch) {
          return parseInt(skuSizeMatch[2]);
        }
      }
      
      // Try to extract size from item name using multiple patterns
      if (itemName) {
        // Pattern 1: "Item Name - Size" (e.g., "TAN LOAFER 4018 - 10" -> 10)
        const dashSizeMatch = itemName.match(/\s-\s(\d+)$/);
        if (dashSizeMatch) {
          return parseInt(dashSizeMatch[1]);
        }
        
        // Pattern 2: "Item Name/Size" (e.g., "Shoes Formal-1010 - Black/6" -> 6)
        const slashSizeMatch = itemName.match(/\/(\d+)$/);
        if (slashSizeMatch) {
          return parseInt(slashSizeMatch[1]);
        }
        
        // Pattern 3: "Item Name Size" (e.g., "TAN LOAFER 4018 10" -> 10)
        const spaceSizeMatch = itemName.match(/\s(\d+)$/);
        if (spaceSizeMatch) {
          return parseInt(spaceSizeMatch[1]);
        }
        
        // Pattern 4: Extract from SKU-like patterns in name (e.g., "T-AL6-4018" -> 6)
        const skuInNameMatch = itemName.match(/[A-Z]+-[A-Z]*(\d+)-/);
        if (skuInNameMatch) {
          return parseInt(skuInNameMatch[1]);
        }
      }
      
      return 999; // Default for items without recognizable size
    };
    
    // Sort items so that:
    // 1. Items from the same group are together (grouped by itemGroupId)
    // 2. Within each group, items are sorted by item name alphabetically, then by size numerically
    // 3. Standalone items (without groups) come after grouped items, sorted alphabetically then by size
    sortedItems.sort((a, b) => {
      const aGroupId = a.itemGroupId || null;
      const bGroupId = b.itemGroupId || null;
      
      // If both items are from groups
      if (aGroupId && bGroupId) {
        // If same group, sort by item name first, then by size
        if (aGroupId === bGroupId) {
          // First sort by base item name (without size)
          const aBaseName = (a.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
          const bBaseName = (b.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
          
          if (aBaseName !== bBaseName) {
            return aBaseName.localeCompare(bBaseName);
          }
          
          // Same base name, sort by size numerically
          const aSize = extractSizeFromName(a.itemName, a.sku);
          const bSize = extractSizeFromName(b.itemName, b.sku);
          return aSize - bSize;
        }
        
        // Different groups - sort by group name first
        const aGroupName = a.itemGroupName || '';
        const bGroupName = b.itemGroupName || '';
        if (aGroupName !== bGroupName) {
          return aGroupName.localeCompare(bGroupName);
        }
        
        // Same group name but different IDs, sort by item name then size
        const aBaseName = (a.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
        const bBaseName = (b.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
        
        if (aBaseName !== bBaseName) {
          return aBaseName.localeCompare(bBaseName);
        }
        
        const aSize = extractSizeFromName(a.itemName, a.sku);
        const bSize = extractSizeFromName(b.itemName, b.sku);
        return aSize - bSize;
      }
      
      // If only one is from a group, group items come first
      if (aGroupId && !bGroupId) return -1;
      if (!aGroupId && bGroupId) return 1;
      
      // Both are standalone items - sort by item name alphabetically, then by size
      const aBaseName = (a.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
      const bBaseName = (b.itemName || '').replace(/\s-\s\d+$/, '').replace(/\/\d+$/, '').replace(/\s\d+$/, '').trim();
      
      if (aBaseName !== bBaseName) {
        return aBaseName.localeCompare(bBaseName);
      }
      
      const aSize = extractSizeFromName(a.itemName, a.sku);
      const bSize = extractSizeFromName(b.itemName, b.sku);
      return aSize - bSize;
    });
    
    return sortedItems;
  };

  // Pagination helper functions
  const getPaginatedData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    // Sort items by group first to keep group items together
    const sortedData = sortItemsByGroup(data);
    
    // If "All" is selected, return all data
    if (itemsPerPage === "all") {
      return sortedData;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  };

  const getTotalPages = (data) => {
    if (!data || !Array.isArray(data)) return 1;
    // If "All" is selected, there's only 1 page
    if (itemsPerPage === "all") return 1;
    return Math.ceil(data.length / itemsPerPage);
  };

  // Helper for aging bucket pagination
  const getAgingBucketPage = (bucketIdx) => {
    return agingBucketPages[bucketIdx] || 1;
  };

  const setAgingBucketPage = (bucketIdx, page) => {
    setAgingBucketPages(prev => ({ ...prev, [bucketIdx]: page }));
  };

  const getPaginatedAgingItems = (items, bucketIdx) => {
    if (!items || !Array.isArray(items)) return [];
    
    // If "All" is selected, return all items
    if (itemsPerPage === "all") {
      return items;
    }
    
    const page = getAgingBucketPage(bucketIdx);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  // Filter out duplicate/corrupted warehouse names
  const getFilteredWarehouses = (warehouses) => {
    if (!warehouses || !Array.isArray(warehouses)) return [];
    // Only filter out corrupted entries (these shouldn't appear after backend normalization fix)
    // "arehouse Branch" is corrupted (missing first letter)
    // "Grooms Trivandum" is a typo that should be normalized to "Grooms Trivandrum" by backend
    const corruptedStores = ["arehouse Branch", "Grooms Trivandum"];
    return warehouses.filter(wh => !corruptedStores.includes(wh.warehouse));
  };

  const getAgingTotalPages = (items) => {
    if (!items || !Array.isArray(items)) return 1;
    // If "All" is selected, there's only 1 page
    if (itemsPerPage === "all") return 1;
    return Math.ceil(items.length / itemsPerPage);
  };

  const PaginationControls = ({ totalItems, data }) => {
    if (!data || data.length === 0) return null;
    
    const totalPages = getTotalPages(data);
    const startItem = totalItems > 0 ? (itemsPerPage === "all" ? 1 : (currentPage - 1) * itemsPerPage + 1) : 0;
    const endItem = itemsPerPage === "all" ? totalItems : Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= maxVisible; i++) {
            pages.push(i);
          }
        } else if (currentPage >= totalPages - 2) {
          for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          for (let i = currentPage - 2; i <= currentPage + 2; i++) {
            pages.push(i);
          }
        }
      }
      return pages;
    };

    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "15px", 
        marginTop: "20px", 
        padding: "15px", 
        backgroundColor: "white", 
        borderRadius: "4px",
        borderTop: "1px solid #ddd"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div style={{ color: "#666", fontSize: "14px" }}>
            Showing <span style={{ fontWeight: "bold", color: "#333" }}>{startItem}</span> to{" "}
            <span style={{ fontWeight: "bold", color: "#333" }}>{endItem}</span> of{" "}
            <span style={{ fontWeight: "bold", color: "#333" }}>{totalItems}</span> items
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#666", fontSize: "14px" }}>Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const value = e.target.value === "all" ? "all" : Number(e.target.value);
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Hide pagination buttons when "All" is selected */}
            {itemsPerPage !== "all" && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: currentPage === 1 ? "#f5f5f5" : "white",
                    color: currentPage === 1 ? "#999" : "#333",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "14px"
                  }}
                >
                  Previous
                </button>

                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      backgroundColor: currentPage === pageNum ? "#007bff" : "white",
                      color: currentPage === pageNum ? "white" : "#333",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: currentPage === pageNum ? "bold" : "normal"
                    }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: currentPage === totalPages ? "#f5f5f5" : "white",
                    color: currentPage === totalPages ? "#999" : "#333",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: "14px"
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const AgingBucketPagination = ({ bucketIdx, totalItems, items }) => {
    if (!items || items.length === 0) return null;
    
    const currentBucketPage = getAgingBucketPage(bucketIdx);
    const totalPages = getAgingTotalPages(items);
    const startItem = totalItems > 0 ? (itemsPerPage === "all" ? 1 : (currentBucketPage - 1) * itemsPerPage + 1) : 0;
    const endItem = itemsPerPage === "all" ? totalItems : Math.min(currentBucketPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentBucketPage <= 3) {
          for (let i = 1; i <= maxVisible; i++) {
            pages.push(i);
          }
        } else if (currentBucketPage >= totalPages - 2) {
          for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          for (let i = currentBucketPage - 2; i <= currentBucketPage + 2; i++) {
            pages.push(i);
          }
        }
      }
      return pages;
    };

    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "10px", 
        marginTop: "10px", 
        padding: "10px", 
        backgroundColor: "white", 
        borderRadius: "4px",
        borderTop: "1px solid #ddd"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ color: "#666", fontSize: "13px" }}>
            Showing <span style={{ fontWeight: "bold", color: "#333" }}>{startItem}</span> to{" "}
            <span style={{ fontWeight: "bold", color: "#333" }}>{endItem}</span> of{" "}
            <span style={{ fontWeight: "bold", color: "#333" }}>{totalItems}</span> items
          </div>
          
          {/* Hide pagination buttons when "All" is selected */}
          {itemsPerPage !== "all" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <button
                  onClick={() => setAgingBucketPage(bucketIdx, Math.max(1, currentBucketPage - 1))}
                  disabled={currentBucketPage === 1}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: currentBucketPage === 1 ? "#f5f5f5" : "white",
                    color: currentBucketPage === 1 ? "#999" : "#333",
                    cursor: currentBucketPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "13px"
                  }}
                >
                  Previous
                </button>

                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setAgingBucketPage(bucketIdx, pageNum)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      backgroundColor: currentBucketPage === pageNum ? "#007bff" : "white",
                      color: currentBucketPage === pageNum ? "white" : "#333",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: currentBucketPage === pageNum ? "bold" : "normal"
                    }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setAgingBucketPage(bucketIdx, Math.min(totalPages, currentBucketPage + 1))}
                  disabled={currentBucketPage === totalPages}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    backgroundColor: currentBucketPage === totalPages ? "#f5f5f5" : "white",
                    color: currentBucketPage === totalPages ? "#999" : "#333",
                    cursor: currentBucketPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: "13px"
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Inventory Report</title>
      </Helmet>
      <Headers />
      <div style={{ 
        marginLeft: "256px", 
        padding: "24px", 
        maxWidth: "calc(100% - 256px)",
        minHeight: "100vh",
        backgroundColor: "#fafbfc",
        transition: "all 0.3s ease"
      }}>
        {/* Page Header */}
        <div style={{ 
          marginBottom: "32px",
          paddingBottom: "16px",
          borderBottom: "2px solid #e9ecef"
        }}>
          <h1 style={{ 
            margin: 0,
            fontSize: "28px",
            fontWeight: "600",
            color: "#2c3e50",
            letterSpacing: "-0.5px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <FiPackage style={{ color: "#007bff" }} />
            Inventory Report
          </h1>
          <p style={{ 
            margin: "8px 0 0 0",
            color: "#6c757d",
            fontSize: "14px"
          }}>Monitor stock levels, aging, and warehouse distribution</p>
        </div>

        {/* Main Filters Card */}
        <div style={{ 
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid #e9ecef",
          transition: "box-shadow 0.3s ease"
        }}>
          <h3 style={{ 
            margin: "0 0 20px 0",
            fontSize: "16px",
            fontWeight: "600",
            color: "#495057"
          }}>Filter Options</h3>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
            gap: "20px"
          }}>
            {canChooseStore ? (
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontWeight: "500",
                  color: "#495057",
                  fontSize: "14px"
                }}>Store</label>
                <Select
                  options={storeOptions}
                  value={storeOptions.find(s => s.value === selectedStore)}
                  onChange={(opt) => setSelectedStore(opt.value)}
                  isSearchable
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: "8px",
                      borderColor: state.isFocused ? "#007bff" : "#dee2e6",
                      boxShadow: state.isFocused ? "0 0 0 2px rgba(0,123,255,0.1)" : "none",
                      padding: "4px 8px",
                      transition: "all 0.2s ease"
                    })
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontWeight: "500",
                  color: "#495057",
                  fontSize: "14px"
                }}>Store</label>
                <div style={{ 
                  padding: "12px 16px", 
                  borderRadius: "8px", 
                  border: "1px solid #dee2e6", 
                  backgroundColor: "#f8f9fa",
                  color: "#6c757d",
                  fontSize: "14px"
                }}>
                  {storeOptions.find(s => s.value === currentUser?.locCode)?.label || currentUser?.locCode || storeOptions.find(s => s.value === selectedStore)?.label || selectedStore}
                </div>
              </div>
            )}
            
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontWeight: "500",
                color: "#495057",
                fontSize: "14px"
              }}>Report Type</label>
              <Select
                options={reportTypeOptions}
                value={reportTypeOptions.find(r => r.value === reportType)}
                onChange={(opt) => setReportType(opt.value)}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderRadius: "8px",
                    borderColor: state.isFocused ? "#007bff" : "#dee2e6",
                    boxShadow: state.isFocused ? "0 0 0 2px rgba(0,123,255,0.1)" : "none",
                    padding: "4px 8px",
                    transition: "all 0.2s ease"
                  })
                }}
              />
            </div>

            {/* Category Filter - Show only for stock-summary report */}
            {reportType === "stock-summary" && (
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontWeight: "500",
                  color: "#495057",
                  fontSize: "14px"
                }}>Category</label>
                <Select
                  options={categoryOptions}
                  value={categoryOptions.find(c => c.value === selectedCategory)}
                  onChange={(opt) => setSelectedCategory(opt.value)}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: "8px",
                      borderColor: state.isFocused ? "#007bff" : "#dee2e6",
                      boxShadow: state.isFocused ? "0 0 0 2px rgba(0,123,255,0.1)" : "none",
                      padding: "4px 8px",
                      transition: "all 0.2s ease"
                    })
                  }}
                />
              </div>
            )}

            {/* Month Picker - Show only for opening-stock report */}
            {reportType === "opening-stock" && (
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontWeight: "500",
                  color: "#495057",
                  fontSize: "14px"
                }}>Select Month</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid #dee2e6",
                        fontSize: "14px",
                        transition: "all 0.2s ease"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#007bff";
                        e.target.style.boxShadow = "0 0 0 2px rgba(0,123,255,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#dee2e6";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth("")}
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#5a6268";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#6c757d";
                    }}
                  >
                    Clear
                  </button>
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  color: "#6c757d", 
                  marginTop: "4px" 
                }}>
                  Select a specific month (e.g., January 2026) or clear to show all data
                </div>
              </div>
            )}

            {/* Date Range Picker - Show only for stock-on-hand report */}
            {reportType === "stock-on-hand" && (
              <>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "500",
                    color: "#495057",
                    fontSize: "14px"
                  }}>Start Date (Optional)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #dee2e6",
                      fontSize: "14px",
                      transition: "all 0.2s ease"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#007bff";
                      e.target.style.boxShadow = "0 0 0 2px rgba(0,123,255,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#dee2e6";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <div style={{ 
                    fontSize: "12px", 
                    color: "#6c757d", 
                    marginTop: "4px" 
                  }}>
                    Leave empty to calculate from beginning of time
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "500",
                    color: "#495057",
                    fontSize: "14px"
                  }}>End Date</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid #dee2e6",
                          fontSize: "14px",
                          transition: "all 0.2s ease"
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#007bff";
                          e.target.style.boxShadow = "0 0 0 2px rgba(0,123,255,0.1)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#dee2e6";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setEndDate(today.toISOString().split('T')[0]);
                      }}
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#0056b3";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "#007bff";
                      }}
                    >
                      Today
                    </button>
                  </div>
                  <div style={{ 
                    fontSize: "12px", 
                    color: "#6c757d", 
                    marginTop: "4px" 
                  }}>
                    Stock will be calculated as of this date
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          marginBottom: "32px",
          alignItems: "center"
        }}>
          <button
            onClick={fetchReport}
            disabled={loading}
            style={{
              padding: "12px 24px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(0,123,255,0.2)"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#0056b3";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,123,255,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#007bff";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 4px rgba(0,123,255,0.2)";
              }
            }}
          >
            <FiSearch />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          
          {csvData.length > 0 && (
            <CSVLink
              data={csvData}
              filename={`inventory-report-${new Date().toISOString().split('T')[0]}.csv`}
              style={{
                padding: "12px 24px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(40,167,69,0.2)"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#218838";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(40,167,69,0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#28a745";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 4px rgba(40,167,69,0.2)";
              }}
            >
              <FiDownload /> Export CSV
            </CSVLink>
          )}
        </div>

        {/* Report Display */}
        {reportData && (
          <div style={{ 
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "1px solid #e9ecef",
            animation: "fadeIn 0.5s ease-in-out"
          }}>
            {reportType === "summary" && (
              <>
                <div style={{ 
                  marginBottom: "32px",
                  paddingBottom: "20px",
                  borderBottom: "2px solid #f8f9fa"
                }}>
                  <h2 style={{ 
                    margin: "0 0 8px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#2c3e50",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FiBarChart2 style={{ color: "#007bff" }} />
                    Inventory Summary
                  </h2>
                  <p style={{ 
                    margin: 0,
                    color: "#6c757d",
                    fontSize: "14px"
                  }}>Complete overview of inventory items and stock levels</p>
                </div>

                {/* Summary Cards */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "20px", 
                  marginBottom: "40px"
                }}>
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Items</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#2c3e50",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalItems || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Quantity</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#007bff",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalQuantity || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Stock Value</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#28a745",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.totalStockValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                </div>

                {/* Items Table */}
                <div style={{ 
                  backgroundColor: "#f8f9fa",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid #e9ecef"
                }}>
                  <table style={{ 
                    width: "100%", 
                    borderCollapse: "collapse",
                    backgroundColor: "white"
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f1f3f4" }}>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "left", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Item Name</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "left", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>SKU</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "left", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Category</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "right", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Cost</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "right", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Total Stock</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "right", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(reportData.items)?.map((item, idx) => (
                        <tr key={idx} style={{ 
                          borderBottom: "1px solid #f1f3f4",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                          <td style={{ 
                            padding: "16px 20px",
                            fontWeight: "500",
                            color: "#495057"
                          }}>{item.itemName}</td>
                          <td style={{ 
                            padding: "16px 20px", 
                            fontFamily: "monospace", 
                            fontSize: "13px",
                            color: "#6c757d"
                          }}>{item.sku}</td>
                          <td style={{ padding: "16px 20px" }}>
                            <span style={{ 
                              padding: "4px 12px", 
                              backgroundColor: "#e9ecef", 
                              borderRadius: "20px", 
                              fontSize: "12px",
                              fontWeight: "500",
                              color: "#495057"
                            }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "16px 20px", 
                            textAlign: "right",
                            color: "#6c757d"
                          }}>₹{item.cost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td style={{ 
                            padding: "16px 20px", 
                            textAlign: "right",
                            fontWeight: "600",
                            color: "#007bff"
                          }}>{item.totalStock}</td>
                          <td style={{ 
                            padding: "16px 20px", 
                            textAlign: "right",
                            fontWeight: "700",
                            color: "#28a745"
                          }}>₹{item.totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls totalItems={reportData.items?.length || 0} data={reportData.items} />
              </>
            )}

            {reportType === "stock-summary" && (
              <>
                <div style={{ 
                  marginBottom: "32px",
                  paddingBottom: "20px",
                  borderBottom: "2px solid #f8f9fa"
                }}>
                  <h2 style={{ 
                    margin: "0 0 8px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#2c3e50",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FiBarChart2 style={{ color: "#007bff" }} />
                    Stock Summary by Warehouse
                  </h2>
                  <p style={{ 
                    margin: 0,
                    color: "#6c757d",
                    fontSize: "14px"
                  }}>Distribution of inventory across different warehouse locations</p>
                </div>

                {/* Summary Cards */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "20px", 
                  marginBottom: "40px"
                }}>
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Warehouses</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#2c3e50",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalWarehouses || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Grand Total Quantity</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#007bff",
                      lineHeight: "1"
                    }}>{reportData.summary?.grandTotalQuantity || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Grand Total Value</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#28a745",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.grandTotalValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                </div>

                {/* Warehouses Table */}
                <div style={{ 
                  backgroundColor: "#f8f9fa",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid #e9ecef"
                }}>
                  <table style={{ 
                    width: "100%", 
                    borderCollapse: "collapse",
                    backgroundColor: "white"
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f1f3f4" }}>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "left", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Warehouse</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "right", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Total Quantity</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "right", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Total Value</th>
                        <th style={{ 
                          padding: "16px 20px", 
                          textAlign: "right", 
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          borderBottom: "2px solid #dee2e6"
                        }}>Item Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(getFilteredWarehouses(reportData.warehouses))?.map((wh, idx) => (
                        <tr key={idx} style={{ 
                          borderBottom: "1px solid #f1f3f4",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                          <td style={{ 
                            padding: "16px 20px",
                            fontWeight: "600",
                            color: "#495057"
                          }}>{wh.warehouse}</td>
                          <td style={{ 
                            padding: "16px 20px", 
                            textAlign: "right",
                            fontWeight: "600",
                            color: "#007bff"
                          }}>{wh.totalQuantity}</td>
                          <td style={{ 
                            padding: "16px 20px", 
                            textAlign: "right",
                            fontWeight: "700",
                            color: "#28a745"
                          }}>₹{wh.totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td style={{ 
                            padding: "16px 20px", 
                            textAlign: "right",
                            fontWeight: "600",
                            color: "#6c757d"
                          }}>{wh.itemCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls totalItems={getFilteredWarehouses(reportData.warehouses)?.length || 0} data={getFilteredWarehouses(reportData.warehouses)} />
              </>
            )}

            {reportType === "opening-stock" && (
              <>
                <div style={{ 
                  marginBottom: "32px",
                  paddingBottom: "20px",
                  borderBottom: "2px solid #f8f9fa"
                }}>
                  <h2 style={{ 
                    margin: "0 0 8px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#2c3e50",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FiPackage style={{ color: "#28a745" }} />
                    Opening Stock Report
                  </h2>
                  <p style={{ 
                    margin: 0,
                    color: "#6c757d",
                    fontSize: "14px"
                  }}>
                    Track opening stock additions by month and store location. 
                    {reportData?.summary?.period && (
                      <span style={{ fontWeight: "500", color: "#495057" }}>
                        {" "}Showing data for: {reportData.summary.period}
                      </span>
                    )}
                  </p>
                </div>

                {/* Summary Cards */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "20px", 
                  marginBottom: "40px"
                }}>
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Opening Stock</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#28a745",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalOpeningStock || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Opening Value</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#007bff",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.totalOpeningValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Items</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#dc3545",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalItems || 0}</div>
                  </div>

                  <div style={{ 
                    backgroundColor: "#e8f4fd", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #b8daff",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,123,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#0c5aa6", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Period</div>
                    <div style={{ 
                      fontSize: "18px", 
                      fontWeight: "600",
                      color: "#0c5aa6",
                      lineHeight: "1.2"
                    }}>{reportData.summary?.period || "All time"}</div>
                  </div>
                </div>

                {/* Item Details Report */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#2c3e50"
                  }}>
                    Opening Stock Items Added
                    {reportData?.summary?.period && reportData.summary.period !== "All time" && (
                      <span style={{ color: "#007bff", fontWeight: "500" }}>
                        {" "}in {reportData.summary.period}
                      </span>
                    )}
                  </h3>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #e9ecef"
                  }}>
                    <table style={{ 
                      width: "100%", 
                      borderCollapse: "collapse",
                      backgroundColor: "white"
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f3f4" }}>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Item Name</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>SKU</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Store</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Opening Stock</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Opening Value</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Date Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.itemDetails?.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ 
                              padding: "40px 20px", 
                              textAlign: "center",
                              color: "#6c757d",
                              fontSize: "16px"
                            }}>
                              <div style={{ marginBottom: "8px" }}>📦 No opening stock items found</div>
                              <div style={{ fontSize: "14px" }}>
                                {selectedMonth 
                                  ? `No items were created with opening stock in ${reportData.summary?.period || selectedMonth}`
                                  : "No items with opening stock found in the selected period"
                                }
                              </div>
                            </td>
                          </tr>
                        ) : (
                          getPaginatedData(reportData.itemDetails || []).map((item, idx) => (
                            <tr key={idx} style={{ 
                              borderBottom: "1px solid #f1f3f4",
                              transition: "background-color 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                              <td style={{ 
                                padding: "16px 20px",
                                fontWeight: "600",
                                color: "#495057"
                              }}>
                                {item.itemName}
                                {item.type === 'grouped' && (
                                  <div style={{ 
                                    fontSize: "12px", 
                                    color: "#6c757d",
                                    fontWeight: "400"
                                  }}>Group: {item.groupName}</div>
                                )}
                              </td>
                              <td style={{ 
                                padding: "16px 20px",
                                color: "#6c757d",
                                fontSize: "14px"
                              }}>{item.sku || '-'}</td>
                              <td style={{ 
                                padding: "16px 20px",
                                fontWeight: "500",
                                color: "#495057"
                              }}>{item.store}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#28a745"
                              }}>{item.openingStock}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "700",
                                color: "#007bff"
                              }}>₹{item.openingValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td style={{ 
                                padding: "16px 20px",
                                color: "#6c757d",
                                fontSize: "14px"
                              }}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    
                    {/* Add pagination controls for opening stock report */}
                    <PaginationControls 
                      totalItems={reportData.itemDetails?.length || 0} 
                      data={reportData.itemDetails || []} 
                    />
                  </div>
                </div>

                {/* Store-wise Report */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#2c3e50"
                  }}>Store-wise Opening Stock Summary</h3>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #e9ecef"
                  }}>
                    <table style={{ 
                      width: "100%", 
                      borderCollapse: "collapse",
                      backgroundColor: "white"
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f3f4" }}>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Store</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Total Opening Stock</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Total Opening Value</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Item Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.storeReport?.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ 
                              padding: "40px 20px", 
                              textAlign: "center",
                              color: "#6c757d",
                              fontSize: "16px"
                            }}>
                              <div style={{ marginBottom: "8px" }}>🏪 No store data found</div>
                              <div style={{ fontSize: "14px" }}>
                                No stores have opening stock items for the selected period
                              </div>
                            </td>
                          </tr>
                        ) : (
                          reportData.storeReport?.map((store, idx) => (
                            <tr key={idx} style={{ 
                              borderBottom: "1px solid #f1f3f4",
                              transition: "background-color 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                              <td style={{ 
                                padding: "16px 20px",
                                fontWeight: "600",
                                color: "#495057"
                              }}>{store.store}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#28a745"
                              }}>{store.totalStock}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "700",
                                color: "#007bff"
                              }}>₹{store.totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#6c757d"
                              }}>{store.itemCount}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {reportType === "stock-on-hand" && (
              <>
                <div style={{ 
                  marginBottom: "32px",
                  paddingBottom: "20px",
                  borderBottom: "2px solid #f8f9fa"
                }}>
                  <h2 style={{ 
                    margin: "0 0 8px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#2c3e50",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <FiPackage style={{ color: "#17a2b8" }} />
                    Stock On Hand Report
                  </h2>
                  <p style={{ 
                    margin: 0,
                    color: "#6c757d",
                    fontSize: "14px"
                  }}>
                    Available stock calculated based on all transactions up to the selected date.
                    {reportData?.summary?.period && (
                      <span style={{ fontWeight: "500", color: "#495057" }}>
                        {" "}{reportData.summary.period}
                      </span>
                    )}
                  </p>
                </div>

                {/* Summary Cards */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "20px", 
                  marginBottom: "40px"
                }}>
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Opening Stock</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#6c757d",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalOpeningStock || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Stock In</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#28a745",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalStockIn || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Stock Out</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#dc3545",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalStockOut || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Closing Stock</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#17a2b8",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalClosingStock || 0}</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #e9ecef",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Total Stock Value</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#28a745",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.totalStockValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>

                  <div style={{ 
                    backgroundColor: "#e8f4fd", 
                    padding: "24px", 
                    borderRadius: "12px", 
                    border: "1px solid #b8daff",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,123,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#0c5aa6", 
                      fontWeight: "500",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Period</div>
                    <div style={{ 
                      fontSize: "18px", 
                      fontWeight: "600",
                      color: "#0c5aa6",
                      lineHeight: "1.2"
                    }}>{reportData.summary?.period || "Current Stock"}</div>
                  </div>
                </div>

                {/* Item Details Report */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#2c3e50"
                  }}>
                    Stock On Hand Details
                    {reportData?.summary?.period && reportData.summary.period !== "Current Stock" && (
                      <span style={{ color: "#17a2b8", fontWeight: "500" }}>
                        {" "}({reportData.summary.period})
                      </span>
                    )}
                  </h3>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #e9ecef"
                  }}>
                    <table style={{ 
                      width: "100%", 
                      borderCollapse: "collapse",
                      backgroundColor: "white"
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f3f4" }}>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Item Name</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>SKU</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Category</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Warehouse</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Opening Stock</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Stock In</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Stock Out</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Closing Stock</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Cost Price</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Stock Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.itemDetails?.length === 0 ? (
                          <tr>
                            <td colSpan="10" style={{ 
                              padding: "40px 20px", 
                              textAlign: "center",
                              color: "#6c757d",
                              fontSize: "16px"
                            }}>
                              <div style={{ marginBottom: "8px" }}>📦 No stock found</div>
                              <div style={{ fontSize: "14px" }}>
                                No items have stock on hand for the selected criteria
                              </div>
                            </td>
                          </tr>
                        ) : (
                          getPaginatedData(reportData.itemDetails || []).map((item, idx) => (
                            <tr key={idx} style={{ 
                              borderBottom: "1px solid #f1f3f4",
                              transition: "background-color 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                              <td style={{ 
                                padding: "16px 20px",
                                fontWeight: "600",
                                color: "#495057"
                              }}>
                                {item.itemName}
                                {item.isFromGroup && (
                                  <div style={{ 
                                    fontSize: "12px", 
                                    color: "#6c757d",
                                    fontWeight: "400"
                                  }}>Group: {item.itemGroupName}</div>
                                )}
                              </td>
                              <td style={{ 
                                padding: "16px 20px",
                                color: "#6c757d",
                                fontSize: "14px",
                                fontFamily: "monospace"
                              }}>{item.sku || '-'}</td>
                              <td style={{ 
                                padding: "16px 20px"
                              }}>
                                <span style={{ 
                                  padding: "4px 12px", 
                                  backgroundColor: "#e9ecef", 
                                  borderRadius: "20px", 
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  color: "#495057"
                                }}>
                                  {item.category || 'Uncategorized'}
                                </span>
                              </td>
                              <td style={{ 
                                padding: "16px 20px",
                                fontWeight: "500",
                                color: "#495057"
                              }}>{item.warehouse}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#6c757d"
                              }}>{item.openingStock || 0}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#28a745"
                              }}>{item.stockIn || 0}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#dc3545"
                              }}>{item.stockOut || 0}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#17a2b8"
                              }}>{item.closingStock || 0}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                color: "#6c757d"
                              }}>₹{(item.costPrice || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "700",
                                color: "#28a745"
                              }}>₹{(item.stockValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    
                    <PaginationControls 
                      totalItems={reportData.itemDetails?.length || 0} 
                      data={reportData.itemDetails || []} 
                    />
                  </div>
                </div>

                {/* Warehouse-wise Report */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#2c3e50"
                  }}>Warehouse-wise Stock Summary</h3>
                  
                  <div style={{ 
                    backgroundColor: "#f8f9fa",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #e9ecef"
                  }}>
                    <table style={{ 
                      width: "100%", 
                      borderCollapse: "collapse",
                      backgroundColor: "white"
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f3f4" }}>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Warehouse</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Total Stock</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Total Value</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Item Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.warehouseReport?.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ 
                              padding: "40px 20px", 
                              textAlign: "center",
                              color: "#6c757d",
                              fontSize: "16px"
                            }}>
                              <div style={{ marginBottom: "8px" }}>🏪 No warehouse data found</div>
                              <div style={{ fontSize: "14px" }}>
                                No warehouses have stock for the selected criteria
                              </div>
                            </td>
                          </tr>
                        ) : (
                          reportData.warehouseReport?.map((warehouse, idx) => (
                            <tr key={idx} style={{ 
                              borderBottom: "1px solid #f1f3f4",
                              transition: "background-color 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                              <td style={{ 
                                padding: "16px 20px",
                                fontWeight: "600",
                                color: "#495057"
                              }}>{warehouse.warehouse}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#17a2b8"
                              }}>{warehouse.totalStock}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "700",
                                color: "#28a745"
                              }}>₹{warehouse.totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                              <td style={{ 
                                padding: "16px 20px", 
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#6c757d"
                              }}>{warehouse.totalItems}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default InventoryReport;