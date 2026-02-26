// src/pages/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import BandLogo from '../components/brandLogo2';
import HeroImage from '../assets/pharmlink-hero.jpeg';
import intearction from '../assets/interaction.jpeg';
import nutrition from '../assets/nutrition.jpeg';
import comparison from '../assets/comparison.jpeg';
import prescription from '../assets/prescription.jpeg';
import Hero from '../assets/Hero.mp4';
import {
  ShieldCheckIcon,
  CommandLineIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-white to-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-[#2f2971] backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <BandLogo className="h-8 w-8" />
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-3 text-sm">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 rounded-lg  font-bold text-white hover:text-[#9893c6]"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-2 rounded-lg bg-white text-[#2f2971] font-bold hover:bg-white/45 hover:text-white"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        {/* Hero section */}
        <section className="grid gap-10 md:grid-cols-2 items-center">


          {/* Left: text */}
          <div className="relative z-20">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2f2971]">
              AI-powered clinical decision support
            </span>

            <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Smarter, safer{" "}
              <span className="text-[#3a3385]">medication journeys</span> for
              every patient.
            </h1>

            <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
              PharmaLink is an integrated platform for{" "}
              <span className="font-semibold">drug interaction checks</span>,{" "}
              <span className="font-semibold">health advice</span>,{" "}
              <span className="font-semibold">cross-brand comparison</span>, and{" "}
              <span className="font-semibold">
                AI-assisted prescription validation
              </span>
              . Designed to support clinicians and protect patients.
            </p>

            {/* Small bullet strip */}
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                Evidence-informed insights
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5" />
                Clinical workflow–friendly
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5" />
                Patient-centric design
              </span>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center rounded-lg bg-[#2f2971] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2f2971d9]"
              >
                Start now
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                View dashboard
              </button>
            </div>

            {/* Highlights row */}
            <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-800">4 modules</p>
                <p>Interaction, nutrition, comparison, validation.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">AI-assisted</p>
                <p>Supports decisions, never replaces clinicians.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">For patients</p>
                <p>Focused on safety & accessibility.</p>
              </div>
            </div>
          </div>

          {/* Right: illustration / hero image */}
            <div className="relative w-135 h-[380px] md:h-100 rounded-3xl overflow-hidden shadow-xl border border-slate-200">
              <img
                src={HeroImage}
                alt="Doctor and patient using PharmLink"
                className="w-full h-64 object-cover"
              />

              <div className="p-3 md:p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-5 w-5 text-[#2f2971]" />
                    <p className="text-sm font-semibold text-slate-900">
                      Real-time safety assistant
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    AI-powered
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  Instantly flags dangerous food–drug or allergy interactions
                  while suggesting safer alternatives and accessible brands.
                </p>
              </div>
              
            </div>
        </section>

        


        {/* Modules section */}
        <section className="mt-20 md:mt-24 border-t border-slate-200 pt-10 md:pt-14 ">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-slate-500">
            PLATFORM MODULES
          </h2>

          <p className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900">
            Four components, one connected experience.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {/* 1 — Interaction & Allergy */}
            <div className="group rounded-2xl overflow-hidden bg-white shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="relative">
                <img
                  src={intearction}
                  alt="Drug Interaction & Allergy Detection"
                  className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform"
                />
                <span className="absolute left-3 top-3 text-[11px] px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200">
                  Safety first
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-extrabold text-[#2f2971] text-center">
                  Drug Interaction & Allergy Detection
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Detect potential interactions and allergy risks before
                  prescribing or dispensing, with clear, patient-friendly
                  explanations.
                </p>
              </div>
            </div>

            {/* 2 — Nutritional Advisory */}
            <div className="group rounded-2xl overflow-hidden bg-white shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="relative">
                <img
                  src={nutrition}
                  alt="AI-Powered Nutritional Advisory"
                  className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform"
                />
                <span className="absolute left-3 top-3 text-[11px] px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 border border-emerald-100">
                  Health-aware
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-extrabold text-[#2f2971] text-center">
                  Health Advisory Center
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Align diet with medication plans, suggesting safer food
                  choices based on drug class, nutrient content, and interaction
                  patterns.
                </p>
              </div>
            </div>

            {/* 3 — Cross-Brand Comparator */}
            <div className="group rounded-2xl overflow-hidden bg-white shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="relative">
                <img
                  src={comparison}
                  alt="Cross-Brand Drug Comparator"
                  className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform"
                />
                <span className="absolute left-3 top-3 text-[11px] px-2 py-0.5 rounded-full bg-white/90 text-sky-700 border border-sky-100">
                  Affordability
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-extrabold text-[#2f2971] text-center">
                  Cross-Brand Drug Comparator
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Compare equivalent medicines across brands to improve
                  affordability and availability, while keeping efficacy and
                  safety in focus.
                </p>
              </div>
            </div>

            {/* 4 — Prescription Interpretation */}
            <div className="group rounded-2xl overflow-hidden bg-white shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="relative">
                <img
                  src={prescription}
                  alt="AI Prescription Interpretation"
                  className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform"
                />
                <span className="absolute left-3 top-3 text-[11px] px-2 py-0.5 rounded-full bg-white/90 text-violet-700 border border-violet-100">
                  Handwriting AI
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-extrabold text-[#2f2971] text-center">
                  AI-Powered Prescription Interpretation
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Interpret handwritten prescriptions, validate doses, and flag
                  potential errors before they reach the patient.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT + VIDEO SECTION (one section: video | about) */}
       <section className="mt-20 md:mt-24">
        <div className="rounded-3xl bg-linear-to-r from-sky-50 via-white to-blue-50 border border-slate-200/70 shadow-sm px-4 md:px-8 py-8 md:py-10">
          <div className="grid gap-10 md:grid-cols-2 items-center">

            {/* LEFT — VIDEO PANEL */}
            <div className="relative">
                    {/* subtle glow behind card */}
              <div className="absolute -inset-3 bg-linear-to-br from-blue-200/40 via-sky-100/40 to-emerald-100/40 blur-2xl rounded-3xl pointer-events-none" />

              <div className="relative z-10  overflow-hidden shadow-xl border border-slate-200 bg-slate-950">
                {/* video */}
                 <div className="aspect-video">
                   <video
                     src={Hero}
                     className="w-full h-100 object-cover"
                     autoPlay
                     muted
                     loop
                     playsInline
                   />
                 </div>
              </div>
           </div>
      {/* RIGHT — ABOUT TEXT */}
      <div>
        <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-slate-500">
          About PharmaLink
        </h2>

        <p className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
          Bringing drug safety, nutrition, and accessibility into one workspace.
        </p>

        <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
          PharmaLink is an integrated platform built for{" "}
          <span className="font-semibold">pharmacists, clinicians, and patients</span>.
          We combine AI with curated clinical data to support safer medication
          journeys — from interaction checks and allergy detection to
          nutrition-aware advice, brand comparison, and prescription validation.
        </p>

        <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed">
          Our goal is simple:{" "}
          <span className="font-semibold">
            reduce avoidable medication harm while improving affordability and access
          </span>{" "}
          in everyday practice.
        </p>

        {/* pills */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs md:text-sm">
          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 border border-blue-100">
            Interaction &amp; allergy checks
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 border border-emerald-100">
            Nutrition-aware recommendations
          </span>
          <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-3 py-1 border border-sky-100">
            Cross-brand comparison
          </span>
          <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-3 py-1 border border-violet-100">
            Prescription AI
          </span>
        </div>
      </div>

    </div>
  </div>
</section>



        {/* Tiny footer */}
        <footer className="mt-10 mb-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <span>© {new Date().getFullYear()} PharmaLink. All rights reserved.</span>
          <span>For academic and research purposes only. Always consult a healthcare professional.</span>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
