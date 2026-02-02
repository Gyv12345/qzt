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
  status: number;
  isAdmin: boolean;
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
