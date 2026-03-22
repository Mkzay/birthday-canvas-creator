import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { GripVertical, ImagePlus, Loader2, Lock, Mic2, Plus, Send, Sparkles, X, Square, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { toast } from 'sonner';
import Confetti from '@/components/Confetti';
import { parseLocalDate } from '@/lib/date';
import { ApiError, apiFetch, apiForm } from '@/lib/api';
import BrandLogo from '@/components/BrandLogo';
import WishCanvasLoader from '@/components/WishCanvasLoader';
import StickerPicker, { StickerData } from '@/components/StickerPicker';

interface PublicBirthdayPageData {
  id: string;
  recipient_name: string;
  birthday_date: string;
  theme: string;
  theme_emoji: string | null;
  theme_gradient_from: string | null;
  theme_gradient_to: string | null;
  allow_photos: boolean;
  allow_audio: boolean;
  require_names: boolean;
  can_contribute: boolean;
  message_count: number;
}

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

const MAX_PHOTOS = 6;

const themeConfig = {
  elegant: { name: 'Elegant', emoji: '✨', text: 'text-amber-900', bg: 'bg-gradient-to-br from-amber-50 to-orange-50' },
  playful: { name: 'Playful', emoji: '🎈', text: 'text-pink-900', bg: 'bg-gradient-to-br from-pink-50 to-purple-50' },
  minimalist: { name: 'Minimalist', emoji: '🎯', text: 'text-slate-900', bg: 'bg-gradient-to-br from-slate-50 to-gray-100' },
  retro: { name: 'Retro', emoji: '🌈', text: 'text-purple-900', bg: 'bg-gradient-to-br from-cyan-50 to-purple-50' },
  tropical: { name: 'Tropical', emoji: '🌴', text: 'text-emerald-900', bg: 'bg-gradient-to-br from-green-50 to-yellow-50' },
  cosmic: { name: 'Cosmic', emoji: '🚀', text: 'text-violet-100', bg: 'bg-gradient-to-br from-violet-900 via-indigo-900 to-purple-900' },
  sunset: { name: 'Sunset', emoji: '🌅', text: 'text-rose-900', bg: 'bg-gradient-to-br from-orange-100 to-rose-100' },
  ocean: { name: 'Ocean', emoji: '🌊', text: 'text-sky-900', bg: 'bg-gradient-to-br from-sky-50 to-cyan-50' },
  candyland: { name: 'Candyland', emoji: '🍭', text: 'text-fuchsia-900', bg: 'bg-gradient-to-br from-pink-100 to-lime-50' },
  midnight: { name: 'Midnight', emoji: '🌙', text: 'text-indigo-100', bg: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900' },
} as const;

const ContributePage = () => {
  const { pageId } = useParams();
  const [page, setPage] = useState<PublicBirthdayPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<PendingPhoto[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [wishAudio, setWishAudio] = useState<File | null>(null);
  const [wishAudioPreviewUrl, setWishAudioPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const selectedPhotosRef = useRef<PendingPhoto[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [stickers, setStickers] = useState<StickerData[]>([]);

  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    return () => {
      selectedPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      if (wishAudioPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(wishAudioPreviewUrl);
      }
    };
  }, [wishAudioPreviewUrl]);

  const fetchPage = useCallback(async () => {
    if (!pageId) return;

    try {
      const data = await apiFetch<PublicBirthdayPageData>(`/public/pages/${pageId}`);
      setPage(data);
    } catch (error) {
      console.error(error);
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (pageId) {
      void fetchPage();
    }
  }, [fetchPage, pageId]);

  const placeholderTemplates = [
    (name: string) => `Write something ${name} will never forget...`,
    (name: string) => `What's your favorite memory with ${name}?`,
    (name: string) => `If you could tell ${name} one thing on their birthday...`,
    (name: string) => `What makes ${name} so special to you?`,
    (name: string) => `Write your birthday wish for ${name}...`,
  ];

  const currentPlaceholder = page
    ? placeholderTemplates[placeholderIndex % placeholderTemplates.length](page.recipient_name)
    : 'Write your birthday wish...';

  useEffect(() => {
    if (!page) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholderTemplates.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [page, placeholderTemplates.length]);

  const clearSelectedPhotos = useCallback(() => {
    setSelectedPhotos((currentPhotos) => {
      currentPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleWishAudioSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mimeType = file.type.toLowerCase();
    const isAudioLike =
      mimeType.startsWith('audio/') ||
      mimeType === 'video/3gpp' ||
      mimeType === 'video/3gpp2';

    if (!isAudioLike) {
      toast.error('Please select an audio or voice-note file');
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Audio must be less than 8MB');
      event.target.value = '';
      return;
    }

    if (wishAudioPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(wishAudioPreviewUrl);
    }

    setWishAudio(file);
    setWishAudioPreviewUrl(URL.createObjectURL(file));
    event.target.value = '';
  };

  const removeWishAudio = () => {
    setWishAudio(null);
    if (wishAudioPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(wishAudioPreviewUrl);
    }
    setWishAudioPreviewUrl(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) {
          mimeType = 'audio/mp4;codecs=mp4a.40.2';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }

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
        
        stream.getTracks().forEach((track) => track.stop());
        
        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingDuration(0);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const reorderPhotos = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setSelectedPhotos((currentPhotos) => {
      const sourceIndex = currentPhotos.findIndex((photo) => photo.id === sourceId);
      const targetIndex = currentPhotos.findIndex((photo) => photo.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentPhotos;
      }

      const nextPhotos = [...currentPhotos];
      const [movedPhoto] = nextPhotos.splice(sourceIndex, 1);
      nextPhotos.splice(targetIndex, 0, movedPhoto);
      return nextPhotos;
    });
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const availableSlots = MAX_PHOTOS - selectedPhotos.length;
    if (availableSlots <= 0) {
      toast.error(`You can attach up to ${MAX_PHOTOS} photos`);
      event.target.value = '';
      return;
    }

    const acceptedFiles: PendingPhoto[] = [];
    const incomingFiles = files.slice(0, availableSlots);

    incomingFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        return;
      }

      acceptedFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      });
    });

    if (files.length > availableSlots) {
      toast.error(`Only ${availableSlots} more photo${availableSlots === 1 ? '' : 's'} can be added`);
    }

    if (acceptedFiles.length) {
      setSelectedPhotos((currentPhotos) => [...currentPhotos, ...acceptedFiles]);
    }

    event.target.value = '';
  };

  const handlePhotoCaptionChange = (photoId: string, caption: string) => {
    setSelectedPhotos((currentPhotos) =>
      currentPhotos.map((photo) => (photo.id === photoId ? { ...photo, caption: caption.slice(0, 140) } : photo)),
    );
  };

  const removePhoto = (photoId: string) => {
    setSelectedPhotos((currentPhotos) => {
      const photoToRemove = currentPhotos.find((photo) => photo.id === photoId);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.previewUrl);
      }

      return currentPhotos.filter((photo) => photo.id !== photoId);
    });
  };

  const uploadWishAudio = async () => {
    if (!wishAudio || !pageId) return null;

    setUploadingAudio(true);

    try {
      const formData = new FormData();
      formData.append('file', wishAudio);
      const data = await apiForm<{ url: string }>(`/public/pages/${pageId}/message-audio`, formData);
      return data.url;
    } catch (error) {
      console.error('Audio upload error:', error);
      toast.error('Failed to upload audio message');
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  const uploadPhotos = async () => {
    if (!pageId || !selectedPhotos.length) return [];

    setUploading(true);

    try {
      const uploads = await Promise.all(
        selectedPhotos.map(async (photo) => {
          const formData = new FormData();
          formData.append('file', photo.file);

          const data = await apiForm<{ url: string }>(`/public/pages/${pageId}/message-photo`, formData);
          return {
            url: data.url,
            caption: photo.caption.trim() || null,
          };
        }),
      );

      return uploads;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload one or more photos');
      return null;
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <WishCanvasLoader />;
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔍</div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Page not found</h1>
          <p className="mb-6 text-muted-foreground">This birthday page doesn&apos;t exist or has been removed.</p>
          <Link to="/">
            <Button variant="hero">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCustomTheme = page.theme.startsWith('custom_');
  const builtInTheme = themeConfig[page.theme as keyof typeof themeConfig] || themeConfig.elegant;
  const theme = isCustomTheme
    ? {
        emoji: page.theme_emoji || '🎨',
        text: 'text-white',
        bg: '',
        style: {
          background: `linear-gradient(135deg, ${page.theme_gradient_from || '#8b5cf6'}, ${page.theme_gradient_to || '#ec4899'})`,
        },
      }
    : {
        emoji: builtInTheme.emoji,
        text: builtInTheme.text,
        bg: builtInTheme.bg,
        style: undefined,
      };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isRecording) {
      toast.error('Please stop your recording before submitting your wish');
      return;
    }

    if (page.require_names && !senderName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const plainText = message.replace(/<[^>]*>/g, '').trim();
    if (!plainText) {
      toast.error('Please write a message');
      return;
    }

    if (!page.can_contribute) {
      toast.error('This page is no longer accepting new wishes');
      return;
    }

    setSubmitting(true);

    const uploadedPhotos = selectedPhotos.length ? await uploadPhotos() : [];
    if (uploadedPhotos === null) {
      setSubmitting(false);
      return;
    }

    const uploadedAudioUrl = wishAudio ? await uploadWishAudio() : null;
    if (wishAudio && !uploadedAudioUrl) {
      setSubmitting(false);
      return;
    }

    try {
      await apiFetch(`/public/pages/${page.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          senderName,
          message,
          photos: uploadedPhotos,
          audioUrl: uploadedAudioUrl,
          stickers: stickers.map(s => ({
            stickerType: s.stickerType,
            positionX: s.positionX,
            positionY: s.positionY,
            rotation: s.rotation,
            scale: s.scale
          })),
        }),
      });

      setShowConfetti(true);
      setIsSubmitted(true);
      setPage((currentPage) =>
        currentPage
          ? {
              ...currentPage,
              message_count: currentPage.message_count + 1,
            }
          : currentPage,
      );

      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONTRIBUTOR_LIMIT_REACHED') {
        toast.error('This page has reached the free contributor limit. Ask the creator to upgrade to Pro for more contributions.');
        return;
      }
      const messageText = error instanceof Error ? error.message : 'Failed to add message';
      toast.error(messageText);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setSenderName('');
    setMessage('');
    clearSelectedPhotos();
    removeWishAudio();
    setStickers([]);
    setIsSubmitted(false);
  };

  return (
    <div className={`min-h-screen ${theme.bg}`} style={theme.style}>
      {showConfetti && <Confetti />}

      <header className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center">
          <BrandLogo compact className="mb-2 sm:mb-4 sm:gap-3" />
          <p className={`text-center text-xs opacity-80 sm:text-sm ${theme.text}`}>
            It&apos;s {page.recipient_name}&apos;s birthday on {format(parseLocalDate(page.birthday_date), 'MMMM d')}!
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {!isSubmitted ? (
          <>
            <div className="mb-6 text-center animate-fade-in-up sm:mb-8">
              <div className="mb-3 text-5xl sm:mb-4 sm:text-6xl">{theme.emoji}</div>
              <h1 className={`px-2 text-2xl font-bold sm:text-3xl ${theme.text}`}>
                Add your birthday wish for {page.recipient_name}
              </h1>
              <p className={`mx-auto mt-3 max-w-2xl text-sm leading-relaxed opacity-80 sm:text-base ${theme.text}`}>
                Leave a message, add a few photos if you want, and attach a short note to each memory so the page feels more personal.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(page.message_count, 3))].map((_, index) => (
                    <div key={index} className="h-7 w-7 rounded-full border-2 border-card bg-gradient-to-br from-primary to-secondary sm:h-8 sm:w-8" />
                  ))}
                </div>
                <span className={`text-xs opacity-80 sm:text-sm ${theme.text}`}>
                  {page.message_count} {page.message_count === 1 ? 'person has' : 'people have'} contributed
                </span>
              </div>
            </div>

            {!page.can_contribute && (
              <div className="mb-4 rounded-2xl border border-border bg-card/90 p-4 text-center shadow-soft">
                <div className="mb-2 flex items-center justify-center gap-2 text-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="font-semibold">Wish collection is closed</span>
                </div>
                <p className="text-sm text-muted-foreground">This page is no longer accepting new messages or photos.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="animate-fade-in-up space-y-5" style={{ animationDelay: '0.2s' }}>
              <div className="rounded-[1.9rem] border border-border bg-card/96 p-4 shadow-soft sm:p-6">
                {page.require_names && (
                  <div className="mb-6">
                    <Label htmlFor="name" className="text-foreground">
                      Your Name
                    </Label>
                    <Input
                      id="name"
                      value={senderName}
                      onChange={(event) => setSenderName(event.target.value)}
                      placeholder="Enter your name"
                      className="mt-2 h-12 rounded-xl"
                      disabled={!page.can_contribute}
                    />
                  </div>
                )}

                <div className="mb-6">
                  <Label htmlFor="message" className="mb-2 block text-foreground">
                    Your Message
                  </Label>
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder={currentPlaceholder}
                    maxLength={500}
                    disabled={!page.can_contribute}
                  />
                </div>

                {page.allow_photos && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-foreground">Photos and memory notes</Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Add up to {MAX_PHOTOS} photos. Each one can include a short note.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!page.can_contribute || selectedPhotos.length >= MAX_PHOTOS}
                      >
                        <ImagePlus className="h-4 w-4" />
                        Add photos
                      </Button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.gif"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                      disabled={!page.can_contribute}
                    />

                    {selectedPhotos.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-[1.4rem] border-2 border-dashed border-border bg-background/60 p-8 text-center transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!page.can_contribute}
                      >
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <ImagePlus className="h-6 w-6" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-foreground">Add photos that make the message feel lived-in</p>
                        <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, up to 5MB each</p>
                      </button>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {selectedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            draggable={page.can_contribute}
                            onDragStart={() => setDraggedPhotoId(photo.id)}
                            onDragEnd={() => setDraggedPhotoId(null)}
                            onDragOver={(event) => {
                              event.preventDefault();
                            }}
                            onDrop={() => {
                              if (draggedPhotoId) {
                                reorderPhotos(draggedPhotoId, photo.id);
                              }
                              setDraggedPhotoId(null);
                            }}
                            className={[
                              'overflow-hidden rounded-[1.5rem] border border-border bg-background/70 transition-shadow',
                              draggedPhotoId === photo.id ? 'shadow-[0_0_0_2px_rgba(139,92,246,0.24)]' : '',
                            ].join(' ')}
                          >
                            <div className="relative">
                              <img src={photo.previewUrl} alt="Selected memory preview" className="h-52 w-full object-cover" />
                              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                Drag to reorder
                              </div>
                              <button
                                type="button"
                                onClick={() => removePhoto(photo.id)}
                                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm transition-colors hover:bg-background"
                                aria-label="Remove selected photo"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="p-4">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">{photo.file.name}</p>
                                <span className="text-xs text-muted-foreground">{photo.caption.length}/140</span>
                              </div>
                              <Input
                                value={photo.caption}
                                onChange={(event) => handlePhotoCaptionChange(photo.id, event.target.value)}
                                placeholder="Add a short memory note for this photo"
                                className="h-11 rounded-xl"
                                disabled={!page.can_contribute}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {page.allow_audio && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-foreground">Voice note (optional)</Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Add a short audio wish so they can hear your voice on the birthday page.
                        </p>
                      </div>
                      {!wishAudioPreviewUrl && !isRecording && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
                            onClick={startRecording}
                            disabled={!page.can_contribute}
                          >
                            <Mic className="h-4 w-4" />
                            Record
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => audioInputRef.current?.click()}
                            disabled={!page.can_contribute}
                          >
                            <Mic2 className="h-4 w-4" />
                            Upload
                          </Button>
                        </div>
                      )}
                    </div>

                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleWishAudioSelect}
                      className="hidden"
                      disabled={!page.can_contribute}
                    />

                    {isRecording ? (
                      <div className="flex items-center justify-between rounded-[1.4rem] border border-primary/30 bg-primary/5 p-4 shadow-inner">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                          <span className="font-mono text-lg font-medium text-foreground">{formatDuration(recordingDuration)}</span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-2 rounded-full"
                          onClick={stopRecording}
                        >
                          <Square className="h-4 w-4 fill-current" />
                          Stop Recording
                        </Button>
                      </div>
                    ) : wishAudioPreviewUrl ? (
                      <div className="rounded-[1.4rem] border border-border bg-background/70 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{wishAudio?.name || 'Voice note'}</p>
                            <p className="text-xs text-muted-foreground">One audio clip per wish</p>
                          </div>
                          <Button type="button" variant="ghost" className="gap-2" onClick={removeWishAudio}>
                            <X className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                        <audio controls className="w-full" src={wishAudioPreviewUrl}>
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                        Upload a short audio clip or record one directly here if you want the person to hear your voice.
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-8 font-inherit">
                  <div className="mb-3">
                    <Label className="text-foreground">Decorate your wish</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add some fun stickers to your birthday card!
                    </p>
                  </div>
                  <StickerPicker 
                    stickers={stickers} 
                    onChange={setStickers}
                    className={!page.can_contribute ? "pointer-events-none opacity-60" : ""}
                    message={message}
                    senderName={senderName}
                    themeId={page.theme}
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full gap-2" disabled={submitting || uploading || uploadingAudio || isRecording || !page.can_contribute}>
                  {submitting || uploading || uploadingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {uploading
                    ? 'Uploading photos...'
                    : uploadingAudio
                      ? 'Uploading audio...'
                      : submitting
                        ? 'Adding your wish...'
                        : 'Add my wish'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="animate-scale-in px-2 text-center">
            <div className="mb-4 text-6xl sm:mb-6 sm:text-8xl">🎉</div>
            <h2 className={`mb-2 text-2xl font-bold sm:mb-3 sm:text-3xl ${theme.text}`}>Your wish has been added!</h2>
            <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
              {page.recipient_name} will see it on their special day.
            </p>

            <div className="flex flex-col gap-3 sm:gap-4">
              <Button variant="outline" size="default" onClick={handleAddAnother} className="gap-2">
                <Plus className="h-4 w-4" />
                Add another message
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-xs text-muted-foreground sm:text-sm">or</span>
                </div>
              </div>

              <Link to="/create">
                <Button variant="hero" size="default" className="w-full gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create your own birthday page
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContributePage;
