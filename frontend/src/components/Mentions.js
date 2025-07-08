import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { AtSign, ExternalLink, TrendingUp, Users, Filter } from "lucide-react";

const Mentions = ({ selectedBrand, API }) => {
  const [mentions, setMentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: "",
    sentiment_type: ""
  });

  useEffect(() => {
    if (selectedBrand) {
      fetchMentions();
    }
  }, [selectedBrand, filters]);

  const fetchMentions = async () => {
    try {
      const params = {};
      if (selectedBrand) params.brand_id = selectedBrand.id;
      if (filters.platform) params.platform = filters.platform;
      if (filters.sentiment_type) params.sentiment_type = filters.sentiment_type;

      const response = await axios.get(`${API}/mentions`, { params });
      setMentions(response.data);
    } catch (error) {
      console.error("Error fetching mentions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "positive": return "text-green-600 bg-green-50";
      case "negative": return "text-red-600 bg-red-50";
      case "neutral": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getEngagementLevel = (engagement) => {
    if (engagement > 100) return { label: "High", color: "text-red-600 bg-red-50" };
    if (engagement > 50) return { label: "Medium", color: "text-yellow-600 bg-yellow-50" };
    return { label: "Low", color: "text-blue-600 bg-blue-50" };
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
        <p className="text-gray-500">Please select a brand to view mentions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Mentions for {selectedBrand.name}
        </h2>
        <p className="text-gray-600">
          Track brand mentions across social media platforms
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
            value={filters.platform}
            onChange={(e) => setFilters({...filters, platform: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
          <select
            value={filters.sentiment_type}
            onChange={(e) => setFilters({...filters, sentiment_type: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
          <div></div>
          <button
            onClick={() => setFilters({platform: "", sentiment_type: ""})}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Mentions List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Mentions ({mentions.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {mentions.map((mention) => {
            const engagementLevel = getEngagementLevel(mention.engagement);
            return (
              <div key={mention.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <AtSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {mention.author_name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {mention.platform}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(mention.sentiment_type)}`}>
                        {mention.sentiment_type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${engagementLevel.color}`}>
                        {engagementLevel.label} Engagement
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{mention.content}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        {format(new Date(mention.created_at), "MMM d, yyyy 'at' HH:mm")}
                      </span>
                      <span>Score: {mention.sentiment_score.toFixed(2)}</span>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Reach: {mention.reach}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>Engagement: {mention.engagement}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-xs">View Post</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          {mentions.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No mentions found for the selected filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mentions;