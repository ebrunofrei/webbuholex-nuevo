import React, { useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/firebase.js.bak";

export default function UploadZone({ expedienteId = "expediente-demo" }) {
  const fileInputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFiles = (selectedFiles) => {
    Array.from(selectedFiles).forEach((file) => {
      const storageRef = ref(storage, `${expedienteId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(percent.toFixed(0));
        },
        (error) => {
          console.error("Error al subir:", error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            setUploadedFiles((prev) => [...prev, { name: file.name, url: downloadURL }]);
          });
        }
      );
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    handleFiles(e.target.files);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current.click()}
        className="cursor-pointer border-4 border-dashed border-gray-300 p-8 rounded-lg text-center text-gray-600 hover:border-red-500"
      >
        📂 Arrastra aquí o haz clic para subir documentos
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        className="hidden"
        multiple
      />

      {progress > 0 && progress < 100 && (
        <p className="text-blue-600">Subiendo... {progress}%</p>
      )}

      {uploadedFiles.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700">Archivos subidos:</h3>
          <ul className="list-disc list-inside">
            {uploadedFiles.map((file, idx) => (
              <li key={idx}>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
