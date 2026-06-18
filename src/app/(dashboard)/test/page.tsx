import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import HealthCheck from "./health-check";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export default function TestPage() {
    prefetch(trpc.health.queryOptions());
    return (
        <HydrateClient>
            <div className="flex flex-col gap-4 items-center justify-center p-8">
                <h1 className="text-2xl font-bold">Health Check</h1>
                <ErrorBoundary fallback={<div>Error</div>}>
                    <Suspense fallback={<div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            Loading...
                        </p>
                    </div>}>
                        <HealthCheck />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </HydrateClient>
    )
}