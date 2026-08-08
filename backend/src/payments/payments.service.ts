import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OpenpayService, type OpenpayError } from '../openpay/openpay.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import {
  OrderStatus,
  PaymentStatus,
} from '../common/constants/order-status';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  /** Última verificación de webhook Openpay (para activar desde dashboard/script) */
  private lastWebhookVerification: {
    code: string | null;
    at: string;
    raw?: unknown;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openpay: OpenpayService,
    private readonly config: ConfigService,
  ) {}

  getLastWebhookVerification() {
    return this.lastWebhookVerification;
  }

  /**
   * Crea un cargo en Openpay (tarjeta o tienda/Yape).
   *
   * card  → COMPLETED → pedido PAID
   * store → referencia Yape → pedido PENDING hasta webhook charge.succeeded
   */
  async createCharge(userId: string, dto: CreateChargeDto) {
    if (!this.openpay.isConfigured()) {
      throw new ServiceUnavailableException(
        'Openpay no está configurado. Revisa OPENPAY_MERCHANT_ID y OPENPAY_PRIVATE_KEY',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        payment: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        address: true,
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.userId !== userId) {
      throw new ForbiddenException('No puedes pagar este pedido');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `El pedido ya no está pendiente (estado: ${order.status})`,
      );
    }
    if (!order.payment) {
      throw new BadRequestException('El pedido no tiene registro de pago');
    }
    if (order.payment.status === PaymentStatus.APPROVED) {
      throw new BadRequestException('Este pedido ya fue pagado');
    }

    const amount = Number(order.total);
    if (amount < 1) {
      throw new BadRequestException('El monto mínimo es S/ 1.00');
    }

    const phone = order.user.phone || order.address?.phone || '999999999';

    const customer = {
      name: order.user.firstName,
      last_name: order.user.lastName,
      phone_number: phone.replace(/\D/g, '').slice(0, 15) || '999999999',
      email: order.user.email,
    };

    // order_id de Openpay debe ser único; usamos nuestro id de pedido
    const openpayOrderId = `ord-${order.id}`.slice(0, 45);

    const basePayload: Record<string, unknown> = {
      method: dto.method,
      amount,
      currency: 'PEN',
      description: `Aleluya Maternity · pedido ${order.id.slice(0, 8)}`,
      order_id: openpayOrderId,
      device_session_id: dto.deviceSessionId,
      customer,
    };

    if (dto.method === 'card') {
      if (!dto.openpayToken) {
        throw new BadRequestException('Falta el token de tarjeta Openpay');
      }
      basePayload.source_id = dto.openpayToken;
    } else {
      basePayload.source_id = null;
    }

    let charge;
    try {
      charge = await this.openpay.createCharge(basePayload);
    } catch (err) {
      const e = err as OpenpayError;
      const msg =
        e?.description ||
        e?.message ||
        'No se pudo crear el cargo en Openpay';
      throw new BadRequestException(msg);
    }

    const status = String(charge.status || '').toUpperCase();
    const reference = charge.payment_method?.reference ?? null;

    // Solo COMPLETED cuenta como pagado. IN_PROGRESS queda pendiente (webhook/sync).
    const isCardApproved = dto.method === 'card' && status === 'COMPLETED';
    const isCardRejected =
      dto.method === 'card' &&
      status !== 'COMPLETED' &&
      status !== 'IN_PROGRESS' &&
      status !== '';

    if (isCardRejected) {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.REJECTED,
          method: 'card',
          openpayChargeId: charge.id ?? null,
          rawResponse: JSON.stringify(charge),
        },
      });
      throw new BadRequestException(
        `El pago fue rechazado (estado Openpay: ${status || 'desconocido'})`,
      );
    }

    // Yape/store y tarjeta IN_PROGRESS: PENDING hasta charge.succeeded
    const updated = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          method: dto.method,
          openpayChargeId: charge.id ?? null,
          paymentReference: reference,
          status: isCardApproved
            ? PaymentStatus.APPROVED
            : PaymentStatus.PENDING,
          rawResponse: JSON.stringify(charge),
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: isCardApproved ? OrderStatus.PAID : OrderStatus.PENDING,
        },
        include: {
          payment: true,
          items: true,
        },
      });

      return { payment, order: updatedOrder };
    });

    if (dto.method === 'store') {
      this.logger.log(
        `Cargo Yape/store creado order=${order.id} charge=${charge.id} ref=${reference} (espera webhook)`,
      );
      return {
        message: 'Referencia de pago generada. Pendiente de confirmación.',
        pending: true,
        paymentReference: reference,
        instructions:
          'Abre tu app de Yape, ve a Yapear Servicios, busca Kashio en la categoría Compras Online, ingresa este código y confirma. El pedido se actualizará automáticamente cuando Openpay notifique el pago.',
        order: updated.order,
        payment: updated.payment,
        openpay: charge,
      };
    }

    if (!isCardApproved) {
      this.logger.log(
        `Cargo tarjeta pendiente order=${order.id} status=${status} (espera webhook/sync)`,
      );
      return {
        message: 'Pago en proceso. Confirmaremos cuando Openpay lo complete.',
        pending: true,
        openpayStatus: status,
        order: updated.order,
        payment: updated.payment,
        openpay: charge,
      };
    }

    return {
      message: 'Pago aprobado',
      pending: false,
      order: updated.order,
      payment: updated.payment,
      openpay: charge,
    };
  }

  /**
   * Fuente de verdad Openpay para restringir PENDING/PAID en admin.
   * Fail-closed: si hay cargo pero no se puede consultar, lanza error.
   */
  async getOpenpayPaymentGate(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const chargeId = order.payment?.openpayChargeId ?? null;
    if (!chargeId) {
      return {
        orderId,
        hasCharge: false,
        openpayStatus: null as string | null,
        paymentConfirmed: false,
        allowPending: true,
        allowPaid: false,
      };
    }

    if (!this.openpay.isConfigured()) {
      throw new ServiceUnavailableException(
        'Openpay no está configurado; no se puede validar el pago',
      );
    }

    let charge;
    try {
      charge = await this.openpay.getCharge(chargeId);
    } catch (err) {
      const e = err as OpenpayError;
      throw new BadRequestException(
        e?.description ||
          e?.message ||
          'No se pudo consultar el cargo en Openpay',
      );
    }

    const openpayStatus = String(charge.status || '').toUpperCase() || null;
    const paymentConfirmed = openpayStatus === 'COMPLETED';

    return {
      orderId,
      hasCharge: true,
      openpayStatus,
      paymentConfirmed,
      allowPending: !paymentConfirmed,
      allowPaid: paymentConfirmed,
    };
  }

  /**
   * Consulta el cargo en Openpay y, si ya está COMPLETED, marca el pedido pagado.
   * Útil si el webhook se retrasó; no simula el pago.
   */
  async syncChargeStatus(orderId: string, userId?: string, asAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (!asAdmin && userId && order.userId !== userId) {
      throw new ForbiddenException('No puedes consultar este pedido');
    }
    if (!order.payment?.openpayChargeId) {
      throw new BadRequestException('El pedido no tiene cargo Openpay');
    }
    if (order.payment.status === PaymentStatus.APPROVED) {
      return {
        message: 'El pago ya estaba aprobado',
        order: await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { payment: true, items: true },
        }),
      };
    }

    let charge;
    try {
      charge = await this.openpay.getCharge(order.payment.openpayChargeId);
    } catch (err) {
      const e = err as OpenpayError;
      throw new BadRequestException(
        e?.description || e?.message || 'No se pudo consultar el cargo en Openpay',
      );
    }

    const status = String(charge.status || '').toUpperCase();
    if (status !== 'COMPLETED') {
      return {
        message: `Cargo aún no completado (estado Openpay: ${status || 'desconocido'})`,
        pending: true,
        openpayStatus: status,
        order,
      };
    }

    const updated = await this.markOrderPaid(
      order.id,
      order.payment.id,
      charge,
    );

    return {
      message: 'Pago confirmado vía consulta a Openpay',
      pending: false,
      order: updated,
    };
  }

  /**
   * Webhook Openpay (LatAm):
   * - type "verification" → devolver/aceptar código al registrar el webhook
   * - type "charge.succeeded" → marcar pedido PAID
   * - type "charge.failed" / cancelado → opcionalmente REJECTED
   */
  async handleOpenpayWebhook(
    payload: Record<string, unknown>,
    authHeader?: string,
  ) {
    this.assertWebhookBasicAuth(authHeader);

    const type = String(payload.type ?? '').toLowerCase();
    this.logger.log(`Webhook Openpay type=${type}`);

    // Registro/verificación del webhook en el dashboard Openpay
    if (type === 'verification') {
      const code =
        (payload.verification_code as string) ||
        ((payload.data as Record<string, unknown> | undefined)
          ?.verification_code as string) ||
        null;
      this.lastWebhookVerification = {
        code,
        at: new Date().toISOString(),
        raw: payload,
      };
      this.logger.warn(
        `Openpay webhook verification_code=${code ?? '(no enviado)'}`,
      );
      return {
        received: true,
        type: 'verification',
        verification_code: code,
      };
    }

    const transaction =
      (payload.transaction as Record<string, unknown> | undefined) ||
      ((payload.data as Record<string, unknown> | undefined)
        ?.object as Record<string, unknown> | undefined) ||
      {};

    const chargeId = String(transaction.id ?? '');
    const status = String(transaction.status ?? '').toUpperCase();
    const orderIdRaw = String(transaction.order_id ?? '');
    const ourOrderId = orderIdRaw.startsWith('ord-')
      ? orderIdRaw.slice(4)
      : orderIdRaw;

    if (type === 'charge.succeeded' || status === 'COMPLETED') {
      return this.applySucceededCharge({
        chargeId,
        ourOrderId,
        payload,
        transaction,
      });
    }

    if (
      type === 'charge.failed' ||
      type === 'charge.cancelled' ||
      status === 'FAILED' ||
      status === 'CANCELLED'
    ) {
      const payment = await this.findPayment(chargeId, ourOrderId);
      if (!payment) {
        return { received: true, matched: false, type, chargeId, ourOrderId };
      }
      if (payment.status !== PaymentStatus.APPROVED) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REJECTED,
            rawResponse: JSON.stringify(payload),
          },
        });
      }
      return {
        received: true,
        matched: true,
        type,
        orderId: payment.orderId,
        message: 'Pago marcado como rechazado',
      };
    }

    return { received: true, ignored: true, type, status };
  }

  private async applySucceededCharge(opts: {
    chargeId: string;
    ourOrderId: string;
    payload: Record<string, unknown>;
    transaction: Record<string, unknown>;
  }) {
    const payment = await this.findPayment(opts.chargeId, opts.ourOrderId);
    if (!payment) {
      this.logger.warn(
        `Webhook charge.succeeded sin match chargeId=${opts.chargeId} orderId=${opts.ourOrderId}`,
      );
      return {
        received: true,
        matched: false,
        chargeId: opts.chargeId,
        ourOrderId: opts.ourOrderId,
      };
    }

    if (payment.status === PaymentStatus.APPROVED) {
      return {
        received: true,
        matched: true,
        alreadyPaid: true,
        orderId: payment.orderId,
      };
    }

    // Fail-closed: sin revalidación COMPLETED no marcamos pagado
    if (!opts.chargeId || !this.openpay.isConfigured()) {
      this.logger.warn(
        `Webhook succeeded sin revalidación posible chargeId=${opts.chargeId}`,
      );
      return {
        received: true,
        matched: true,
        deferred: true,
        reason: 'revalidation_unavailable',
        orderId: payment.orderId,
      };
    }

    try {
      const live = await this.openpay.getCharge(opts.chargeId);
      const liveStatus = String(live.status || '').toUpperCase();
      if (liveStatus !== 'COMPLETED') {
        this.logger.warn(
          `Webhook succeeded pero cargo live status=${liveStatus}`,
        );
        return {
          received: true,
          matched: true,
          deferred: true,
          openpayStatus: liveStatus,
          orderId: payment.orderId,
        };
      }
    } catch (err) {
      this.logger.warn(
        `No se pudo revalidar cargo ${opts.chargeId}: ${String(err)}`,
      );
      return {
        received: true,
        matched: true,
        deferred: true,
        reason: 'revalidation_failed',
        orderId: payment.orderId,
      };
    }

    await this.markOrderPaid(payment.orderId, payment.id, opts.payload);
    this.logger.log(`Pedido ${payment.orderId} marcado PAID por webhook`);

    return {
      received: true,
      matched: true,
      orderId: payment.orderId,
      message: 'Pedido marcado como pagado',
    };
  }

  private async findPayment(chargeId: string, ourOrderId: string) {
    if (chargeId) {
      const byCharge = await this.prisma.payment.findFirst({
        where: { openpayChargeId: chargeId },
      });
      if (byCharge) return byCharge;
    }
    if (ourOrderId) {
      return this.prisma.payment.findFirst({
        where: { orderId: ourOrderId },
      });
    }
    return null;
  }

  private async markOrderPaid(
    orderId: string,
    paymentId: string,
    raw: unknown,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.APPROVED,
          rawResponse: JSON.stringify(raw),
        },
      });
      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
        include: { payment: true, items: true },
      });
    });
  }

  private assertWebhookBasicAuth(authHeader?: string) {
    const user = this.config.get<string>('OPENPAY_WEBHOOK_USER')?.trim();
    const pass = this.config.get<string>('OPENPAY_WEBHOOK_PASSWORD')?.trim();
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    // En producción siempre exigimos Basic Auth (fail-closed)
    if (!user || !pass) {
      if (isProd) {
        throw new UnauthorizedException(
          'Webhook Basic Auth no configurado en el servidor',
        );
      }
      this.logger.warn(
        'OPENPAY_WEBHOOK_USER/PASSWORD vacíos — auth omitida (solo no-prod)',
      );
      return;
    }

    if (!authHeader?.startsWith('Basic ')) {
      throw new UnauthorizedException('Webhook requiere Basic Auth');
    }
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const u = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const p = sep >= 0 ? decoded.slice(sep + 1) : '';
    if (u !== user || p !== pass) {
      throw new UnauthorizedException('Credenciales de webhook inválidas');
    }
  }
}
