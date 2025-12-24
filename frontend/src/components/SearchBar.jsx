import React from "react";

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => (
    <div className="mb-4 flex justify-center">
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);

export default SearchBar;
