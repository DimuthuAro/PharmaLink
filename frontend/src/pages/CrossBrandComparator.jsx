import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';
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
// ENHANCED SAMPLE DATA WITH MORE FEATURES
// ========================================
const sampleMedications = [
    {
        id: 1,
        genericName: "Ibuprofen",
        strength: "400mg",
        category: "NSAID",
        form: "Tablet",
        therapeuticClass: "Analgesic",
        popularity: 95,
        prescriptionRate: 45,
        brands: [
            {
                id: 1,
                name: "Advil",
                manufacturer: "Pfizer",
                price: 12.99,
                priceHistory: [13.50, 13.20, 12.99, 12.75, 12.99],
                packSize: "50 tablets",
                availability: "In Stock",
                stockLevel: 1250,
                rating: 4.5,
                reviews: 1250,
                savings: 0,
                isGeneric: false,
                description: "Fast-acting pain relief with proven efficacy",
                sideEffects: ["Nausea", "Heartburn", "Dizziness"],
                efficacyScore: 92,
                patientCompliance: 88,
                storage: "Room temperature",
                requiresPrescription: false,
                lastUpdated: "2024-01-15",
                favorite: true,
                popularity: 85,
                interactions: ["Aspirin", "Warfarin"],
                dosage: "1 tablet every 4-6 hours",
                warnings: ["Take with food", "Avoid alcohol"],
                tags: ["Fast-acting", "Trusted", "OTC"],
                discount: 0,
                subscription: {
                    available: true,
                    discount: 15,
                    frequency: "Monthly"
                },
                sustainability: {
                    ecoFriendly: true,
                    recyclable: true,
                    carbonNeutral: false
                }
            },
            {
                id: 2,
                name: "Motrin",
                manufacturer: "Johnson & Johnson",
                price: 11.49,
                priceHistory: [12.00, 11.80, 11.49, 11.30, 11.49],
                packSize: "50 tablets",
                availability: "Limited Stock",
                stockLevel: 45,
                rating: 4.3,
                reviews: 890,
                savings: 1.50,
                isGeneric: false,
                description: "Effective for fever reduction and inflammation",
                sideEffects: ["Upset stomach", "Headache"],
                efficacyScore: 89,
                patientCompliance: 85,
                storage: "Room temperature",
                requiresPrescription: false,
                lastUpdated: "2024-01-14",
                favorite: false,
                popularity: 72,
                interactions: ["Lithium", "Methotrexate"],
                dosage: "1-2 tablets every 4-6 hours",
                warnings: ["Do not exceed 6 tablets daily"],
                tags: ["Fever reducer", "Inflammation"],
                discount: 5,
                subscription: {
                    available: false,
                    discount: 0,
                    frequency: null
                },
                sustainability: {
                    ecoFriendly: false,
                    recyclable: true,
                    carbonNeutral: false
                }
            },
            {
                id: 3,
                name: "Ibuprofen (Generic)",
                manufacturer: "Various",
                price: 8.99,
                priceHistory: [9.50, 9.20, 8.99, 8.75, 8.99],
                packSize: "100 tablets",
                availability: "In Stock",
                stockLevel: 2300,
                rating: 4.1,
                reviews: 567,
                savings: 4.00,
                isGeneric: true,
                description: "Cost-effective alternative with same active ingredient",
                sideEffects: ["Mild stomach discomfort"],
                efficacyScore: 87,
                patientCompliance: 92,
                storage: "Room temperature",
                requiresPrescription: false,
                lastUpdated: "2024-01-13",
                favorite: true,
                popularity: 68,
                interactions: ["ACE inhibitors"],
                dosage: "As directed by physician",
                warnings: ["Consult doctor for long-term use"],
                tags: ["Budget-friendly", "Generic"],
                discount: 10,
                subscription: {
                    available: true,
                    discount: 20,
                    frequency: "Bi-monthly"
                },
                sustainability: {
                    ecoFriendly: true,
                    recyclable: true,
                    carbonNeutral: true
                }
            },
            {
                id: 31,
                name: "Nurofen",
                manufacturer: "Reckitt Benckiser",
                price: 14.99,
                priceHistory: [15.50, 15.20, 14.99, 14.75, 14.99],
                packSize: "40 tablets",
                availability: "In Stock",
                stockLevel: 780,
                rating: 4.6,
                reviews: 2340,
                savings: 0,
                isGeneric: false,
                description: "Targeted pain relief with rapid absorption",
                sideEffects: ["Mild indigestion"],
                efficacyScore: 94,
                patientCompliance: 90,
                storage: "Room temperature",
                requiresPrescription: false,
                lastUpdated: "2024-01-12",
                favorite: false,
                popularity: 88,
                interactions: ["SSRIs"],
                dosage: "1 tablet every 4-6 hours",
                warnings: ["Not for children under 12"],
                tags: ["Targeted relief", "Fast absorption"],
                discount: 0,
                subscription: {
                    available: true,
                    discount: 10,
                    frequency: "Monthly"
                },
                sustainability: {
                    ecoFriendly: true,
                    recyclable: true,
                    carbonNeutral: false
                }
            }
        ]
    },
    {
        id: 2,
        genericName: "Amoxicillin",
        strength: "500mg",
        category: "Antibiotic",
        form: "Capsule",
        therapeuticClass: "Penicillin",
        popularity: 82,
        prescriptionRate: 68,
        brands: [
            {
                id: 4,
                name: "Amoxil",
                manufacturer: "GlaxoSmithKline",
                price: 24.99,
                priceHistory: [26.00, 25.50, 24.99, 24.75, 24.99],
                packSize: "20 capsules",
                availability: "Limited Stock",
                stockLevel: 32,
                rating: 4.7,
                reviews: 756,
                savings: 0,
                isGeneric: false,
                description: "Broad-spectrum antibiotic for bacterial infections",
                sideEffects: ["Diarrhea", "Nausea", "Rash"],
                efficacyScore: 95,
                patientCompliance: 82,
                storage: "Refrigerate after reconstitution",
                requiresPrescription: true,
                lastUpdated: "2024-01-12",
                favorite: false,
                popularity: 79,
                interactions: ["Probenecid", "Oral contraceptives"],
                dosage: "500mg every 8 hours",
                warnings: ["Complete full course"],
                tags: ["Broad-spectrum", "Rx only"],
                discount: 0,
                subscription: {
                    available: false,
                    discount: 0,
                    frequency: null
                },
                sustainability: {
                    ecoFriendly: false,
                    recyclable: true,
                    carbonNeutral: false
                }
            },
            {
                id: 5,
                name: "Amoxicillin (Generic)",
                manufacturer: "Various",
                price: 15.49,
                priceHistory: [17.00, 16.50, 15.49, 15.25, 15.49],
                packSize: "30 capsules",
                availability: "In Stock",
                stockLevel: 1560,
                rating: 4.2,
                reviews: 432,
                savings: 9.50,
                isGeneric: true,
                description: "Generic equivalent with significant cost savings",
                sideEffects: ["Mild gastrointestinal issues"],
                efficacyScore: 91,
                patientCompliance: 90,
                storage: "Refrigerate after reconstitution",
                requiresPrescription: true,
                lastUpdated: "2024-01-11",
                favorite: true,
                popularity: 75,
                interactions: ["Allopurinol"],
                dosage: "As prescribed",
                warnings: ["Report allergic reactions"],
                tags: ["Cost-effective", "Generic"],
                discount: 15,
                subscription: {
                    available: true,
                    discount: 25,
                    frequency: "Monthly"
                },
                sustainability: {
                    ecoFriendly: true,
                    recyclable: true,
                    carbonNeutral: true
                }
            }
        ]
    },
    {
        id: 3,
        genericName: "Atorvastatin",
        strength: "20mg",
        category: "Statin",
        form: "Tablet",
        therapeuticClass: "Lipid-lowering",
        popularity: 90,
        prescriptionRate: 92,
        brands: [
            {
                id: 6,
                name: "Lipitor",
                manufacturer: "Pfizer",
                price: 45.99,
                priceHistory: [48.00, 47.00, 45.99, 45.50, 45.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 890,
                rating: 4.8,
                reviews: 2100,
                savings: 0,
                isGeneric: false,
                description: "Gold standard for cholesterol management",
                sideEffects: ["Muscle pain", "Liver enzyme changes"],
                efficacyScore: 96,
                patientCompliance: 85,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-10",
                favorite: true,
                popularity: 95,
                interactions: ["Grapefruit juice", "Cyclosporine"],
                dosage: "20mg daily",
                warnings: ["Monitor liver function"],
                tags: ["Gold standard", "High efficacy"],
                discount: 0,
                subscription: {
                    available: true,
                    discount: 10,
                    frequency: "Monthly"
                },
                sustainability: {
                    ecoFriendly: false,
                    recyclable: true,
                    carbonNeutral: false
                }
            },
            {
                id: 7,
                name: "Atorvastatin (Generic)",
                manufacturer: "Various",
                price: 18.99,
                priceHistory: [20.00, 19.50, 18.99, 18.75, 18.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 3400,
                rating: 4.4,
                reviews: 1543,
                savings: 27.00,
                isGeneric: true,
                description: "Highly effective generic alternative",
                sideEffects: ["Mild muscle discomfort"],
                efficacyScore: 94,
                patientCompliance: 91,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-09",
                favorite: false,
                popularity: 88,
                interactions: ["Erythromycin"],
                dosage: "As prescribed",
                warnings: ["Report unexplained muscle pain"],
                tags: ["Generic", "High savings"],
                discount: 20,
                subscription: {
                    available: true,
                    discount: 30,
                    frequency: "Quarterly"
                },
                sustainability: {
                    ecoFriendly: true,
                    recyclable: true,
                    carbonNeutral: true
                }
            }
        ]
    },
    {
        id: 4,
        genericName: "Metformin",
        strength: "500mg",
        category: "Antidiabetic",
        form: "Tablet",
        therapeuticClass: "Biguanide",
        popularity: 88,
        prescriptionRate: 78,
        brands: [
            {
                id: 8,
                name: "Glucophage",
                manufacturer: "Merck",
                price: 32.50,
                priceHistory: [34.00, 33.50, 32.50, 32.25, 32.50],
                packSize: "60 tablets",
                availability: "In Stock",
                stockLevel: 1250,
                rating: 4.6,
                reviews: 1890,
                savings: 0,
                isGeneric: false,
                description: "First-line therapy for type 2 diabetes",
                sideEffects: ["GI upset", "Metallic taste"],
                efficacyScore: 93,
                patientCompliance: 86,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-08",
                favorite: true,
                popularity: 82,
                interactions: ["Contrast dyes"],
                dosage: "500mg twice daily",
                warnings: ["Risk of lactic acidosis"],
                tags: ["First-line", "Diabetes"],
                discount: 0,
                subscription: {
                    available: true,
                    discount: 15,
                    frequency: "Monthly"
                },
                sustainability: {
                    ecoFriendly: true,
                    recyclable: true,
                    carbonNeutral: false
                }
            },
            {
                id: 9,
                name: "Metformin (Generic)",
                manufacturer: "Various",
                price: 14.75,
                priceHistory: [16.00, 15.50, 14.75, 14.50, 14.75],
                packSize: "90 tablets",
                availability: "In Stock",
                stockLevel: 4200,
                rating: 4.3,
                reviews: 2340,
                savings: 17.75,
                isGeneric: true,
                description: "Cost-effective diabetes management",
                sideEffects: ["Mild diarrhea"],
                efficacyScore: 92,
                patientCompliance: 93,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-07",
                favorite: false,
                popularity: 85,
                interactions: ["Cimetidine"],
                dosage: "As prescribed",
                warnings: ["Monitor kidney function"],
                tags: ["Cost-effective", "Generic"],
                discount: 25,
                subscription: {
                    available: true,
                    discount: 35,
                    frequency: "Bi-monthly"
                },
                sustainability: {
                    ecoFriendly: true,
                    recyclable: true,
                    carbonNeutral: true
                }
            }
        ]
    },
    {
        id: 5,
        genericName: "Lisinopril",
        strength: "10mg",
        category: "ACE Inhibitor",
        form: "Tablet",
        therapeuticClass: "Antihypertensive",
        popularity: 87,
        prescriptionRate: 85,
        brands: [
            {
                id: 10,
                name: "Zestril",
                manufacturer: "AstraZeneca",
                price: 28.99,
                priceHistory: [30.00, 29.50, 28.99, 28.50, 28.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 1100,
                rating: 4.6,
                reviews: 1560,
                savings: 0,
                isGeneric: false,
                description: "Proven ACE inhibitor for blood pressure control",
                sideEffects: ["Dry cough", "Dizziness", "Headache"],
                efficacyScore: 94,
                patientCompliance: 87,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-06",
                favorite: true,
                popularity: 82,
                interactions: ["Potassium supplements", "NSAIDs"],
                dosage: "10mg once daily",
                warnings: ["Monitor kidney function"],
                tags: ["Blood pressure", "Heart health"],
                discount: 0,
                subscription: { available: true, discount: 12, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: false }
            },
            {
                id: 11,
                name: "Lisinopril (Generic)",
                manufacturer: "Various",
                price: 12.49,
                priceHistory: [14.00, 13.50, 12.49, 12.25, 12.49],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 2800,
                rating: 4.3,
                reviews: 980,
                savings: 16.50,
                isGeneric: true,
                description: "Affordable generic alternative",
                sideEffects: ["Mild cough"],
                efficacyScore: 92,
                patientCompliance: 91,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-05",
                favorite: false,
                popularity: 78,
                interactions: ["Diuretics"],
                dosage: "As prescribed",
                warnings: ["Avoid in pregnancy"],
                tags: ["Generic", "Budget-friendly"],
                discount: 20,
                subscription: { available: true, discount: 25, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 6,
        genericName: "Omeprazole",
        strength: "20mg",
        category: "PPI",
        form: "Capsule",
        therapeuticClass: "Proton Pump Inhibitor",
        popularity: 91,
        prescriptionRate: 72,
        brands: [
            {
                id: 12,
                name: "Prilosec",
                manufacturer: "Procter & Gamble",
                price: 22.99,
                priceHistory: [24.00, 23.50, 22.99, 22.50, 22.99],
                packSize: "42 capsules",
                availability: "In Stock",
                stockLevel: 1450,
                rating: 4.7,
                reviews: 2100,
                savings: 0,
                isGeneric: false,
                description: "Leading acid reflux treatment",
                sideEffects: ["Headache", "Nausea", "Abdominal pain"],
                efficacyScore: 95,
                patientCompliance: 89,
                storage: "Room temperature",
                requiresPrescription: false,
                lastUpdated: "2024-01-04",
                favorite: true,
                popularity: 90,
                interactions: ["Clopidogrel", "Methotrexate"],
                dosage: "20mg once daily",
                warnings: ["Short-term use recommended"],
                tags: ["Acid reflux", "OTC"],
                discount: 0,
                subscription: { available: true, discount: 15, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 13,
                name: "Omeprazole (Generic)",
                manufacturer: "Various",
                price: 9.99,
                priceHistory: [11.00, 10.50, 9.99, 9.75, 9.99],
                packSize: "42 capsules",
                availability: "In Stock",
                stockLevel: 3200,
                rating: 4.4,
                reviews: 1780,
                savings: 13.00,
                isGeneric: true,
                description: "Cost-effective acid reducer",
                sideEffects: ["Mild digestive issues"],
                efficacyScore: 93,
                patientCompliance: 92,
                storage: "Room temperature",
                requiresPrescription: false,
                lastUpdated: "2024-01-03",
                favorite: false,
                popularity: 85,
                interactions: ["Warfarin"],
                dosage: "As directed",
                warnings: ["Consult doctor for long-term use"],
                tags: ["Generic", "Value"],
                discount: 15,
                subscription: { available: true, discount: 20, frequency: "Bi-monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 7,
        genericName: "Amlodipine",
        strength: "5mg",
        category: "Calcium Channel Blocker",
        form: "Tablet",
        therapeuticClass: "Antihypertensive",
        popularity: 85,
        prescriptionRate: 80,
        brands: [
            {
                id: 14,
                name: "Norvasc",
                manufacturer: "Pfizer",
                price: 35.99,
                priceHistory: [38.00, 37.00, 35.99, 35.50, 35.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 920,
                rating: 4.7,
                reviews: 1890,
                savings: 0,
                isGeneric: false,
                description: "Effective calcium channel blocker",
                sideEffects: ["Edema", "Fatigue", "Flushing"],
                efficacyScore: 95,
                patientCompliance: 88,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-02",
                favorite: true,
                popularity: 84,
                interactions: ["Simvastatin", "Cyclosporine"],
                dosage: "5mg once daily",
                warnings: ["Monitor blood pressure"],
                tags: ["Blood pressure", "Trusted"],
                discount: 0,
                subscription: { available: true, discount: 10, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 15,
                name: "Amlodipine (Generic)",
                manufacturer: "Various",
                price: 11.99,
                priceHistory: [13.00, 12.50, 11.99, 11.75, 11.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 3100,
                rating: 4.4,
                reviews: 1450,
                savings: 24.00,
                isGeneric: true,
                description: "Affordable blood pressure control",
                sideEffects: ["Mild swelling"],
                efficacyScore: 93,
                patientCompliance: 91,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2024-01-01",
                favorite: false,
                popularity: 80,
                interactions: ["Grapefruit juice"],
                dosage: "As prescribed",
                warnings: ["Take at same time daily"],
                tags: ["Generic", "High savings"],
                discount: 25,
                subscription: { available: true, discount: 30, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 8,
        genericName: "Levothyroxine",
        strength: "50mcg",
        category: "Thyroid Hormone",
        form: "Tablet",
        therapeuticClass: "Hormone Replacement",
        popularity: 89,
        prescriptionRate: 88,
        brands: [
            {
                id: 16,
                name: "Synthroid",
                manufacturer: "AbbVie",
                price: 42.99,
                priceHistory: [45.00, 44.00, 42.99, 42.50, 42.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 1050,
                rating: 4.8,
                reviews: 2450,
                savings: 0,
                isGeneric: false,
                description: "Gold standard thyroid replacement",
                sideEffects: ["Palpitations", "Weight changes", "Insomnia"],
                efficacyScore: 97,
                patientCompliance: 86,
                storage: "Room temperature, protect from light",
                requiresPrescription: true,
                lastUpdated: "2023-12-30",
                favorite: true,
                popularity: 92,
                interactions: ["Calcium supplements", "Antacids"],
                dosage: "50mcg once daily on empty stomach",
                warnings: ["Take 30-60 min before breakfast"],
                tags: ["Thyroid", "Premium"],
                discount: 0,
                subscription: { available: true, discount: 12, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 17,
                name: "Levothyroxine (Generic)",
                manufacturer: "Various",
                price: 15.99,
                priceHistory: [17.00, 16.50, 15.99, 15.75, 15.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 2900,
                rating: 4.3,
                reviews: 1680,
                savings: 27.00,
                isGeneric: true,
                description: "Effective generic thyroid medication",
                sideEffects: ["Mild anxiety"],
                efficacyScore: 94,
                patientCompliance: 90,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-29",
                favorite: false,
                popularity: 85,
                interactions: ["Iron supplements"],
                dosage: "As prescribed",
                warnings: ["Regular thyroid monitoring required"],
                tags: ["Generic", "Cost-effective"],
                discount: 20,
                subscription: { available: true, discount: 28, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 9,
        genericName: "Gabapentin",
        strength: "300mg",
        category: "Anticonvulsant",
        form: "Capsule",
        therapeuticClass: "Nerve Pain/Seizure",
        popularity: 78,
        prescriptionRate: 65,
        brands: [
            {
                id: 18,
                name: "Neurontin",
                manufacturer: "Pfizer",
                price: 55.99,
                priceHistory: [58.00, 57.00, 55.99, 55.50, 55.99],
                packSize: "90 capsules",
                availability: "In Stock",
                stockLevel: 780,
                rating: 4.5,
                reviews: 1340,
                savings: 0,
                isGeneric: false,
                description: "Proven treatment for nerve pain and seizures",
                sideEffects: ["Drowsiness", "Dizziness", "Fatigue"],
                efficacyScore: 91,
                patientCompliance: 82,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-28",
                favorite: false,
                popularity: 75,
                interactions: ["Opioids", "Antacids"],
                dosage: "300mg three times daily",
                warnings: ["Do not stop abruptly"],
                tags: ["Nerve pain", "Seizures"],
                discount: 0,
                subscription: { available: true, discount: 10, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 19,
                name: "Gabapentin (Generic)",
                manufacturer: "Various",
                price: 18.99,
                priceHistory: [20.00, 19.50, 18.99, 18.75, 18.99],
                packSize: "90 capsules",
                availability: "In Stock",
                stockLevel: 2400,
                rating: 4.2,
                reviews: 980,
                savings: 37.00,
                isGeneric: true,
                description: "Affordable nerve pain relief",
                sideEffects: ["Mild sedation"],
                efficacyScore: 89,
                patientCompliance: 88,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-27",
                favorite: true,
                popularity: 72,
                interactions: ["Alcohol"],
                dosage: "As prescribed",
                warnings: ["May cause drowsiness"],
                tags: ["Generic", "High savings"],
                discount: 30,
                subscription: { available: true, discount: 35, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 10,
        genericName: "Sertraline",
        strength: "50mg",
        category: "SSRI",
        form: "Tablet",
        therapeuticClass: "Antidepressant",
        popularity: 86,
        prescriptionRate: 75,
        brands: [
            {
                id: 20,
                name: "Zoloft",
                manufacturer: "Pfizer",
                price: 38.99,
                priceHistory: [40.00, 39.50, 38.99, 38.50, 38.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 1180,
                rating: 4.6,
                reviews: 2890,
                savings: 0,
                isGeneric: false,
                description: "Leading SSRI for depression and anxiety",
                sideEffects: ["Nausea", "Insomnia", "Sexual dysfunction"],
                efficacyScore: 93,
                patientCompliance: 84,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-26",
                favorite: true,
                popularity: 88,
                interactions: ["MAOIs", "Blood thinners"],
                dosage: "50mg once daily",
                warnings: ["Monitor for mood changes"],
                tags: ["Antidepressant", "Anxiety"],
                discount: 0,
                subscription: { available: true, discount: 15, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 21,
                name: "Sertraline (Generic)",
                manufacturer: "Various",
                price: 14.99,
                priceHistory: [16.00, 15.50, 14.99, 14.75, 14.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 3500,
                rating: 4.4,
                reviews: 2150,
                savings: 24.00,
                isGeneric: true,
                description: "Effective generic antidepressant",
                sideEffects: ["Mild nausea"],
                efficacyScore: 91,
                patientCompliance: 89,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-25",
                favorite: false,
                popularity: 82,
                interactions: ["St. John's Wort"],
                dosage: "As prescribed",
                warnings: ["Do not stop abruptly"],
                tags: ["Generic", "Mental health"],
                discount: 25,
                subscription: { available: true, discount: 30, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 11,
        genericName: "Losartan",
        strength: "50mg",
        category: "ARB",
        form: "Tablet",
        therapeuticClass: "Antihypertensive",
        popularity: 84,
        prescriptionRate: 78,
        brands: [
            {
                id: 22,
                name: "Cozaar",
                manufacturer: "Merck",
                price: 52.99,
                priceHistory: [55.00, 54.00, 52.99, 52.50, 52.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 890,
                rating: 4.7,
                reviews: 1670,
                savings: 0,
                isGeneric: false,
                description: "Effective ARB for hypertension",
                sideEffects: ["Dizziness", "Back pain", "Fatigue"],
                efficacyScore: 94,
                patientCompliance: 87,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-24",
                favorite: true,
                popularity: 81,
                interactions: ["Potassium supplements", "Lithium"],
                dosage: "50mg once daily",
                warnings: ["Monitor potassium levels"],
                tags: ["Blood pressure", "Kidney protection"],
                discount: 0,
                subscription: { available: true, discount: 12, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 23,
                name: "Losartan (Generic)",
                manufacturer: "Various",
                price: 16.99,
                priceHistory: [18.00, 17.50, 16.99, 16.75, 16.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 2700,
                rating: 4.4,
                reviews: 1290,
                savings: 36.00,
                isGeneric: true,
                description: "Affordable ARB option",
                sideEffects: ["Mild dizziness"],
                efficacyScore: 92,
                patientCompliance: 90,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-23",
                favorite: false,
                popularity: 77,
                interactions: ["NSAIDs"],
                dosage: "As prescribed",
                warnings: ["Avoid in pregnancy"],
                tags: ["Generic", "Heart health"],
                discount: 25,
                subscription: { available: true, discount: 30, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 12,
        genericName: "Hydrochlorothiazide",
        strength: "25mg",
        category: "Diuretic",
        form: "Tablet",
        therapeuticClass: "Thiazide Diuretic",
        popularity: 80,
        prescriptionRate: 70,
        brands: [
            {
                id: 24,
                name: "Microzide",
                manufacturer: "Watson",
                price: 18.99,
                priceHistory: [20.00, 19.50, 18.99, 18.50, 18.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 1320,
                rating: 4.4,
                reviews: 890,
                savings: 0,
                isGeneric: false,
                description: "Effective diuretic for fluid retention",
                sideEffects: ["Frequent urination", "Electrolyte imbalance"],
                efficacyScore: 90,
                patientCompliance: 85,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-22",
                favorite: false,
                popularity: 76,
                interactions: ["Lithium", "Digoxin"],
                dosage: "25mg once daily",
                warnings: ["Monitor electrolytes"],
                tags: ["Diuretic", "Blood pressure"],
                discount: 0,
                subscription: { available: true, discount: 10, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: false }
            },
            {
                id: 25,
                name: "HCTZ (Generic)",
                manufacturer: "Various",
                price: 6.99,
                priceHistory: [8.00, 7.50, 6.99, 6.75, 6.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 4100,
                rating: 4.2,
                reviews: 1120,
                savings: 12.00,
                isGeneric: true,
                description: "Very affordable diuretic",
                sideEffects: ["Increased thirst"],
                efficacyScore: 88,
                patientCompliance: 91,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-21",
                favorite: true,
                popularity: 82,
                interactions: ["Corticosteroids"],
                dosage: "As prescribed",
                warnings: ["Stay hydrated"],
                tags: ["Generic", "Very affordable"],
                discount: 15,
                subscription: { available: true, discount: 20, frequency: "Bi-monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 13,
        genericName: "Pantoprazole",
        strength: "40mg",
        category: "PPI",
        form: "Tablet",
        therapeuticClass: "Proton Pump Inhibitor",
        popularity: 83,
        prescriptionRate: 68,
        brands: [
            {
                id: 26,
                name: "Protonix",
                manufacturer: "Pfizer",
                price: 45.99,
                priceHistory: [48.00, 47.00, 45.99, 45.50, 45.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 870,
                rating: 4.6,
                reviews: 1450,
                savings: 0,
                isGeneric: false,
                description: "Prescription-strength acid reducer",
                sideEffects: ["Headache", "Diarrhea", "Nausea"],
                efficacyScore: 94,
                patientCompliance: 86,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-20",
                favorite: true,
                popularity: 79,
                interactions: ["Atazanavir", "Methotrexate"],
                dosage: "40mg once daily",
                warnings: ["Use lowest effective dose"],
                tags: ["GERD", "Acid reflux"],
                discount: 0,
                subscription: { available: true, discount: 12, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 27,
                name: "Pantoprazole (Generic)",
                manufacturer: "Various",
                price: 15.49,
                priceHistory: [17.00, 16.50, 15.49, 15.25, 15.49],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 2600,
                rating: 4.3,
                reviews: 1080,
                savings: 30.50,
                isGeneric: true,
                description: "Effective generic PPI",
                sideEffects: ["Mild GI discomfort"],
                efficacyScore: 92,
                patientCompliance: 90,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-19",
                favorite: false,
                popularity: 75,
                interactions: ["Warfarin"],
                dosage: "As prescribed",
                warnings: ["Regular monitoring for long-term use"],
                tags: ["Generic", "Stomach health"],
                discount: 25,
                subscription: { available: true, discount: 30, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 14,
        genericName: "Escitalopram",
        strength: "10mg",
        category: "SSRI",
        form: "Tablet",
        therapeuticClass: "Antidepressant",
        popularity: 88,
        prescriptionRate: 76,
        brands: [
            {
                id: 28,
                name: "Lexapro",
                manufacturer: "Lundbeck",
                price: 48.99,
                priceHistory: [50.00, 49.50, 48.99, 48.50, 48.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 980,
                rating: 4.7,
                reviews: 3120,
                savings: 0,
                isGeneric: false,
                description: "Highly effective SSRI with fewer side effects",
                sideEffects: ["Nausea", "Headache", "Insomnia"],
                efficacyScore: 95,
                patientCompliance: 88,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-18",
                favorite: true,
                popularity: 90,
                interactions: ["MAOIs", "Triptans"],
                dosage: "10mg once daily",
                warnings: ["Monitor for suicidal thoughts initially"],
                tags: ["Depression", "Anxiety", "Well-tolerated"],
                discount: 0,
                subscription: { available: true, discount: 15, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 29,
                name: "Escitalopram (Generic)",
                manufacturer: "Various",
                price: 12.99,
                priceHistory: [14.00, 13.50, 12.99, 12.75, 12.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 3800,
                rating: 4.5,
                reviews: 2450,
                savings: 36.00,
                isGeneric: true,
                description: "Popular generic antidepressant",
                sideEffects: ["Mild fatigue"],
                efficacyScore: 93,
                patientCompliance: 91,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-17",
                favorite: false,
                popularity: 86,
                interactions: ["NSAIDs"],
                dosage: "As prescribed",
                warnings: ["Do not discontinue abruptly"],
                tags: ["Generic", "Mental wellness"],
                discount: 30,
                subscription: { available: true, discount: 35, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    },
    {
        id: 15,
        genericName: "Simvastatin",
        strength: "20mg",
        category: "Statin",
        form: "Tablet",
        therapeuticClass: "Lipid-lowering",
        popularity: 82,
        prescriptionRate: 74,
        brands: [
            {
                id: 30,
                name: "Zocor",
                manufacturer: "Merck",
                price: 39.99,
                priceHistory: [42.00, 41.00, 39.99, 39.50, 39.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 1020,
                rating: 4.5,
                reviews: 1780,
                savings: 0,
                isGeneric: false,
                description: "Proven statin for cholesterol control",
                sideEffects: ["Muscle pain", "Constipation", "Headache"],
                efficacyScore: 93,
                patientCompliance: 85,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-16",
                favorite: true,
                popularity: 78,
                interactions: ["Grapefruit", "Amiodarone", "Amlodipine"],
                dosage: "20mg once daily in evening",
                warnings: ["Take in evening for best effect"],
                tags: ["Cholesterol", "Heart health"],
                discount: 0,
                subscription: { available: true, discount: 12, frequency: "Monthly" },
                sustainability: { ecoFriendly: false, recyclable: true, carbonNeutral: false }
            },
            {
                id: 32,
                name: "Simvastatin (Generic)",
                manufacturer: "Various",
                price: 10.99,
                priceHistory: [12.00, 11.50, 10.99, 10.75, 10.99],
                packSize: "30 tablets",
                availability: "In Stock",
                stockLevel: 3200,
                rating: 4.3,
                reviews: 1340,
                savings: 29.00,
                isGeneric: true,
                description: "Affordable cholesterol management",
                sideEffects: ["Mild muscle discomfort"],
                efficacyScore: 91,
                patientCompliance: 90,
                storage: "Room temperature",
                requiresPrescription: true,
                lastUpdated: "2023-12-15",
                favorite: false,
                popularity: 75,
                interactions: ["Diltiazem"],
                dosage: "As prescribed",
                warnings: ["Limit grapefruit consumption"],
                tags: ["Generic", "Budget-friendly"],
                discount: 25,
                subscription: { available: true, discount: 30, frequency: "Monthly" },
                sustainability: { ecoFriendly: true, recyclable: true, carbonNeutral: true }
            }
        ]
    }
];

// ========================================
// NEW FEATURES COMPONENTS
// ========================================

// Smart Alert System
const SmartAlerts = ({ brands, selectedBrands = [] }) => {
    const getAlerts = () => {
        const alerts = [];

        // Check if selected brands have low stock
        const selectedLowStock = selectedBrands.filter(b => b.stockLevel < 50);
        if (selectedLowStock.length > 0) {
            alerts.push({
                type: 'critical',
                title: 'Selected Brand Alert',
                message: `${selectedLowStock.length} of your selected brands have low stock`,
                brands: selectedLowStock.slice(0, 2).map(b => b.name),
                icon: ExclamationTriangleIcon
            });
        }

        // Low stock alert
        const lowStockBrands = brands.filter(brand =>
            brand.availability === 'Limited Stock' && brand.stockLevel < 50
        );
        if (lowStockBrands.length > 0) {
            alerts.push({
                type: 'warning',
                title: 'Low Stock Alert',
                message: `${lowStockBrands.length} brands have limited stock`,
                brands: lowStockBrands.slice(0, 2).map(b => b.name),
                icon: ExclamationTriangleIcon
            });
        }

        // Price drop alert
        const priceDropBrands = brands.filter(brand => {
            if (brand.priceHistory.length < 2) return false;
            const recentChange = brand.priceHistory[brand.priceHistory.length - 1] -
                brand.priceHistory[brand.priceHistory.length - 2];
            return recentChange < -0.50; // Price dropped more than $0.50
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
                                    <div className="font-bold text-slate-900">${cost.toFixed(2)}</div>
                                    {savings > 0 && (
                                        <div className="text-sm font-semibold text-emerald-600">
                                            Save ${savings.toFixed(2)}
                                        </div>
                                    )}
                                    {savings < 0 && (
                                        <div className="text-sm font-semibold text-red-600">
                                            +${Math.abs(savings).toFixed(2)}
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
                { label: "Average Price", value: `$${avgPrice.toFixed(2)}`, icon: CurrencyDollarIcon },
                { label: "Max Savings", value: `$${maxSaving.toFixed(2)}`, icon: GiftIcon }
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
                                        {brand.name} (${brand.price})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Target Price ($)</label>
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
                                    <span className="text-slate-600">Current: <span className="font-semibold">${alert.currentPrice}</span></span>
                                    <span className="text-purple-600">Target: <span className="font-bold">${alert.targetPrice}</span></span>
                                    {alert.currentPrice <= alert.targetPrice && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-full animate-pulse">
                                            🎯 Target Reached!
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onRemoveAlert(alert.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                ✕
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
                                    <p className="text-sm text-slate-600">{med.strength} • {med.form}</p>
                                </div>
                                {isSelected && (
                                    <CheckCircleIcon className="h-6 w-6 text-cyan-600" />
                                )}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{med.brands.length} brands</span>
                                <span className="font-semibold text-cyan-600">
                                    From ${Math.min(...med.brands.map(b => b.price)).toFixed(2)}
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
                                        <span className="text-xl font-black text-slate-900">${brand.price}</span>
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
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-700">Availability</td>
                                {brands.map(brand => (
                                    <td key={brand.id} className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${brand.availability === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {brand.availability}
                                        </span>
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
                                            <span className="font-bold text-green-600">${brand.savings.toFixed(2)}</span>
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
                                            <span className="text-green-600 font-bold">✓</span>
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
                                            <span className="font-bold text-slate-900">${brand.price}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Average Price:</span>
                                            <span className="font-semibold text-blue-600">${avgPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Lowest:</span>
                                            <span className="font-semibold text-green-600">${lowestPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Highest:</span>
                                            <span className="font-semibold text-red-600">${highestPrice}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-300 pt-3 mt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-700">Trend:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${trend === 'decreasing' ? 'bg-green-100 text-green-700' :
                                                    trend === 'increasing' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {trend === 'decreasing' && '↓ Decreasing'}
                                                {trend === 'increasing' && '↑ Increasing'}
                                                {trend === 'stable' && '→ Stable'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700">Predicted:</span>
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                                ${prediction}
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
                                                    title={`$${price}`}
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
                            {med.brands.length} brands from ${Math.min(...med.brands.map(b => b.price)).toFixed(2)}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-amber-600 group-hover:text-amber-700">
                                View alternatives →
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

// Quick Actions Bar
const QuickActionsBar = ({ selectedBrands, medications, onExport, onShare }) => {
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
                        onClick={() => alert('AI Insights generated')}
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
    const [filterAvailability, setFilterAvailability] = useState('all');
    const [filterRating, setFilterRating] = useState(0);
    const [showFavorites, setShowFavorites] = useState(false);
    const [showDetails, setShowDetails] = useState(null);
    const [medications, setMedications] = useState(sampleMedications);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 100]);
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

    // Generate autocomplete suggestions - shows all matching drugs and brands
    const autocompleteSuggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 1) return [];
        
        const term = searchTerm.toLowerCase();
        const suggestions = [];
        
        // Add matching medications
        medications.forEach(med => {
            if (med.genericName.toLowerCase().includes(term) ||
                med.category.toLowerCase().includes(term) ||
                med.therapeuticClass.toLowerCase().includes(term)) {
                suggestions.push({
                    type: 'medication',
                    id: med.id,
                    name: med.genericName,
                    subtitle: `${med.strength} • ${med.category} • ${med.brands.length} brands available`,
                    category: med.category,
                    icon: 'pill',
                    medication: med
                });
            }
            // Add matching brands
            med.brands.forEach(brand => {
                if (brand.name.toLowerCase().includes(term) || 
                    brand.manufacturer.toLowerCase().includes(term)) {
                    suggestions.push({
                        type: 'brand',
                        id: `${med.id}-${brand.id}`,
                        name: brand.name,
                        subtitle: `${brand.manufacturer} • $${brand.price} • ${med.genericName} ${med.strength}`,
                        category: med.category,
                        icon: 'tag',
                        medication: med,
                        brand: brand
                    });
                }
            });
        });
        
        // Return more suggestions (up to 12)
        return suggestions.slice(0, 12);
    }, [searchTerm, medications]);

    // Handle autocomplete selection
    const handleAutocompleteSelect = (suggestion) => {
        if (suggestion.type === 'medication') {
            setSelectedMedication(suggestion.medication);
            setSearchTerm(suggestion.name);
        } else if (suggestion.type === 'brand') {
            setSelectedMedication(suggestion.medication);
            setSearchTerm(suggestion.brand.name);
            // Also select the brand for comparison
            if (!selectedBrands.find(b => b.id === suggestion.brand.id)) {
                setSelectedBrands(prev => [...prev, suggestion.brand]);
            }
        }
        setShowAutocomplete(false);
        setHighlightedIndex(-1);
        // Scroll to brands section
        setTimeout(() => {
            document.getElementById('brands-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
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
            .filter(brand => {
                if (filterAvailability === 'in-stock') return brand.availability === 'In Stock';
                if (filterAvailability === 'limited') return brand.availability === 'Limited Stock';
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
    }, [selectedMedication, filterGeneric, filterAvailability, filterRating, priceRange, showFavorites, sortBy, showSustainability]);

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

    const handleMedicationSelect = (medication) => {
        setSelectedMedication(medication);
        setSelectedBrands([]);
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

    const handleExport = () => {
        const data = {
            selectedMedication: selectedMedication?.genericName,
            selectedBrands: selectedBrands.map(brand => ({
                name: brand.name,
                manufacturer: brand.manufacturer,
                price: brand.price,
                savings: brand.savings,
                rating: brand.rating,
                efficacy: brand.efficacyScore
            })),
            totalSavings: totalSavings,
            averageRating: averageRating,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brand-comparison-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Brand Comparison Analysis',
                text: `I found ${selectedBrands.length} brands with $${totalSavings.toFixed(2)} total savings!`,
                url: window.location.href
            });
        } else {
            alert('Sharing is not supported in your browser. Export the report instead.');
        }
    };

    const handleAddPriceAlert = (alert) => {
        setPriceAlerts(prev => [...prev, alert]);
        setNotifications(prev => [{
            type: 'price',
            title: 'Price Alert Created',
            message: `Alert set for ${alert.brandName} at $${alert.targetPrice}`,
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
    const loadDemoData = () => {
        // Select Atorvastatin (cholesterol medication) for demo
        const demoMedication = medications.find(m => m.genericName === 'Atorvastatin');
        if (demoMedication) {
            setSelectedMedication(demoMedication);
            // Select both brand and generic for comparison
            setSelectedBrands(demoMedication.brands);
            // Set some demo notifications
            setNotifications([
                {
                    type: 'price',
                    title: '💰 Price Drop Alert!',
                    message: 'Atorvastatin Generic dropped 15% - Now $18.99',
                    time: 'Just now'
                },
                {
                    type: 'stock',
                    title: '📦 Stock Update',
                    message: 'Lipitor back in stock at most pharmacies',
                    time: '5 min ago'
                },
                {
                    type: 'info',
                    title: '🎯 Savings Opportunity',
                    message: 'Switch to generic to save $27/month',
                    time: '10 min ago'
                }
            ]);
            // Set demo price alerts
            setPriceAlerts([
                {
                    id: 1,
                    brandName: 'Lipitor',
                    currentPrice: 45.99,
                    targetPrice: 40.00
                },
                {
                    id: 2,
                    brandName: 'Glucophage',
                    currentPrice: 32.50,
                    targetPrice: 28.00
                }
            ]);
            // Scroll to brands section
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
                />

                {/* Search Bar with Autocomplete */}
                <div className="mb-8">
                    <div className="relative group">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-hover:text-blue-400 transition-colors z-10" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search medications by name, brand, manufacturer, or symptoms..."
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
                        {showAutocomplete && autocompleteSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                                <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            💊 {autocompleteSuggestions.length} Results Found
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            Search across {medications.length} medications & {medications.reduce((sum, m) => sum + m.brands.length, 0)} brands
                                        </span>
                                    </div>
                                </div>
                                <ul className="max-h-96 overflow-y-auto">
                                    {autocompleteSuggestions.map((suggestion, index) => (
                                        <li
                                            key={suggestion.id}
                                            onClick={() => handleAutocompleteSelect(suggestion)}
                                            className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 ${
                                                highlightedIndex === index
                                                    ? 'bg-blue-50 border-l-4 border-blue-500'
                                                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                                            }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                                                suggestion.type === 'medication'
                                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                            }`}>
                                                {suggestion.type === 'medication' ? (
                                                    <BeakerIcon className="h-6 w-6 text-white" />
                                                ) : (
                                                    <TagIcon className="h-6 w-6 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-900">
                                                        {suggestion.name}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                                        suggestion.type === 'medication'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {suggestion.type === 'medication' ? 'Medication' : 'Brand'}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                                                        {suggestion.category}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 truncate mt-0.5">
                                                    {suggestion.subtitle}
                                                </p>
                                            </div>
                                            <ChevronRightIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                        </li>
                                    ))}
                                </ul>
                                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 flex items-center gap-2">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">↑</kbd>
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">↓</kbd>
                                        navigate
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs ml-2">Enter</kbd>
                                        select
                                    </span>
                                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                        <SparklesSolid className="h-3 w-3" />
                                        AI-Powered Search
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
                        onClick={loadDemoData}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 animate-pulse"
                        style={{ animationDuration: '2s' }}
                    >
                        <SparklesIcon className="h-5 w-5" />
                        ✨ Load Demo
                    </button>
                    <div className="w-px h-8 bg-slate-300 mx-2"></div>
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
                        filterAvailability={filterAvailability}
                        setFilterAvailability={setFilterAvailability}
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
                            setFilterAvailability('all');
                            setFilterRating(0);
                            setPriceRange([0, 100]);
                            setShowFavorites(false);
                            setShowSustainability(false);
                        }}
                    />
                )}

                {/* Stats Dashboard */}
                <StatsDashboard
                    selectedBrands={selectedBrands}
                    totalSavings={totalSavings}
                    averageRating={averageRating}
                    medications={medications}
                    filteredBrands={filteredBrands}
                />

                {/* Medication Selection */}
                {searchTerm && filteredMedications.length > 0 && !selectedMedication && (
                    <MedicationSelection
                        filteredMedications={filteredMedications}
                        handleMedicationSelect={handleMedicationSelect}
                    />
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
                                                        <p className="text-2xl font-black text-slate-900">${brand.price}</p>
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
                                        setFilterAvailability('all');
                                        setFilterRating(0);
                                        setPriceRange([0, 100]);
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