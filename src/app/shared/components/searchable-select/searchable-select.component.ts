import { Component, ElementRef, HostListener, forwardRef, input, signal, computed, effect } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  templateUrl: './searchable-select.component.html'
})
export class SearchableSelectComponent implements ControlValueAccessor {
  options = input<SelectOption[]>([]);
  placeholder = input<string>('Seleccionar...');
  hasError = input<boolean>(false);
  isValid = input<boolean>(false);
  inputId = input<string>();
  isClearable = input<boolean>(false);

  isOpen = signal(false);
  value = signal<string>('');
  searchTerm = signal<string>('');
  isDisabled = signal<boolean>(false);

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  filteredOptions = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const selectedOption = this.options().find(o => o.id === this.value());

    if (selectedOption && term === selectedOption.label.toLowerCase()) {
      return this.options();
    }

    return this.options().filter(option => option.label.toLowerCase().includes(term));
  });

  constructor(private eRef: ElementRef) {
    effect(() => {
      this.options();
      this.restoreLabel();
    }, { allowSignalWrites: true });
  }

  @HostListener('document:click', ['$event'])
  clickOut(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  toggleDropdown() {
    if (this.isDisabled()) return;

    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      this.searchTerm.set('');
    } else {
      this.restoreLabel();
    }
  }

  closeDropdown() {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.restoreLabel();
      this.onTouched();
    }
  }

  onInput(event: Event) {
    const inputVal = (event.target as HTMLInputElement).value;
    this.searchTerm.set(inputVal);
    if (!this.isOpen()) {
      this.isOpen.set(true);
    }
  }

  selectOption(option: SelectOption) {
    this.value.set(option.id);
    this.searchTerm.set(option.label);
    this.isOpen.set(false);
    this.onChange(option.id);
    this.onTouched();
  }

  clearSelection(event: Event) {
    event.stopPropagation();
    if (this.isDisabled()) return;

    this.value.set('');
    this.searchTerm.set('');
    this.isOpen.set(false);
    this.onChange('');
    this.onTouched();
  }

  private restoreLabel() {
    const selected = this.options().find(option => option.id === this.value());
    this.searchTerm.set(selected ? selected.label : '');
  }

  writeValue(value: string | null): void {
    this.value.set(value || '');
    this.restoreLabel();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
