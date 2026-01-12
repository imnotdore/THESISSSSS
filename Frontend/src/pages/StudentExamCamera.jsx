// StudentExamCamera.jsx
import React, { useRef, useEffect, useState } from 'react';

const StudentExamCamera = ({ examId, isRequired }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isRequired) return;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError(`Camera access failed: ${err.message}`);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRequired]);

  if (!isRequired) return null;

  return (
    <div className="student-camera-container">
      <div className="camera-header">
        <h4>📹 Exam Camera</h4>
        <span className="camera-status">
          {stream ? '✅ Active' : '❌ Inactive'}
        </span>
      </div>
      
      <div className="camera-preview">
        {error ? (
          <div className="camera-error">
            <div className="error-icon">❌</div>
            <p>{error}</p>
            <small>Please allow camera access to continue</small>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />
        )}
      </div>
      
      <div className="camera-info">
        <small>This camera stream is shared with your teacher for proctoring.</small>
        {stream && (
          <div className="camera-stats">
            <span>📹 Camera: Active</span>
            <span>🔊 Audio: {stream.getAudioTracks().length > 0 ? 'On' : 'Off'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentExamCamera;