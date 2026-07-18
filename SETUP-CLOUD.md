# ☁️ Cloud setup — shared guestbook & likes (Firebase, free)

By default the guestbook and likes are saved only on each visitor's own device.
Follow these steps to make them **shared by everyone and never lost**, using
**Firebase Firestore** (free "Spark" plan, no credit card). Ask a grown-up to help.

## 1. Create a Firebase project
1. Go to **https://console.firebase.google.com** → **Add project**.
2. Name it (e.g. `art-portfolio`) → you can turn Google Analytics **off** → Create.

## 2. Create the database
1. Left menu → **Build → Firestore Database** → **Create database**.
2. Choose a location → start in **Production mode** → Enable.
3. Open the **Rules** tab, replace everything with this, then **Publish**:

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
    match /likes/{artId} {
      allow read, write: if true;
    }
  }
}
```

## 3. Get your web config
1. Project **Overview** (top-left) → click the **`</>`** (Web) icon to add a web app.
2. Give it a nickname → **Register app** (you can skip Hosting).
3. It shows a `const firebaseConfig = { ... }` object. Copy that object.

## 4. Paste it into the site
Open `js/config.js` and set `cloud.firebase` to your object:

```js
cloud: {
  firebase: {
    apiKey: "AIza...",
    authDomain: "art-portfolio-xxxx.firebaseapp.com",
    projectId: "art-portfolio-xxxx",
    appId: "1:1234567890:web:abcdef",
  },
},
```

Save → commit → push. Your site redeploys, and the guestbook and likes are now
shared by everyone, on every device. 🎉

> The Firebase web config is **meant to be public** — it only identifies your
> project. Your data is protected by the security **rules** in step 2.

To turn cloud off again, set `firebase: null`.
