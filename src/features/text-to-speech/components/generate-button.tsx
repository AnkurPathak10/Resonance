"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function GenerateButton({
    size,
    disabled,
    isSubmitting,
    onSubmit,
    className,
} : {
    size?: "default" | "sm";
    disabled?: boolean;
    isSubmitting?: boolean;
    onSubmit: () => void;
    className?: string;
}) {
    return(
        <Button
            size={size}
            disabled={disabled}
            onSubmit={onSubmit}
            className={className}
        >
            {isSubmitting ? (
                <>
                    <Spinner className="size-4 animate-spin" />
                    Generating...
                </>
            ) : (
                "Generate speech"
            )}
        </Button>
    )
}