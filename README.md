# nuereview_firebase
backend firebase functions for nuereview system

## Todo:
- Scorecard calculation function
- onCreate review doc
  - check if user has previous review
  - move a user's previous review into "old_reviews" collection
- findAPlace:
  seperate into 2 functions:
    - findPlaces
    handles the search of google places api and returns the place IDs for further selection.
    also handles database creation. removing code from onCreate to prevent lagging.
    - getPlaceDetails
    handles the selecting of a returned placeID by accessing it's firestore document
