import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class MaintenanceDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection ID is required' })
    connectionId!: string;

    @IsString()
    @IsNotEmpty({ message: 'Operation is required' })
    operation!: string;

    @IsOptional()
    @IsString()
    target?: string;

    @IsOptional()
    @IsIn(['database', 'schema', 'table'], { message: 'Scope must be database, schema, or table' })
    scope?: 'database' | 'schema' | 'table';
}
