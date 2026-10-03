import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import sharp from "sharp";
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

export const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const configuredUploadsRoot = process.env.UPLOADS_ROOT?.trim();

export const uploadsRoot = configuredUploadsRoot
  ? path.resolve(configuredUploadsRoot)
  : path.resolve(process.cwd(), "uploads");
export const coversRoot = path.join(uploadsRoot, "covers");
export const messagesRoot = path.join(uploadsRoot, "messages");
export const pageAudioRoot = path.join(uploadsRoot, "page-audio");
export const wishAudioRoot = path.join(uploadsRoot, "wish-audio");
export const avatarsRoot = path.join(uploadsRoot, "avatars");
export const themeIconsRoot = path.join(uploadsRoot, "theme-icons");

export async function ensureUploadDirs() {
  const dirs = [uploadsRoot, coversRoot, messagesRoot, pageAudioRoot, wishAudioRoot, avatarsRoot, themeIconsRoot];
  await Promise.all(
    dirs.map(async (dir) => {
      try {
        await fs.promises.access(dir);
      } catch {
        await fs.promises.mkdir(dir, { recursive: true });
      }
    }),
  );
}

function normalizeExtension(extension: string) {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) return ".jpg";
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function buildFilenameWithExtension(extension: string) {
  return `${crypto.randomUUID()}${normalizeExtension(extension)}`;
}

function buildFilename(originalName: string) {
  const extension = path.extname(originalName).toLowerCase() || ".jpg";
  return buildFilenameWithExtension(extension);
}

const createUploadStorage = (folderName: string, diskRoot: string, isAudio = false) => {
  if (hasCloudinary) {
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'birthday-app/' + folderName,
        resource_type: isAudio ? 'video' : 'auto',
      } as any,
    });
  }

  return multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, diskRoot),
    filename: (_request, file, callback) => callback(null, buildFilename(file.originalname)),
  });
};

function imageFileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image uploads are supported"));
    return;
  }

  callback(null, true);
}

function audioFileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) {
  const type = file.mimetype.toLowerCase();

  // Accept standard audio/* types plus common mobile voice-note formats
  const isAudio =
    type.startsWith("audio/") ||
    type === "video/3gpp" ||
    type === "video/3gpp2";

  if (!isAudio) {
    callback(new Error("Only audio uploads are supported"));
    return;
  }

  callback(null, true);
}

export const coverUpload = multer({
  storage: createUploadStorage("covers", coversRoot),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

export const messageUpload = multer({
  storage: createUploadStorage("messages", messagesRoot),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

export const avatarUpload = multer({
  storage: createUploadStorage("avatars", avatarsRoot),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

export const themeIconUpload = multer({
  storage: createUploadStorage("theme-icons", themeIconsRoot),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

export const pageAudioUpload = multer({
  storage: createUploadStorage("page-audio", pageAudioRoot, true),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: audioFileFilter,
});

export const wishAudioUpload = multer({
  storage: createUploadStorage("wish-audio", wishAudioRoot, true),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: audioFileFilter,
});

export function fileUrl(relativePath: string) {
  return `/uploads/${relativePath.replaceAll("\\", "/")}`;
}

export async function normalizeCoverUpload(filePath: string) {
  const normalizedFilename = buildFilenameWithExtension(".jpg");
  const normalizedPath = path.join(coversRoot, normalizedFilename);

  try {
    await sharp(filePath)
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality: 88,
        progressive: false,
      })
      .toFile(normalizedPath);

    await fs.promises.rm(filePath, { force: true });
  } catch (error) {
    await fs.promises.rm(normalizedPath, { force: true });
    await fs.promises.rm(filePath, { force: true });
    throw error;
  }

  return {
    filePath: normalizedPath,
    url: fileUrl(path.join("covers", normalizedFilename)),
  };
}

export async function removeFileByUrl(url?: string | null) {
  if (!url) return;

  // If it is a Cloudinary URL, remove via Cloudinary API
  if (url.includes("res.cloudinary.com") && hasCloudinary) {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (match && match[1]) {
        const publicId = match[1];
        const isVideo = url.includes("/video/upload/");
        await cloudinary.uploader.destroy(publicId, {
          resource_type: isVideo ? "video" : "image",
        });
      }
    } catch {
      // Best-effort cleanup, ignore
    }
    return;
  }

  if (!url.startsWith("/uploads/")) return;

  const relativePath = url.slice("/uploads/".length);
  const filePath = path.resolve(uploadsRoot, relativePath);

  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return;
  }

  try {
    await fs.promises.access(filePath);
    await fs.promises.rm(filePath, { force: true });
  } catch {
    // File doesn't exist or other error, ignore
  }
}
