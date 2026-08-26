"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { type ReactNode } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function GoogleMapsProvider({ children }: { children: ReactNode }) {
  if (!API_KEY) {
    return <>{children}</>;
  }
  return (
    <APIProvider apiKey={API_KEY}>
      {children}
    </APIProvider>
  );
}
