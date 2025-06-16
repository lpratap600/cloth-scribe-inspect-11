
import React from 'react';
import type { CapturedImage } from './ClothInspectionSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface InspectionResultsProps {
  capturedImages: CapturedImage[];
  onImageSelect: (image: CapturedImage) => void;
  onImageDelete: (id: string) => void;
}

const InspectionResults = ({ capturedImages, onImageSelect, onImageDelete }: InspectionResultsProps) => {
  return (
    <div className="ir-container">
      <div className="ir-header">
        <h3 className="ir-title">Inspection Results</h3>
      </div>
      <div className="ir-content">
        <div className="ir-scroll-area">
          {capturedImages.length === 0 ? (
            <div className="ir-empty-state">
              <p>No defects captured yet.</p>
            </div>
          ) : (
            <div className="ir-images-grid">
              {capturedImages.map((image) => (
                <div key={image.id} className="ir-image-item">
                  <img 
                    src={image.src} 
                    alt="Captured inspection" 
                    className="ir-image" 
                    onClick={() => onImageSelect(image)} 
                  />
                  <div className="ir-image-info">
                    <span>{image.timestamp}</span>
                    <span>{image.defects} defect(s)</span>
                    <button 
                      className="ir-delete-button"
                      onClick={() => onImageDelete(image.id)}
                      aria-label="Delete image"
                    >
                        <Trash2 className="ir-delete-icon" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionResults;
