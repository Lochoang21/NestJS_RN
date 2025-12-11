/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { hashPasswordHelper } from '@/helpers/util';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
import {
  ChangePasswordDto,
  CheckCodeDto,
  CreateAuthDto,
} from '@/auth/dto/create-auth.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) { }

  isEmailExist = async (email: string) => {
    const user = await this.userRepository.findOne({ where: { email } });
    return !!user;
  };

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, phone, address, image } = createUserDto;

    // Check email
    const isExist = await this.isEmailExist(email);
    if (isExist) {
      throw new BadRequestException(
        `Email ${email} đã tồn tại. Vui lòng sử dụng email khác!`,
      );
    }

    const hashPassword = await hashPasswordHelper(password);
    const user = this.userRepository.create({
      name,
      email,
      password: hashPassword,
      phone,
      address,
      image,
    });

    const savedUser = await this.userRepository.save(user);
    return {
      id: savedUser.id,
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const skip = (current - 1) * pageSize;

    // Parse query parameters for filtering
    const where: any = {};
    if (query) {
      // Add your filtering logic here based on query string
      // Example: where.name = Like(`%${query}%`);
    }

    const [result, totalItems] = await this.userRepository.findAndCount({
      where,
      take: pageSize,
      skip: skip,
      select: ['id', 'name', 'email', 'phone', 'address', 'image', 'isActive', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });

    const totalPage = Math.ceil(totalItems / pageSize);

    return { result, totalPage };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'address', 'image', 'isActive', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async update(updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: updateUserDto.id },
    });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    await this.userRepository.update(updateUserDto.id, updateUserDto);
    return { affected: 1 };
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    return await this.userRepository.delete(id);
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { name, email, password } = registerDto;

    // Check email
    const isExist = await this.isEmailExist(email);
    if (isExist) {
      throw new BadRequestException(
        `Email ${email} đã tồn tại. Vui lòng sử dụng email khác!`,
      );
    }

    // Hash password
    const hashPassword = await hashPasswordHelper(password);

    // Generate code
    const codeID = uuidv4();

    // Create user
    const user = this.userRepository.create({
      name,
      email,
      password: hashPassword,
      isActive: false,
      codeId: codeID,
      codeExpired: dayjs().add(5, 'minutes').toDate(),
    });

    const savedUser = await this.userRepository.save(user);

    // Send mail
    this.mailerService.sendMail({
      to: savedUser.email,
      subject: 'Activate your account at NestJS-App',
      template: 'register',
      context: {
        name: savedUser.name ?? savedUser.email,
        activationCode: codeID,
      },
    });

    // Return response
    return {
      id: savedUser.id,
    };
  }

  async handleActive(data: CheckCodeDto) {
    const user = await this.userRepository.findOne({
      where: {
        id: data.id,
        codeId: data.code,
      },
    });

    if (!user) {
      throw new BadRequestException('Mã code không hợp lệ hoặc đã hết hạn');
    }

    // Check expire code
    const isBeforeCheck = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheck) {
      // Valid update user
      await this.userRepository.update(data.id, {
        isActive: true,
      });
      return { isBeforeCheck };
    } else {
      throw new BadRequestException('Mã code không hợp lệ hoặc đã hết hạn');
    }
  }

  async retryActive(email: string) {
    // Check email
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }

    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }

    const codeID = uuidv4();

    // Update user
    await this.userRepository.update(user.id, {
      codeId: codeID,
      codeExpired: dayjs().add(5, 'minutes').toDate(),
    });

    // Send email
    this.mailerService.sendMail({
      to: user.email,
      subject: 'Activate your account at NestJS-App',
      template: 'register',
      context: {
        name: user.name ?? user.email,
        activationCode: codeID,
      },
    });

    return { id: user.id };
  }

  async retryPassword(email: string) {
    // Check email
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }

    const codeID = uuidv4();

    // Update user
    await this.userRepository.update(user.id, {
      codeId: codeID,
      codeExpired: dayjs().add(5, 'minutes').toDate(),
    });

    // Send email
    this.mailerService.sendMail({
      to: user.email,
      subject: 'Change your password at NestJS-App',
      template: 'register',
      context: {
        name: user.name ?? user.email,
        activationCode: codeID,
      },
    });

    return { id: user.id, email: user.email };
  }

  async changePassword(data: ChangePasswordDto) {
    if (data.password !== data.confirmPassword) {
      throw new BadRequestException(
        'Mật khẩu và Xác nhận mật khẩu không khớp',
      );
    }

    // Check email
    const user = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }

    if (data.code !== user.codeId) {
      throw new BadRequestException('Mã code không hợp lệ');
    }

    // Check expire code
    const isBeforeCheck = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheck) {
      // Valid update user password
      const newPassword = await hashPasswordHelper(data.password);
      await this.userRepository.update(user.id, { password: newPassword });

      return { isBeforeCheck };
    } else {
      throw new BadRequestException('Mã code không hợp lệ hoặc đã hết hạn');
    }
  }
}
