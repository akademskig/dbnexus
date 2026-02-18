import { IsString, IsNotEmpty } from 'class-validator';

export class ConnectionTagDto {
    @IsString()
    @IsNotEmpty()
    id!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    color!: string;
}
