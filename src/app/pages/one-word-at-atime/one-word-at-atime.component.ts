import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { GameUser, Lobby, Message, Participant, Story } from '../../app.component';
import { User } from 'firebase';
import {distinctUntilChanged, filter, first, map, take} from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireFunctions } from '@angular/fire/functions';
import * as randomColor from 'randomColor';
import { MatDialog } from '@angular/material/dialog';
import { CreateLobbyComponent } from '../../components/create-lobby/create-lobby.component';
import { JoinLobbyComponent } from '../../components/join-lobby/join-lobby.component';
import { CreateNewStoryComponent } from '../../components/create-new-story/create-new-story.component';
import * as firebase from 'firebase';


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'one-word-at-atime',
  templateUrl: './one-word-at-atime.component.html',
  styleUrls: ['./one-word-at-atime.component.scss']
})
export class OneWordAtATimeComponent implements OnInit {

  users$: Observable<GameUser[]>;

  user: User;
  userData$: Observable<GameUser>;
  currentStory: string;
  storyInConstruction$: Observable<Story>;
  storiesMade: Story[] = [];
  lobbyId: string;
  currentLobby$: Observable<Lobby>;

  userBackgroundColor: string[] = [...new Array(20)].map(() => this.userColor());

  constructor(private auth: AngularFireAuth,
              private firestore: AngularFirestore,
              private afFunc: AngularFireFunctions,
              private dialog: MatDialog) { }

  async ngOnInit(): Promise<void> {
    this.user = await this.auth.authState.pipe(filter(x => !!x), first()).toPromise();
    this.userData$ = await this.getUserDataObservable(this.user.uid);
    this.userData$.subscribe(async data => {
      if (data.lobbyId) {
        if (this.lobbyId !== data.lobbyId) {
          this.lobbyId = data.lobbyId;
          this.users$ = await this.getUsersObservable();
          this.currentLobby$ = this.getLobbyObservable(data.lobbyId);
          this.subscribeToLobby();
        }
      }
      if (data.isPlaying) {
        const mainInput = document.querySelector('.main-input') as HTMLInputElement;
        mainInput.focus();
      }
    });
  }

  subscribeToLobby(): void {
    this.currentLobby$.subscribe(async lobby => {
      if (lobby && lobby.currentStory) {
        this.currentStory = lobby.currentStory;
        this.storyInConstruction$ = this.getStoryObservable(lobby.currentStory);
      } else {
        this.currentStory = '';
      }
      if (lobby && lobby.storiesMade) {
        this.storiesMade = await Promise.all(lobby.storiesMade.map(story => this.getStory(story)));
      }
    });
  }

  getLobbyObservable(lobbyId: string): Observable<Lobby> {
    return this.firestore.collection('lobbies').doc<Lobby>(lobbyId).valueChanges();
  }

  getStoryObservable(uid: string): Observable<Story> {
    return this.firestore.collection('stories').doc<Story>(uid)
      .valueChanges();
  }

  getStory(uid: string): Promise<Story> {
    return this.firestore.collection('stories').doc<Story>(uid).valueChanges().pipe(take(1)).toPromise();
  }

  getUserDataObservable(uid: string): Observable<GameUser> {
    return this.firestore.collection('users').doc<GameUser>(uid).valueChanges();
  }

  getUsersObservable(): Observable<GameUser[]> {
    return this.firestore.collection<GameUser>('users', ref => ref.where('lobbyId', '==', this.lobbyId))
      .valueChanges().pipe(distinctUntilChanged((pred, next) => pred.length === next.length));
  }

  getUsersDocs(): Observable<firebase.firestore.QuerySnapshot> {
    return this.firestore.collection<GameUser>('users', ref => ref.where('lobbyId', '==', this.lobbyId)).get();
  }

  enterNewWords(newWords): Promise<any> {
    const yourTurn = document.querySelector('.your-turn') as HTMLInputElement;
    yourTurn.classList.remove('puffIn');
    yourTurn.classList.add('puffOut');
    const mainInput = document.querySelector('.main-input') as HTMLInputElement;
    mainInput.value = '';
    const newMessage = new Message(newWords, false);
    const data = {
      message: newMessage,
      storyId: this.currentStory,
      lobbyId: this.lobbyId
    };
    return this.afFunc.httpsCallable('addNewMessageToStory')(data).toPromise();
  }

  userColor(): string {
    return randomColor({
       format: 'rgb'
    });
  }

  async createNewStory(): Promise<void> {
    const newStoryDialog = this.dialog.open(CreateNewStoryComponent);
    const { firstMessage, nbRounds } = await newStoryDialog.afterClosed().toPromise();
    if (firstMessage && nbRounds) {
      const nbUsers = (await this.users$.pipe(take(1)).toPromise()).length;
      const participants = (await this.getUsersDocs().toPromise()).docs.map(player => new Participant(player.id));
      participants.forEach((participant, index) => {
        participant.setPosition(index);
        this[index] = participant;
      }, participants);
      const newStory = new Story(firstMessage, nbUsers, nbRounds, participants);
      const data = {
        story: newStory,
        lobbyId: this.lobbyId
      };
      await this.afFunc.httpsCallable('startNewStory')(data).toPromise();
    }
  }

  createNewLobbyInDB(lobby: Lobby): Promise<void> {
    return this.firestore.collection<Lobby>('lobbies').doc(lobby.uid).set(Object.assign({}, lobby));
  }

  async createNewLobby(): Promise<void> {
    const newLobbyDialog = this.dialog.open(CreateLobbyComponent);
    const lobbyId: string = await newLobbyDialog.afterClosed().toPromise();
    if (lobbyId) {
      const data = {
        isAdmin: true,
        lobbyId
      };
      const lobbyData = new Lobby(lobbyId);
      await this.updateUser(data);
      await this.createNewLobbyInDB(lobbyData);
    }
  }

  async joinLobby(): Promise<void> {
    const joinLobbyDialog = this.dialog.open(JoinLobbyComponent);
    const lobbyId: string = await joinLobbyDialog.afterClosed().toPromise();
    if (lobbyId) {
      const data = {
        isAdmin: false,
        lobbyId
      };
      await this.updateUser(data);
    }
  }

  async quitLobby(): Promise<void> {
    this.lobbyId = '';
    this.currentLobby$ = null;
    this.storyInConstruction$ = null;
    const data = {
      isAdmin: false,
      isPlaying: false,
      lobbyId: ''
    };
    await this.updateUser(data);
  }

  updateUser(data): Promise<void> {
    return this.firestore.collection('users').doc(this.user.uid).update(data);
  }
}
