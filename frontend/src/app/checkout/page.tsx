'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
import {
  createCardToken,
  isOpenpayConfigured,
  setupDeviceSession,
} from '@/lib/openpay';
import { addressSchema, type AddressValues } from '@/lib/schemas';
import { formatPrice, type Address } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { useCartStore, type CartItem } from '@/store/cart';

type ShippingId = 'standard' | 'express';
type PaymentId = 'card' | 'yape' | 'whatsapp';

const SHIPPING = {
  standard: {
    id: 'standard' as const,
    label: 'Envío estándar',
    detail: '2 a 4 días hábiles · Lima y provincias',
    cost: 15,
  },
  express: {
    id: 'express' as const,
    label: 'Envío express',
    detail: '24 a 48 h · Lima Metropolitana',
    cost: 28,
  },
};

const FREE_SHIPPING_FROM = 250;
const IGV_RATE = 0.18;

function estimateDeliveryLabel(daysMin: number, daysMax: number) {
  const fmt = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  const start = new Date();
  start.setDate(start.getDate() + daysMin);
  const end = new Date();
  end.setDate(end.getDate() + daysMax);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function CheckoutSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--color-line)] py-8 first:pt-0 last:border-b-0">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OrderSummary({
  items,
  subtotal,
  shippingCost,
  discount,
  total,
  igv,
}: {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  igv: number;
}) {
  return (
    <aside className="border border-[var(--color-line)] bg-[var(--color-stone)]/40 p-6 md:sticky md:top-28 md:p-8">
      <h2 className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]">
        Tu pedido
      </h2>

      <ul className="mt-6 space-y-5">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[var(--color-stone)]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]/20">
                  A
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                {item.name}
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                {item.size} · {item.color} · Cant. {item.quantity}
              </p>
              <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-2 border-t border-[var(--color-line)] pt-6 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        <div className="flex justify-between">
          <span>
            {items.reduce((n, i) => n + i.quantity, 0)} producto
            {items.reduce((n, i) => n + i.quantity, 0) === 1 ? '' : 's'}
          </span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Envío</span>
          <span>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-[var(--color-rose)]">
            <span>Descuento</span>
            <span>- {formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-[var(--color-line)] pt-4 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <p className="pt-1 text-xs text-[var(--color-ink-soft)]">
          Incluye IGV estimado {formatPrice(igv)}
        </p>
      </div>
    </aside>
  );
}

