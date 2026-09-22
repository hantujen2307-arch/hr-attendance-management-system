import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RecruitmentService } from './recruitment.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

import { CreateJobVacancyDto } from './dto/create-job-vacancy.dto';
import { UpdateJobVacancyDto } from './dto/update-job-vacancy.dto';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { UpdateApplicantStageDto } from './dto/update-applicant-stage.dto';
import { ConvertApplicantDto } from './dto/convert-applicant.dto';
import { QueryApplicantDto, QueryVacancyDto } from './dto/query-recruitment.dto';

@ApiTags('Recruitment')
@ApiBearerAuth()
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // ===========================================================================
  // 1. STATISTICAL SUMMARY
  // ===========================================================================

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Mendapatkan ringkasan statistik rekrutmen' })
  @ApiResponse({ status: 200, description: 'Statistik rekrutmen berhasil diambil' })
  async getSummary() {
    return this.recruitmentService.getSummary();
  }

  // ===========================================================================
  // 2. JOB VACANCY (LOWONGAN PEKERJAAN)
  // ===========================================================================

  @Get('vacancies')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Mendapatkan daftar lowongan pekerjaan dengan filter dan pencarian' })
  @ApiResponse({ status: 200, description: 'Daftar lowongan pekerjaan' })
  async findAllVacancies(@Query() query: QueryVacancyDto) {
    return this.recruitmentService.findAllVacancies(query);
  }

  @Get('vacancies/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Mendapatkan detail lowongan pekerjaan berdasarkan ID' })
  @ApiParam({ name: 'id', description: 'UUID Lowongan' })
  async findOneVacancy(@Param('id') id: string) {
    return this.recruitmentService.findOneVacancy(id);
  }

  @Post('vacancies')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat lowongan pekerjaan baru (Admin/HR)' })
  @ApiResponse({ status: 201, description: 'Lowongan pekerjaan berhasil dibuat' })
  async createVacancy(
    @Body() dto: CreateJobVacancyDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.recruitmentService.createVacancy(dto, user, ipAddress);
  }

  @Patch('vacancies/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Memperbarui data lowongan pekerjaan (Admin/HR)' })
  async updateVacancy(
    @Param('id') id: string,
    @Body() dto: UpdateJobVacancyDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.recruitmentService.updateVacancy(id, dto, user, ipAddress);
  }

  @Delete('vacancies/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Menghapus lowongan pekerjaan jika belum memiliki pelamar (Admin/HR)' })
  async deleteVacancy(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.recruitmentService.deleteVacancy(id, user, ipAddress);
  }

  // ===========================================================================
  // 3. APPLICANTS (PELAMAR KERJA)
  // ===========================================================================

  @Get('applicants')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Mendapatkan daftar pelamar dengan filter lowongan, tahapan, dan keyword' })
  @ApiResponse({ status: 200, description: 'Daftar pelamar kerja' })
  async findAllApplicants(@Query() query: QueryApplicantDto) {
    return this.recruitmentService.findAllApplicants(query);
  }

  @Get('applicants/:id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Mendapatkan detail lengkap pelamar' })
  @ApiParam({ name: 'id', description: 'UUID Pelamar' })
  async findOneApplicant(@Param('id') id: string) {
    return this.recruitmentService.findOneApplicant(id);
  }

  @Post('applicants')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mendaftarkan data pelamar baru beserta CV terverifikasi (Admin/HR)' })
  @ApiResponse({ status: 201, description: 'Pelamar berhasil didaftarkan' })
  async createApplicant(
    @Body() dto: CreateApplicantDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.recruitmentService.createApplicant(dto, user, ipAddress);
  }

  @Patch('applicants/:id/stage')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Memindahkan tahapan rekrutmen pelamar beserta catatan (Admin/HR)' })
  async updateApplicantStage(
    @Param('id') id: string,
    @Body() dto: UpdateApplicantStageDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.recruitmentService.updateApplicantStage(id, dto, user, ipAddress);
  }

  // ===========================================================================
  // 4. KONVERSI PELAMAR MENJADI KARYAWAN (HIRED -> EMPLOYEE)
  // ===========================================================================

  @Post('applicants/:id/convert')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mengonversi pelamar yang diterima (HIRED) menjadi Karyawan baru (Admin/HR)' })
  @ApiResponse({ status: 201, description: 'Karyawan baru berhasil dibuat dari data pelamar' })
  async convertApplicantToEmployee(
    @Param('id') id: string,
    @Body() dto: ConvertApplicantDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    return this.recruitmentService.convertApplicantToEmployee(id, dto, user, ipAddress);
  }
}
