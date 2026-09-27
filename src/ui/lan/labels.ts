import type { LanDevice } from '../../platform/desktop';

/** Numera los nombres repetidos en orden de conexión: "Android", "Android 2", … */
export function numberDeviceLabels(
  devices: readonly LanDevice[],
): { id: string; name: string; teamId?: string }[] {
  const seen = new Map<string, number>();
  return devices.map((device) => {
    const count = (seen.get(device.label) ?? 0) + 1;
    seen.set(device.label, count);
    return {
      id: device.deviceId,
      name: count === 1 ? device.label : `${device.label} ${count}`,
      ...(device.teamId !== undefined && { teamId: device.teamId }),
    };
  });
}
