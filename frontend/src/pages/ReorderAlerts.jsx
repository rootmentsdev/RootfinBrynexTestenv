import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Trash2, Bell, Mail } from "lucide-react";
import Head from "../components/Head";
import baseUrl from "../api/api";

const ReorderAlerts = () => {
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
      if (warehouse) {
        url += `&warehouse=${warehouse}`;
      }

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
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}/resolve`, {
        method: "PUT",
      });

      if (!response.ok) throw new Error("Failed to resolve alert");

      setAlerts(alerts.map(a => a._id === alertId ? { ...a, status: "resolved" } : a));
    } catch (error) {
      console.error("Error resolving alert:", error);
      alert("Failed to resolve alert");
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm("Delete this alert?")) return;

    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete alert");

      setAlerts(alerts.filter(a => a._id !== alertId));
    } catch (error) {
      console.error("Error deleting alert:", error);
      alert("Failed to delete alert");
    }
  };

  const handleNotify = async (alertId) => {
    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}/notify`, {
        method: "PUT",
      });

      if (!response.ok) throw new Error("Failed to mark as notified");

      setAlerts(alerts.map(a => a._id === alertId ? { ...a, notifiedAt: new Date() } : a));
      alert("Admin and users have been notified!");
    } catch (error) {
      console.error("Error notifying:", error);
      alert("Failed to send notification");
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

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

      alert("✅ Test email sent successfully! Check your inbox.");
      setShowTestEmail(false);
      setTestEmail("");
    } catch (error) {
      console.error("Error sending test email:", error);
      alert(`❌ Failed to send test email: ${error.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === "active");
  const resolvedAlerts = alerts.filter(a => a.status === "resolved");

  return (
    <div className="min-h-screen bg-[#f6f9ff]">
      <Head title="Reorder Alerts" description="Manage product reorder alerts" />

      <div className="ml-64 px-10 pb-16 pt-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#111827]">Reorder Alerts</h1>
            <p className="text-sm text-[#6b7280]">Monitor products that need reordering</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "active"
                  ? "bg-[#ef4444] text-white"
                  : "bg-white text-[#64748b] border border-[#d1d5db] hover:bg-[#f8fafc]"
              }`}
            >
              Active ({activeAlerts.length})
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "resolved"
                  ? "bg-[#10b981] text-white"
                  : "bg-white text-[#64748b] border border-[#d1d5db] hover:bg-[#f8fafc]"
              }`}
            >
              Resolved ({resolvedAlerts.length})
            </button>
            <button
              onClick={() => setShowTestEmail(!showTestEmail)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition flex items-center gap-2"
              title="Test email configuration"
            >
              <Mail size={16} />
              Test Email
            </button>
          </div>
        </header>

        {/* Test Email Modal */}
        {showTestEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-[#1f2937] mb-4">Test Email Configuration</h2>
              <p className="text-sm text-[#6b7280] mb-4">
                Send a test email to verify your email configuration is working correctly.
              </p>
              
              <input
                type="email"
                placeholder="Enter your email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-4 py-2 border border-[#d1d5db] rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTestEmail(false);
                    setTestEmail("");
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition disabled:opacity-50"
                >
                  {testingEmail ? "Sending..." : "Send Test Email"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#cbd5f5] border-t-[#3762f9]" />
              <p className="mt-4 text-sm text-[#64748b]">Loading alerts...</p>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-[#e1e5f5] bg-white p-12 text-center">
            <Bell size={48} className="mx-auto mb-4 text-[#cbd5f5]" />
            <p className="text-sm text-[#6b7280]">
              {filter === "active" ? "No active reorder alerts" : "No resolved alerts"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className={`rounded-2xl border p-6 ${
                  alert.status === "active"
                    ? "border-[#fecaca] bg-[#fef2f2]"
                    : "border-[#d1fae5] bg-[#f0fdf4]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`mt-1 p-2 rounded-lg ${
                        alert.status === "active"
                          ? "bg-[#fee2e2]"
                          : "bg-[#dcfce7]"
                      }`}
                    >
                      {alert.status === "active" ? (
                        <AlertTriangle size={20} className="text-[#dc2626]" />
                      ) : (
                        <CheckCircle size={20} className="text-[#16a34a]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1f2937]">
                        {alert.itemName}
                        {alert.itemSku && <span className="text-[#64748b] font-normal ml-2">({alert.itemSku})</span>}
                      </h3>
                      <p className="text-sm text-[#6b7280] mt-1">
                        {alert.itemGroupName && `Group: ${alert.itemGroupName} • `}
                        Warehouse: {alert.warehouse}
                      </p>
                      <div className="mt-3 flex gap-6">
                        <div>
                          <p className="text-xs text-[#64748b]">Current Stock</p>
                          <p className="text-lg font-semibold text-[#1f2937]">{alert.currentStock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748b]">Reorder Point</p>
                          <p className="text-lg font-semibold text-[#ef4444]">{alert.reorderPoint}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {alert.status === "active" && (
                      <>
                        <button
                          onClick={() => handleNotify(alert._id)}
                          className="px-3 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2563eb] transition"
                          title="Notify admin and users"
                        >
                          <Bell size={16} />
                        </button>
                        <button
                          onClick={() => handleResolve(alert._id)}
                          className="px-3 py-2 rounded-lg bg-[#10b981] text-white text-sm font-medium hover:bg-[#059669] transition"
                          title="Mark as resolved"
                        >
                          <CheckCircle size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(alert._id)}
                      className="px-3 py-2 rounded-lg bg-[#ef4444] text-white text-sm font-medium hover:bg-[#dc2626] transition"
                      title="Delete alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReorderAlerts;
