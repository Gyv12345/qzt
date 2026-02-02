export interface JwtPayload {
  sub: string;
  username: string;
  tenantId: string;
}

export interface UserInfo {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  tenantId: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export interface SafeUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  tenantId: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    id: string;
    role: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}
