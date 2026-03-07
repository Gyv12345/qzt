/**
 * 页面预览对话框
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface PagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: {
    id: string;
    title: string;
    slug: string;
    elements: Array<{
      id: string;
      sectionType: string;
      elementType: string;
      content: string;
      sortOrder: number;
      visible: boolean;
    }>;
  } | null;
}

export function PagePreviewDialog({
  open,
  onOpenChange,
  page,
}: PagePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState("preview");

  if (!page) return null;

  // 按区域分组元素
  const elementsBySection = page.elements.reduce(
    (acc: Record<string, typeof page.elements>, el) => {
      if (!acc[el.sectionType]) {
        acc[el.sectionType] = [];
      }
      acc[el.sectionType].push(el);
      return acc;
    },
    {} as Record<string, typeof page.elements>,
  );

  const sectionLabels: Record<string, string> = {
    HERO: "首屏区域",
    STATS: "数据统计",
    FEATURES: "功能特点",
    CTA: "行动号召",
    TESTIMONIALS: "用户评价",
    PARTNERS: "合作伙伴",
    CONTACT: "联系方式",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {page.title}
            <Badge variant="outline">{page.slug}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="preview">预览</TabsTrigger>
            <TabsTrigger value="json">JSON 数据</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <div className="space-y-6">
              {Object.entries(elementsBySection).map(
                ([sectionType, elements]) => (
                  <div key={sectionType} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Badge>{sectionType}</Badge>
                      {sectionLabels[sectionType] || sectionType}
                      <span className="text-muted-foreground text-sm">
                        ({elements.length} 个元素)
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {elements
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((el) => (
                          <div
                            key={el.id}
                            className="flex items-start gap-3 p-2 bg-muted/50 rounded text-sm"
                          >
                            <Badge variant="outline" className="text-xs">
                              {el.elementType}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs text-muted-foreground mb-1">
                                排序: {el.sortOrder}
                              </div>
                              {el.content && (
                                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                  {JSON.stringify(
                                    JSON.parse(el.content),
                                    null,
                                    2,
                                  )}
                                </pre>
                              )}
                              {!el.visible && (
                                <span className="text-destructive text-xs">
                                  (隐藏)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </TabsContent>

          <TabsContent value="json" className="flex-1 overflow-auto mt-4">
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(page, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
