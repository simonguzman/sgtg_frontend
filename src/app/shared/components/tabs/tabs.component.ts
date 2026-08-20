import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface TabItem{
  label: string;
  value: string;
}

@Component({
  selector: 'app-tabs',
  imports: [CommonModule],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.css']
})
export class TabsComponent {
  @Input({ required: true }) tabs: TabItem[] = [];
  @Input({ required: true }) activeTab: string = '';
  @Output() tabChange = new EventEmitter<string>();

  selectTab(value: string){
    if(this.activeTab !== value){
      this.tabChange.emit(value);
    }
  }
}
