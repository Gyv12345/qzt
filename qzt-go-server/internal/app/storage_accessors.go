package app

import "qzt-go-server/config"

// StorageResourceDomain 返回配置中的资源访问域名。
func StorageResourceDomain() string {
	return config.Get().Storage.ResourceDomain
}

// StorageMaxUploadMB 返回单文件上传大小上限（MB）。
func StorageMaxUploadMB() int {
	return config.Get().Storage.MaxUploadMB
}
