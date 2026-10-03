import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  formattedDuration: string;
  wishAudio: File | null;
  wishAudioPreviewUrl: string | null;
  existingAudioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  clearAudio: () => void;
  setExistingAudio: (url: string | null) => void;
  setAudioFromFile: (file: File) => void;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [wishAudio, setWishAudio] = useState<File | null>(null);
  const [wishAudioPreviewUrl, setWishAudioPreviewUrl] = useState<string | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up object URLs and stream tracks on unmount
  useEffect(() => {
    return () => {
      if (wishAudioPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(wishAudioPreviewUrl);
      }
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [wishAudioPreviewUrl]);

  const clearAudio = useCallback(() => {
    if (wishAudioPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(wishAudioPreviewUrl);
    }
    setWishAudio(null);
    setWishAudioPreviewUrl(null);
    setExistingAudioUrl(null);
  }, [wishAudioPreviewUrl]);

  const setAudioFromFile = useCallback((file: File) => {
    const mimeType = file.type.toLowerCase();
    const isAudioLike =
      mimeType.startsWith('audio/') ||
      mimeType === 'video/3gpp' ||
      mimeType === 'video/mp4' ||
      /\.(mp3|wav|ogg|m4a|aac|flac|webm|3gp|mp4)$/i.test(file.name);

    if (!isAudioLike) {
      toast.error('Please choose a valid audio file');
      return;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      toast.error('Audio file must be smaller than 25MB');
      return;
    }

    if (wishAudioPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(wishAudioPreviewUrl);
    }

    setWishAudio(file);
    setWishAudioPreviewUrl(URL.createObjectURL(file));
    setExistingAudioUrl(null);
  }, [wishAudioPreviewUrl]);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Voice recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const extension = blobType.startsWith('audio/mp4') ? 'm4a' : 'webm';
        const audioFile = new File([audioBlob], `voice-note.${extension}`, { type: blobType });

        if (wishAudioPreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(wishAudioPreviewUrl);
        }

        setWishAudio(audioFile);
        setWishAudioPreviewUrl(URL.createObjectURL(audioBlob));
        setExistingAudioUrl(null);

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingDuration(0);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 179) {
            // Auto-stop at 3 minutes
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check your permissions.');
    }
  }, [wishAudioPreviewUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Discard recorded chunks
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
    setIsRecording(false);
  }, [isRecording]);

  return {
    isRecording,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    wishAudio,
    wishAudioPreviewUrl,
    existingAudioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
    setExistingAudio: setExistingAudioUrl,
    setAudioFromFile,
  };
}
