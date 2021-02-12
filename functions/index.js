const functions = require("firebase-functions");

const admin = require("firebase-admin");
admin.initializeApp();

const fetch = require("node-fetch");

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: "1GB",
};

// On findplace request, use google places api to return a placeID
//
// HTTP Request url
// `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${placequery}&inputtype=textquery&fields=place_id&key=${PLACES_API_KEY}`
// On browser:
// http://localhost:5001/nuereview/us-central1/findPlace?text=the%20royal%20hotel%20leichhardt
//
// exports.findPlace = functions.runWith(runtimeOpts).https.onRequest(async (request, response) => {
//   //Grab place query
//   await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${request.query.text}&inputtype=textquery&fields=place_id&key=${PLACES_API_KEY}`)
//     .then(res => res.json())
//     .then(json => {
//       if(json.candidates.length == 1) {
//         //If there is a result return it
//         response.json(json.candidates[0]);
//       } else if (json.candidates.length > 1) {
//         throw new Error("Multiple places found");
//       } else {
//         throw new Error("Place not found");
//       }
//     });
//
// });


/**
 *  findAPlace callable function
 *   recieves a placequery as data, context may include location data eventually
 *   checks if document exists in the database first,
 *   otherwise searches google places for a match and pulls that data
 *   this will require external library for "Full-text search"
 *   https://firebase.google.com/docs/firestore/solutions/search
 *//////////////////////////////////////////////////////////////////////////////
// exports.findAPlace = functions.runWith(runtimeOpts).https.onCall((data) => {
//   const placeQuery = data.placequery.split(" ").join("%20");
//   return fetch("https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=" +
//     placeQuery + "&inputtype=textquery&fields=place_id&key=" + functions.config().places_api.key)
//     .then(res => res.json())
//     .then(json => json.candidates[0]);
// });
////////////////////////////////////////////////////////////////////////////////
exports.findAPlace = functions.runWith(runtimeOpts).https.onCall((data) => {
  //Get a place id from google's place search api
  const placeQuery = data.placequery.split(" ").join("%20");
  return fetch("https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=" +
    placeQuery + "&inputtype=textquery&fields=place_id&key=" + functions.config().places_api.key)
    .then(res => res.json())
    .then(json => json.candidates[0].place_id)
    .then(place_id => {
      const placeRef = admin.firestore().doc("places/" + place_id);
      //Check if document exists
      return placeRef.get()
        .then((docSnapshot) => {
          if(!docSnapshot.exists) {
            //If not found, pull data from google's place details api
            fetch("https://maps.googleapis.com/maps/api/place/details/json?place_id=" +
              place_id + "&fields=name,address_component&key=" + functions.config().places_api.key)
              .then(res => res.json())
              .then(json => {
                placeRef.set(json.result);
                return place_id;
              });
          } else {
            return place_id;
          }
        });
    });
});

exports.createPlace = functions.firestore
  .document("places/{place_id}")
  .onCreate((snap) => {
    const addressComponents = snap.data().address_components;
    let streetNo, streetName, suburb, state, postcode;
    for (const comp of addressComponents) {
      switch(comp.types[0]) {
        case "street_number":
          streetNo = comp.long_name;
          break;
        case "route":
          streetName = comp.long_name;
          break;
        case "locality":
          suburb = comp.long_name;
          break;
        case "administrative_area_level_1":
          state = comp.short_name;
          break;
        case "postal_code":
          postcode = comp.long_name;
      }
    }
    var address = {
      street: streetNo + " " + streetName,
      suburb: suburb,
      state: state,
      postcode: postcode,
    };
    snap.ref.update({
      address: address,
      address_components: admin.firestore.FieldValue.delete()
    });

  });


/**
 *  getAPlace callable function
 *   recieves a place_id as data, no context needed
 *   checks if document exists in firestore and returns it
 *   if it doesnt exist;
 *    pulls the necessary data from google places to populate Firestore
 *   then returns the new document
 */
// exports.getAPlace = functions.runWith(runtimeOpts).https.onCall((data) => {
//   const placeId = data.placeId;
//   fetch("https://maps.googleapis.com/maps/api/place/details/json?place_id=" +
//     placeId + "&fields=name,formatted_address&key=" + PLACES_API_KEY)
//     .then(res => res.json())
//     .then(json => admin.firestore().doc("places/" + placeId).set(json.result));
//
//   return admin.firestore().doc("places/" + placeId);
// });


/**
 * Testing function workflow:
 * https://firebase.google.com/docs/functions/get-started
 */

// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
// exports.addMessage = functions.https.onRequest(async (request, response) => {
//   //Grab text parameter
//   const original = request.query.text;
//   //Push the new message into Firestore using the Firebase Admin SDK.
//   const writeResult = await admin
//     .firestore()
//     .collection("messages")
//     .add({ original: original });
//   //Send back a message that we've successfully written the message
//   response.json({ result: `Message with ID: ${writeResult.id} added.` });
// });
//
// // Listens for new messages added to /messages/:documentId/original and creates an
// // uppercase version of the message to /messages/:documentId/uppercase
// exports.makeUppercase = functions.firestore
//   .document("/messages/{documentId}")
//   .onCreate((snapshot, context) => {
//     // Grab the current value of what was written to Firestore.
//     const original = snapshot.data().original;
//
//     // Access the parameter `{documentId}` with `context.params`
//     functions.logger.log("Uppercasing", context.params.documentId, original);
//
//     const uppercase = original.toUpperCase();
//
//     // You must return a Promise when performing asynchronous tasks inside a Functions such as
//     // writing to Firestore.
//     //Setting an 'uppercase' field in Firestore document returns a Promise.
//
//     return snapshot.ref.set({ uppercase }, { merge: true });
//   });
//
