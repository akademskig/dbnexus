import { IsNotEmpty } from 'class-validator';

export class SetSettingDto {
    @IsNotEmpty({ message: 'Value is required' })
    value!: unknown;
}
