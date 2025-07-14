"use client";
import React, { useState } from "react";

const API_BASE = "http://localhost:5000";

export default function ObjectDetectionCard() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "start" | "stop") => {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Failed to ${action} detection`);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} detection`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Object Detection System</h2>
      <p className="text-gray-600 mb-6 text-center">
        Detect objects like paper sheets and trigger relevant videos using AI.
      </p>
      <div className="flex gap-4 mb-4">
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-60"
          onClick={() => handleAction("start")}
          disabled={loading === "start"}
        >
          {loading === "start" ? "Starting..." : "Start Detection"}
        </button>
        <button
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-60"
          onClick={() => handleAction("stop")}
          disabled={loading === "stop"}
        >
          {loading === "stop" ? "Stopping..." : "Stop Detection"}
        </button>
      </div>
      {error && <div className="text-red-500 mb-2 text-center">{error}</div>}
      <div className="w-full flex justify-center mt-4">
        {/* Live webcam feed */}
        <img
          src="http://localhost:5000/video_feed"
          alt="Live Webcam Feed"
          className="rounded-lg border border-gray-200 max-h-64 object-contain bg-black"
          style={{ width: "100%", maxWidth: 320 }}
        />
      </div>
    </div>
  );
} 