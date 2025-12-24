import React from "react";
import LogoIcon from "../assets/PharmLinkLogo.png";

const BrandLogo = ({ withText = true, size = 36 }) => {
  return (
    <div className="flex items-center space-x-2">
      
      {/* Logo Image */}
      <img
        src={LogoIcon}
        alt="PharmaLink Logo"
        className="object-contain"
        style={{ width: size, height: size }}
      />

      {/* Text */}
      {withText && (
        <div className="leading-tight select-none">
          <p 
            className="font-extrabold tracking-tight text-slate-900"
            style={{ fontSize: `${size * 0.5}px` }}
          >
            Pharma<span className="text-blue-600">Link</span>
          </p>
          <p 
            className="uppercase tracking-wide text-slate-400"
            style={{ 
              fontSize: `${size * 0.28}px`,
              marginTop: `${size * -0.014}px`
            }}
          >
            Drug availability & accessibility
          </p>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
