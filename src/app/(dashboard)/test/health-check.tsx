"use client"

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export default function HealthCheck() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.health.queryOptions());
    return (
        <div className="rounded-lg border p-4 text-center">
           <p className="text-sm text-muted-foreground">
                {data.status}
           </p>
        </div>
    )
}