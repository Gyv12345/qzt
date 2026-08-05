package app

// StorageResourceDomain 返回当前存储配置的资源访问域名(从数据库缓存读取)。
func StorageResourceDomain() string {
	if storageCfgCache != nil {
		return storageCfgCache.ResourceDomain
	}
	return ""
}

// StorageMaxUploadMB 返回单文件上传大小上限(MB,从数据库缓存读取)。
func StorageMaxUploadMB() int {
	if storageCfgCache != nil && storageCfgCache.MaxUploadMB > 0 {
		return storageCfgCache.MaxUploadMB
	}
	return 20
}
