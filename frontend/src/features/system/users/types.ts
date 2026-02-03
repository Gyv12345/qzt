export interface User {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  avatar?: string
  departmentId?: string
  status: number
  createdAt: string
  updatedAt: string
  department?: {
    id: string
    name: string
  }
  roles?: Array<{
    role: {
      id: string
      name: string
      code: string
    }
  }>
}

export interface CreateUserInput {
  username: string
  password: string
  name: string
  email?: string
  phone?: string
  departmentId?: string
  roleIds?: string[]
  status?: number
}

export interface UpdateUserInput {
  username?: string
  password?: string
  name?: string
  email?: string
  phone?: string
  departmentId?: string
  roleIds?: string[]
  status?: number
}

export interface UserQuery {
  page?: number
  pageSize?: number
  search?: string
  departmentId?: string
  status?: number
  roleId?: string
}
