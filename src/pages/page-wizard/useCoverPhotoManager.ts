import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { apiForm, resolveAssetUrl } from '@/lib/api';
import { compressImageFile } from '@/lib/imageCompressor';

export interface UseCoverPhotoManagerOptions {
  initialCoverUrl?: string | null;
}

export interface UseCoverPhotoManagerReturn {
  coverPhotoFile: File | null;
  setCoverPhotoFile: (file: File | null) => void;
  coverPhotoPreview: string | null;
  setCoverPhotoPreview: (url: string | null) => void;
  isCompressingCover: boolean;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  handleCoverPhotoSelect: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveCoverPhoto: () => void;
  uploadCoverPhoto: (pageId: string, fallbackUrl?: string | null, claimToken?: string) => Promise<string | null>;
}

export function useCoverPhotoManager({
  initialCoverUrl = null,
}: UseCoverPhotoManagerOptions = {}): UseCoverPhotoManagerReturn {
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(() => {
    return initialCoverUrl ? resolveAssetUrl(initialCoverUrl) || initialCoverUrl : null;
  });
  const [isCompressingCover, setIsCompressingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup created blob URLs on unmount
  useEffect(() => {
    const urls = createdBlobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const handleCoverPhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image size must be less than 15MB');
      return;
    }

    setIsCompressingCover(true);
    try {
      const compressed = await compressImageFile(file, {
        maxDimension: 1800,
        quality: 0.85,
      });

      setCoverPhotoFile(compressed);

      const previewUrl = URL.createObjectURL(compressed);
      createdBlobUrlsRef.current.add(previewUrl);
      setCoverPhotoPreview(previewUrl);
      toast.success('Cover photo attached');
    } catch (error) {
      console.error('Failed to compress cover image:', error);
      toast.error('Could not process this image. Please try another one.');
    } finally {
      setIsCompressingCover(false);
    }
  };

  const handleRemoveCoverPhoto = () => {
    if (coverPhotoPreview && coverPhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPhotoPreview);
      createdBlobUrlsRef.current.delete(coverPhotoPreview);
    }
    setCoverPhotoFile(null);
    setCoverPhotoPreview(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const uploadCoverPhoto = async (pageId: string, fallbackUrl: string | null = null, claimToken?: string): Promise<string | null> => {
    if (!coverPhotoFile) {
      return fallbackUrl;
    }

    const formData = new FormData();
    formData.append('file', coverPhotoFile);
    formData.append('pageId', pageId);
    if (claimToken) formData.append('claimToken', claimToken);

    try {
      const data = await apiForm<{ url: string }>('/uploads/cover', formData);
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload cover photo');
      return fallbackUrl;
    }
  };

  return {
    coverPhotoFile,
    setCoverPhotoFile,
    coverPhotoPreview,
    setCoverPhotoPreview,
    isCompressingCover,
    coverInputRef,
    handleCoverPhotoSelect,
    handleRemoveCoverPhoto,
    uploadCoverPhoto,
  };
}
