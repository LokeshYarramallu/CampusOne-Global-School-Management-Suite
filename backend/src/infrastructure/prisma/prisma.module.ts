import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantScopedPrisma } from './tenant-scoped.client';

@Global()
@Module({
  providers: [PrismaService, TenantScopedPrisma],
  exports: [PrismaService, TenantScopedPrisma],
})
export class PrismaModule {}
