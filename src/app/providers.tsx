'use client';

import StoreProvider from "@/state/redux";
import { Toaster } from "@/components/ui/sonner";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      {children}
      <Toaster />
    </StoreProvider>
  );
}
export default Providers;