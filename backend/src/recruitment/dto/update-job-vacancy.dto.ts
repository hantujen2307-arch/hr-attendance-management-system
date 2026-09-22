import { PartialType } from '@nestjs/swagger';
import { CreateJobVacancyDto } from './create-job-vacancy.dto';

export class UpdateJobVacancyDto extends PartialType(CreateJobVacancyDto) {}
