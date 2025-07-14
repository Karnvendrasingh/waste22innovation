"use client";
import React, { useState } from 'react';

const BACKEND_URL = 'http://localhost:5000';

export default function WasteScanner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ label: string; confidence: number; bbox: number[] } | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  // Full auto flow: detect -> suggest -> generate video
  const handleFullFlow = async () => {
    setLoading(true);
    setError(null);
    setDetected(null);
    setSuggestions(null);
    setVideoUrl(null);
    setAudioUrl(null);
    setSteps([]);
    setStep(0);
    setStatus('Detecting waste...');
    try {
      // 1. Detect
      const detectRes = await fetch(`${BACKEND_URL}/detect`, { method: 'POST' });
      if (!detectRes.ok) throw new Error('Detection failed');
      const detectData = await detectRes.json();
      if (!detectData.label) throw new Error('No object detected');
      setDetected(detectData);
      setStep(1);
      setStatus('Getting reuse suggestions...');
      // 2. Suggest
      const suggestRes = await fetch(`${BACKEND_URL}/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object: detectData.label }),
      });
      if (!suggestRes.ok) throw new Error('Suggestion failed');
      const suggestData = await suggestRes.json();
      let sugg: string[] = [];
      if (Array.isArray(suggestData.steps)) {
        sugg = suggestData.steps;
      } else if (Array.isArray(suggestData.suggestions)) {
        sugg = suggestData.suggestions;
      } else if (typeof suggestData.suggestions === 'string') {
        sugg = suggestData.suggestions.split(/\n|\r|\d+\.|\u2022|\-/).map((s: string) => s.trim()).filter(Boolean);
      }
      if (sugg.length < 3) throw new Error('Not enough suggestions received');
      setSuggestions(sugg.slice(0, 3));
      setSteps(sugg.slice(0, 3));
      setStep(2);
      setStatus('Generating instructional video...');
      // 3. Generate Video
      const videoRes = await fetch(`${BACKEND_URL}/generate_video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: sugg.slice(0, 3) }),
      });
      if (!videoRes.ok) throw new Error('Video generation failed');
      const videoData = await videoRes.json();
      setVideoUrl(`${BACKEND_URL}/files/${videoData.video}`);
      setAudioUrl(`${BACKEND_URL}/files/${videoData.audio}`);
      setStep(3);
      setStatus('Video ready!');
    } catch (err: any) {
      setError(err.message || 'Flow failed');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setDetected(null);
    setSuggestions(null);
    setVideoUrl(null);
    setAudioUrl(null);
    setSteps([]);
    setStep(0);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md flex flex-col items-center space-y-6">
      <h2 className="text-2xl font-bold text-green-700 mb-2">Waste Detection & Reuse System</h2>
      {error && (
        <div className="w-full bg-red-100 text-red-700 p-3 rounded mb-2 text-center">{error}</div>
      )}
      {loading && (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
          <span className="text-green-700">Processing...</span>
        </div>
      )}
      {status && !error && (
        <div className="w-full bg-blue-100 text-blue-700 p-2 rounded text-center mb-2">{status}</div>
      )}
      {!loading && step === 0 && (
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          onClick={handleFullFlow}
        >
          Detect Waste, Suggest, and Generate Video
        </button>
      )}
      {!loading && detected && (
        <div className="w-full flex flex-col items-center space-y-2">
          <div className="bg-green-50 border border-green-200 rounded p-3 w-full text-center">
            <div className="font-semibold">Detected Object:</div>
            <div className="text-lg text-green-800">{detected.label}</div>
            <div className="text-sm text-gray-500">Confidence: {(detected.confidence * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}
      {!loading && suggestions && (
        <div className="w-full flex flex-col items-center space-y-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 w-full text-center">
            <div className="font-semibold mb-1">Reuse Suggestions:</div>
            <ul className="list-disc list-inside text-left">
              {suggestions.map((s: string, i: number) => (
                <li key={i} className="text-gray-700">{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {!loading && step === 3 && videoUrl && (
        <div className="w-full flex flex-col items-center space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 w-full text-center">
            <div className="font-semibold mb-1">Instructional Video:</div>
            <video src={videoUrl} controls autoPlay className="w-full rounded mb-2" />
            {audioUrl && <audio src={audioUrl} controls className="w-full" />}
            {steps.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold">Steps:</div>
                <ul className="list-decimal list-inside text-left">
                  {steps.map((s: string, i: number) => (
                    <li key={i} className="text-gray-700">{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition"
            onClick={handleRetry}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
} 