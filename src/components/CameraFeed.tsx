
import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useHandTracking } from '@/hooks/useHandTracking';
import HandOverlayCanvas from './HandOverlayCanvas';
import { useGestureDetection } from '@/hooks/useGestureDetection';
import type { Circle } from '@/utils/gestureDetector';
import type { Results as HandResults } from '@mediapipe/hands';

interface CameraFeedProps {
  onCircleDetected: (circle: Circle) => void;
  isDetecting: boolean;
  onPhotoCaptureGesture: () => void;
  onClearGesture: () => void;
  isBusy: boolean;
}

const CameraFeed = forwardRef<{
  captureFrame: () => string | null;
  clearCanvas: () => void;
}, CameraFeedProps>(({ onCircleDetected, isDetecting, onPhotoCaptureGesture, onClearGesture, isBusy }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handResults, setHandResults] = React.useState<HandResults | null>(null);

  const { videoRef, isLoading, error } = useHandTracking({
    onResults: (results: HandResults) => {
      setHandResults(results);
    }
  });

  const {
    drawingPath,
    clearCanvas
  } = useGestureDetection({
    handResults,
    onCircleDetected,
    isDetecting,
    onPhotoCaptureGesture,
    onClearGesture,
    isBusy
  });

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0);
      ctx.restore();
      
      return canvas.toDataURL('image/png');
    },
    clearCanvas
  }));

  if (error) {
    return (
      <div className="cf-container">
        <div className="cf-loading-container">
          <p className="cf-loading-text">Camera Error: {error}</p>
          <p className="cf-loading-text">Please allow camera access and refresh the page</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="cf-container">
        <div className="cf-loading-container">
          <p className="cf-loading-text">Loading camera...</p>
          <p className="cf-loading-text">Please allow camera access when prompted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cf-container">
      <video ref={videoRef} className="cf-video" playsInline muted />
      <HandOverlayCanvas ref={canvasRef} handResults={handResults} drawingPath={drawingPath} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
});

export default CameraFeed;
