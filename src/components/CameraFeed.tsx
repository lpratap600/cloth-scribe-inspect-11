
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
          <p className="cf-loading-text">Please refresh the page and allow camera access</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '10px', 
              padding: '8px 16px', 
              backgroundColor: '#4f46e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="cf-container">
        <div className="cf-loading-container">
          <div style={{ textAlign: 'center' }}>
            <p className="cf-loading-text">Initializing camera and hand tracking...</p>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #4f46e5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '20px auto'
            }}></div>
            <p className="cf-loading-text" style={{ fontSize: '14px', color: '#888' }}>
              Check console (F12) for detailed logs
            </p>
          </div>
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
