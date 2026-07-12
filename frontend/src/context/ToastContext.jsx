import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = "success") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const toast = {
    success: (msg) => push(msg, "success"),
    error: (msg) => push(msg, "error"),
    info: (msg) => push(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`min-w-[280px] max-w-sm px-4 py-3 rounded-md border text-sm shadow-lg cursor-pointer
              animate-[slideIn_0.2s_ease-out]
              ${t.type === "success" ? "bg-green-500/10 border-green-500/40 text-green-300" : ""}
              ${t.type === "error" ? "bg-red-500/10 border-red-500/40 text-red-300" : ""}
              ${t.type === "info" ? "bg-blue-500/10 border-blue-500/40 text-blue-300" : ""}
            `}
          >
            <div className="flex items-start gap-2">
              <span>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
              <span className="flex-1">{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
