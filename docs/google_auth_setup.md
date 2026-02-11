# Google Sign-In Setup & Localhost Configuration

To enable Google Sign-In for your application, you need to configure the Google Auth provider in the Firebase Console and add `localhost` to the authorized domains.

## 1. Enable Google Sign-In in Firebase Console

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (**pavlicevits**).
3.  Navigate to **Authentication** > **Sign-in method**.
4.  Click on **Add new provider** and select **Google**.
5.  **Enable** the toggle.
6.  Configure the public-facing name for your project (e.g., "Pavlicevits").
7.  Select a **Project Support Email** from the dropdown.
8.  Click **Save**.

## 2. Configure Authorized Domains

For Google Sign-In to work on your local machine, `localhost` must be listed as an authorized domain.

1.  In the **Authentication** section of the Firebase Console, go to the **Settings** tab.
2.  Scroll down to **Authorized domains**.
3.  Ensure `localhost` is listed. It is usually added by default.
4.  If not present, click **Add domain**, enter `localhost`, and click **Add**.

## 3. (Optional) Google Cloud Console Configuration

Sometimes, you may need to check the underlying Google Cloud Project settings, especially if you encounter "Error 403: access_denied".

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project.
3.  Navigate to **APIs & Services** > **Credentials**.
4.  Under **OAuth 2.0 Client IDs**, looking for the client auto-created by Firebase (usually named "Web client (auto created by Google Service)").
5.  Click the pencil icon to edit.
6.  Under **Authorized JavaScript origins**, ensure `http://localhost` and `http://localhost:3000` (or your specific port) are added.
7.  Under **Authorized redirect URIs**, ensure existing Firebase callback URLs are present (e.g., `https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler`).
8.  Click **Save**.

## 4. Verification

1.  Start your application locally: `npm run dev`
2.  Navigate to `/login`.
3.  Click the **Google** button.
4.  A popup window should appear allowing you to select your Google account.
5.  Upon successful sign-in, you should be redirected to the app (or the intended redirect path).
