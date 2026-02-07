import { IsString, IsNotEmpty, IsArray, IsOptional, IsIn, IsObject } from 'class-validator';

export class SyncRowsDto {
    @IsString()
    @IsNotEmpty({ message: 'Source connection ID is required' })
    sourceConnectionId!: string;

    @IsString()
    @IsNotEmpty({ message: 'Source schema is required' })
    sourceSchema!: string;

    @IsArray()
    @IsObject({ each: true })
    rowIds!: Record<string, unknown>[];

    @IsArray()
    @IsString({ each: true })
    primaryKeys!: string[];

    @IsOptional()
    @IsIn(['insert', 'upsert'], { message: 'Mode must be insert or upsert' })
    mode?: 'insert' | 'upsert';
}
