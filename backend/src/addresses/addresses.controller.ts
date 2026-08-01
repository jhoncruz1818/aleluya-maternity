import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Direcciones de envío del usuario autenticado.
 *
 *   GET    /api/addresses
 *   GET    /api/addresses/:id
 *   POST   /api/addresses
 *   PATCH  /api/addresses/:id
 *   DELETE /api/addresses/:id
 */
@ApiTags('addresses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis direcciones' })
  findAll(@CurrentUser('sub') userId: string) {
    return this.addressesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver una dirección mía' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.addressesService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear dirección de envío' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar dirección' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar dirección' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.addressesService.remove(userId, id);
  }
}
