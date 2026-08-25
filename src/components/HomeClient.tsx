"use client";

import { ReactFlowProvider } from "@xyflow/react";
import TapestryCanvas from "@/components/TapestryCanvas";
import AuthProvider from "@/components/AuthProvider";

export default function HomeClient() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-tapestry-bg">
      <AuthProvider>
        <ReactFlowProvider>
          <TapestryCanvas />
        </ReactFlowProvider>
      </AuthProvider>
    </main>
  );
}
