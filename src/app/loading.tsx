import { Header } from "@/components/layout/header";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-col flex items-center justify-center">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center flex flex-row gap-4 mt-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-2xl">Loading...</p>
        </div>
      </div>
    </div>
  );
}
