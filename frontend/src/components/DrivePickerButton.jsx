import React from "react";
import GooglePicker from "react-google-picker";
import { FaGoogleDrive } from "react-icons/fa";

const CLIENT_ID = "TU_CLIENT_ID.apps.googleusercontent.com";
const DEVELOPER_KEY = "TU_API_KEY"; // De tu consola Google Cloud
const APP_ID = "TU_PROJECT_NUMBER";  // Número del proyecto, no ID

export default function DrivePickerButton({ onFileSelected }) {
  return (
    <GooglePicker
      clientId={CLIENT_ID}
      developerKey={DEVELOPER_KEY}
      scope={['https://www.googleapis.com/auth/drive.readonly']}
      onChange={data => {
        // El user seleccionó archivos:
        if (data && data.docs && data.docs.length > 0) {
          onFileSelected(data.docs[0]);
        }
      }}
      onAuthFailed={data => alert("Error de autenticación Google Drive")}
      multiselect={false}
      navHidden={true}
      authImmediate={false}
      viewId={'DOCS'}
    >
      <button type="button" className="bg-green-50 border px-3 py-2 rounded-full shadow text-green-800 hover:bg-green-100 flex items-center gap-2">
        <FaGoogleDrive /> Drive
      </button>
    </GooglePicker>
  );
}
