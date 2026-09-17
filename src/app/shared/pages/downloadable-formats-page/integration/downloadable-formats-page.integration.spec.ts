// src/app/shared/pages/downloadable-formats-page/integration/downloadable-formats-page.integration.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DownloadableFormatsPageComponent } from '../downloadable-formats-page.component';
import { DownloadableFormatsFacadeService } from '../services/downloadable-formats-facade.service';
import { TabsComponent } from '../../../components/tabs/tabs.component';
import { TableComponent } from '../../../components/table-component/table-component.component';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';
import { DOWNLOADABLE_FORMATS_BY_CATEGORY } from '../models/downloadable-formats-page.model';

describe('Integración [Shared Pages]: Downloadable Formats Page', () => {
  let component: DownloadableFormatsPageComponent;
  let fixture: ComponentFixture<DownloadableFormatsPageComponent>;
  let downloadServiceMock: { download: jest.Mock };
  let notificationServiceMock: { show: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    downloadServiceMock = { download: jest.fn().mockResolvedValue(undefined) };
    notificationServiceMock = { show: jest.fn() };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DownloadableFormatsPageComponent],
      providers: [
        provideNoopAnimations(),
        DownloadableFormatsFacadeService,
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: FileDownloadService, useValue: downloadServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DownloadableFormatsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe mostrar los 7 formatos de Trabajo de Investigación (TI) por defecto en la tabla real', () => {
    const tableEl = fixture.debugElement.query(By.directive(TableComponent));
    expect(tableEl).toBeTruthy();
    expect(tableEl.componentInstance.value).toEqual(DOWNLOADABLE_FORMATS_BY_CATEGORY['TI']);
    expect(tableEl.componentInstance.value).toHaveLength(7);
  });

  it('debe cambiar a los 8 formatos de Práctica Profesional (PP) al emitir tabChange desde el TabsComponent real', () => {
    const tabsInstance = fixture.debugElement.query(By.directive(TabsComponent)).componentInstance as TabsComponent;
    tabsInstance.tabChange.emit('PP');
    fixture.detectChanges();

    const tableEl = fixture.debugElement.query(By.directive(TableComponent));
    expect(tableEl.componentInstance.value).toEqual(DOWNLOADABLE_FORMATS_BY_CATEGORY['PP']);
    expect(tableEl.componentInstance.value).toHaveLength(8);
  });

  it('FLUJO DE DESCARGA: acción "descargar" en la tabla ➔ fachada real ➔ FileDownloadService con useBlob=true', async () => {
    const tableInstance = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as TableComponent;
    const targetFormat = DOWNLOADABLE_FORMATS_BY_CATEGORY['TI'][0]; // ti-a

    tableInstance.actionClick.emit({ action: 'descargar', row: targetFormat });
    await fixture.whenStable();

    // A. Notificación de "en curso" real — NO la falsa confirmación de
    // éxito que se eliminó cuando corregimos este facade: con
    // useBlob:false el sistema no podía garantizar que el archivo
    // realmente existiera, así que afirmar éxito sin evidencia era
    // engañoso.
    expect(notificationServiceMock.show).toHaveBeenCalledWith({
      title: 'Descarga en curso',
      message: 'Iniciando la descarga del TI-A. Revise su carpeta de descargas.',
      type: NotificationType.INFO
    });
    expect(notificationServiceMock.show).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: NotificationType.CONFIRMATION })
    );

    // B. El fix central del flujo: useBlob=true como tercer argumento —
    // permite detectar un 404 real de los 15 PDFs, a diferencia del modo
    // directo que usaba antes.
    expect(downloadServiceMock.download).toHaveBeenCalledWith(
      'assets/formatos/TI-A.pdf', 'TI-A.pdf', true
    );
  });

  it('debe ignorar cualquier acción de tabla que no sea "descargar"', async () => {
    const tableInstance = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as TableComponent;
    tableInstance.actionClick.emit({ action: 'ver', row: DOWNLOADABLE_FORMATS_BY_CATEGORY['TI'][0] });
    await fixture.whenStable();

    expect(downloadServiceMock.download).not.toHaveBeenCalled();
  });

  it('debe navegar a la ruta padre al llamar goBack()', () => {
    component.goBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['../'], { relativeTo: expect.anything() });
  });
});
