import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CatalogSelectionModalComponent } from './catalog-selection-modal.component';
import { ButtonComponent } from '../../button-component/button-component.component';
import { CatalogItem } from '../../../../modules/users/interfaces/catalog-item.interface';

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}

const SISTEMAS: CatalogItem = { id: 1, name: 'Sistemas' };
const TELEMATICA: CatalogItem = { id: 2, name: 'Telemática' };

describe('CatalogSelectionModalComponent', () => {
  let component: CatalogSelectionModalComponent;
  let fixture: ComponentFixture<CatalogSelectionModalComponent>;

  const abrir = (items: CatalogItem[], selectedId: number | null) => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('selectedId', selectedId);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogSelectionModalComponent],
      providers: [provideNoopAnimations()]
    })
      .overrideComponent(CatalogSelectionModalComponent, {
        remove: { imports: [ButtonComponent] },
        add: { imports: [MockButtonComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(CatalogSelectionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Seleccionar departamento');
    fixture.componentRef.setInput('itemName', 'departamento');
    fixture.detectChanges();
  });

  it('al abrir parte de la selección actual y con el campo de nuevo elemento vacío', () => {
    component.newItemName = 'texto anterior';
    abrir([SISTEMAS, TELEMATICA], 2);
    expect(component.draftId).toBe(2);
    expect(component.newItemName).toBe('');
  });

  it('lista los elementos y marca el seleccionado', () => {
    abrir([SISTEMAS, TELEMATICA], 1);
    const texto = document.body.textContent ?? '';
    expect(texto).toContain('Seleccionar departamento');
    expect(texto).toContain('Sistemas');
    expect(texto).toContain('Telemática');
  });

  it('sin elementos invita a agregar uno', () => {
    abrir([], null);
    expect(document.body.textContent).toContain('No hay departamentos registrados');
  });

  it('guarda la selección y cierra; sin selección no guarda', () => {
    const saved = jest.spyOn(component.onSaved, 'emit');
    const openChange = jest.spyOn(component.isOpenChange, 'emit');
    abrir([SISTEMAS, TELEMATICA], null);

    component.save();
    expect(saved).not.toHaveBeenCalled();

    component.select(TELEMATICA);
    component.save();
    expect(saved).toHaveBeenCalledWith(2);
    expect(openChange).toHaveBeenCalledWith(false);
  });

  it('salir cierra sin guardar', () => {
    const saved = jest.spyOn(component.onSaved, 'emit');
    const openChange = jest.spyOn(component.isOpenChange, 'emit');
    abrir([SISTEMAS], 1);
    component.select(SISTEMAS);
    component.close();
    expect(saved).not.toHaveBeenCalled();
    expect(openChange).toHaveBeenCalledWith(false);
  });

  describe('Agregar', () => {
    it('no pide crear un nombre vacío ni mientras otro se está creando', () => {
      const create = jest.spyOn(component.onCreate, 'emit');
      abrir([SISTEMAS], null);
      component.updateNewItemName('   ');
      component.create();
      component.updateNewItemName('Electrónica');
      fixture.componentRef.setInput('isCreating', true);
      fixture.detectChanges();
      component.create();
      expect(create).not.toHaveBeenCalled();
    });

    it('si el nombre ya existe lo selecciona sin crearlo', () => {
      const create = jest.spyOn(component.onCreate, 'emit');
      abrir([SISTEMAS, TELEMATICA], 1);
      component.updateNewItemName('  telemática ');
      component.create();
      expect(create).not.toHaveBeenCalled();
      expect(component.draftId).toBe(2);
      expect(component.newItemName).toBe('');
    });

    it('pide crear el nombre y, cuando aparece en la lista, lo deja seleccionado', () => {
      const create = jest.spyOn(component.onCreate, 'emit');
      abrir([SISTEMAS], 1);
      component.updateNewItemName('  Telemática ');
      component.create();
      expect(create).toHaveBeenCalledWith('Telemática');
      expect(component.draftId).toBe(1);

      fixture.componentRef.setInput('items', [SISTEMAS, TELEMATICA]);
      fixture.detectChanges();
      expect(component.draftId).toBe(2);
      expect(component.newItemName).toBe('');
    });

    it('si el elemento depende de otro catálogo, exige elegirlo antes de crear', () => {
      const create = jest.spyOn(component.onCreate, 'emit');
      const parentChange = jest.spyOn(component.parentIdChange, 'emit');
      fixture.componentRef.setInput('parentName', 'departamento');
      fixture.componentRef.setInput('parentItems', [SISTEMAS]);
      abrir([], null);
      expect(fixture.nativeElement.querySelector('#newCatalogItemParent')).not.toBeNull();

      component.updateNewItemName('Ingeniería de Sistemas');
      component.create();
      expect(create).not.toHaveBeenCalled();

      component.selectParent('1');
      expect(parentChange).toHaveBeenCalledWith(1);
      component.create();
      expect(create).toHaveBeenCalledWith('Ingeniería de Sistemas');
    });

    it('muestra el dato complementario de cada elemento', () => {
      abrir([{ id: 7, name: 'Ingeniería de Sistemas', detail: 'Departamento de Sistemas' }], null);
      expect(fixture.nativeElement.textContent).toContain('Departamento de Sistemas');
    });
  });
});
