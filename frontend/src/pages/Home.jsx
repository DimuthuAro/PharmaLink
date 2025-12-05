// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  HeartIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-white to-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
              <ShieldCheckIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                PharmaLink
              </h1>
              <p className="text-[11px] text-slate-500">
                Smart food–drug interaction checker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => navigate("/interaction-check")}
              className="text-slate-600 hover:text-blue-600 transition"
            >
              Interaction checker
            </button>
            <button
              onClick={() => navigate("/history")}
              className="text-slate-600 hover:text-blue-600 transition"
            >
              History
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs shadow-sm hover:bg-blue-700 transition"
            >
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 py-10 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left side: text */}
          <section>
            <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-blue-700 mb-4">
              <SparklesIcon className="h-4 w-4" />
              <span>Designed for doctors, pharmacists & students</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Check food–drug interactions
              <span className="block text-blue-600">
                in seconds, not hours.
              </span>
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              PharmaLink helps you quickly see whether a patient’s medication
              is safe with everyday foods, beverages and nutraceuticals.
              Reduce risk, give confident advice, and keep your patients safe.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate("/interaction-check")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 transition"
              >
                Start interaction check
                <ArrowRightIcon className="h-4 w-4" />
              </button>

              <button
                onClick={() => navigate("/register")}
                className="text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Create an account
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-slate-500">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  3-step workflow
                </p>
                <p>Pick drug, pick food, view risk instantly.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Evidence-based
                </p>
                <p>Backed by curated clinical & nutrition data.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Patient friendly
                </p>
                <p>Simple language explanations for counselling.</p>
              </div>
            </div>
          </section>

          {/* Right side: image + mini cards */}
          <section className="relative">
            {/* >>> Put your own image here <<< */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white">
              <img
                src="/images/pharmalink-hero.jpg"
                alt="Doctor checking food–drug interactions"
                className="w-full h-64 sm:h-80 object-cover"
              />
            </div>

            {/* Floating cards */}
            <div className="absolute -bottom-8 left-3 right-3 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 rounded-2xl bg-white shadow-md border border-slate-100 px-4 py-3 flex items-center gap-3">
                <HeartIcon className="h-7 w-7 text-rose-500" />
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    Example
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    Warfarin + Spinach
                  </p>
                  <p className="text-xs text-slate-500">
                    Alerts high-risk vitamin K interaction.
                  </p>
                </div>
              </div>

              <div className="flex-1 rounded-2xl bg-indigo-600 text-white shadow-md px-4 py-3 flex items-center gap-3">
                <ClockIcon className="h-7 w-7" />
                <div>
                  <p className="text-xs uppercase font-semibold text-indigo-100">
                    Quick checks
                  </p>
                  <p className="text-sm font-semibold">
                    Under 10 seconds per pair.
                  </p>
                  <p className="text-xs text-indigo-100">
                    Perfect for busy clinics & wards.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* How it works */}
        <section className="mt-20">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            How PharmaLink works
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-semibold text-blue-600 mb-1">
                Step 1
              </p>
              <p className="font-semibold text-slate-900 mb-1">
                Select the medicine
              </p>
              <p className="text-slate-600">
                Search by brand or generic name from your local formulary.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-semibold text-blue-600 mb-1">
                Step 2
              </p>
              <p className="font-semibold text-slate-900 mb-1">
                Add the food or drink
              </p>
              <p className="text-slate-600">
                From common foods to alcohol and supplements.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-semibold text-blue-600 mb-1">
                Step 3
              </p>
              <p className="font-semibold text-slate-900 mb-1">
                Review risk & advice
              </p>
              <p className="text-slate-600">
                See risk level, explanation and suggested safer alternatives.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-slate-200 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} PharmaLink. For educational and clinical support use.</span>
          <span>Developed at SLIIT – Research Project.</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
