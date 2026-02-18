import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateQueryDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection ID is required' })
    connectionId!: string;

    @IsString()
    @IsNotEmpty({ message: 'SQL is required' })
    sql!: string;
}
