import { Component, inject, OnInit } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from "@angular/router";
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { filter, map } from 'rxjs/operators';
import { BreadcrumbComponent } from '../../../components/breadcrumb-temp/breadcrumb-temp.component';
import { BreadcrumbService } from '../../../services/breadcrumb/breadcrumb.service';

@Component({
  selector: 'app-main-layout',
  imports: [FooterComponent, RouterModule, HeaderComponent, SidebarComponent, BreadcrumbComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit {

  currentPageTitle: string = '';
  currentPageBreadcrumb: string = '';
  private readonly breadcrumbService = inject(BreadcrumbService);

  constructor(private readonly router: Router, private readonly activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute;
          while(route.firstChild) route = route.firstChild;
          return route.snapshot.title ?? 'Inicio';
        })
      )
      .subscribe((routeTitle) => {
        this.currentPageTitle = routeTitle;
      });

    this.breadcrumbService.dynamicTitle$.subscribe(dynamicTitle => {
      if (dynamicTitle) {
        this.currentPageTitle = dynamicTitle;
      }
    });
  }
}
