"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { SelectDropdown } from "@/components/select-dropdown";
import { DepartmentTreeSelect } from "@/components/ui/department-tree-select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import type { UserEntity } from "@/models";
import { useCreateUser, useUpdateUser } from "../hooks/use-users";
import { useDepartments } from "@/features/departments/hooks/use-departments";
import { useRolesList } from "@/features/roles/hooks/use-roles";

type UserFormDrawerProps = {
  currentRow?: UserEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UsersFormDrawer({
  currentRow,
  open,
  onOpenChange,
}: UserFormDrawerProps) {
  const { t } = useTranslation();
  const isEdit = !!currentRow;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: departmentsData } = useDepartments();
  const { data: rolesData, isLoading: rolesLoading } = useRolesList();

  // 部门数据处理
  const departments = departmentsData || [];
  // 角色数据处理
  const roles = rolesData || [];

  // 动态生成验证 schema 以使用 i18n
  const formSchema = z
    .object({
      name: z.string().min(1, t("user.validation.nameRequired")),
      username: z.string().min(1, t("user.validation.usernameRequired")),
      phoneNumber: z.string().min(1, t("user.validation.phoneNumberRequired")),
      email: z.email({
        error: (iss) =>
          iss.input === "" ? t("user.validation.emailRequired") : undefined,
      }),
      password: z.string().transform((pwd) => pwd.trim()),
      role: z.string().min(1, t("user.validation.roleRequired")),
      confirmPassword: z.string().transform((pwd) => pwd.trim()),
      departmentId: z.string().optional(),
      isEdit: z.boolean(),
    })
    .refine(
      (data) => {
        if (data.isEdit && !data.password) return true;
        return data.password.length > 0;
      },
      {
        message: t("user.validation.passwordRequired"),
        path: ["password"],
      },
    )
    .refine(
      ({ isEdit, password }) => {
        if (isEdit && !password) return true;
        return password.length >= 8;
      },
      {
        message: t("user.validation.passwordMinLength"),
        path: ["password"],
      },
    )
    .refine(
      ({ isEdit, password }) => {
        if (isEdit && !password) return true;
        return /[a-z]/.test(password);
      },
      {
        message: t("user.validation.passwordLowercase"),
        path: ["password"],
      },
    )
    .refine(
      ({ isEdit, password }) => {
        if (isEdit && !password) return true;
        return /\d/.test(password);
      },
      {
        message: t("user.validation.passwordNumber"),
        path: ["password"],
      },
    )
    .refine(
      ({ isEdit, password, confirmPassword }) => {
        if (isEdit && !password) return true;
        return password === confirmPassword;
      },
      {
        message: t("user.validation.passwordMismatch"),
        path: ["confirmPassword"],
      },
    );

  type UserForm = z.infer<typeof formSchema>;

  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          password: "",
          confirmPassword: "",
          departmentId: currentRow.departmentId || "",
          isEdit,
        }
      : {
          name: "",
          username: "",
          email: "",
          role: "",
          phoneNumber: "",
          password: "",
          confirmPassword: "",
          departmentId: "",
          isEdit,
        },
  });

  const onSubmit = async (values: UserForm) => {
    try {
      // 提取需要提交的数据
      const {
        isEdit: _,
        confirmPassword,
        role,
        phoneNumber,
        departmentId,
        ...rest
      } = values;

      // 映射字段名到 DTO 格式
      const submitData: any = {
        ...rest,
        phone: phoneNumber || undefined,
        roleIds: role ? [role] : undefined,
        departmentId: departmentId || undefined,
      };

      if (isEdit && currentRow) {
        // 编辑模式：只提交有值的密码
        if (!submitData.password) {
          delete submitData.password;
        }
        await updateUser.mutateAsync({
          id: currentRow.id,
          data: submitData,
        });
      } else {
        // 新建模式：密码是必需的
        if (!submitData.password) {
          toast.error("请输入密码");
          return;
        }
        await createUser.mutateAsync(submitData);
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  // 监听抽屉关闭，重置表单
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const isPasswordTouched = !!form.formState.dirtyFields.password;

  return (
    <Sheet
      open={open}
      onOpenChange={(state) => {
        form.reset();
        onOpenChange(state);
      }}
    >
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[500px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? t("user.edit") : t("user.addNew")}</SheetTitle>
          <SheetDescription>
            {isEdit ? t("user.editDescription") : t("user.addDescription")}{" "}
            {t("user.clickSave")}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="user-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6 overflow-y-auto max-h-[calc(100vh-180px)]"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("user.placeholder.name")}
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.username")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("user.placeholder.username")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.email")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("user.placeholder.email")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.phoneNumber")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("user.placeholder.phoneNumber")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.department") || "部门"}</FormLabel>
                  <FormControl>
                    <DepartmentTreeSelect
                      value={field.value}
                      onChange={field.onChange}
                      departments={departments}
                      placeholder="请选择部门"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.role")}</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder={t("user.selectRole")}
                    disabled={(isEdit && currentRow?.isSystem) || rolesLoading}
                    items={roles.map(({ label, value }) => ({
                      label,
                      value,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.password")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={t("user.placeholder.password")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.confirmPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      disabled={!isPasswordTouched}
                      placeholder={t("user.placeholder.password")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <SheetFooter className="px-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel") || "取消"}
          </Button>
          <Button
            type="submit"
            form="user-form"
            disabled={createUser.isPending || updateUser.isPending}
          >
            {createUser.isPending || updateUser.isPending
              ? t("common.submitting") || "提交中..."
              : t("user.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
