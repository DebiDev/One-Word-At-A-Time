import {Component, OnInit} from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import * as randomColor from 'randomColor';

import { User } from 'firebase';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isLoading = false;
  user: User;

  constructor(private auth: AngularFireAuth,
              private firestore: AngularFirestore) {
  }

  async ngOnInit(): Promise<void> {
    try {
      this.user = await this.auth.authState.pipe(first()).toPromise();
      if (this.user) {
       this.removeLandingPage();
       this.removeLogin();
      }
    } catch (err) {
      console.log(err);
    }
  }

  goToLogin(): void {
    const button = document.querySelector('.button-line');
    button.classList.add('magictime', 'vanishOut');
    this.removeLandingPage();
  }

  removeLandingPage(): void {
    const mainPage = document.querySelector('.full-screen');
    const container = document.querySelector('.welcome-container');
    const pseudoInput = document.querySelector('.pseudo-input') as HTMLInputElement;
    mainPage.classList.add('magictime', 'swashOut');
    setTimeout(() => container.classList.add('magictime', 'vanishOut', 'no-touch'), 900);
    pseudoInput.focus();
  }

  removeLogin(): void {
    const loginPage = document.querySelector('.login');
    const loginPageContent = document.querySelector('.login-content');
    loginPage.classList.add('magictime', 'transparent-gradient-animation', 'no-touch');
    loginPageContent.classList.add('magictime', 'transparent');
  }

  async play(pseudo: string): Promise<void> {
    console.log(pseudo);
    try {
      this.isLoading = true;
      const token = await this.auth.signInAnonymously();
      const userData = new GameUser(pseudo);
      await this.updateUser('users', token.user.uid, { ...userData });
      this.removeLogin();
    } catch (err) {
      if (err) {
        this.isLoading = false;
        console.log(err);
      }
    }
  }

  updateUser(collection: string, uid: string, data: GameUser): Promise<void> {
    return this.firestore.collection(collection).doc(uid).set(data, { merge: true } );
  }
}

export class GameUser {
  pseudo: string;
  isPlaying = false;
  isAdmin = false;
  lobbyId = '';

  constructor(pseudo: string) {
    this.pseudo = pseudo;
  }
}

export class Story {
  uid: string;
  story: Message[] = [];
  isBuilding = true;
  nbMessagesMax: number;
  participants: Participant[];

  constructor(firstMessage: string, nbUsers: number, nbRounds: number, participants: Participant[]) {
    this.story.push(new Message(firstMessage, true));
    this.uid = uuidv4();
    this.nbMessagesMax = nbUsers * nbRounds;
    this.participants = participants;
  }
}

export class Participant {
  participantId: string;
  nbTimesPlayed = 0;
  position = 0;
  constructor(uid: string) {
    this.participantId = uid;
  }
  setPosition(position: number): void {
    this.position = position;
  }
}

export class Message {
  words: string;
  isFirst: boolean;
  color: string;

  constructor(words: string, isFirst: boolean) {
    this.words = words;
    this.isFirst = isFirst;
    this.color = isFirst ? 'rgba(0, 0, 0, 0)' : randomColor({
      luminosity: 'light',
      format: 'rgb'
    });
  }
}

export class Lobby {
  uid: string;
  currentStory = '';
  storiesMade: string[] = [];

  constructor(uid: string) {
    this.uid = uid;
  }
}
