import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() — lee el usuario que JwtStrategy dejó en request.user.
 *
 * Uso:
 *   getProfile(@CurrentUser() user: JwtPayload) { ... }
 *   getProfile(@CurrentUser('sub') userId: string) { ... }
 *
 * ¿Por qué un decorator? Para no repetir req.user en cada controller
 * y tipar bien lo que viene del JWT.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
