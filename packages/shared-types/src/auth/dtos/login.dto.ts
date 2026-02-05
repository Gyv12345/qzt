import { createZodDto } from '../../utils'
import { loginSchema, loginResponseSchema } from '../schemas'

/**
 * 登录请求 DTO
 */
export class LoginDto extends createZodDto(loginSchema) {}

/**
 * 登录响应 DTO
 */
export class LoginResponseDto extends createZodDto(loginResponseSchema) {}

// 导出关联的 Schema 供外部使用
export { loginSchema, loginResponseSchema } from '../schemas'
