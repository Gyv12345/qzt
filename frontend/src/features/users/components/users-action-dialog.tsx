"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { roles } from "../data/data";
import type { UserEntity } from "@/models";
import { useCreateUser, useUpdateUser } from "../hooks/use-users";

type UserActionDialogProps = {
  currentRow?: UserEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!currentRow;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

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
          isEdit,
        },
  });

  const onSubmit = async (values: UserForm) => {
    try {
      // 提取需要提交的数据
      const { isEdit: _, confirmPassword, role, phoneNumber, ...rest } = values;

      // 映射字段名到 DTO 格式
      const submitData: any = {
        ...rest,
        phone: phoneNumber || undefined,
        roleIds: role ? [role] : undefined,
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

  // 监听对话框关闭，重置表单
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const isPasswordTouched = !!form.formState.dirtyFields.password;

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset();
        onOpenChange(state);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>
            {isEdit ? t("user.edit") : t("user.addNew")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("user.editDescription") : t("user.addDescription")}{" "}
            {t("user.clickSave")}
          </DialogDescription>
        </DialogHeader>
        <div className="h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3">
          <Form {...form}>
            <form
              id="user-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 px-0.5"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                    <FormLabel className="col-span-2 text-end">
                      {t("user.name")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.placeholder.name")}
                        className="col-span-4"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 col-start-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                    <FormLabel className="col-span-2 text-end">
                      {t("user.username")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.placeholder.username")}
                        className="col-span-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 col-start-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                    <FormLabel className="col-span-2 text-end">
                      {t("user.email")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.placeholder.email")}
                        className="col-span-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 col-start-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                    <FormLabel className="col-span-2 text-end">
                      {t("user.phoneNumber")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.placeholder.phoneNumber")}
                        className="col-span-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 col-start-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                    <FormLabel className="col-span-2 text-end">
                      {t("user.role")}
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("user.selectRole")}
                      className="col-span-4"
                      disabled={isEdit && currentRow?.isSystem}
                      items={roles.map(({ label, value }) => ({
                        label,
                        value,
                      }))}
                    />
                    <FormMessage className="col-span-4 col-start-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                    <FormLabel className="col-span-2 text-end">
                      {t("user.password")}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("user.placeholder.password")}
                        className="col-span-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 col-start-3" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                    <FormLabel className="col-span-2 text-end">
                      {t("user.confirmPassword")}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        disabled={!isPasswordTouched}
                        placeholder={t("user.placeholder.password")}
                        className="col-span-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 col-start-3" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type="submit" form="user-form">
            {t("user.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
