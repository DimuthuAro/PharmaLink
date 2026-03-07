// BrandDetailsModal.jsx - Enhanced Brand Details Modal
import React from 'react';
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import {
    XMarkIcon,
    ShieldCheckIcon,
    BeakerIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    TagIcon,
    BuildingStorefrontIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    UserGroupIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const BrandDetailsModal = ({ brand, onClose }) => {
    if (!brand) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slideInUp">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6 text-white" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <BeakerIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-black">{brand.name}</h2>
                                {brand.isGeneric && (
                                    <span className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
                                        GENERIC
                                    </span>
                                )}
                                {brand.favorite && (
                                    <HeartSolid className="h-5 w-5 text-red-300" />
                                )}
                            </div>
                            <p className="text-blue-100 flex items-center gap-2">
                                <BuildingStorefrontIcon className="h-4 w-4" />
                                {brand.manufacturer}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="text-center">
                            <p className="text-3xl font-black">Rs. {brand.price}</p>
                            <p className="text-xs text-blue-100">{brand.packSize}</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                <StarSolid className="h-5 w-5 text-amber-300" />
                                <p className="text-2xl font-black">{brand.rating}</p>
                            </div>
                            <p className="text-xs text-blue-100">{brand.reviews} reviews</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black">{brand.efficacyScore}%</p>
                            <p className="text-xs text-blue-100">Efficacy</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black">{brand.patientCompliance}%</p>
                            <p className="text-xs text-blue-100">Compliance</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {/* Description */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
                        <p className="text-slate-700">{brand.description}</p>
                    </div>

                    {/* Savings */}
                    {brand.savings > 0 && (
                        <div className="mb-6">
                            <div className="p-4 rounded-xl bg-emerald-50 max-w-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
                                    <span className="font-semibold text-emerald-700">Potential Savings</span>
                                </div>
                                <p className="text-2xl font-black text-emerald-600">Rs. {brand.savings.toFixed(2)}</p>
                                <p className="text-sm text-emerald-600">compared to brand name</p>
                            </div>
                        </div>
                    )}

                    {/* Side Effects */}
                    {brand.sideEffects && brand.sideEffects.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                                Side Effects
                            </h3>
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex flex-wrap gap-2">
                                    {brand.sideEffects.map((effect, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-white text-amber-700 text-sm font-medium rounded-full border border-amber-200">
                                            {effect}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Warnings */}
                    {brand.warnings && brand.warnings.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ShieldCheckIcon className="h-4 w-4 text-red-500" />
                                Warnings
                            </h3>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                <ul className="space-y-2">
                                    {brand.warnings.map((warning, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2"></span>
                                            {warning}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Drug Interactions */}
                    {brand.interactions && brand.interactions.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <InformationCircleIcon className="h-4 w-4 text-blue-500" />
                                Drug Interactions
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {brand.interactions.map((interaction, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200">
                                        {interaction}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dosage & Storage */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <DocumentTextIcon className="h-4 w-4 text-slate-500" />
                                Dosage
                            </h4>
                            <p className="text-sm text-slate-600">{brand.dosage}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <ClockIcon className="h-4 w-4 text-slate-500" />
                                Storage
                            </h4>
                            <p className="text-sm text-slate-600">{brand.storage}</p>
                        </div>
                    </div>

                    {/* Tags */}
                    {brand.tags && brand.tags.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <TagIcon className="h-4 w-4 text-purple-500" />
                                Tags
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {brand.tags.map((tag, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sustainability */}
                    {brand.sustainability && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                🌱 Sustainability
                            </h3>
                            <div className="flex gap-3">
                                {brand.sustainability.ecoFriendly && (
                                    <span className="px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-xl">
                                        ✓ Eco-Friendly
                                    </span>
                                )}
                                {brand.sustainability.recyclable && (
                                    <span className="px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-xl">
                                        ♻️ Recyclable
                                    </span>
                                )}
                                {brand.sustainability.carbonNeutral && (
                                    <span className="px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-xl">
                                        🌍 Carbon Neutral
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subscription */}
                    {brand.subscription?.available && (
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <SparklesIcon className="h-6 w-6 text-purple-500" />
                                    <div>
                                        <h4 className="font-bold text-purple-900">Subscribe & Save</h4>
                                        <p className="text-sm text-purple-600">{brand.subscription.frequency} delivery</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-purple-600">-{brand.subscription.discount}%</p>
                                    <p className="text-sm text-purple-500">discount</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Last updated: {brand.lastUpdated || 'N/A'}
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => alert('Added to comparison!')}
                                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                            >
                                Add to Comparison
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandDetailsModal;
