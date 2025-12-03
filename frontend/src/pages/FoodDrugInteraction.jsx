// src/pages/FoodDrugInteraction.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate ,useLocation} from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import {

  ShieldCheckIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

import {
  fetchDrugs,
  fetchFoods,
  checkFoodDrugRisk,
  fetchSafeFoods,
} from "../utils/api.js";
import {
  loadHistory,
  addHistoryEntry,
} from "../utils/historyUtils.js";

const riskColors = {
  0: "bg-green-50 text-green-800 border-green-200",
  1: "bg-amber-50 text-amber-800 border-amber-200",
  2: "bg-red-50 text-red-800 border-red-200",
};

const riskLabel = (r) =>
  r === 0 ? "Safe" : r === 1 ? "Moderate" : "High";


// ⬇️ ONE SINGLE AutoComplete component
const AutoComplete = ({ label, placeholder, fetcher, onSelect, value }) => {
  const [query, setQuery] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // when parent changes value (eg. from History) update local text
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

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
                key={item.index || item.name}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <span className="font-medium">{item.name || item.Food}</span>

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


const FoodDrugInteraction = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  const [drugSearch, setDrugSearch] = useState("");
  const [foodSearch, setFoodSearch] = useState("");
  const [drugOptions, setDrugOptions] = useState([]);
  const [foodOptions, setFoodOptions] = useState([]);
  const [selectedDrugIndex, setSelectedDrugIndex] = useState(null);
  const [selectedDrugName, setSelectedDrugName] = useState("");
  const [selectedFoodName, setSelectedFoodName] = useState("");
  const [result, setResult] = useState(null);
  const [safeFoods, setSafeFoods] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [error, setError] = useState("");

  // redirect if user not logged in (extra safety)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const state = location.state;
    if (state?.fromHistory) {
      const {drugIndex, drugName, foodName} = state;

      if (typeof drugIndex === "number") {
        setSelectedDrugIndex(drugIndex);
      }
      if (drugName) {
        setSelectedDrugName(drugName);
        //setDrugSearch(drugName);
      }
      if (foodName) {
        setSelectedFoodName(foodName);
        //setFoodSearch(foodName);
    }

    //navigate("/interaction-check", { replace: true, state: {}});
    }
  }, [location.state, navigate]);

  // load initial drugs + foods + history
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingLists(true);
        const [drugs, foods] = await Promise.all([
          fetchDrugs(""),
          fetchFoods(""),
        ]);
        setDrugOptions(drugs);
        setFoodOptions(foods);
      } catch (e) {
        console.error(e);
        setError("Unable to load drug/food lists. Check backend.");
      } finally {
        setLoadingLists(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (user?.email) {
      setHistory(loadHistory(user.email));
    }
  }, [user?.email]);

const handleSelectDrug = (idx, name) => {
  setSelectedDrugIndex(idx);
  setSelectedDrugName(name);
  setDrugSearch(name);   // 👈 show in drug input
  setResult(null);
  setSafeFoods([]);
};


const handleSelectFood = (name) => {
  setSelectedFoodName(name);
  setFoodSearch(name);   // 👈 show in food input
  setResult(null);
};


  const handleSearchDrug = async (e) => {
    const q = e.target.value;
    setDrugSearch(q);
    try {
      const drugs = await fetchDrugs(q);
      setDrugOptions(drugs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchFood = async (e) => {
    const q = e.target.value;
    setFoodSearch(q);
    try {
      const foods = await fetchFoods(q);
      setFoodOptions(foods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheck = async () => {
    if (selectedDrugIndex == null || !selectedFoodName) {
      setError("Please select both a drug and a food item.");
      return;
    }
    setError("");
    setLoadingCheck(true);
    try {
      const res = await checkFoodDrugRisk(
        selectedDrugIndex,
        selectedFoodName
      );
      setResult(res);

      const safe = await fetchSafeFoods(selectedDrugIndex, 5);
      setSafeFoods(safe.foods || []);

      if (user?.email) {
        const updated = addHistoryEntry(user.email, {
          timestamp: new Date().toISOString(),
          drugIndex: selectedDrugIndex,
          drug: res.drug,
          food: res.food,
          risk: res.risk,
          message: res.message,
        });
        setHistory(updated);
      }
    } catch (err) {
      console.error(err);
      setError("Error checking interaction. Please try again.");
    } finally {
      setLoadingCheck(false);
    }
  };

  const formattedHistory = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        time: new Date(h.timestamp).toLocaleString(),
      })),
    [history]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* simple header bar */}
      <header className="bg-white border-b border-gray-200">
  <div className="max-w-6xl mx-auto px-4 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Food–Drug Interaction Check
          </h1>
          <p className="text-xs text-gray-500">
            Logged in as {user?.name || "User"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ← Back to dashboard
        </button>

        <button
          onClick={() => navigate("/history")}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          View history →
        </button>
      </div>
    </div>
  </div>
</header>


      <main className="max-w-6xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-3">
        {/* LEFT: form + result */}
        <section className="lg:col-span-2 space-y-6">
          {/* selectors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
              Select Drug and Food
            </h2>

            {error && (
              <div className="mb-4 flex items-start space-x-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <ExclamationTriangleIcon className="h-5 w-5 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <AutoComplete
                label="Drug"
                placeholder="Type drug name…"
                fetcher={(q) => fetchDrugs(q)}
                value={selectedDrugName}   
                onSelect={(d) => {
                setSelectedDrugIndex(d.index);
                setSelectedDrugName(d.name);
                setResult(null);
                setSafeFoods([]);
                }}
              />

              <AutoComplete
                label="Food"
                placeholder="Type food name…"
                fetcher={(q) => fetchFoods(q)}
                value={selectedFoodName} 
                onSelect={(f) => {
                 setSelectedFoodName(f.name);
                 setResult(null);
                }}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCheck}
                disabled={loadingCheck}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loadingCheck ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    Check interaction
                  </>
                )}
              </button>
            </div>
          </div>

          {/* result card */}
          {result && (
            <div
              className={`rounded-xl border px-4 py-4 md:px-6 md:py-5 shadow-sm ${riskColors[result.risk]}`}
            >
              <div className="flex items-start space-x-3">
                {result.risk === 0 ? (
                  <CheckCircleIcon className="h-6 w-6 mt-0.5 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-6 w-6 mt-0.5 text-red-600" />
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide">
                    {riskLabel(result.risk)} risk
                  </p>
                  <h3 className="font-semibold text-sm md:text-base mt-1">
                    {result.drug} + {result.food}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed">
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          )}
       </section>
       {/* RIGHT: safe foods instead of history */}
  <aside className="space-y-4">
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Suggested safer foods
      </h2>

      {safeFoods.length === 0 ? (
        <p className="text-sm text-gray-500">
          After you check an interaction, safer alternative foods for
          the selected drug will appear here.
        </p>
      ) : (
        <div className="grid gap-3">
          {safeFoods.map((f) => (
            <div
              key={f.Food || f.food || f.name}
              className="border border-gray-200 rounded-lg p-3 text-sm bg-gray-50"
            >
              <p className="font-medium text-gray-900">
                {f.Food || f.food || f.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Energy: {f.energy} kcal · Protein: {f.protein} g · Carbs:{" "}
                {f.carbs} g
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </aside>
      </main>
    </div>
  );
};

export default FoodDrugInteraction;
