import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'Tienda Ropa Mamá API',
      timestamp: new Date().toISOString(),
    };
  }
}
