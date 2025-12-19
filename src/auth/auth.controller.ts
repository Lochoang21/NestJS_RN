/* eslint-disable prettier/prettier */
import {
  Controller,
  Request,
  Get,
  Post,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { Public, ResponseMessage } from '@/decorator/customize';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import {
  ChangePasswordDto,
  CheckCodeDto,
  CreateAuthDto,
  RefreshTokenDto,
} from './dto/create-auth.dto';
import { EmailDto } from './dto/email.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
  ) { }

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Fetch Login')
  handleLogin(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('register')
  @Public()
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.register(registerDto);
  }

  @Post('check-code')
  @Public()
  checkCode(@Body() registerDto: CheckCodeDto) {
    return this.authService.checkCode(registerDto);
  }

  @Post('retry-active')
  @Public()
  retryActive(@Body() body: EmailDto) {
    return this.authService.retryActive(body.email);
  }

  @Post('retry-password')
  @Public()
  retryPassword(@Body() body: EmailDto) {
    return this.authService.retryPassword(body.email);
  }

  @Post('change-password')
  @Public()
  changePassword(@Body() data: ChangePasswordDto) {
    return this.authService.changePassword(data);
  }

  @Post('refresh-token')
  @Public()
  refreshToken(@Body() data: RefreshTokenDto) {
    return this.authService.refreshToken(data);
  }

  @Get('mail')
  @Public()
  testMail() {
    this.mailerService.sendMail({
      to: 'lochoang2101@gmail.com', // list of receivers
      subject: 'Testing Nest MailerModule ✔', // Subject line
      text: 'welcome', // plaintext body
      template: 'register',
      context: {
        name: 'lochoang',
        activationCode: 1222131,
      },
    });
    return 'ok';
  }
}
