"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useVoiceAvatar } from "./use-voice-avatar";

interface VoiceAvatarProps {
  seed: string;
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function VoiceAvatar({
  seed,
  name,
  size = "default",
  className,
}: VoiceAvatarProps) {
  const avatarUrl = useVoiceAvatar(seed);

  return (
    <Avatar size={size} className={cn("border-white shadow-xs", className)}>
      <AvatarImage src={avatarUrl} alt={name} />
      <AvatarFallback className="text-[8px]">
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}