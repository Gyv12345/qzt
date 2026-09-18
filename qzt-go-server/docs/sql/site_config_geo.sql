-- site_config_geo.sql 站点配置 SEO 地理信息字段(sys_site_config)。
-- 用途: 官网输出 geo.region / geo.placename / geo.position / ICBM meta 标签 + JSON-LD 地理信息,
--       提升搜索引擎(尤其百度)对本地区域搜索的识别。私有化客户按自己所在地填写。
-- 字段与 ID 分配: 无新表,仅扩列;sys_site_config 全局单条(id=1)。
-- 执行方式: DBX MCP 或手动 mysql,单语句逐条执行(ALTER 幂等性依赖列不存在;重复执行会报 Duplicate column,可忽略)。

ALTER TABLE `sys_site_config`
  ADD COLUMN `geo_region` varchar(100) DEFAULT '' COMMENT 'SEO地域码(如 CN-henan-luoyang,百度 geo.region)',
  ADD COLUMN `geo_placename` varchar(100) DEFAULT '' COMMENT 'SEO地名(如 河南省洛阳市,geo.placename)',
  ADD COLUMN `geo_position` varchar(50) DEFAULT '' COMMENT 'SEO坐标(纬度;经度,如 34.6197;112.4540,geo.position/ICBM)';

-- 行简官方站(devlovecode.com)所在地: 河南省洛阳市
UPDATE `sys_site_config`
SET `geo_region` = 'CN-henan-luoyang',
    `geo_placename` = '河南省洛阳市',
    `geo_position` = '34.6197;112.4540'
WHERE `id` = 1 AND (`geo_region` = '' OR `geo_region` IS NULL);
