import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AuthLayoutComponent } from './auth-layout.component';
// Importamos los componentes reales para poder removerlos del standalone
import { AuthHeaderComponent } from '../auth-header/auth-header.component';
import { AuthFooterComponent } from '../auth-footer/auth-footer.component';

// 1. Creamos versiones "Mock" (falsas y ligeras) de los componentes hijos.
// 🔥 CORRECCIÓN: Al mockear componentes standalone, el mock TAMBIÉN debe ser standalone.
@Component({ selector: 'app-auth-header', template: '', standalone: true })
class MockAuthHeaderComponent {}

@Component({ selector: 'app-auth-footer', template: '', standalone: true })
class MockAuthFooterComponent {}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('AuthLayoutComponent', () => {
  let component: AuthLayoutComponent;
  let fixture: ComponentFixture<AuthLayoutComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        // Proveemos un router vacío para que <router-outlet> no falle al inicializarse
        provideRouter([])
      ]
    })
    // 2. Sobrescribimos el componente para usar los Mocks en lugar de los reales
    .overrideComponent(AuthLayoutComponent, {
      remove: { imports: [AuthHeaderComponent, AuthFooterComponent] },
      add: { imports: [MockAuthHeaderComponent, MockAuthFooterComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Ejecuta el renderizado inicial
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Renderizado Estructural (DOM)', () => {
    it('debería incluir el Header, el RouterOutlet y el Footer', () => {
      const compiled = fixture.nativeElement;

      // Verificamos la presencia de las etiquetas semánticas y de los componentes
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

      // Buscamos la imagen específicamente dentro del div con clase "absolute" que está en el fondo
      const backgroundDiv = compiled.querySelector('div.absolute.right-0');
      expect(backgroundDiv).toBeTruthy();

      // Eliminamos el casteo inseguro as HTMLImageElement apoyándonos en TypeScript
      const imageElement = backgroundDiv?.querySelector('img');

      expect(imageElement).toBeTruthy();
      expect(imageElement?.getAttribute('src')).toBe('assets/images/estudiantes-unicauca.png');
      expect(imageElement?.getAttribute('alt')).toBe('Estudiantes Unicauca');
    });

    it('debería colocar el router-outlet dentro de una sección para la mitad izquierda de la pantalla', () => {
      // Usamos By.css para buscar elementos de Angular en el DebugElement
      const routerOutletDebug = fixture.debugElement.query(By.css('router-outlet'));

      // Navegamos hacia arriba en el DOM para verificar que el outlet está contenido
      // en la sección que ocupa el espacio del formulario
      const containerSection = routerOutletDebug.parent?.parent?.nativeElement;

      // Usamos encadenamiento opcional en lugar de as HTMLElement
      expect(containerSection?.tagName?.toLowerCase()).toBe('section');
      expect(containerSection?.className).toContain('w-full');
      expect(containerSection?.className).toContain('md:w-1/2');
    });
  });
});
