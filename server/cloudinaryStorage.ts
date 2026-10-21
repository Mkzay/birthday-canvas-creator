import { pipeline } from 'node:stream';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

/** Multer storage using the supported Cloudinary SDK; no legacy peer dependency. */
export function createCloudinaryStorage(folder: string, isAudio = false): multer.StorageEngine {
  const resourceType = isAudio ? 'video' : 'image';
  return {
    _handleFile(_request, file, callback) {
      let finished = false;
      let truncated = false;
      const finish: typeof callback = (error, info) => {
        if (finished) return;
        finished = true;
        callback(error, info);
      };
      const upload = cloudinary.uploader.upload_stream(
        { folder: `birthday-app/${folder}`, resource_type: resourceType },
        (error, result) => {
          if (error) return finish(error);
          if (!result) return finish(new Error('Upload provider returned no file'));
          if (truncated || finished) {
            void cloudinary.uploader.destroy(result.public_id, { resource_type: resourceType }).catch(() => {});
            return;
          }
          finish(null, { filename: result.public_id, path: result.secure_url, size: result.bytes });
        },
      );
      file.stream.once('limit', () => {
        truncated = true;
        upload.destroy(new multer.MulterError('LIMIT_FILE_SIZE'));
      });
      pipeline(file.stream, upload, (error) => { if (error) finish(error); });
    },
    _removeFile(_request, file, callback) {
      cloudinary.uploader.destroy(file.filename, { resource_type: resourceType })
        .then(() => callback(null), (error: Error) => callback(error));
    },
  };
}
