import Headers from '../components/Header.jsx';
import { useEffect, useState } from "react";
import Select from "react-select";
import baseUrl from '../api/api.js';
import { CSVLink } from 'react-csv';
import { Helmet } from "react-helmet";
import { FiDownload, FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";

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
  
  @keyframes slideDown {
    from {
      opacity: 0;
      max-height: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      max-height: 200px;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 1;
      max-height: 200px;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      max-height: 0;
      transform: translateY(-10px);
    }
  }
  
  .payment-breakdown-enter {
    animation: slideDown 0.4s ease-out forwards;
  }
  
  .payment-breakdown-exit {
    animation: slideUp 0.3s ease-in forwards;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const SalesReport = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedStore, setSelectedStore] = useState("all");
  const [reportType, setReportType] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);
  
  // Advanced filtering removed as requested

  const currentUser = JSON.parse(localStorage.getItem("rootfinuser"));
  const isAdmin = (currentUser?.power || "").toLowerCase() === "admin";
  
  // For store users, set their store as default and disable selection
  useEffect(() => {
    if (!isAdmin && currentUser?.locCode) {
      setSelectedStore(currentUser.locCode);
    }
  }, [isAdmin, currentUser]);

  const storeOptions = [
    { value: "all", label: "All Stores" },
    { value: "144", label: "Z-Edapally1" },
    { value: "858", label: "Warehouse" },
    { value: "702", label: "G-Edappally" },
    { value: "759", label: "HEAD OFFICE01" },
    { value: "700", label: "SG-Trivandrum" },
    { value: "100", label: "Z- Edappal" },
    { value: "133", label: "Z.Perinthalmanna" },
    { value: "122", label: "Z.Kottakkal" },
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
    { value: "718", label: "G.MG Road" },
    { value: "101", label: "Production" },
    { value: "102", label: "Office" },
    { value: "103", label: "WAREHOUSE" }
  ];

  const reportTypeOptions = [
    { value: "summary", label: "Sales Summary" },
    { value: "by-item", label: "Sales by Item" },
    { value: "returns", label: "Return Summary" }
  ];

  // Advanced filtering options removed

  const fetchReport = async () => {
    setLoading(true);
    try {
      const endpoint = `api/reports/sales/${reportType}`;
      
      const params = new URLSearchParams({
        dateFrom: fromDate,
        dateTo: toDate,
        locCode: isAdmin ? selectedStore : currentUser?.locCode,
        userId: currentUser?.email || currentUser?.userId
      });

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
      csv = data.invoices?.map(inv => ({
        Date: inv.date,
        "Invoice No": inv.invoiceNumber,
        Customer: inv.customer,
        Category: inv.category,
        Amount: inv.amount,
        Discount: inv.discount,
        "Payment Method": inv.paymentMethod,
        Branch: inv.branch
      })) || [];
    } else if (type === "by-item") {
      csv = data.items?.map(item => ({
        "Item Name": item.name,
        SKU: item.sku,
        Category: item.category,
        Size: item.size,
        Quantity: item.quantity,
        "Unit Price": item.unitPrice,
        "Total Amount": item.totalAmount,
        "Invoice Count": item.invoiceCount
      })) || [];
    } else if (type === "returns") {
      csv = data.returns?.map(ret => ({
        Date: ret.date,
        "Invoice No": ret.invoiceNumber,
        Customer: ret.customer,
        Amount: ret.amount,
        Reason: ret.reason,
        Branch: ret.branch
      })) || [];
    }
    setCsvData(csv);
  };

  return (
    <>
      <Helmet>
        <title>Sales Report</title>
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
            letterSpacing: "-0.5px"
          }}>Sales Report</h1>
          <p style={{ 
            margin: "8px 0 0 0",
            color: "#6c757d",
            fontSize: "14px"
          }}>Generate comprehensive sales analytics and insights</p>
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
            <div style={{ position: "relative" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontWeight: "500",
                color: "#495057",
                fontSize: "14px"
              }}>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "12px 16px", 
                  borderRadius: "8px", 
                  border: "1px solid #dee2e6",
                  fontSize: "14px",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#007bff"}
                onBlur={(e) => e.target.style.borderColor = "#dee2e6"}
              />
            </div>
            
            <div style={{ position: "relative" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontWeight: "500",
                color: "#495057",
                fontSize: "14px"
              }}>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "12px 16px", 
                  borderRadius: "8px", 
                  border: "1px solid #dee2e6",
                  fontSize: "14px",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#007bff"}
                onBlur={(e) => e.target.style.borderColor = "#dee2e6"}
              />
            </div>
            
            {isAdmin ? (
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
                  placeholder="Select Store..."
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
                  {storeOptions.find(s => s.value === selectedStore)?.label || selectedStore}
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
              filename={`sales-report-${fromDate}-to-${toDate}.csv`}
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
                    color: "#2c3e50"
                  }}>Sales Summary</h2>
                  <p style={{ 
                    margin: 0,
                    color: "#6c757d",
                    fontSize: "14px"
                  }}>Overview of sales performance for the selected period</p>
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
                    }}>Total Invoices</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#2c3e50",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalInvoices || 0}</div>
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
                    }}>Total Sales</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#28a745",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.totalSales || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
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
                    }}>Total Discount</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#dc3545",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.totalDiscount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
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
                    }}>Net Sales</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#007bff",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.netSales || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                </div>

                {/* Payment Breakdown - Collapsible */}
                <div style={{ marginBottom: "40px" }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    marginBottom: "20px"
                  }}>
                    <h3 style={{ 
                      margin: 0,
                      fontSize: "20px",
                      fontWeight: "600",
                      color: "#495057"
                    }}>Payment Breakdown</h3>
                    
                    <button
                      onClick={() => setShowPaymentBreakdown(!showPaymentBreakdown)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        backgroundColor: showPaymentBreakdown ? "#007bff" : "#f8f9fa",
                        color: showPaymentBreakdown ? "white" : "#495057",
                        border: "1px solid #dee2e6",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "all 0.3s ease",
                        outline: "none"
                      }}
                      onMouseEnter={(e) => {
                        if (!showPaymentBreakdown) {
                          e.target.style.backgroundColor = "#e9ecef";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!showPaymentBreakdown) {
                          e.target.style.backgroundColor = "#f8f9fa";
                        }
                      }}
                    >
                      {showPaymentBreakdown ? "Hide Details" : "Show Details"}
                      {showPaymentBreakdown ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </div>
                  
                  {showPaymentBreakdown && (
                    <div 
                      className="payment-breakdown-enter"
                      style={{ 
                        overflow: "hidden",
                        transition: "all 0.4s ease-out"
                      }}
                    >
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", 
                        gap: "16px"
                      }}>
                        {[
                          { label: "Cash", value: reportData.summary?.paymentBreakdown?.cash || 0, color: "#28a745" },
                          { label: "Bank", value: reportData.summary?.paymentBreakdown?.bank || 0, color: "#007bff" },
                          { label: "UPI", value: reportData.summary?.paymentBreakdown?.upi || 0, color: "#6f42c1" },
                          { label: "RBL", value: reportData.summary?.paymentBreakdown?.rbl || 0, color: "#fd7e14" }
                        ].map((payment, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              backgroundColor: "#f8f9fa", 
                              padding: "20px", 
                              borderRadius: "10px",
                              border: "1px solid #e9ecef",
                              textAlign: "center",
                              transition: "transform 0.2s ease",
                              animation: `slideIn 0.5s ease-out ${idx * 0.1}s both`
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            <div style={{ 
                              fontSize: "12px", 
                              color: "#6c757d", 
                              fontWeight: "500",
                              marginBottom: "8px",
                              textTransform: "uppercase"
                            }}>{payment.label}</div>
                            <div style={{ 
                              fontSize: "20px", 
                              fontWeight: "700",
                              color: payment.color
                            }}>₹{payment.value.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sales by Category */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#495057"
                  }}>Sales by Category</h3>
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
                          }}>Category</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Count</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.salesByCategory?.map((cat, idx) => (
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
                            }}>{cat.category}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              fontWeight: "600",
                              color: "#6c757d"
                            }}>{cat.count}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              fontWeight: "600",
                              color: "#28a745"
                            }}>₹{cat.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Sales Persons */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#495057"
                  }}>Top Sales Persons</h3>
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
                          }}>Name</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Number of Sales</th>
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
                          }}>Sales Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topSalesPersons?.map((person, idx) => (
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
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px"
                              }}>
                                <div style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: "#007bff",
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "14px",
                                  fontWeight: "600"
                                }}>
                                  {person.name.charAt(0).toUpperCase()}
                                </div>
                                {person.name}
                              </div>
                            </td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              fontWeight: "600",
                              color: "#6c757d"
                            }}>
                              <span style={{
                                backgroundColor: "#e3f2fd",
                                color: "#1976d2",
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "13px",
                                fontWeight: "600"
                              }}>
                                {person.count}
                              </span>
                            </td>
                            <td style={{ 
                              padding: "16px 20px",
                              color: "#6c757d",
                              fontSize: "14px"
                            }}>{person.store}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              fontWeight: "700",
                              color: "#28a745",
                              fontSize: "16px"
                            }}>₹{person.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {reportType === "by-item" && (
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
                    color: "#2c3e50"
                  }}>Sales by Item</h2>
                  <p style={{ 
                    margin: 0,
                    color: "#6c757d",
                    fontSize: "14px"
                  }}>Detailed breakdown of individual item performance</p>
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
                    }}>{reportData.totalItems || 0}</div>
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
                    }}>{reportData.totalQuantity || 0}</div>
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
                    }}>Total Amount</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#28a745",
                      lineHeight: "1"
                    }}>₹{(reportData.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                </div>
                
                <h3 style={{ 
                  margin: "0 0 20px 0",
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#495057"
                }}>Item Details</h3>
                <div style={{ 
                  backgroundColor: "#f8f9fa",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid #e9ecef"
                }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ 
                      width: "100%", 
                      borderCollapse: "collapse", 
                      backgroundColor: "white",
                      minWidth: "800px"
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f3f4" }}>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>Item Name</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>SKU</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>Category</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "center", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>Size</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>Quantity</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>Unit Price</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>Total Amount</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "center", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6",
                            whiteSpace: "nowrap"
                          }}>Invoices</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.items?.map((item, idx) => (
                          <tr key={idx} style={{ 
                            borderBottom: "1px solid #f1f3f4",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                            <td style={{ 
                              padding: "16px 20px", 
                              fontWeight: "500",
                              color: "#495057",
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>{item.name}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              fontFamily: "monospace", 
                              fontSize: "13px",
                              color: "#6c757d",
                              backgroundColor: "#f8f9fa",
                              borderRadius: "4px"
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
                            <td style={{ padding: "16px 20px", textAlign: "center" }}>
                              <span style={{ 
                                padding: "4px 8px", 
                                backgroundColor: "#f8f9fa", 
                                border: "1px solid #dee2e6",
                                borderRadius: "6px", 
                                fontSize: "12px",
                                fontWeight: "500",
                                color: "#495057"
                              }}>
                                {item.size}
                              </span>
                            </td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right", 
                              fontWeight: "600",
                              color: "#007bff"
                            }}>{item.quantity}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              color: "#6c757d"
                            }}>₹{item.unitPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right", 
                              fontWeight: "700", 
                              color: "#28a745",
                              fontSize: "15px"
                            }}>₹{item.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td style={{ padding: "16px 20px", textAlign: "center" }}>
                              <span style={{ 
                                padding: "4px 12px", 
                                backgroundColor: "#d1ecf1", 
                                color: "#0c5460",
                                borderRadius: "20px", 
                                fontSize: "12px",
                                fontWeight: "600"
                              }}>
                                {item.invoiceCount}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {reportType === "returns" && (
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
                    color: "#2c3e50"
                  }}>Return Summary</h2>
                  <p style={{ 
                    margin: 0,
                    color: "#6c757d",
                    fontSize: "14px"
                  }}>Analysis of returned items and refund patterns</p>
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
                    }}>Total Returns</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#dc3545",
                      lineHeight: "1"
                    }}>{reportData.summary?.totalReturns || 0}</div>
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
                    }}>Total Return Amount</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#dc3545",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.totalReturnAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
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
                    }}>Average Return</div>
                    <div style={{ 
                      fontSize: "32px", 
                      fontWeight: "700",
                      color: "#6c757d",
                      lineHeight: "1"
                    }}>₹{(reportData.summary?.averageReturnAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                </div>

                {/* Returns by Reason */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#495057"
                  }}>Returns by Reason</h3>
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
                          }}>Reason</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Count</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.returnsByReason?.map((reason, idx) => (
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
                            }}>{reason.reason}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              fontWeight: "600",
                              color: "#6c757d"
                            }}>{reason.count}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              fontWeight: "600",
                              color: "#dc3545"
                            }}>₹{reason.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Return Details */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#495057"
                  }}>Return Details</h3>
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
                          }}>Date</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Invoice No</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Customer</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "right", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Amount</th>
                          <th style={{ 
                            padding: "16px 20px", 
                            textAlign: "left", 
                            fontWeight: "600",
                            color: "#495057",
                            fontSize: "14px",
                            borderBottom: "2px solid #dee2e6"
                          }}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.returns?.map((ret, idx) => (
                          <tr key={idx} style={{ 
                            borderBottom: "1px solid #f1f3f4",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                            <td style={{ 
                              padding: "16px 20px",
                              color: "#6c757d",
                              fontSize: "14px"
                            }}>{ret.date}</td>
                            <td style={{ 
                              padding: "16px 20px",
                              fontWeight: "500",
                              color: "#495057",
                              fontFamily: "monospace"
                            }}>{ret.invoiceNumber}</td>
                            <td style={{ 
                              padding: "16px 20px",
                              color: "#495057"
                            }}>{ret.customer}</td>
                            <td style={{ 
                              padding: "16px 20px", 
                              textAlign: "right",
                              fontWeight: "600",
                              color: "#dc3545"
                            }}>₹{ret.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td style={{ 
                              padding: "16px 20px",
                              color: "#6c757d",
                              fontSize: "14px"
                            }}>{ret.reason}</td>
                          </tr>
                        ))}
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

export default SalesReport;