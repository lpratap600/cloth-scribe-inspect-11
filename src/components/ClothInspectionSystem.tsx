import React, { useState, useRef, useCallback } from 'react';
import CameraFeed from './CameraFeed';
import InspectionResults from './InspectionResults';
import StatusPanel from './StatusPanel';
import { processImage } from '@/utils/imageProcessor';
import type { Circle } from '@/utils/gestureDetector';
import { ThumbsUp, MousePointer2, ThumbsDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);

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

    setTimeout(async () => {
      if (!cameraFeedRef.current) {
        setStatus('Error during capture. Please try again.');
        setIsDetecting(true);
        setCountdown(null);
        return;
      }
      
      const imageDataUrl = cameraFeedRef.current.captureFrame();

      if (imageDataUrl) {
        const annotatedImageSrc = await processImage(imageDataUrl, [circle]);
        
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

  const handleImageSelect = (image: CapturedImage) => {
    setSelectedImage(image);
  };

  const handleImageDelete = (id: string) => {
    setCapturedImages(prev => prev.filter(image => image.id !== id));
    setStatus('Image deleted.');
  };

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
    <div className="cis-container">
      <header className="cis-header">
        <h1 className="cis-title">Smart Cloth Inspection System</h1>
        <div className="cis-instructions">
          <div className="cis-instruction-item">
            <MousePointer2 className="cis-instruction-icon" />
            <p><span className="cis-instruction-text">Circle Defect:</span><br />Use one index finger to draw a circle.</p>
          </div>
          <div className="cis-instruction-item">
            <ThumbsUp className="cis-instruction-icon" />
            <p><span className="cis-instruction-text">Take Photo:</span><br />Hold thumbs-up with both hands for 2s.</p>
          </div>
          <div className="cis-instruction-item">
            <ThumbsDown className="cis-instruction-icon" />
            <p><span className="cis-instruction-text">Clear Canvas:</span><br />Hold thumbs-down with both hands for 1s.</p>
          </div>
        </div>
      </header>
      <div className="cis-main-content">
        <div className="cis-left-section">
          <div className="cis-camera-container">
            <CameraFeed
              ref={cameraFeedRef}
              onCircleDetected={handleCircleDetected}
              isDetecting={isDetecting}
              onPhotoCaptureGesture={handlePhotoCaptureGesture}
              onClearGesture={handleClearGesture}
              isBusy={countdown !== null}
            />
            {countdown !== null && countdown > 0 && (
              <div className="cis-countdown-overlay">
                <span className="cis-countdown-text">{countdown}</span>
              </div>
            )}
          </div>
          <StatusPanel status={status} onReset={handleReset} />
        </div>
        <div className="cis-right-section">
          <InspectionResults
            capturedImages={capturedImages}
            onImageSelect={handleImageSelect}
            onImageDelete={handleImageDelete}
          />
        </div>
      </div>

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)}>
          <DialogContent className="cis-dialog-content">
            <DialogHeader>
              <DialogTitle className="cis-dialog-title">Image Preview</DialogTitle>
            </DialogHeader>
            <img src={selectedImage.src} alt="Full screen inspection" className="cis-dialog-image" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClothInspectionSystem;
