export const startRecording = async (): Promise<MediaRecorder> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.start();
  return mediaRecorder;
};

export const stopRecording = (mediaRecorder: MediaRecorder): Promise<string> => {
  return new Promise((resolve, reject) => {
    const audioChunks: BlobPart[] = [];
    
    mediaRecorder.addEventListener('dataavailable', event => {
      audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result); // Base64 string
        } else {
          reject(new Error("Failed to convert audio to base64"));
        }
      };
      
      // Clean up the tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });

    mediaRecorder.stop();
  });
};
