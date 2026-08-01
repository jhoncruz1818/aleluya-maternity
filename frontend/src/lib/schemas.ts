import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('El email no es válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  email: z.email('El email no es válido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Incluye al menos una letra y un número'),
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional(),
});

export const addressSchema = z.object({
  label: z.string().optional(),
  street: z.string().min(5, 'Dirección muy corta'),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(3),
  country: z.string().length(2).optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type AddressValues = z.infer<typeof addressSchema>;
