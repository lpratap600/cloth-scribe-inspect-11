
import React from 'react';
import type { CapturedImage } from './ClothInspectionSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InspectionResultsProps {
  capturedImages: CapturedImage[];
}

const InspectionResults = ({ capturedImages }: InspectionResultsProps) => {
  return (
    <Card className="h-full flex flex-col bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-teal-400">Inspection Results</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[calc(100vh-200px)] p-4">
          {capturedImages.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p>No defects captured yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {capturedImages.map((image) => (
                <div key={image.id} className="bg-gray-700 p-2 rounded-lg shadow">
                  <img src={image.src} alt="Captured inspection" className="rounded" />
                  <div className="text-xs text-gray-400 mt-2 flex justify-between">
                    <span>{image.timestamp}</span>
                    <span>{image.defects} defect(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default InspectionResults;
