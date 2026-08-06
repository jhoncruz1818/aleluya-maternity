import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.required('R2_ACCOUNT_ID');
    const accessKeyId = this.required('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.required('R2_SECRET_ACCESS_KEY');
    const endpoint =
      this.config.get<string>('R2_ENDPOINT')?.trim() ||
      `https://${accountId}.r2.cloudflarestorage.com`;

    this.bucket = this.required('R2_BUCKET_NAME');
    this.publicBase = this.required('R2_PUBLIC_URL').replace(/\/$/, '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  assertImageFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. Usa JPG, PNG, WEBP o GIF',
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 5 MB');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Archivo vacío o no recibido en memoria');
    }
  }

  buildFilename(file: Express.Multer.File) {
    const fromMime = EXT_BY_MIME[file.mimetype];
    const fromName = extname(file.originalname || '').toLowerCase();
    const ext =
      fromMime ||
      (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fromName)
        ? fromName === '.jpeg'
          ? '.jpg'
          : fromName
        : '.jpg');
    return `${randomUUID()}${ext}`;
  }

  /** URL pública en R2 (no ruta local del API). */
  publicUrl(objectKey: string) {
    return `${this.publicBase}/${objectKey}`;
  }

  async uploadProductImage(file: Express.Multer.File) {
    this.assertImageFile(file);
    const filename = this.buildFilename(file);
    const key = `products/${filename}`;

    try {
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });
      await upload.done();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `No se pudo subir la imagen a R2: ${message}`,
      );
    }

    return {
      url: this.publicUrl(key),
      filename,
      key,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private required(name: string): string {
    const value = this.config.get<string>(name)?.trim();
    if (!value) {
      throw new InternalServerErrorException(
        `Falta la variable de entorno ${name}`,
      );
    }
    return value;
  }
}
