import { describe, expect, it } from 'vitest';
import { numberDeviceLabels } from './labels';

describe('numberDeviceLabels', () => {
  it('numera los repetidos en orden de conexión', () => {
    const devices = ['Android', 'iPhone', 'Android', 'Android'].map((label, i) => ({
      deviceId: `d${i}`,
      label,
      connectedAt: i,
    }));
    expect(numberDeviceLabels(devices).map((device) => device.name)).toEqual([
      'Android',
      'iPhone',
      'Android 2',
      'Android 3',
    ]);
  });
});
