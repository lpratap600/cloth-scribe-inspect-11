
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StatusPanelProps {
  status: string;
  onReset: () => void;
}

const StatusPanel = ({ status, onReset }: StatusPanelProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-4 flex items-center justify-between">
        <p className="text-lg text-gray-300">{status}</p>
        <Button onClick={onReset} variant="destructive">Reset Session</Button>
      </CardContent>
    </Card>
  );
};

export default StatusPanel;
