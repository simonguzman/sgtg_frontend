import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { SIDEBAR_MENU_ITEMS, SidebarMenuItem } from './models/sidebar-menu.model';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  protected readonly menuItems = computed<SidebarMenuItem[]>(() =>
    SIDEBAR_MENU_ITEMS.filter(item => !item.roles || this.authService.hasAnyRole(item.roles))
  );
}
