import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { MessageSquare, Clock, CheckCircle, AlertCircle, Filter } from "lucide-react";

const Comments = ({ selectedBrand, API }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: "",
    sentiment_type: "",
    needs_response: ""
  });

  useEffect(() => {
    if (selectedBrand) {
      fetchComments();
    }
  }, [selectedBrand, filters]);

  const fetchComments = async () => {
    try {
      const params = {};
      if (selectedBrand) params.brand_id = selectedBrand.id;
      if (filters.platform) params.platform = filters.platform;
      if (filters.sentiment_type) params.sentiment_type = filters.sentiment_type;
      if (filters.needs_response !== "") params.needs_response = filters.needs_response === "true";

      const response = await axios.get(`${API}/comments`, { params });
      setComments(response.data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResponded = async (commentId) => {
    try {
      await axios.put(`${API}/comments/${commentId}/respond`);
      fetchComments(); // Refresh the list
    } catch (error) {
      console.error("Error marking comment as responded:", error);
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

  const getPriorityColor = (priority) => {
    if (priority >= 4) return "text-red-600 bg-red-50";
    if (priority >= 3) return "text-yellow-600 bg-yellow-50";
    return "text-blue-600 bg-blue-50";
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
        <p className="text-gray-500">Please select a brand to view comments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Comments for {selectedBrand.name}
        </h2>
        <p className="text-gray-600">
          Manage and respond to customer comments across platforms
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
          <select
            value={filters.needs_response}
            onChange={(e) => setFilters({...filters, needs_response: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Comments</option>
            <option value="true">Needs Response</option>
            <option value="false">No Response Needed</option>
          </select>
          <button
            onClick={() => setFilters({platform: "", sentiment_type: "", needs_response: ""})}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {comments.map((comment) => (
            <div key={comment.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author_name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {comment.platform}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(comment.sentiment_type)}`}>
                      {comment.sentiment_type}
                    </span>
                    {comment.priority > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(comment.priority)}`}>
                        Priority: {comment.priority}/5
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-3">{comment.content}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      {format(new Date(comment.created_at), "MMM d, yyyy 'at' HH:mm")}
                    </span>
                    <span>Score: {comment.sentiment_score.toFixed(2)}</span>
                    {comment.has_response && comment.response_time && (
                      <span className="text-green-600">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Responded in {comment.response_time}m
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {comment.needs_response && !comment.has_response && (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <button
                        onClick={() => handleMarkResponded(comment.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                      >
                        Mark as Responded
                      </button>
                    </div>
                  )}
                  {comment.has_response && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Responded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No comments found for the selected filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comments;