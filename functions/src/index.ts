import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import firestore = admin.firestore;
admin.initializeApp();

exports.startNewStory = functions.https.onCall(async data => {
    const story = data.story;
    const lobbyId: string = data.lobbyId;

    try {
      const storyRef = await admin.firestore().collection('/stories').add(story);
      await admin.firestore().collection('/lobbies').doc(lobbyId).update({
        currentStory: storyRef.id
      })
      await admin.firestore().collection('/users').doc(story.participants[0].participantId).update('isPlaying', true);
    } catch (err) {
      return err
    }
});

exports.addNewMessageToStory = functions.https.onCall(async (data, context) => {
    const message = data.message;
    const storyId: string = data.storyId;
    const lobbyId: string = data.lobbyId;
    const user = context.auth;

    try {
      if (user) {
        await admin.firestore().collection('/users').doc(user.uid).update('isPlaying', false);
        await admin.firestore().collection('/stories').doc(storyId).update({
          story: firestore.FieldValue.arrayUnion(message)
        });
        const story = (await admin.firestore().collection('/stories').doc(storyId).get()).data();
        // @ts-ignore
        const participants = story.participants.sort((a: { position: number; }, b: { position: number; }) => a.position - b.position);
        const playerPosition = participants.findIndex((player: { participantId: string; }) => player.participantId === user.uid);
        const currentPlayer = participants[playerPosition];
        console.log("currentPlayer : ", currentPlayer);
        currentPlayer.nbTimesPlayed = currentPlayer.nbTimesPlayed + 1;
        console.log("currentPlayer updated : ", currentPlayer);
        participants[playerPosition] = currentPlayer;
        // @ts-ignore
        if(story.story.length === story.nbMessagesMax + 1) {
          // End the game
          await admin.firestore().collection('/lobbies').doc(lobbyId).update({
            currentStory: '',
            storiesMade: firestore.FieldValue.arrayUnion(storyId)
          });
          await admin.firestore().collection('/stories').doc(storyId).update({
            isBuilding: false,
            participants: participants
          });
        } else {
          // Continue and find next player
          await admin.firestore().collection('/stories').doc(storyId).update({
            participants: participants
          });
          const minNbPlayed = Math.min(...participants.map((participant: { nbTimesPlayed: any; }) => participant.nbTimesPlayed));
          console.log("minNbPlayed : ", minNbPlayed);
          const nextPlayer = participants.find((player: { nbTimesPlayed: number; }) => player.nbTimesPlayed === minNbPlayed);
          console.log("nextPlayer : ", nextPlayer);
          if (nextPlayer) {
            await admin.firestore().collection('/users').doc(nextPlayer.participantId).update('isPlaying', true);
          }
        }
      }
    } catch (err) {
      console.log(err);
      return err
    }
});
