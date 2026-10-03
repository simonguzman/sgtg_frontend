import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuthLayoutComponent } from './auth-layout.component';
import { AuthHeaderComponent } from '../auth-header/auth-header.component';
import { AuthFooterComponent } from '../auth-footer/auth-footer.component';

@Component({ selector: 'app-auth-header', template: '', standalone: true })
class MockAuthHeaderComponent {}

@Component({ selector: 'app-auth-footer', template: '', standalone: true })
class MockAuthFooterComponent {}

describe('AuthLayoutComponent', () => {
  let component: AuthLayoutComponent;
  let fixture: ComponentFixture<AuthLayoutComponent>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        provideRouter([])
      ]
    })
    .overrideComponent(AuthLayoutComponent, {
      remove: { imports: [AuthHeaderComponent, AuthFooterComponent] },
      add: { imports: [MockAuthHeaderComponent, MockAuthFooterComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Renderizado Estructural (DOM)', () => {
    it('debería incluir el Header, el RouterOutlet y el Footer', () => {
      const compiled = fixture.nativeElement;
      const headerElement = compiled.querySelector('app-auth-header');
      const footerElement = compiled.querySelector('app-auth-footer');
      const routerOutletElement = compiled.querySelector('router-outlet');
      const mainElement = compiled.querySelector('main');
      expect(headerElement).toBeTruthy();
      expect(footerElement).toBeTruthy();
      expect(routerOutletElement).toBeTruthy();
      expect(mainElement).toBeTruthy();
    });

    it('debería renderizar la imagen de fondo de los estudiantes con los atributos correctos', () => {
      const compiled = fixture.nativeElement;
      const backgroundDiv = compiled.querySelector('div.absolute.right-0');
      expect(backgroundDiv).toBeTruthy();
      const imageElement = backgroundDiv?.querySelector('img');
      expect(imageElement).toBeTruthy();
      expect(imageElement?.getAttribute('src')).toBe('assets/images/estudiantes-unicauca.png');
      expect(imageElement?.getAttribute('alt')).toBe('Estudiantes Unicauca');
    });

    it('debería colocar el router-outlet dentro de una sección para la mitad izquierda de la pantalla', () => {
      const routerOutletDebug = fixture.debugElement.query(By.css('router-outlet'));
      const containerSection = routerOutletDebug.parent?.parent?.nativeElement;
      expect(containerSection?.tagName?.toLowerCase()).toBe('section');
      expect(containerSection?.className).toContain('w-full');
      expect(containerSection?.className).toContain('md:w-1/2');
    });
  });
});
