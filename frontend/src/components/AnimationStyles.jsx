// AnimationStyles.jsx
// Extracted from CrossBrandComparator.jsx
import React from 'react';

const AnimationStyles = () => (
    <style>{`
    @keyframes float {
      0%, 100% { transform: translateY(0) translateX(0); }
      25% { transform: translateY(-10px) translateX(5px); }
      50% { transform: translateY(-5px) translateX(-5px); }
      75% { transform: translateY(-15px) translateX(3px); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
      50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.4); }
    }
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes bounce-subtle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-shimmer { animation: shimmer 2s linear infinite; background-size: 200% 100%; }
    .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
    .animate-slideInUp { animation: slideInUp 0.5s ease-out forwards; }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
    .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
  `}</style>
);

export default AnimationStyles;
