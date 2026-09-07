"use client";

import "./auth.css";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Mic, AudioWaveform, Globe } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Voice Cloning",
    description: "Clone any voice with a short audio sample in seconds.",
  },
  {
    icon: AudioWaveform,
    title: "Text to Speech",
    description: "Convert text into natural, expressive speech with AI.",
  },
  {
    icon: Globe,
    title: "Team Collaboration",
    description: "Organize voices and generations within your team.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted until interaction
      });
    }
  }, []);

  return (
    <div className="auth-layout">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="auth-bg-video"
      >
        <source
          src="https://videos.pexels.com/video-files/11265968/11265968-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
        <source src="/auth-bg.mp4" type="video/mp4" />
      </video>

      {/* Atmospheric vignette overlay */}
      <div className="auth-bg-overlay" />

      {/* Content */}
      <div className="auth-content">
        {/* Left Side — Branding & Features */}
        <div className="auth-left">
          <div className="auth-left-inner">
            {/* Logo */}
            <div className="auth-logo">
              <Image
                src="/logo.svg"
                alt="Resonance"
                width={44}
                height={44}
              />
              <span className="auth-logo-text">Resonance</span>
            </div>

            {/* Hero Text */}
            <div className="auth-hero">
              <h1 className="auth-hero-title">
                Give your words
                <br />
                <span className="auth-hero-highlight">a voice.</span>
              </h1>
              <p className="auth-hero-subtitle">
                AI-powered text-to-speech and voice cloning platform.
                Create expressive speech or clone any voice in seconds.
              </p>
            </div>

            {/* Feature List */}
            <div className="auth-features">
              {features.map((feature) => (
                <div key={feature.title} className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <feature.icon size={24} strokeWidth={2} />
                  </div>
                  <div className="auth-feature-text">
                    <span className="auth-feature-title">{feature.title}</span>
                    <span className="auth-feature-desc">
                      {feature.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="auth-footer">
              © {new Date().getFullYear()} Resonance. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right Side — Clerk Auth */}
        <div className="auth-right">
          <div className="auth-right-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