/**
 * Checkout estilo boutique: Contacto → Dirección → Entrega → Pago + resumen.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [dni, setDni] = useState('');
  const [shippingId, setShippingId] = useState<ShippingId>('standard');
  const [paymentId, setPaymentId] = useState<PaymentId>('card');
  const [deviceSessionId, setDeviceSessionId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [yapeReference, setYapeReference] = useState<string | null>(null);
  const [yapeInstructions, setYapeInstructions] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: 'PE',
      isDefault: true,
      city: '',
      state: '',
      street: '',
      postalCode: '',
      phone: '',
      label: 'Casa',
    },
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!isOpenpayConfigured()) return;
    setupDeviceSession()
      .then(setDeviceSessionId)
      .catch(() => {
        /* se reintentará al pagar */
      });
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login?next=/checkout');
      return;
    }
    if (items.length === 0) {
      router.replace('/carrito');
      return;
    }

    api
      .getAddresses(token)
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) {
          setSelectedId(def.id);
          setEditingAddress(false);
        } else {
          setEditingAddress(true);
        }
      })
      .catch((e) => {
        setLoadError(
          e instanceof ApiError ? e.message : 'No se pudieron cargar direcciones',
        );
      });
  }, [mounted, token, items.length, router]);

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null;

  const shippingBase = SHIPPING[shippingId].cost;
  const shippingCost =
    shippingId === 'standard' && subtotal >= FREE_SHIPPING_FROM
      ? 0
      : shippingBase;

  const total = Math.max(0, subtotal - discount) + shippingCost;
  const igv = Math.round(((total * IGV_RATE) / (1 + IGV_RATE)) * 100) / 100;

  const deliveryWindow = useMemo(
    () =>
      shippingId === 'express'
        ? estimateDeliveryLabel(1, 2)
        : estimateDeliveryLabel(2, 4),
    [shippingId],
  );

  // Si cambia el carrito, revalidar cupón aplicado
  useEffect(() => {
    if (!token || !promoApplied) return;
    let cancelled = false;
    api
      .validatePromoCode(token, {
        code: promoApplied,
        subtotal,
        shippingMethod: shippingId,
      })
      .then((res) => {
        if (cancelled) return;
        setDiscount(res.discountAmount);
        setPromoMessage(res.message);
      })
      .catch(() => {
        if (cancelled) return;
        setPromoApplied(null);
        setDiscount(0);
        setPromoMessage(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, promoApplied, token, shippingId]);

  const applyPromo = async () => {
    if (!token) return;
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setStatus('Ingresa un código');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await api.validatePromoCode(token, {
        code,
        subtotal,
        shippingMethod: shippingId,
      });
      setPromoApplied(res.code);
      setDiscount(res.discountAmount);
      setPromoMessage(res.message);
      setPromoCode(res.code);
    } catch (e) {
      setPromoApplied(null);
      setDiscount(0);
      setPromoMessage(null);
      setStatus(e instanceof ApiError ? e.message : 'Cupón no válido');
    } finally {
      setBusy(false);
    }
  };

  const clearPromo = () => {
    setPromoApplied(null);
    setDiscount(0);
    setPromoMessage(null);
    setPromoCode('');
  };

  const createAddress = async (values: AddressValues) => {
    if (!token) return;
    setBusy(true);
    setStatus(null);
    try {
      const created = await api.createAddress(token, values);
      setAddresses((prev) => [...prev, created]);
      setSelectedId(created.id);
      setEditingAddress(false);
      form.reset({ country: 'PE', isDefault: false, label: 'Casa' });
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : 'Error al guardar dirección');
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!token || !user || !selectedId) {
      setStatus('Elige o crea una dirección de envío');
      return;
    }
    if (!acceptedTerms) {
      setStatus('Debes aceptar los términos para continuar');
      return;
    }
    if (dni && !/^\d{8}$/.test(dni.trim())) {
      setStatus('El DNI debe tener 8 dígitos');
      return;
    }

    if (paymentId === 'card') {
      if (!cardNumber || !holderName || !expMonth || !expYear || !cvv) {
        setStatus('Completa los datos de la tarjeta');
        return;
      }
    }

    setBusy(true);
    setStatus('Creando pedido…');
    setYapeReference(null);
    setYapeInstructions(null);

    const paymentNote =
      paymentId === 'whatsapp'
        ? 'Pago: coordinación por WhatsApp'
        : paymentId === 'yape'
          ? 'Pago: Yape (Openpay store)'
          : 'Pago: tarjeta (Openpay)';

    const noteParts = [
      notes.trim(),
      dni.trim() ? `DNI: ${dni.trim()}` : '',
      `Envío: ${SHIPPING[shippingId].label}`,
      paymentNote,
    ].filter(Boolean);

    try {
      const order = await api.createOrder(token, {
        addressId: selectedId,
        shippingMethod: shippingId,
        notes: noteParts.join(' · ') || undefined,
        promoCode: promoApplied || undefined,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });

      const paidTotal = Number(order.total);

      if (paymentId === 'whatsapp') {
        clearCart();
        const msg = encodeURIComponent(
          `Hola, acabo de crear el pedido ${order.id.slice(0, 8)} por ${formatPrice(paidTotal)}. ¿Me ayudan a coordinar el pago?`,
        );
        setStatus('Pedido creado. Abriendo WhatsApp…');
        window.open(`https://wa.me/51922412314?text=${msg}`, '_blank');
        setTimeout(() => router.push('/mi-cuenta/pedidos'), 1200);
        return;
      }

      if (!isOpenpayConfigured()) {
        setStatus(
          'Openpay no está configurado en el frontend (.env.local). El pedido quedó pendiente.',
        );
        setTimeout(() => router.push('/mi-cuenta/pedidos'), 2500);
        return;
      }

      let sessionId = deviceSessionId;
      if (!sessionId) {
        setStatus('Preparando sesión segura…');
        sessionId = await setupDeviceSession();
        setDeviceSessionId(sessionId);
      }

      if (paymentId === 'yape') {
        setStatus('Generando código Yape…');
        const result = await api.chargePayment(token, {
          orderId: order.id,
          method: 'store',
          deviceSessionId: sessionId,
        });
        clearCart();
        setYapeReference(result.paymentReference ?? null);
        setYapeInstructions(
          result.instructions ??
            'Abre tu app de Yape, ve a Yapear Servicios, busca Kashio en la categoría Compras Online, ingresa este código y confirma. El pedido se actualizará cuando Openpay notifique el pago (webhook).',
        );
        setStatus(
          'Pedido pendiente de pago. Cuando Yape confirme, Openpay avisará por webhook y el estado cambiará solo.',
        );
        return;
      }

      setStatus('Tokenizando tarjeta…');
      const tokenCard = await createCardToken({
        cardNumber,
        holderName,
        expMonth,
        expYear,
        cvv,
      });

      setStatus('Confirmando pago con Openpay…');
      await api.chargePayment(token, {
        orderId: order.id,
        method: 'card',
        deviceSessionId: sessionId,
        openpayToken: tokenCard.id,
      });

      clearCart();
      setStatus('Pago aprobado. Redirigiendo…');
      router.push('/mi-cuenta/pedidos');
    } catch (e) {
      setStatus(
        e instanceof ApiError || e instanceof Error
          ? e.message
          : 'No se pudo completar el pago',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-6xl px-5 pt-28 pb-20">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em]">
          Pagar
        </h1>
        <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 pb-24 md:px-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)] md:text-5xl">
        Pagar
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Revisa tus datos y confirma el pedido con total transparencia.
      </p>

      {loadError && <p className="mt-6 field-error">{loadError}</p>}

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          {/* Contacto */}
          <CheckoutSection
            title="Contacto"
            action={
              <button
                type="button"
                className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                onClick={() => setEditingContact((v) => !v)}
              >
                {editingContact ? 'Listo' : 'Editar'}
              </button>
            }
          >
            {editingContact ? (
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
                El email de la cuenta es{' '}
                <span className="text-[var(--color-ink)]">{user?.email}</span>.
                Para cambiarlo, cierra sesión y regístrate con otro correo.
              </p>
            ) : (
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                {user?.email}
              </p>
            )}
            <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              {user?.firstName} {user?.lastName}
              {user?.phone ? ` · ${user.phone}` : ''}
            </p>
          </CheckoutSection>

          {/* Dirección */}
          <CheckoutSection
            title="Dirección"
            action={
              <button
                type="button"
                className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                onClick={() => setEditingAddress((v) => !v)}
              >
                {editingAddress ? 'Cerrar' : 'Editar'}
              </button>
            }
          >
            {!editingAddress && selectedAddress ? (
              <div className="space-y-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                <p className="font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p>{selectedAddress.street}</p>
                <p className="text-[var(--color-ink-soft)]">
                  {selectedAddress.city}, {selectedAddress.state},{' '}
                  {selectedAddress.postalCode}, {selectedAddress.country}
                </p>
                {selectedAddress.phone && (
                  <p className="text-[var(--color-ink-soft)]">
                    {selectedAddress.phone}
                  </p>
                )}
                <p className="mt-4 border border-[var(--color-line)] bg-[var(--color-stone)]/50 px-4 py-3 text-xs text-[var(--color-ink-soft)]">
                  La dirección de envío y facturación son la misma.
                </p>
              </div>
            ) : (
              <>
                {addresses.length > 0 && (
                  <ul className="mb-6 space-y-3">
                    {addresses.map((addr) => (
                      <li key={addr.id}>
                        <label
                          className={`flex cursor-pointer gap-3 border px-4 py-3 transition-colors ${
                            selectedId === addr.id
                              ? 'border-[var(--color-ink)]'
                              : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            className="mt-1"
                            checked={selectedId === addr.id}
                            onChange={() => {
                              setSelectedId(addr.id);
                              setEditingAddress(false);
                            }}
                          />
                          <span className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                            {addr.label ? (
                              <strong className="font-medium">{addr.label} · </strong>
                            ) : null}
                            {addr.street}, {addr.city}, {addr.state}{' '}
                            {addr.postalCode}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={form.handleSubmit(createAddress)}
                  className="grid gap-4 border border-[var(--color-line)] p-5 sm:grid-cols-2"
                >
                  <div className="sm:col-span-2">
                    <label className="field-label">Etiqueta</label>
                    <input
                      className="field-input"
                      placeholder="Casa"
                      {...form.register('label')}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label">Calle y referencia</label>
                    <input className="field-input" {...form.register('street')} />
                    {form.formState.errors.street && (
                      <p className="field-error">
                        {form.formState.errors.street.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="field-label">Distrito / Ciudad</label>
                    <input className="field-input" {...form.register('city')} />
                  </div>
                  <div>
                    <label className="field-label">Departamento</label>
                    <input className="field-input" {...form.register('state')} />
                  </div>
                  <div>
                    <label className="field-label">Código postal</label>
                    <input
                      className="field-input"
                      {...form.register('postalCode')}
                    />
                  </div>
                  <div>
                    <label className="field-label">Teléfono</label>
                    <input className="field-input" {...form.register('phone')} />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={busy} className="btn-outline">
                      Guardar dirección
                    </button>
                  </div>
                </form>
              </>
            )}

            <div className="mt-6 max-w-xs">
              <label className="field-label" htmlFor="dni">
                DNI (opcional)
              </label>
              <input
                id="dni"
                className="field-input"
                inputMode="numeric"
                maxLength={8}
                placeholder="71618892"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              />
              <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                Para boleta o factura electrónica.
              </p>
            </div>
          </CheckoutSection>

          {/* Entrega */}
          <CheckoutSection title="Opciones de entrega">
            <ul className="space-y-3">
                {(
                  Object.values(SHIPPING) as (typeof SHIPPING)[ShippingId][]
                ).map((opt) => {
                  const free =
                    opt.id === 'standard' && subtotal >= FREE_SHIPPING_FROM;
                  const cost = free ? 0 : opt.cost;
                  return (
                    <li key={opt.id}>
                      <label
                        className={`flex cursor-pointer items-start justify-between gap-4 border px-4 py-4 transition-colors ${
                          shippingId === opt.id
                            ? 'border-[var(--color-ink)]'
                            : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/40'
                        }`}
                      >
                        <span className="flex gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            className="mt-1"
                            checked={shippingId === opt.id}
                            onChange={() => setShippingId(opt.id)}
                          />
                          <span>
                            <span className="block font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                              {opt.label}
                            </span>
                            <span className="mt-1 block font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                              {opt.detail}
                            </span>
                            {shippingId === opt.id && (
                              <span className="mt-2 block font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                                Estimado: {deliveryWindow}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                          {cost === 0 ? 'Gratis' : formatPrice(cost)}
                        </span>
                      </label>
                    </li>
                  );
                })}
            </ul>
            {subtotal < FREE_SHIPPING_FROM && (
              <p className="mt-4 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                Envío estándar gratis desde {formatPrice(FREE_SHIPPING_FROM)}.
              </p>
            )}
          </CheckoutSection>

          {/* Pago */}
          <CheckoutSection title="Pago">
            <div className="mb-5 space-y-3">
              <p className="border border-[var(--color-line)] bg-[var(--color-stone)]/50 px-4 py-3 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--color-ink-soft)]">
                Tu pago se procesa de forma segura con Openpay. No almacenamos
                los datos de tu tarjeta en nuestros servidores.
              </p>
              <p className="flex items-start gap-2 border border-[var(--color-line)] bg-[var(--color-stone)]/50 px-4 py-3 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--color-ink-soft)]">
                <svg
                  className="mt-0.5 shrink-0"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Conexión cifrada (SSL). Transacciones protegidas con Openpay.
              </p>
            </div>

            <ul className="space-y-3">
              <li>
                <label
                  className={`flex cursor-pointer items-center justify-between gap-4 border px-4 py-4 transition-colors ${
                    paymentId === 'card'
                      ? 'border-[var(--color-ink)]'
                      : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/40'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentId === 'card'}
                      onChange={() => setPaymentId('card')}
                    />
                    <span>
                      <span className="block font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                        Pagar con tarjeta
                      </span>
                      <span className="mt-1 block font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                        Visa, Mastercard, Amex · cobro inmediato
                      </span>
                    </span>
                  </span>
                  <span className="flex gap-1.5 opacity-70" aria-hidden>
                    {['VISA', 'MC', 'AMEX'].map((b) => (
                      <span
                        key={b}
                        className="border border-[var(--color-line)] px-1.5 py-0.5 font-[family-name:var(--font-body)] text-[9px] tracking-wide text-[var(--color-ink-soft)]"
                      >
                        {b}
                      </span>
                    ))}
                  </span>
                </label>
              </li>
              <li>
                <label
                  className={`flex cursor-pointer items-center gap-3 border px-4 py-4 transition-colors ${
                    paymentId === 'yape'
                      ? 'border-[var(--color-ink)]'
                      : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentId === 'yape'}
                    onChange={() => setPaymentId('yape')}
                  />
                  <span>
                    <span className="block font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                      Pagar con Yape
                    </span>
                    <span className="mt-1 block font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                      Generamos un código · confirmación vía Kashio (pendiente
                      hasta el pago)
                    </span>
                  </span>
                </label>
              </li>
              <li>
                <label
                  className={`flex cursor-pointer items-center gap-3 border px-4 py-4 transition-colors ${
                    paymentId === 'whatsapp'
                      ? 'border-[var(--color-ink)]'
                      : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentId === 'whatsapp'}
                    onChange={() => setPaymentId('whatsapp')}
                  />
                  <span>
                    <span className="block font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                      Coordinar por WhatsApp
                    </span>
                    <span className="mt-1 block font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                      Creamos el pedido y te ayudamos a pagar por transferencia
                    </span>
                  </span>
                </label>
              </li>
            </ul>

            {paymentId === 'card' && (
              <div className="mt-6 grid gap-4 border border-[var(--color-line)] p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="card-number">
                    Número de tarjeta
                  </label>
                  <input
                    id="card-number"
                    className="field-input"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4111 1111 1111 1111"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="holder-name">
                    Titular
                  </label>
                  <input
                    id="holder-name"
                    className="field-input"
                    autoComplete="cc-name"
                    placeholder="Como figura en la tarjeta"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="exp-month">
                    Mes
                  </label>
                  <input
                    id="exp-month"
                    className="field-input"
                    inputMode="numeric"
                    placeholder="12"
                    maxLength={2}
                    value={expMonth}
                    onChange={(e) =>
                      setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="exp-year">
                    Año
                  </label>
                  <input
                    id="exp-year"
                    className="field-input"
                    inputMode="numeric"
                    placeholder="28"
                    maxLength={4}
                    value={expYear}
                    onChange={(e) =>
                      setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="cvv">
                    CVV
                  </label>
                  <input
                    id="cvv"
                    className="field-input"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) =>
                      setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                  />
                </div>
                <p className="sm:col-span-2 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  Sandbox: usa tarjetas de prueba de Openpay (ej. 4111111111111111).
                </p>
              </div>
            )}

            {yapeReference && (
              <div className="mt-6 border border-[var(--color-line)] bg-[var(--color-stone)]/50 p-5">
                <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink)]">
                  Código Yape
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.12em] text-[var(--color-ink)]">
                  {yapeReference}
                </p>
                <p className="mt-4 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--color-ink-soft)]">
                  {yapeInstructions}
                </p>
                <Link
                  href="/mi-cuenta/pedidos"
                  className="mt-5 inline-block font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink)]"
                >
                  Ver mis pedidos
                </Link>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                className="flex w-full items-center justify-between border border-[var(--color-line)] px-4 py-3 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                onClick={() => setPromoOpen((v) => !v)}
              >
                Usa un código promocional
                <span aria-hidden>{promoOpen ? '−' : '+'}</span>
              </button>
              {promoOpen && (
                <div className="mt-3 flex gap-2">
                  <input
                    className="field-input"
                    placeholder="Código"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    className="btn-outline shrink-0 px-4"
                    onClick={applyPromo}
                    disabled={busy}
                  >
                    Aplicar
                  </button>
                </div>
              )}
              {promoApplied && (
                <p className="mt-2 flex flex-wrap items-center gap-3 font-[family-name:var(--font-body)] text-xs text-[var(--color-rose)]">
                  <span>
                    {promoMessage ?? `Cupón ${promoApplied} aplicado`} (−
                    {formatPrice(discount)})
                  </span>
                  <button
                    type="button"
                    className="uppercase tracking-[0.14em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                    onClick={clearPromo}
                  >
                    Quitar
                  </button>
                </p>
              )}
            </div>

            <div className="mt-6">
              <label className="field-label" htmlFor="notes">
                Notas (opcional)
              </label>
              <textarea
                id="notes"
                rows={2}
                className="field-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: dejar en recepción"
              />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span className="font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--color-ink-soft)]">
                Acepto los{' '}
                <Link href="/productos" className="underline underline-offset-2">
                  términos de compra
                </Link>{' '}
                y la política de envíos de Aleluya Maternity.
              </span>
            </label>

            {status && (
              <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[var(--color-rose)]">
                {status}
              </p>
            )}

            {!yapeReference && (
              <div className="mt-8 flex flex-col gap-4">
                <button
                  type="button"
                  disabled={busy || !selectedId || !acceptedTerms}
                  onClick={pay}
                  className="btn-outline w-full disabled:opacity-40 sm:w-auto"
                >
                  {busy
                    ? 'Procesando…'
                    : paymentId === 'whatsapp'
                      ? 'Hacer pedido por WhatsApp'
                      : paymentId === 'yape'
                        ? 'Generar código Yape'
                        : isOpenpayConfigured()
                          ? 'Pagar con tarjeta'
                          : 'Crear pedido'}
                </button>
                <Link
                  href="/carrito"
                  className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  Volver a la bolsa
                </Link>
              </div>
            )}
          </CheckoutSection>
        </div>

        <OrderSummary
          items={items}
          subtotal={subtotal}
          shippingCost={shippingCost}
          discount={discount}
          total={total}
          igv={igv}
        />
      </div>
    </div>
  );
}
