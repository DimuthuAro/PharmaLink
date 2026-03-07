// src/components/UserAvatar.jsx
import React, { useMemo, useState } from "react";

const UserAvatar = ({ user, size = 40, className = "" }) => {
  const [imgError, setImgError] = useState(false);

  const initials = useMemo(() => {
    const name = user?.name?.trim() || "User";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.name]);

  const boxStyle = { width: size, height: size };

  const canShowImage = Boolean(user?.avatar) && !imgError;

  return canShowImage ? (
    <img
      src={user.avatar}
      alt={user?.name || "User"}
      style={boxStyle}
      className={`rounded-full object-cover ring-1 ring-slate-200 ${className}`}
      onError={() => setImgError(true)}
    />
  ) : (
    <div
      style={boxStyle}
      className={`rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center ${className}`}
    >
      <span className="text-blue-700 font-bold text-sm">{initials}</span>
    </div>
  );
};

export default UserAvatar;
