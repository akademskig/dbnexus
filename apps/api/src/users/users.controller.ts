import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Body,
    HttpCode,
    HttpStatus,
    ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Roles, CurrentUser } from '../auth/decorators/index.js';
import type { User } from '@dbnexus/metadata';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    @Roles('admin')
    async getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
        return this.usersService.getAllUsers();
    }

    @Get(':id')
    @Roles('admin')
    async getUser(@Param('id') id: string): Promise<Omit<User, 'passwordHash'> | null> {
        return this.usersService.getUser(id);
    }

    @Patch(':id/role')
    @Roles('admin')
    async updateUserRole(
        @Param('id') userId: string,
        @Body() dto: UpdateUserRoleDto,
        @CurrentUser('id') currentUserId: string
    ): Promise<Omit<User, 'passwordHash'>> {
        if (userId === currentUserId && dto.role !== 'admin') {
            throw new ForbiddenException('Cannot demote yourself from admin');
        }
        return this.usersService.updateUserRole(userId, dto.role);
    }

    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.OK)
    async deleteUser(
        @Param('id') userId: string,
        @CurrentUser('id') currentUserId: string
    ): Promise<{ success: boolean; message: string }> {
        if (userId === currentUserId) {
            throw new ForbiddenException('Cannot delete your own account');
        }
        const deleted = await this.usersService.deleteUser(userId);
        return {
            success: deleted,
            message: deleted ? 'User deleted successfully' : 'User not found',
        };
    }
}
