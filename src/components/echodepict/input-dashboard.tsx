'use client';

import { useState, useCallback, DragEvent } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UploadCloud, Loader2, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type InputDashboardProps = {
  onCompose: (input: { type: 'csv' | 'text'; data: string }) => void;
  isLoading: boolean;
};

export function InputDashboard({ onCompose, isLoading }: InputDashboardProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'csv'>('text');
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFile = (selectedFile: File) => {
    if (selectedFile && selectedFile.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = () => {
        setFile(selectedFile);
        setFileContent(reader.result as string);
      };
      reader.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'File Read Error',
          description: 'Could not read the selected file.',
        });
      };
      reader.readAsText(selectedFile);
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a valid .csv file.',
      });
    }
  };

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, []);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (activeTab === 'text' && textInput) {
      onCompose({ type: 'text', data: textInput });
    } else if (activeTab === 'csv' && fileContent) {
      onCompose({ type: 'csv', data: fileContent });
    }
  };

  const isSubmitDisabled =
    isLoading ||
    (activeTab === 'text' && !textInput.trim()) ||
    (activeTab === 'csv' && !fileContent);

  return (
    <Card className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'csv')} className="flex flex-col flex-1">
        <CardHeader>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Describe Concept</TabsTrigger>
            <TabsTrigger value="csv">Upload Data</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="flex-1">
          <TabsContent value="text" className="h-full mt-0">
            <Textarea
              placeholder="Describe a complex process or story for the agents to interpret, e.g., 'the complete lifecycle of a star from nebula to black hole'"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="h-full resize-none"
              disabled={isLoading}
            />
          </TabsContent>
          <TabsContent value="csv" className="h-full mt-0">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                'h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-4 transition-colors',
                isDragging ? 'border-primary bg-primary/10' : 'border-border'
              )}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-primary" />
                    <p className="font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                    <Button variant="link" size="sm" onClick={() => {setFile(null); setFileContent(null);}} disabled={isLoading}>
                      Remove file
                    </Button>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="font-semibold">Drag & drop a CSV file</p>
                  <p className="text-muted-foreground text-sm">or</p>
                  <Button variant="outline" size="sm" asChild className="mt-2">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Browse Files
                    </label>
                  </Button>
                  <input id="file-upload" type="file" accept=".csv" className="sr-only" onChange={handleManualUpload} disabled={isLoading} />
                </>
              )}
            </div>
          </TabsContent>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Composing...
              </>
            ) : (
              'Compose with AI Agents'
            )}
          </Button>
        </CardFooter>
      </Tabs>
    </Card>
  );
}
