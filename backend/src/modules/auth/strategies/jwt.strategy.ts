import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/common/prisma/prisma.service";
import { JwtPayload, UserInfo } from "../interfaces/auth.interface";
import { isAdminRole } from "@/common/constants";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<UserInfo> {
    console.log("[JwtStrategy] Validating token:", {
      sub: payload.sub,
      username: payload.username,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log("[JwtStrategy] User found:", {
      found: !!user,
      status: user?.status,
    });

    if (!user || user.status !== "ACTIVE") {
      console.log("[JwtStrategy] User validation failed");
      throw new UnauthorizedException("账号无效或已被禁用");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;

    return {
      userId: result.id,
      username: result.username,
      name: result.name,
      email: result.email,
      phone: result.phone,
      avatar: result.avatar,
      status: result.status,
      isAdmin: result.roles.some((ur) => isAdminRole(ur.role.code)),
      departmentId: result.departmentId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      roles: result.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        type: ur.role.type,
        dataScope: ur.role.dataScope,
        dataScopeDeptIds: ur.role.dataScopeDeptIds,
      })),
    };
  }
}
