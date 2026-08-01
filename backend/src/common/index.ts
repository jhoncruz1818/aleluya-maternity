/**
 * Utilidades compartidas entre módulos.
 *
 * - constants/  → Role y otros valores fijos
 * - decorators/ → @CurrentUser(), @Roles()
 * - guards/     → JwtAuthGuard, RolesGuard
 */
export { Role } from './constants/roles';
export { OrderStatus, PaymentStatus } from './constants/order-status';
export { CurrentUser } from './decorators/current-user.decorator';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';
