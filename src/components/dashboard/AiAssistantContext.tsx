"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AiAssistantState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AiAssistantCtx = createContext<AiAssistantState | null>(null);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <AiAssistantCtx.Provider value={{ open, setOpen }}>{children}</AiAssistantCtx.Provider>;
}

export function useAiAssistant() {
  const ctx = useContext(AiAssistantCtx);
  if (!ctx) throw new Error("useAiAssistant, AiAssistantProvider içinde kullanılmalı");
  return ctx;
}
