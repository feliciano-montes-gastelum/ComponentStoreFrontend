import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** True when running in the browser (false during SSR). Safe to call in any injection context. */
export function isBrowserPlatform(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}
