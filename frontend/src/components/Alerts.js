import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Users, MessageSquare, Filter } from "lucide-react";

const Alerts = ({ selectedBrand, API }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    alert_type: "",
    severity: "",
    is_acknowledged: ""
  });

  useEffect(() => {
    if (selectedBrand) {
      fetchAlerts();
    }
  }, [selectedBrand, filters]);

  const fetchAlerts = async () => {
    try {
      const params = {};
      if (selectedBrand) params.brand_id = selectedBrand.id;
      if (filters.alert_type) params.alert_type = filters.alert_type;
      if (filters.severity) params.severity = filters.severity;
      if (filters.is_acknowledged !== "") params.is_acknowledged = filters.is_acknowledged === "true";

      const response = await axios.get(`${API}/alerts`, { params });
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await axios.put(`${API}/alerts/${alertId}/acknowledge`);
      fetchAlerts(); // Refresh the list
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "text-red-800 bg-red-100 border-red-500";
      case "high": return "text-red-700 bg-red-50 border-red-400";
      case "medium": return "text-yellow-700 bg-yellow-50 border-yellow-400";
      case "low": return "text-blue-700 bg-blue-50 border-blue-400";
      default: return "text-gray-700 bg-gray-50 border-gray-400";
    }
  };

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case "sentiment": return MessageSquare;
      case "volume": return TrendingUp;
      case "response_time": return Clock;
      default: return AlertTriangle;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select a brand to view alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Alerts for {selectedBrand.name}
        </h2>
        <p className="text-gray-600">
          Monitor and manage system alerts and notifications
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.alert_type}
            onChange={(e) => setFilters({...filters, alert_type: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="sentiment">Sentiment</option>
            <option value="volume">Volume</option>
            <option value="response_time">Response Time</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.is_acknowledged}
            onChange={(e) => setFilters({...filters, is_acknowledged: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Alerts</option>
            <option value="false">Unacknowledged</option>
            <option value="true">Acknowledged</option>
          </select>
          <button
            onClick={() => setFilters({alert_type: "", severity: "", is_acknowledged: ""})}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Alerts ({alerts.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {alerts.map((alert) => {
            const AlertIcon = getAlertIcon(alert.alert_type);
            return (
              <div key={alert.id} className={`p-6 hover:bg-gray-50 border-l-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <AlertIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-lg font-medium text-gray-900">
                        {alert.title}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {alert.alert_type}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{alert.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        {format(new Date(alert.created_at), "MMM d, yyyy 'at' HH:mm")}
                      </span>
                      {alert.is_acknowledged && alert.acknowledged_at && (
                        <span className="text-green-600">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          Acknowledged on {format(new Date(alert.acknowledged_at), "MMM d, yyyy 'at' HH:mm")}
                        </span>
                      )}
                    </div>
                    {alert.data && Object.keys(alert.data).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-600 mb-1">Alert Data:</p>
                        <div className="text-xs text-gray-700">
                          {Object.entries(alert.data).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!alert.is_acknowledged && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.is_acknowledged && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Acknowledged</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {alerts.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No alerts found for the selected filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;