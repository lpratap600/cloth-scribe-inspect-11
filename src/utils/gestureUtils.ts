
import { LandmarkList } from '@mediapipe/hands';

export const isFingerExtended = (landmarks: LandmarkList, tipIndex: number, pipIndex: number): boolean => {
  const wrist = landmarks[0];
  const fingerPip = landmarks[pipIndex];
  const fingerTip = landmarks[tipIndex];

  if (!wrist || !fingerPip || !fingerTip) return false;
  
  const distTipToWrist = Math.hypot(fingerTip.x - wrist.x, fingerTip.y - wrist.y);
  const distPipToWrist = Math.hypot(fingerPip.x - wrist.x, fingerPip.y - wrist.y);
  
  return distTipToWrist > distPipToWrist * 1.1;
};

export const isThumbsDown = (landmarks: LandmarkList): boolean => {
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2]; // Metacarpophalangeal joint (base of thumb)

  if (!thumbTip || !thumbMcp) return false;

  // Thumb points down if tip is "lower" (higher y value) than its base joint.
  const thumbIsPointingDown = thumbTip.y > thumbMcp.y;
  
  // All other fingers should be curled (not extended).
  const indexIsExtended = isFingerExtended(landmarks, 8, 6);
  const middleIsExtended = isFingerExtended(landmarks, 12, 10);
  const ringIsExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyIsExtended = isFingerExtended(landmarks, 20, 18);

  return thumbIsPointingDown && !indexIsExtended && !middleIsExtended && !ringIsExtended && !pinkyIsExtended;
};

export const isThumbUp = (landmarks: LandmarkList): boolean => {
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];

  if (!thumbTip || !thumbMcp) return false;

  // Thumb points up if tip is "higher" (lower y value) than its base joint.
  const thumbIsPointingUp = thumbTip.y < thumbMcp.y;
  
  // All other fingers should be curled (not extended).
  const indexIsExtended = isFingerExtended(landmarks, 8, 6);
  const middleIsExtended = isFingerExtended(landmarks, 12, 10);
  const ringIsExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyIsExtended = isFingerExtended(landmarks, 20, 18);

  return thumbIsPointingUp && !indexIsExtended && !middleIsExtended && !ringIsExtended && !pinkyIsExtended;
};

export const detectThumbsDownGesture = (hand1: LandmarkList, hand2: LandmarkList): boolean => {
  return isThumbsDown(hand1) && isThumbsDown(hand2);
};

export const detectPhotoCaptureGesture = (hand1: LandmarkList, hand2: LandmarkList): boolean => {
  return isThumbUp(hand1) && isThumbUp(hand2);
};
