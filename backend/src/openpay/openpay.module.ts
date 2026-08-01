import { Module } from '@nestjs/common';
import { OpenpayService } from './openpay.service';

@Module({
  providers: [OpenpayService],
  exports: [OpenpayService],
})
export class OpenpayModule {}
