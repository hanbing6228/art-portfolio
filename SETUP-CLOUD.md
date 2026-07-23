# ☁️ Cloud setup — Firebase (guestbook, likes, and the Manage panel)

Cloud powers three things: a **shared guestbook & likes**, and a **Manage panel**
(the ⚙️ button) where the signed-in owner can upload an avatar, edit profile text,
and add/delete artworks — from any phone, with no code editing.

Everyone can **read**; only **you (signed in)** can change the profile/artworks.

Your project is already connected. If you set up a new one, repeat steps 1–3 from
git history. Below are the parts needed for the **Manage panel**.

## 1. Turn on the security rules
Firebase console → **Firestore Database → Rules**, paste this, then **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Guestbook: anyone can read and post a short message
    match /guestbook/{id} {
      allow read: if true;
      allow create: if request.resource.data.message is string
                    && request.resource.data.message.size() > 0
                    && request.resource.data.message.size() < 300
                    && request.resource.data.name is string
                    && request.resource.data.name.size() < 40;
      allow update, delete: if false;
    }

    // Likes: anyone can read and change the counts
    match /likes/{artId} { allow read, write: if true; }

    // Live drawing board: anyone can read, add a stroke, and clear the board
    match /board/{id} {
      allow read: if true;
      allow create: if true;
      allow update: if false;
      allow delete: if true;
    }

    // "Who's online" presence + floating reactions: open to everyone
    match /presence/{id}  { allow read, write: if true; }
    match /reactions/{id} { allow read: if true; allow create: if true; }

    // Submitted finished drawings (the "Done — submit" button)
    match /submissions/{id} {
      allow read: if true;
      allow create: if request.resource.data.img is string;
      allow update: if false;
      allow delete: if request.auth != null;
    }

    // Coin economy (PROTOTYPE — open so the demo works). Before real launch,
    // move coin minting/transfers into a Cloud Function and lock these down.
    match /wallets/{id}    { allow read, write: if true; }
    match /shopItems/{id}  { allow read, write: if true; }

    // Profile, artworks & favorites: anyone can READ, only the signed-in owner can WRITE
    match /profile/{doc}    { allow read: if true; allow write: if request.auth != null; }
    match /artworks/{artId} { allow read: if true; allow write: if request.auth != null; }
    match /favorites/{id}   { allow read: if true; allow write: if request.auth != null; }
  }
}
```

> **If drawing together / "who's online" isn't syncing between two phones**, it's
> almost always because the `board`, `presence`, and `reactions` rules above
> aren't published yet. Re-paste this whole block into Firestore → Rules →
> **Publish**, then reload both phones.

## 2. Turn on owner login
1. Firebase console → **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable **Email/Password** → Save.
3. **Users** tab → **Add user** → enter your email + a password → Add user.
   (This is YOUR login for the ⚙️ Manage panel — keep it private.)

## 3. Use it
On the site, tap the **⚙️ gear** (top-right) → **Sign in** with the email/password
from step 2. Then you can:
- **Profile:** change your name, tagline, "obsessed with", About text, fun facts,
  and upload an **avatar photo**.
- **Add artwork:** choose a photo, add a title, description, tags, and shape.
- **My artworks:** delete any you uploaded.

Everything saves to the cloud and appears for all visitors right away. Photos are
automatically shrunk in the browser before uploading, so they stay small.

> Tap the gear again any time to manage more. Tap **Sign out** when done.
> The gear only writes when you're signed in — visitors can't change anything.
