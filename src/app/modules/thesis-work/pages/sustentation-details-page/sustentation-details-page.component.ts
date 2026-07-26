import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { DatePipe, LowerCasePipe } from '@angular/common';
import { SustentationDetailsFacadeService } from './services/sustentation-details-facade.service';

@Component({
  selector: 'app-sustentation-details-page',
  standalone: true,
  templateUrl: './sustentation-details-page.component.html',
  styleUrls: ['./sustentation-details-page.component.css'],
  imports: [ButtonComponent, DatePipe, LowerCasePipe]
})
export class SustentationDetailsPageComponent implements OnInit {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  public readonly facade = inject(SustentationDetailsFacadeService);

  ngOnInit(): void {
    const sustentationId = this.route.snapshot.paramMap.get('sustentationId');
    const thesisWorkId = this.extractThesisIdFromRoute();

    if (!thesisWorkId || !sustentationId) {
      this.facade.showError('Error', 'Identificadores inválidos.');
      this.goBack();
      return;
    }

    this.facade.loadDetails(thesisWorkId, sustentationId);
  }

  private extractThesisIdFromRoute(): string | null {
    let currentSnapshot: import('@angular/router').ActivatedRouteSnapshot | null = this.route.snapshot;
    while (currentSnapshot) {
      if (currentSnapshot.paramMap.has('id')) {
        return currentSnapshot.paramMap.get('id');
      }
      currentSnapshot = currentSnapshot.parent;
    }
    return null;
  }

  navigateToCorrectedDocuments(): void {
    this.router.navigate(['../../corrected_documents'], { relativeTo: this.route });
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
