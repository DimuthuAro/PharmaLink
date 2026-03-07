import React from 'react';
import { CheckCircleIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

const SelectedBrandsSummary = ({ selectedBrands, totalSavings, handleBrandSelect, setSelectedBrands }) => (
    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Selected for Comparison</h3>
                    <p className="text-sm text-slate-600">
                        Total savings: <span className="font-bold text-emerald-600">Rs. {totalSavings.toFixed(2)}</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setSelectedBrands([])}
                    className="px-4 py-2 text-slate-600 hover:text-red-600 transition-colors"
                >
                    Clear All
                </button>
                <button
                    onClick={() => {
                        // Add all selected to cart
                        alert(`Added ${selectedBrands.length} items to cart`);
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                    <ShoppingCartIcon className="h-5 w-5" />
                    Add All to Cart
                </button>
            </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedBrands.map((brand) => (
                <div key={brand.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-slate-900">{brand.name}</p>
                        <button
                            onClick={() => handleBrandSelect(brand)}
                            className="text-red-400 hover:text-red-600"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Rs. {brand.price}</span>
                        <span className="text-xs text-slate-500">{brand.packSize}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default SelectedBrandsSummary;
