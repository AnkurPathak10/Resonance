"use client"
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { COST_PER_UNIT, TEXT_MAX_LENGTH } from "../data/constants";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TextInputPanel() {
    const [text, setText] = useState("");
    
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
                <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_0%,black_calc(100%-6rem),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_calc(100%-6rem),transparent_100%)]">
                    <Textarea
                        placeholder="Start typing or paste your text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="field-sizing-fixed absolute inset-0 resize-none overflow-y-auto border-0 bg-transparent p-4 pb-20 lg:p-6 lg:pb-24 text-base! leading-relaxed tracking-tight shadow-none wrap-break-word focus-visible:ring-0"
                        maxLength={TEXT_MAX_LENGTH}
                    />
                </div>
            </div>

            <div className="relative z-20 shrink-0 bg-background p-4 lg:p-6">
                {/* Mobile layout */}
                <div className="flex flex-col gap-3 lg:hidden">
                    <Button className="w-full">Generate speech</Button>
                </div>
                {/* Desktop layout */}
                {text.length > 0 ? (
                    <div className="hidden lg:flex items-center justify-between">
                        <Badge variant="outline" className="gap-1.5 border-dashed">
                            <Coins className="size-3 text-chart-5" />
                            <span className="text-xs">
                                <span className="tabular-nums">
                                    ${(text.length * COST_PER_UNIT).toFixed(4)}
                                </span>{" "}
                                estimated
                            </span>
                        </Badge>
                        <div className="flex items-center gap-3">
                            <p className="text-xs tracking-tight">
                                {text.length.toLocaleString()}
                                <span className="text-muted-foreground">
                                    {" "}/{" "}{TEXT_MAX_LENGTH.toLocaleString()} characters
                                </span>
                            </p>
                            <Button size="sm">Generate speech</Button>
                        </div>
                    </div>
                ) : (
                    <div className="hidden lg:block">
                        <p className="text-sm text-muted-foreground">
                            Get started by typing or pasting your text here...
                        </p>

                    </div>
                )}
            </div>
        </div>
    )
}