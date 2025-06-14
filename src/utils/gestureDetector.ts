
export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Circle {
  center: { x: number; y: number };
  radius: number;
  points: Point[];
}

const CIRCLE_GESTURE_TIME_LIMIT = 3000; // 3 seconds to complete a circle
const MIN_POINTS_FOR_CIRCLE = 15; // Need at least 15 points
const CIRCLE_CONFIDENCE_THRESHOLD = 0.5; // Lowered for easier detection

export default class GestureDetector {
  private points: Point[] = [];

  addPoint(point: { x: number; y: number }) {
    this.points.push({ ...point, timestamp: Date.now() });
    if (this.points.length > 50) {
      this.points.shift();
    }
  }

  getPoints(): { x: number; y: number }[] {
    return this.points;
  }
  
  clearPoints() {
    this.points = [];
  }

  detectCircle(): Circle | null {
    this.removeOldPoints();
    if (this.points.length < MIN_POINTS_FOR_CIRCLE) {
      return null;
    }

    const startPoint = this.points[0];
    const endPoint = this.points[this.points.length - 1];
    
    const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    const pathBoundingBox = this.calculateBoundingBox(this.points);
    const pathDiameter = Math.max(pathBoundingBox.width, pathBoundingBox.height);
    
    if (distance > pathDiameter * 0.4) {
        return null;
    }

    const confidence = this.isCircular(this.points);

    if (confidence > CIRCLE_CONFIDENCE_THRESHOLD) {
      const center = {
        x: pathBoundingBox.x + pathBoundingBox.width / 2,
        y: pathBoundingBox.y + pathBoundingBox.height / 2,
      };
      const radius = pathDiameter / 2;
      return { center, radius, points: [...this.points] };
    }

    return null;
  }

  private removeOldPoints() {
    const now = Date.now();
    this.points = this.points.filter(p => now - p.timestamp < CIRCLE_GESTURE_TIME_LIMIT);
  }
  
  private calculateBoundingBox(points: Point[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private isCircular(points: Point[]): number {
    const n = points.length;
    if (n < 3) return 0;

    const boundingBox = this.calculateBoundingBox(points);
    const center = {
      x: boundingBox.x + boundingBox.width / 2,
      y: boundingBox.y + boundingBox.height / 2,
    };
    const radius = (boundingBox.width + boundingBox.height) / 4;

    if (radius === 0) return 0;

    let totalDistanceVariation = 0;
    for (const p of points) {
      const distFromCenter = Math.hypot(p.x - center.x, p.y - center.y);
      totalDistanceVariation += Math.abs(distFromCenter - radius);
    }
    
    const avgDistanceVariation = totalDistanceVariation / n;
    
    const confidence = Math.max(0, 1 - (avgDistanceVariation / radius));
    
    const aspectRatio = boundingBox.width / boundingBox.height;
    const aspectRatioPenalty = Math.min(aspectRatio, 1/aspectRatio);

    return confidence * aspectRatioPenalty;
  }
}
