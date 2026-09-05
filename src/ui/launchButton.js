// "발사" 버튼 (11단계, 15단계에서 결과 화면 전환 추가)

/**
 * @param {HTMLElement} container
 * @param {{ onLaunch: () => void, onReset: () => void }} handlers
 * @returns {{ setEnabled: (on: boolean) => void, setState: (state: 'ready' | 'flying' | 'done') => void }}
 */
export function createLaunchButton(container, handlers) {
  const row = document.createElement('div');
  row.className = 'button-group';

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'launch-button';
  launch.id = 'launch-button';
  launch.textContent = '🚀 발사';
  launch.disabled = true;
  launch.addEventListener('click', () => handlers.onLaunch());

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'preset-button';
  reset.id = 'launch-reset-button';
  reset.textContent = '처음으로';
  reset.addEventListener('click', () => handlers.onReset());

  row.appendChild(launch);
  row.appendChild(reset);
  container.appendChild(row);

  return {
    setEnabled(on) { launch.disabled = !on; },
    setState(state) {
      if (state === 'ready') { launch.disabled = false; launch.textContent = '🚀 발사'; }
      if (state === 'flying') { launch.disabled = true; launch.textContent = '비행 중…'; }
      if (state === 'done') { launch.disabled = true; launch.textContent = '발사 완료'; }
    },
  };
}
