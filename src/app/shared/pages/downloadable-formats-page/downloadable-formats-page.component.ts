import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TabsComponent } from '../../components/tabs/tabs.component';
import { TableComponent } from '../../components/table-component/table-component.component';
import { DownloadableFormatsFacadeService } from './services/downloadable-formats-facade.service';
import {
  DownloadableFormat,
  DOWNLOADABLE_FORMATS_TABS,
  DOWNLOADABLE_FORMATS_COLUMNS,
  DOWNLOADABLE_FORMATS_BY_CATEGORY
} from './models/downloadable-formats-page.model';

@Component({
  selector: 'app-downloadable-formats-page',
  imports: [TabsComponent, TableComponent],
  templateUrl: './downloadable-formats-page.component.html',
  styleUrls: ['./downloadable-formats-page.component.css']
})
export class DownloadableFormatsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(DownloadableFormatsFacadeService);

  protected readonly tabs = DOWNLOADABLE_FORMATS_TABS;
  protected readonly columns = DOWNLOADABLE_FORMATS_COLUMNS;

  protected readonly activeTab = signal<string>('TI');
  protected readonly currentFormats = computed<DownloadableFormat[]>(() =>
    DOWNLOADABLE_FORMATS_BY_CATEGORY[this.activeTab()] ?? []
  );

  // ← Simplificado: ya no destructura url/id ni construye el nombre de
  // archivo — toda esa lógica vive en el facade, el componente solo
  // reenvía la fila completa.
  handleTableAction(event: { action: string; row: DownloadableFormat }): void {
    if (event.action !== 'descargar') return;
    // void explícito: promesa intencionalmente no esperada — el facade ya
    // maneja éxito/error internamente vía notificaciones, el componente no
    // necesita reaccionar al resultado.
    void this.facade.downloadFormat(event.row);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
