import React, { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

/**
 * Generic autocomplete used for drugs, foods, etc.
 *
 * Props:
 *  - label: string
 *  - placeholder: string
 *  - fetcher: (query: string) => Promise<Array<any>>
 *  - onSelect: (item) => void
 *  - value: controlled text (string)
 */
const AutoComplete = ({ label, placeholder, fetcher, onSelect, value }) => {
  const [query, setQuery] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // keep local text in sync with parent value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const handleSearch = async (val) => {
    setQuery(val);

    if (val.trim().length === 0) {
      setOptions([]);
      setShow(false);
      return;
    }

    setShow(true);

    try {
      setLoading(true);
      const res = await fetcher(val);
      setOptions(res);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    const labelText = item.name || item.Food;
    setQuery(labelText);
    setShow(false);
    setOptions([]);
    onSelect(item);
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onBlur={() => setTimeout(() => setShow(false), 150)}
          onFocus={() => {
            if (options.length > 0) setShow(true);
          }}
        />
      </div>

      {show && options.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-lg border border-gray-200 max-h-56 overflow-auto">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Searching…</div>
          ) : (
            options.map((item) => (
              <button
                key={item.index || item.name || item.Food}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <span className="font-medium">
                  {item.name || item.Food}
                </span>

                {item.contains && (
                  <span className="block text-xs text-gray-500">
                    {item.contains}
                  </span>
                )}

                {item.is_alcohol === 1 && (
                  <span className="ml-2 text-xs text-red-500">Alcohol</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AutoComplete;
