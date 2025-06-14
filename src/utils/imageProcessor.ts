
import type { Circle } from './gestureDetector';

export async function processImage(baseImageDataUrl: string, circles: Circle[]): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = baseImageDataUrl;
  });

  canvas.width = img.width;
  canvas.height = img.height;

  // The base image is already mirrored to match the preview.
  ctx.drawImage(img, 0, 0);

  // Draw the circles on the mirrored image. 
  // The circle coordinates are for the un-mirrored view, so we must flip the X-coordinate.
  circles.forEach((circle, index) => {
    const mirroredCircleX = canvas.width - circle.center.x;

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
