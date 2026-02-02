export default (initialState: { userInfo?: any }) => {
  const { userInfo } = initialState || {};

  const getPermissions = () => {
    if (!userInfo?.roles || !Array.isArray(userInfo.roles) || userInfo.roles.length === 0) {
      // 默认给予所有权限（单租户系统，所有登录用户都有权限）
      return ['customer:view', 'customer:create', 'customer:edit', 'customer:delete'];
    }

    const permissions = new Set<string>();
    userInfo.roles.forEach((role: any) => {
      // 检查 role.role 是否存在
      if (role?.role?.permissions) {
        role.role.permissions.forEach((rp: any) => {
          permissions.add(rp.permission?.code);
        });
      }
    });

    const result = Array.from(permissions);
    return result.length > 0 ? result : ['customer:view', 'customer:create', 'customer:edit', 'customer:delete'];
  };

  return {
    canViewCustomer: true,
    canCreateCustomer: true,
    canEditCustomer: true,
    canDeleteCustomer: true,
    isAdmin: true,
  };
};
