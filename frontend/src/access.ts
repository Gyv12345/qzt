export default (initialState: { userInfo?: any }) => {
  const { userInfo } = initialState || {};

  const getPermissions = () => {
    if (!userInfo?.roles) return [];

    const permissions = new Set<string>();
    userInfo.roles.forEach((role: any) => {
      role.role.permissions.forEach((rp: any) => {
        permissions.add(rp.permission.code);
      });
    });

    return Array.from(permissions);
  };

  return {
    canViewCustomer: getPermissions().includes('customer:view'),
    canCreateCustomer: getPermissions().includes('customer:create'),
    canEditCustomer: getPermissions().includes('customer:edit'),
    canDeleteCustomer: getPermissions().includes('customer:delete'),
    isAdmin: userInfo?.roles?.some((r: any) => r.role.code === 'ADMIN'),
  };
};
