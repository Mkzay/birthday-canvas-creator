/**
 * Client-side image compression utility.
 * Downscales high-resolution camera photos (often 6MB-15MB) to web-optimized dimensions
 * and compresses them using the HTML5 Canvas API before network transmission.
 */

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  // If not an image, return original
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If already under 350KB and already compressed, skip recompression
  if (file.size <= 350 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    return file;
  }

  const { maxDimension = 1600, quality = 0.82, mimeType = 'image/jpeg' } = options;

  return new Promise<File>((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve(file); // fallback to original on error

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => resolve(file); // fallback to original on error

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          resolve(file);
          return;
        }

        // Calculate aspect-ratio downscale if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            // If compressed file is larger than original for any weird reason, keep original
            if (compressedFile.size >= file.size) {
              resolve(file);
            } else {
              resolve(compressedFile);
            }
          },
          mimeType,
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
