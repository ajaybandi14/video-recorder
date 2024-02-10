import React, { useEffect, useState, useRef } from 'react';
import 'semantic-ui-css/semantic.min.css'
import { Button, Table, Progress, Segment } from 'semantic-ui-react'

// Max Record Time - Seconds
const MAX_RECORD_TIME = 30;

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
      <Segment>
        <Button onClick={() => startRecording()} disabled={isRecording}>
          Start Recording
        </Button>
        <Button color={isPaused ? 'orange' : 'yellow'} onClick={() => (isPaused ? resumeRecording() : pauseRecording())} disabled={!isRecording}>
          {`${isPaused ? 'Resume' : 'Pause'} Recording`}
        </Button>
        <Button color='red' onClick={() => stopRecording()} disabled={!isRecording}>
          Stop Recording
        </Button>
      </Segment>
      <p>{message}</p>
      {recordingLength ? <p>Recording Length: {recordingLength} seconds</p> : ''}

      {isRecording && (
        <Progress
          percent={(recordingLength / MAX_RECORD_TIME) * 100}
          indicating
          autoSuccess
        />
      )}

      {history.length > 0 && (
        <div>
          <h2>Recorded Videos History</h2>
          <Table celled>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Filename</Table.HeaderCell>
                <Table.HeaderCell>Size</Table.HeaderCell>
                <Table.HeaderCell>Length</Table.HeaderCell>
                <Table.HeaderCell>Timestamp</Table.HeaderCell>
                <Table.HeaderCell>Action</Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {history.map((item, index) => (
                <Table.Row key={index}>
                  <Table.Cell>{item.filename}</Table.Cell>
                  <Table.Cell>{item.size}</Table.Cell>
                  <Table.Cell>{item.timeRecordedFor}</Table.Cell>
                  <Table.Cell>{item.time}</Table.Cell>
                  <Table.Cell>
                    <a href={item.url} download={item.filename}>Download</a>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
}