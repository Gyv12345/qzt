export { createZodDto, getDtoSchema, ZodValidate, ZodValidationError } from './zod-dto'

// Swagger 工具（仅在 @nestjs/swagger 可用时导入）
export let applySwaggerDecorators: any, createDtoWithSwagger: any
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const swagger = require('./swagger')
  applySwaggerDecorators = swagger.applySwaggerDecorators
  createDtoWithSwagger = swagger.createDtoWithSwagger
} catch {
  // @nestjs/swagger 不可用时，这些函数为 undefined
}
