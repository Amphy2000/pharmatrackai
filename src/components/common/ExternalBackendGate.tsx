import { ReactNode, useMemo } from "react";
import { isExternalSupabaseConfigured } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
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
  const url = import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  const status = useMemo(
    () => ({
      urlSet: Boolean(url && url.trim() !== ""),
      keySet: Boolean(key && key.trim() !== ""),
      host: getExternalHost(url)
    }),
    [url, key]
  );

  if (isExternalSupabaseConfigured) return <>{children}</>;

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>External backend not configured</CardTitle>
          <CardDescription>
            The app is locked to your external database and will not fall back.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Fix</AlertTitle>
            <AlertDescription>
              Add these Secrets (client-exposed) and then hard refresh:
              <ul className="list-disc pl-5 mt-2">
                <li>VITE_EXTERNAL_SUPABASE_URL</li>
                <li>VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              Detected URL: <span className="font-medium">{String(status.urlSet)}</span>
              {status.host ? (
                <span className="ml-2">({status.host})</span>
              ) : null}
            </div>
            <div>
              Detected Publishable Key: <span className="font-medium">{String(status.keySet)}</span>
            </div>
            <div>
              App origin: <span className="font-medium">{window.location.origin}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
