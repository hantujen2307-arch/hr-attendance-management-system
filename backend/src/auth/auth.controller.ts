import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials and issue JWT access token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns JWT access token and user metadata.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials (email or password incorrect).',
  })
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress;
    return this.authService.login(
      dto,
      typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined,
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile details of the authenticated user.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Token missing or invalid.',
  })
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}
