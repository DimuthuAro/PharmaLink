// BrandCard.jsx - Enhanced Brand Card Component
import React, { useState } from 'react';
import { StarIcon as StarSolid, HeartIcon as HeartSolid, SparklesIcon as SparklesSolid } from '@heroicons/react/24/solid';
import {
    ClockIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    InformationCircleIcon,
    EyeIcon,
    EyeSlashIcon,
    HeartIcon,
    TagIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const BrandCard = ({ brand, onSelect, onFavoriteToggle, isSelected, setShowDetails }) => {
    const [showSideEffects, setShowSideEffects] = useState(false);

    const getEfficacyColor = (score) => {
        if (score >= 90) return 'from-emerald-500 to-teal-600';
        if (score >= 80) return 'from-blue-500 to-indigo-600';
        return 'from-amber-500 to-orange-600';
    };

    const getPriceChange = () => {
        if (!brand.priceHistory || brand.priceHistory.length < 2) return null;
        const current = brand.price;
        const previous = brand.priceHistory[brand.priceHistory.length - 2];
        const change = ((current - previous) / previous * 100).toFixed(1);
        return { value: change, isUp: current > previous };
    };

    const priceChange = getPriceChange();

    return (
        <div
            className={`relative group bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isSelected
                    ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-xl'
                }`}
        >
            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            )}

            {/* Badges Row */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                {brand.isGeneric && (
                    <span className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-full shadow-lg">
                        GENERIC
                    </span>
                )}
                {brand.savings > 0 && (
                    <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold rounded-full shadow-lg">
                        Save Rs. {brand.savings.toFixed(2)}
                    </span>
                )}
                {brand.sustainability?.ecoFriendly && (
                    <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
                        🌱 Eco
                    </span>
                )}
            </div>

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-20">
                        <h4 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{brand.name}</h4>
                        <p className="text-sm text-slate-500">{brand.manufacturer}</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onFavoriteToggle(brand.id); }}
                        className="absolute top-14 right-3 p-2 rounded-xl bg-slate-100 hover:bg-red-100 transition-colors"
                    >
                        {brand.favorite ? (
                            <HeartSolid className="h-5 w-5 text-red-500" />
                        ) : (
                            <HeartIcon className="h-5 w-5 text-slate-400 hover:text-red-500" />
                        )}
                    </button>
                </div>

                {/* Price Section */}
                <div className="flex items-end gap-3 mb-4">
                    <div className="text-3xl font-black text-slate-900">Rs. {brand.price}</div>
                    <div className="text-sm text-slate-500 mb-1">{brand.packSize}</div>
                    {priceChange && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${priceChange.isUp ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {priceChange.isUp ? (
                                <ArrowTrendingUpIcon className="h-3 w-3" />
                            ) : (
                                <ArrowTrendingDownIcon className="h-3 w-3" />
                            )}
                            {Math.abs(priceChange.value)}%
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <StarSolid className="h-4 w-4 text-amber-400" />
                            <span className="font-bold text-slate-900">{brand.rating}</span>
                        </div>
                        <p className="text-xs text-slate-500">{brand.reviews} reviews</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                        <div className={`text-sm font-bold bg-gradient-to-r ${getEfficacyColor(brand.efficacyScore)} bg-clip-text text-transparent`}>
                            {brand.efficacyScore}%
                        </div>
                        <p className="text-xs text-slate-500">Efficacy</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                        <div className="text-sm font-bold text-blue-600">{brand.patientCompliance}%</div>
                        <p className="text-xs text-slate-500">Compliance</p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{brand.description}</p>

                {/* Tags */}
                {brand.tags && brand.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {brand.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Side Effects Toggle */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowSideEffects(!showSideEffects); }}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
                >
                    {showSideEffects ? (
                        <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                        <EyeIcon className="h-4 w-4" />
                    )}
                    {showSideEffects ? 'Hide' : 'Show'} Side Effects
                </button>

                {showSideEffects && brand.sideEffects && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-800">Side Effects</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {brand.sideEffects.map((effect, idx) => (
                                <span key={idx} className="px-2 py-1 bg-white text-amber-700 text-xs rounded-full">
                                    {effect}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect(brand); }}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${isSelected
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-500 hover:text-white'
                            }`}
                    >
                        {isSelected ? (
                            <span className="flex items-center justify-center gap-2">
                                <CheckCircleIcon className="h-5 w-5" />
                                Selected
                            </span>
                        ) : (
                            'Compare'
                        )}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDetails(brand); }}
                        className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        <InformationCircleIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Subscription Badge */}
                {brand.subscription?.available && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SparklesSolid className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-semibold text-purple-700">Subscribe & Save</span>
                            </div>
                            <span className="text-sm font-bold text-purple-600">-{brand.subscription.discount}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrandCard;
