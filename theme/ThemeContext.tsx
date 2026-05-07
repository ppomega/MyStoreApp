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
    background: "#f5f6fa",
    surface: "#fff",
    surfaceMuted: "#f8f2e2",
    text: "#000",
    textMuted: "#777",
    border: "#ddd",
    nav: "#f8f2e2",
    navActive: "#000",
    accent: "#fcc01e",
    danger: "#c0392b",
    success: "#27ae60",
    input: "#fff",
    overlay: "rgba(0,0,0,0.5)",
  },
  dark: {
    background: "#101114",
    surface: "#1b1d22",
    surfaceMuted: "#24262d",
    text: "#f5f6fa",
    textMuted: "#a8adb7",
    border: "#333741",
    nav: "#1b1d22",
    navActive: "#fcc01e",
    accent: "#fcc01e",
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
        regular: "JetBrains",
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
