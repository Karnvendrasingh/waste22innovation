import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function detectWaste(formData: FormData) {
  // formData should contain the webcam image or video frame
  const res = await axios.post(`${API_BASE}/detect`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { label: string; confidence: number; bbox: number[] };
}

export async function getReuseSuggestions(object: string) {
  const res = await axios.post(`${API_BASE}/suggest`, { object });
  return res.data as { suggestions: string[] };
}

export async function generateInstructionalVideo(steps: string[]) {
  const res = await axios.post(`${API_BASE}/generate_video`, { steps });
  return res.data as { video: string; audio: string };
} 