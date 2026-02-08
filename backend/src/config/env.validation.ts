import * as Joi from "joi";

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production")
    .default("development"),

  // 数据库配置
  DATABASE_PROVIDER: Joi.string().valid("sqlite", "mysql").default("sqlite"),
  DATABASE_URL: Joi.string().when("DATABASE_PROVIDER", {
    is: "sqlite",
    then: Joi.required(),
  }),
  DB_HOST: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_PORT: Joi.number().default(3306).when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_USERNAME: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_PASSWORD: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_DATABASE: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),

  // Redis配置
  REDIS_ENABLED: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().when("REDIS_ENABLED", {
    is: true,
    then: Joi.required(),
  }),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow(""),
  REDIS_DB: Joi.number().default(0),

  // JWT配置
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default("7d"),

  // 服务端口
  BACKEND_PORT: Joi.number().default(3456),

  // 应用配置
  APP_NAME: Joi.string().default("企智通"),
  APP_URL: Joi.string().default("http://localhost:7890"),
  API_URL: Joi.string().default("http://localhost:3456"),
}).unknown(true);

export const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value;
};
