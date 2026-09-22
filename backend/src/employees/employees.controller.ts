import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateSelfProfileDto } from './dto/update-self-profile.dto';
import { ImportEmployeesDto } from './dto/import-employees.dto';
import { EmploymentStatus, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Employees')
@ApiBearerAuth('JWT-auth')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get aggregated employee KPI statistics (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'Employee count metrics' })
  getStats() {
    return this.employeesService.getStats();
  }

  @Get('positions')
  @ApiOperation({ summary: 'Get list of active master positions' })
  @ApiResponse({ status: 200, description: 'List of positions' })
  getPositions() {
    return this.employeesService.getMasterPositions();
  }

  @Get('next-id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Generate next recommended unique Employee ID / NIP' })
  @ApiResponse({ status: 200, description: 'Generated next NIP' })
  async getNextId() {
    const nextId = await this.employeesService.generateNextEmployeeId();
    return { nextId };
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Get currently authenticated employee profile' })
  @ApiResponse({ status: 200, description: 'Authenticated employee personal profile' })
  getSelfProfile(@CurrentUser() user: any) {
    const employeeId = user?.employee?.id;
    return this.employeesService.getDetailedProfile(employeeId, user);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Update currently authenticated employee profile (Phone, Photo, Address only)' })
  @ApiResponse({ status: 200, description: 'Updated employee profile' })
  updateSelfProfile(@CurrentUser() user: any, @Body() dto: UpdateSelfProfileDto) {
    return this.employeesService.updateSelfProfile(user, dto);
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Export employees matching filter as CSV/Excel file' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'status', enum: EmploymentStatus, required: false })
  @ApiQuery({ name: 'position', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: EmploymentStatus,
    @Query('position') position?: string,
    @Query('search') search?: string,
    @Res() res?: Response
  ) {
    const csvContent = await this.employeesService.exportCsv({
      departmentId,
      status,
      position,
      search,
    });
    const dateStr = new Date().toISOString().split('T')[0];

    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader(
      'Content-Disposition',
      `attachment; filename="data-karyawan-${dateStr}.csv"`
    );
    return res!.status(200).send(Buffer.from(csvContent, 'utf-8'));
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Batch import employees from CSV with row-by-row validation' })
  @ApiResponse({ status: 200, description: 'Import result with errors if any' })
  importBatch(@Body() dto: ImportEmployeesDto, @CurrentUser() user: any) {
    return this.employeesService.importBatch(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get all employees with optional filters' })
  @ApiQuery({ name: 'departmentId', required: false, description: 'Filter by department UUID' })
  @ApiQuery({ name: 'status', enum: EmploymentStatus, required: false, description: 'Filter by employment status' })
  @ApiQuery({ name: 'position', required: false, description: 'Filter by position name' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, ID, or position' })
  @ApiResponse({ status: 200, description: 'List of employees' })
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: EmploymentStatus,
    @Query('position') position?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.findAll({ departmentId, status, position, search });
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get detailed employee profile with attendance statistics and histories' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee detailed profile with history' })
  getDetailed(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any
  ) {
    return this.employeesService.getDetailedProfile(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee profile by ID' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee basic profile' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any
  ) {
    return this.employeesService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Register a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Employee ID or email already exists' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: any) {
    return this.employeesService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Update employee particulars' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: any
  ) {
    return this.employeesService.update(id, dto, user);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Deactivate employee (set status to INACTIVE)' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee deactivated successfully' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any
  ) {
    return this.employeesService.deactivate(id, user);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Re-activate employee back to ACTIVE' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee activated successfully' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any
  ) {
    return this.employeesService.activate(id, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete / deactivate employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee record deactivated' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any
  ) {
    return this.employeesService.remove(id, user);
  }
}
