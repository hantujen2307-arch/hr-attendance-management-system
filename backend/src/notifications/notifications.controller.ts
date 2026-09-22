import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications for authenticated user' })
  @ApiResponse({ status: 200, description: 'List of notifications with metadata' })
  findAll(@Req() req: any, @Query() query: QueryNotificationDto) {
    return this.notificationsService.findAll(req.user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread notifications count for authenticated user' })
  @ApiResponse({ status: 200, description: 'Unread count object' })
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications belonging to authenticated user as read' })
  @ApiResponse({ status: 200, description: 'Updated count summary' })
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Updated notification record' })
  @ApiResponse({ status: 404, description: 'Notification not found or not owned by user' })
  markAsRead(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @Post('broadcast')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Broadcast an announcement notification to users (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'Broadcast dispatch count' })
  broadcast(
    @Req() req: any,
    @Body() dto: BroadcastNotificationDto,
  ) {
    return this.notificationsService.broadcast(dto, req.user);
  }
}
