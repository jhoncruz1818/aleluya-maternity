# Lunaria — Tienda de ropa para mamá

E-commerce completo (backend + frontend) para una boutique de ropa premamá, lactancia y postparto.

Sirve como **negocio real** (catálogo, carrito, pedidos, pagos Openpay) y como **portafolio** (NestJS + Next.js, buenas prácticas).

```
pagina mama/
├── backend/     # API NestJS + Prisma + SQL Server
└── frontend/    # Tienda Next.js (App Router) + Tailwind
```

---

## Qué incluye

| Área | Tecnología |
|------|------------|
| API | NestJS, TypeScript, Prisma, JWT, Swagger, Openpay |
| Base de datos | SQL Server (SSMS) |
| Tienda | Next.js 15, React Query, Zustand, React Hook Form + Zod |
| Pagos | Openpay (token en frontend → cargo en backend) |

### Flujo de compra

1. El cliente navega el catálogo y agrega variantes (talla/color) a la bolsa.
2. Inicia sesión → elige dirección → crea el pedido.
3. Openpay genera un token de tarjeta; el backend crea el cargo y marca el pedido como `PAID`.
4. El admin gestiona productos y estados de pedido en `/admin`.

---

## Requisitos

- **Node.js** 20+
- **SQL Server** en local (con SSMS)
- npm
- (Opcional) cuenta Openpay de prueba para pagos reales

---

## 1. Base de datos

1. Abre SSMS y conéctate a tu instancia.
2. Crea la base (si aún no existe):

```sql
CREATE DATABASE tienda_ropa_mama;
```

3. Asegúrate de que tu usuario SQL (ej. `edteam_app`) tenga permisos sobre esa base  
   (`db_owner` es lo más simple en local).

---

## 2. Backend (`backend/`)

### Instalar

```bash
cd backend
npm install
cp .env.example .env
```

### Configurar `.env`

Edita `backend/.env`:

```env
PORT=3001
DATABASE_URL="sqlserver://localhost:1433;database=tienda_ropa_mama;user=TU_USUARIO;password=TU_PASSWORD;encrypt=true;trustServerCertificate=true"
JWT_SECRET="cambia-este-secreto"
JWT_EXPIRES_IN="7d"
OPENPAY_MERCHANT_ID="tu_merchant_id"
OPENPAY_PRIVATE_KEY="sk_xxxxxxxx"
OPENPAY_PUBLIC_KEY="pk_xxxxxxxx"
OPENPAY_PRODUCTION="false"
OPENPAY_WEBHOOK_USER=""
OPENPAY_WEBHOOK_PASSWORD=""
FRONTEND_URL="http://localhost:3000"
```

Webhook (Yape): registra en el dashboard Openpay la URL pública:

`POST https://TU-DOMINIO-O-NGROK/api/payments/webhook/openpay`

Eventos: `verification`, `charge.succeeded` (y opcionalmente fallidos). Si usas Basic Auth, pon el mismo user/pass en `OPENPAY_WEBHOOK_*`.

**Notas:**

- Si la contraseña tiene caracteres especiales (ej. `!`), URL-encodéalos (`!` → `%21`) **o** prueba primero sin encoding; Prisma suele aceptar el `!` literal en el formato con `;`.
- `trustServerCertificate=true` evita errores SSL con certificados locales de SQL Server.
- Sin claves Openpay reales, los pedidos se pueden crear igual; el cobro online fallará hasta que las configures.

### Migraciones Prisma

```bash
npx prisma migrate dev
```

Eso crea las tablas (`User`, `Product`, `Order`, `Payment`, etc.) y genera el cliente Prisma.

(Opcional) Explorar la BD:

```bash
npx prisma studio
```

### Arrancar la API

```bash
npm run start:dev
```

| Recurso | URL |
|---------|-----|
| API | http://localhost:3001/api |
| Health | http://localhost:3001/api/health |
| Swagger | http://localhost:3001/api/docs |

Deja esta terminal abierta.

---

## 3. Frontend (`frontend/`)

En **otra** terminal:

```bash
cd frontend
npm install
```

