import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { SIDEBAR_MENU_ITEMS, SidebarMenuItem } from './models/sidebar-menu.model';

@Component({
  selector: 'app-sidebar',
  // ← CommonModule y MenuModule eliminados: el template usa @for nativo
  // (no *ngFor/*ngIf) y no contiene ningún componente de PrimeNG Menu
  // (p-menu) — ambos imports eran residuo muerto, probablemente copiado
  // desde HeaderComponent, que sí usa p-menu de verdad.
  imports: [RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  // ← El arreglo estático de 7 ítems sale del componente hacia el modelo
  // (mismo patrón que STAGE_OPTIONS, THESIS_TABS_CONFIG, NOTIFICATION_CONFIG
  // en turnos anteriores): la responsabilidad del componente es filtrar
  // por permisos y renderizar, no poseer la estructura de navegación.
  //
  // ← FIX: `!item.roles || ...` — antes "Bandeja de entrada" e "Historial"
  // enumeraban los 12 UserRoleType existentes a mano. Con `roles` opcional,
  // ambos quedan visibles para cualquier usuario autenticado sin depender
  // de mantener esa lista sincronizada si el enum crece en el futuro.
  protected readonly menuItems = computed<SidebarMenuItem[]>(() =>
    SIDEBAR_MENU_ITEMS.filter(item => !item.roles || this.authService.hasAnyRole(item.roles))
  );
}
