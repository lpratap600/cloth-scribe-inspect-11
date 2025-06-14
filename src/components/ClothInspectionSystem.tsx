
import React, { useState, useRef, useCallback } from 'react';
import CameraFeed from './CameraFeed';
import InspectionResults from './InspectionResults';
import StatusPanel from './StatusPanel';
import { processImage } from '@/utils/imageProcessor';
import type { Circle } from '@/utils/gestureDetector';
import { ThumbsUp, MousePointer2, ThumbsDown } from 'lucide-react';

export interface CapturedImage {
  id: string;
  src: string;
  timestamp: string;
  defects: number;
}

const ClothInspectionSystem = () => {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);
  const [status, setStatus] = useState('Ready to inspect. Draw a circle around a defect.');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gestureCooldown, setGestureCooldown] = useState(false);

  const cameraFeedRef = useRef<{
    captureFrame: () => string | null;
    clearCanvas: () => void;
  }>(null);

  const handleCircleDetected = useCallback((circle: Circle) => {
    if (!isDetecting) return;

    setIsDetecting(false);
    setStatus('Circle detected! Capturing in...');

    let count = 2;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => {
      const videoElement = document.querySelector('video');
      if (!cameraFeedRef.current || !videoElement) {
        setStatus('Error during capture. Please try again.');
        setIsDetecting(true);
        setCountdown(null);
        return;
      }
      
      const imageDataUrl = cameraFeedRef.current.captureFrame();

      if (imageDataUrl) {
        const annotatedImageSrc = processImage(videoElement, [circle]);
        
        const newImage: CapturedImage = {
          id: `img-${Date.now()}`,
          src: annotatedImageSrc,
          timestamp: new Date().toLocaleTimeString(),
          defects: 1,
        };

        setCapturedImages(prev => [newImage, ...prev]);
        setStatus('Image captured and saved. Ready for next inspection.');
      } else {
        setStatus('Failed to capture image. Please try again.');
      }

      setCountdown(null);
      cameraFeedRef.current.clearCanvas();
      
      setTimeout(() => {
          setIsDetecting(true);
      }, 500); 

    }, 2000);

  }, [isDetecting]);

  const handlePhotoCaptureGesture = useCallback(() => {
    if (gestureCooldown || countdown !== null) return;

    setGestureCooldown(true);
    setStatus('Photo gesture detected! Capturing in...');

    let count = 2;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => {
      if (cameraFeedRef.current) {
        const imageDataUrl = cameraFeedRef.current.captureFrame();
        if (imageDataUrl) {
          const newImage: CapturedImage = {
            id: `img-${Date.now()}`,
            src: imageDataUrl,
            timestamp: new Date().toLocaleTimeString(),
            defects: 0,
          };
          setCapturedImages(prev => [newImage, ...prev]);
          setStatus('Photo captured. Ready for next inspection.');
        } else {
          setStatus('Failed to capture photo.');
        }
      }

      setCountdown(null);
      setTimeout(() => setGestureCooldown(false), 1000);
    }, 2000);
  }, [gestureCooldown, countdown]);

  const handleClearGesture = useCallback(() => {
    if (gestureCooldown || countdown !== null) return;

    setGestureCooldown(true);
    setStatus('Clear gesture detected! Clearing drawing...');
    
    if (cameraFeedRef.current) {
        cameraFeedRef.current.clearCanvas();
    }
    
    setTimeout(() => {
        setStatus('Drawing cleared. Ready to inspect.');
        setGestureCooldown(false);
    }, 1000);
  }, [gestureCooldown, countdown]);

  const handleReset = () => {
    setCapturedImages([]);
    setStatus('System reset. Ready to inspect.');
    if (cameraFeedRef.current) {
      cameraFeedRef.current.clearCanvas();
    }
    setIsDetecting(true);
    setCountdown(null);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col p-4 font-sans">
      <header className="text-center mb-4">
        <h1 className="text-3xl font-bold text-teal-400">Smart Cloth Inspection System</h1>
        <div className="text-gray-400 mt-4 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-center text-left gap-3 bg-ray-800 p-3 rounded-lg">
            <MousePointer2 className="h-6 w-6 text-teal-400 flex-shrink-0" />
            <p><span className="font-bold text-white">Circle Defect:</span><br />Use one index finger to draw a circle.</p>
          </div>
          <div className="flex items-center justify-center text-left gap-3 bg-gray-800 p-3 rounded-lg">
            <ThumbsUp className="h-6 w-6 text-teal-400 flex-shrink-0" />
            <p><span className="font-bold text-white">Take Photo:</span><br />Hold thumbs-up with both hands for 2s.</p>
          </div>
          <div className="flex items-center justify-center text-left gap-3 bg-gray-800 p-3 rounded-lg">
            <ThumbsDown className="h-6 w-6 text-teal-400 flex-shrink-0" />
            <p><span className="font-bold text-white">Clear Canvas:</span><br />Hold thumbs-down with both hands for 1s.</p>
          </div>
        </div>
      </header>
      <div className="flex-grow flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative aspect-video bg-black rounded-lg shadow-lg overflow-hidden">
            <CameraFeed
              ref={cameraFeedRef}
              onCircleDetected={handleCircleDetected}
              isDetecting={isDetecting}
              onPhotoCaptureGesture={handlePhotoCaptureGesture}
              onClearGesture={handleClearGesture}
              isBusy={countdown !== null}
            />
            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <span className="text-9xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}
          </div>
          <StatusPanel status={status} onReset={handleReset} />
        </div>
        <div className="w-full md:w-96">
          <InspectionResults capturedImages={capturedImages} />
        </div>
      </div>
    </div>
  );
};

export default ClothInspectionSystem;
