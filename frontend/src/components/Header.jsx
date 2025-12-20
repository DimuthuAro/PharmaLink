import React from "react";

const Header = ({ title = "PharmaLink", subtitle = "Cross Brand Comparator" }) => (
    <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-700 mb-2 drop-shadow-sm">{title}</h1>
        <p className="text-lg text-slate-600 font-medium">{subtitle}</p>
    </header>
);

export default Header;
