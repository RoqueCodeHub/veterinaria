import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'alivet-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly platformId = inject(PLATFORM_ID);
    readonly theme = signal<ThemeMode>('dark');

    constructor() {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.apply(this.readStored());
    }

    toggle(): void {
        this.apply(this.theme() === 'dark' ? 'light' : 'dark');
    }

    private readStored(): ThemeMode {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
        } catch {
            /* almacenamiento no disponible */
        }
        return 'dark';
    }

    private apply(mode: ThemeMode): void {
        this.theme.set(mode);
        document.documentElement.setAttribute('data-theme', mode);
        document.documentElement.style.colorScheme = mode;
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            /* almacenamiento no disponible */
        }
    }
}
