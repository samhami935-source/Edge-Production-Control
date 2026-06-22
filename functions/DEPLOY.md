# Deploy the admin-set-password Cloud Function

This adds the `setUserPassword` function used by the **Set Password** button in
the app's Users modal. Do this once.

## 1. Upgrade the project to the Blaze plan (required for Cloud Functions)
Firebase Console → ⚙ → Usage and billing → **Modify plan → Blaze (pay as you go)**.
Cloud Functions have a generous free tier; this feature's usage is effectively free.

## 2. Install the Firebase CLI (one time, if you don't have it)
```
npm install -g firebase-tools
firebase login
```

## 3. Deploy (run from the project root, the folder with firebase.json)
```
cd "D9 Edge"
firebase use d9-edge-3e279
firebase deploy --only functions
```

The first deploy may ask to enable required APIs — say yes. It takes a couple of
minutes. When it finishes you'll see `setUserPassword` listed.

## 4. Test
In the app: open **Users** (admin only) → click **Set Password** on any user →
enter a new password. They can sign in with it immediately. No email involved.

## Notes
- The function region is the default `us-central1`, which matches
  `firebase.functions()` in the app. If you deploy to a different region, set it
  in the app with `firebase.functions('your-region')`.
- Security: the function re-checks that the caller's Firestore `users/{uid}.role`
  is `admin` before changing anything — the browser cannot bypass this.
