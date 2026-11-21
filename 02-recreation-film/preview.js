async function openPreview(ready) {
  const query = new URLSearchParams(location.search);
  if (query.has('capture')) return;
  document.body.classList.add('preview');

  const button = document.getElementById('play');
  const slider = document.getElementById('position');
  const clock = document.getElementById('clock');
  button.disabled = slider.disabled = true;
  let animation;
  try {
    animation = await ready;
  } catch (error) {
    clock.textContent = '预览加载失败';
    console.error(error);
    return;
  }

  const end = animation.duration;
  slider.max = end;
  let position = 0;
  let start = 0;
  let token = 0;
  let playing = false;
  let drawing = Promise.resolve();

  function show(time) {
    position = Math.max(0, Math.min(end, time));
    slider.value = position;
    clock.textContent = position.toFixed(2) + ' s';
    const next = position;
    drawing = drawing.then(() => animation.seek(next));
    return drawing;
  }

  function pause() {
    token++;
    playing = false;
    button.textContent = '播放';
  }

  async function tick(now, active) {
    if (active !== token) return;
    const time = (now - start) / 1000;
    await show(time);
    if (active !== token) return;
    if (time >= end) pause();
    else requestAnimationFrame(next => tick(next, active));
  }

  function toggle() {
    if (playing) {
      pause();
      return;
    }
    if (position >= end) show(0);
    start = performance.now() - position * 1000;
    playing = true;
    button.textContent = '暂停';
    const active = ++token;
    requestAnimationFrame(now => tick(now, active));
  }

  button.onclick = toggle;
  slider.oninput = () => {
    pause();
    show(Number(slider.value));
  };
  addEventListener('keydown', event => {
    if (event.target.matches?.('button, input')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      toggle();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      pause();
      show(position + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 10 : 1) / 30);
    }
  });

  await show(Number(query.get('t')) || 0);
  button.disabled = slider.disabled = false;
}
