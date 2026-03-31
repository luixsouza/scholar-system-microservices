import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AlunoService } from '../shared/services/aluno.service';
import { Aluno } from '../shared/models/aluno.model';
import { AlunoDialogComponent } from './aluno-dialog.component';

@Component({
  selector: 'app-alunos',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './alunos.component.html',
  styleUrl: './alunos.component.scss'
})
export class AlunosComponent implements OnInit {
  displayedColumns = ['id', 'nome', 'email', 'matricula', 'acoes'];
  alunos: Aluno[] = [];

  constructor(private service: AlunoService, private dialog: MatDialog) {}

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.service.listar().subscribe(data => this.alunos = data);
  }

  abrir(aluno?: Aluno) {
    const ref = this.dialog.open(AlunoDialogComponent, {
      width: '400px',
      data: aluno ? { ...aluno } : null
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.carregar();
    });
  }

  excluir(id: number) {
    this.service.excluir(id).subscribe(() => this.carregar());
  }
}
