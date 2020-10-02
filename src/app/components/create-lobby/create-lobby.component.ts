import { Component, OnInit } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-create-lobby',
  templateUrl: './create-lobby.component.html',
  styleUrls: ['./create-lobby.component.scss']
})
export class CreateLobbyComponent implements OnInit {

  lobbyId: string;
  constructor() { }

  ngOnInit(): void {
  }

  generateNewLobbyId(): void {
    this.lobbyId = uuidv4();
  }

}
