import React, { createContext, useContext, useMemo, useState } from "react";

type ThemeName = "light" | "dark";

type AppTheme = {
  name: ThemeName;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    text: string;
    textMuted: string;
    border: string;
    nav: string;
    navActive: string;
    accent: string;
    danger: string;
    success: string;
    input: string;
    overlay: string;
  };
  fonts: {
    regular: string;
  };
  toggleTheme: () => void;
};

const palettes = {
  light: {
    background: "#f3eccd",
    surface: "#f1e5ac",
    surfaceMuted: "#f1e5ac",
    text: "#231512",
    textMuted: "#777",
    border: "#9a9999",
    nav: "#f3eccd",
    navActive: "#231512",
    accent: "#f1e5ac",
    danger: "#c0392b",
    success: "#27ae60",
    input: "#f1e5ac",
    overlay: "rgba(0,0,0,0.5)",
  },
  dark: {
    background: "#040201",
    surface: "#040201",
    surfaceMuted: "#24262d",
    text: "#f1e5ac",
    textMuted: "#a8adb7",
    border: "#333741",
    nav: "#040201",
    navActive: "#f1e5ac",
    accent: "#f1e5ac",
    danger: "#d84d3f",
    success: "#35c878",
    input: "#24262d",
    overlay: "rgba(0,0,0,0.65)",
  },
};

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>("light");

  const value = useMemo<AppTheme>(
    () => ({
      name,
      colors: palettes[name],
      fonts: {
        regular: "Nippo-Medium",
      },
      toggleTheme: () =>
        setName((current) => (current === "light" ? "dark" : "light")),
    }),
    [name]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useAppTheme must be used inside ThemeProvider.");
  }

  return theme;
}
