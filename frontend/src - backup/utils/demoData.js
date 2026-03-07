// ========================================
// PHARMALINK DEMO DATA
// Comprehensive sample data for demonstrating all features
// ========================================

// Common drugs for interaction checking
export const sampleDrugs = [
  { id: 1, name: 'Warfarin', category: 'Blood Thinner', genericName: 'Warfarin Sodium' },
  { id: 2, name: 'Aspirin', category: 'Pain Relief / Blood Thinner', genericName: 'Acetylsalicylic Acid' },
  { id: 3, name: 'Metformin', category: 'Diabetes', genericName: 'Metformin Hydrochloride' },
  { id: 4, name: 'Lisinopril', category: 'Heart / Blood Pressure', genericName: 'Lisinopril' },
  { id: 5, name: 'Simvastatin', category: 'Cholesterol', genericName: 'Simvastatin' },
  { id: 6, name: 'Ibuprofen', category: 'Pain Relief / NSAID', genericName: 'Ibuprofen' },
  { id: 7, name: 'Omeprazole', category: 'Acid Reflux', genericName: 'Omeprazole' },
  { id: 8, name: 'Amoxicillin', category: 'Antibiotic', genericName: 'Amoxicillin' },
  { id: 9, name: 'Atorvastatin', category: 'Cholesterol', genericName: 'Atorvastatin Calcium' },
  { id: 10, name: 'Metoprolol', category: 'Heart / Blood Pressure', genericName: 'Metoprolol Tartrate' },
  { id: 11, name: 'Amlodipine', category: 'Blood Pressure', genericName: 'Amlodipine Besylate' },
  { id: 12, name: 'Levothyroxine', category: 'Thyroid', genericName: 'Levothyroxine Sodium' },
  { id: 13, name: 'Sertraline', category: 'Mental Health / SSRI', genericName: 'Sertraline Hydrochloride' },
  { id: 14, name: 'Gabapentin', category: 'Nerve Pain / Seizures', genericName: 'Gabapentin' },
  { id: 15, name: 'Clopidogrel', category: 'Blood Thinner', genericName: 'Clopidogrel Bisulfate' },
];

// Demo interaction scenarios for quick demonstration
export const demoInteractionScenarios = [
  {
    id: 'severe-interaction',
    name: '⚠️ Severe Interaction Demo',
    description: 'Warfarin + Aspirin - Shows critical bleeding risk warning',
    drugs: ['Warfarin', 'Aspirin'],
    expectedSeverity: 'severe',
    expectedWarning: 'Increased risk of bleeding when combined'
  },
  {
    id: 'moderate-interaction',
    name: '🟠 Moderate Interaction Demo',
    description: 'Metformin + Lisinopril - Common diabetes/heart combination',
    drugs: ['Metformin', 'Lisinopril'],
    expectedSeverity: 'moderate',
    expectedWarning: 'Monitor blood sugar and kidney function'
  },
  {
    id: 'multi-drug',
    name: '💊 Multi-Drug Check Demo',
    description: 'Simvastatin + Ibuprofen + Omeprazole - Complex interaction',
    drugs: ['Simvastatin', 'Ibuprofen', 'Omeprazole'],
    expectedSeverity: 'moderate',
    expectedWarning: 'Multiple interaction points detected'
  },
  {
    id: 'safe-combination',
    name: '✅ Safe Combination Demo',
    description: 'Amoxicillin + Omeprazole - Generally safe combination',
    drugs: ['Amoxicillin', 'Omeprazole'],
    expectedSeverity: 'none',
    expectedWarning: 'No significant interactions detected'
  }
];

