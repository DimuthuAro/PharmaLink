// PriceTrendChart.jsx - Price Trend Visualization
import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

const PriceTrendChart = ({ priceHistory, currentPrice, compact = false }) => {
    if (!priceHistory || priceHistory.length === 0) {
        return (
            <div className="text-xs text-slate-400 italic">No price history</div>
        );
    }

    const maxPrice = Math.max(...priceHistory);
    const minPrice = Math.min(...priceHistory);
    const range = maxPrice - minPrice || 1;
    const trend = priceHistory[priceHistory.length - 1] - priceHistory[0];
    const percentChange = ((trend / priceHistory[0]) * 100).toFixed(1);

    const getTrendColor = () => {
        if (trend > 0.5) return { bg: 'bg-red-100', text: 'text-red-600', icon: ArrowTrendingUpIcon };
        if (trend < -0.5) return { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: ArrowTrendingDownIcon };
        return { bg: 'bg-slate-100', text: 'text-slate-600', icon: MinusIcon };
    };

    const trendStyle = getTrendColor();
    const TrendIcon = trendStyle.icon;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-end h-8 gap-0.5">
                    {priceHistory.slice(-5).map((price, index) => {
                        const height = ((price - minPrice) / range) * 100 || 50;
                        const isCurrent = index === priceHistory.slice(-5).length - 1;
                        return (
                            <div
                                key={index}
                                className={`w-1.5 rounded-t transition-all ${isCurrent
                                    ? trend > 0 ? 'bg-red-400' : trend < 0 ? 'bg-emerald-400' : 'bg-blue-400'
                                    : 'bg-slate-200'
                                    }`}
                                style={{ height: `${Math.max(height, 10)}%` }}
                            />
                        );
                    })}
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${trendStyle.bg} ${trendStyle.text}`}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(percentChange)}%
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-slate-50 rounded-xl">
            {/* Sample Button */}
            <button
                className="mb-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded shadow transition-colors duration-200"
                onClick={() => alert('Sample button clicked!')}
            >
                Sample Button
            </button>
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Price Trend</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${trendStyle.bg} ${trendStyle.text}`}>
                    <TrendIcon className="h-3 w-3" />
                    {trend > 0 ? '+' : ''}{percentChange}%
                </div>
            </div>

            {/* Chart */}
            <div className="relative h-20 flex items-end gap-1">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-400 pr-2">
                    <span>Rs. {maxPrice.toFixed(0)}</span>
                    <span>Rs. {minPrice.toFixed(0)}</span>
                </div>

                {/* Bars */}
                <div className="flex items-end gap-1 flex-1 ml-8">
                    {priceHistory.map((price, index) => {
                        const height = ((price - minPrice) / range) * 100 || 50;
                        const isCurrent = index === priceHistory.length - 1;
                        const isPrevious = index === priceHistory.length - 2;

                        return (
                            <div
                                key={index}
                                className="group relative flex-1 flex flex-col items-center"
                            >
                                <div
                                    className={`w-full rounded-t transition-all duration-300 ${isCurrent
                                        ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-lg'
                                        : isPrevious
                                            ? 'bg-blue-300'
                                            : 'bg-slate-200 group-hover:bg-slate-300'
                                        }`}
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                />

                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                    <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                        Rs. {price.toFixed(2)}
                                        {isCurrent && <span className="ml-1 text-blue-300">(Current)</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 ml-8 text-xs text-slate-400">
                <span>Oldest</span>
                <span>Current</span>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xs text-slate-500">Low</p>
                    <p className="text-sm font-bold text-emerald-600">Rs. {minPrice.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500">Current</p>
                    <p className="text-sm font-bold text-blue-600">Rs. {currentPrice?.toFixed(2) || priceHistory[priceHistory.length - 1].toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500">High</p>
                    <p className="text-sm font-bold text-red-600">Rs. {maxPrice.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
};

export default PriceTrendChart;
