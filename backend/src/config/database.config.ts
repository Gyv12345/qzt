export function getDatabaseUrl(): string {
  const provider = process.env.DATABASE_PROVIDER || "sqlite";

  if (provider === "mysql") {
    const {
      DB_HOST,
      DB_PORT = "3306",
      DB_USERNAME,
      DB_PASSWORD,
      DB_DATABASE,
    } = process.env;

    if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_DATABASE) {
      throw new Error("MySQL configuration is incomplete");
    }

    return `mysql://${DB_USERNAME}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
  } else {
    return process.env.DATABASE_URL || "file:./dev.db";
  }
}
