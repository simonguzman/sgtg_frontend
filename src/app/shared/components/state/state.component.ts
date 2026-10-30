import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { stateList } from '../../../core/enums/state.enum';

@Component({
  selector: 'app-state',
  imports: [NgClass],
  templateUrl: './state.component.html',
  styleUrls: ['./state.component.css']
})
export class StateComponent {

  protected stateList = stateList

  @Input() label?: string;
  @Input() state?: stateList;

  private readonly STATE_MAP: Record<stateList, string> = {
    [stateList.APROBADO]: 'state-aprobado',
    [stateList.APROBADO_CON_OBSERVACIONES]: 'state-aprobado-observaciones',
    [stateList.NO_APROBADO]: 'state-no-aprobado',
    [stateList.EN_REVISION]: 'state-revision',
    [stateList.EVALUADO]: 'state-evaluado',
    [stateList.EN_DESARROLLO]: 'state-desarrollo',
    [stateList.APLAZADO]: 'state-aplazado',
    [stateList.CANCELADO]: 'state-cancelado',
    [stateList.SUSPENDIDO]: 'state-suspendido',
    [stateList.PERTINENTE]: 'state-aprobado',
    [stateList.NO_PERTINENTE]: 'state-no-aprobado',
    [stateList.PENDIENTE]: 'state-revision',
    [stateList.AGENDADA]: 'state-desarrollo',
    [stateList.REALIZADA]: 'state-aprobado',
    [stateList.VENCIDA]: 'state-no-aprobado',
    [stateList.EN_SUSPENSION]: 'state-suspendido'
  }

  getState(): string {
    return this.state ? (this.STATE_MAP[this.state] || '') : '';
  }
}

