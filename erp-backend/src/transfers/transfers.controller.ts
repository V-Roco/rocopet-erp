import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { getActiveWorkGroupId } from '../common/utils/work-group.util';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Controller('transfers')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
@RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(@Body() dto: CreateTransferDto, @Req() req: Request) {
    const user = req.user as { workGroupIds: string[] };
    return this.transfersService.create(dto, user.workGroupIds);
  }

  // Lista los traspasos donde el lugar de trabajo activo participa, ya sea
  // como origen o como destino.
  @Get()
  findAll(@Req() req: Request) {
    return this.transfersService.findAll(getActiveWorkGroupId(req));
  }
}
