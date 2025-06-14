
import React, { useRef, useImperativeHandle, forwardRef, useState, useCallback, useEffect } from 'react';
import { Results as HandResults } from '@mediapipe/hands';
import GestureDetector, { Circle } from '@/utils/gestureDetector';
import { ThumbsDown } from 'lucide-react';
import { useHandTracking } from '@/hooks/useHandTracking';
import { isFingerExtended, detectPhotoCaptureGesture, detectThumbsDownGesture } from '@/utils/gestureUtils';
import HandOverlayCanvas from './HandOverlayCanvas';

interface CameraFeedProps {
  onCircleDetected: (circle: Circle) => void;
  isDetecting: boolean;
  onPhotoCaptureGesture: () => void;
  onClearGesture: () => void;
  isBusy: boolean;
}

const PHOTO_GESTURE_HOLD_DURATION = 2000; // 2 seconds
const CLEAR_GESTURE_HOLD_DURATION = 1000; // 1 second
const POINT_HOLD_DURATION = 1000; // 1 second to trigger capture
const POINT_HOLD_RADIUS = 15; // Finger must stay within a 15px radius

const CameraFeed = forwardRef(({ onCircleDetected, isDetecting, onPhotoCaptureGesture, onClearGesture, isBusy }: CameraFeedProps, ref) => {
  const [handResults, setHandResults] = useState<HandResults | null>(null);
  const [drawingPath, setDrawingPath] = useState<{x: number, y: number}[]>([]);
  const gestureDetector = useRef<GestureDetector>(new GestureDetector());
  const [showClearGestureIndicator, setShowClearGestureIndicator] = useState(false);
  const [pointingPosition, setPointingPosition] = useState<{x: number, y: number, timestamp: number} | null>(null);
  
  const photoGestureTimerRef = useRef<number | null>(null);
  const clearGestureTimerRef = useRef<number | null>(null);
  const pointHoldTimerRef = useRef<number | null>(null);
  
  const onCircleDetectedRef = useRef(onCircleDetected);
  onCircleDetectedRef.current = onCircleDetected;
  
  const onPhotoCaptureGestureRef = useRef(onPhotoCaptureGesture);
  onPhotoCaptureGestureRef.current = onPhotoCaptureGesture;

  const onClearGestureRef = useRef(onClearGesture);
  onClearGestureRef.current = onClearGesture;
  
  const isDetectingRef = useRef(isDetecting);
  isDetectingRef.current = isDetecting;

  const isBusyRef = useRef(isBusy);
  isBusyRef.current = isBusy;

  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleHandResults = useCallback((results: HandResults) => {
    setHandResults(results);

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const twoHands = results.multiHandLandmarks.length === 2;
      let isPhotoGesture = twoHands ? detectPhotoCaptureGesture(results.multiHandLandmarks[0], results.multiHandLandmarks[1]) : false;
      let isClearGesture = twoHands ? detectThumbsDownGesture(results.multiHandLandmarks[0], results.multiHandLandmarks[1]) : false;

      if (isPhotoGesture) {
          isClearGesture = false;
      }

      setShowClearGestureIndicator(isClearGesture && !isBusyRef.current);

      if (isPhotoGesture && !isBusyRef.current) {
          if (!photoGestureTimerRef.current) {
              photoGestureTimerRef.current = window.setTimeout(() => {
                  onPhotoCaptureGestureRef.current();
                  photoGestureTimerRef.current = null;
              }, PHOTO_GESTURE_HOLD_DURATION);
          }
      } else {
          if (photoGestureTimerRef.current) {
              clearTimeout(photoGestureTimerRef.current);
              photoGestureTimerRef.current = null;
          }
      }

      if (isClearGesture && !isBusyRef.current) {
          if (!clearGestureTimerRef.current) {
              clearGestureTimerRef.current = window.setTimeout(() => {
                  onClearGestureRef.current();
                  clearGestureTimerRef.current = null;
              }, CLEAR_GESTURE_HOLD_DURATION);
          }
      } else {
          if (clearGestureTimerRef.current) {
              clearTimeout(clearGestureTimerRef.current);
              clearGestureTimerRef.current = null;
          }
      }
      
      const noTwoHandGestureActive = !isPhotoGesture && !isClearGesture;

      if (results.multiHandLandmarks.length === 1 && noTwoHandGestureActive) {
        const landmarks = results.multiHandLandmarks[0];
        const isPointing = isFingerExtended(landmarks, 8, 6) && !isFingerExtended(landmarks, 12, 10);
        
        if (isPointing && isDetectingRef.current) {
          const indexFingerTip = landmarks[8];
          const point = { x: indexFingerTip.x * canvas.width, y: indexFingerTip.y * canvas.height };
          
          // 1. Check for drawn circle first
          gestureDetector.current.addPoint(point);
          const drawnCircle = gestureDetector.current.detectCircle();
          if (drawnCircle) {
            onCircleDetectedRef.current(drawnCircle);
            if (pointHoldTimerRef.current) clearTimeout(pointHoldTimerRef.current);
            pointHoldTimerRef.current = null;
            setPointingPosition(null);
            return;
          }

          // 2. If no drawn circle, check for hold gesture
          if (pointingPosition && Math.hypot(point.x - pointingPosition.x, point.y - pointingPosition.y) < POINT_HOLD_RADIUS) {
            if (!pointHoldTimerRef.current) {
              pointHoldTimerRef.current = window.setTimeout(() => {
                const heldCircle: Circle = {
                  center: { x: pointingPosition.x, y: pointingPosition.y },
                  radius: 120, // A fixed radius for the hold gesture
                  points: [] 
                };
                onCircleDetectedRef.current(heldCircle);
                pointHoldTimerRef.current = null;
                setPointingPosition(null);
              }, POINT_HOLD_DURATION);
            }
          } else {
            // Finger moved, so reset hold timer and update position
            if (pointHoldTimerRef.current) clearTimeout(pointHoldTimerRef.current);
            pointHoldTimerRef.current = null;
            setPointingPosition({ ...point, timestamp: Date.now() });
          }
        } else {
            // Not pointing or not detecting, so reset hold state
            if (pointHoldTimerRef.current) clearTimeout(pointHoldTimerRef.current);
            pointHoldTimerRef.current = null;
            setPointingPosition(null);
        }
      } else if (results.multiHandLandmarks.length !== 1) {
          // Not one hand, so reset hold state
          if (pointHoldTimerRef.current) clearTimeout(pointHoldTimerRef.current);
          pointHoldTimerRef.current = null;
          setPointingPosition(null);
      }
    } else {
      // No hands detected, clear all timers
      if (photoGestureTimerRef.current) clearTimeout(photoGestureTimerRef.current);
      if (clearGestureTimerRef.current) clearTimeout(clearGestureTimerRef.current);
      if (pointHoldTimerRef.current) clearTimeout(pointHoldTimerRef.current);
      photoGestureTimerRef.current = null;
      clearGestureTimerRef.current = null;
      pointHoldTimerRef.current = null;
      setShowClearGestureIndicator(false);
      setPointingPosition(null);
    }
    
    setDrawingPath([...gestureDetector.current.getPoints()]);
  }, [pointingPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  const { videoRef, isLoading } = useHandTracking({ onResults: handleHandResults });

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          // Flip the context horizontally to match the live preview
          ctx.scale(-1, 1);
          // Draw the video frame
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
          
          return canvas.toDataURL('image/jpeg');
        }
      }
      return null;
    },
    clearCanvas: () => {
      gestureDetector.current.clearPoints();
      setDrawingPath([]);
    }
  }));
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (photoGestureTimerRef.current) clearTimeout(photoGestureTimerRef.current);
      if (clearGestureTimerRef.current) clearTimeout(clearGestureTimerRef.current);
      if (pointHoldTimerRef.current) clearTimeout(pointHoldTimerRef.current);
    };
  }, []);

  return (
    <>
      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black"><p>Starting camera...</p></div>}
      <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" playsInline />
      <HandOverlayCanvas ref={overlayCanvasRef} handResults={handResults} drawingPath={drawingPath} />
      {showClearGestureIndicator && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
          <div className="text-center text-white p-4 bg-gray-900 bg-opacity-75 rounded-lg">
            <ThumbsDown className="h-16 w-16 mx-auto text-teal-400" />
            <p className="text-xl font-bold mt-2">Hold to Clear Canvas</p>
          </div>
        </div>
      )}
    </>
  );
});

export default CameraFeed;
