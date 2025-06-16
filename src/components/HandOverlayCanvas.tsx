
import React from 'react';
import type { Results as HandResults } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import * as mpHands from '@mediapipe/hands';

interface HandOverlayCanvasProps {
  handResults: HandResults | null;
  drawingPath: {x: number, y: number}[];
}

const HandOverlayCanvas = React.forwardRef<HTMLCanvasElement, HandOverlayCanvasProps>(({ handResults, drawingPath }, ref) => {
  const internalCanvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useImperativeHandle(ref, () => internalCanvasRef.current!);

  React.useEffect(() => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (handResults && handResults.multiHandLandmarks) {
      for (const landmarks of handResults.multiHandLandmarks) {
        drawConnectors(ctx, landmarks, mpHands.HAND_CONNECTIONS, { color: '#0D9488', lineWidth: 2 });
        drawLandmarks(ctx, landmarks, { color: '#2563EB', lineWidth: 1, radius: 3 });
      }
    }

    if (drawingPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(drawingPath[0].x, drawingPath[0].y);
      for (let i = 1; i < drawingPath.length; i++) {
        ctx.lineTo(drawingPath[i].x, drawingPath[i].y);
      }
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }, [handResults, drawingPath]);

  return (
    <canvas
      ref={internalCanvasRef}
      className="absolute top-0 left-0 w-full h-full -scale-x-100"
      width="1280"
      height="720"
    />
  );
});

export default HandOverlayCanvas;
