import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { Hands, Results as HandResults, LandmarkList, Handedness } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import GestureDetector, { Circle } from '@/utils/gestureDetector';
import { XSquare } from 'lucide-react';

interface CameraFeedProps {
  onCircleDetected: (circle: Circle) => void;
  isDetecting: boolean;
  onPhotoCaptureGesture: () => void;
  onClearGesture: () => void;
  isBusy: boolean;
}

const CameraFeed = forwardRef(({ onCircleDetected, isDetecting, onPhotoCaptureGesture, onClearGesture, isBusy }: CameraFeedProps, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureDetector = useRef<GestureDetector>(new GestureDetector());
  const [isLoading, setIsLoading] = useState(true);
  const [showClearGestureIndicator, setShowClearGestureIndicator] = useState(false);
  const photoGestureTimerRef = useRef<number | null>(null);
  const clearGestureTimerRef = useRef<number | null>(null);
  const GESTURE_HOLD_DURATION = 2000; // 2 seconds

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

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (canvasRef.current && videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
          ctx.scale(-1, 1);
          return canvas.toDataURL('image/jpeg');
        }
      }
      return null;
    },
    clearCanvas: () => {
      gestureDetector.current.clearPoints();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }));

  useEffect(() => {
    let isComponentMounted = true;
    let animationFrameId: number;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    const isFingerExtended = (landmarks: LandmarkList, tipIndex: number, pipIndex: number): boolean => {
      const wrist = landmarks[0];
      const fingerPip = landmarks[pipIndex];
      const fingerTip = landmarks[tipIndex];

      if (!wrist || !fingerPip || !fingerTip) return false;
      
      const distTipToWrist = Math.hypot(fingerTip.x - wrist.x, fingerTip.y - wrist.y);
      const distPipToWrist = Math.hypot(fingerPip.x - wrist.x, fingerPip.y - wrist.y);
      
      return distTipToWrist > distPipToWrist * 1.1;
    };

    const isThumbUp = (landmarks: LandmarkList): boolean => {
      const thumbIsExtended = isFingerExtended(landmarks, 4, 2);
      const indexIsExtended = isFingerExtended(landmarks, 8, 6);
      const middleIsExtended = isFingerExtended(landmarks, 12, 10);
      const ringIsExtended = isFingerExtended(landmarks, 16, 14);
      const pinkyIsExtended = isFingerExtended(landmarks, 20, 18);

      return thumbIsExtended && !indexIsExtended && !middleIsExtended && !ringIsExtended && !pinkyIsExtended;
    };

    const detectPhotoCaptureGesture = (hand1: LandmarkList, hand2: LandmarkList): boolean => {
      return isThumbUp(hand1) && isThumbUp(hand2);
    };

    const detectCrossedArms = (hand1: LandmarkList, hand2: LandmarkList, handedness: Handedness[]): boolean => {
      if (handedness.length < 2 || !handedness[0].label || !handedness[1].label || handedness[0].label === handedness[1].label) {
        return false;
      }

      const wrist1 = hand1[0];
      const wrist2 = hand2[0];
      if (!wrist1 || !wrist2) return false;

      let leftWrist, rightWrist;
      if (handedness[0].label === 'Left') {
        leftWrist = wrist1;
        rightWrist = wrist2;
      } else { // handedness[0].label must be 'Right'
        leftWrist = wrist2;
        rightWrist = wrist1;
      }

      // For crossed arms, left hand is on right side of body and vice versa.
      // In raw video coordinates: left hand x > right hand x.
      const areCrossed = leftWrist.x > rightWrist.x;
      
      const horizontalDistance = Math.abs(leftWrist.x - rightWrist.x);
      const areApart = horizontalDistance > 0.15;

      const verticalDistance = Math.abs(leftWrist.y - rightWrist.y);
      const areVerticallyClose = verticalDistance < 0.4;

      return areCrossed && areApart && areVerticallyClose;
    };

    const onResults = (results: HandResults) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let isDrawingAllowed = false;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#0D9488', lineWidth: 2 });
          drawLandmarks(ctx, landmarks, { color: '#2563EB', lineWidth: 1, radius: 3 });
        }

        const twoHands = results.multiHandLandmarks.length === 2 && results.multiHandedness;
        const isPhotoGesture = twoHands ? detectPhotoCaptureGesture(results.multiHandLandmarks[0], results.multiHandLandmarks[1]) : false;
        let isClearGesture = twoHands ? detectCrossedArms(results.multiHandLandmarks[0], results.multiHandLandmarks[1], results.multiHandedness) : false;

        // Prioritize photo gesture over clear gesture if both are detected
        if (isPhotoGesture) {
            isClearGesture = false;
        }

        setShowClearGestureIndicator(isClearGesture && !isBusyRef.current);

        // Photo gesture timer
        if (isPhotoGesture && !isBusyRef.current) {
            if (!photoGestureTimerRef.current) {
                photoGestureTimerRef.current = window.setTimeout(() => {
                    onPhotoCaptureGestureRef.current();
                    photoGestureTimerRef.current = null;
                }, GESTURE_HOLD_DURATION);
            }
        } else {
            if (photoGestureTimerRef.current) {
                clearTimeout(photoGestureTimerRef.current);
                photoGestureTimerRef.current = null;
            }
        }

        // Clear gesture timer
        if (isClearGesture && !isBusyRef.current) {
            if (!clearGestureTimerRef.current) {
                clearGestureTimerRef.current = window.setTimeout(() => {
                    onClearGestureRef.current();
                    clearGestureTimerRef.current = null;
                }, GESTURE_HOLD_DURATION);
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
          if (isFingerExtended(landmarks, 8, 6) && !isFingerExtended(landmarks, 12, 10)) {
            isDrawingAllowed = true;
            const indexFingerTip = landmarks[8];
            if (indexFingerTip) {
              const point = { x: indexFingerTip.x * canvas.width, y: indexFingerTip.y * canvas.height };
              
              if (isDetectingRef.current) {
                gestureDetector.current.addPoint(point);
                const circle = gestureDetector.current.detectCircle();
                if (circle) {
                  onCircleDetectedRef.current(circle);
                }
              }
            }
          }
        }
      } else {
        if (photoGestureTimerRef.current) {
          clearTimeout(photoGestureTimerRef.current);
          photoGestureTimerRef.current = null;
        }
        if (clearGestureTimerRef.current) {
          clearTimeout(clearGestureTimerRef.current);
          clearGestureTimerRef.current = null;
        }
        setShowClearGestureIndicator(false);
      }
      
      // The logic to clear points when drawing was not allowed has been removed
      // to prevent the path from disappearing unexpectedly.
      
      const path = gestureDetector.current.getPoints();
      if(path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for(let i=1; i<path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.strokeStyle = '#EA580C';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    };

    hands.onResults(onResults);

    const onFrame = async () => {
      if (videoRef.current && isComponentMounted) {
        await hands.send({ image: videoRef.current });
      }
      if (isComponentMounted) {
        animationFrameId = requestAnimationFrame(onFrame);
      }
    };

    if (videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
          if (!isComponentMounted || !videoRef.current) {
            stream.getTracks().forEach(track => track.stop());
            return;
          };
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (!isComponentMounted) return;
            setIsLoading(false);
            videoRef.current!.play();
            animationFrameId = requestAnimationFrame(onFrame);
          };
        });
    }

    return () => {
      isComponentMounted = false;
      cancelAnimationFrame(animationFrameId);
      hands.close();
      if (photoGestureTimerRef.current) clearTimeout(photoGestureTimerRef.current);
      if (clearGestureTimerRef.current) clearTimeout(clearGestureTimerRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <>
      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black"><p>Starting camera...</p></div>}
      <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" playsInline />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full -scale-x-100" width="1280" height="720" />
      {showClearGestureIndicator && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
          <div className="text-center text-white p-4 bg-gray-900 bg-opacity-75 rounded-lg">
            <XSquare className="h-16 w-16 mx-auto text-teal-400" />
            <p className="text-xl font-bold mt-2">Hold to Clear Canvas</p>
          </div>
        </div>
      )}
    </>
  );
});

export default CameraFeed;
