import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfessorService } from '../shared/services/professor.service';
import { Professor } from '../shared/models/professor.model';
import { ProfessorDialogComponent } from './professor-dialog.component';

@Component({
  selector: 'app-professores',
  imports: [MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './professores.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfessoresComponent {
  columns = ['nome', 'email', 'titulacao', 'acoes'];
  professores = signal<Professor[]>([]);

  constructor(
    private service: ProfessorService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.carregar();
  }

  carregar() {
    this.service.listar().subscribe(data => this.professores.set(data));
  }

  abrir(professor?: Professor) {
    this.dialog.open(ProfessorDialogComponent, { width: '400px', data: professor ? { ...professor } : null })
      .afterClosed().subscribe(result => { if (result) this.carregar(); });
  }

  excluir(professor: Professor) {
    if (!confirm(`Excluir ${professor.nome}?`)) return;
    this.service.excluir(professor.id!).subscribe(() => {
      this.snack.open('Professor excluido', '', { duration: 2000 });
      this.carregar();
    });
  }
}
