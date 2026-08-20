import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { DownloadableFormatsPageComponent } from './downloadable-formats-page.component';
import { DownloadableFormatsFacadeService } from './services/downloadable-formats-facade.service';
import {
  DownloadableFormat,
  DOWNLOADABLE_FORMATS_BY_CATEGORY
} from './models/downloadable-formats-page.model';

describe('DownloadableFormatsPageComponent', () => {
  let component: DownloadableFormatsPageComponent;
  let fixture: ComponentFixture<DownloadableFormatsPageComponent>;

  // Tipado estricto de Mocks (Zero-Any)
  let mockRouter: { navigate: jest.Mock };
  let mockActivatedRoute: Record<string, never>; // Objeto vacío tipado
  let mockFacade: { downloadFormat: jest.Mock };

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn()
    };

    mockActivatedRoute = {};

    mockFacade = {
      downloadFormat: jest.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [DownloadableFormatsPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: DownloadableFormatsFacadeService, useValue: mockFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DownloadableFormatsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Gestión de Pestañas (Tabs) y Formatos', () => {
    it('Debe iniciar con la pestaña TI activa por defecto', () => {
      // Usamos notación de corchetes para acceder a propiedades protected en los tests
      expect(component['activeTab']()).toBe('TI');
    });

    it('Debe retornar los formatos de la categoría TI por defecto', () => {
      const formats = component['currentFormats']();
      expect(formats).toEqual(DOWNLOADABLE_FORMATS_BY_CATEGORY['TI']);
      expect(formats.length).toBeGreaterThan(0);
    });

    it('Debe actualizar los formatos al cambiar la pestaña activa a PP', () => {
      component['activeTab'].set('PP');
      fixture.detectChanges(); // Forzamos la actualización reactiva

      const formats = component['currentFormats']();
      expect(formats).toEqual(DOWNLOADABLE_FORMATS_BY_CATEGORY['PP']);
    });

    it('Debe retornar un arreglo vacío si la pestaña (categoría) no existe', () => {
      component['activeTab'].set('INVALID_TAB');

      const formats = component['currentFormats']();
      expect(formats).toEqual([]);
    });
  });

  describe('Acciones de la Tabla', () => {
    it('Debe delegar la acción "descargar" al Facade pasándole la fila completa', () => {
      const mockRow: DownloadableFormat = {
        id: 'ti-01',
        title: 'Formato de Prueba',
        url: '/ruta.pdf'
      };

      component.handleTableAction({ action: 'descargar', row: mockRow });

      expect(mockFacade.downloadFormat).toHaveBeenCalledWith(mockRow);
    });

    it('No debe hacer nada (retorno temprano) si la acción NO es "descargar"', () => {
      const mockRow: DownloadableFormat = {
        id: 'ti-01',
        title: 'Formato de Prueba',
        url: '/ruta.pdf'
      };

      component.handleTableAction({ action: 'ver_detalles', row: mockRow });

      expect(mockFacade.downloadFormat).not.toHaveBeenCalled();
    });
  });

  describe('Navegación', () => {
    it('Debe navegar hacia la ruta padre relativa al usar goBack()', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['../'],
        { relativeTo: mockActivatedRoute }
      );
    });
  });
});
