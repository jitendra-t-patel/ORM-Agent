import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Comments from "./components/Comments";
import Mentions from "./components/Mentions";
import Alerts from "./components/Alerts";
import BrandSelector from "./components/BrandSelector";
import Navigation from "./components/Navigation";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${API}/brands`);
      setBrands(response.data);
      if (response.data.length > 0) {
        setSelectedBrand(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = (brandId) => {
    const brand = brands.find(b => b.id === brandId);
    setSelectedBrand(brand);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ORM Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  ORM AI Agent
                </h1>
                <span className="ml-2 text-sm text-gray-500">
                  Online Reputation Management
                </span>
              </div>
              <BrandSelector 
                brands={brands} 
                selectedBrand={selectedBrand} 
                onBrandChange={handleBrandChange}
              />
            </div>
          </div>
        </header>

        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={
              <TabContent 
                activeTab={activeTab} 
                selectedBrand={selectedBrand}
                API={API}
              />
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const TabContent = ({ activeTab, selectedBrand, API }) => {
  switch (activeTab) {
    case "dashboard":
      return <Dashboard selectedBrand={selectedBrand} API={API} />;
    case "comments":
      return <Comments selectedBrand={selectedBrand} API={API} />;
    case "mentions":
      return <Mentions selectedBrand={selectedBrand} API={API} />;
    case "alerts":
      return <Alerts selectedBrand={selectedBrand} API={API} />;
    default:
      return <Dashboard selectedBrand={selectedBrand} API={API} />;
  }
};

export default App;