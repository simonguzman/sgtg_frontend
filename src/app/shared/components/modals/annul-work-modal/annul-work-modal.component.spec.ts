import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnnulWorkModalComponent } from './annul-work-modal.component';

describe('AnnulWorkModalComponent', () => {
  let fixture: ComponentFixture<AnnulWorkModalComponent>;
  let component: AnnulWorkModalComponent;
  let confirmadas: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnnulWorkModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(AnnulWorkModalComponent);
    component = fixture.componentInstance;
    confirmadas = [];
    component.confirm.subscribe(justificacion => confirmadas.push(justificacion));
  });

  it('sin justificación no confirma y muestra el error', () => {
    component['updateJustification']('   ');
    component.confirmAction();
    expect(confirmadas).toEqual([]);
    expect(component['showError']()).toBe(true);
  });

  it('confirma con la justificación sin espacios sobrantes', () => {
    component['updateJustification']('  Cambio de modalidad ');
    component.confirmAction();
    expect(confirmadas).toEqual(['Cambio de modalidad']);
  });

  it('al cerrar limpia la justificación y avisa', () => {
    const cerrado = jest.fn();
    component.onClose.subscribe(cerrado);
    component['updateJustification']('Algo');
    component.closeModal();
    expect(component['justification']()).toBe('');
    expect(cerrado).toHaveBeenCalled();
  });
});
