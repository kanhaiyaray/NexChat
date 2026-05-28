import { useState, useRef, useEffect } from "react";

const VoiceRecorder = ({ onSend, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) { // Max 60 seconds
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      // Toast notification: "Microphone access required for voice messages"
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const processAudio = async (blob) => {
    setIsProcessing(true);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result;
      const duration = recordingTime;
      await onSend(base64Audio, duration);
      setIsProcessing(false);
      audioChunksRef.current = [];
    };
    reader.readAsDataURL(blob);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="voice-recorder">
      {isRecording ? (
        <div className="recording-controls">
          <button 
            className="icon-btn stop-recording"
            onClick={stopRecording}
            title="Stop recording"
          >
            ⏹️
          </button>
          <div className="recording-timer">
            <span className="recording-dot" />
            {formatTime(recordingTime)}
          </div>
          <div className="waveform-animation">
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
      ) : (
        <button
          className="icon-btn"
          onClick={startRecording}
          disabled={disabled || isProcessing}
          title="Record voice message"
        >
          {isProcessing ? "⏳" : "🎙️"}
        </button>
      )}
    </div>
  );
};

export default VoiceRecorder;