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
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            Pharm<span className="text-blue-600">Link</span>
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 -mt-0.5">
            Drug availability & accessibility
          </p>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