Crea `frontend/.env.local` (si no existe):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_OPENPAY_MERCHANT_ID=tu_merchant_id
NEXT_PUBLIC_OPENPAY_PUBLIC_KEY=pk_xxxxxxxx
NEXT_PUBLIC_OPENPAY_SANDBOX=true
```

La clave **pública** de Openpay va aquí; la **secreta** solo en el backend.

### Arrancar la tienda

```bash
npm run dev
```

Abre: **http://localhost:3000**

---

## 4. Primer uso (datos de prueba)

### Crear un admin

1. Regístrate en http://localhost:3000/registro **o** usa un usuario ya creado.
2. En SSMS, promueve el rol:

```sql
USE tienda_ropa_mama;
UPDATE [User] SET role = N'ADMIN' WHERE email = N'tu@email.com';
```

3. Cierra sesión y vuelve a entrar. Verás el link **Admin** en el header.

### Cargar catálogo

1. Entra a http://localhost:3000/admin/productos/nuevo  
2. Crea una categoría antes si hace falta (vía Swagger `POST /api/categories` o desde un producto que ya tenga categoría).  
3. Completa nombre, precio, imagen (URL), y al menos una variante (SKU, talla, color, stock).

### Probar compra

1. Catálogo → detalle → **Agregar a la bolsa**  
2. **Bolsa** → **Checkout** (login si hace falta)  
3. Dirección de envío → crear pedido  
4. Sin Openpay configurado el pedido queda `PENDING` (útil para aprender el flujo)  
5. Con Openpay de prueba se abre el checkout y, si aprueba, el pedido pasa a `PAID`

Para el panel admin: registra un usuario en `/registro` y asígnale rol `ADMIN` en la base de datos (tabla `User`), o usa el usuario admin que ya hayas creado en local. **No subas contraseñas reales al repositorio.**

---

## Mapa de rutas

### Frontend

| Ruta | Descripción |
|------|-------------|
| `/` | Home editorial (hero + destacados) |
| `/productos` | Catálogo con filtros |
| `/productos/[slug]` | Detalle + agregar al carrito |
| `/carrito` | Bolsa |
| `/checkout` | Dirección + pago |
| `/login` · `/registro` | Auth |
| `/mi-cuenta/pedidos` | Historial del cliente |
| `/admin` | Panel (solo ADMIN) |

### Backend (prefijo `/api`)

| Módulo | Ejemplos |
|--------|----------|
| auth | `POST /auth/register`, `POST /auth/login` |
| products | `GET /products`, CRUD admin |
| categories | CRUD |
| addresses | CRUD del usuario |
| orders | crear / listar / cambiar estado (admin) |
| payments | `POST /payments/charge` |

Documentación interactiva: http://localhost:3001/api/docs

---

## Arquitectura (resumen para aprender)

```
Frontend (Next.js :3000)
    │  fetch + JWT (Bearer)
    ▼
Backend (NestJS :3001)
    │  Controller → Service → Prisma
    ▼
SQL Server (tienda_ropa_mama)
```

- **Controller:** rutas HTTP y Swagger  
- **Service:** reglas de negocio (stock, precios, Openpay)  
- **Prisma:** acceso tipado a SQL Server  
- **JWT + Guards:** protegen perfil, pedidos y admin  
- **Zustand:** carrito en el navegador (persiste en `localStorage`)  
- **Auth token:** también en `localStorage` (simple para aprender; en producción preferir cookie `httpOnly`)

---

## Scripts útiles

```bash
# Backend
cd backend
npm run start:dev      # API en watch mode
npm run prisma:studio  # UI de la base
npm run build

# Frontend
cd frontend
npm run dev            # http://localhost:3000
npm run build          # build de producción
npm run start          # servir el build
```

---

## Problemas frecuentes

| Problema | Qué revisar |
|----------|-------------|
| `P1000` / auth failed en Prisma | Usuario/password en `DATABASE_URL`, SQL Server encendido, `trustServerCertificate=true` |
| Frontend no carga productos | Backend en `:3001`, CORS/`FRONTEND_URL`, `NEXT_PUBLIC_API_URL` |
| Checkout pide login | Normal: los pedidos requieren JWT |
| Openpay 503 | Falta `OPENPAY_PRIVATE_KEY` / `OPENPAY_MERCHANT_ID` en `backend/.env` |
| Admin redirige al home | El usuario no tiene `role = ADMIN` en la tabla `User` |
| Puerto 3001 ocupado | Cierra el Nest anterior o cambia `PORT` |

---

## Marca

La tienda se presenta como **LUNARIA**: estilo boutique / lujo silencioso (mucho espacio, tipografía editorial, botones outline, carruseles suaves).

---

Hecho para aprender construyendo algo real: cada módulo del backend tiene comentarios del *por qué*, no solo del *qué*.
