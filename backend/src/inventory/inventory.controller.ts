import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateStockMovementDto,
  QueryInventoryDto,
  QueryMovementsDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Listar stock por variante (ADMIN)' })
  list(@Query() query: QueryInventoryDto) {
    return this.inventoryService.list(query);
  }

  @Delete('movements/:movementId/purge')
  @ApiOperation({
    summary:
      'Eliminar del historial un movimiento YA anulado (solo OWNER_EMAILS)',
  })
  purgeMovement(
    @Param('movementId') movementId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.purgeUndoneMovement(movementId, user.email);
  }

  @Delete('movements/:movementId')
  @ApiOperation({
    summary:
      'Anular movimiento manual (revierte stock; queda auditoría). No aplica a ventas.',
  })
  undoMovement(
    @Param('movementId') movementId: string,
    @CurrentUser('sub') adminUserId: string,
  ) {
    return this.inventoryService.undoMovement(movementId, adminUserId);
  }

  @Delete(':variantId/undone')
  @ApiOperation({
    summary: 'Limpiar todos los anulados de una variante (solo OWNER_EMAILS)',
  })
  purgeAllUndone(
    @Param('variantId') variantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.purgeAllUndone(variantId, user.email);
  }

  @Get(':variantId/movements')
  @ApiOperation({ summary: 'Historial de movimientos de una variante (ADMIN)' })
  movements(
    @Param('variantId') variantId: string,
    @Query() query: QueryMovementsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.movements(variantId, query, user.email);
  }

  @Post(':variantId/movements')
  @ApiOperation({ summary: 'Registrar entrada o salida de stock (ADMIN)' })
  adjust(
    @Param('variantId') variantId: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser('sub') adminUserId: string,
  ) {
    return this.inventoryService.adjust(variantId, dto, adminUserId);
  }
}
