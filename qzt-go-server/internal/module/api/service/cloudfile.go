package service

import (
	"context"

	cloudservice "qzt-go-server/internal/module/cloud/service"
	"qzt-go-server/internal/pkg/storage"
)

// cloudfile.go 上传统一记录:所有经后端 Uploader 落盘的文件补插一条 cloud_file,
// 修复「后端上传的文件在网盘/系统管理-文件存储不可见」(全量可见性的根因)。
// 网盘自带的上传通道(CreateFile)本来就写记录,不受影响;STS 直传通道本期不动。
//
// URL/ObjectKey 字段口径与网盘既有约定严格一致(cloud share.go 按 file.URL 是否
// http 开头区分公共/私有形态):公共文件 URL=明文直链、私有文件 URL 留空且仅存
// ObjectKey(私有签名 URL 查询侧现签)。

// RecordCloudFile 把一次成功上传登记为网盘文件记录(creator=上传人, 个人空间,
// parent=0 根目录, status=1 正常, is_dir=0)。失败只记日志语义由调用方决定
// (上传已成功,登记失败不应回滚已落盘文件,调用方按需记日志跳过)。
func RecordCloudFile(ctx context.Context, f *storage.UploadedFile, userID uint) error {
	if f == nil {
		return nil
	}
	// 公共文件:URL=明文直链(可分享/直链访问);私有文件:URL 留空仅存 ObjectKey
	// (UploadedFile.URL 在私有形态时是 objectKey,不能写入 URL 字段,否则破坏
	// 「URL 非空=公开直链」的网盘解析约定)。
	var url string
	if f.Visibility == storage.VisibilityPublic {
		url = f.URL
	}
	svc := cloudservice.NewCloudService()
	_, err := svc.CreateFile(ctx, &cloudservice.CreateFileRequest{
		Name:        f.OriginalName,
		ObjectKey:   f.RelativePath,
		URL:         url,
		Size:        f.Size,
		ContentType: f.ContentType,
		Scope:       "personal",
	}, userID, 0)
	return err
}
