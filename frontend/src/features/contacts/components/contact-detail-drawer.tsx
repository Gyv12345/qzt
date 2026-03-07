import { useEffect, useMemo, useState } from "react";
import { Check, Link2, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useUpdateContact } from "../hooks/use-contacts";
import type { Contact } from "../types/contact";

interface ContactDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onLinkCustomer: (contact: Contact) => void;
  onCreateCustomer: (contact: Contact) => void;
}

export function ContactDetailDrawer({
  open,
  onOpenChange,
  contact,
  onLinkCustomer,
  onCreateCustomer,
}: ContactDetailDrawerProps) {
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";
  const updateMutation = useUpdateContact();

  const fields = useMemo(() => {
    if (!contact) return [];
    return [
      { label: "手机号", key: "phone", value: contact.phone, editable: true },
      {
        label: "邮箱",
        key: "email",
        value: contact.email || "",
        editable: true,
      },
      {
        label: "职位",
        key: "position",
        value: contact.position || "",
        editable: true,
      },
      {
        label: "部门",
        key: "department",
        value: contact.department || "",
        editable: true,
      },
      {
        label: "微信号",
        key: "wechat",
        value: contact.wechat || "",
        editable: true,
      },
      {
        label: "所属企业",
        key: "customerName",
        value: contact.customerName || "",
        editable: false,
      },
    ];
  }, [contact]);

  const handleInlineSave = async (key: keyof Contact, value: string) => {
    if (!contact) return;
    await updateMutation.mutateAsync({
      id: contact.id,
      data: { [key]: value || undefined } as any,
    });
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[600px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{contact.name}</SheetTitle>
          <SheetDescription>联系人详情</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="detail" className="px-4 pb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detail">详情</TabsTrigger>
            <TabsTrigger value="edit">快速编辑</TabsTrigger>
            <TabsTrigger value="actions">关联操作</TabsTrigger>
          </TabsList>

          <TabsContent value="detail">
            <div className="space-y-2">
              {fields.map((field) =>
                field.editable ? (
                  <EditableField
                    key={field.key}
                    label={field.label}
                    value={field.value}
                    onSave={(nextValue) =>
                      handleInlineSave(field.key as keyof Contact, nextValue)
                    }
                  />
                ) : (
                  <ReadOnlyField
                    key={field.key}
                    label={field.label}
                    value={field.value}
                  />
                ),
              )}
            </div>
          </TabsContent>

          <TabsContent value="edit">
            <QuickEditForm contact={contact} />
          </TabsContent>

          <TabsContent value="actions">
            <div className="space-y-2">
              <Button
                onClick={() => onLinkCustomer(contact)}
                className="w-full"
              >
                <Link2 className="mr-2 h-4 w-4" />
                关联客户
              </Button>
              <Button
                onClick={() => onCreateCustomer(contact)}
                className="w-full"
              >
                <Building2 className="mr-2 h-4 w-4" />
                创建客户
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
    setDisplayValue(value);
  }, [value]);

  return (
    <div className="group flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              onSave(editValue);
              setDisplayValue(editValue);
              setIsEditing(false);
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="rounded px-2 py-1 text-sm hover:bg-muted/50"
          onClick={() => {
            setEditValue(value);
            setIsEditing(true);
          }}
        >
          {displayValue || "-"}
        </button>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value || "-"}</span>
    </div>
  );
}

function QuickEditForm({ contact }: { contact: Contact }) {
  const updateMutation = useUpdateContact();
  const [formState, setFormState] = useState({
    name: contact.name || "",
    phone: contact.phone || "",
    email: contact.email || "",
    position: contact.position || "",
  });

  useEffect(() => {
    setFormState({
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      position: contact.position || "",
    });
  }, [contact]);

  const handleChange = (key: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: contact.id,
      data: {
        name: formState.name,
        phone: formState.phone,
        email: formState.email || undefined,
        position: formState.position || undefined,
      } as any,
    });
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="姓名"
        value={formState.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />
      <Input
        placeholder="手机号"
        value={formState.phone}
        onChange={(e) => handleChange("phone", e.target.value)}
      />
      <Input
        placeholder="邮箱"
        value={formState.email}
        onChange={(e) => handleChange("email", e.target.value)}
      />
      <Input
        placeholder="职位"
        value={formState.position}
        onChange={(e) => handleChange("position", e.target.value)}
      />
      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full"
      >
        {updateMutation.isPending ? "保存中..." : "保存"}
      </Button>
    </div>
  );
}
