/**
 * CMS 页面编辑器主编辑区
 * 包含页面元素的可视化预览和编辑
 */

import { UseFormReturn } from "react-hook-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Layout } from "lucide-react";
import type { CmsPageEditorValues, PageElementData } from "./cms-page-editor";

interface CmsPageEditorMainProps {
  form: UseFormReturn<CmsPageEditorValues>;
  showPreview: boolean;
  onPreviewChange: (show: boolean) => void;
}

// 区域类型显示名称
const sectionLabels: Record<string, string> = {
  HERO: "首屏区域",
  STATS: "数据统计",
  FEATURES: "功能特点",
  CTA: "行动号召",
  TESTIMONIALS: "用户评价",
  PARTNERS: "合作伙伴",
  CONTACT: "联系方式",
};

// 元素类型显示名称
const elementLabels: Record<string, string> = {
  heading: "标题",
  text: "文本",
  button: "按钮",
  image: "图片",
  card: "卡片",
  list: "列表",
  statistic: "统计数字",
  testimonial: "评价",
};

// 单个元素预览组件
function ElementPreview({ element }: { element: PageElementData }) {
  // 尝试解析内容
  let contentData: Record<string, any> = {};
  try {
    contentData = element.content ? JSON.parse(element.content) : {};
  } catch {
    contentData = {};
  }

  // 根据元素类型渲染预览
  const renderElementPreview = () => {
    switch (element.elementType) {
      case "heading":
        return (
          <div className="space-y-2">
            {contentData.text && (
              <h3 className="text-xl font-semibold">{contentData.text}</h3>
            )}
            {contentData.subtitle && (
              <p className="text-sm text-muted-foreground">
                {contentData.subtitle}
              </p>
            )}
          </div>
        );

      case "text":
        return (
          <p className="text-sm whitespace-pre-wrap">
            {contentData.text || "空文本"}
          </p>
        );

      case "button":
        return (
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-2 rounded ${
                contentData.isPrimary
                  ? "bg-primary text-primary-foreground"
                  : "border"
              }`}
            >
              {contentData.text || "按钮"}
            </button>
            {contentData.url && (
              <span className="text-xs text-muted-foreground">
                {contentData.url}
              </span>
            )}
          </div>
        );

      case "image":
        return (
          <div className="space-y-2">
            {contentData.url ? (
              <img
                src={contentData.url}
                alt={contentData.alt || ""}
                className="max-w-xs rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                }}
              />
            ) : (
              <div className="w-48 h-32 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                无图片
              </div>
            )}
            {contentData.alt && (
              <p className="text-xs text-muted-foreground">{contentData.alt}</p>
            )}
          </div>
        );

      case "card":
        return (
          <div className="border rounded-lg p-4 max-w-xs bg-card">
            {contentData.title && (
              <h4 className="font-medium mb-2">{contentData.title}</h4>
            )}
            {contentData.description && (
              <p className="text-sm text-muted-foreground">
                {contentData.description}
              </p>
            )}
          </div>
        );

      case "statistic":
        return (
          <div className="text-center p-4 rounded-lg bg-muted/50 max-w-xs">
            {contentData.label && (
              <p className="text-sm text-muted-foreground mb-1">
                {contentData.label}
              </p>
            )}
            {contentData.value !== undefined && (
              <p className="text-2xl font-bold">
                {contentData.value}
                {contentData.suffix || ""}
              </p>
            )}
          </div>
        );

      case "testimonial":
        return (
          <div className="border rounded-lg p-4 max-w-sm bg-card">
            {contentData.content && (
              <p className="text-sm italic mb-3">
                &quot;{contentData.content}&quot;
              </p>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {contentData.name?.[0] || "?"}
              </div>
              <div>
                {contentData.name && (
                  <p className="text-sm font-medium">{contentData.name}</p>
                )}
                {contentData.role && (
                  <p className="text-xs text-muted-foreground">
                    {contentData.role}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case "list":
        return (
          <ul className="list-disc list-inside space-y-1">
            {contentData.items?.length ? (
              contentData.items.map((item: string, i: number) => (
                <li key={i} className="text-sm">
                  {item}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">空列表</li>
            )}
          </ul>
        );

      default:
        return (
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-w-md">
            {JSON.stringify(contentData, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline">{element.sectionType}</Badge>
        <span className="text-sm font-medium">
          {elementLabels[element.elementType]}
        </span>
        {!element.visible && (
          <Badge variant="secondary" className="text-xs">
            隐藏
          </Badge>
        )}
      </div>
      {renderElementPreview()}
    </div>
  );
}

// 按区域分组的元素预览
function SectionPreview({
  sectionType,
  elements,
}: {
  sectionType: string;
  elements: PageElementData[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge>{sectionType}</Badge>
        <h4 className="font-medium">{sectionLabels[sectionType]}</h4>
        <span className="text-xs text-muted-foreground">
          ({elements.length} 个元素)
        </span>
      </div>
      <div className="space-y-3 pl-4 border-l-2 border-muted">
        {elements
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .filter((el) => el.visible)
          .map((element, index) => (
            <ElementPreview
              key={`${element.sectionType}-${element.elementType}-${index}`}
              element={element}
            />
          ))}
      </div>
    </div>
  );
}

export function CmsPageEditorMain({
  form,
  showPreview,
}: Omit<CmsPageEditorMainProps, "onPreviewChange">) {
  const elements = form.watch("elements") || [];
  const pageTitle = form.watch("title") || "未命名页面";
  const pageDescription = form.watch("description") || "";

  // 按区域分组元素
  const elementsBySection = elements.reduce(
    (acc, el) => {
      if (!acc[el.sectionType]) {
        acc[el.sectionType] = [];
      }
      acc[el.sectionType].push(el);
      return acc;
    },
    {} as Record<string, PageElementData[]>,
  );

  // 可见元素数量
  const visibleElementCount = elements.filter((el) => el.visible).length;

  return (
    <div className="flex h-full flex-col">
      {showPreview ? (
        // 预览模式
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-5xl px-8 py-8">
            {/* 页面头部 */}
            <div className="mb-8 pb-6 border-b">
              <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
              {pageDescription && (
                <p className="text-muted-foreground">{pageDescription}</p>
              )}
            </div>

            {/* 元素预览 */}
            {visibleElementCount === 0 ? (
              <div className="text-center py-12">
                <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无元素</h3>
                <p className="text-sm text-muted-foreground">
                  在左侧边栏添加页面元素后，预览将在此显示
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(elementsBySection)
                  .sort(([, a], [, b]) => {
                    // 按第一个元素的排序顺序排列区域
                    const aMin = Math.min(...a.map((el) => el.sortOrder));
                    const bMin = Math.min(...b.map((el) => el.sortOrder));
                    return aMin - bMin;
                  })
                  .map(([sectionType, sectionElements]) => (
                    <SectionPreview
                      key={sectionType}
                      sectionType={sectionType}
                      elements={sectionElements}
                    />
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        // 编辑模式 - JSON 视图
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl px-8 py-8">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">页面元素数据</h3>
              <p className="text-sm text-muted-foreground">
                当前共有 {visibleElementCount} 个可见元素
              </p>
            </div>

            {elements.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无元素</h3>
                <p className="text-sm text-muted-foreground">
                  在左侧边栏添加页面元素
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {elements.map((element, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      !element.visible ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{element.sectionType}</Badge>
                        <span className="text-sm font-medium">
                          {elementLabels[element.elementType]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          排序: {element.sortOrder}
                        </span>
                      </div>
                      {!element.visible && (
                        <Badge variant="secondary">隐藏</Badge>
                      )}
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {element.content || "空内容"}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
