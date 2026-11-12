import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header';
import { Footer } from '../../shared/components/footer/footer';

@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [
        RouterOutlet,
        HeaderComponent,
        Footer,
    ],
    templateUrl: './public-layout.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLayoutComponent { }