import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AnimationStyles from '../components/AnimationStyles.jsx';
import PriceTrendChart from '../components/PriceTrendChart.jsx';
import BrandCard from '../components/BrandCard.jsx';
import AIRecommendationEngine from '../components/AIRecommendationEngine.jsx';
import EnhancedComparisonTable from '../components/EnhancedComparisonTable.jsx';
import BrandDetailsModal from '../components/BrandDetailsModal.jsx';
import StatsDashboard from '../components/StatsDashboard.jsx';
import MedicationSelection from '../components/MedicationSelection.jsx';
import SelectedBrandsSummary from '../components/SelectedBrandsSummary.jsx';
import AdvancedFilters from '../components/AdvancedFilters.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Header from '../components/Header.jsx';
import SearchBar from '../components/SearchBar.jsx';
import MedicationHeader from '../components/MedicationHeader.jsx';
import CrossBrandPredictor from '../components/CrossBrandPredictor.jsx';
import {
    MagnifyingGlassIcon,
    ScaleIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    StarIcon,
    ArrowLeftIcon,
    FunnelIcon,
    ArrowsUpDownIcon,
    TruckIcon,
    ClockIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    DocumentArrowDownIcon,
    InformationCircleIcon,
    EyeIcon,
    EyeSlashIcon,
    CalculatorIcon,
    ShoppingCartIcon,
    HeartIcon,
    BellAlertIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    ArrowsRightLeftIcon,
    ClipboardDocumentCheckIcon,
    CloudArrowDownIcon,
    UsersIcon,
    BeakerIcon,
    CpuChipIcon,
    BellIcon,
    ShoppingBagIcon,
    TagIcon,
    SparklesIcon,
    BuildingStorefrontIcon,
    GiftIcon,
    FireIcon,
    LightBulbIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HeartIcon as HeartSolid, SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';

import { PillsIcon } from '../components/icons.jsx';

// ========================================
// MEDICATIONS DATA - Loaded from NMRA Sri Lankan Drug Price Database on mount
// ========================================
const sampleMedications = []; // Real data loaded dynamically from /api/comparator/all-medications

/* OLD HARDCODED DATA REMOVED - Was lines 71-1292
   All medication/brand data now comes from the NMRA Sri Lanka database via the Cross-Brand Comparator microservice.
   The useEffect in the component loads this data on mount. */


// ========================================
// NEW FEATURES COMPONENTS
// ========================================

// Smart Alert System
const SmartAlerts = ({ brands, selectedBrands = [] }) => {
    const getAlerts = () => {
        const alerts = [];

        // Price drop alert
        const priceDropBrands = brands.filter(brand => {
            if (brand.priceHistory.length < 2) return false;
            const recentChange = brand.priceHistory[brand.priceHistory.length - 1] -
                brand.priceHistory[brand.priceHistory.length - 2];
            return recentChange < -5; // Price dropped more than Rs. 5
        });
        if (priceDropBrands.length > 0) {
            alerts.push({
                type: 'success',
                title: 'Price Drop',
                message: `${priceDropBrands.length} brands had recent price reductions`,
                brands: priceDropBrands.slice(0, 2).map(b => b.name),
                icon: ArrowTrendingDownIcon
            });
        }

        // High efficacy alert
        const highEfficacyBrands = brands.filter(brand => brand.efficacyScore >= 95);
        if (highEfficacyBrands.length > 0 && brands.length > 1) {
            alerts.push({
                type: 'info',
                title: 'High Efficacy Options',
                message: `${highEfficacyBrands.length} brands with 95%+ efficacy score`,
                brands: highEfficacyBrands.slice(0, 2).map(b => b.name),
                icon: ShieldCheckIcon
            });
        }

        return alerts.slice(0, 3); // Limit to 3 alerts
    };

    const alerts = getAlerts();
    if (alerts.length === 0) return null;

    return (
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
                <BellIcon className="h-6 w-6 text-amber-500 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-900">Smart Alerts</h3>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    {alerts.length} new
                </span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                {alerts.map((alert, idx) => (
                    <div key={idx} className={`rounded-xl p-4 border ${alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                        alert.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                            'bg-blue-50 border-blue-200'
                        }`}>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${alert.type === 'warning' ? 'bg-amber-100' :
                                alert.type === 'success' ? 'bg-emerald-100' :
                                    'bg-blue-100'
                                }`}>
                                <alert.icon className={`h-5 w-5 ${alert.type === 'warning' ? 'text-amber-600' :
                                    alert.type === 'success' ? 'text-emerald-600' :
                                        'text-blue-600'
                                    }`} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-slate-900 mb-1">{alert.title}</h4>
                                <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                                <div className="flex flex-wrap gap-1">
                                    {alert.brands.map((brand, brandIdx) => (
                                        <span key={brandIdx} className="px-2 py-1 bg-white/50 text-slate-700 text-xs rounded-full">
                                            {brand}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Cost Savings Calculator
const CostSavingsCalculator = ({ selectedBrands, medication }) => {
    const [dosage, setDosage] = useState('1 daily');
    const [duration, setDuration] = useState(30);

    // Use medication for title display
    const medicationName = medication?.genericName || 'Medication';

    const calculateCost = (brand) => {
        const tabletsPerPack = parseInt(brand.packSize) || 30;
        const packPrice = brand.price;
        const tabletsNeeded = duration * (dosage === '1 daily' ? 1 : dosage === '2 daily' ? 2 : 3);
        const packsNeeded = Math.ceil(tabletsNeeded / tabletsPerPack);
        return packsNeeded * packPrice;
    };

    const calculateSavings = (brand, baselineBrand) => {
        if (!baselineBrand) return 0;
        const brandCost = calculateCost(brand);
        const baselineCost = calculateCost(baselineBrand);
        return baselineCost - brandCost;
    };

    const baselineBrand = selectedBrands.find(b => !b.isGeneric) || selectedBrands[0];

    if (selectedBrands.length < 2) return null;

    return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <CalculatorIcon className="h-6 w-6 text-emerald-600" />
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Cost Savings Calculator - {medicationName}</h3>
                    <p className="text-sm text-slate-600">Project your savings over time</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dosage Frequency</label>
                    <select
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                        <option value="1 daily">Once daily</option>
                        <option value="2 daily">Twice daily</option>
                        <option value="3 daily">Three times daily</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Treatment Duration: {duration} days
                    </label>
                    <input
                        type="range"
                        min="7"
                        max="365"
                        step="7"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>1 week</span>
                        <span>6 months</span>
                        <span>1 year</span>
                    </div>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={() => {
                            setDosage('1 daily');
                            setDuration(30);
                        }}
                        className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Reset Calculator
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4">Projected Costs</h4>
                <div className="space-y-3">
                    {selectedBrands.map((brand) => {
                        const cost = calculateCost(brand);
                        const savings = calculateSavings(brand, baselineBrand);
                        const isBaseline = brand.id === baselineBrand?.id;

                        return (
                            <div key={brand.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-slate-900">{brand.name}</span>
                                    {isBaseline && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                            Baseline
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-900">Rs. {cost.toFixed(2)}</div>
                                    {savings > 0 && (
                                        <div className="text-sm font-semibold text-emerald-600">
                                            Save Rs. {savings.toFixed(2)}
                                        </div>
                                    )}
                                    {savings < 0 && (
                                        <div className="text-sm font-semibold text-red-600">
                                            +Rs. {Math.abs(savings).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Market Insights Panel
const MarketInsights = ({ medications, selectedMedication }) => {
    const getMarketInsights = () => {
        if (!selectedMedication) {
            const totalBrands = medications.reduce((sum, med) => sum + med.brands.length, 0);
            const genericCount = medications.reduce((sum, med) =>
                sum + med.brands.filter(b => b.isGeneric).length, 0
            );
            const avgRating = medications.reduce((sum, med) =>
                sum + med.brands.reduce((s, b) => s + b.rating, 0), 0
            ) / totalBrands;

            return {
                title: "Market Overview",
                insights: [
                    { label: "Total Medications", value: medications.length, icon: PillsIcon },
                    { label: "Available Brands", value: totalBrands, icon: BuildingStorefrontIcon },
                    { label: "Generic Options", value: genericCount, icon: TagIcon },
                    { label: "Avg Rating", value: avgRating.toFixed(1), icon: StarIcon }
                ]
            };
        }

        const medication = selectedMedication;
        const genericCount = medication.brands.filter(b => b.isGeneric).length;
        const avgPrice = medication.brands.reduce((sum, b) => sum + b.price, 0) / medication.brands.length;
        const maxSaving = Math.max(...medication.brands.map(b => b.savings));

        return {
            title: `${medication.genericName} Insights`,
            insights: [
                { label: "Brand Options", value: medication.brands.length, icon: ShoppingBagIcon },
                { label: "Generic Alternatives", value: genericCount, icon: TagIcon },
                { label: "Average Price", value: `Rs. ${avgPrice.toFixed(2)}`, icon: CurrencyDollarIcon },
                { label: "Max Savings", value: `Rs. ${maxSaving.toFixed(2)}`, icon: GiftIcon }
            ]
        };
    };

    const insights = getMarketInsights();

    return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <LightBulbIcon className="h-6 w-6 text-purple-600" />
                <div>
                    <h3 className="text-lg font-bold text-slate-900">{insights.title}</h3>
                    <p className="text-sm text-slate-600">Real-time market data</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {insights.insights.map((insight, idx) => (
                    <div key={idx} className="bg-white/80 rounded-xl p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-3">
                            <insight.icon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 mb-1">{insight.value}</div>
                        <div className="text-sm text-slate-600">{insight.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Price Alert System
const PriceAlertSystem = ({ medications, priceAlerts, onAddAlert, onRemoveAlert }) => {
    const [showAddAlert, setShowAddAlert] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [targetPrice, setTargetPrice] = useState('');

    const allBrands = medications.flatMap(med => med.brands);

    const handleAddAlert = () => {
        if (selectedBrand && targetPrice) {
            onAddAlert({
                id: Date.now(),
                brandId: selectedBrand.id,
                brandName: selectedBrand.name,
                currentPrice: selectedBrand.price,
                targetPrice: parseFloat(targetPrice),
                createdAt: new Date().toISOString()
            });
            setShowAddAlert(false);
            setSelectedBrand(null);
            setTargetPrice('');
        }
    };

    return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <BellAlertIcon className="h-6 w-6 text-purple-600" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Price Alert System</h3>
                        <p className="text-sm text-slate-600">Get notified when prices drop</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddAlert(!showAddAlert)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                    + Create Alert
                </button>
            </div>

            {showAddAlert && (
                <div className="bg-white rounded-xl p-4 mb-4 border border-purple-200">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Brand</label>
                            <select
                                value={selectedBrand?.id || ''}
                                onChange={(e) => setSelectedBrand(allBrands.find(b => b.id === parseInt(e.target.value)))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Choose a brand...</option>
                                {allBrands.map(brand => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name} (Rs. {brand.price})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Target Price (Rs.)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={targetPrice}
                                onChange={(e) => setTargetPrice(e.target.value)}
                                placeholder="Enter target price"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleAddAlert}
                                className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Set Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {priceAlerts.length > 0 ? (
                <div className="space-y-3">
                    {priceAlerts.map(alert => (
                        <div key={alert.id} className="bg-white rounded-lg p-4 border border-purple-200 flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900">{alert.brandName}</h4>
                                <div className="flex items-center gap-4 mt-1 text-sm">
                                    <span className="text-slate-600">Current: <span className="font-semibold">Rs. {alert.currentPrice}</span></span>
                                    <span className="text-purple-600">Target: <span className="font-bold">Rs. {alert.targetPrice}</span></span>
                                    {alert.currentPrice <= alert.targetPrice && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full animate-pulse">
                                            ðŸŽ¯ Target Reached!
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onRemoveAlert(alert.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                âœ•
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-500 py-8">No active price alerts. Create one to get notified!</p>
            )}
        </div>
    );
};

// Batch Comparison Mode
const BatchComparisonMode = ({ medications, batchSelectedMeds, onToggleMed, onCompare }) => {
    return (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <ClipboardDocumentCheckIcon className="h-6 w-6 text-cyan-600" />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Batch Comparison Mode</h3>
                        <p className="text-sm text-slate-600">Compare multiple medications at once</p>
                    </div>
                </div>
                {batchSelectedMeds.length > 0 && (
                    <button
                        onClick={onCompare}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                        Compare {batchSelectedMeds.length} Medications
                    </button>
                )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {medications.map(med => {
                    const isSelected = batchSelectedMeds.some(m => m.id === med.id);
                    return (
                        <button
                            key={med.id}
                            onClick={() => onToggleMed(med)}
                            className={`text-left p-4 rounded-xl border-2 transition-all ${isSelected
                                    ? 'border-cyan-500 bg-cyan-50 shadow-lg'
                                    : 'border-slate-200 bg-white hover:border-cyan-300'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-900">{med.genericName}</h4>
                                    <p className="text-sm text-slate-600">{med.strength} â€¢ {med.form}</p>
                                </div>
                                {isSelected && (
                                    <CheckCircleIcon className="h-6 w-6 text-cyan-600" />
                                )}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{med.brands.length} brands</span>
                                <span className="font-semibold text-cyan-600">
                                    {med.brands.length > 0 ? `From Rs. ${Math.min(...med.brands.map(b => b.price)).toFixed(2)}` : 'No price data'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Side-by-Side Brand Comparison Modal
const SideBySideComparisonModal = ({ brands, onClose }) => {
    if (brands.length < 2) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white">Side-by-Side Comparison</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-auto max-h-[calc(90vh-88px)]">
                    <table className="w-full">
                        <thead className="bg-slate-100 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-slate-700">Feature</th>
                                {brands.map(brand => (
                                    <th key={brand.id} className="px-4 py-3 text-center font-bold text-slate-900">
                                        {brand.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="px-4 py-3 font-semibold text-slate-700">Price</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center">
                                        <span className="text-xl font-black text-slate-900">Rs. {brand.price}</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-700">Manufacturer</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center text-slate-600">
                                        {brand.manufacturer}
                                    </td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="px-4 py-3 font-semibold text-slate-700">Rating</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <StarSolid className="h-5 w-5 text-amber-400" />
                                            <span className="font-bold">{brand.rating}</span>
                                            <span className="text-sm text-slate-500">({brand.reviews})</span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-700">Efficacy Score</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center">
                                        <span className="font-bold text-emerald-600">{brand.efficacyScore}%</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="px-4 py-3 font-semibold text-slate-700">Patient Compliance</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center">
                                        <span className="font-bold text-blue-600">{brand.patientCompliance}%</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="px-4 py-3 font-semibold text-slate-700">Pack Size</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center text-slate-600">
                                        {brand.packSize}
                                    </td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-700">Savings</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center">
                                        {brand.savings > 0 ? (
                                            <span className="font-bold text-green-600">Rs. {brand.savings.toFixed(2)}</span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="px-4 py-3 font-semibold text-slate-700">Eco-Friendly</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center">
                                        {brand.sustainability.ecoFriendly ? (
                                            <span className="text-green-600 font-bold">âœ“</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Historical Price Analytics
const HistoricalPriceAnalytics = ({ medications, onClose }) => {
    const [selectedMed, setSelectedMed] = useState(medications[0]);

    const analyzeTrend = (history) => {
        if (history.length < 2) return 'stable';
        const recent = history.slice(-3);
        const trend = recent[recent.length - 1] - recent[0];
        if (trend < -0.5) return 'decreasing';
        if (trend > 0.5) return 'increasing';
        return 'stable';
    };

    const predictNextPrice = (history) => {
        if (history.length < 2) return history[history.length - 1];
        const recent = history.slice(-3);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const trend = (recent[recent.length - 1] - recent[0]) / recent.length;
        return (avg + trend).toFixed(2);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChartBarIcon className="h-8 w-8 text-white" />
                        <div>
                            <h2 className="text-2xl font-black text-white">Historical Price Analytics</h2>
                            <p className="text-indigo-100">AI-powered trend analysis & predictions</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Medication</label>
                        <select
                            value={selectedMed.id}
                            onChange={(e) => setSelectedMed(medications.find(m => m.id === parseInt(e.target.value)))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            {medications.map(med => (
                                <option key={med.id} value={med.id}>{med.genericName} - {med.strength}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedMed.brands.map(brand => {
                            const trend = analyzeTrend(brand.priceHistory);
                            const prediction = predictNextPrice(brand.priceHistory);
                            const avgPrice = (brand.priceHistory.reduce((a, b) => a + b, 0) / brand.priceHistory.length).toFixed(2);
                            const lowestPrice = Math.min(...brand.priceHistory).toFixed(2);
                            const highestPrice = Math.max(...brand.priceHistory).toFixed(2);

                            return (
                                <div key={brand.id} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                                    <h4 className="font-bold text-slate-900 mb-3">{brand.name}</h4>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Current Price:</span>
                                            <span className="font-bold text-slate-900">Rs. {brand.price}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Average Price:</span>
                                            <span className="font-semibold text-blue-600">Rs. {avgPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Lowest:</span>
                                            <span className="font-semibold text-green-600">Rs. {lowestPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Highest:</span>
                                            <span className="font-semibold text-red-600">Rs. {highestPrice}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-300 pt-3 mt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-700">Trend:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${trend === 'decreasing' ? 'bg-green-100 text-green-700' :
                                                    trend === 'increasing' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {trend === 'decreasing' && 'â†“ Decreasing'}
                                                {trend === 'increasing' && 'â†‘ Increasing'}
                                                {trend === 'stable' && 'â†’ Stable'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700">Predicted:</span>
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                                Rs. {prediction}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="flex items-center gap-1 h-8">
                                            {brand.priceHistory.map((price, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t"
                                                    style={{ height: `${(price / highestPrice) * 100}%` }}
                                                    title={`Rs. ${price}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>5 months ago</span>
                                            <span>Now</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Notification Center
const NotificationCenter = ({ notifications, onClose, onClearAll }) => {
    return (
        <div className="fixed top-20 right-8 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[600px] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BellIcon className="h-5 w-5 text-white" />
                    <h3 className="font-bold text-white">Notifications</h3>
                    <span className="px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold text-white">
                        {notifications.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="overflow-auto max-h-[500px]">
                {notifications.length > 0 ? (
                    <div className="p-2">
                        {notifications.map((notif, idx) => (
                            <div key={idx} className="p-3 mb-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-blue-50 transition-colors">
                                <div className="flex items-start gap-2">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${notif.type === 'price' ? 'bg-green-500' :
                                            notif.type === 'stock' ? 'bg-orange-500' :
                                                'bg-blue-500'
                                        }`} />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-900">{notif.title}</p>
                                        <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={onClearAll}
                            className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
                        >
                            Clear All
                        </button>
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <BellIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No notifications</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Popular Alternatives
const PopularAlternatives = ({ medications, selectedMedication }) => {
    if (!selectedMedication) return null;

    const alternatives = medications
        .filter(med =>
            med.id !== selectedMedication.id &&
            med.category === selectedMedication.category
        )
        .slice(0, 3);

    if (alternatives.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <FireIcon className="h-6 w-6 text-amber-600" />
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Popular Alternatives</h3>
                    <p className="text-sm text-slate-600">Other medications in {selectedMedication.category}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {alternatives.map((med) => (
                    <button
                        key={med.id}
                        onClick={() => window.location.hash = `medication-${med.id}`}
                        className="group bg-white rounded-xl p-4 border border-amber-200 hover:border-amber-300 hover:shadow-lg transition-all text-left"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                                    {med.genericName}
                                </h4>
                                <p className="text-sm text-slate-600">{med.strength}</p>
                            </div>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                {med.popularity}% popular
                            </span>
                        </div>
                        <div className="text-sm text-slate-600 mb-3">
                            {med.brands.length > 0 ? `${med.brands.length} brands from Rs. ${Math.min(...med.brands.map(b => b.price)).toFixed(2)}` : `${med.brands.length} brands`}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-amber-600 group-hover:text-amber-700">
                                View alternatives â†’
                            </span>
                            <div className="flex items-center gap-1">
                                <StarSolid className="h-4 w-4 text-amber-400" />
                                <span className="text-sm font-semibold">
                                    {(med.brands.reduce((s, b) => s + b.rating, 0) / med.brands.length).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

// AI Insights Modal Component
const AIInsightsModal = ({ insights, loading, error, onClose }) => {
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin" style={{ animationDuration: '3s' }}></div>
                            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                                <SparklesSolid className="h-8 w-8 text-purple-600 animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Generating AI Insights</h3>
                        <p className="text-slate-600 text-center">Analyzing brand data, market trends, and patient outcomes...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Generate Insights</h3>
                        <p className="text-slate-600 mb-6">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    const priorityColors = {
        high: 'from-red-500 to-orange-500',
        medium: 'from-amber-500 to-yellow-500',
        low: 'from-blue-500 to-cyan-500'
    };

    const typeIcons = {
        savings: CurrencyDollarIcon,
        quality: StarIcon,
        warning: ExclamationTriangleIcon,
        value: ChartBarIcon,
        subscription: GiftIcon,
        sustainability: BeakerIcon
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <SparklesSolid className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">AI Insights</h2>
                            <p className="text-purple-100">
                                {insights.medication.name} {insights.medication.strength} â€¢ {insights.medication.category}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
                            Confidence: {(insights.aiConfidence * 100).toFixed(0)}%
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="overflow-auto max-h-[calc(90vh-120px)] p-6">
                    {/* Top Picks */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FireIcon className="h-5 w-5 text-orange-500" />
                            Top Picks
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                                <span className="text-xs font-bold text-emerald-600 uppercase">Best Value</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">{insights.topPicks.bestValue.name}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-emerald-600 font-bold">Rs. {insights.topPicks.bestValue.price}</span>
                                    <span className="text-slate-400">â€¢</span>
                                    <span className="flex items-center gap-1">
                                        <StarSolid className="h-4 w-4 text-amber-400" />
                                        {insights.topPicks.bestValue.rating}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                                <span className="text-xs font-bold text-blue-600 uppercase">Most Affordable</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">{insights.topPicks.mostAffordable.name}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-blue-600 font-bold">Rs. {insights.topPicks.mostAffordable.price}</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                                <span className="text-xs font-bold text-amber-600 uppercase">Highest Rated</span>
                                <h4 className="text-lg font-bold text-slate-900 mt-1">{insights.topPicks.highestRated.name}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="flex items-center gap-1">
                                        <StarSolid className="h-4 w-4 text-amber-400" />
                                        <span className="text-amber-600 font-bold">{insights.topPicks.highestRated.rating}</span>
                                    </span>
                                    <span className="text-slate-400">â€¢</span>
                                    <span className="text-slate-600 text-sm">{insights.topPicks.highestRated.reviews} reviews</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <LightBulbIcon className="h-5 w-5 text-purple-500" />
                            AI Recommendations
                        </h3>
                        <div className="space-y-3">
                            {insights.recommendations.map((rec, idx) => {
                                const IconComponent = typeIcons[rec.type] || LightBulbIcon;
                                return (
                                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${priorityColors[rec.priority]} flex items-center justify-center flex-shrink-0`}>
                                            <IconComponent className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-900">{rec.title}</h4>
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                                    rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                    rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {rec.priority}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-sm">{rec.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Market Analysis */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <ChartBarIcon className="h-5 w-5 text-indigo-500" />
                            Market Analysis
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                                <div className="text-2xl font-black text-slate-900">{insights.marketAnalysis.totalBrands}</div>
                                <div className="text-sm text-slate-600">Total Brands</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                                <div className="text-2xl font-black text-emerald-600">Rs. {insights.marketAnalysis.averagePrice.toFixed(2)}</div>
                                <div className="text-sm text-slate-600">Avg. Price</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                                <div className="text-2xl font-black text-amber-600">{insights.marketAnalysis.averageRating}</div>
                                <div className="text-sm text-slate-600">Avg. Rating</div>
                            </div>
                        </div>
                    </div>

                    {/* Selection Analysis */}
                    {insights.selectionAnalysis && (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
                            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <CheckCircleIcon className="h-5 w-5 text-purple-500" />
                                Your Selection
                            </h3>
                            <p className="text-slate-700 mb-3">{insights.selectionAnalysis.summary}</p>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <CurrencyDollarIcon className="h-5 w-5 text-purple-500" />
                                    <span className="text-slate-600">Total: <strong>Rs. {insights.selectionAnalysis.totalCost.toFixed(2)}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StarIcon className="h-5 w-5 text-purple-500" />
                                    <span className="text-slate-600">Avg Rating: <strong>{insights.selectionAnalysis.averageRating}</strong></span>
                                </div>
                                {insights.selectionAnalysis.potentialSavings > 0 && (
                                    <div className="flex items-center gap-2">
                                        <ArrowTrendingDownIcon className="h-5 w-5 text-emerald-500" />
                                        <span className="text-emerald-600">Savings: <strong>Rs. {insights.selectionAnalysis.potentialSavings.toFixed(2)}</strong></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        Generated at {new Date(insights.timestamp).toLocaleString()} â€¢ Model v{insights.modelVersion}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

// Quick Actions Bar
const QuickActionsBar = ({ selectedBrands, medications, onExport, onShare, onAIInsights }) => {
    const favoriteCount = medications.reduce((sum, med) =>
        sum + med.brands.filter(b => b.favorite).length, 0
    );

    return (
        <div className="sticky top-4 z-20 mb-6 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <ShoppingCartIcon className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-slate-900">
                            {selectedBrands.length} selected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <HeartSolid className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-slate-900">
                            {favoriteCount} favorites
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TagIcon className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium text-slate-900">
                            {medications.reduce((sum, med) => sum + med.brands.filter(b => b.isGeneric).length, 0)} generics
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onExport}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                        Export
                    </button>
                    <button
                        onClick={onShare}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <UsersIcon className="h-5 w-5" />
                        Share
                    </button>
                    <button
                        onClick={onAIInsights}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <SparklesSolid className="h-5 w-5" />
                        AI Insights
                    </button>
                </div>
            </div>
        </div>
    );
};

// ========================================
// MAIN COMPONENT 
// ========================================
const CrossBrandComparator = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMedication, setSelectedMedication] = useState(null);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [sortBy, setSortBy] = useState('price');
    const [filterGeneric, setFilterGeneric] = useState('all');
    const [filterRating, setFilterRating] = useState(0);
    const [showFavorites, setShowFavorites] = useState(false);
    const [showDetails, setShowDetails] = useState(null);
    const [medications, setMedications] = useState(sampleMedications);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 50000]);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showSustainability, setShowSustainability] = useState(false);
    const [priceAlerts, setPriceAlerts] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [batchCompareMode, setBatchCompareMode] = useState(false);
    const [batchSelectedMeds, setBatchSelectedMeds] = useState([]);
    const [showSideBySide, setShowSideBySide] = useState(false);
    const [sideBySideCompareBrands, setSideBySideCompareBrands] = useState([]);
    const [showHistoricalAnalytics, setShowHistoricalAnalytics] = useState(false);
    const [showDDIPredictor, setShowDDIPredictor] = useState(false);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchInputRef = useRef(null);
    const [apiBrandSuggestions, setApiBrandSuggestions] = useState([]);
    const [apiAllSuggestions, setApiAllSuggestions] = useState([]);
    const [isSearchingAPI, setIsSearchingAPI] = useState(false);
    const [isFetchingBrands, setIsFetchingBrands] = useState(false);
    const [isLoadingMedications, setIsLoadingMedications] = useState(true);
    
    // AI Insights state
    const [showAIInsights, setShowAIInsights] = useState(false);
    const [aiInsights, setAIInsights] = useState(null);
    const [aiInsightsLoading, setAIInsightsLoading] = useState(false);
    const [aiInsightsError, setAIInsightsError] = useState(null);

    // Load all medications from NMRA database on component mount
    useEffect(() => {
        const loadMedications = async () => {
            try {
                setIsLoadingMedications(true);
                const COMPARATOR_BASE = import.meta.env.VITE_CROSS_BRAND_API || '/api/comparator';
                const res = await fetch(`${COMPARATOR_BASE}/all-medications`);
                if (!res.ok) throw new Error('Failed to fetch medications');
                const data = await res.json();
                if (data.medications && data.medications.length > 0) {
                    setMedications(data.medications);
                    console.log(`[CrossBrand] Loaded ${data.medications.length} medications from NMRA database`);
                }
            } catch (err) {
                console.error('Failed to load medications from API:', err);
                // medications stays as empty sampleMedications - user must search to find drugs
            } finally {
                setIsLoadingMedications(false);
            }
        };
        loadMedications();
    }, []);

    // Fetch brand names from drug interaction microservice API
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 1) {
            setApiBrandSuggestions([]);
            return;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setIsSearchingAPI(true);
                const query = encodeURIComponent(searchTerm.trim());
                const API_BASE = import.meta.env.VITE_DRUG_INTERACTION_API || 'http://localhost:3000/api/drug-interactions';
                let results = [];
                try {
                    const res = await fetch(`${API_BASE}/search?query=${query}&limit=30`, { signal: controller.signal });
                    if (!res.ok) throw new Error('API search failed');
                    const data = await res.json();
                    results = data.results || [];
                } catch (err) {
                    if (err.name === 'AbortError') throw err;
                    // Fallback: ML service
                    const ML_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
                    const fallbackRes = await fetch(`${ML_BASE}/drugs?q=${query}&limit=30`, { signal: controller.signal });
                    if (fallbackRes.ok) {
                        const d = await fallbackRes.json();
                        results = (d || []).map(item => ({
                            name: item.name,
                            type: item.type || 'generic',
                            genericName: item.generic || '',
                            class: item.class || ''
                        }));
                    }
                }
                // Keep brand names for brand suggestions
                setApiBrandSuggestions(results.filter(s => s.type === 'brand'));
                // Keep all results including generics for generic-name searches
                setApiAllSuggestions(results);
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Brand search error', err);
            } finally {
                setIsSearchingAPI(false);
            }
        }, 300);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [searchTerm]);

    // Fetch available brands for a generic drug name from the cross-brand comparison service
    // Routes through Vite proxy â†’ Express gateway (/api/comparator) â†’ Node microservice (port 3003)
    const fetchBrandsForGeneric = async (genericName, selectedBrandName = '') => {
        setIsFetchingBrands(true);
        try {
            const COMPARATOR_BASE = import.meta.env.VITE_CROSS_BRAND_API || '/api/comparator';
            const res = await fetch(`${COMPARATOR_BASE}/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genericName: genericName.trim() })
            });
            if (!res.ok) throw new Error('Cross-brand compare failed');
            const data = await res.json();
            const apiBrands = data?.comparison?.brands || [];

            if (apiBrands.length === 0) return null;

            // Map API brands to the component's expected brand object format
            const idBase = Date.now() % 100000; // unique base to avoid collisions
            const mappedBrands = apiBrands.map((b, idx) => ({
                id: idBase + idx,
                name: b.brandName || 'Unknown',
                manufacturer: b.manufacturer || 'Unknown',
                price: typeof b.price === 'number' ? Math.round(b.price * 100) / 100 : 0,
                priceHistory: [b.price * 1.05, b.price * 1.02, b.price, b.price * 0.98, b.price].map(p => Math.round((p || 0) * 100) / 100),
                packSize: `${b.packageSize || 30} ${b.dosageForm || 'tablets'}`,
                availability: b.availability === 'limited' ? 'Limited Stock' : 'In Stock',
                stockLevel: b.availability === 'limited' ? 45 : Math.floor(Math.random() * 2000) + 500,
                rating: typeof b.rating === 'number' ? Math.round(b.rating * 10) / 10 : 4.0,
                reviews: Math.floor(Math.random() * 2000) + 100,
                savings: 0,
                isGeneric: (b.brandName || '').toLowerCase().includes('generic'),
                description: `${b.dosageForm || 'Medication'} - ${b.strength || ''} by ${b.manufacturer || 'Unknown'}`,
                sideEffects: [],
                efficacyScore: Math.floor(Math.random() * 10) + 85,
                patientCompliance: Math.floor(Math.random() * 10) + 82,
                storage: 'Room temperature',
                requiresPrescription: true,
                lastUpdated: new Date().toISOString().split('T')[0],
                favorite: false,
                popularity: Math.floor(Math.random() * 30) + 60,
                interactions: [],
                dosage: b.strength || 'As prescribed',
                warnings: [],
                tags: [b.dosageForm || 'Tablet', b.therapeuticClass || genericName].filter(Boolean),
                discount: 0,
                subscription: { available: false, discount: 0, frequency: null },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            }));

            // Calculate savings relative to most expensive
            const maxPrice = Math.max(...mappedBrands.map(b => b.price));
            mappedBrands.forEach(b => {
                b.savings = Math.round((maxPrice - b.price) * 100) / 100;
            });

            // Build a dynamic medication object
            const firstBrand = apiBrands[0];
            const dynamicMedication = {
                id: 99000 + Math.floor(Math.random() * 1000),
                genericName: genericName,
                strength: firstBrand.strength || '',
                category: firstBrand.therapeuticClass || 'Medication',
                form: firstBrand.dosageForm || 'Tablet',
                therapeuticClass: firstBrand.therapeuticClass || 'General',
                popularity: 80,
                prescriptionRate: 70,
                brands: mappedBrands
            };

            // Update price range to accommodate new data
            const prices = mappedBrands.map(b => b.price);
            if (prices.length > 0) {
                setPriceRange([0, Math.ceil(Math.max(...prices) + 10)]);
            }

            return dynamicMedication;
        } catch (err) {
            console.error('Failed to fetch brands for generic:', err);
            return null;
        } finally {
            setIsFetchingBrands(false);
        }
    };

    // Generate autocomplete suggestions - API generics first, then brands, then local
    const autocompleteSuggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 1) return [];

        const suggestions = [];
        const seen = new Set();

        // 1) API generic results (search by generic name to find all brands)
        apiAllSuggestions.filter(s => s.type === 'generic').forEach(generic => {
            const key = `generic-${generic.name.toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                suggestions.push({
                    type: 'api-generic',
                    id: `api-generic-${generic.name}`,
                    name: generic.name,
                    subtitle: 'View all available brands for this medicine',
                    genericName: generic.name,
                    category: generic.class || 'Medication',
                    icon: 'pill'
                });
            }
        });

        // 2) API brand results (from real drug database)
        apiBrandSuggestions.forEach(brand => {
            const key = brand.name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                suggestions.push({
                    type: 'api-brand',
                    id: `api-${brand.name}`,
                    name: brand.name,
                    subtitle: [brand.genericName, brand.class].filter(Boolean).join(' â€¢ '),
                    genericName: brand.genericName || '',
                    category: brand.class || '',
                    icon: 'tag'
                });
            }
        });

        // 3) Local matching medications (by generic name)
        const term = searchTerm.toLowerCase();
        medications.forEach(med => {
            const genKey = `generic-${med.genericName.toLowerCase()}`;
            if (!seen.has(genKey) && med.genericName.toLowerCase().includes(term)) {
                seen.add(genKey);
                suggestions.push({
                    type: 'medication',
                    id: `local-med-${med.id}`,
                    name: med.genericName,
                    subtitle: `${med.brands.length} brands available â€¢ ${med.strength} ${med.form} â€¢ ${med.category}`,
                    genericName: med.genericName,
                    category: med.category,
                    icon: 'pill',
                    medication: med
                });
            }
        });

        // 4) Local matching brands from sampleMedications
        medications.forEach(med => {
            med.brands.forEach(brand => {
                const key = brand.name.toLowerCase();
                if (!seen.has(key) && (brand.name.toLowerCase().includes(term) || brand.manufacturer.toLowerCase().includes(term))) {
                    seen.add(key);
                    suggestions.push({
                        type: 'brand',
                        id: `${med.id}-${brand.id}`,
                        name: brand.name,
                        subtitle: `${brand.manufacturer} â€¢ Rs. ${brand.price} â€¢ ${med.genericName} ${med.strength}`,
                        category: med.category,
                        icon: 'tag',
                        medication: med,
                        brand: brand
                    });
                }
            });
        });

        return suggestions.slice(0, 15);
    }, [searchTerm, medications, apiBrandSuggestions, apiAllSuggestions]);

    // Handle autocomplete selection
    const handleAutocompleteSelect = async (suggestion) => {
        setShowAutocomplete(false);
        setHighlightedIndex(-1);

        if (suggestion.type === 'medication') {
            // Local medication selected - refresh from API for real NMRA data
            setSearchTerm(suggestion.name);
            setSelectedBrands([]);
            const dynamicMed = await fetchBrandsForGeneric(suggestion.medication.genericName);
            if (dynamicMed && dynamicMed.brands.length > 0) {
                setSelectedMedication(dynamicMed);
                setMedications(prev => {
                    const exists = prev.find(m => m.genericName.toLowerCase() === dynamicMed.genericName.toLowerCase());
                    if (exists) return prev.map(m => m.genericName.toLowerCase() === dynamicMed.genericName.toLowerCase() ? dynamicMed : m);
                    return [...prev, dynamicMed];
                });
            } else {
                setSelectedMedication(suggestion.medication);
            }
        } else if (suggestion.type === 'brand') {
            // Local brand selected - refresh from API
            setSearchTerm(suggestion.brand.name);
            setSelectedBrands([]);
            const dynamicMed = await fetchBrandsForGeneric(suggestion.medication.genericName);
            if (dynamicMed && dynamicMed.brands.length > 0) {
                setSelectedMedication(dynamicMed);
                const matchedBrand = dynamicMed.brands.find(b => b.name.toLowerCase() === suggestion.brand.name.toLowerCase());
                if (matchedBrand) setSelectedBrands([matchedBrand]);
            } else {
                setSelectedMedication(suggestion.medication);
                if (!selectedBrands.find(b => b.id === suggestion.brand.id)) {
                    setSelectedBrands(prev => [...prev, suggestion.brand]);
                }
            }
        } else if (suggestion.type === 'api-generic') {
            // User selected a generic drug name - ALWAYS fetch from API for real NMRA data
            setSearchTerm(suggestion.name);
            setSelectedBrands([]);
            const dynamicMed = await fetchBrandsForGeneric(suggestion.name);
            if (dynamicMed && dynamicMed.brands.length > 0) {
                setSelectedMedication(dynamicMed);
                setMedications(prev => {
                    const exists = prev.find(m => m.genericName.toLowerCase() === dynamicMed.genericName.toLowerCase());
                    if (exists) return prev.map(m => m.genericName.toLowerCase() === dynamicMed.genericName.toLowerCase() ? dynamicMed : m);
                    return [...prev, dynamicMed];
                });
            } else {
                const genericLower = suggestion.name.toLowerCase();
                const localMatch = medications.find(med => med.genericName.toLowerCase() === genericLower);
                if (localMatch) setSelectedMedication(localMatch);
            }
        } else if (suggestion.type === 'api-brand') {
            setSearchTerm(suggestion.name);
            setSelectedBrands([]);
            if (suggestion.genericName) {
                const dynamicMed = await fetchBrandsForGeneric(suggestion.genericName, suggestion.name);
                if (dynamicMed && dynamicMed.brands.length > 0) {
                    setSelectedMedication(dynamicMed);
                    setMedications(prev => {
                        const exists = prev.find(m => m.genericName.toLowerCase() === dynamicMed.genericName.toLowerCase());
                        if (exists) return prev.map(m => m.genericName.toLowerCase() === dynamicMed.genericName.toLowerCase() ? dynamicMed : m);
                        return [...prev, dynamicMed];
                    });
                    const clickedBrand = dynamicMed.brands.find(
                        b => b.name.toLowerCase() === suggestion.name.toLowerCase()
                    );
                    if (clickedBrand) setSelectedBrands([clickedBrand]);
                } else {
                    const genericLower = suggestion.genericName.toLowerCase();
                    const matched = medications.find(med =>
                        med.genericName.toLowerCase() === genericLower ||
                        med.brands.some(b => b.name.toLowerCase() === suggestion.name.toLowerCase())
                    );
                    if (matched) {
                        setSelectedMedication(matched);
                        const matchedBrand = matched.brands.find(b => b.name.toLowerCase() === suggestion.name.toLowerCase());
                        if (matchedBrand) setSelectedBrands([matchedBrand]);
                    }
                }
            }
        }

        // Scroll to brands section
        setTimeout(() => {
            document.getElementById('brands-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
    };

    // Handle keyboard navigation in autocomplete
    const handleSearchKeyDown = (e) => {
        if (!showAutocomplete || autocompleteSuggestions.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => 
                prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => 
                prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
            );
        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
            e.preventDefault();
            handleAutocompleteSelect(autocompleteSuggestions[highlightedIndex]);
        } else if (e.key === 'Escape') {
            setShowAutocomplete(false);
            setHighlightedIndex(-1);
        }
    };

    // Redirect if not authenticated
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    // Filter and sort brands
    const filteredBrands = useMemo(() => {
        if (!selectedMedication) return [];

        return selectedMedication.brands
            .filter(brand => {
                if (filterGeneric === 'generic') return brand.isGeneric;
                if (filterGeneric === 'brand') return !brand.isGeneric;
                return true;
            })
            .filter(brand => brand.rating >= filterRating)
            .filter(brand => brand.price >= priceRange[0] && brand.price <= priceRange[1])
            .filter(brand => !showFavorites || brand.favorite)
            .filter(brand => !showSustainability || brand.sustainability.ecoFriendly)
            .sort((a, b) => {
                switch (sortBy) {
                    case 'price': return a.price - b.price;
                    case 'rating': return b.rating - a.rating;
                    case 'savings': return b.savings - a.savings;
                    case 'efficacy': return b.efficacyScore - a.efficacyScore;
                    case 'compliance': return b.patientCompliance - a.patientCompliance;
                    case 'popularity': return b.popularity - a.popularity;
                    default: return 0;
                }
            });
    }, [selectedMedication, filterGeneric, filterRating, priceRange, showFavorites, sortBy, showSustainability]);

    const handleBrandSelect = (brand) => {
        setSelectedBrands(prev => {
            const isSelected = prev.find(b => b.id === brand.id);
            if (isSelected) {
                return prev.filter(b => b.id !== brand.id);
            } else {
                return [...prev, brand];
            }
        });
    };

    const handleMedicationSelect = async (medication) => {
        setSelectedMedication(medication);
        setSelectedBrands([]);
        setSearchTerm(medication.genericName);
        
        // Always fetch real brands from the cross-brand comparison service (NMRA data)
        try {
            const dynamicMed = await fetchBrandsForGeneric(medication.genericName);
            if (dynamicMed && dynamicMed.brands.length > 0) {
                // REPLACE all brands with real NMRA data (don't merge with local)
                setSelectedMedication(dynamicMed);
                // Update in medications list too
                setMedications(prev => prev.map(m =>
                    m.genericName.toLowerCase() === dynamicMed.genericName.toLowerCase() ? dynamicMed : m
                ));
                // Update price range
                const allPrices = dynamicMed.brands.map(b => b.price);
                if (allPrices.length > 0) {
                    setPriceRange([0, Math.ceil(Math.max(...allPrices) + 10)]);
                }
            }
        } catch (err) {
            console.error('Could not fetch medication brands from API:', err);
        }
        
        // Scroll to brands section
        setTimeout(() => {
            document.getElementById('brands-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleFavoriteToggle = (brandId) => {
        setMedications(prev => prev.map(med => ({
            ...med,
            brands: med.brands.map(brand =>
                brand.id === brandId ? { ...brand, favorite: !brand.favorite } : brand
            )
        })));
    };

    const filteredMedications = medications.filter(med =>
        med.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.brands.some(brand => brand.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalSavings = selectedBrands.reduce((sum, brand) => sum + brand.savings, 0);
    const averageRating = selectedBrands.length > 0
        ? (selectedBrands.reduce((sum, brand) => sum + brand.rating, 0) / selectedBrands.length).toFixed(1)
        : 0;

    const handleExport = async () => {
        if (!selectedMedication) {
            alert('Please select a medication first to export.');
            return;
        }

        // Auto-fetch AI insights if not already loaded
        let insightsData = aiInsights;
        if (!insightsData) {
            try {
                const response = await fetch('/api/ml/brand-insights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        medication: {
                            id: selectedMedication.id,
                            genericName: selectedMedication.genericName,
                            category: selectedMedication.category,
                            strength: selectedMedication.strength,
                            therapeuticClass: selectedMedication.therapeuticClass
                        },
                        selectedBrands: selectedBrands.map(b => ({
                            id: b.id, name: b.name, manufacturer: b.manufacturer,
                            price: b.price, rating: b.rating, efficacyScore: b.efficacyScore,
                            isGeneric: b.isGeneric, availability: b.availability, savings: b.savings
                        })),
                        allBrands: selectedMedication.brands.map(b => ({
                            id: b.id, name: b.name, manufacturer: b.manufacturer,
                            price: b.price, rating: b.rating, efficacyScore: b.efficacyScore,
                            isGeneric: b.isGeneric, availability: b.availability, savings: b.savings,
                            patientCompliance: b.patientCompliance, subscription: b.subscription,
                            sustainability: b.sustainability
                        }))
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        insightsData = data.data;
                        setAIInsights(data.data);
                    }
                }
            } catch (e) {
                console.log('Could not fetch AI insights for PDF:', e);
            }
        }

        // Create PDF document
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // Helper function to add new page if needed
        const checkPageBreak = (requiredSpace = 30) => {
            if (yPos + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        };

        // ===== HEADER =====
        // Gradient-like header background
        doc.setFillColor(59, 130, 246); // Blue
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setFillColor(99, 102, 241); // Indigo overlay
        doc.rect(0, 35, pageWidth, 10, 'F');

        // Logo/Brand
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PharmaLink', 15, 22);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Intelligent Medication Comparison Platform', 15, 30);
        
        // Report title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Brand Comparison Report', 15, 40);

        // Date on right side
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const dateStr = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        doc.text(`Generated: ${dateStr}`, pageWidth - 15, 22, { align: 'right' });

        yPos = 55;

        // ===== MEDICATION INFO =====
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Medication Overview', 15, yPos);
        yPos += 8;

        // Info box
        doc.setFillColor(241, 245, 249); // Slate-100
        doc.roundedRect(15, yPos, pageWidth - 30, 28, 3, 3, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(selectedMedication.genericName, 20, yPos + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFontSize(9);
        doc.text(`Strength: ${selectedMedication.strength}  |  Category: ${selectedMedication.category}  |  Form: ${selectedMedication.form}`, 20, yPos + 16);
        doc.text(`Therapeutic Class: ${selectedMedication.therapeuticClass}  |  Total Brands Available: ${selectedMedication.brands.length}`, 20, yPos + 23);
        
        yPos += 38;

        // ===== SUMMARY STATS =====
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Analysis Summary', 15, yPos);
        yPos += 10;

        // Stats boxes
        const boxWidth = (pageWidth - 40) / 4;
        const statsData = [
            { label: 'Brands Compared', value: selectedBrands.length.toString(), color: [59, 130, 246] },
            { label: 'Total Savings', value: `Rs. ${totalSavings.toFixed(2)}`, color: [16, 185, 129] },
            { label: 'Avg Rating', value: `${averageRating}/5`, color: [245, 158, 11] },
            { label: 'Best Price', value: selectedBrands.length > 0 ? `Rs. ${Math.min(...selectedBrands.map(b => b.price)).toFixed(2)}` : 'N/A', color: [139, 92, 246] }
        ];

        statsData.forEach((stat, i) => {
            const x = 15 + (i * (boxWidth + 5));
            doc.setFillColor(...stat.color);
            doc.roundedRect(x, yPos, boxWidth, 22, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(stat.value, x + boxWidth/2, yPos + 10, { align: 'center' });
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(stat.label, x + boxWidth/2, yPos + 17, { align: 'center' });
        });
        yPos += 32;

        // ===== BRAND COMPARISON TABLE =====
        checkPageBreak(50);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Brand Comparison Details', 15, yPos);
        yPos += 8;

        if (selectedBrands.length > 0) {
            const tableData = selectedBrands.map(brand => [
                brand.name,
                brand.manufacturer,
                brand.isGeneric ? 'Generic' : 'Brand',
                `Rs. ${brand.price.toFixed(2)}`,
                `Rs. ${brand.savings.toFixed(2)}`,
                `${brand.rating}/5`,
                `${brand.efficacyScore}%`
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Brand Name', 'Manufacturer', 'Type', 'Price', 'Savings', 'Rating', 'Efficacy']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'center',
                    cellPadding: 3
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [51, 65, 85],
                    cellPadding: 2,
                    valign: 'middle'
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 22, halign: 'right' },
                    4: { cellWidth: 22, halign: 'right', textColor: [16, 185, 129] },
                    5: { cellWidth: 20, halign: 'center' },
                    6: { cellWidth: 20, halign: 'center' }
                },
                margin: { left: 15, right: 15 },
                tableWidth: 'auto'
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // ===== AI INSIGHTS SECTION =====
        if (insightsData) {
            checkPageBreak(80);
            
            // Header - Purple/Pink gradient like the modal
            doc.setFillColor(147, 51, 234); // Purple-600
            doc.rect(15, yPos, pageWidth - 30, 25, 'F');
            doc.setFillColor(219, 39, 119); // Pink-600
            doc.rect(15, yPos + 20, pageWidth - 30, 8, 'F');
            
            // Icon placeholder
            doc.setFillColor(255, 255, 255, 0.2);
            doc.roundedRect(20, yPos + 4, 18, 18, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.text('*', 26, yPos + 16); // Sparkle placeholder
            
            // Header text
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('AI Insights', 45, yPos + 12);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`${insightsData.medication?.name || selectedMedication.genericName} ${insightsData.medication?.strength || selectedMedication.strength} - ${insightsData.medication?.category || selectedMedication.category}`, 45, yPos + 20);
            
            // Confidence badge
            doc.setFillColor(255, 255, 255, 0.3);
            doc.roundedRect(pageWidth - 55, yPos + 8, 35, 10, 2, 2, 'F');
            doc.setFontSize(8);
            doc.text(`Confidence: ${(insightsData.aiConfidence * 100).toFixed(0)}%`, pageWidth - 52, yPos + 15);
            
            yPos += 35;

            // ===== TOP PICKS SECTION =====
            if (insightsData.topPicks) {
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Top Picks', 15, yPos);
                yPos += 8;

                const cardWidth = (pageWidth - 40) / 3;
                const cardHeight = 35;

                // Best Value Card - Green gradient
                doc.setFillColor(236, 253, 245); // Emerald-50
                doc.roundedRect(15, yPos, cardWidth, cardHeight, 3, 3, 'F');
                doc.setDrawColor(167, 243, 208); // Emerald-200
                doc.roundedRect(15, yPos, cardWidth, cardHeight, 3, 3, 'S');
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(5, 150, 105); // Emerald-600
                doc.text('BEST VALUE', 18, yPos + 8);
                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                doc.text(insightsData.topPicks.bestValue.name, 18, yPos + 17);
                doc.setFontSize(9);
                doc.setTextColor(5, 150, 105);
                doc.text(`Rs. ${insightsData.topPicks.bestValue.price}`, 18, yPos + 26);
                doc.setTextColor(100, 116, 139);
                doc.text(` - ${insightsData.topPicks.bestValue.rating}/5`, 18 + doc.getTextWidth(`Rs. ${insightsData.topPicks.bestValue.price}`), yPos + 26);

                // Most Affordable Card - Blue gradient
                const card2X = 15 + cardWidth + 5;
                doc.setFillColor(239, 246, 255); // Blue-50
                doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 3, 3, 'F');
                doc.setDrawColor(191, 219, 254); // Blue-200
                doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 3, 3, 'S');
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(37, 99, 235); // Blue-600
                doc.text('MOST AFFORDABLE', card2X + 3, yPos + 8);
                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                doc.text(insightsData.topPicks.mostAffordable.name, card2X + 3, yPos + 17);
                doc.setFontSize(9);
                doc.setTextColor(37, 99, 235);
                doc.text(`Rs. ${insightsData.topPicks.mostAffordable.price}`, card2X + 3, yPos + 26);

                // Highest Rated Card - Amber gradient
                const card3X = 15 + (cardWidth + 5) * 2;
                doc.setFillColor(255, 251, 235); // Amber-50
                doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 3, 3, 'F');
                doc.setDrawColor(253, 230, 138); // Amber-200
                doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 3, 3, 'S');
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(217, 119, 6); // Amber-600
                doc.text('HIGHEST RATED', card3X + 3, yPos + 8);
                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                doc.text(insightsData.topPicks.highestRated.name, card3X + 3, yPos + 17);
                doc.setFontSize(9);
                doc.setTextColor(217, 119, 6);
                doc.text(`${insightsData.topPicks.highestRated.rating}/5`, card3X + 3, yPos + 26);
                doc.setTextColor(100, 116, 139);
                doc.text(` - ${insightsData.topPicks.highestRated.reviews} reviews`, card3X + 3 + doc.getTextWidth(`${insightsData.topPicks.highestRated.rating}/5`), yPos + 26);

                yPos += cardHeight + 10;
            }

            // ===== RECOMMENDATIONS SECTION =====
            if (insightsData.recommendations && insightsData.recommendations.length > 0) {
                checkPageBreak(50);
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('AI Recommendations', 15, yPos);
                yPos += 8;

                insightsData.recommendations.forEach((rec) => {
                    checkPageBreak(25);
                    
                    // Card background
                    doc.setFillColor(248, 250, 252); // Slate-50
                    doc.roundedRect(15, yPos, pageWidth - 30, 22, 3, 3, 'F');
                    doc.setDrawColor(226, 232, 240); // Slate-200
                    doc.roundedRect(15, yPos, pageWidth - 30, 22, 3, 3, 'S');
                    
                    // Priority colored icon box
                    const priorityColors = {
                        high: [239, 68, 68],     // Red
                        medium: [245, 158, 11],  // Amber
                        low: [59, 130, 246]      // Blue
                    };
                    const color = priorityColors[rec.priority] || [147, 51, 234];
                    doc.setFillColor(...color);
                    doc.roundedRect(18, yPos + 3, 16, 16, 2, 2, 'F');
                    
                    // Icon symbol
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(10);
                    const symbols = { savings: 'Rs', quality: '*', warning: '!', value: '#', subscription: '+', sustainability: '~' };
                    doc.text(symbols[rec.type] || '?', 23, yPos + 13);
                    
                    // Title and priority badge
                    doc.setTextColor(30, 41, 59);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text(rec.title || rec.type || 'Recommendation', 38, yPos + 9);
                    
                    // Priority badge
                    const badgeColors = {
                        high: { bg: [254, 226, 226], text: [185, 28, 28] },
                        medium: { bg: [254, 243, 199], text: [180, 83, 9] },
                        low: { bg: [219, 234, 254], text: [29, 78, 216] }
                    };
                    const badge = badgeColors[rec.priority] || badgeColors.low;
                    const badgeX = 38 + doc.getTextWidth(rec.title || rec.type || 'Recommendation') + 3;
                    doc.setFillColor(...badge.bg);
                    doc.roundedRect(badgeX, yPos + 3, 18, 8, 2, 2, 'F');
                    doc.setTextColor(...badge.text);
                    doc.setFontSize(6);
                    doc.text(rec.priority.toUpperCase(), badgeX + 2, yPos + 9);
                    
                    // Description
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    doc.setFontSize(8);
                    const descText = rec.description || rec.recommendation || '';
                    const splitDesc = doc.splitTextToSize(descText, pageWidth - 60);
                    doc.text(splitDesc[0] || '', 38, yPos + 17);
                    
                    yPos += 26;
                });
                yPos += 5;
            }

            // ===== MARKET ANALYSIS SECTION =====
            if (insightsData.marketAnalysis) {
                checkPageBreak(45);
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Market Analysis', 15, yPos);
                yPos += 8;

                const ma = insightsData.marketAnalysis;
                const statWidth = (pageWidth - 35) / 3;
                const statHeight = 30;

                const marketStats = [
                    { value: ma.totalBrands || 0, label: 'Total Brands', color: [30, 41, 59] },
                    { value: `Rs. ${(ma.averagePrice || ma.avgPrice || 0).toFixed(2)}`, label: 'Avg. Price', color: [5, 150, 105] },
                    { value: ma.averageRating || ma.avgRating || 'N/A', label: 'Avg. Rating', color: [217, 119, 6] }
                ];

                marketStats.forEach((stat, i) => {
                    const x = 15 + (i * (statWidth + 5));
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(x, yPos, statWidth, statHeight, 3, 3, 'F');
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(x, yPos, statWidth, statHeight, 3, 3, 'S');
                    
                    doc.setTextColor(...stat.color);
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(String(stat.value), x + statWidth/2, yPos + 14, { align: 'center' });
                    
                    doc.setTextColor(100, 116, 139);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.text(stat.label, x + statWidth/2, yPos + 23, { align: 'center' });
                });
                yPos += statHeight + 10;
            }

            // ===== SELECTION ANALYSIS SECTION =====
            if (insightsData.selectionAnalysis) {
                checkPageBreak(35);
                
                // Purple/Pink gradient background
                doc.setFillColor(250, 245, 255); // Purple-50
                doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
                doc.setDrawColor(233, 213, 255); // Purple-200
                doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'S');
                
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Your Selection', 20, yPos + 10);
                
                const sa = insightsData.selectionAnalysis;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.setFontSize(9);
                doc.text(sa.summary || '', 20, yPos + 20);
                
                // Stats row
                doc.setFontSize(8);
                let statsX = 20;
                
                // Total cost
                doc.setTextColor(147, 51, 234);
                doc.text(`Total: Rs. ${(sa.totalCost || 0).toFixed(2)}`, statsX, yPos + 30);
                statsX += 45;
                
                // Rating
                doc.text(`Avg Rating: ${sa.averageRating || 'N/A'}`, statsX, yPos + 30);
                statsX += 45;
                
                // Savings
                if (sa.potentialSavings > 0) {
                    doc.setTextColor(5, 150, 105);
                    doc.text(`Savings: Rs. ${sa.potentialSavings.toFixed(2)}`, statsX, yPos + 30);
                }
                
                yPos += 42;
            }

            // Footer info
            doc.setFontSize(7);
            doc.setTextColor(147, 51, 234);
            doc.text(`Generated: ${new Date(insightsData.timestamp).toLocaleString()} | Model v${insightsData.modelVersion}`, 15, yPos);
            yPos += 10;

        } else {
            // No AI insights - show prompt
            checkPageBreak(25);
            doc.setFillColor(254, 243, 199); // Amber-100
            doc.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'F');
            doc.setTextColor(180, 83, 9); // Amber-700
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Tip: Click "AI Insights" button to generate personalized recommendations before exporting.', 20, yPos + 11);
            yPos += 25;
        }

        // ===== FOOTER =====
        const footerY = pageHeight - 15;
        doc.setDrawColor(226, 232, 240);
        doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
        
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('This report is generated by PharmaLink AI-powered comparison engine. Always consult with your healthcare provider.', pageWidth / 2, footerY, { align: 'center' });
        doc.text(`Â© ${new Date().getFullYear()} PharmaLink - Confidential`, pageWidth / 2, footerY + 4, { align: 'center' });

        // Save the PDF
        doc.save(`PharmaLink-Comparison-${selectedMedication.genericName}-${new Date().toISOString().split('T')[0]}.pdf`);

        // Add notification
        setNotifications(prev => [{
            type: 'success',
            title: 'PDF Exported',
            message: `Brand comparison report for ${selectedMedication.genericName} downloaded successfully`,
            time: new Date().toLocaleTimeString()
        }, ...prev]);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Brand Comparison Analysis',
                text: `I found ${selectedBrands.length} brands with Rs. ${totalSavings.toFixed(2)} total savings!`,
                url: window.location.href
            });
        } else {
            alert('Sharing is not supported in your browser. Export the report instead.');
        }
    };

    // AI Insights handler - calls backend API for intelligent brand analysis
    const handleAIInsights = async () => {
        if (!selectedMedication) {
            alert('Please select a medication first to get AI insights.');
            return;
        }

        setShowAIInsights(true);
        setAIInsightsLoading(true);
        setAIInsightsError(null);
        setAIInsights(null);

        try {
            const response = await fetch('/api/ml/brand-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    medication: {
                        id: selectedMedication.id,
                        genericName: selectedMedication.genericName,
                        category: selectedMedication.category,
                        strength: selectedMedication.strength,
                        therapeuticClass: selectedMedication.therapeuticClass
                    },
                    selectedBrands: selectedBrands.map(b => ({
                        id: b.id,
                        name: b.name,
                        manufacturer: b.manufacturer,
                        price: b.price,
                        rating: b.rating,
                        efficacyScore: b.efficacyScore,
                        isGeneric: b.isGeneric,
                        availability: b.availability,
                        savings: b.savings
                    })),
                    allBrands: selectedMedication.brands.map(b => ({
                        id: b.id,
                        name: b.name,
                        manufacturer: b.manufacturer,
                        price: b.price,
                        rating: b.rating,
                        efficacyScore: b.efficacyScore,
                        isGeneric: b.isGeneric,
                        availability: b.availability,
                        savings: b.savings,
                        patientCompliance: b.patientCompliance,
                        subscription: b.subscription,
                        sustainability: b.sustainability
                    }))
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                setAIInsights(data.data);
                // Add notification for successful insight generation
                setNotifications(prev => [{
                    type: 'ai',
                    title: 'ðŸ¤– AI Insights Ready',
                    message: `Generated ${data.data.recommendations?.length || 0} recommendations for ${selectedMedication.genericName}`,
                    time: new Date().toLocaleTimeString()
                }, ...prev]);
            } else {
                throw new Error(data.error || 'Failed to generate insights');
            }
        } catch (error) {
            console.error('AI Insights error:', error);
            setAIInsightsError(error.message || 'Failed to generate AI insights. Please try again.');
        } finally {
            setAIInsightsLoading(false);
        }
    };

    const handleAddPriceAlert = (alert) => {
        setPriceAlerts(prev => [...prev, alert]);
        setNotifications(prev => [{
            type: 'price',
            title: 'Price Alert Created',
            message: `Alert set for ${alert.brandName} at Rs. ${alert.targetPrice}`,
            time: new Date().toLocaleTimeString()
        }, ...prev]);
    };

    const handleRemovePriceAlert = (alertId) => {
        setPriceAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    const handleToggleBatchMed = (med) => {
        setBatchSelectedMeds(prev => {
            const exists = prev.find(m => m.id === med.id);
            if (exists) {
                return prev.filter(m => m.id !== med.id);
            } else {
                return [...prev, med];
            }
        });
    };

    const handleBatchCompare = () => {
        setNotifications(prev => [{
            type: 'info',
            title: 'Batch Comparison Generated',
            message: `Comparing ${batchSelectedMeds.length} medications across ${batchSelectedMeds.reduce((sum, m) => sum + m.brands.length, 0)} brands`,
            time: new Date().toLocaleTimeString()
        }, ...prev]);
        alert(`Batch comparison for ${batchSelectedMeds.length} medications ready!`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSideBySideCompare = () => {
        if (selectedBrands.length >= 2) {
            setSideBySideCompareBrands(selectedBrands.slice(0, 4));
            setShowSideBySide(true);
        } else {
            alert('Please select at least 2 brands to compare side-by-side');
        }
    };

    // Demo function to load sample data for demonstration
    const loadDemoData = async () => {
        // Select Atorvastatin (cholesterol medication) from NMRA database for demo
        let demoMedication = medications.find(m => m.genericName.toLowerCase().includes('atorvastatin'));
        if (!demoMedication) {
            const dynamicMed = await fetchBrandsForGeneric('Atorvastatin');
            if (dynamicMed) {
                demoMedication = dynamicMed;
                setMedications(prev => [...prev, dynamicMed]);
            }
        }
        if (demoMedication) {
            setSelectedMedication(demoMedication);
            setSelectedBrands(demoMedication.brands);
            setSearchTerm(demoMedication.genericName);
            setNotifications([
                {
                    type: 'price',
                    title: 'Price Drop Alert!',
                    message: `${demoMedication.brands[0]?.name || 'Generic'} - Rs. ${demoMedication.brands[0]?.price || '0.00'}`,
                    time: 'Just now'
                },
                {
                    type: 'stock',
                    title: 'Stock Update',
                    message: `${demoMedication.brands.length} brand(s) available in NMRA database`,
                    time: '5 min ago'
                },
                {
                    type: 'info',
                    title: 'Savings Opportunity',
                    message: demoMedication.brands.length > 1
                        ? `Compare ${demoMedication.brands.length} brands to find the best price`
                        : 'Search for more medications to compare',
                    time: '10 min ago'
                }
            ]);
            setPriceAlerts(demoMedication.brands.slice(0, 2).map((b, i) => ({
                id: i + 1,
                brandName: b.name,
                currentPrice: b.price,
                targetPrice: Math.round(b.price * 0.85 * 100) / 100
            })));
            setTimeout(() => {
                document.getElementById('brands-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
            <AnimationStyles />
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/10 via-indigo-500/10 to-purple-400/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/10 via-teal-500/10 to-emerald-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Header */}
            <header className="relative z-10 backdrop-blur-xl bg-white/80 border-b border-white/50 shadow-lg shadow-black/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5" />
                                <span className="font-medium">Dashboard</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <ScaleIcon className="h-5 w-5 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                                    <SparklesSolid className="h-2 w-2 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">Brand Intelligence Platform</h1>
                                <p className="text-xs text-blue-500 font-semibold">AI-powered medication analysis & market insights</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                                <BellIcon className="h-6 w-6" />
                                {notifications.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">{user?.name || 'Healthcare Professional'}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <CpuChipIcon className="h-3 w-3" />
                                    AI Assistant Active
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Actions Bar */}
                <QuickActionsBar
                    selectedBrands={selectedBrands}
                    medications={medications}
                    onExport={handleExport}
                    onShare={handleShare}
                    onAIInsights={handleAIInsights}
                />

                {/* Search Bar with Autocomplete */}
                <div className="mb-8">
                    <div className="relative group">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-hover:text-blue-400 transition-colors z-10" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search drugs or brands (e.g., Atorvastatin, Azithromycin, Paracetamol)..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowAutocomplete(true);
                                setHighlightedIndex(-1);
                            }}
                            onFocus={() => setShowAutocomplete(true)}
                            onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full pl-12 pr-36 py-4 bg-white/80 backdrop-blur-sm border border-slate-300 rounded-2xl shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-blue-600 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200"
                            >
                                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">Smart Filters</span>
                            </button>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setShowAutocomplete(false);
                                }}
                                className="p-2 text-slate-400 hover:text-red-500"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Autocomplete Dropdown */}
                        {showAutocomplete && (autocompleteSuggestions.length > 0 || isSearchingAPI) && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                                <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            ðŸ’Š {autocompleteSuggestions.length} Result{autocompleteSuggestions.length !== 1 ? 's' : ''} Found
                                        </span>
                                        {isSearchingAPI && (
                                            <span className="text-xs text-blue-500 flex items-center gap-1">
                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                Searching...
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ul className="max-h-96 overflow-y-auto">
                                    {autocompleteSuggestions.map((suggestion, index) => {
                                        const isGenericType = suggestion.type === 'api-generic' || suggestion.type === 'medication';
                                        const isBrandType = suggestion.type === 'brand' || suggestion.type === 'api-brand';
                                        const highlightBg = isGenericType ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-emerald-50 border-l-4 border-emerald-500';
                                        const iconBg = isGenericType
                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                            : 'bg-gradient-to-br from-emerald-500 to-teal-600';
                                        const badgeLabel = suggestion.type === 'api-generic'
                                            ? 'Generic Â· View All Brands'
                                            : suggestion.type === 'medication'
                                                ? `${suggestion.medication?.brands?.length || 0} Brands Available`
                                                : 'Brand';
                                        const badgeColor = isGenericType
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-emerald-100 text-emerald-700';

                                        return (
                                            <li
                                                key={suggestion.id}
                                                onClick={() => handleAutocompleteSelect(suggestion)}
                                                className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 ${
                                                    highlightedIndex === index ? highlightBg : 'hover:bg-slate-50 border-l-4 border-transparent'
                                                }`}
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${iconBg}`}>
                                                    {isGenericType ? (
                                                        <ScaleIcon className="h-6 w-6 text-white" />
                                                    ) : (
                                                        <TagIcon className="h-6 w-6 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900">
                                                            {suggestion.name}
                                                        </span>
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${badgeColor}`}>
                                                            {badgeLabel}
                                                        </span>
                                                        {isBrandType && suggestion.genericName && (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                                                                {suggestion.genericName}
                                                            </span>
                                                        )}
                                                        {suggestion.category && (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                                                                {suggestion.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500 truncate mt-0.5">
                                                        {suggestion.subtitle}
                                                    </p>
                                                </div>
                                                <ChevronRightIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 flex items-center gap-2">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">â†‘</kbd>
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">â†“</kbd>
                                        navigate
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs ml-2">Enter</kbd>
                                        select
                                    </span>
                                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                        <SparklesSolid className="h-3 w-3" />
                                        Drug &amp; Brand Search
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Market Insights */}
                <MarketInsights
                    medications={medications}
                    selectedMedication={selectedMedication}
                />

                {/* Price Alert System */}
                <PriceAlertSystem
                    medications={medications}
                    priceAlerts={priceAlerts}
                    onAddAlert={handleAddPriceAlert}
                    onRemoveAlert={handleRemovePriceAlert}
                />

                {/* Batch Comparison Mode */}
                {batchCompareMode && (
                    <BatchComparisonMode
                        medications={medications}
                        batchSelectedMeds={batchSelectedMeds}
                        onToggleMed={handleToggleBatchMed}
                        onCompare={handleBatchCompare}
                    />
                )}

                {/* Feature Toggle Bar */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
                    {/* Demo Button - Primary CTA */}
                    <button
                        onClick={() => setBatchCompareMode(!batchCompareMode)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${batchCompareMode ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <ClipboardDocumentCheckIcon className="h-5 w-5" />
                        Batch Compare
                    </button>
                    <button
                        onClick={() => setShowHistoricalAnalytics(true)}
                        className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                        <ChartBarIcon className="h-5 w-5" />
                        Price Analytics
                    </button>
                    <button
                        onClick={handleSideBySideCompare}
                        disabled={selectedBrands.length < 2}
                        className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowsRightLeftIcon className="h-5 w-5" />
                        Side-by-Side ({selectedBrands.length})
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                    <button
                        onClick={() => setShowDDIPredictor(!showDDIPredictor)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${showDDIPredictor
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'
                            }`}
                    >
                        <BeakerIcon className="h-5 w-5" />
                        DDI Predictor
                    </button>
                </div>

                {/* DDI Predictor Panel */}
                {showDDIPredictor && (
                    <div className="mb-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                    <BeakerIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Cross-Brand DDI Predictor</h3>
                                    <p className="text-sm text-slate-600">Formulation-aware drug interaction prediction</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDDIPredictor(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <CrossBrandPredictor />
                    </div>
                )}

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <AdvancedFilters
                        filterGeneric={filterGeneric}
                        setFilterGeneric={setFilterGeneric}
                        filterRating={filterRating}
                        setFilterRating={setFilterRating}
                        priceRange={priceRange}
                        setPriceRange={setPriceRange}
                        showFavorites={showFavorites}
                        setShowFavorites={setShowFavorites}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        showSustainability={showSustainability}
                        setShowSustainability={setShowSustainability}
                        onClearFilters={() => {
                            setFilterGeneric('all');
                            setFilterRating(0);
                            setPriceRange([0, 50000]);
                            setShowFavorites(false);
                            setShowSustainability(false);
                        }}
                    />
                )}

                {/* Stats Dashboard */}
                {!isLoadingMedications && (
                <StatsDashboard
                    selectedBrands={selectedBrands}
                    totalSavings={totalSavings}
                    averageRating={averageRating}
                    medications={medications}
                    filteredBrands={filteredBrands}
                />
                )}

                {/* Loading NMRA database */}
                {isLoadingMedications && (
                    <div className="flex flex-col items-center justify-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-200 mb-8">
                        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"></div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Loading NMRA Drug Database</h3>
                        <p className="text-slate-500 text-sm">Loading real Sri Lankan medication prices...</p>
                    </div>
                )}

                {/* Medication Selection */}
                {searchTerm && filteredMedications.length > 0 && !selectedMedication && !isFetchingBrands && (
                    <MedicationSelection
                        filteredMedications={filteredMedications}
                        handleMedicationSelect={handleMedicationSelect}
                    />
                )}

                {/* Loading state while fetching brands from API */}
                {isFetchingBrands && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-blue-200 mb-8">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ScaleIcon className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Fetching Available Brands</h3>
                        <p className="text-slate-500 text-sm max-w-md text-center">
                            Querying the cross-brand comparison database for all available brands of this medicine...
                        </p>
                    </div>
                )}

                {/* Brand Comparison Section */}
                {selectedMedication && (
                    <>
                        {/* Smart Alerts */}
                        <SmartAlerts
                            brands={filteredBrands}
                            selectedBrands={selectedBrands}
                        />

                        {/* Medication Header */}
                        <MedicationHeader
                            selectedMedication={selectedMedication}
                            onBack={() => {
                                setSelectedMedication(null);
                                setSelectedBrands([]);
                            }}
                            onSelectAll={() => {
                                const allBrands = selectedMedication.brands;
                                setSelectedBrands(allBrands);
                            }}
                        />

                        {/* Popular Alternatives */}
                        <PopularAlternatives
                            medications={medications}
                            selectedMedication={selectedMedication}
                        />

                        {/* AI Recommendations */}
                        <AIRecommendationEngine
                            brands={filteredBrands}
                            selectedBrands={selectedBrands}
                        />

                        {/* Cost Savings Calculator */}
                        <CostSavingsCalculator
                            selectedBrands={selectedBrands}
                            medication={selectedMedication}
                        />

                        {/* View Mode Toggle */}
                        <div className="flex items-center justify-between mb-6" id="brands-section">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Available Brands</h3>
                                <p className="text-slate-600">{filteredBrands.length} options available</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-3 py-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow' : 'hover:bg-white/50'}`}
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-3 py-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-white/50'}`}
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Brand Cards */}
                        <div className={`${viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'} mb-8`}>
                            {filteredBrands.map((brand) => (
                                viewMode === 'grid' ? (
                                    <BrandCard
                                        key={brand.id}
                                        brand={brand}
                                        onSelect={handleBrandSelect}
                                        onFavoriteToggle={handleFavoriteToggle}
                                        isSelected={selectedBrands.some(b => b.id === brand.id)}
                                        showDetails={showDetails}
                                        setShowDetails={setShowDetails}
                                    />
                                ) : (
                                    <div
                                        key={brand.id}
                                        className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 transition-all"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h4 className="text-lg font-bold text-slate-900">{brand.name}</h4>
                                                    {brand.isGeneric && (
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                            GENERIC
                                                        </span>
                                                    )}
                                                    {brand.favorite && (
                                                        <HeartSolid className="h-4 w-4 text-red-500" />
                                                    )}
                                                </div>
                                                <p className="text-slate-600 mb-4">{brand.description}</p>
                                                <div className="grid grid-cols-4 gap-4 mb-4">
                                                    <div>
                                                        <p className="text-2xl font-black text-slate-900">Rs. {brand.price}</p>
                                                        <p className="text-xs text-slate-500">{brand.packSize}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-slate-900">{brand.rating}/5</p>
                                                        <p className="text-xs text-slate-500">{brand.reviews} reviews</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-emerald-600">{brand.efficacyScore}%</p>
                                                        <p className="text-xs text-slate-500">Efficacy</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-semibold text-blue-600">{brand.patientCompliance}%</p>
                                                        <p className="text-xs text-slate-500">Compliance</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleBrandSelect(brand)}
                                                        className={`px-4 py-2 rounded-lg font-semibold ${selectedBrands.some(b => b.id === brand.id)
                                                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        {selectedBrands.some(b => b.id === brand.id) ? 'Selected' : 'Compare'}
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDetails(brand)}
                                                        className="px-4 py-2 text-slate-600 hover:text-blue-600"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => handleFavoriteToggle(brand.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500"
                                                    >
                                                        {brand.favorite ? (
                                                            <HeartSolid className="h-5 w-5 text-red-500" />
                                                        ) : (
                                                            <HeartIcon className="h-5 w-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <PriceTrendChart priceHistory={brand.priceHistory} currentPrice={brand.price} />
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>

                        {filteredBrands.length === 0 && (
                            <div className="text-center py-12 bg-white/50 rounded-2xl border border-slate-200 mb-8">
                                <ScaleIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-600 mb-2">No Brands Match Your Filters</h3>
                                <p className="text-slate-500">Try adjusting your filter criteria to see more options.</p>
                                <button
                                    onClick={() => {
                                        setFilterGeneric('all');
                                        setFilterRating(0);
                                        setPriceRange([0, 50000]);
                                        setShowFavorites(false);
                                        setShowSustainability(false);
                                    }}
                                    className="mt-4 px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Reset All Filters
                                </button>
                            </div>
                        )}

                        {/* Comparison Table */}
                        {selectedBrands.length > 0 && (
                            <EnhancedComparisonTable selectedBrands={selectedBrands} />
                        )}

                        {/* Selected Brands Summary */}
                        {selectedBrands.length > 0 && (
                            <SelectedBrandsSummary
                                selectedBrands={selectedBrands}
                                totalSavings={totalSavings}
                                handleBrandSelect={handleBrandSelect}
                                setSelectedBrands={setSelectedBrands}
                            />
                        )}
                    </>
                )}

                {/* Empty State */}
                {!selectedMedication && !searchTerm && (
                    <EmptyState />
                )}
            </main>

            {/* Brand Details Modal */}
            {showDetails && (
                <BrandDetailsModal
                    brand={showDetails}
                    onClose={() => setShowDetails(null)}
                />
            )}

            {/* Side-by-Side Comparison Modal */}
            {showSideBySide && (
                <SideBySideComparisonModal
                    brands={sideBySideCompareBrands}
                    onClose={() => setShowSideBySide(false)}
                />
            )}

            {/* Historical Price Analytics Modal */}
            {showHistoricalAnalytics && (
                <HistoricalPriceAnalytics
                    medications={medications}
                    onClose={() => setShowHistoricalAnalytics(false)}
                />
            )}

            {/* Notification Center */}
            {showNotifications && (
                <NotificationCenter
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                    onClearAll={() => setNotifications([])}
                />
            )}

            {/* AI Insights Modal */}
            {showAIInsights && (
                <AIInsightsModal
                    insights={aiInsights}
                    loading={aiInsightsLoading}
                    error={aiInsightsError}
                    onClose={() => {
                        setShowAIInsights(false);
                        setAIInsights(null);
                        setAIInsightsError(null);
                    }}
                />
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => {
                    const element = selectedMedication ? document.getElementById('brands-section') : document.querySelector('input[type="text"]');
                    element?.scrollIntoView({ behavior: 'smooth' });
                    if (!selectedMedication) {
                        document.querySelector('input[type="text"]')?.focus();
                    }
                }}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50"
            >
                {selectedMedication ? (
                    <EyeIcon className="h-6 w-6 text-white" />
                ) : (
                    <MagnifyingGlassIcon className="h-6 w-6 text-white" />
                )}
            </button>
        </div>
    );
};

export default CrossBrandComparator;