// Sample prescription data for OCR demonstration
export const samplePrescriptions = [
  {
    id: 1,
    patientName: 'John Smith',
    age: 45,
    date: '2026-01-06',
    doctor: 'Dr. Sarah Johnson, MD',
    hospital: 'City General Hospital',
    medications: [
      { name: 'Metformin 500mg', dosage: '1 tablet', frequency: 'twice daily', duration: '30 days' },
      { name: 'Lisinopril 10mg', dosage: '1 tablet', frequency: 'once daily', duration: '30 days' },
      { name: 'Atorvastatin 20mg', dosage: '1 tablet', frequency: 'at bedtime', duration: '30 days' }
    ],
    diagnosis: 'Type 2 Diabetes, Hypertension, Hyperlipidemia',
    instructions: 'Take with food. Follow up in 30 days. Monitor blood pressure weekly.'
  },
  {
    id: 2,
    patientName: 'Mary Williams',
    age: 62,
    date: '2026-01-05',
    doctor: 'Dr. Michael Chen, MD',
    hospital: 'Memorial Healthcare Center',
    medications: [
      { name: 'Warfarin 5mg', dosage: '1 tablet', frequency: 'once daily', duration: '90 days' },
      { name: 'Omeprazole 20mg', dosage: '1 capsule', frequency: 'before breakfast', duration: '30 days' },
      { name: 'Metoprolol 50mg', dosage: '1 tablet', frequency: 'twice daily', duration: '30 days' }
    ],
    diagnosis: 'Atrial Fibrillation, GERD, Heart Failure',
    instructions: 'Regular INR monitoring required. Avoid grapefruit. Report any unusual bleeding.'
  },
  {
    id: 3,
    patientName: 'Robert Davis',
    age: 55,
    date: '2026-01-04',
    doctor: 'Dr. Emily Watson, DO',
    hospital: 'University Medical Center',
    medications: [
      { name: 'Sertraline 50mg', dosage: '1 tablet', frequency: 'in the morning', duration: '60 days' },
      { name: 'Gabapentin 300mg', dosage: '1 capsule', frequency: 'three times daily', duration: '30 days' },
      { name: 'Ibuprofen 400mg', dosage: '1 tablet', frequency: 'as needed for pain', duration: 'PRN' }
    ],
    diagnosis: 'Generalized Anxiety Disorder, Peripheral Neuropathy, Chronic Pain',
    instructions: 'Avoid alcohol. Do not drive until you know how medication affects you.'
  }
];

// Sample meal plan data
export const sampleMealPlanResult = {
  days: [
    {
      day: 1,
      meals: [
        {
          type: 'Breakfast',
          items: [
            { name: 'Oatmeal with Blueberries', energy: 320, protein: 12, carbs: 54, fat: 6 },
            { name: 'Green Tea', energy: 0, protein: 0, carbs: 0, fat: 0 }
          ],
          notes: 'Avoid grapefruit juice if taking statins'
        },
        {
          type: 'Lunch',
          items: [
            { name: 'Grilled Chicken Salad', energy: 450, protein: 35, carbs: 20, fat: 18 },
            { name: 'Whole Grain Bread', energy: 120, protein: 4, carbs: 22, fat: 2 }
          ],
          notes: 'Good source of lean protein'
        },
        {
          type: 'Dinner',
          items: [
            { name: 'Baked Salmon with Vegetables', energy: 520, protein: 42, carbs: 25, fat: 22 },
            { name: 'Brown Rice', energy: 180, protein: 4, carbs: 38, fat: 2 }
          ],
          notes: 'Omega-3 rich meal, beneficial for heart health'
        }
      ]
    },
    {
      day: 2,
      meals: [
        {
          type: 'Breakfast',
          items: [
            { name: 'Greek Yogurt Parfait', energy: 280, protein: 18, carbs: 35, fat: 8 },
            { name: 'Mixed Nuts (1 oz)', energy: 170, protein: 5, carbs: 6, fat: 15 }
          ],
          notes: 'High protein start to stabilize blood sugar'
        },
        {
          type: 'Lunch',
          items: [
            { name: 'Turkey Sandwich on Whole Wheat', energy: 380, protein: 28, carbs: 40, fat: 12 },
            { name: 'Apple Slices', energy: 95, protein: 0, carbs: 25, fat: 0 }
          ],
          notes: 'Balanced macronutrients for sustained energy'
        },
        {
          type: 'Dinner',
          items: [
            { name: 'Lean Beef Stir-Fry', energy: 480, protein: 38, carbs: 30, fat: 20 },
            { name: 'Quinoa', energy: 160, protein: 6, carbs: 28, fat: 3 }
          ],
          notes: 'Iron-rich meal - take with vitamin C for better absorption'
        }
      ]
    },
    {
      day: 3,
      meals: [
        {
          type: 'Breakfast',
          items: [
            { name: 'Spinach Egg White Omelet', energy: 220, protein: 24, carbs: 8, fat: 10 },
            { name: 'Whole Grain Toast', energy: 120, protein: 4, carbs: 22, fat: 2 }
          ],
          notes: 'Low carb option for blood sugar management'
        },
        {
          type: 'Lunch',
          items: [
            { name: 'Mediterranean Chickpea Bowl', energy: 420, protein: 15, carbs: 55, fat: 16 },
            { name: 'Hummus (2 tbsp)', energy: 70, protein: 2, carbs: 6, fat: 4 }
          ],
          notes: 'Fiber-rich, heart-healthy choice'
        },
        {
          type: 'Dinner',
          items: [
            { name: 'Grilled Tilapia', energy: 280, protein: 42, carbs: 0, fat: 12 },
            { name: 'Roasted Sweet Potato', energy: 180, protein: 4, carbs: 40, fat: 0 },
            { name: 'Steamed Broccoli', energy: 55, protein: 4, carbs: 10, fat: 0 }
          ],
          notes: 'Excellent for diabetic patients - low glycemic index'
        }
      ]
    }
  ],
  warnings: [
    'Avoid grapefruit and grapefruit juice if taking Simvastatin or Atorvastatin',
    'Limit high-sodium foods while on blood pressure medications',
    'Take Levothyroxine on empty stomach, 30-60 minutes before breakfast',
    'Maintain consistent vitamin K intake if on Warfarin'
  ],
  recommendations: [
    'Drink 8-10 glasses of water daily',
    'Limit caffeine to 2-3 cups per day',
    'Include fiber-rich foods to improve medication absorption',
    'Eat at consistent times to maintain stable blood sugar levels'
  ]
};

