import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class ExecuteQueryDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection ID is required' })
    connectionId!: string;

    @IsString()
    @IsNotEmpty({ message: 'SQL query is required' })
    sql!: string;

    @IsOptional()
    @IsBoolean()
    confirmed?: boolean;
}
