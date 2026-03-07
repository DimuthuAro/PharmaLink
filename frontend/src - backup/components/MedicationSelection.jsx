import React from 'react';
import { ArrowRightIcon } from './icons';

const MedicationSelection = ({ filteredMedications, handleMedicationSelect }) => (
    <div className="mb-8 animate-fadeIn">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Select Medication</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMedications.map((med) => (
                <button
                    key={med.id}
                    onClick={() => handleMedicationSelect(med)}
                    className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-xl transition-all text-left group hover:-translate-y-1"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg mb-1">{med.genericName}</h4>
                            <p className="text-sm text-slate-600">{med.strength} • {med.form}</p>
                            <p className="text-xs text-slate-500 mt-2">{med.therapeuticClass}</p>
                        </div>
                        <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                            {med.category}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            <span className="font-semibold">{med.brands.length}</span> brands available
                        </div>
                        <div className="text-blue-600 group-hover:text-blue-700 transition-colors">
                            <ArrowRightIcon className="h-5 w-5" />
                        </div>
                    </div>
                </button>
            ))}
        </div>
    </div>
);

export default MedicationSelection;
