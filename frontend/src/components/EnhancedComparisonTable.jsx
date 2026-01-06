// EnhancedComparisonTable.jsx - Enhanced Comparison Table
import React, { useState } from 'react';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import {
    DocumentArrowDownIcon,
    PrinterIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ScaleIcon
} from '@heroicons/react/24/outline';

const EnhancedComparisonTable = ({ selectedBrands }) => {
    const [showAllMetrics, setShowAllMetrics] = useState(false);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedBrands = [...selectedBrands].sort((a, b) => {
        if (!sortColumn) return 0;
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const multiplier = sortDirection === 'asc' ? 1 : -1;
        if (typeof aVal === 'number') return (aVal - bVal) * multiplier;
        return String(aVal).localeCompare(String(bVal)) * multiplier;
    });

    const getBestValue = (key, type = 'lowest') => {
        if (selectedBrands.length === 0) return null;
        const values = selectedBrands.map(b => b[key]).filter(v => v !== undefined);
        if (type === 'lowest') return Math.min(...values);
        return Math.max(...values);
    };

    const bestPrice = getBestValue('price', 'lowest');
    const bestRating = getBestValue('rating', 'highest');
    const bestEfficacy = getBestValue('efficacyScore', 'highest');
    const bestCompliance = getBestValue('patientCompliance', 'highest');

    const exportToCSV = () => {
        const headers = ['Brand', 'Manufacturer', 'Price', 'Pack Size', 'Rating', 'Reviews', 'Efficacy', 'Compliance', 'Savings', 'Generic'];
        const rows = selectedBrands.map(brand => [
            brand.name,
            brand.manufacturer,
            brand.price,
            brand.packSize,
            brand.rating,
            brand.reviews,
            brand.efficacyScore,
            brand.patientCompliance,
            brand.savings,
            brand.isGeneric ? 'Yes' : 'No'
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brand-comparison-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    if (selectedBrands.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <ScaleIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">No Brands Selected</h3>
                <p className="text-slate-500">Select brands above to start comparing</p>
            </div>
        );
    }

    const SortButton = ({ column, label }) => (
        <button
            onClick={() => handleSort(column)}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
            {label}
            {sortColumn === column && (
                sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
            )}
        </button>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl mb-8">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <ScaleIcon className="h-6 w-6 text-blue-600" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Comparison Table</h3>
                            <p className="text-sm text-slate-600">{selectedBrands.length} brands selected</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAllMetrics(!showAllMetrics)}
                            className="px-4 py-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg transition-colors"
                        >
                            {showAllMetrics ? 'Show Less' : 'Show All Metrics'}
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                            Export CSV
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors"
                        >
                            <PrinterIcon className="h-5 w-5" />
                            Print
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                                <SortButton column="name" label="Brand" />
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Manufacturer</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                <SortButton column="price" label="Price" />
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                                <SortButton column="rating" label="Rating" />
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                                <SortButton column="efficacyScore" label="Efficacy" />
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                                <SortButton column="patientCompliance" label="Compliance" />
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                <SortButton column="savings" label="Savings" />
                            </th>
                            {showAllMetrics && (
                                <>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Generic</th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Eco-Friendly</th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Subscribe</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedBrands.map((brand, idx) => (
                            <tr
                                key={brand.id || idx}
                                className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="font-bold text-slate-900">{brand.name}</p>
                                            <p className="text-xs text-slate-500">{brand.packSize}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{brand.manufacturer}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`text-lg font-bold ${brand.price === bestPrice ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            ${brand.price}
                                        </span>
                                        {brand.price === bestPrice && (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                                Best
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${brand.rating === bestRating ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                        <StarSolid className={`h-4 w-4 ${brand.rating === bestRating ? 'text-amber-500' : 'text-amber-400'}`} />
                                        <span className={`font-bold ${brand.rating === bestRating ? 'text-amber-700' : 'text-slate-700'}`}>
                                            {brand.rating}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{brand.reviews} reviews</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${brand.efficacyScore === bestEfficacy
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : brand.efficacyScore >= 90 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {brand.efficacyScore}%
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${brand.patientCompliance === bestCompliance
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {brand.patientCompliance}%
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {brand.savings > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                            <ArrowTrendingDownIcon className="h-4 w-4" />
                                            ${brand.savings.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </td>
                                {showAllMetrics && (
                                    <>
                                        <td className="px-6 py-4 text-center">
                                            {brand.isGeneric ? (
                                                <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto" />
                                            ) : (
                                                <XCircleIcon className="h-5 w-5 text-slate-300 mx-auto" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {brand.sustainability?.ecoFriendly ? (
                                                <span className="text-lg">🌱</span>
                                            ) : (
                                                <XCircleIcon className="h-5 w-5 text-slate-300 mx-auto" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {brand.subscription?.available ? (
                                                <span className="text-emerald-600 font-bold text-sm">
                                                    -{brand.subscription.discount}%
                                                </span>
                                            ) : (
                                                <XCircleIcon className="h-5 w-5 text-slate-300 mx-auto" />
                                            )}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary Row */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="text-sm text-slate-600">
                        <span className="font-semibold">Summary:</span> Best price from <span className="font-bold text-emerald-600">{sortedBrands.find(b => b.price === bestPrice)?.name}</span>
                        {' '} • Highest rated <span className="font-bold text-amber-600">{sortedBrands.find(b => b.rating === bestRating)?.name}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                        Total potential savings: <span className="font-bold text-emerald-600">${sortedBrands.reduce((sum, b) => sum + b.savings, 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedComparisonTable;
