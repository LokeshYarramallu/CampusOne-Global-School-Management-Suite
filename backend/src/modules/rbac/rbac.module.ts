import { Module } from '@nestjs/common';

/** RBAC composition root; request-time authorization is added behind this boundary. */
@Module({})
export class RbacModule {}
