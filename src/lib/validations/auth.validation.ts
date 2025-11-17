import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
			message: 'Please enter a valid email address'
		}),
	password: z
		.string()
		.min(1, 'Password is required')
		.min(8, 'Password must be at least 8 characters'),
	rememberMe: z.boolean().optional()
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register validation schema
export const registerSchema = z
	.object({
		fullName: z
			.string()
			.min(1, 'Full name is required')
			.min(3, 'Full name must be at least 3 characters')
			.max(100, 'Full name must not exceed 100 characters')
			.regex(/^[a-zA-Z\s'-]+$/, {
				message: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
			}),
		email: z
			.string()
			.min(1, 'Email is required')
			.regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
				message: 'Please enter a valid email address'
			}),
		phoneNumber: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, {
				message: 'Phone number is required'
			})
			.refine(
				(val) => {
					if (!val) return false;
					// Remove all non-digit characters for validation
					const digitsOnly = val.replace(/\D/g, '');
					// International phone numbers are typically 10-15 digits
					return digitsOnly.length >= 10 && digitsOnly.length <= 15;
				},
				{
					message: 'Please enter a valid phone number'
				}
			),
		password: z
			.string()
			.min(1, 'Password is required')
			.min(8, 'Password must be at least 8 characters')
			.max(100, 'Password must not exceed 100 characters')
			.regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
			.regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
			.regex(/[0-9]/, { message: 'Password must contain at least one number' })
			.regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
		confirmPassword: z.string().min(1, 'Please confirm your password'),
		agreeToTerms: z.boolean().refine((val) => val === true, {
			message: 'You must agree to the terms and conditions'
		})
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});

export type RegisterFormData = z.infer<typeof registerSchema>;
