import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Component, EventEmitter, Input, Output, Pipe, PipeTransform, WritableSignal, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UserDetailsPageComponent } from './user-details-page.component';
import { UserDetailsFacadeService } from './services/user-details-facade.service';
import { DocumentTypePipe } from '../../pipes/document-type.pipe';
import { User } from '../../interfaces/user.interface';
import { IdentificationType } from '../../enum/identification-type.enum';
import { UserState } from '../../enum/user-state.enum';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { ContractType } from '../../enum/contract-type.enum';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

@Pipe({ name: 'documentType', standalone: true })
class MockDocumentTypePipe implements PipeTransform {
  transform(value: IdentificationType | string | undefined): string {
    return value ? `DOC_${value}` : '';
  }
}

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
  @Input() type!: string;
  @Output() onClick = new EventEmitter<void>();
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  idType: IdentificationType.CC,
  idNumber: 100200300,
  firstName: 'Ana',
  secondName: 'María',
  lastName: 'López',
  secondLastName: 'García',
  email: 'ana@test.com',
  roles: [UserRoleType.DOCENTE],
  password: 'secure',
  codeNumber: 5050,
  state: UserState.active,
  ...overrides
});

describe('Component: UserDetailsPageComponent', () => {
  let component: UserDetailsPageComponent;
  let fixture: ComponentFixture<UserDetailsPageComponent>;

  let mockFacade: {
    loadUser: jest.Mock<void, [string | null]>;
    goBack: jest.Mock<void, []>;
    isLoading: WritableSignal<boolean>;
    user: WritableSignal<User | undefined>;
    isMyProfile: WritableSignal<boolean>;
  };

  let mockActivatedRoute: {
    snapshot: {
      paramMap: {
        get: jest.Mock<string | null, [string]>;
      };
    };
  };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFacade = {
      loadUser: jest.fn(),
      goBack: jest.fn(),
      isLoading: signal(true),
      user: signal(undefined),
      isMyProfile: signal(false)
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jest.fn().mockReturnValue('123')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [UserDetailsPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .overrideComponent(UserDetailsPageComponent, {
      remove: {
        imports: [DocumentTypePipe, ButtonComponent],
        providers: [UserDetailsFacadeService]
      },
      add: {
        imports: [MockDocumentTypePipe, MockButtonComponent],
        providers: [{ provide: UserDetailsFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserDetailsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Inicialización (ngOnInit)', () => {
    it('debería obtener el ID de la ruta e invocar loadUser del facade', () => {
      fixture.detectChanges();
      expect(mockActivatedRoute.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(mockFacade.loadUser).toHaveBeenCalledWith('123');
    });

    it('debería manejar el caso cuando no hay ID en la ruta (Perfil Propio)', () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);
      fixture.detectChanges();
      expect(mockFacade.loadUser).toHaveBeenCalledWith(null);
    });
  });

  describe('Renderizado de la Vista (HTML)', () => {
    it('debería mostrar el mensaje de carga cuando isLoading es true', () => {
      mockFacade.isLoading.set(true);
      mockFacade.user.set(undefined);
      fixture.detectChanges();
      const loadingDiv = fixture.debugElement.query(By.css('.text-center'));
      expect(loadingDiv).toBeTruthy();
      expect(loadingDiv.nativeElement.textContent).toContain('Cargando información...');
    });

    it('debería ocultar el mensaje de carga y mostrar los datos cuando hay usuario', () => {
      mockFacade.isLoading.set(false);
      mockFacade.user.set(createMockUser());
      fixture.detectChanges();
      const loadingDiv = fixture.debugElement.query(By.css('.text-center'));
      const dataGrid = fixture.debugElement.query(By.css('.grid'));
      expect(loadingDiv).toBeFalsy();
      expect(dataGrid).toBeTruthy();
      const htmlContent = fixture.nativeElement.innerHTML;
      expect(htmlContent).toContain('Ana María');
      expect(htmlContent).toContain('López García');
      expect(htmlContent).toContain('100200300');
      expect(htmlContent).toContain('ana@test.com');
      expect(htmlContent).toContain('Docente');
      expect(htmlContent).toContain(`DOC_${IdentificationType.CC}`);
    });

    it('debería mostrar "Sin roles asignados" si el usuario no tiene roles', () => {
      mockFacade.isLoading.set(false);
      mockFacade.user.set(createMockUser({ roles: [] }));
      fixture.detectChanges();
      const htmlContent = fixture.nativeElement.innerHTML;
      expect(htmlContent).toContain('Sin roles asignados');
    });

    const mostrar = (user: User): string => {
      mockFacade.isLoading.set(false);
      mockFacade.user.set(user);
      fixture.detectChanges();
      return fixture.nativeElement.textContent;
    };

    it('muestra el estado del usuario', () => {
      expect(mostrar(createMockUser())).toContain(UserState.active);
      expect(mostrar(createMockUser({ state: UserState.inactive }))).toContain(UserState.inactive);
    });

    it('muestra el código tal como lo guarda el backend (ej. ADMIN) y, si no llegó, el numérico', () => {
      expect(mostrar(createMockUser({ codeNumber: 0, code: 'ADMIN' }))).toContain('ADMIN');
      expect(mostrar(createMockUser({ codeNumber: 5050, code: undefined }))).toContain('5050');
    });

    it('sin perfil académico no muestra la sección', () => {
      expect(mostrar(createMockUser({ roles: [UserRoleType.ADMINISTRADOR] }))).not.toContain('Perfil académico');
    });

    it('el docente muestra su vinculación y su departamento en el perfil académico', () => {
      const texto = mostrar(createMockUser({ contractType: ContractType.CATEDRA, department: { id: 1, name: 'Sistemas' } }));
      expect(texto).toContain('Perfil académico');
      expect(texto).toContain('Tipo de vinculación');
      expect(texto).toContain('Cátedra');
      expect(texto).toContain('Sistemas');
      expect(texto).not.toContain('Programa académico');
    });

    it('el estudiante muestra su programa académico', () => {
      const texto = mostrar(createMockUser({ roles: [UserRoleType.ESTUDIANTE], program: { id: 7, name: 'Ingeniería de Sistemas' } }));
      expect(texto).toContain('Programa académico');
      expect(texto).toContain('Ingeniería de Sistemas');
      expect(texto).not.toContain('Tipo de vinculación');
    });

    it('con varios roles la etiqueta va en plural', () => {
      expect(mostrar(createMockUser({ roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR] }))).toContain('Roles');
    });
  });

  describe('Interacción', () => {
    it('debería llamar a facade.goBack() al hacer clic en el botón nativo de regresar (Superior)', () => {
      fixture.detectChanges();
      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.triggerEventHandler('click', null);
      expect(mockFacade.goBack).toHaveBeenCalled();
    });

    it('debería llamar a facade.goBack() al emitir (onClick) del app-button-component (Inferior)', () => {
      mockFacade.isLoading.set(false);
      mockFacade.user.set(createMockUser());
      fixture.detectChanges();
      const appButton = fixture.debugElement.query(By.directive(MockButtonComponent));
      appButton.componentInstance.onClick.emit();
      expect(mockFacade.goBack).toHaveBeenCalled();
    });
  });
});
