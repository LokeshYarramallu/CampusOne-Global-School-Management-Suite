import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('reports ok with the active environment', () => {
    const result = service.check();

    expect(result.status).toBe('ok');
    expect(result.environment).toBe('test');
  });

  it('reports uptime as a non-negative whole number of seconds', () => {
    const { uptimeSeconds } = service.check();

    expect(Number.isInteger(uptimeSeconds)).toBe(true);
    expect(uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('reports the timestamp as an ISO-8601 string', () => {
    const { timestamp } = service.check();

    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
