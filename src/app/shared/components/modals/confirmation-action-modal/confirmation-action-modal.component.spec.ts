import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationActionModalComponent } from './confirmation-action-modal.component';
import { ButtonComponent } from '../../button-component/button-component.component';

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Output() onClick = new EventEmitter<void>();
}

describe('ConfirmationActionModalComponent', () => {
  let component: ConfirmationActionModalComponent;
  let fixture: ComponentFixture<ConfirmationActionModalComponent>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [ConfirmationActionModalComponent],
      providers: [provideNoopAnimations()]
    })
    .overrideComponent(ConfirmationActionModalComponent, {
      remove: {
        imports: [ButtonComponent]
      },
      add: {
        imports: [MockButtonComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmationActionModalComponent);
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

    it('debería renderizar la descripción proporcionada en el modal', () => {
      fixture.componentRef.setInput('description', '¿Está seguro de que desea eliminar este registro de forma permanente?');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const textContent = fixture.nativeElement.textContent;
      expect(textContent).toContain('Estimad@ usuario');
      expect(textContent).toContain('¿Está seguro de que desea eliminar este registro de forma permanente?');
    });
  });

  describe('Interacciones y Emisión de Eventos (Outputs)', () => {
    it('debería emitir onClose al presionar el botón Cancelar en el DOM', () => {
      const cancelSpy = jest.spyOn(component.onClose, 'emit');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      const cancelButtonElement = buttons.find(btn => btn.componentInstance.label === 'Cancelar');
      expect(cancelButtonElement).toBeTruthy();
      (cancelButtonElement!.componentInstance as MockButtonComponent).onClick.emit();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('debería emitir confirm y onClose al presionar el botón Aceptar en el DOM', () => {
      const confirmSpy = jest.spyOn(component.confirm, 'emit');
      const closeSpy = jest.spyOn(component.onClose, 'emit');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      const confirmButtonElement = buttons.find(btn => btn.componentInstance.label === 'Aceptar');
      expect(confirmButtonElement).toBeTruthy();
      (confirmButtonElement!.componentInstance as MockButtonComponent).onClick.emit();
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
