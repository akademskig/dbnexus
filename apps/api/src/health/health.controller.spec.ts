import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
    let controller: HealthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('check', () => {
        it('should return status ok', () => {
            const result = controller.check();
            expect(result.status).toBe('ok');
        });

        it('should return a timestamp', () => {
            const result = controller.check();
            expect(result.timestamp).toBeDefined();
            expect(typeof result.timestamp).toBe('string');
        });

        it('should return a valid ISO timestamp', () => {
            const result = controller.check();
            const date = new Date(result.timestamp);
            expect(date.toISOString()).toBe(result.timestamp);
        });
    });

    describe('liveness', () => {
        it('should return status ok', () => {
            const result = controller.liveness();
            expect(result.status).toBe('ok');
        });
    });

    describe('readiness', () => {
        it('should return status ok', () => {
            const result = controller.readiness();
            expect(result.status).toBe('ok');
        });
    });
});
