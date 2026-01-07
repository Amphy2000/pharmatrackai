import { ReactNode, useEffect, useMemo, useState } from "react";
import { isExternalSupabaseConfigured } from "@/lib/supabase";
import {
  fetchExternalBackendConfig,
  readExternalBackendConfig,
} from "@/lib/externalBackendConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getExternalHost(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function ExternalBackendGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => isExternalSupabaseConfigured());
  const [checking, setChecking] = useState(!ready);

  const url = import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  const cached = useMemo(() => readExternalBackendConfig(), [ready]);

  const status = useMemo(
    () => ({
      // What the current deployed bundle sees
      urlSet: Boolean(url && url.trim() !== ""),
      keySet: Boolean(key && key.trim() !== ""),
      host: getExternalHost(url),

      // What we can load at runtime (cached or fetched)
      runtimeSet: Boolean(cached),
      runtimeHost: getExternalHost(cached?.url),
    }),
    [url, key, cached]
  );

  const runCheck = async () => {
    setChecking(true);
    try {
      // If build-time env isn't present, pull config at runtime and cache it.
      const cfg = await fetchExternalBackendConfig();
      setReady(Boolean(cfg) || isExternalSupabaseConfigured());
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (ready) return;
    void runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ready) return <>{children}</>;

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>External backend not configured</CardTitle>
          <CardDescription>
            Your published site is not seeing the external config yet. Well try loading it
            at runtime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Fix</AlertTitle>
            <AlertDescription>
              Ensure these Secrets exist, then click Retry:
              <ul className="list-disc pl-5 mt-2">
                <li>VITE_EXTERNAL_SUPABASE_URL</li>
                <li>VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              Bundle detected URL: <span className="font-medium">{String(status.urlSet)}</span>
              {status.host ? <span className="ml-2">({status.host})</span> : null}
            </div>
            <div>
              Bundle detected Publishable Key:{" "}
              <span className="font-medium">{String(status.keySet)}</span>
            </div>
            <div>
              Runtime config loaded: <span className="font-medium">{String(status.runtimeSet)}</span>
              {status.runtimeHost ? <span className="ml-2">({status.runtimeHost})</span> : null}
            </div>
            <div>
              App origin: <span className="font-medium">{window.location.origin}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={runCheck} disabled={checking}>
              {checking ? "Checking" : "Retry"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              disabled={checking}
            >
              Reload
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
