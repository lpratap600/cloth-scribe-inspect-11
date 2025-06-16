
import { useEffect, useRef, useState } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import type { Results as HandResults } from '@mediapipe/hands';

interface UseHandTrackingProps {
  onResults: (results: HandResults) => void;
}

export const useHandTracking = ({ onResults }: UseHandTrackingProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  useEffect(() => {
    let isComponentMounted = true;
    let animationFrameId: number;
    let hands: Hands;

    const initializeCamera = async () => {
      try {
        console.log('Requesting camera access...');
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported in this browser');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 1280, 
            height: 720,
            facingMode: 'user'
          } 
        });

        if (!isComponentMounted || !videoRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('Camera access granted, setting up video...');
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (!isComponentMounted || !videoRef.current) return;
          
          console.log('Video metadata loaded, starting playback...');
          videoRef.current.play().then(() => {
            console.log('Video playing, initializing MediaPipe...');
            initializeMediaPipe();
          }).catch(err => {
            console.error('Error playing video:', err);
            setError('Failed to start video playback');
            setIsLoading(false);
          });
        };

        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setError('Video playback error');
          setIsLoading(false);
        };

      } catch (err) {
        console.error("Failed to get user media:", err);
        setError('Camera access denied or not available');
        setIsLoading(false);
      }
    };

    const initializeMediaPipe = () => {
      try {
        console.log('Initializing MediaPipe Hands...');
        
        hands = new Hands({
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

        console.log('MediaPipe initialized, starting detection loop...');
        setIsLoading(false);
        animationFrameId = requestAnimationFrame(onFrame);

      } catch (err) {
        console.error('MediaPipe initialization error:', err);
        setError('Failed to initialize hand tracking');
        setIsLoading(false);
      }
    };

    const onFrame = async () => {
      if (videoRef.current && isComponentMounted && hands) {
        try {
          await hands.send({ image: videoRef.current });
        } catch (err) {
          console.error('MediaPipe processing error:', err);
        }
      }
      if (isComponentMounted) {
        animationFrameId = requestAnimationFrame(onFrame);
      }
    };

    // Start the initialization process
    initializeCamera();

    return () => {
      console.log('Cleaning up hand tracking...');
      isComponentMounted = false;
      cancelAnimationFrame(animationFrameId);
      
      if (hands) {
        hands.close();
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { videoRef, isLoading, error };
};
