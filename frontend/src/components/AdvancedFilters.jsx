import React from 'react';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

const AdvancedFilters = ({
    filterGeneric,
    setFilterGeneric,
    filterAvailability,
    setFilterAvailability,
    filterRating,
    setFilterRating,
    priceRange,
    setPriceRange,
    showFavorites,
    setShowFavorites,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    showSustainability,
    setShowSustainability,
    onClearFilters
}) => (
    <div className="mb-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg p-6 animate-slideInUp">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Brand Type</label>
                <select
                    value={filterGeneric}
                    onChange={e => setFilterGeneric(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Brands</option>
                    <option value="brand">Brand Name Only</option>
                    <option value="generic">Generic Only</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Availability</label>
                <select
                    value={filterAvailability}
                    onChange={e => setFilterAvailability(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All</option>
                    <option value="in-stock">In Stock Only</option>
                    <option value="limited">Limited Stock</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Rating: {filterRating}+
                </label>
                <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={filterRating}
                    onChange={e => setFilterRating(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0</span>
                    <span>5</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={priceRange[0]}
                        onChange={e => setPriceRange([parseFloat(e.target.value), priceRange[1]])}
                        className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="Min"
                    />
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={priceRange[1]}
                        onChange={e => setPriceRange([priceRange[0], parseFloat(e.target.value)])}
                        className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="Max"
                    />
                </div>
            </div>
        </div>
        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
                <button
                    onClick={() => setShowFavorites(!showFavorites)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showFavorites ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                >
                    <span role="img" aria-label="heart">❤️</span>
                    {showFavorites ? 'Showing Favorites' : 'Show Favorites'}
                </button>
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="price">Price (Low to High)</option>
                    <option value="rating">Rating (High to Low)</option>
                    <option value="savings">Savings (High to Low)</option>
                    <option value="efficacy">Efficacy (High to Low)</option>
                    <option value="compliance">Compliance (High to Low)</option>
                    <option value="popularity">Popularity (High to Low)</option>
                </select>
                <button
                    onClick={() => setShowSustainability(!showSustainability)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${showSustainability ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}
                >
                    <span role="img" aria-label="eco">🌱</span>
                    {showSustainability ? 'Eco-Friendly Only' : 'Show Eco-Friendly'}
                </button>
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
            <button
                onClick={onClearFilters}
                className="px-4 py-2 text-slate-600 hover:text-blue-600"
            >
                Clear All Filters
            </button>
        </div>
    </div>
);

export default AdvancedFilters;
