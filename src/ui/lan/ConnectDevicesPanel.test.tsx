import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  installDesktop,
  makeFakeDesktop,
  makeLanStatus,
  uninstallDesktop,
  type FakeDesktop,
} from '../../../tests/fixtures/desktop';
import type { LanStatus } from '../../platform/desktop';
import { ConnectDevicesButton, ConnectDevicesPanel } from './ConnectDevicesPanel';

afterEach(() => {
  uninstallDesktop();
});

async function renderPanel(status: LanStatus = makeLanStatus()): Promise<FakeDesktop> {
  const fake = makeFakeDesktop(status);
  render(<ConnectDevicesPanel desktop={fake.api} onClose={() => {}} />);
  await screen.findByRole('heading', { name: /Dispositivos conectados|Conectar dispositivos/ });
  // Espera a que llegue el estado inicial.
  await act(async () => {});
  return fake;
}

describe('ConnectDevicesPanel', () => {
  it('no muestra el QR ni la dirección: se muestran en la TV', async () => {
    await renderPanel();
    expect(screen.getByLabelText('Red')).toHaveValue('Wi-Fi');
    expect(screen.getByRole('heading', { name: 'Dispositivos conectados: 0' })).toBeVisible();
    expect(screen.queryByRole('img', { name: /Código QR/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('lan-url')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).not.toHaveTextContent('192.168.1.20:47470');
    expect(screen.getByRole('dialog')).toHaveTextContent('Mostrar QR en la TV');
  });

  it('actualiza la lista de dispositivos con onStatus y numera los repetidos', async () => {
    const fake = await renderPanel();
    expect(screen.getByRole('heading', { name: 'Dispositivos conectados: 0' })).toBeVisible();

    act(() =>
      fake.emitStatus(
        makeLanStatus({
          devices: [
            { deviceId: 'a', label: 'Android', connectedAt: 1 },
            { deviceId: 'b', label: 'iPhone', connectedAt: 2 },
            { deviceId: 'c', label: 'Android', connectedAt: 3 },
          ],
        }),
      ),
    );
    expect(screen.getByRole('heading', { name: 'Dispositivos conectados: 3' })).toBeVisible();
    const items = within(screen.getByRole('list', { name: 'Dispositivos conectados' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(items).toEqual(['Android', 'iPhone', 'Android 2']);

    act(() => fake.emitStatus(makeLanStatus()));
    expect(screen.getByRole('heading', { name: 'Dispositivos conectados: 0' })).toBeVisible();
  });

  it('avisa si la red es Pública, con los pasos para cambiarla', async () => {
    await renderPanel(makeLanStatus({ networkCategory: 'public' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Pública');
    expect(alert).toHaveTextContent('Tipo de perfil de red');
  });

  it('no avisa si la red es Privada o desconocida', async () => {
    await renderPanel(makeLanStatus({ networkCategory: 'unknown' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sin puerto libre indica que la conexión no está disponible', async () => {
    await renderPanel(makeLanStatus({ url: null, port: null, problem: 'noPort' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La conexión de dispositivos no está disponible',
    );
    expect(screen.queryByRole('img', { name: /Código QR/ })).not.toBeInTheDocument();
  });

  it('sin red indica que hay que conectarse a una red wifi', async () => {
    await renderPanel(makeLanStatus({ url: null, interfaces: [], problem: 'noInterface' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Conéctalo a una red wifi');
    expect(screen.queryByRole('img', { name: /Código QR/ })).not.toBeInTheDocument();
  });

  it('muestra la guía "¿No se conectan?"', async () => {
    const user = userEvent.setup();
    await renderPanel();
    await user.click(screen.getByText('¿No se conectan?'));
    const guide = screen.getByText('¿No se conectan?').closest('details')!;
    expect(guide).toHaveAttribute('open');
    expect(guide).toHaveTextContent('Firewall de Windows');
    expect(guide).toHaveTextContent('misma red wifi');
    expect(guide).toHaveTextContent('Redes de invitados');
  });

  it('elegir otra interfaz llama a selectInterface', async () => {
    const user = userEvent.setup();
    const fake = await renderPanel(
      makeLanStatus({
        interfaces: [
          { name: 'Wi-Fi', address: '192.168.1.20', selected: true },
          { name: 'vEthernet (WSL)', address: '172.25.0.1', selected: false },
        ],
      }),
    );
    await user.selectOptions(screen.getByLabelText('Red'), 'vEthernet (WSL)');
    expect(fake.api.lan.selectInterface).toHaveBeenCalledWith('vEthernet (WSL)');
  });
});

describe('ConnectDevicesButton', () => {
  it('no aparece sin DesktopApi', () => {
    render(<ConnectDevicesButton />);
    expect(screen.queryByRole('button', { name: 'Conectar dispositivos' })).not.toBeInTheDocument();
  });

  it('en escritorio abre y cierra el panel', async () => {
    const user = userEvent.setup();
    installDesktop();
    render(<ConnectDevicesButton />);
    await user.click(screen.getByRole('button', { name: 'Conectar dispositivos' }));
    expect(screen.getByRole('dialog', { name: 'Conectar dispositivos' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
