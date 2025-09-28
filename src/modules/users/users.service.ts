import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
import { CreateAuthDto } from '@/auth/dto/create-auth.dto';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {

  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly mailerService: MailerService
  ) { }

  isEmalExist = async (email: string) => {
    const user = await this.userModel.exists({ email })
    if (user) return true;
    return false;
  }

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, phone, address, image } = createUserDto;
    //check email
    const isExist = await this.isEmalExist(email)
    if (isExist) {
      throw new BadRequestException(`Email ${email} đã tồn tại. Vui lòng sử dụng email khác!`)
    }
    const hashPassword = await hashPasswordHelper(password)
    const user = await this.userModel.create({
      name, email, password: hashPassword, phone, address, image
    })
    return {
      _id: user._id
    }
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query)

    if (filter.current) delete filter.current
    if (filter.pageSize) delete filter.pageSize

    if (!current) current = 1
    if (!pageSize) pageSize = 10

    const totalItems = (await this.userModel.find(filter)).length
    const totalPage = Math.ceil(totalItems / pageSize)
    const skip = (current - 1) * (pageSize)

    const result = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(skip)
      .select("-password")
      .sort(sort as any)
    return { result, totalPage };
  }

  async findOne(id: string) {
    return await this.userModel.findById(id).select("-password").exec();
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne({ _id: updateUserDto._id }, { ...updateUserDto });
  }

  async remove(id: string) {
    //check id valid
    if (mongoose.isValidObjectId(id)) {
      return this.userModel.deleteOne({ _id: id }).exec()
    } else {
      throw new BadRequestException("ID không đúng định dạng")
    }
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { name, email, password } = registerDto;
    //check email
    const isExist = await this.isEmalExist(email)
    if (isExist) {
      throw new BadRequestException(`Email ${email} đã tồn tại. Vui lòng sử dụng email khác!`)
    }
    //hash password
    const hashPassword = await hashPasswordHelper(password)

    //tao code
    const codeID= uuidv4()

    //tao user
    const user = await this.userModel.create({
      name, email, password: hashPassword, isActive: false,
      codeId: codeID,
      codeExpired: dayjs().add(5, 'minutes')
    })

    //send mail
    this.mailerService.sendMail({
      to: user.email, // list of receivers
        subject: 'Activate your account at NestJS-App',
        template: 'register',
        context: {
          name: user.name ?? user.email,
          activationCode: codeID,
        },
    })

    //tra ve phan hoi
     return {
      _id: user._id
    }
  }
}
