import { Controller, Request, Get, Post, UseGuards, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { Public } from '@/decorator/customize';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { CreateAuthDto } from './dto/create-auth.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService
  
  ) {}

  @Post("login")
  @Public()
  @UseGuards(LocalAuthGuard)
  hadleLogin(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('register')
  @Public()
  register(@Body() registerDto : CreateAuthDto) {
    return this.authService.register(registerDto);
  }

  @Get('mail')
  @Public()
  testMail() {
    this.mailerService
      .sendMail({
        to: 'lochoang2101@gmail.com', // list of receivers
        subject: 'Testing Nest MailerModule ✔', // Subject line
        text: 'welcome', // plaintext body
        template: 'register',
        context: {
          name: 'lochoang',
          activationCode: 1222131,
        },
      })
    return "ok";
  }
}
