import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProfessorService } from '../shared/services/professor.service';
import { Professor } from '../shared/models/professor.model';
import { ProfessorDialogComponent } from './professor-dialog.component';

@Component({
  selector: 'app-professores',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './professores.component.html',
  styleUrl: './professores.component.scss'
})
export class ProfessoresComponent implements OnInit {
  displayedColumns = ['id', 'nome', 'email', 'titulacao', 'acoes'];
  professores: Professor[] = [];

  constructor(private service: ProfessorService, private dialog: MatDialog) {}

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.service.listar().subscribe(data => this.professores = data);
  }

  abrir(professor?: Professor) {
    const ref = this.dialog.open(ProfessorDialogComponent, {
      width: '400px',
      data: professor ? { ...professor } : null
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.carregar();
    });
  }

  excluir(id: number) {
    this.service.excluir(id).subscribe(() => this.carregar());
  }
}
