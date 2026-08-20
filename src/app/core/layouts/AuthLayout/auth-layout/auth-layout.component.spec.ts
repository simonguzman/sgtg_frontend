import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthLayoutComponent } from './auth-layout.component';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

// Importamos los componentes reales para poder removerlos del standalone
import { AuthHeaderComponent } from '../auth-header/auth-header.component';
import { AuthFooterComponent } from '../auth-footer/auth-footer.component';

// 1. Creamos versiones "Mock" (falsas y ligeras) de los componentes hijos
@Component({ selector: 'app-auth-header', template: '' })
class MockAuthHeaderComponent {}

@Component({ selector: 'app-auth-footer', template: '' })
class MockAuthFooterComponent {}

describe('AuthLayoutComponent', () => {
  let component: AuthLayoutComponent;
  let fixture: ComponentFixture<AuthLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        // Proveemos un router vacío para que <router-outlet> no falle
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

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Renderizado Estructural (DOM)', () => {
    it('debería incluir el Header, el RouterOutlet y el Footer', () => {
      const compiled = fixture.nativeElement as HTMLElement;

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
      const compiled = fixture.nativeElement as HTMLElement;

      // Buscamos la imagen específicamente dentro del div con clase "absolute" que está en el fondo
      const backgroundDiv = compiled.querySelector('div.absolute.right-0') as HTMLElement;
      expect(backgroundDiv).toBeTruthy();

      const imageElement = backgroundDiv.querySelector('img') as HTMLImageElement;

      expect(imageElement).toBeTruthy();
      expect(imageElement.getAttribute('src')).toBe('assets/images/estudiantes-unicauca.png');
      expect(imageElement.getAttribute('alt')).toBe('Estudiantes Unicauca');
    });

    it('debería colocar el router-outlet dentro de una sección para la mitad izquierda de la pantalla', () => {
      // Usamos By.css para buscar elementos de Angular
      const routerOutletDebug = fixture.debugElement.query(By.css('router-outlet'));

      // Navegamos hacia arriba en el DOM para verificar que el outlet está contenido
      // en la sección que ocupa el espacio del formulario
      const containerSection = routerOutletDebug.parent?.parent?.nativeElement as HTMLElement;

      // Verificamos que contenga las clases que controlan su tamaño y posición en la pantalla
      expect(containerSection.tagName.toLowerCase()).toBe('section');
      expect(containerSection.className).toContain('w-full');
      expect(containerSection.className).toContain('md:w-1/2');
    });
  });
});
