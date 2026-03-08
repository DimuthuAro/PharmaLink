const Sidebar = () => {
    return (
        <>
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
            <div
              className="shrink-0 flex items-center cursor-pointer group"
              onClick={() => handleNavigation("/")}
            >
              <div className="transform group-hover:scale-105 transition-transform duration-200">
                <BrandLogo />
              </div>
            </div>
          </div>

          <nav className="px-4 py-6 space-y-2">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                handleNavigation("/dashboard");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition
                ${
                  activeTab === "dashboard"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <HomeIcon className="h-5 w-5" />
              Dashboard
            </button>

            <button
              onClick={() => {
                setActiveTab("food-drug");
                handleNavigation("/advisory");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "food-drug"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ShieldCheckIcon className="h-5 w-5" />
              Food Drug Interaction
            </button>

            <button
              onClick={() => {
                setActiveTab("meal-plan");
                handleNavigation("/meal-plan");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "meal-plan"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ClipboardDocumentListIcon className="h-5 w-5" />
              Meal Plan Advisor
            </button>

            {/* Current page */}
            <button
              onClick={() => setActiveTab("drug-image")}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "drug-image"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <PhotoIcon className="h-5 w-5" />
              Drug Image Analyzer
            </button>

            <button
              onClick={() => {
                setActiveTab("symptom-drug");
                handleNavigation("/symptom-drug");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "symptom-drug"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <SparklesIcon className="h-5 w-5" />
              Drug Recommender
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                handleNavigation("/history");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "history"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ClockIcon className="h-5 w-5" />
              History
            </button>

            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <button
                onClick={() => {
                  setActiveTab("profile");
                  navigate("/profile");
                }}
                className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                  ${
                    activeTab === "profile"
                      ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                      : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                  }`}
              >
                <UserCircle className="h-5 w-5" />
                My Profile
              </button>

              <button
                onClick={handleLogout}
                className="relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 text-white hover:bg-red-500/20 rounded-r-full -ml-4 pl-10"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </nav>
        </>
    );
}

export default Sidebar;