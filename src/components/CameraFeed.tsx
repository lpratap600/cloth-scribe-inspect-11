
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { Hands, Results as HandResults, LandmarkList, Handedness } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import GestureDetector, { Circle } from '@/utils/gestureDetector';

interface CameraFeedProps {
  onCircleDetected: (circle: Circle) => void;
  isDetecting: boolean;
  onPhotoCaptureGesture: () => void;
  onClearGesture: () => void;
}

const CameraFeed = forwardRef(({ onCircleDetected, isDetecting, onPhotoCaptureGesture, onClearGesture }: CameraFeedProps, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureDetector = useRef<GestureDetector>(new GestureDetector());
  const [isLoading, setIsLoading] = useState(true);

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

    const detectPhotoCaptureGesture = (hand1: LandmarkList, hand2: LandmarkList): boolean => {
      const hand1Pointing = isFingerExtended(hand1, 8, 6) && !isFingerExtended(hand1, 12, 10);
      const hand2Pointing = isFingerExtended(hand2, 8, 6) && !isFingerExtended(hand2, 12, 10);

      if (hand1Pointing && hand2Pointing) {
        const indexTip1 = hand1[8];
        const indexTip2 = hand2[8];
        if (indexTip1 && indexTip2) {
          const distance = Math.hypot(indexTip1.x - indexTip2.x, indexTip1.y - indexTip2.y);
          if (distance < 0.1) {
            return true;
          }
        }
      }
      return false;
    };

    const detectCrossedHands = (hand1: LandmarkList, hand2: LandmarkList, handedness: Handedness[]): boolean => {
      if (handedness.length < 2 || !handedness[0].label || !handedness[1].label || handedness[0].label === handedness[1].label) {
        return false;
      }

      const wrist1 = hand1[0];
      const wrist2 = hand2[0];
      if (!wrist1 || !wrist2) return false;

      const leftHandWrist = handedness[0].label === 'Left' ? wrist1 : wrist2;
      const rightHandWrist = handedness[0].label === 'Right' ? wrist1 : wrist2;

      if (leftHandWrist.x < rightHandWrist.x && Math.abs(leftHandWrist.y - rightHandWrist.y) < 0.2) {
        return true;
      }
      return false;
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

        if (results.multiHandLandmarks.length === 2 && results.multiHandedness) {
          const hand1 = results.multiHandLandmarks[0];
          const hand2 = results.multiHandLandmarks[1];

          if (detectCrossedHands(hand1, hand2, results.multiHandedness)) {
            onClearGesture();
            return;
          }

          if (detectPhotoCaptureGesture(hand1, hand2)) {
            onPhotoCaptureGesture();
            return;
          }
        }

        if (results.multiHandLandmarks.length === 1) {
          const landmarks = results.multiHandLandmarks[0];
          if (isFingerExtended(landmarks, 8, 6) && !isFingerExtended(landmarks, 12, 10)) {
            isDrawingAllowed = true;
            const indexFingerTip = landmarks[8];
            if (indexFingerTip) {
              const point = { x: indexFingerTip.x * canvas.width, y: indexFingerTip.y * canvas.height };
              
              if (isDetecting) {
                gestureDetector.current.addPoint(point);
                const circle = gestureDetector.current.detectCircle();
                if (circle) {
                  onCircleDetected(circle);
                }
              }
            }
          }
        }
      }
      
      if (!isDrawingAllowed) {
        gestureDetector.current.clearPoints();
      }
      
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

    if (videoRef.current) {
      const camera = {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
          requestAnimationFrame(camera.onFrame);
        },
      };

      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
          videoRef.current!.srcObject = stream;
          videoRef.current!.onloadedmetadata = () => {
            setIsLoading(false);
            videoRef.current!.play();
            requestAnimationFrame(camera.onFrame);
          };
        });
    }

    return () => {
      hands.close();
    };
  }, [onCircleDetected, isDetecting, onPhotoCaptureGesture, onClearGesture]);

  return (
    <>
      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black"><p>Starting camera...</p></div>}
      <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" playsInline />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full -scale-x-100" width="1280" height="720" />
    </>
  );
});

export default CameraFeed;
