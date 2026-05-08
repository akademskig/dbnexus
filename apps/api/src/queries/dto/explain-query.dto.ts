import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class ExplainQueryDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection ID is required' })
    connectionId!: string;

    @IsString()
    @IsNotEmpty({ message: 'SQL is required' })
    sql!: string;

    @IsOptional()
    @IsBoolean()
    analyze?: boolean;
}
