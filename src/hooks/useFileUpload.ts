import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseFileUploadOptions {
  bucket?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onUploadComplete?: (url: string, file: File) => void;
  onError?: (error: string) => void;
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const {
    bucket = 'chat-attachments',
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
    onUploadComplete,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string; type: string }[]>([]);

  // Validate file
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
    }
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} is not supported` };
    }
    return { valid: true };
  }, [maxSize, allowedTypes]);

  // Upload a single file
  const uploadFile = useCallback(async (file: File, userId: string): Promise<string | null> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      onError?.(validation.error || 'Invalid file');
      toast.error(validation.error || 'Invalid file');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setUploadProgress(100);
      
      // Add to uploaded files list
      setUploadedFiles(prev => [...prev, { url: publicUrl, name: file.name, type: file.type }]);
      
      onUploadComplete?.(publicUrl, file);
      
      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      onError?.(error.message || 'Upload failed');
      toast.error(error.message || 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [bucket, validateFile, onUploadComplete, onError]);

  // Upload multiple files
  const uploadMultiple = useCallback(async (files: File[], userId: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of files) {
      const url = await uploadFile(file, userId);
      if (url) {
        urls.push(url);
      }
    }
    
    return urls;
  }, [uploadFile]);

  // Clear uploaded files
  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setUploadProgress(0);
  }, []);

  return {
    isUploading,
    uploadProgress,
    uploadedFiles,
    uploadFile,
    uploadMultiple,
    clearFiles,
    validateFile,
  };
};