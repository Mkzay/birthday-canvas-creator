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
  const discardRecordingRef = useRef(false);
  const startingRef = useRef(false);

  // Revoke each preview when replaced or unmounted.
  useEffect(() => {
    return () => {
      if (wishAudioPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(wishAudioPreviewUrl);
      }
    };
  }, [wishAudioPreviewUrl]);

  useEffect(() => () => {
    discardRecordingRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

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

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Audio file must be smaller than 8MB');
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
    if (startingRef.current || mediaRecorderRef.current?.state === 'recording') return;
    startingRef.current = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
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
      discardRecordingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const extension = blobType.includes('mp4') ? 'm4a' : blobType.includes('ogg') ? 'ogg' : 'webm';
        const audioFile = new File([audioBlob], `voice-note.${extension}`, { type: blobType });

        if (!discardRecordingRef.current && audioBlob.size > 0 && audioBlob.size <= 8 * 1024 * 1024) {
          setWishAudio(audioFile);
          setWishAudioPreviewUrl(URL.createObjectURL(audioBlob));
          setExistingAudioUrl(null);
        } else if (!discardRecordingRef.current && audioBlob.size > 8 * 1024 * 1024) {
          toast.error('Recording exceeds 8MB. Please record a shorter voice note.');
        }

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
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
      setIsRecording(false);
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check your permissions.');
    } finally {
      startingRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Discard recorded chunks
      discardRecordingRef.current = true;
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
