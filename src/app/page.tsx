import { ReactFlowProvider } from "@xyflow/react";
import TapestryCanvas from "@/components/TapestryCanvas";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-tapestry-bg">
      <ReactFlowProvider>
        <TapestryCanvas />
      </ReactFlowProvider>
    </main>
  );
}
