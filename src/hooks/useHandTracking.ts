
import { useEffect, useRef, useState } from 'react';
import * as mpHands from '@mediapipe/hands';
import type { Results as HandResults } from '@mediapipe/hands';

interface UseHandTrackingProps {
  onResults: (results: HandResults) => void;
}

export const useHandTracking = ({ onResults }: UseHandTrackingProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  useEffect(() => {
    let isComponentMounted = true;
    let animationFrameId: number;

    const hands = new mpHands.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (isComponentMounted) {
        onResultsRef.current(results);
      }
    });

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
        })
        .catch(err => {
            console.error("Failed to get user media", err);
            setIsLoading(false);
        });
    }

    return () => {
      isComponentMounted = false;
      cancelAnimationFrame(animationFrameId);
      hands.close();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { videoRef, isLoading };
};
