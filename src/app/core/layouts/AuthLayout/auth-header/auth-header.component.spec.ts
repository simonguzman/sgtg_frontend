import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthHeaderComponent } from './auth-header.component';

describe('AuthHeaderComponent', () => {
  let component: AuthHeaderComponent;
  let fixture: ComponentFixture<AuthHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Al no tener dependencias ni módulos, el setup es instantáneo
      imports: [AuthHeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Ejecutamos el renderizado del HTML estático
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Renderizado del DOM estático', () => {
    it('debería renderizar el logo de Unicauca con el src y alt correctos', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const imgElement = compiled.querySelector('img') as HTMLImageElement;

      expect(imgElement).toBeTruthy(); // Verifica que la etiqueta <img> existe
      expect(imgElement.getAttribute('src')).toBe('assets/images/logo-unicauca-azul.png');
      expect(imgElement.getAttribute('alt')).toBe('Logo Unicauca');
    });

    it('debería renderizar el separador visual (línea vertical)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      // Seleccionamos el div vacío que actúa como separador estilizado
      // Es el div directamente hijo del contenedor flex, al lado de la imagen
      const separator = compiled.querySelector('.flex > div') as HTMLElement;

      expect(separator).toBeTruthy();
      expect(separator.className).toContain('bg-[#143296]');
      expect(separator.className).toContain('mx-2');
    });

    it('debería renderizar el título H1 con el texto correcto', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const h1Element = compiled.querySelector('h1') as HTMLHeadingElement;

      expect(h1Element).toBeTruthy(); // Verifica que el H1 existe
      // Usamos textContent y trim() para limpiar cualquier salto de línea en el HTML
      expect(h1Element.textContent?.trim()).toBe('Sistema de gestión de trabajo de grado');
    });
  });
});
