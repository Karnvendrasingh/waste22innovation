import React, { useState, useRef } from 'react';
import { Box, Typography, Card, CardContent, Button, CircularProgress, Stepper, Step, StepLabel, TextField, Alert, Stack } from '@mui/material';
import { detectWaste, getReuseSuggestions, generateInstructionalVideo } from '../lib/api';

const steps = [
  'Detect Waste Material',
  'Get Reuse Suggestions',
  'Generate Instructional Video',
];

export default function WasteDetectionFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Detection
  const [detected, setDetected] = useState<{ label: string; confidence: number; bbox: number[] } | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Suggestions
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  // Step 3: Video
  const [stepsInput, setStepsInput] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Handlers
  const handleDetect = async () => {
    setLoading(true);
    setError(null);
    setDetected(null);
    setSuggestions(null);
    setVideoUrl(null);
    setAudioUrl(null);
    try {
      if (!image) throw new Error('Please upload an image of the waste material.');
      const formData = new FormData();
      formData.append('file', image);
      const result = await detectWaste(formData);
      setDetected(result);
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message || 'Detection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setVideoUrl(null);
    setAudioUrl(null);
    try {
      if (!detected) throw new Error('No object detected.');
      const result = await getReuseSuggestions(detected.label);
      setSuggestions(result.suggestions);
      setStepsInput(result.suggestions);
      setActiveStep(2);
    } catch (err: any) {
      setError(err.message || 'Suggestion failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setAudioUrl(null);
    try {
      if (!stepsInput.length) throw new Error('No steps provided.');
      const result = await generateInstructionalVideo(stepsInput);
      setVideoUrl(result.video);
      setAudioUrl(result.audio);
      setActiveStep(3);
    } catch (err: any) {
      setError(err.message || 'Video generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = 'output_final.mp4';
      link.click();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2, color: 'success.main', fontWeight: 'bold' }}>
            Waste Detection & Reuse Flow
          </Typography>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Step 1: Detect Waste Material */}
          {activeStep === 0 && (
            <Stack spacing={2} alignItems="center">
              <Button variant="contained" component="label" color="primary">
                Upload Waste Image
                <input type="file" accept="image/*" hidden onChange={handleFileChange} ref={fileInputRef} />
              </Button>
              {image && <Typography variant="body2">Selected: {image.name}</Typography>}
              <Button variant="contained" color="success" onClick={handleDetect} disabled={loading || !image}>
                {loading ? <CircularProgress size={24} /> : 'Detect Waste Material'}
              </Button>
            </Stack>
          )}

          {/* Step 2: Get Reuse Suggestions */}
          {activeStep === 1 && detected && (
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6">Detected: {detected.label}</Typography>
              <Typography variant="body2">Confidence: {(detected.confidence * 100).toFixed(1)}%</Typography>
              <Button variant="contained" color="warning" onClick={handleSuggest} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Get Reuse Suggestions'}
              </Button>
            </Stack>
          )}

          {/* Step 3: Show Suggestions and Generate Video */}
          {activeStep === 2 && suggestions && (
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6">Reuse Suggestions:</Typography>
              <ol>
                {suggestions.map((s, i) => (
                  <li key={i}><Typography variant="body2">{s}</Typography></li>
                ))}
              </ol>
              <TextField
                label="Edit Steps (one per line)"
                multiline
                minRows={3}
                value={stepsInput.join('\n')}
                onChange={e => setStepsInput(e.target.value.split('\n'))}
                fullWidth
              />
              <Button variant="contained" color="info" onClick={handleGenerateVideo} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Generate Video'}
              </Button>
            </Stack>
          )}

          {/* Step 4: Show Video and Audio */}
          {activeStep === 3 && (videoUrl || audioUrl) && (
            <Stack spacing={2} alignItems="center">
              {videoUrl && <video src={videoUrl} controls style={{ maxWidth: '100%' }} />}
              {audioUrl && <audio src={audioUrl} controls />}
              {videoUrl && (
                <Button variant="outlined" color="primary" onClick={handleDownload}>
                  Download Video
                </Button>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
} 