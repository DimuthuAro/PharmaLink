const KEY = "pharmalink_theme"; // "light" | "dark"

export const getTheme = () => {
  const saved = localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
};

export const setTheme = (theme) => {
  localStorage.setItem(KEY, theme);
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
};

export const initTheme = () => {
  setTheme(getTheme());
};
