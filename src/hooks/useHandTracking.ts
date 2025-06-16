
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
    let stream: MediaStream | null = null;

    const initializeCamera = async () => {
      try {
        console.log('🎥 Step 1: Requesting camera access...');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported in this browser');
        }

        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });

        if (!isComponentMounted || !videoRef.current) {
          console.log('❌ Component unmounted during camera setup');
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          return;
        }

        console.log('✅ Step 2: Camera access granted, setting up video...');
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }

          const video = videoRef.current;
          
          const handleLoadedMetadata = () => {
            console.log('✅ Step 3: Video metadata loaded');
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = (err: Event) => {
            console.error('❌ Video error:', err);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Video loading failed'));
          };

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);
        });

        if (!isComponentMounted || !videoRef.current) return;

        console.log('✅ Step 4: Starting video playback...');
        await videoRef.current.play();
        console.log('✅ Step 5: Video is playing, initializing MediaPipe...');
        
        await initializeMediaPipe();

      } catch (err) {
        console.error("❌ Camera initialization failed:", err);
        if (isComponentMounted) {
          setError(err instanceof Error ? err.message : 'Camera access failed');
          setIsLoading(false);
        }
      }
    };

    const initializeMediaPipe = async () => {
      try {
        console.log('🤖 Step 6: Creating MediaPipe Hands instance...');
        
        hands = new Hands({
          locateFile: (file) => {
            const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            console.log(`📦 Loading MediaPipe file: ${url}`);
            return url;
          },
        });

        console.log('🤖 Step 7: Setting MediaPipe options...');
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        console.log('🤖 Step 8: Setting up results handler...');
        hands.onResults((results) => {
          if (isComponentMounted) {
            onResultsRef.current(results);
          }
        });

        console.log('✅ Step 9: MediaPipe initialized successfully!');
        
        if (isComponentMounted) {
          setIsLoading(false);
          setError(null);
          console.log('🚀 Step 10: Starting detection loop...');
          animationFrameId = requestAnimationFrame(onFrame);
        }

      } catch (err) {
        console.error('❌ MediaPipe initialization error:', err);
        if (isComponentMounted) {
          setError('Failed to initialize hand tracking');
          setIsLoading(false);
        }
      }
    };

    const onFrame = async () => {
      if (videoRef.current && isComponentMounted && hands) {
        try {
          await hands.send({ image: videoRef.current });
        } catch (err) {
          console.error('❌ MediaPipe processing error:', err);
        }
      }
      if (isComponentMounted) {
        animationFrameId = requestAnimationFrame(onFrame);
      }
    };

    // Start the initialization process
    initializeCamera();

    return () => {
      console.log('🧹 Cleaning up hand tracking...');
      isComponentMounted = false;
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (hands) {
        try {
          hands.close();
        } catch (err) {
          console.error('Error closing MediaPipe:', err);
        }
      }
      
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped camera track');
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { videoRef, isLoading, error };
};
