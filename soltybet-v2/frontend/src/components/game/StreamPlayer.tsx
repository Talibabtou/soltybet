"use client";

import { useEffect, useState } from "react";

interface StreamPlayerProps {
  channel?: string;
  width?: string;
  height?: string;
}

export function StreamPlayer({
  channel = "saltybet",
  width = "100%",
  height = "400px",
}: StreamPlayerProps) {
  const [isClient, setIsClient] = useState(false);
  const [currentDomain, setCurrentDomain] = useState("localhost");

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.hostname);
    }
  }, []);

  if (!isClient) {
    return (
      <div
        className="bg-gray-900 rounded-lg flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="text-gray-400">Loading stream...</div>
      </div>
    );
  }

  // Use the faster popout method as default
  const streamUrl = `https://player.twitch.tv/?channel=${channel}&enableExtensions=true&muted=false&parent=${currentDomain}&parent=localhost&parent=127.0.0.1&player=popout&quality=auto&volume=1`;

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{ width, height }}
    >
      <iframe
        src={streamUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        allow="autoplay; fullscreen"
        className="absolute inset-0"
      />
    </div>
  );
}
