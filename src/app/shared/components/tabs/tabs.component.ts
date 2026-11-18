import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Pestaña: texto y valor que la identifica. */
export interface TabItem{
  label: string;
  value: string;
}

/** Barra de pestañas; emite el valor de la pestaña elegida. */
@Component({
  selector: 'app-tabs',
  imports: [CommonModule],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.css']
})
export class TabsComponent {
  @Input({ required: true }) tabs: TabItem[] = [];
  @Input({ required: true }) activeTab = '';
  @Output() tabChange = new EventEmitter<string>();

  selectTab(value: string){
    if(this.activeTab !== value){
      this.tabChange.emit(value);
    }
  }
}
