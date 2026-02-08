"use client";

import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

interface ImageUploadProps {
  value?: string | null; // imageId
  onChange: (imageId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

// 支持的图片类型
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // 验证文件类型
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("请上传 JPG、PNG、GIF 或 WebP 格式的图片");
        return;
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        toast.error("图片大小不能超过 5MB");
        return;
      }

      setUploading(true);

      try {
        // 转换为 base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const base64Data = base64.split(",")[1];

          try {
            const { ossControllerUploadFile } = getScrmApi();
            const result = await ossControllerUploadFile({
              fileName: file.name,
              fileContent: base64Data,
              fileType: "image" as any,
              mimeType: file.type,
            });

            // TODO(human): 根据实际 API 返回结构调整
            // result 应该包含 id 和 fileUrl 字段
            const ossFile = result as any;

            if (ossFile?.id) {
              onChange(ossFile.id);
              setPreviewUrl(ossFile.fileUrl || null);
              toast.success("图片上传成功");
            } else {
              throw new Error("上传返回数据格式错误");
            }
          } catch (error: any) {
            console.error("上传失败:", error);
            toast.error(error.message || "上传失败，请重试");
          } finally {
            setUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("文件读取失败:", error);
        toast.error("文件读取失败");
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || uploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect, disabled, uploading],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !uploading) {
        setIsDragging(true);
      }
    },
    [disabled, uploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // 重置 input 以允许重复选择同一文件
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setPreviewUrl(null);
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        type="file"
        id="image-upload"
        className="hidden"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />

      {value || previewUrl ? (
        <div className="relative group">
          <div className="relative w-full h-48 rounded-lg border border-border overflow-hidden bg-muted">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="预览"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-2" />
                <p className="text-sm">图片已上传</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {value?.slice(0, 8)}...
                </p>
              </div>
            )}
            {!disabled && (
              <div
                className={cn(
                  "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100",
                  "transition-opacity flex items-center justify-center gap-2",
                )}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    document.getElementById("image-upload")?.click()
                  }
                  disabled={uploading}
                >
                  更换图片
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-8",
            "flex flex-col items-center justify-center gap-2",
            "transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            (disabled || uploading) && "opacity-50 cursor-not-allowed",
            !disabled && !uploading && "cursor-pointer",
          )}
          onClick={() =>
            !disabled &&
            !uploading &&
            document.getElementById("image-upload")?.click()
          }
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">上传中...</p>
            </>
          ) : (
            <>
              <Upload
                className={cn(
                  "h-8 w-8 text-muted-foreground transition-colors",
                  isDragging && "text-primary",
                )}
              />
              <p className="text-sm text-muted-foreground">
                点击或拖拽图片到此处上传
              </p>
              <p className="text-xs text-muted-foreground">
                支持 JPG、PNG、GIF、WebP，最大 5MB
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
