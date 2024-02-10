import React, { useEffect, useState, useRef } from 'react';

// Max Record Time - Seconds
const MAX_RECORD_TIME = 5;

// Max Size Limit - Mb
const MAX_SIZE_LIMIT = 50;

export default function Home() {
  const [isRecording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [isPaused, setPause] = useState(false);
  const [message, setMessage] = useState('');
  const [recordingLength, setRecordingLength] = useState(0);
  const [history, setHistory] = useState([]);
  const videoRef = useRef(null);
  const timerIdRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (recorder) {
      recorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };
  
      recorder.onstop = () => {
        console.log('Stopping Record.');
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const sizeInMB = blob.size / (1024 * 1024);
        const sizeType = sizeInMB > 1000 ? 'GB' : 'MB';
  
        if (sizeInMB > MAX_SIZE_LIMIT) {
          setMessage(`Video is ${sizeInMB}${sizeType} in size, which is ${sizeInMB - MAX_SIZE_LIMIT}${sizeType} greater than the permissible ${MAX_SIZE_LIMIT}MB. Please record a shorter video.`);
        } else {
          const filename = `video-${Date.now()}.webm`;
          const videoURL = URL.createObjectURL(blob);
          setHistory((prevHistory) => [
            ...prevHistory,
            {
              filename: filename,
              timeRecordedFor: getRecordingLength(), 
              size: `${sizeInMB.toFixed(2)} ${sizeType}`,
              time: new Date().toLocaleString(),
              url: videoURL,
            },
          ]);
        }
        chunksRef.current = [];
        clearInterval(timerIdRef.current);
        setRecordingLength(0);
      };
  
      if (isRecording && !isPaused) {
        timerIdRef.current = setInterval(() => {
          setRecordingLength(prevLength => {
            if (prevLength + 1 > MAX_RECORD_TIME) {
              stopRecording();
              setMessage(`Maximum recording time (${MAX_RECORD_TIME} seconds) reached.`);
              return prevLength;
            } else {
              return prevLength + 1;
            }
          });
        }, 1000);
      } else {
        clearInterval(timerIdRef.current);
      }
    }
  }, [recorder, isRecording, isPaused]);  

  const getRecordingLength = () => {
    return `${recordingLength < 60 ? `${recordingLength} Seconds` : `${recordingLength / 60} Minutes`} `
  }

  const startRecording = async () => {
    try {
      const receivedStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      if (receivedStream) {
        const newRecorder = new MediaRecorder(receivedStream);
        newRecorder.start();
        setRecorder(newRecorder);
        setRecording(true);
      } else {
        throw new Error('Failed to get stream');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = receivedStream;
      }
    } catch (error) {
      console.error('Error accessing media devices: ', error);
      setMessage('Permission denied for accessing camera and microphone.');
    }
  };

  const pauseRecording = () => {
    if (recorder && recorder.state === 'recording') {
      console.log('Recording, then pause');
      recorder.pause();
      setPause(true);
    }
  };

  const resumeRecording = () => {
    if (recorder && recorder.state === 'paused') {
      console.log('Paused, then resume');
      recorder.resume();
      setPause(false);
    }
  };

  const stopRecording = () => {
    // Stop recording
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      recorder.stop();
    }

    setRecording(false);
    setPause(false);

    // Clear the timer
    clearInterval(timerIdRef.current);
  };

  return (
    <div>
      <video ref={videoRef} muted autoPlay></video>
      <button onClick={() => startRecording()} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={() => (isPaused ? resumeRecording() : pauseRecording())} disabled={!isRecording}>
        {`${isPaused ? 'Resume' : 'Pause'} Recording`}
      </button>
      <button onClick={() => stopRecording()} disabled={!isRecording}>
        Stop Recording
      </button>
      <p>{message}</p>
      {recordingLength ? <p>Recording Length: {recordingLength} seconds</p> : ''}

      {history.length > 0 && (
        <div>
          <h2>Recorded Videos History</h2>
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Length</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, index) => (
                <tr key={index}>
                  <td>{item.filename}</td>
                  <td>{item.size}</td>
                  <td>{item.timeRecordedFor}</td>
                  <td>{item.time}</td>
                  <td>
                    <a href={item.url} download={item.filename}>Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}