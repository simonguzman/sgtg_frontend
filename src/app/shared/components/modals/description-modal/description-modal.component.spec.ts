import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DescriptionModalComponent } from './description-modal.component';
describe('DescriptionModalComponent', () => {
  let component: DescriptionModalComponent;
  let fixture: ComponentFixture<DescriptionModalComponent>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [DescriptionModalComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(DescriptionModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Renderizado Básico', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar el título y la descripción correctamente cuando el modal está abierto', () => {
      fixture.componentRef.setInput('titleDescription', 'Título de Prueba');
      fixture.componentRef.setInput('description', 'Esta es una descripción detallada de prueba para validar el renderizado.');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const dialogElement = fixture.debugElement.query(By.css('p-dialog'));
      expect(dialogElement).toBeTruthy();
      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Título de Prueba');
      expect(textContent).toContain('Esta es una descripción detallada de prueba para validar el renderizado.');
    });
  });

  describe('Emisión de Eventos (Outputs)', () => {
    it('debería emitir onClose al cerrarse el p-dialog (evento onHide)', () => {
      const emitSpy = jest.spyOn(component.onClose, 'emit');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const dialog = fixture.debugElement.query(By.css('p-dialog'));
      dialog.triggerEventHandler('onHide', null);
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('debería emitir onClose al invocar el método closeModal() directamente', () => {
      const emitSpy = jest.spyOn(component.onClose, 'emit');
      component.closeModal();
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });
});
