"use client";
import React, { useRef, useState } from "react";
import { FaRecycle, FaVideo } from "react-icons/fa";

const navLinks = [
  { label: "HOME", href: "#" },
  { label: "CALCULATOR", href: "#" },
  { label: "GREEN DELIVERY", href: "#" },
  { label: "SUPPLIERS", href: "#" },
  { label: "NEWS", href: "#" },
  { label: "BULK ANALYSIS", href: "#" },
  { label: "ECO ADVISOR", href: "#" },
];

export default function WasteDetectionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<{ label: string; confidence: number } | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start webcam
  const startWebcam = async () => {
    setError(null);
    setStreaming(true);
    setDetected(null);
    setSuggestions(null);
    setVideoUrl(null);
    setAudioUrl(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } else {
      setError("Webcam not supported");
    }
  };

  // Detect waste
  const handleDetect = async () => {
    setDetecting(true);
    setError(null);
    setDetected(null);
    setSuggestions(null);
    setVideoUrl(null);
    setAudioUrl(null);
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 400, 300);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append("image", blob, "capture.jpg");
      try {
        // Detect
        const detectRes = await fetch("http://localhost:5000/upload", {
          method: "POST",
          body: formData,
        });
        const detectData = await detectRes.json();
        if (!detectData.label) throw new Error("No object detected");
        setDetected({ label: detectData.label, confidence: detectData.confidence });
        // Auto-stop camera
        if (videoRef.current && videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
        setStreaming(false);
        // Fetch suggestions
        setSuggestLoading(true);
        const suggestRes = await fetch("http://localhost:5000/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ object: detectData.label }),
        });
        const suggestData = await suggestRes.json();
        let sugg: string[] = [];
        if (Array.isArray(suggestData.steps)) {
          sugg = suggestData.steps;
        } else if (Array.isArray(suggestData.suggestions)) {
          sugg = suggestData.suggestions;
        } else if (typeof suggestData.suggestions === "string") {
          sugg = suggestData.suggestions
            .split(/\n|\r|\d+\./)
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        setSuggestions(sugg.slice(0, 3));
        setSuggestLoading(false);
      } catch (err: any) {
        setError(err.message || "Detection failed");
        setSuggestLoading(false);
      }
      setDetecting(false);
    }, "image/jpeg");
  };

  // Generate video
  const handleGenerateVideo = async () => {
    setVideoLoading(true);
    setError(null);
    setVideoUrl(null);
    setAudioUrl(null);
    try {
      const videoRes = await fetch("http://localhost:5000/generate_video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: suggestions }),
      });
      const videoData = await videoRes.json();
      if (!videoData.video) throw new Error("Video generation failed");
      setVideoUrl(`http://localhost:5000/files/${videoData.video}`);
      setAudioUrl(`http://localhost:5000/files/${videoData.audio}`);
    } catch (err: any) {
      setError(err.message || "Video generation failed");
    }
    setVideoLoading(false);
  };

  // Download video
  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = "output_final.mp4";
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between px-8 py-4 border-b shadow-sm bg-gray-50 gap-4">
        <div className="text-xl font-bold text-blue-600">🔷 EcoRetail</div>
        <nav className="flex flex-wrap gap-4 text-sm font-medium text-gray-700 justify-center">
          {navLinks.map(link => (
            <a key={link.label} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <div className="flex gap-2">
          <button className="px-4 py-1 border rounded text-sm">Login</button>
          <button className="px-4 py-1 bg-green-600 text-white rounded text-sm">Register</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4 md:px-10 py-12 max-w-6xl mx-auto">
        {/* Left - Object Detection */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">📸 Object Detection</h2>
          <p className="mb-4">
            Capture a waste item, detect it with <span className="font-semibold text-green-700">AI</span>, and get creative reuse ideas instantly!
          </p>
          <div className="rounded overflow-hidden border shadow-sm mb-4 relative w-full max-w-md mx-auto">
            <video ref={videoRef} width={400} height={300} className="w-full" autoPlay muted playsInline />
            <canvas ref={canvasRef} width={400} height={300} className="hidden" />
            {detected && (
              <div className="absolute bottom-0 left-0 w-full bg-black/70 text-white px-4 py-2 flex items-center gap-2 text-lg">
                <span className="font-bold">{detected.label.charAt(0).toUpperCase() + detected.label.slice(1)}</span>
                <span className="ml-2">Confidence: {(detected.confidence * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 mb-4 justify-center">
            <button
              className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-bold py-2 px-8 rounded-full shadow-lg transition disabled:opacity-60 text-lg"
              onClick={streaming ? handleDetect : startWebcam}
              disabled={detecting || (streaming && detecting)}
            >
              {streaming ? (detecting ? "Detecting..." : "🎯 Detect Waste") : "Start Webcam"}
            </button>
          </div>
          {error && <div className="text-red-600 text-center mt-2">{error}</div>}
          <div className="mt-4 text-center text-gray-500 italic">“One man’s waste is another man’s innovation.”</div>
        </section>

        {/* Right - Reuse Suggestions and Video */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <FaRecycle className="text-green-600" /> Reuse Suggestions
          </h2>
          {suggestLoading && (
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <svg className="animate-spin h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
              Loading suggestions...
            </div>
          )}
          {suggestions && (
            <ul className="list-disc list-inside space-y-2 text-base bg-white rounded-xl shadow p-4 mb-4">
              {suggestions.map((s, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: s.replace(/\b(Repurpose|DIY|Reuse|Upcycle|Recycle|Transform|Convert|Make|Create|Remove)\b/g, '<strong>$1</strong>') }} />
              ))}
            </ul>
          )}
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            onClick={handleGenerateVideo}
            disabled={!suggestions || videoLoading}
          >
            <FaVideo /> {videoLoading ? "Generating..." : "Generate Instructional Video"}
          </button>
          {videoUrl && (
            <div className="mt-4 bg-white rounded-xl shadow p-4">
              <video src={videoUrl} controls className="w-full max-w-md rounded border shadow mb-2" />
              {audioUrl && (
                <audio controls className="w-full max-w-md mb-2">
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              )}
              <div className="flex gap-3">
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded flex items-center gap-2"
                  onClick={handleDownload}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M3 16.5A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V14a1 1 0 10-2 0v2H5v-2a1 1 0 10-2 0v2.5z" /><path d="M7 10a1 1 0 012 0v3.586l.293-.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414l.293.293V10z" /></svg>
                  Download
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
} 