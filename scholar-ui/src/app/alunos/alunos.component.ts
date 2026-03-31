import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlunoService } from '../shared/services/aluno.service';
import { Aluno } from '../shared/models/aluno.model';
import { AlunoDialogComponent } from './aluno-dialog.component';

@Component({
  selector: 'app-alunos',
  imports: [MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './alunos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlunosComponent {
  columns = ['nome', 'email', 'matricula', 'acoes'];
  alunos = signal<Aluno[]>([]);

  constructor(
    private service: AlunoService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.carregar();
  }

  carregar() {
    this.service.listar().subscribe(data => this.alunos.set(data));
  }

  abrir(aluno?: Aluno) {
    this.dialog.open(AlunoDialogComponent, { width: '400px', data: aluno ? { ...aluno } : null })
      .afterClosed().subscribe(result => { if (result) this.carregar(); });
  }

  excluir(aluno: Aluno) {
    if (!confirm(`Excluir ${aluno.nome}?`)) return;
    this.service.excluir(aluno.id!).subscribe(() => {
      this.snack.open('Aluno excluido', '', { duration: 2000 });
      this.carregar();
    });
  }
}
