import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles';

/**
 * Pedidos.
 *
 * Cliente:
 *   POST /api/orders
 *   GET  /api/orders
 *   GET  /api/orders/:id
 *
 * Admin:
 *   GET   /api/orders/admin/all
 *   PATCH /api/orders/:id/status
 */
@ApiTags('orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear pedido a partir del carrito' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mis pedidos' })
  findMine(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.findMine(userId, query);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos los pedidos (ADMIN)' })
  findAllAdmin(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un pedido propio' })
  findOne(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOne(userId, id, role === Role.ADMIN);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado del pedido (ADMIN)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
