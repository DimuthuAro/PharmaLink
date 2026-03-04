import React from 'react';
import { ScaleIcon, CurrencyDollarIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const StatsDashboard = ({ selectedBrands, totalSavings, averageRating, medications }) => (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-600">Selected Brands</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedBrands.length}</p>
                </div>
                <ScaleIcon className="h-8 w-8 text-blue-500" />
            </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-600">Total Savings</p>
                    <p className="text-2xl font-bold text-emerald-600">Rs. {totalSavings.toFixed(2)}</p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-emerald-500" />
            </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-600">Average Rating</p>
                    <p className="text-2xl font-bold text-amber-600">{averageRating}/5</p>
                </div>
                <StarSolid className="h-8 w-8 text-amber-500" />
            </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-600">Medications</p>
                    <p className="text-2xl font-bold text-purple-600">{medications.length}</p>
                </div>
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-purple-500" />
            </div>
        </div>
    </div>
);

export default StatsDashboard;
