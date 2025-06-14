
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { Hands, Results as HandResults } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import GestureDetector, { Circle } from '@/utils/gestureDetector';

interface CameraFeedProps {
  onCircleDetected: (circle: Circle) => void;
  isDetecting: boolean;
}

const CameraFeed = forwardRef(({ onCircleDetected, isDetecting }: CameraFeedProps, ref) => {
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
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const onResults = (results: HandResults) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#0D9488', lineWidth: 2 });
        drawLandmarks(ctx, landmarks, { color: '#2563EB', lineWidth: 1, radius: 3 });

        const indexFingerTip = landmarks[8];
        if (indexFingerTip) {
          const point = { x: indexFingerTip.x * canvas.width, y: indexFingerTip.y * canvas.height };
          
          if(isDetecting) {
            gestureDetector.current.addPoint(point);
            const circle = gestureDetector.current.detectCircle();
            if (circle) {
              onCircleDetected(circle);
            }
          }
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
      } else {
        if (isDetecting) {
            gestureDetector.current.clearPoints();
        }
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
  }, [onCircleDetected, isDetecting]);

  return (
    <>
      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black"><p>Starting camera...</p></div>}
      <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" playsInline />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full -scale-x-100" width="1280" height="720" />
    </>
  );
});

export default CameraFeed;
