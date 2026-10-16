import { cloudBuddy } from './cloud-buddy';
const paths: Record<string, string> = {
  chart: '<path d="M4 21V11h4v10M10 21V3h4v18M16 21V7h4v14"/>',
  text: '<path d="M3 5h18M12 5v15M8 20h8M3 3v4m18-4v4"/>',
  sliders: '<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  wave: '<path d="M3 9v6m4-9v12m5-16v20m5-16v12m4-9v6"/>',
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  focus: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2M12 2v2m0 16v2M2 12h2m16 0h2"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/>',
  settings: '<path d="m9 3-1 3-3 1-2 3 2 3-1 3 3 2h3l2 3 3-1 1-3 3-1 2-3-2-3 1-3-3-2h-3L12 1z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m6 15 6-6 6 6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  moon: '<path d="M21 12.8A9 9 0 0 1 11.2 3 9 9 0 1 0 21 12.8Z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  sparkle: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6zM20 2v4m-2-2h4"/>',
  arrow: '<path d="M12 19V5m-6 6 6-6 6 6"/>', arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  pin: '<path d="m16 3 5 5-4 1-3 6-5-5 6-3zM3 21l7-7"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>', check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  play: '<path d="m8 5 12 7-12 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>', globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  shield: '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z"/><path d="m8 12 3 3 5-6"/>',
  key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-6 0 3-3"/>',
  link: '<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  external: '<path d="M15 3h6v6m0-6L10 14M9 3H3v18h18v-6"/>',
  pill: '<path d="m8 4 12 12a6 6 0 0 1-8 4L4 12a6 6 0 0 1 4-8ZM8 16l8-8"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
  volume: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5zM17 9l5 6m-5 0 5-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2a3 3 0 0 0 3-3c0-4-4-8-9-8Z"/><path d="M7 10h.01M10 7h.01M15 7h.01M6 14h.01"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  book: '<path d="M12 6C7 2 2 4 2 4v15s5-2 10 2c5-4 10-2 10-2V4s-5-2-10 2Zm0 0v15"/>',
  github: '<path d="M9 19c-5 1-5-3-7-3m14 6v-4a3.5 3.5 0 0 0-1-3c3-.3 6-1.5 6-6a5 5 0 0 0-1-3 4.5 4.5 0 0 0 0-3s-1 0-3 1a10 10 0 0 0-6 0C9 3 8 3 8 3a4.5 4.5 0 0 0 0 3 5 5 0 0 0-1 3c0 4.5 3 5.7 6 6a3.5 3.5 0 0 0-1 3v4"/>',
  coffee: '<path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zm14 0h2a3 3 0 0 1 0 6h-2M6 2v2m4-2v2m4-2v2"/>',
  attach: '<path d="m8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l9-9"/>',
};
export function icon(name: string, size = 18) { return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`; }
let buddyCounter = 0;
export function buddy(size = 48, outfit = 'comet', mood = 'idle') {
  if (outfit !== 'comet') return cloudBuddy(size, outfit, mood);
  const id = `lu-${++buddyCounter}`;
  return `<span class="lu-buddy mood-${mood} outfit-${outfit}" style="--buddy-size:${size}px" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="${id}" x1="13" y1="9" x2="52" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="var(--buddy-light)"/><stop offset="1" stop-color="var(--buddy-dark)"/></linearGradient></defs><ellipse class="buddy-shadow" cx="32" cy="57" rx="15" ry="3" fill="var(--accent)" opacity=".13"/><g class="buddy-float"><path d="M16 18c1-9 11-14 20-10 5 2 8 1 14-2-1 7-5 10-6 11 7 6 10 17 6 25-4 9-14 13-23 9-10-4-15-12-13-21 0-5 1-8 2-12Z" fill="url(#${id})"/><path d="M20 18c3-6 8-8 13-7" stroke="white" opacity=".24" stroke-width="2" stroke-linecap="round"/><g class="buddy-face"><g class="buddy-eyes"><ellipse cx="27" cy="31" rx="2.8" ry="4.1" fill="#F9F7FF"/><ellipse cx="40" cy="30" rx="2.8" ry="4.1" fill="#F9F7FF"/></g><path class="buddy-smile" d="M31 39q3 3 6-1" stroke="#F9F7FF" stroke-width="1.5" stroke-linecap="round" opacity=".8"/><ellipse cx="22" cy="38" rx="3.5" ry="1.5" fill="#FFCAD8" opacity=".35"/></g><path class="buddy-star" d="m51 14 1.5 3.5L56 19l-3.5 1.5L51 24l-1.5-3.5L46 19l3.5-1.5Z" fill="#FCE2A8"/></g></svg></span>`;
}
