import { useState, useRef } from 'react';
import { Paperclip, X, Image, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';

interface FileAttachmentProps {
  userId: string;
  onFileAttached?: (urls: string[]) => void;
  onFileRemoved?: () => void;
  multiple?: boolean;
  maxFiles?: number;
}

export const FileAttachment = ({
  userId,
  onFileAttached,
  onFileRemoved,
  multiple = true,
  maxFiles = 5,
}: FileAttachmentProps) => {
  const [attachedFiles, setAttachedFiles] = useState<{ url: string; name: string; type: string; preview?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isUploading, uploadMultiple } = useFileUpload({
    onUploadComplete: (url: string, file: File) => {
      const newFile = { url, name: file.name, type: file.type };
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachedFiles(prev => {
            const updated = prev.map(f => 
              f.name === file.name ? { ...f, preview: e.target?.result as string } : f
            );
            return updated;
          });
        };
        reader.readAsDataURL(file);
      }
      
      setAttachedFiles(prev => [...prev, newFile]);
      
      // Notify parent with all URLs
      const urls = [...attachedFiles.map(f => f.url), url];
      onFileAttached?.(urls);
    },
    onError: (error: string) => {
      toast.error(error);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check max files
    if (attachedFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const fileArray = Array.from(files);
    const urls = await uploadMultiple(fileArray, userId);
    
    if (urls.length > 0) {
      toast.success(`${urls.length} file(s) uploaded successfully`);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        onFileRemoved?.();
      } else {
        onFileAttached?.(newFiles.map(f => f.url));
      }
      return newFiles;
    });
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Attachment Button */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple={multiple}
          accept="image/*,.pdf,.txt,.doc,.docx"
          className="hidden"
          disabled={isUploading}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5 rounded-full"
          onClick={triggerFileSelect}
          disabled={isUploading || attachedFiles.length >= maxFiles}
          title="Attach file"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </Button>
        {attachedFiles.length > 0 && (
          <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">
            {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Attached Files List */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-[#DA123E33] max-w-[200px]"
            >
              {file.preview ? (
                <img src={file.preview} alt={file.name} className="w-8 h-8 rounded object-cover" />
              ) : file.type.startsWith('image/') ? (
                <Image className="w-4 h-4 text-gray-400" />
              ) : (
                <File className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-[10px] text-white truncate flex-1">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};