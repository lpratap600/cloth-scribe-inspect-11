
import type { Circle } from './gestureDetector';

export function processImage(videoElement: HTMLVideoElement, circles: Circle[]): string {
  const canvas = document.createElement('canvas');
  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  // Draw the mirrored video frame to match the live preview
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, -videoWidth, 0, videoWidth, videoHeight);
  ctx.restore();

  // Draw the circles on the mirrored image. We need to mirror their x-coordinates.
  circles.forEach((circle, index) => {
    const mirroredCircleX = videoWidth - circle.center.x;

    ctx.beginPath();
    ctx.arc(mirroredCircleX, circle.center.y, circle.radius, 0, 2 * Math.PI, false);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    const label = `${index + 1}`;
    // The label position also needs to be mirrored to appear correctly.
    const labelX = mirroredCircleX - circle.radius * 0.7;
    const labelY = circle.center.y - circle.radius * 0.7;
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(label, labelX, labelY);
  });

  return canvas.toDataURL('image/jpeg');
}
