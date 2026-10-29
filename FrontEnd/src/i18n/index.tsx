import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ptBR } from "./pt-BR";
import { es } from "./es";

export type Lang = "pt-BR" | "es";
const dicts: Record<Lang, Record<string, string>> = { "pt-BR": ptBR, es };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt-BR");
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved && dicts[saved]) setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = dicts[lang][key] ?? dicts["pt-BR"][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}
