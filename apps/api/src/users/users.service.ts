import { Injectable, NotFoundException } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import type { User } from '@dbnexus/metadata';

@Injectable()
export class UsersService {
    constructor(private metadataService: MetadataService) {}

    getAllUsers(): Omit<User, 'passwordHash'>[] {
        const users = this.metadataService.userRepository.findAll();
        return users.map((user) => this.sanitizeUser(user));
    }

    getUser(id: string): Omit<User, 'passwordHash'> | null {
        const user = this.metadataService.userRepository.findById(id);
        return user ? this.sanitizeUser(user) : null;
    }

    updateUserRole(id: string, role: 'admin' | 'editor' | 'viewer'): Omit<User, 'passwordHash'> {
        const user = this.metadataService.userRepository.update(id, { role });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return this.sanitizeUser(user);
    }

    deleteUser(id: string): boolean {
        return this.metadataService.userRepository.delete(id);
    }

    private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
        const { passwordHash: _, ...sanitized } = user;
        return sanitized;
    }
}
