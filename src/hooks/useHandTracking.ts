
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
  const initializationRef = useRef<boolean>(false);
  const cleanupRef = useRef<() => void>();
  
  onResultsRef.current = onResults;

  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) {
      console.log('🔄 Initialization already in progress, skipping...');
      return;
    }

    initializationRef.current = true;
    let isComponentMounted = true;
    let animationFrameId: number;
    let hands: Hands;
    let stream: MediaStream | null = null;

    const cleanup = () => {
      console.log('🧹 Starting cleanup...');
      isComponentMounted = false;
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (hands) {
        try {
          hands.close();
          console.log('✅ MediaPipe hands closed');
        } catch (err) {
          console.error('❌ Error closing MediaPipe:', err);
        }
      }
      
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped camera track');
        });
      }

      initializationRef.current = false;
      console.log('🧹 Cleanup completed');
    };

    cleanupRef.current = cleanup;

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

        if (!isComponentMounted) {
          console.log('❌ Component unmounted during camera setup');
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          return;
        }

        if (!videoRef.current) {
          console.log('❌ Video ref not available');
          return;
        }

        console.log('✅ Step 2: Camera access granted, setting up video...');
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current || !isComponentMounted) {
            reject(new Error('Video element not available or component unmounted'));
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

        if (!isComponentMounted || !videoRef.current) {
          console.log('❌ Component unmounted during video setup');
          return;
        }

        console.log('✅ Step 4: Starting video playback...');
        await videoRef.current.play();
        
        if (!isComponentMounted) {
          console.log('❌ Component unmounted during video play');
          return;
        }

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
        if (!isComponentMounted) {
          console.log('❌ Component unmounted during MediaPipe init');
          return;
        }

        console.log('🤖 Step 6: Creating MediaPipe Hands instance...');
        
        hands = new Hands({
          locateFile: (file) => {
            const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            console.log(`📦 Loading MediaPipe file: ${url}`);
            return url;
          },
        });

        if (!isComponentMounted) {
          console.log('❌ Component unmounted during MediaPipe creation');
          return;
        }

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

        if (!isComponentMounted) {
          console.log('❌ Component unmounted during MediaPipe setup');
          return;
        }

        console.log('✅ Step 9: MediaPipe initialized successfully!');
        
        setIsLoading(false);
        setError(null);
        console.log('🚀 Step 10: Starting detection loop...');
        animationFrameId = requestAnimationFrame(onFrame);

      } catch (err) {
        console.error('❌ MediaPipe initialization error:', err);
        if (isComponentMounted) {
          setError('Failed to initialize hand tracking');
          setIsLoading(false);
        }
      }
    };

    const onFrame = async () => {
      if (!isComponentMounted) return;
      
      if (videoRef.current && hands) {
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

    // Small delay to ensure component is stable before initialization
    const initTimer = setTimeout(() => {
      if (isComponentMounted) {
        initializeCamera();
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return { videoRef, isLoading, error };
};
