export interface IUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  isActive: boolean;
  emailVerified: boolean;
  centerId: number;
  createdAt: Date;
  updatedAt: Date;
  center?: ICenter;
  userRoles?: IUserRole[];
}

export interface ICenter {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  centerId: number;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions?: IRolePermission[];
}

export interface IPermission {
  id: string;
  name: string;
  slug: string;
  description?: string;
  module: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRole {
  id: string;
  userId: string;
  roleId: string;
  createdAt: Date;
  role?: IRole;
}

export interface IRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
  permission?: IPermission;
}

export interface IJwtPayload {
  sub: string;
  phoneNumber: string;
  centerId: number;
  iat?: number;
  exp?: number;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}
