import { IsNotEmpty } from 'class-validator';

export class SetPreferenceDto {
    @IsNotEmpty()
    value: unknown;
}
