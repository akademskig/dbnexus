import {
    Controller,
    Post,
    Body,
    UploadedFile,
    UseInterceptors,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service.js';
import { PreviewImportDto, ExecuteImportDto } from './dto/index.js';

@Controller('import')
export class ImportController {
    constructor(private readonly importService: ImportService) {}

    @Post('preview')
    @UseInterceptors(FileInterceptor('file'))
    @HttpCode(HttpStatus.OK)
    async previewImport(
        @UploadedFile() file: { originalname: string; buffer: Buffer },
        @Body() body: PreviewImportDto
    ) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        return this.importService.parseFile(file.buffer, file.originalname, {
            format: body.format,
            delimiter: body.delimiter,
            hasHeader: body.hasHeader !== false,
        });
    }

    @Post('execute')
    @HttpCode(HttpStatus.OK)
    async executeImport(@Body() body: ExecuteImportDto) {
        return this.importService.executeImport(body);
    }
}
