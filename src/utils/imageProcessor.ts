
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

  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, -videoWidth, 0, videoWidth, videoHeight);
  ctx.restore();

  circles.forEach((circle, index) => {
    ctx.beginPath();
    ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, 2 * Math.PI, false);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    const label = `${index + 1}`;
    const labelX = circle.center.x + circle.radius * 0.7;
    const labelY = circle.center.y - circle.radius * 0.7;
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(label, labelX, labelY);
  });

  return canvas.toDataURL('image/jpeg');
}
