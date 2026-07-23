import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Component, Input } from '@angular/core';
import { LoginComponent } from './login.component';
import { LoginFacadeService } from './services/login-facade.service';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

@Component({
  selector: 'app-button-component',
  standalone: true,
  template: '<button>{{ label }}</button>'
})
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
  @Input() type!: string;
  @Input() disabled!: boolean;
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  // ── Tipado estricto del Facade ─────────────────────────────────────────────
  let facadeMock: {
    checkAlreadyAuthenticated: jest.Mock<void, []>;
    login: jest.Mock<void, [{ email: string; password: string }, () => void, () => void]>;
  };

  beforeEach(async () => {
    // Inicializamos con jest.fn()
    facadeMock = {
      checkAlreadyAuthenticated: jest.fn(),
      login: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: LoginFacadeService, useValue: facadeMock }
      ]
    })
    .overrideComponent(LoginComponent, {
      remove: { imports: [ButtonComponent] },
      add: { imports: [MockButtonComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe verificar si ya está autenticado al iniciar (ngOnInit)', () => {
    expect(facadeMock.checkAlreadyAuthenticated).toHaveBeenCalled();
  });

  describe('Formulario de Login', () => {
    it('debe inicializar el formulario como inválido', () => {
      expect(component.loginForm.valid).toBeFalsy();
    });

    it('debe validar que el correo sea requerido y tenga formato email', () => {
      // El operador ! es seguro aquí porque creamos el form con nonNullable
      const emailControl = component.loginForm.get('email')!;

      emailControl.setValue('');
      expect(emailControl.hasError('required')).toBeTruthy();

      emailControl.setValue('correo-invalido');
      expect(emailControl.hasError('email')).toBeTruthy();

      emailControl.setValue('test@unicauca.edu.co');
      expect(emailControl.valid).toBeTruthy();
    });

    it('debe validar que la contraseña sea requerida y tenga mínimo 6 caracteres', () => {
      const passwordControl = component.loginForm.get('password')!;

      passwordControl.setValue('');
      expect(passwordControl.hasError('required')).toBeTruthy();

      passwordControl.setValue('12345');
      expect(passwordControl.hasError('minlength')).toBeTruthy();

      passwordControl.setValue('123456');
      expect(passwordControl.valid).toBeTruthy();
    });
  });

  describe('onSubmit()', () => {
    it('debe marcar todos los campos como "touched" si el formulario es inválido y NO llamar al facade', () => {
      jest.spyOn(component.loginForm, 'markAllAsTouched');

      component.onSubmit();

      expect(component.loginForm.markAllAsTouched).toHaveBeenCalled();
      expect(facadeMock.login).not.toHaveBeenCalled();
    });

    it('debe llamar a facade.login si el formulario es válido', () => {
      component.loginForm.setValue({
        email: 'test@unicauca.edu.co',
        password: 'password123'
      });

      component.onSubmit();

      expect(facadeMock.login).toHaveBeenCalled();

      // Gracias al tipado, calledArgs ya no es "any", tiene la estructura exacta de los argumentos
      const calledArgs = facadeMock.login.mock.calls[0];
      expect(calledArgs[0]).toEqual({
        email: 'test@unicauca.edu.co',
        password: 'password123'
      });
    });

    it('debe actualizar el signal isLoading a través de los callbacks onStart y onComplete', () => {
      component.loginForm.setValue({
        email: 'test@unicauca.edu.co',
        password: 'password123'
      });

      component.onSubmit();

      // Extracción limpia, TypeScript sabe que onStart y onComplete son () => void
      const [, onStart, onComplete] = facadeMock.login.mock.calls[0];

      expect(component.isLoading()).toBeFalsy();

      onStart();
      expect(component.isLoading()).toBeTruthy();

      onComplete();
      expect(component.isLoading()).toBeFalsy();
    });
  });
});
