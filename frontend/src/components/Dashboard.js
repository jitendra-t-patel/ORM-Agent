import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, MessageSquare, AlertTriangle, Clock, Users } from "lucide-react";

const Dashboard = ({ selectedBrand, API }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedBrand) {
      fetchDashboardData();
      fetchTrends();
    }
  }, [selectedBrand]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard`, {
        params: selectedBrand ? { brand_id: selectedBrand.id } : {}
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await axios.get(`${API}/analytics/trends`, {
        params: selectedBrand ? { brand_id: selectedBrand.id, days: 7 } : { days: 7 }
      });
      
      // Transform trends data for chart
      const trendsArray = Object.entries(response.data.trends).map(([date, data]) => ({
        date,
        positive: data.positive || 0,
        negative: data.negative || 0,
        neutral: data.neutral || 0
      }));
      
      setTrends(trendsArray);
    } catch (error) {
      console.error("Error fetching trends:", error);
    } finally {
      setLoading(false);
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
        <p className="text-gray-500">Please select a brand to view dashboard</p>
      </div>
    );
  }

  const sentimentData = dashboardData?.sentiment_distribution ? [
    { name: "Positive", value: dashboardData.sentiment_distribution.positive || 0, color: "#10B981" },
    { name: "Negative", value: dashboardData.sentiment_distribution.negative || 0, color: "#EF4444" },
    { name: "Neutral", value: dashboardData.sentiment_distribution.neutral || 0, color: "#6B7280" }
  ] : [];

  const totalSentiment = sentimentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {selectedBrand.name} Dashboard
        </h2>
        <p className="text-gray-600">
          Real-time reputation monitoring and sentiment analysis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Comments"
          value={dashboardData?.recent_activity?.comments || 0}
          icon={MessageSquare}
          color="blue"
        />
        <KPICard
          title="Total Mentions"
          value={dashboardData?.recent_activity?.mentions || 0}
          icon={Users}
          color="green"
        />
        <KPICard
          title="Pending Responses"
          value={dashboardData?.priority_items?.length || 0}
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Active Alerts"
          value={dashboardData?.unacknowledged_alerts?.length || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Sentiment Distribution</h3>
          {sentimentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No sentiment data available
            </div>
          )}
        </div>

        {/* Sentiment Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Sentiment Trends (7 days)</h3>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} />
                <Line type="monotone" dataKey="neutral" stroke="#6B7280" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Priority Items and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Items */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Priority Items Requiring Response</h3>
          <div className="space-y-3">
            {dashboardData?.priority_items?.slice(0, 5).map((item) => (
              <div key={item.id} className="border-l-4 border-red-500 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {item.author_name} • {item.platform}
                  </span>
                  <span className="text-xs text-gray-500">
                    Priority: {item.priority}/5
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{item.content}</p>
              </div>
            ))}
            {(!dashboardData?.priority_items || dashboardData.priority_items.length === 0) && (
              <p className="text-gray-500 text-sm">No priority items at the moment</p>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {dashboardData?.unacknowledged_alerts?.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`border-l-4 pl-4 py-2 ${
                alert.severity === 'high' ? 'border-red-500' : 
                alert.severity === 'medium' ? 'border-yellow-500' : 
                'border-blue-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {alert.title}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-800' : 
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{alert.description}</p>
              </div>
            ))}
            {(!dashboardData?.unacknowledged_alerts || dashboardData.unacknowledged_alerts.length === 0) && (
              <p className="text-gray-500 text-sm">No recent alerts</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600"
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;