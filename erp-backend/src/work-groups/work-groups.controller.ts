import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { WorkGroupsService } from './work-groups.service';
import { CreateWorkGroupDto } from './dto/create-work-group.dto';
import { UpdateWorkGroupDto } from './dto/update-work-group.dto';

@Controller('work-groups')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
@RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
export class WorkGroupsController {
  constructor(private readonly workGroupsService: WorkGroupsService) {}

  @Post()
  create(@Body() dto: CreateWorkGroupDto) {
    return this.workGroupsService.create(dto);
  }

  @Get()
  findAll() {
    return this.workGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workGroupsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkGroupDto) {
    return this.workGroupsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workGroupsService.remove(id);
  }
}
