import { Icon } from '#components';

export function icon(name: string) {
  if (!name.includes(':')) {
    name = 'ri:' + name;
  }

  return h(Icon, { name });
}

export function iconRender(name: string) {
  return () => icon(name);
}
