"use client";

import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import GoogleMapsProvider from "@/components/GoogleMapsProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
