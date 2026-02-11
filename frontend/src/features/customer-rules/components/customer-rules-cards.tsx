import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import {
  useCustomerRules,
  useUpdateCustomerRule,
  type CustomerRule,
} from "../hooks/use-customer-rules";
import { Loader2, Edit2, Check, X, Clock } from "lucide-react";

type CustomerRulesCardsProps = Record<string, never>;

// 规则代码对应的显示配置
const RULE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; description: string }
> = {
  FOLLOW_DAYS: {
    icon: Clock,
    label: "跟进天数规则",
    description: "设置客户跟进提醒的天数阈值",
  },
  NO_CONTACT_DAYS: {
    icon: Clock,
    label: "未联系天数规则",
    description: "超过设置天数未联系的客户将被标记",
  },
  CONTRACT_EXPIRY_DAYS: {
    icon: Clock,
    label: "合同到期提醒",
    description: "合同到期前多少天开始提醒",
  },
  PAYMENT_OVERDUE_DAYS: {
    icon: Clock,
    label: "付款逾期规则",
    description: "付款逾期多少天触发预警",
  },
};

export function CustomerRulesCards(_props: CustomerRulesCardsProps) {
  const { data, isLoading, error } = useCustomerRules();
  const updateMutation = useUpdateCustomerRule();

  const [editingRule, setEditingRule] = useState<CustomerRule | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // 内联编辑状态
  const [inlineEditRuleId, setInlineEditRuleId] = useState<number | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<number>(0);

  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const rules = data || [];

  // 处理启用/禁用切换
  const handleEnabledChange = useCallback(
    async (rule: CustomerRule, enabled: boolean) => {
      await updateMutation.mutateAsync({
        id: rule.id,
        data: { enabled },
      });
    },
    [updateMutation],
  );

  // 处理编辑（打开抽屉）
  const handleEdit = useCallback((rule: CustomerRule) => {
    setEditingRule(rule);
    setIsEditSheetOpen(true);
  }, []);

  // 开始内联编辑天数
  const handleStartInlineEdit = useCallback((rule: CustomerRule) => {
    setInlineEditRuleId(rule.id);
    setInlineEditValue(rule.daysValue);
  }, []);

  // 取消内联编辑
  const handleCancelInlineEdit = useCallback(() => {
    setInlineEditRuleId(null);
    setInlineEditValue(0);
  }, []);

  // 保存内联编辑
  const handleSaveInlineEdit = useCallback(
    async (rule: CustomerRule) => {
      await updateMutation.mutateAsync({
        id: rule.id,
        data: { daysValue: inlineEditValue },
      });
      setInlineEditRuleId(null);
    },
    [updateMutation, inlineEditValue],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-muted-foreground">加载客户规则数据失败</p>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-muted-foreground">暂无规则数据</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {rules.map((rule) => {
          const config = RULE_CONFIG[rule.code] || {
            icon: Clock,
            label: rule.title,
            description: rule.description || "",
          };
          const Icon = config.icon;
          const isInlineEditing = inlineEditRuleId === rule.id;

          return (
            <div
              key={rule.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200",
                "hover:shadow-md hover:border-primary/20",
                rule.enabled && "border-l-4 border-l-primary",
              )}
            >
              {/* 激活状态指示条 */}
              {rule.enabled && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* 左侧：规则信息 */}
                <div className="flex flex-1 items-start gap-4">
                  {/* 图标 */}
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
                      rule.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* 规则详情 */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {rule.title}
                      </h3>
                      {rule.enabled ? (
                        <span className="flex h-5 items-center rounded-full bg-primary/10 px-2 text-xs font-medium text-primary">
                          <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          已启用
                        </span>
                      ) : (
                        <span className="flex h-5 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                          已禁用
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rule.description || config.description}
                    </p>

                    {/* 天数设置 - 支持内联编辑 */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm text-muted-foreground">
                        阈值：
                      </span>
                      {isInlineEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={inlineEditValue}
                            onChange={(e) =>
                              setInlineEditValue(
                                Math.max(0, parseInt(e.target.value) || 0),
                              )
                            }
                            className="h-8 w-20 text-center"
                            min={0}
                            autoFocus
                          />
                          <span className="text-sm text-muted-foreground">
                            天
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleSaveInlineEdit(rule)}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={handleCancelInlineEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-base font-medium text-foreground">
                            {rule.daysValue}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            天
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleStartInlineEdit(rule)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧：操作按钮 */}
                <div className="flex items-center gap-3 sm:border-l sm:pl-4">
                  {/* 启用/禁用开关 */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {rule.enabled ? "启用中" : "已禁用"}
                    </span>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) =>
                        handleEnabledChange(rule, enabled)
                      }
                      disabled={updateMutation.isPending}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* 编辑按钮 */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                    className="cursor-pointer gap-1.5"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">编辑</span>
                  </Button>
                </div>
              </div>

              {/* 禁用状态的覆盖层效果 */}
              {!rule.enabled && (
                <div className="pointer-events-none absolute inset-0 bg-muted/5" />
              )}
            </div>
          );
        })}
      </div>

      {/* 编辑抽屉 */}
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => !open && setIsEditSheetOpen(false)}
      >
        <SheetContent
          side={drawerSide}
          className={isMobile ? "h-[85vh]" : "w-[600px]"}
        >
          <SheetHeader className="pb-0 text-start">
            <SheetTitle>编辑规则</SheetTitle>
            <SheetDescription>修改规则配置和参数</SheetDescription>
          </SheetHeader>

          {editingRule && (
            <CustomerRuleEditForm
              rule={editingRule}
              onSuccess={() => {
                setIsEditSheetOpen(false);
              }}
              onCancel={() => setIsEditSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// 编辑表单组件（内联）
function CustomerRuleEditForm({
  rule,
  onSuccess,
  onCancel,
}: {
  rule: CustomerRule;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const updateMutation = useUpdateCustomerRule();
  const [title, setTitle] = useState(rule.title);
  const [description, setDescription] = useState(rule.description || "");
  const [daysValue, setDaysValue] = useState(rule.daysValue);
  const [enabled, setEnabled] = useState(rule.enabled);

  const handleSubmit = async () => {
    try {
      await updateMutation.mutateAsync({
        id: rule.id,
        data: { title, description, daysValue, enabled },
      });
      onSuccess();
    } catch (error) {
      console.error("更新规则失败:", error);
    }
  };

  return (
    <div className="space-y-4 px-4 py-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">规则名称</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">描述</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="规则描述"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">天数阈值</label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDaysValue(Math.max(0, daysValue - 1))}
            disabled={daysValue <= 0}
          >
            -
          </Button>
          <Input
            type="number"
            value={daysValue}
            onChange={(e) =>
              setDaysValue(Math.max(0, parseInt(e.target.value) || 0))
            }
            className="w-20 text-center"
            min={0}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDaysValue(daysValue + 1)}
          >
            +
          </Button>
          <span className="text-sm text-muted-foreground">天</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">启用此规则</p>
          <p className="text-xs text-muted-foreground">
            启用后系统将按照此规则执行
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          className="cursor-pointer"
        />
      </div>

      <SheetFooter className="px-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={updateMutation.isPending}
        >
          取消
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="cursor-pointer"
        >
          {updateMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          保存
        </Button>
      </SheetFooter>
    </div>
  );
}
