// src/pages/History.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClockIcon, ArrowPathIcon, ShieldCheckIcon , TrashIcon} from "@heroicons/react/24/outline";
import { useAuth } from "../auth/auth.jsx";
import { loadHistory, clearHistory, deleteHistoryEntry } from "../utils/historyUtils.js";

const riskColors = {
  0: "bg-green-50 text-green-800 border-green-200",
  1: "bg-amber-50 text-amber-800 border-amber-200",
  2: "bg-red-50 text-red-800 border-red-200",
};

const riskLabel = (r) => (r === 0 ? "Safe" : r === 1 ? "Moderate" : "High");

const History = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect to login if someone tries to open /history without auth
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!user?.email) return;
    const h = loadHistory(user.email);
    setHistory(h);
    setLoading(false);
  }, [user?.email]);

  const formattedHistory = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        time: new Date(h.timestamp).toLocaleString(),
      })),
    [history]
  );

  const handleClear = () => {
    if (!user?.email) return;
    if (!window.confirm("Clear all interaction history for this account?")) return;
    clearHistory(user.email);
    setHistory([]);
  };

  const handleDeleteOne = (entry) => {
    if (!user?.email) return;
    if (!window.confirm("Delete this interaction from history?")) return;

    const updated = deleteHistoryEntry(user.email, entry.id);
    setHistory(updated);
  }

  const handleRecheck = (entry) => {
    // Go back to interaction page with pre-selected values
    navigate("/advisory", {
      state: {
        fromHistory: true,
        drugIndex: entry.drugIndex,
        drugName: entry.drug,
        foodName: entry.food,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Interaction History</h1>
              <p className="text-xs text-gray-500">
                {user?.name ? `For ${user.name}` : "Your past food–drug checks"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/interaction-check")}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to interaction checker
            </button>
            {history.length > 0 && (
              <button
                onClick={handleClear}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Clear history
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading history…</p>
          ) : formattedHistory.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                No interactions yet
              </h2>
              <p className="text-sm text-gray-500">
                Start by checking a food–drug interaction. Your results will appear
                here automatically.
              </p>
              <button
                onClick={() => navigate("/advisory")}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to interaction checker
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formattedHistory.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between border rounded-lg px-3 py-3 text-sm ${riskColors[entry.risk]}`}
                  >
                  <div className="flex-1 pr-0 md:pr-4">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="font-semibold">
                        {entry.drug} + {entry.food}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/80">
                        {riskLabel(entry.risk)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs md:text-[13px]">{entry.message}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{entry.time}</p>
                  </div>
                  <div className="mt-2 md:mt-0 md:ml-4 flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <button
                     type="button"
                     onClick={()=>handleDeleteOne(entry)}
                     className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-300 hover:bg-red-50"
                     >
                      Delete
                    </button>
                    <button
                      onClick={() => handleRecheck(entry)}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Re-check this pair
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
