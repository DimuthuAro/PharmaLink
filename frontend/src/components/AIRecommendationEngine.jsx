// AIRecommendationEngine.jsx - AI-Powered Recommendation Engine
import React, { useMemo } from 'react';
import { SparklesIcon as SparklesSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import {
    SparklesIcon,
    CurrencyDollarIcon,
    ShieldCheckIcon,
    HeartIcon,
    TrophyIcon,
    ChartBarIcon,
    LightBulbIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

const AIRecommendationEngine = ({ brands, selectedBrands }) => {
    const recommendations = useMemo(() => {
        if (!brands || brands.length === 0) return [];

        const recs = [];

        // Best Value: highest rating/price ratio
        const bestValue = brands.reduce((best, current) => {
            const score = (current.rating * current.efficacyScore) / current.price;
            const bestScore = (best.rating * best.efficacyScore) / best.price;
            return score > bestScore ? current : best;
        }, brands[0]);
        recs.push({
            type: 'value',
            label: 'Best Value',
            description: 'Optimal balance of price, rating, and efficacy',
            brand: bestValue,
            icon: CurrencyDollarIcon,
            gradient: 'from-emerald-500 to-teal-600',
            bgGradient: 'from-emerald-50 to-teal-50',
            borderColor: 'border-emerald-200'
        });

        // Most Effective: highest efficacy score
        const mostEffective = brands.reduce((best, current) =>
            (current.efficacyScore || 0) > (best.efficacyScore || 0) ? current : best, brands[0]);
        if (mostEffective.id !== bestValue.id) {
            recs.push({
                type: 'efficacy',
                label: 'Most Effective',
                description: 'Highest clinical efficacy score',
                brand: mostEffective,
                icon: ShieldCheckIcon,
                gradient: 'from-blue-500 to-indigo-600',
                bgGradient: 'from-blue-50 to-indigo-50',
                borderColor: 'border-blue-200'
            });
        }

        // Best Compliance: highest patient compliance
        const bestCompliance = brands.reduce((best, current) =>
            (current.patientCompliance || 0) > (best.patientCompliance || 0) ? current : best, brands[0]);
        if (bestCompliance.id !== bestValue.id && bestCompliance.id !== mostEffective.id) {
            recs.push({
                type: 'compliance',
                label: 'Best Compliance',
                description: 'Highest patient adherence rate',
                brand: bestCompliance,
                icon: HeartIcon,
                gradient: 'from-pink-500 to-rose-600',
                bgGradient: 'from-pink-50 to-rose-50',
                borderColor: 'border-pink-200'
            });
        }

        // Budget Pick: lowest price with decent rating
        const budgetPick = brands
            .filter(b => b.rating >= 4.0)
            .reduce((best, current) =>
                current.price < best.price ? current : best, brands.filter(b => b.rating >= 4.0)[0] || brands[0]);
        if (budgetPick.id !== bestValue.id && budgetPick.price < bestValue.price) {
            recs.push({
                type: 'budget',
                label: 'Budget Pick',
                description: 'Lowest price with quality assurance',
                brand: budgetPick,
                icon: TrophyIcon,
                gradient: 'from-amber-500 to-orange-600',
                bgGradient: 'from-amber-50 to-orange-50',
                borderColor: 'border-amber-200'
            });
        }

        // Top Rated: highest rating
        const topRated = brands.reduce((best, current) =>
            current.rating > best.rating ? current : best, brands[0]);
        if (topRated.id !== bestValue.id && topRated.id !== mostEffective.id) {
            recs.push({
                type: 'rated',
                label: 'Top Rated',
                description: 'Highest customer satisfaction',
                brand: topRated,
                icon: StarSolid,
                gradient: 'from-purple-500 to-violet-600',
                bgGradient: 'from-purple-50 to-violet-50',
                borderColor: 'border-purple-200'
            });
        }

        return recs.slice(0, 4); // Max 4 recommendations
    }, [brands]);

    if (brands.length === 0) return null;

    return (
        <div className="mb-8 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl blur opacity-50"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                            <SparklesSolid className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-white">AI Recommendation Engine</h3>
                            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full">
                                BETA
                            </span>
                        </div>
                        <p className="text-blue-200 text-sm">
                            Personalized suggestions based on {brands.length} brands analyzed
                        </p>
                    </div>
                </div>
            </div>

            {/* Recommendations Grid */}
            <div className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendations.map((rec, idx) => (
                        <div
                            key={idx}
                            className={`relative group bg-gradient-to-br ${rec.bgGradient} border ${rec.borderColor} rounded-2xl p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                        >
                            {/* Badge */}
                            <div className={`absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br ${rec.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                                <rec.icon className="h-4 w-4 text-white" />
                            </div>

                            {/* Label */}
                            <span className={`inline-block px-3 py-1 bg-gradient-to-r ${rec.gradient} text-white text-xs font-bold rounded-full mb-3`}>
                                {rec.label}
                            </span>

                            {/* Brand Info */}
                            <h4 className="text-lg font-bold text-slate-900 mb-1">{rec.brand.name}</h4>
                            <p className="text-sm text-slate-600 mb-3">{rec.brand.manufacturer}</p>

                            {/* Description */}
                            <p className="text-xs text-slate-500 mb-4">{rec.description}</p>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 bg-white/50 rounded-lg">
                                    <p className="text-lg font-bold text-slate-900">Rs. {rec.brand.price}</p>
                                    <p className="text-xs text-slate-500">Price</p>
                                </div>
                                <div className="text-center p-2 bg-white/50 rounded-lg">
                                    <div className="flex items-center justify-center gap-1">
                                        <StarSolid className="h-4 w-4 text-amber-400" />
                                        <p className="text-lg font-bold text-slate-900">{rec.brand.rating}</p>
                                    </div>
                                    <p className="text-xs text-slate-500">Rating</p>
                                </div>
                            </div>

                            {/* Efficacy Bar */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-600">Efficacy</span>
                                    <span className="font-bold text-slate-900">{rec.brand.efficacyScore}%</span>
                                </div>
                                <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${rec.gradient} rounded-full transition-all duration-500`}
                                        style={{ width: `${rec.brand.efficacyScore}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Selected Indicator */}
                            {selectedBrands.some(b => b.id === rec.brand.id) && (
                                <div className="absolute bottom-3 right-3">
                                    <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Insights */}
            <div className="px-6 pb-6">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <div className="flex items-start gap-3">
                        <LightBulbIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-white mb-1">AI Insight</h4>
                            <p className="text-sm text-blue-200">
                                {brands.filter(b => b.isGeneric).length > 0 ? (
                                    <>
                                        We found <span className="font-bold text-emerald-400">{brands.filter(b => b.isGeneric).length} generic options</span> that could save you up to <span className="font-bold text-emerald-400">Rs. {Math.max(...brands.filter(b => b.isGeneric).map(b => b.savings)).toFixed(2)}</span> while maintaining similar efficacy.
                                    </>
                                ) : (
                                    <>
                                        All available brands are name-brand medications. Consider asking your pharmacist about generic alternatives.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIRecommendationEngine;
