import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly config: ConfigService,
  ) {
    this.uploadsService.ensureDirs();
  }

  @Post('product-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subir imagen de producto desde el PC (ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const service = new UploadsService();
          service.ensureDirs();
          cb(null, service.productsDir);
        },
        filename: (_req, file, cb) => {
          const service = new UploadsService();
          cb(null, service.buildFilename(file));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ].includes(file.mimetype);
        if (!allowed) {
          cb(
            new BadRequestException(
              'Formato no permitido. Usa JPG, PNG, WEBP o GIF',
            ) as unknown as Error,
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    this.uploadsService.assertImageFile(file);
    const configured = this.config.get<string>('PUBLIC_API_URL')?.trim();
    const origin =
      configured && configured.length > 0
        ? configured.replace(/\/$/, '')
        : `${req.protocol}://${req.get('host')}`;
    const url = this.uploadsService.publicUrl(origin, file.filename);
    return {
      url,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
