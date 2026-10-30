import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '../../button-component/button-component.component';
import { CatalogItem } from '../../../../modules/users/interfaces/catalog-item.interface';

/**
 * Selección de un elemento de un catálogo del backend (departamento o
 * programa académico), con la opción de agregar uno nuevo. La selección se
 * confirma con "Guardar"; un elemento agregado queda seleccionado.
 *
 * El componente padre crea el elemento (`onCreate`) y actualiza `items`.
 *
 * Si el elemento nuevo depende de otro catálogo (ej. el programa se adscribe a
 * un departamento), `parentName` y `parentItems` muestran ese selector y el
 * elemento elegido llega al padre por `[(parentId)]`: sin él no se agrega.
 */
@Component({
  selector: 'app-catalog-selection-modal',
  imports: [DialogModule, ButtonComponent],
  templateUrl: './catalog-selection-modal.component.html',
  styleUrls: ['./catalog-selection-modal.component.css']
})
export class CatalogSelectionModalComponent implements OnChanges {

  @Input() isOpen = false;
  /** Título del modal, ej. "Seleccionar departamento" */
  @Input() title = '';
  /** Nombre del elemento en singular, ej. "departamento" */
  @Input() itemName = '';
  @Input() items: CatalogItem[] = [];
  @Input() selectedId: number | null = null;
  /** true mientras el padre crea un elemento */
  @Input() isCreating = false;
  /** Catálogo del que depende un elemento nuevo, en singular (ej. "departamento"); vacío si no depende de otro */
  @Input() parentName = '';
  /** Opciones de ese catálogo */
  @Input() parentItems: CatalogItem[] = [];
  /** Elemento elegido de ese catálogo para el nuevo (`[(parentId)]`) */
  @Input() parentId: number | null = null;
  /** false si quien edita no puede crear elementos del catálogo (solo el administrador los crea) */
  @Input() allowCreate = true;

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() parentIdChange = new EventEmitter<number | null>();
  @Output() onSaved = new EventEmitter<number>();
  @Output() onCreate = new EventEmitter<string>();

  draftId: number | null = null;
  newItemName = '';
  /** Nombre enviado a crear: cuando aparece en `items`, se selecciona */
  private pendingName: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.draftId = this.selectedId;
      this.newItemName = '';
      this.pendingName = null;
    }
    if (changes['items'] && this.pendingName) {
      const created = this.items.find(item => sameName(item.name, this.pendingName!));
      if (created) {
        this.draftId = created.id;
        this.newItemName = '';
        this.pendingName = null;
      }
    }
  }

  select(item: CatalogItem): void {
    this.draftId = item.id;
  }

  updateNewItemName(value: string): void {
    this.newItemName = value;
  }

  /** ¿Falta elegir el elemento del que depende el nuevo? */
  get missingParent(): boolean {
    return !!this.parentName && this.parentId === null;
  }

  selectParent(value: string): void {
    this.parentId = value ? Number(value) : null;
    this.parentIdChange.emit(this.parentId);
  }

  /** Pide crear el elemento escrito; si ya existe, solo lo selecciona. */
  create(): void {
    const name = this.newItemName.trim();
    if (!name || this.isCreating) return;
    const existing = this.items.find(item => sameName(item.name, name));
    if (existing) {
      this.draftId = existing.id;
      this.newItemName = '';
      return;
    }
    if (this.missingParent) return;
    this.pendingName = name;
    this.onCreate.emit(name);
  }

  save(): void {
    if (this.draftId === null) return;
    this.onSaved.emit(this.draftId);
    this.isOpenChange.emit(false);
  }

  close(): void {
    this.isOpenChange.emit(false);
  }
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');
}
