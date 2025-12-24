import React from "react";
import { MagnifyingGlassIcon, ScaleIcon, SparklesIcon } from "@heroicons/react/24/outline";

const EmptyState = ({
    title,
    description,
    icon,
    action
}) => (
    <div className="bg-gradient-to-br from-white to-blue-50/30 border border-slate-200 rounded-2xl shadow-xl p-12 text-center">
        <div className="max-w-md mx-auto">
            {/* Animated Icon */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center shadow-lg">
                    {icon || <MagnifyingGlassIcon className="h-12 w-12 text-blue-500" />}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <SparklesIcon className="h-4 w-4 text-white" />
                </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-2xl font-black text-slate-900 mb-3">
                {title || "Start Your Brand Comparison"}
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
                {description || "Search for a medication above to discover and compare different brand options, prices, and savings opportunities."}
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <ScaleIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Compare Prices</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <SparklesIcon className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">AI Insights</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <svg className="h-6 w-6 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-semibold text-slate-700">Find Savings</p>
                </div>
            </div>

            {/* Action or Tips */}
            {action ? (
                <div className="mt-2">{action}</div>
            ) : (
                <div className="text-sm text-slate-500">
                    <span className="font-semibold">Pro tip:</span> Try searching for "Ibuprofen", "Amoxicillin", or "Atorvastatin"
                </div>
            )}
        </div>
    </div>
);

export default EmptyState;
