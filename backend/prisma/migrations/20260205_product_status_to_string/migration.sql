-- Product 模块状态字段迁移：从 Int (0/1) 迁移到 String (ACTIVE/INACTIVE)

-- Step 1: 添加临时列
ALTER TABLE "products" ADD COLUMN "status_temp" TEXT;

-- Step 2: 迁移数据：1 -> ACTIVE, 0 -> INACTIVE
UPDATE "products" SET "status_temp" = CASE
  WHEN "status" = 1 THEN 'ACTIVE'
  WHEN "status" = 0 THEN 'INACTIVE'
  ELSE 'ACTIVE'  -- 默认值
END;

-- Step 3: 删除旧列
ALTER TABLE "products" DROP COLUMN "status";

-- Step 4: 重命名新列
ALTER TABLE "products" RENAME COLUMN "status_temp" TO "status";

-- Step 5: 设置默认值
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
