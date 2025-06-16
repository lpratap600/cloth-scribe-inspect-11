import { useRef, useEffect, useCallback, useState } from 'react';
import type { Results as HandResults } from '@mediapipe/hands';
import GestureDetector, { type Circle } from '@/utils/gestureDetector';

interface UseGestureDetectionProps {
  handResults: HandResults | null;
  onCircleDetected: (circle: Circle) => void;
  isDetecting: boolean;
  onPhotoCaptureGesture: () => void;
  onClearGesture: () => void;
  isBusy: boolean;
}

export const useGestureDetection = ({
  handResults,
  onCircleDetected,
  isDetecting,
  onPhotoCaptureGesture,
  onClearGesture,
  isBusy
}: UseGestureDetectionProps) => {
  const gestureDetectorRef = useRef<GestureDetector>(new GestureDetector());
  const [drawingPath, setDrawingPath] = useState<{x: number, y: number}[]>([]);
  const lastGestureTimeRef = useRef<number>(0);
  const gestureHoldStartRef = useRef<number>(0);
  const photoGestureActiveRef = useRef<boolean>(false);
  const clearGestureActiveRef = useRef<boolean>(false);

  const clearCanvas = useCallback(() => {
    gestureDetectorRef.current.clearPoints();
    setDrawingPath([]);
  }, []);

  useEffect(() => {
    if (!handResults || !handResults.multiHandLandmarks || isBusy) {
      return;
    }

    const now = Date.now();
    
    // Cooldown period between gestures
    if (now - lastGestureTimeRef.current < 1000) {
      return;
    }

    const landmarks = handResults.multiHandLandmarks;
    
    // Check for photo gesture (thumbs up with both hands)
    if (landmarks.length === 2) {
      const isPhotoGesture = landmarks.every(hand => {
        const thumb_tip = hand[4];
        const thumb_ip = hand[3];
        const index_tip = hand[8];
        const middle_tip = hand[12];
        const ring_tip = hand[16];
        const pinky_tip = hand[20];
        
        // Thumb up: tip higher than IP joint
        const thumbUp = thumb_tip.y < thumb_ip.y;
        
        // Other fingers down: tips lower than knuckles
        const fingersDown = index_tip.y > hand[6].y && 
                           middle_tip.y > hand[10].y && 
                           ring_tip.y > hand[14].y && 
                           pinky_tip.y > hand[18].y;
        
        return thumbUp && fingersDown;
      });

      // Check for clear gesture (thumbs down with both hands)
      const isClearGesture = landmarks.every(hand => {
        const thumb_tip = hand[4];
        const thumb_ip = hand[3];
        const index_tip = hand[8];
        const middle_tip = hand[12];
        const ring_tip = hand[16];
        const pinky_tip = hand[20];
        
        // Thumb down: tip lower than IP joint
        const thumbDown = thumb_tip.y > thumb_ip.y;
        
        // Other fingers down: tips lower than knuckles
        const fingersDown = index_tip.y > hand[6].y && 
                           middle_tip.y > hand[10].y && 
                           ring_tip.y > hand[14].y && 
                           pinky_tip.y > hand[18].y;
        
        return thumbDown && fingersDown;
      });

      if (isPhotoGesture) {
        if (!photoGestureActiveRef.current) {
          photoGestureActiveRef.current = true;
          gestureHoldStartRef.current = now;
        } else if (now - gestureHoldStartRef.current > 2000) {
          onPhotoCaptureGesture();
          lastGestureTimeRef.current = now;
          photoGestureActiveRef.current = false;
        }
        return;
      } else {
        photoGestureActiveRef.current = false;
      }

      if (isClearGesture) {
        if (!clearGestureActiveRef.current) {
          clearGestureActiveRef.current = true;
          gestureHoldStartRef.current = now;
        } else if (now - gestureHoldStartRef.current > 1000) {
          onClearGesture();
          lastGestureTimeRef.current = now;
          clearGestureActiveRef.current = false;
        }
        return;
      } else {
        clearGestureActiveRef.current = false;
      }
    } else {
      photoGestureActiveRef.current = false;
      clearGestureActiveRef.current = false;
    }

    // Circle detection with single hand
    if (landmarks.length === 1 && isDetecting) {
      const hand = landmarks[0];
      const indexFinger = hand[8];
      const middleFinger = hand[12];
      const ringFinger = hand[16];
      const pinkyFinger = hand[20];
      
      // Check if only index finger is extended
      const indexExtended = indexFinger.y < hand[6].y;
      const othersDown = middleFinger.y > hand[10].y && 
                        ringFinger.y > hand[14].y && 
                        pinkyFinger.y > hand[18].y;
      
      if (indexExtended && othersDown) {
        const canvasWidth = 1280;
        const canvasHeight = 720;
        
        const point = {
          x: indexFinger.x * canvasWidth,
          y: indexFinger.y * canvasHeight
        };
        
        gestureDetectorRef.current.addPoint(point);
        setDrawingPath(gestureDetectorRef.current.getPoints());
        
        const circle = gestureDetectorRef.current.detectCircle();
        if (circle) {
          onCircleDetected(circle);
          lastGestureTimeRef.current = now;
        }
      }
    }
  }, [handResults, isDetecting, onCircleDetected, onPhotoCaptureGesture, onClearGesture, isBusy]);

  return {
    drawingPath,
    clearCanvas
  };
};
