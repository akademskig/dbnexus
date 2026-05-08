import { IsString, IsIn } from 'class-validator';

export class UpdateUserRoleDto {
    @IsString()
    @IsIn(['admin', 'editor', 'viewer'], { message: 'Role must be admin, editor, or viewer' })
    role!: 'admin' | 'editor' | 'viewer';
}
