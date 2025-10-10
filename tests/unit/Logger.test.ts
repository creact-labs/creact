import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, LoggerFactory, LogLevel, LogScope } from '../../src/utils/Logger';

describe('Logger', () => {
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Reset logger configuration
    LoggerFactory.reset();

    // Spy on console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Scope Filtering', () => {
    it('should not log when scope is disabled', () => {
      LoggerFactory.configure({ scopes: ['renderer'], level: 'debug' });
      const logger = LoggerFactory.getLogger('reconciler');

      logger.debug('test message');
      logger.info('test message');
      logger.warn('test message');
      logger.error('test message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log when scope is enabled', () => {
      LoggerFactory.configure({ scopes: ['renderer'], level: 'debug' });
      const logger = LoggerFactory.getLogger('renderer');

      logger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[renderer]')
      );
    });

    it('should log all scopes when * is used', () => {
      LoggerFactory.configure({ scopes: ['*'], level: 'debug' });
      const rendererLogger = LoggerFactory.getLogger('renderer');
      const reconcilerLogger = LoggerFactory.getLogger('reconciler');

      rendererLogger.info('renderer message');
      reconcilerLogger.info('reconciler message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(2);
    });

    it('should support multiple enabled scopes', () => {
      LoggerFactory.configure({
        scopes: ['renderer', 'reconciler'],
        level: 'debug',
      });

      const rendererLogger = LoggerFactory.getLogger('renderer');
      const reconcilerLogger = LoggerFactory.getLogger('reconciler');
      const validatorLogger = LoggerFactory.getLogger('validator');

      rendererLogger.info('renderer message');
      reconcilerLogger.info('reconciler message');
      validatorLogger.info('validator message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Level Filtering', () => {
    beforeEach(() => {
      LoggerFactory.configure({ scopes: ['*'], level: 'info' });
    });

    it('should not log debug messages when level is info', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.debug('debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.info('info message');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should log warn messages when level is info', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.warn('warn message');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log error messages when level is info', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should only log errors when level is error', () => {
      LoggerFactory.configure({ scopes: ['*'], level: 'error' });
      const logger = LoggerFactory.getLogger('renderer');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log all levels when level is debug', () => {
      LoggerFactory.configure({ scopes: ['*'], level: 'debug' });
      const logger = LoggerFactory.getLogger('renderer');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Log Format', () => {
    beforeEach(() => {
      LoggerFactory.configure({ scopes: ['*'], level: 'debug' });
    });

    it('should include timestamp in log message', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      );
    });

    it('should include scope in log message', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[renderer]')
      );
    });

    it('should include level in log message', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
    });

    it('should include the message', () => {
      const logger = LoggerFactory.getLogger('renderer');

      logger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('test message')
      );
    });

    it('should pass additional arguments', () => {
      const logger = LoggerFactory.getLogger('renderer');
      const obj = { key: 'value' };

      logger.info('test message', obj);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('test message'),
        obj
      );
    });
  });

  describe('Child Logger', () => {
    beforeEach(() => {
      LoggerFactory.configure({ scopes: ['*'], level: 'debug' });
    });

    it('should create child logger with additional context', () => {
      const logger = LoggerFactory.getLogger('renderer');
      const childLogger = logger.child({ requestId: '123' });

      childLogger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"123"')
      );
    });

    it('should merge parent and child context', () => {
      const logger = LoggerFactory.getLogger('renderer');
      const childLogger = logger.child({ requestId: '123' });
      const grandchildLogger = childLogger.child({ userId: '456' });

      grandchildLogger.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"123"')
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"456"')
      );
    });
  });

  describe('LoggerFactory', () => {
    it('should configure logger factory', () => {
      LoggerFactory.configure({ scopes: ['renderer'], level: 'warn' });

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual(['renderer']);
      expect(config.level).toBe('warn');
    });

    it('should get logger with factory configuration', () => {
      LoggerFactory.configure({ scopes: ['renderer'], level: 'warn' });
      const logger = LoggerFactory.getLogger('renderer');

      logger.info('info message');
      logger.warn('warn message');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should reset configuration', () => {
      LoggerFactory.configure({ scopes: ['*'], level: 'debug' });
      LoggerFactory.reset();

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual([]);
      expect(config.level).toBe('info');
    });
  });

  describe('Environment Variable Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should configure from CREACT_LOG environment variable', () => {
      process.env.CREACT_LOG = 'renderer,reconciler';
      LoggerFactory.configureFromEnv();

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual(['renderer', 'reconciler']);
    });

    it('should configure from CREACT_LOG_LEVEL environment variable', () => {
      process.env.CREACT_LOG_LEVEL = 'debug';
      LoggerFactory.configureFromEnv();

      const config = LoggerFactory.getConfig();

      expect(config.level).toBe('debug');
    });

    it('should support * for all scopes', () => {
      process.env.CREACT_LOG = '*';
      LoggerFactory.configureFromEnv();

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual(['*']);
    });
  });

  describe('CLI Configuration', () => {
    it('should configure from CLI flags', () => {
      LoggerFactory.configureFromCLI({
        log: 'renderer,reconciler',
        logLevel: 'debug',
      });

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual(['renderer', 'reconciler']);
      expect(config.level).toBe('debug');
    });

    it('should handle missing CLI flags', () => {
      LoggerFactory.configure({ scopes: ['renderer'], level: 'info' });
      LoggerFactory.configureFromCLI({});

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual(['renderer']);
      expect(config.level).toBe('info');
    });
  });

  describe('File Configuration', () => {
    it('should configure from config file', () => {
      LoggerFactory.configureFromFile({
        log: {
          scopes: ['renderer', 'reconciler'],
          level: 'debug',
        },
      });

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual(['renderer', 'reconciler']);
      expect(config.level).toBe('debug');
    });

    it('should handle missing log config', () => {
      LoggerFactory.configure({ scopes: ['renderer'], level: 'info' });
      LoggerFactory.configureFromFile({});

      const config = LoggerFactory.getConfig();

      expect(config.scopes).toEqual(['renderer']);
      expect(config.level).toBe('info');
    });
  });

  describe('Standard Scopes', () => {
    const standardScopes: LogScope[] = [
      'renderer',
      'reconciler',
      'validator',
      'clouddom',
      'state-machine',
      'provider',
      'hooks',
      'cli',
      'runtime',
      'parallel',
    ];

    it('should support all standard scopes', () => {
      LoggerFactory.configure({ scopes: ['*'], level: 'debug' });

      standardScopes.forEach((scope) => {
        const logger = LoggerFactory.getLogger(scope);
        logger.info(`${scope} message`);
      });

      expect(consoleInfoSpy).toHaveBeenCalledTimes(standardScopes.length);
    });
  });

  describe('Zero Overhead', () => {
    it('should not execute log formatting when scope is disabled', () => {
      LoggerFactory.configure({ scopes: [], level: 'debug' });
      const logger = LoggerFactory.getLogger('renderer');

      // This should be a no-op with zero overhead
      const expensiveOperation = vi.fn(() => 'expensive result');
      logger.debug('message', expensiveOperation());

      // The expensive operation still runs (we can't prevent that)
      // but the logger doesn't do any formatting
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });
});
