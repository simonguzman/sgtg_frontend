import { Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { ArchivedProcessFacadeService } from './services/archived-process-facade.service';
import { ArchivedRecordType } from './services/archived-record-resolver.service';
import { ArchivedRecordView } from './interfaces/archived-record-view.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

const VALID_TYPES: ArchivedRecordType[] = ['propuestas', 'anteproyectos', 'trabajos'];

@Component({
  selector: 'app-archived-process',
  standalone: true,
  imports: [],
  templateUrl: './archived-process.component.html',
  styleUrls: ['./archived-process.component.css']
})
export class ArchivedProcessComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly breadcrumbService = inject(BreadcrumbService);
  protected readonly facade = inject(ArchivedProcessFacadeService);

  readonly processType = signal<string>('');
  readonly record = signal<ArchivedRecordView | null>(null);

  constructor() {
    effect(() => {
      const typeStr = this.processType().toUpperCase() || 'DOCUMENTO';
      // setTimeout previene el ExpressionChangedAfterItHasBeenCheckedError
      // al actualizar un servicio global desde un efecto del componente hijo
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(`Detalle de ${typeStr}`);
        this.breadcrumbService.setDynamicTitle(`Historial - ${typeStr}`);
        this.titleService.setTitle(`Historial - ${typeStr}`);
      });
    });
  }

  ngOnInit(): void {
    const type = this.route.snapshot.paramMap.get('type');
    const id = this.route.snapshot.paramMap.get('id');

    if (!type || !id || !this.isValidType(type)) {
      this.facade.showInvalidRouteError();
      this.goBack();
      return;
    }

    this.processType.set(type);

    const resolved = this.facade.loadRecord(type, id);
    if (!resolved) {
      this.facade.showNotFoundError();
      this.goBack();
      return;
    }

    this.record.set(resolved);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  downloadDocument(document: FileDocument): void {
    void this.facade.downloadDocument(document);
  }

  goBack(): void {
    this.router.navigate(['/history']);
  }

  private isValidType(type: string): type is ArchivedRecordType {
    return VALID_TYPES.includes(type as ArchivedRecordType);
  }
}
