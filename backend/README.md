# Backend — Tienda de ropa para mamá

API REST con **NestJS + TypeScript + Prisma + SQL Server**.

## Requisitos

- Node.js 20+
- SQL Server (local) + SSMS
- npm

## Instalación

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` con tu usuario/password de SQL Server y tus claves Culqi.

## Migraciones Prisma

```bash
npx prisma migrate dev
npx prisma studio
```

## Arrancar

```bash
npm run start:dev
```

- API: http://localhost:3001/api
- Health: http://localhost:3001/api/health
- Swagger: http://localhost:3001/api/docs

## Módulos

| Módulo | Rutas base |
|--------|------------|
| auth | `/api/auth` |
| users | `/api/users` |
| categories | `/api/categories` |
| products | `/api/products` |
| addresses | `/api/addresses` |
| orders | `/api/orders` |
| payments | `/api/payments` |

## Flujo de compra

1. `POST /api/orders` — crea pedido + Payment PENDING (descuenta stock)
2. Frontend genera token con Culqi.js
3. `POST /api/payments/charge` — cargo Culqi → Order PAID

## Patrón de código

`Controller` → `Service` → `PrismaService`
