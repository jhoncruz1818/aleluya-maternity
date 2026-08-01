import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { OrderStatus } from '../../common/constants/order-status';

const ALLOWED = Object.values(OrderStatus);

export class QueryOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ALLOWED })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED)
  status?: OrderStatus;
}
