"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Download, Share, HelpCircle, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if already installed/standalone
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsStandalone(true);
      router.replace("/dashboard"); // Auto-redirect if already app
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [router]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p>Opening App...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/timedesk-icon.png"
              alt="Logo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Install TimeDesk
          </CardTitle>
          <CardDescription className="text-slate-600">
            Smart Attendance. Seamless Workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Android / Desktop Install Button */}
          {!isIOS && (
            <div className="space-y-3">
              <Button
                onClick={handleInstallClick}
                disabled={!deferredPrompt}
                className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:scale-[1.02]"
              >
                <Download className="mr-2 h-5 w-5" />
                {deferredPrompt
                  ? "Install App"
                  : "App Installed / Not Supported"}
              </Button>
              {!deferredPrompt && (
                <p className="text-xs text-center text-slate-400">
                  If the button is disabled, the app might already be installed
                  or your browser doesn't support automatic installation.
                </p>
              )}
            </div>
          )}

          {/* iOS Instructions */}
          {isIOS && (
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Share className="h-4 w-4" />
                How to Install on iOS
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                <li>
                  Tap the <span className="font-bold">Share</span> button in
                  Safari menu bar.
                </li>
                <li>
                  Scroll down and tap{" "}
                  <span className="font-bold">Add to Home Screen</span>.
                </li>
                <li>
                  Tap <span className="font-bold">Add</span> in the top right.
                </li>
              </ol>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/95 px-2 text-slate-500">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/dashboard")}
          >
            Continue in Browser
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
