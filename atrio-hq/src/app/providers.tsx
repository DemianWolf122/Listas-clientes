"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { PresenceProvider } from "@/components/providers/PresenceProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <RealtimeProvider>
          <PresenceProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "rgb(var(--canvas))",
                  color: "rgb(var(--text))",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: "10px",
                  fontSize: "13px",
                },
              }}
            />
          </PresenceProvider>
        </RealtimeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
