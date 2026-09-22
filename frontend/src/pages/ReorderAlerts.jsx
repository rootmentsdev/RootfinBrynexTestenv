import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Trash2, Bell, Mail, Package } from "lucide-react";
import Header from "../components/Header";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const ReorderAlerts = () => {
  const isSidebarOpen = useSidebar();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [warehouse, setWarehouse] = useState("");
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  useEffect(() => {
    fetchAlerts();
  }, [filter, warehouse]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/reorder-alerts?status=${filter}`;
      if (warehouse) url += `&warehouse=${warehouse}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}/resolve`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to resolve alert");
      setAlerts(alerts.map(a => a._id === alertId ? { ...a, status: "resolved" } : a));
    } catch (error) {
      alert("Failed to resolve alert");
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm("Delete this alert?")) return;
    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete alert");
      setAlerts(alerts.filter(a => a._id !== alertId));
    } catch (error) {
      alert("Failed to delete alert");
    }
  };

  const handleNotify = async (alertId) => {
    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}/notify`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to notify");
      alert("Notification sent!");
    } catch (error) {
      alert("Failed to send notification");
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) { alert("Please enter an email address"); return; }
    try {
      setTestingEmail(true);
      const response = await fetch(`${API_URL}/api/reorder-alerts/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send test email");
      }
      alert("✅ Test email sent successfully!");
      setShowTestEmail(false);
      setTestEmail("");
    } catch (error) {
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === "active");
  const resolvedAlerts = alerts.filter(a => a.status === "resolved");
  const displayedAlerts = filter === "active" ? activeAlerts : resolvedAlerts;

  const stockPercent = (alert) => {
    if (!alert.reorderPoint || alert.reorderPoint === 0) return 100;
    return Math.min(100, Math.round((alert.currentStock / (alert.reorderPoint * 2)) * 100));
  };

  return (
    <>
      <Header title="Reorder Alerts" />
      <div className={`transition-all duration-300 min-h-screen bg-slate-50 flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

        {/* ── Filter / Action Bar ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm no-print">
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">

              {/* Status Tabs */}
              <div className="flex items-center gap-1 border border-gray-200 bg-gray-50 p-1 rounded-none">
                <button
                  onClick={() => setFilter("active")}
                  className={`inline-flex items-center gap-2 h-8 px-4 rounded-none text-xs font-bold uppercase tracking-wider transition-colors ${
                    filter === "active"
                      ? "bg-[#ef4444] text-white shadow-sm"
                      : "text-[#6B7280] hover:bg-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${filter === "active" ? "bg-white" : "bg-[#ef4444]"}`} />
                  Active ({activeAlerts.length})
                </button>
                <button
                  onClick={() => setFilter("resolved")}
                  className={`inline-flex items-center gap-2 h-8 px-4 rounded-none text-xs font-bold uppercase tracking-wider transition-colors ${
                    filter === "resolved"
                      ? "bg-[#10b981] text-white shadow-sm"
                      : "text-[#6B7280] hover:bg-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${filter === "resolved" ? "bg-white" : "bg-[#10b981]"}`} />
                  Resolved ({resolvedAlerts.length})
                </button>
              </div>

              {/* Right Actions */}
              <button
                onClick={() => setShowTestEmail(!showTestEmail)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-none border border-[#3b82f6] bg-[#3b82f6] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2563eb] transition-colors shadow-sm"
              >
                <Mail size={13} />
                Test Email
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-6 py-6 flex-1">

          {/* Test Email Panel */}
          {showTestEmail && (
            <div className="mb-6 bg-white rounded-none border border-[#E5E7EB] shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">Test Email Configuration</h3>
              <p className="text-xs text-[#6B7280] mb-4">Send a test email to verify your email settings.</p>
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-4 h-9 rounded-none border border-[#E5E7EB] bg-white text-sm text-[#111827] focus:border-[#8B5CF6] focus:outline-none transition-colors"
                />
                <button
                  onClick={() => { setShowTestEmail(false); setTestEmail(""); }}
                  className="h-9 px-4 text-xs font-bold uppercase tracking-wider text-[#6B7280] bg-[#EEEEEE] border border-[#E5E7EB] rounded-none hover:bg-[#E2E2E2] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="h-9 px-4 text-xs font-bold uppercase tracking-wider text-white bg-[#3b82f6] rounded-none hover:bg-[#2563eb] transition-colors disabled:opacity-50"
                >
                  {testingEmail ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-6 w-6 animate-spin rounded-none border-2 border-[#3b82f6] border-t-transparent" />
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Loading alerts...</p>
            </div>
          ) : displayedAlerts.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-16 text-center">
              <div className="w-14 h-14 rounded-none bg-gray-50 border border-[#E5E7EB] flex items-center justify-center mx-auto mb-4">
                <Bell size={28} className="text-gray-300" />
              </div>
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-1">
                {filter === "active" ? "No active reorder alerts" : "No resolved alerts"}
              </h3>
              <p className="text-xs text-[#6B7280]">
                {filter === "active" ? "All stock levels are healthy." : "No alerts have been resolved yet."}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Total Alerts</p>
                  <p className="text-2xl font-bold text-[#111827]">{displayedAlerts.length}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Critical (0 stock)</p>
                  <p className="text-2xl font-bold text-[#ef4444]">{displayedAlerts.filter(a => a.currentStock === 0).length}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Low Stock</p>
                  <p className="text-2xl font-bold text-[#f59e0b]">{displayedAlerts.filter(a => a.currentStock > 0 && a.currentStock <= a.reorderPoint).length}</p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-none shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Unique Warehouses</p>
                  <p className="text-2xl font-bold text-[#3b82f6]">{new Set(displayedAlerts.map(a => a.warehouse)).size}</p>
                </div>
              </div>

              {/* Alert Table */}
              <div className="bg-white rounded-none border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="border-b border-[#E5E7EB] px-5 py-3 bg-[#F9FAFB]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    {filter === "active" ? "Active Alerts" : "Resolved Alerts"}
                    <span className="ml-2 font-normal">({displayedAlerts.length})</span>
                  </h3>
                </div>

                <div className="divide-y divide-[#E5E7EB]">
                  {displayedAlerts.map((alert) => {
                    const pct = stockPercent(alert);
                    const isCritical = alert.currentStock === 0;
                    const isResolved = alert.status === "resolved";
                    return (
                      <div key={alert._id} className={`px-5 py-4 hover:bg-[#FAFAFA] transition-colors`}>
                        <div className="flex items-center justify-between gap-4">

                          {/* Left: Icon + Info */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`flex-shrink-0 mt-0.5 p-2 rounded-none ${
                              isResolved
                                ? "bg-green-50 border border-green-200 text-green-600"
                                : isCritical
                                  ? "bg-red-100 border border-red-200 text-red-600"
                                  : "bg-amber-50 border border-amber-200 text-amber-600"
                            }`}>
                              {isResolved
                                ? <CheckCircle size={16} />
                                : isCritical
                                  ? <AlertTriangle size={16} />
                                  : <Package size={16} />
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                                <span className="text-sm font-bold text-[#111827] truncate">{alert.itemName}</span>
                                {alert.itemSku && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#6B7280]">
                                    {alert.itemSku}
                                  </span>
                                )}
                                {isCritical && !isResolved && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-600">
                                    Out of Stock
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#6B7280] mb-3">
                                <span>Group: <span className="font-semibold text-[#374151]">{alert.itemGroup || "—"}</span></span>
                                <span className="text-[#D1D5DB]">|</span>
                                <span>Warehouse: <span className="font-semibold text-[#374151]">{alert.warehouse || "—"}</span></span>
                              </div>

                              {/* Stock Bar */}
                              <div className="flex items-center gap-4 max-w-xs">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Stock Level</span>
                                    <span className="text-[10px] font-bold text-[#374151]">
                                      {alert.currentStock} / {alert.reorderPoint * 2} units
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-[#F3F4F6] rounded-none overflow-hidden">
                                    <div
                                      className={`h-full rounded-none transition-all ${
                                        isResolved ? "bg-[#10b981]" : isCritical ? "bg-[#ef4444]" : "bg-[#f59e0b]"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Middle: Stock Stats */}
                          <div className="hidden sm:flex items-stretch gap-0 border border-[#E5E7EB] flex-shrink-0">
                            <div className="px-5 py-3 text-center border-r border-[#E5E7EB]">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Current Stock</p>
                              <p className={`text-xl font-bold ${isCritical && !isResolved ? "text-[#ef4444]" : "text-[#111827]"}`}>
                                {alert.currentStock}
                              </p>
                            </div>
                            <div className="px-5 py-3 text-center">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Reorder Point</p>
                              <p className="text-xl font-bold text-[#ef4444]">{alert.reorderPoint}</p>
                            </div>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex-shrink-0 flex items-center gap-1.5">
                            {!isResolved && (
                              <button
                                onClick={() => handleNotify(alert._id)}
                                className="h-8 w-8 flex items-center justify-center rounded-none bg-[#EEF2FF] border border-[#C7D2FE] text-[#4338ca] hover:bg-[#E0E7FF] transition-colors"
                                title="Notify Admin"
                              >
                                <Bell size={14} />
                              </button>
                            )}
                            {!isResolved && (
                              <button
                                onClick={() => handleResolve(alert._id)}
                                className="h-8 w-8 flex items-center justify-center rounded-none bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803d] hover:bg-[#DCFCE7] transition-colors"
                                title="Mark as Resolved"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(alert._id)}
                              className="h-8 w-8 flex items-center justify-center rounded-none bg-[#FFF1F2] border border-[#FECDD3] text-[#dc2626] hover:bg-[#FEE2E2] transition-colors"
                              title="Delete Alert"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ReorderAlerts;
