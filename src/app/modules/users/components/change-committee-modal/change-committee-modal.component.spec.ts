import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ChangeCommitteeModalComponent } from './change-committee-modal.component';
import { UsersFacadeService } from '../../pages/users-page/services/users-facade.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { CatalogItem } from '../../interfaces/catalog-item.interface';
import { User } from '../../interfaces/user.interface';

const SISTEMAS: CatalogItem = { id: 1, name: 'Departamento de Sistemas' };
const TELEMATICA: CatalogItem = { id: 2, name: 'Departamento de Telemática' };
const usuario = (id: string, firstName: string): User => ({ id, firstName, lastName: 'Mora' } as User);

describe('ChangeCommitteeModalComponent', () => {
  let fixture: ComponentFixture<ChangeCommitteeModalComponent>;
  let component: ChangeCommitteeModalComponent;
  let facade: {
    committeeDepartments: ReturnType<typeof signal<CatalogItem[]>>;
    committeeOf: jest.Mock;
    committeeCandidates: jest.Mock;
    changeCommittee: jest.Mock;
  };
  let sesion: { id: string; roles: UserRoleType[] };

  const abrir = () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  };
  const texto = () => (document.querySelector('.p-dialog') as HTMLElement).textContent ?? '';

  beforeEach(() => {
    facade = {
      committeeDepartments: signal([SISTEMAS]),
      committeeOf: jest.fn((id: number | null) => id === 1 ? usuario('99', 'Carlos') : undefined),
      committeeCandidates: jest.fn((id: number | null) => id === 1 ? [usuario('5', 'Ana')] : []),
      changeCommittee: jest.fn()
    };
    sesion = { id: '99', roles: [UserRoleType.COMITE, UserRoleType.DOCENTE] };
    TestBed.configureTestingModule({
      imports: [ChangeCommitteeModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: UsersFacadeService, useValue: facade },
        { provide: AuthService, useValue: {
          currentUser: () => sesion,
          hasAnyRole: (roles: UserRoleType[]) => roles.some(rol => sesion.roles.includes(rol))
        } }
      ]
    });
    fixture = TestBed.createComponent(ChangeCommitteeModalComponent);
    component = fixture.componentInstance;
  });

  it('el Comité cede el suyo: su departamento queda fijo y se le advierte que se cerrará su sesión', () => {
    abrir();

    expect(texto()).toContain('Ceder el rol de Comité');
    expect(texto()).toContain('Departamento de Sistemas');
    expect(texto()).toContain('Comité actual: Carlos Mora');
    expect(texto()).toContain('se cerrará tu sesión');
    expect(component.candidateOptions()).toEqual([{ id: '5', label: 'Ana Mora' }]);
  });

  it('el docente se busca escribiendo su nombre y al elegirlo queda como candidato', () => {
    facade.committeeCandidates.mockImplementation(() => [usuario('5', 'Ana'), usuario('6', 'Bruno'), usuario('7', 'Camila')]);
    abrir();
    const buscador = document.querySelector('#committeeCandidate') as HTMLInputElement;
    buscador.click();
    buscador.value = 'bru';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const opciones = Array.from(document.querySelectorAll('app-searchable-select li')) as HTMLElement[];
    expect(opciones.map(o => o.textContent?.trim())).toEqual(['Bruno Mora']);
    opciones[0].click();
    fixture.detectChanges();
    expect(component.candidateId()).toBe('6');
  });

  it('no deja confirmar sin elegir docente y luego cambia el Comité al elegido', () => {
    abrir();
    component.confirm();
    expect(facade.changeCommittee).not.toHaveBeenCalled();

    component.selectCandidate('5');
    component.confirm();
    component.confirm();

    expect(facade.changeCommittee).toHaveBeenCalledTimes(1);
    expect(facade.changeCommittee).toHaveBeenCalledWith('5', expect.any(Function), expect.any(Function));
  });

  it('el Consejo elige primero el departamento', () => {
    sesion = { id: '70', roles: [UserRoleType.CONSEJO] };
    facade.committeeDepartments.set([SISTEMAS, TELEMATICA]);
    abrir();

    expect(texto()).toContain('Cambiar el Comité de programa');
    expect(component.departmentId()).toBeNull();
    component.selectDepartment('2');
    fixture.detectChanges();
    expect(texto()).toContain('Comité actual: sin Comité');
    expect(texto()).toContain('No hay otros docentes activos en este departamento.');
    expect(texto()).not.toContain('se cerrará tu sesión');
  });
});
