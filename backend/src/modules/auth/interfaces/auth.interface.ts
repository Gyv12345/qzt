export interface JwtPayload {
  sub: string;
  username: string;
}

export interface UserInfo {
  userId: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: string;
  isAdmin: boolean;
  departmentId?: string;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    dataScope: string;
    dataScopeDeptIds?: string | null;
  }>;
}

export interface SafeUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: string;
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
