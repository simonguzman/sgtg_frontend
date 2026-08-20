import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { ConfirmationActionModalComponent } from './confirmation-action-modal.component';
import { ButtonComponent } from '../../button-component/button-component.component';

describe('ConfirmationActionModalComponent', () => {
  let component: ConfirmationActionModalComponent;
  let fixture: ComponentFixture<ConfirmationActionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationActionModalComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationActionModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización y Renderizado Básico', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería renderizar la descripción proporcionada en el modal', () => {
      component.description = '¿Está seguro de que desea eliminar este registro de forma permanente?';
      component.isOpen = true;
      fixture.detectChanges();

      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Estimad@ usuario');
      expect(textContent).toContain('¿Está seguro de que desea eliminar este registro de forma permanente?');
    });
  });

  describe('Interacciones y Emisión de Eventos (Outputs)', () => {
    it('debería emitir onClose al presionar el botón Cancelar en el DOM', () => {
      const cancelSpy = jest.spyOn(component.onClose, 'emit');
      component.isOpen = true;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.directive(ButtonComponent));
      const cancelButton = buttons.find(btn => btn.componentInstance.label === 'Cancelar');

      expect(cancelButton).toBeTruthy();
      cancelButton!.triggerEventHandler('onClick', null);

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('debería emitir confirm y onClose al presionar el botón Aceptar en el DOM', () => {
      const confirmSpy = jest.spyOn(component.confirm, 'emit');
      const closeSpy = jest.spyOn(component.onClose, 'emit');
      component.isOpen = true;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.directive(ButtonComponent));
      const confirmButton = buttons.find(btn => btn.componentInstance.label === 'Aceptar');

      expect(confirmButton).toBeTruthy();
      confirmButton!.triggerEventHandler('onClick', null);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('confirmAction() debería emitir el evento confirm e invocar el cierre del modal', () => {
      const confirmSpy = jest.spyOn(component.confirm, 'emit');
      const closeSpy = jest.spyOn(component.onClose, 'emit');

      component.confirmAction();

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('closeModal() debería emitir el evento onClose', () => {
      const closeSpy = jest.spyOn(component.onClose, 'emit');

      component.closeModal();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
