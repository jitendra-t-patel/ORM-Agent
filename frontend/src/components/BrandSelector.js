import React from "react";
import { ChevronDown } from "lucide-react";

const BrandSelector = ({ brands, selectedBrand, onBrandChange }) => {
  return (
    <div className="relative">
      <select
        value={selectedBrand?.id || ""}
        onChange={(e) => onBrandChange(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select Brand</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
};

export default BrandSelector;