import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

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
  /** Carpeta física: backend/uploads/products */
  readonly productsDir = join(process.cwd(), 'uploads', 'products');

  ensureDirs() {
    if (!existsSync(this.productsDir)) {
      mkdirSync(this.productsDir, { recursive: true });
    }
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

  /** URL pública servida por Nest en /uploads/... */
  publicUrl(reqHostOrigin: string, filename: string) {
    const origin = reqHostOrigin.replace(/\/$/, '');
    return `${origin}/uploads/products/${filename}`;
  }
}