// Sample cross-brand comparison data
export const sampleBrandComparison = {
  genericName: 'Atorvastatin',
  strength: '20mg',
  category: 'Statin / Cholesterol',
  brands: [
    {
      name: 'Lipitor',
      manufacturer: 'Pfizer',
      price: 125.99,
      packSize: '30 tablets',
      rating: 4.8,
      reviews: 2450,
      availability: 'In Stock',
      isGeneric: false,
      savings: 0
    },
    {
      name: 'Atorvastatin Generic',
      manufacturer: 'Teva Pharmaceuticals',
      price: 15.99,
      packSize: '30 tablets',
      rating: 4.6,
      reviews: 1820,
      availability: 'In Stock',
      isGeneric: true,
      savings: 110.00
    },
    {
      name: 'Atorva',
      manufacturer: 'Sun Pharma',
      price: 18.99,
      packSize: '30 tablets',
      rating: 4.5,
      reviews: 980,
      availability: 'In Stock',
      isGeneric: true,
      savings: 107.00
    },
    {
      name: 'Atorlip',
      manufacturer: 'Cipla',
      price: 22.99,
      packSize: '30 tablets',
      rating: 4.4,
      reviews: 650,
      availability: 'Limited Stock',
      isGeneric: true,
      savings: 103.00
    }
  ]
};

// Food-drug interaction samples
export const foodDrugInteractions = [
  {
    drug: 'Warfarin',
    foods: ['Spinach', 'Kale', 'Broccoli', 'Brussels Sprouts'],
    severity: 'moderate',
    effect: 'Vitamin K in these foods can reduce the effectiveness of Warfarin',
    recommendation: 'Maintain consistent vitamin K intake rather than avoiding completely'
  },
  {
    drug: 'Simvastatin',
    foods: ['Grapefruit', 'Grapefruit Juice', 'Pomelo', 'Seville Oranges'],
    severity: 'severe',
    effect: 'Can increase statin levels in blood by up to 260%, increasing risk of muscle damage',
    recommendation: 'Completely avoid grapefruit and related citrus fruits'
  },
  {
    drug: 'Metformin',
    foods: ['Alcohol'],
    severity: 'severe',
    effect: 'Increases risk of lactic acidosis and low blood sugar',
    recommendation: 'Limit or avoid alcohol consumption'
  },
  {
    drug: 'Levothyroxine',
    foods: ['Soy Products', 'Coffee', 'High-Fiber Foods', 'Calcium-Rich Foods'],
    severity: 'moderate',
    effect: 'Can interfere with medication absorption',
    recommendation: 'Take medication 30-60 minutes before breakfast on empty stomach'
  },
  {
    drug: 'MAO Inhibitors',
    foods: ['Aged Cheese', 'Cured Meats', 'Soy Sauce', 'Draft Beer'],
    severity: 'severe',
    effect: 'Can cause dangerous spike in blood pressure (hypertensive crisis)',
    recommendation: 'Strictly avoid tyramine-rich foods'
  }
];

// Demo dashboard statistics
export const demoDashboardStats = {
  prescriptionsProcessed: 1247,
  interactionsChecked: 8923,
  costSavings: 45600,
  accuracyRate: 98.7,
  activePatients: 342,
  alertsGenerated: 156,
  averageProcessingTime: '2.3s',
  successRate: 99.2
};

// Helper function to get random demo scenario
export const getRandomDemoScenario = () => {
  const randomIndex = Math.floor(Math.random() * demoInteractionScenarios.length);
  return demoInteractionScenarios[randomIndex];
};

// Helper function to get sample prescription by ID
export const getSamplePrescription = (id) => {
  return samplePrescriptions.find(p => p.id === id) || samplePrescriptions[0];
};

export default {
  sampleDrugs,
  demoInteractionScenarios,
  samplePrescriptions,
  sampleMealPlanResult,
  sampleBrandComparison,
  foodDrugInteractions,
  demoDashboardStats,
  getRandomDemoScenario,
  getSamplePrescription
};
