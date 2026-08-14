# feature suggestion

1. Add support so users can upload zip of database file directly and provide target url , the app should extract and push the database to the target url.
2. show a modal or toast when the self hosted version a user is using is different from live version, mostly when things have changed it means version change / update

# bugs

1. Fix the Firebase URI pattern in `POST /api/migrate/verify` (`server/src/index.ts`). The pattern is
   `/^firebase?:\/\//`, where the `?` makes the "e" optional — so it matches `firebase://` and
   `firebas://`, neither of which is a real Firebase URI. Actual sources are
   `https://<project>.firebaseio.com` or `https://<project>.firebasedatabase.app`, matching the
   `validateUri` regex already used in `client/src/components/DatabaseConfigForm.tsx`. Every valid
   Firebase URI is currently rejected with a 400.

   Not user-visible yet: the endpoint has never been called from the client (it has existed since the
   initial commit, unused). Worth fixing alongside wiring up a "Test connection" button, which is
   what the endpoint was built for.

   Same endpoint, related: its 500 branch returns `Verification failed: ${errorMessage}` with the raw
   driver error. Driver errors embed hosts, users and connection strings — the browser schema handler
   further down the same file deliberately avoids this and returns a classified error code instead.
   Match that behaviour. 
