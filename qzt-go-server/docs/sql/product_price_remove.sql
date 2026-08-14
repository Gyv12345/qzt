-- product_price_remove.sql 商品多价格(价格方案)功能下线清理脚本。
-- 背景:CRM 商品仅保留标准价/成本价,多价格方案(价格类型分档)整体移除;
--       后端 /crm/products/:id/prices、/crm/product-prices CRUD 与 admin/CMS 侧代码均已删。
-- 经 DBX MCP「我的阿里云数据库」(database=qztgo)执行。执行前已确认:
--   crm_product_price 仅 2 条测试记录;admin 无任何页面使用价格方案。
-- 对应 qztgo.sql 中的 crm_product_price 建表段、sys_dict id=11、sys_dict_item 已同步移除。

-- 1) 商品价格表
DROP TABLE IF EXISTS `crm_product_price`;

-- 2) 字典:商品价格类型(sys_dict id=11)+ 子项
DELETE FROM `sys_dict` WHERE `code` = 'PRODUCT_PRICE_TYPE';
DELETE FROM `sys_dict_item` WHERE `dict_id` = 11;
