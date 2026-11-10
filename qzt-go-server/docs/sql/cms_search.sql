-- ============================================================
-- cms_search.sql — P21 CMS 站内搜索（开源 CMS 对标 C3）
-- 用途：文章全文检索（标题/摘要/正文,ngram 中文分词）+ 公开搜索端点。
--       仅搜「已发布+定时到点+未过期」文章(复用 P19 守卫口径);
--       边界:不接 kb_chunk 公开语义搜索(kb 内部知识库,防外泄)。
-- 幂等：information_schema 守卫判断索引是否存在,不存在才建。
-- 执行方式：DBX MCP（database=qztgo）或手动 mysql。
-- ============================================================

-- 1. ngram 全文索引(标题+摘要+正文一个复合索引,MATCH 列必须与索引列一致)
SET @has_ft = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cms_article' AND INDEX_NAME='ft_cms_article_search');
SET @ddl1 = IF(@has_ft=0,
  'ALTER TABLE `cms_article` ADD FULLTEXT INDEX `ft_cms_article_search` (`title`, `summary`, `content`) WITH PARSER ngram',
  'SELECT 1');
PREPARE s1 FROM @ddl1; EXECUTE s1; DEALLOCATE PREPARE s1;
