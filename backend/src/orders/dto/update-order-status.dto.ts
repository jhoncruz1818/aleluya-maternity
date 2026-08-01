import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { OrderStatus } from '../../common/constants/order-status';

const ALLOWED = Object.values(OrderStatus);

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: ALLOWED,
    example: OrderStatus.PROCESSING,
  })
  @IsString()
  @IsIn(ALLOWED, { message: `status debe ser uno de: ${ALLOWED.join(', ')}` })
  status: OrderStatus;
}
