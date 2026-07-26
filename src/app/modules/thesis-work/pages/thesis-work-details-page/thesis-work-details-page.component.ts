import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { ThesisWorkDetailsFacadeService } from './services/thesis-work-details-facade.service';

@Component({
  selector: 'app-thesis-work-details-page',
  standalone: true,
  templateUrl: './thesis-work-details-page.component.html',
  styleUrls: ['./thesis-work-details-page.component.css'],
  imports: [ButtonComponent]
})
export class ThesisWorkDetailsPageComponent implements OnInit {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  public readonly facade = inject(ThesisWorkDetailsFacadeService);

  ngOnInit(): void {
    const thesisWorkId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!thesisWorkId) {
      this.facade.handleMissingId();
      return;
    }
    this.facade.loadThesisWorkDetails(thesisWorkId);
  }

  // Mantenemos la navegación relativa en el componente ya que depende estrictamente de su `ActivatedRoute`
  navigateTo(path: string): void {
    this.router.navigate([path], { relativeTo: this.route });
  }
}
