import React from "react";
import { ArrowLeftIcon, CheckCircleIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

const MedicationHeader = ({
    selectedMedication,
    onBack,
    onSelectAll,
    title = "Medication Selection",
    description = "Select medications to compare across brands."
}) => {
    // If selectedMedication is provided, show detailed header
    if (selectedMedication) {
        const avgRating = selectedMedication.brands.reduce((sum, b) => sum + b.rating, 0) / selectedMedication.brands.length;
        const minPrice = Math.min(...selectedMedication.brands.map(b => b.price));
        const maxPrice = Math.max(...selectedMedication.brands.map(b => b.price));

        return (
            <div className="mb-8 bg-gradient-to-br from-white to-blue-50/30 dark:from-white/5 dark:to-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:backdrop-blur-lg overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                            <button
                                onClick={onBack}
                                className="mt-1 p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all"
                            >
                                <ArrowLeftIcon className="h-5 w-5" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                        {selectedMedication.genericName}
                                    </h2>
                                    <span className="px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white text-sm font-bold rounded-full">
                                        {selectedMedication.category}
                                    </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 mb-4">
                                    {selectedMedication.strength} • {selectedMedication.form} • {selectedMedication.therapeuticClass}
                                </p>
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <BeakerIcon className="h-5 w-5 text-purple-500" />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            <span className="font-bold text-slate-900 dark:text-white">{selectedMedication.brands.length}</span> brands available
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StarSolid className="h-5 w-5 text-amber-400" />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            <span className="font-bold text-slate-900 dark:text-white">{avgRating.toFixed(1)}</span> avg rating
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                        Price range: <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs. {minPrice.toFixed(2)}</span> - <span className="font-bold text-slate-900 dark:text-white">Rs. {maxPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onSelectAll}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all dark:bg-blue-700 dark:hover:bg-blue-800"
                            >
                                <CheckCircleIcon className="h-5 w-5" />
                                Select All Brands
                            </button>
                        </div>
                    </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            </div>
        );
    }

    // Default simple header
    return (
        <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-blue-600 mb-1">{title}</h2>
            <p className="text-slate-500">{description}</p>
        </div>
    );
};

export default MedicationHeader;
