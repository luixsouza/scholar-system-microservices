import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DisciplinaService } from '../shared/services/disciplina.service';
import { Disciplina } from '../shared/models/disciplina.model';
import { DisciplinaDialogComponent } from './disciplina-dialog.component';

@Component({
  selector: 'app-disciplinas',
  imports: [MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './disciplinas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DisciplinasComponent {
  columns = ['nome', 'cargaHoraria', 'acoes'];
  disciplinas = signal<Disciplina[]>([]);

  constructor(
    private service: DisciplinaService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.carregar();
  }

  carregar() {
    this.service.listar().subscribe(data => this.disciplinas.set(data));
  }

  abrir(disciplina?: Disciplina) {
    this.dialog.open(DisciplinaDialogComponent, { width: '400px', data: disciplina ? { ...disciplina } : null })
      .afterClosed().subscribe(result => { if (result) this.carregar(); });
  }

  excluir(disciplina: Disciplina) {
    if (!confirm(`Excluir ${disciplina.nome}?`)) return;
    this.service.excluir(disciplina.id!).subscribe(() => {
      this.snack.open('Disciplina excluida', '', { duration: 2000 });
      this.carregar();
    });
  }
}
