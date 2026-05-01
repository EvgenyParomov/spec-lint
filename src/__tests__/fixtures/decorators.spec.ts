import { describe, expect, it } from 'vitest';

describe('decorator test', () => {
  it('handles decorators in test files', () => {
    function Controller(): ClassDecorator {
      return () => {};
    }
    function Get(): MethodDecorator {
      return () => {};
    }

    @Controller()
    class TestController {
      @Get()
      public get() {
        return 'ok';
      }
    }
    expect(TestController).toBeDefined();
  });

  describe.skip('skipped group', () => {
    it('skipped test', () => {});
  });

  it.only('focused test', () => {});
});
